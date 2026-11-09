(()=>{
const BOOKS=window.MACKENZIE_BOOKS;
let T;
const home=window.MackenzieRouter.home;
const $=id=>document.getElementById(id)||home.querySelector('#'+id), reduced=matchMedia('(prefers-reduced-motion: reduce)');
const rendererCanvas=$('stage'), dialog=$('reader'), books=[], pages=[];
let turnTween, sceneReady=false, gpuContext, mobileBounds,editorial;
let view=window.MackenzieRouter.view,cameraTween;
let wakeScroll=()=>{};
const coverLoads=[];
const experience=home.querySelector("#experience");
let regionVisible=true,contextFailed=false,lastRender=0,activeUntil=0,panelsReady=false;
let renderer,camera,scene,particles,rig,folio=0,active=0,reading=false,trigger,scroller,savedFocus,ctx,muted=true,frame=0,previous=0,time=0,selected=0,dragging=null,transitioning=false,desired=0;
const mix=(a,b,t)=>a+(b-a)*t, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function progress(value){
 const next=clamp(value,0,1);if(panelsReady&&Math.abs(next-desired)<.00001)return;
 const oldActive=active;panelsReady=true;desired=next;active=Math.round(desired);
 home.querySelectorAll('.folio').forEach((panel,i)=>{
  panel.setAttribute('aria-hidden',String(i!==active));panel.inert=i!==active;
 });
 home.querySelectorAll('.edition-index [data-edition]').forEach((link,i)=>link.setAttribute('aria-current',String(i===active)));
 if(particles)particles.material.uniforms.uTransitionProgress.value=desired;
 if(oldActive!==active||!mobileBounds)measureComposition();
 restart();
}
gsap.registerPlugin(ScrollTrigger);gsap.ticker.lagSmoothing(0);
// Each edition has a resting interval, with a complete morph between intervals.
function editionProgress(p){return clamp((p-.25)/.40)}
function measureComposition(){
 if(view!=="home"||innerWidth>959){mobileBounds=null;return;}
 const intro=home.querySelectorAll('.folio .copy')[active].getBoundingClientRect();
 const bar=home.querySelector('.edition-index').getBoundingClientRect();
 const stage=experience.getBoundingClientRect();
 mobileBounds={top:intro.bottom-stage.top+12,bottom:Math.min(stage.height,bar.top-stage.top)-12,height:stage.height};
}
function initScroll(){
 scroller=new Lenis({smoothWheel:!reduced.matches,lerp:.13,prevent:node=>Boolean(node.closest('#reader,.nav,.consent-banner'))});
 scroller.on('scroll',ScrollTrigger.update);
 // Lenis needs frames only while input is settling, not an always-on GSAP ticker.
 let scrollFrame=0;
 const scrollTick=ms=>{scrollFrame=0;scroller.raf(ms);if(scroller.isScrolling)scrollFrame=requestAnimationFrame(scrollTick)};
 wakeScroll=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(scrollTick)};
 for(const event of ['wheel','touchmove','keydown','scroll'])addEventListener(event,wakeScroll,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(scrollFrame);scrollFrame=0}else wakeScroll()});
 addEventListener('pagehide',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=0});
 wakeScroll();
 document.body.classList.add('codex-ready');
 if(view!=="home")return;
 mountHomeTrigger();
}
function mountHomeTrigger(){
 trigger=ScrollTrigger.create({
  trigger:experience,start:'top top',end:()=>'+='+experience.offsetHeight*2,
  pin:true,anticipatePin:1,invalidateOnRefresh:true,
  onUpdate:self=>{if(!reading)progress(editionProgress(self.progress))},
  onToggle:self=>{regionVisible=self.isActive||self.progress===0;document.body.classList.toggle('codex-offstage',!regionVisible);restart()}
 });
 progress(editionProgress(trigger.progress));
}
function coverTexture(url){
 const canvas=document.createElement('canvas');const width=innerWidth<=959?400:800,height=width*1.5;canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');context.fillStyle='#EFECE4';context.fillRect(0,0,width,height);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const image=new Image();let loaded;coverLoads.push(new Promise(resolve=>loaded=resolve));image.onload=()=>{
  const scale=Math.min(width/image.width,height/image.height),w=image.width*scale,h=image.height*scale;
  context.drawImage(image,(width-w)/2,(height-h)/2,w,h);texture.needsUpdate=true;loaded();
 };image.onerror=()=>{loaded();fallback('A cover could not be loaded.');};image.src=url;return texture;
}
function box(w,h,d,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.castShadow=m.receiveShadow=true;return m}
function pageEdgeNormals(){
 const c=document.createElement('canvas');c.width=32;c.height=512;
 const ctx=c.getContext('2d');ctx.fillStyle='rgb(128,128,255)';ctx.fillRect(0,0,32,512);
 for(let y=0;y<512;y+=4){ctx.fillStyle='rgb(128,150,253)';ctx.fillRect(0,y,32,1);ctx.fillStyle='rgb(128,108,253)';ctx.fillRect(0,y+1,32,1)}
 const texture=new T.CanvasTexture(c);texture.wrapS=texture.wrapT=T.RepeatWrapping;return texture;
}
function makeBook(b,index){
 const group=new T.Group(), binding=new T.MeshStandardMaterial({color:0x665339,roughness:.67,metalness:.18}), cream=new T.MeshStandardMaterial({color:0xefece4,roughness:.88,normalMap:pageEdgeNormals(),normalScale:new T.Vector2(.12,.12)});
 // The case has its own front and back boards; its recessed core exposes the page edges.
 const shell=box(1.6,2.4,.28,new T.MeshStandardMaterial({color:0x887644,roughness:.65}));
 shell.scale.set(.038,1,1);shell.position.x=-.779; group.add(shell);
 const block=box(1.56,2.34,.25,cream);group.add(block);
 const back=box(1.6,2.4,.018,binding);back.position.z=-.135;group.add(back);
 const hinge=new T.Group();hinge.position.set(-.81,0,.139);group.add(hinge);
 const face=new T.MeshStandardMaterial({map:coverTexture(b.cover),color:index===1?0xf2efe7:0xffffff,roughness:.72,metalness:.035});
 const lid=box(1.6,2.4,.018,[binding,binding,binding,binding,face,cream]);lid.position.x=.81;hinge.add(lid);
 const materials=[...new Set([binding,cream,shell.material,face])];
 const accent=new T.PointLight(0xfff1d5,.3,4,2);accent.position.set(0,1,2);group.add(accent);
 group.userData={hinge,block,materials,accent,baseColors:materials.map(m=>m.color.clone())};group.rotation.y=-.45;scene.add(group);return group;
}
const particleVertex=`
uniform float uTransitionProgress,uTime,uDpr,uScatter;
attribute float aSeed;varying float vSeed;
vec3 curl(vec3 p){return vec3(cos(p.y)+sin(p.z),cos(p.z)+sin(p.x),cos(p.x)+sin(p.y));}
void main(){
 vec3 p=position+curl(position*3.+uTime*.1)*(.012+.06*uScatter);
 p.x+=sin(uTime*.11+aSeed*32.)*.018;
 p.y+=cos(uTime*.09+aSeed*47.)*.012;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp((9.+9.*aSeed)*uDpr/max(1.,-mv.z),1.5,4.*uDpr);vSeed=aSeed;
}`;
const particleFragment=`
uniform vec3 uGold;uniform float uOpacity,uViewHeight,uClipTop,uClipBottom;varying float vSeed;
void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
 float y=1.-gl_FragCoord.y/uViewHeight;
 float clip=smoothstep(uClipTop,uClipTop+.035,y)*(1.-smoothstep(uClipBottom-.025,uClipBottom,y));
 gl_FragColor=vec4(uGold,exp(-18.*d*d)*(1.-smoothstep(.30,.5,d))*(.25+.35*vSeed)*uOpacity*clip);
}`;
function pointCloud(){
 const n=2000,geom=new T.BufferGeometry(),a=new Float32Array(n*3),seeds=new Float32Array(n);
 let seed=81273;const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
 for(let i=0;i<n;i++){a.set([rand()-.5,rand()-.5,(rand()-.5)*.4],i*3);seeds[i]=rand()}
 geom.setAttribute('position',new T.BufferAttribute(a,3));geom.setAttribute('aSeed',new T.BufferAttribute(seeds,1));
 const mat=new T.ShaderMaterial({vertexShader:particleVertex,fragmentShader:particleFragment,transparent:true,depthWrite:false,uniforms:{uScatter:{value:0},uTransitionProgress:{value:desired},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uGold:{value:new T.Color(getComputedStyle(document.documentElement).getPropertyValue('--gold-primary').trim())},uOpacity:{value:1},uViewHeight:{value:1},uClipTop:{value:0},uClipBottom:{value:1}}});
 const cloud=new T.Points(geom,mat);cloud.frustumCulled=false;scene.add(cloud);return cloud;
}
addEventListener('mackenzie-theme-change',()=>{if(particles){particles.material.uniforms.uGold.value.set(getComputedStyle(document.documentElement).getPropertyValue('--gold-primary').trim());restart()}});
function contactShadow(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,2,64,64,62);
 gradient.addColorStop(0,'rgba(0,0,0,.48)');gradient.addColorStop(.5,'rgba(0,0,0,.18)');gradient.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const material=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,toneMapped:false});
 const mesh=new T.Mesh(new T.PlaneGeometry(2.5,.65),material);mesh.rotation.x=-1.1;scene.add(mesh);return mesh;
}
function dimensions(){return {width:innerWidth,height:innerHeight}}
function viewport(){return !reading&&view!=='home'?document.querySelector('[data-scene-slot]')?.getBoundingClientRect():{left:0,top:0,width:innerWidth,height:innerHeight}}
function fit(){
 measureComposition();
 if(!renderer)return;
 const size=dimensions();
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 renderer.setSize(size.width,size.height,false);const rect=viewport();camera.aspect=rect?.width/Math.max(1,rect?.height)||size.width/size.height;camera.updateProjectionMatrix();
 particles.material.uniforms.uDpr.value=renderer.getPixelRatio();particles.material.uniforms.uViewHeight.value=renderer.domElement.height;restart();
}
function fallback(message){
 console.warn(message);contextFailed=true;
 cancelAnimationFrame(frame);frame=0;
 document.body.classList.remove('gl');document.body.classList.add('no-gl');
 rendererCanvas.style.visibility='hidden';
 $('status').textContent='The text reader remains available.';
}
async function initScene(){
 renderer=new T.WebGLRenderer({canvas:rendererCanvas,context:gpuContext,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.shadowMap.enabled=false;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.setClearColor(0x000000,0);scene=new T.Scene();camera=new T.PerspectiveCamera(44,1,.1,60);camera.position.z=view==='home'?8.5:view==='books'?9:8;
 scene.add(new T.HemisphereLight(0xfff7e3,0xb4a991,1.1));
 const light=new T.DirectionalLight(0xfff2d5,1.8);light.position.set(-3,5,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0004;scene.add(light);
BOOKS.forEach(b=>{const book=makeBook(b,books.length);book.userData.shadow=contactShadow();books.push(book)});particles=pointCloud();editorial=window.createEditorialViews({T,scene,books,camera,reduced,restart});editorial.setView(view);fit();layout(100);
 await Promise.all(coverLoads);
 // Compile off the render path where KHR_parallel_shader_compile is available.
 // Keep the semantic covers visible until a complete frame is ready.
 await renderer.compileAsync(scene,camera);
 if(contextFailed)return;
 sceneReady=true;layout(100);renderScene();
 document.body.classList.add('gl');document.body.dataset.codexReady='true';
 if(reading){makeRig();restart()}else{activeUntil=0;frame=requestAnimationFrame(animate);}
}
function textTexture(title,body,n){
 const cv=document.createElement('canvas');cv.width=768;cv.height=1152;const g=cv.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,768,1152);
 g.strokeStyle='#bfa36b';g.beginPath();g.moveTo(52,105);g.lineTo(715,105);g.stroke();g.fillStyle='#806a36';g.font='20px Instrument Sans, sans-serif';g.fillText('M A C K E N Z I E   /   E D I T I O N S',52,76);
 let y=205;function wrap(txt,font,lh){g.font=font;let line='';for(const word of txt.split(/\s+/)){if(g.measureText(line+' '+word).width>640&&line){if(y<1010)g.fillText(line,54,y);y+=lh;line=word}else line+=(line?' ':'')+word;}if(y<1010)g.fillText(line,54,y);y+=lh}
 g.fillStyle='#111111';wrap(title,'54px Newsreader, Georgia',65);y+=30;wrap(body,'32px Newsreader, Georgia',43);g.fillStyle='#896e39';g.font='24px Instrument Sans,sans-serif';g.fillText(String(n+1).padStart(2,'0'),54,1070);
 const tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;return tx;
}
function leaf(item,n){
 const segments=20,w=1.53;const geo=new T.BoxGeometry(w,2.28,.007,segments,1,1);geo.translate(w/2,0,0);
 const pos=geo.attributes.position,indices=[],weights=[],bones=[];
 for(let j=0;j<=segments;j++){let b=new T.Bone();if(j){b.position.x=w/segments;bones[j-1].add(b);}bones.push(b);}
 for(let j=0;j<pos.count;j++){let along=clamp(pos.getX(j)/w)*segments,idx=Math.min(segments-1,Math.floor(along)),f=along-idx;indices.push(idx,idx+1,0,0);weights.push(1-f,f,0,0);}
 geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const tex=textTexture(item[0],item[1],n);const mat=new T.MeshStandardMaterial({map:tex,roughness:.94,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});const mesh=new T.SkinnedMesh(geo,mat);mesh.add(bones[0]);mesh.bind(new T.Skeleton(bones));mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData={bones,f:0,tex};return mesh;
}
function dropRig(){if(!rig)return;for(const p of pages){p.geometry.dispose();p.material.dispose();p.userData.tex.dispose();p.skeleton.dispose();}rig.removeFromParent();pages.length=0;rig=null;}
function makeRig(){dropRig();rig=new T.Group();rig.position.set(-.77,0,.16);books[selected].add(rig);BOOKS[selected].pages.forEach((v,i)=>{const p=leaf(v,i);p.position.z=.009*(BOOKS[selected].pages.length-i);rig.add(p);pages.push(p)})}
// Bone weights are tested at five poses; texture content is also available in the dialog DOM.
function pose(p,f){f=clamp(f);p.userData.f=f;const bones=p.userData.bones;
 // A π turn at the hinge and a zero-sum travelling bend keep both end poses flat.
 bones[0].rotation.y=-Math.PI*f;
 for(let i=1;i<bones.length;i++)bones[i].rotation.y=.26*Math.sin(Math.PI*f)*Math.sin(2*Math.PI*(i/bones.length-f*.7));
}
function layout(dt){
 if(!renderer)return;
 editorial?.layout(dt,time,reading);
 if(view!=='home'&&!reading){
  particles.position.set(0,0,-2);particles.scale.set(6,4,.7);particles.material.uniforms.uClipTop.value=0;particles.material.uniforms.uClipBottom.value=1;particles.material.uniforms.uOpacity.value=view==='writing'?.6:.25;particles.material.uniforms.uScatter.value=editorial?.state.hover||0;return;
 }
 particles.material.uniforms.uScatter.value=0;
 const mobile=innerWidth<=959,half=Math.tan(camera.fov*Math.PI/360)*camera.position.z,wide=half*camera.aspect;
 const speed=reduced.matches?1:1-Math.exp(-dt*8);
 const phone=innerWidth<768;
 const baseX=mobile?0:wide*.28,baseY=mobile?-half*.35+(phone?.25:0):0;
 books.forEach((g,i)=>{
  const focus=reading&&i===selected,weight=i===0?1-desired:desired;
  let scrollSize=(.84+.24*weight)*(mobile?Math.min(.62,wide*.57):1)*(phone?1.12:1);
  if(mobile&&mobileBounds&&!reading){
   const available=Math.max(40,mobileBounds.bottom-mobileBounds.top);
   scrollSize=Math.min(scrollSize,available/mobileBounds.height*(2*half*(8/8.5))/2.55);
  }
  const size=focus?(mobile?Math.min(.70,wide*.60):Math.min(1.04,wide*.34)):scrollSize;
  const targetScale=reading?(focus?size:.001):size;
  const z=focus?.5:mix(-.55,.5,weight);
  // Compensate for perspective so each rear cover remains legible at the sides.
  const x=focus?(mobile?.76*size:wide*.37+.72*size):(mobile?mix(wide*.52,-wide*.13,weight):baseX+mix(1.75,.35,weight))*((camera.position.z-z)/8);
  let y=focus?(mobile?half*.28:0):baseY+(1-weight)*.04;
  if(mobile&&mobileBounds&&!reading){
   const halfAtBook=half*(8/8.5),h=mobileBounds.height;
   const upper=(.5-mobileBounds.top/h)*2*halfAtBook-1.25*size;
   const lower=(.5-mobileBounds.bottom/h)*2*halfAtBook+1.25*size;
   y=clamp(y,Math.min(lower,upper),upper);
  }
  g.position.x=mix(g.position.x,x,speed);g.position.y=mix(g.position.y,y,speed);
  g.position.z=mix(g.position.z,z,speed);
  g.scale.setScalar(mix(g.scale.x,targetScale,speed));g.visible=g.scale.x>.008;
  g.rotation.y=mix(g.rotation.y,focus?.035:mix(-.46,-.38,weight),speed);
  g.rotation.x=mix(g.rotation.x,focus?-.085:-.035,speed);
  g.userData.hinge.rotation.y=mix(g.userData.hinge.rotation.y,focus?-Math.PI-.06:0,speed);
  const brightness=focus?1:mix(.68,1,weight);
  g.userData.accent.intensity=mix(g.userData.accent.intensity,focus?.3:mix(.06,.3,weight),speed);
  g.userData.materials.forEach((m,j)=>m.color.lerp(g.userData.baseColors[j].clone().multiplyScalar(brightness),speed));
  const shadow=g.userData.shadow;shadow.visible=g.visible;
  shadow.position.set(g.position.x,g.position.y-1.24*g.scale.x,g.position.z);
  shadow.scale.setScalar(g.scale.x);shadow.material.opacity=mix(shadow.material.opacity,reading?0:1,speed);
 });
 const atmosphereScale=mobile?Math.min(Math.min(.62,wide*.57)*(phone?1.12:1),books[active].scale.x/1.08):1;
 particles.position.set(mobile?0:baseX+.7,reading?baseY:books[active].position.y,-1.5);
 particles.material.uniforms.uClipTop.value=mobile&&mobileBounds?clamp(mobileBounds.top/mobileBounds.height):0;
 particles.material.uniforms.uClipBottom.value=mobile&&mobileBounds?clamp(mobileBounds.bottom/mobileBounds.height):1;
 particles.scale.set(7*atmosphereScale,4.5*atmosphereScale,.7*atmosphereScale);
 particles.material.uniforms.uOpacity.value=mix(particles.material.uniforms.uOpacity.value,reading?0:1,speed);
}
function renderScene(){
 renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.clear();
 const rect=viewport();if(!rect||rect.bottom<0||rect.top>innerHeight)return;
 if(!reading&&view!=='home'){
  renderer.setViewport(rect.left,innerHeight-rect.top-rect.height,rect.width,rect.height);
  renderer.setScissor(Math.max(0,rect.left),Math.max(0,innerHeight-rect.top-rect.height),Math.min(innerWidth,rect.width),Math.min(innerHeight,rect.height));renderer.setScissorTest(true);
 }
 renderer.render(scene,camera);renderer.setScissorTest(false);
}
function animate(ms){
 frame=0;
 if(!renderer||!sceneReady||contextFailed||document.hidden||(!regionVisible&&!reading))return;
 if(!reduced.matches&&ms-lastRender<33){frame=requestAnimationFrame(animate);return;}
 const dt=Math.min(.05,(ms-previous)/1000||.016);previous=ms;lastRender=ms;
 if(!reduced.matches&&!reading)time+=dt;
 particles.material.uniforms.uTime.value=time;layout(dt);renderScene();
 const first=books[0],second=books[1];
 experience.dataset.sceneState=JSON.stringify({
  view,editorial:editorial?.state,active,desired,particleCount:particles.geometry.attributes.position.count,
  first:{z:first.position.z,scale:first.scale.x},
  second:{z:second.position.z,scale:second.scale.x},
  bookCount:books.length,cameraAspect:camera.aspect,transparent:renderer.getClearAlpha()===0&&scene.background===null,
  transition:particles.material.uniforms.uTransitionProgress.value,
  atmosphere:{x:particles.scale.x,y:particles.scale.y,z:particles.position.z},reading
 });
 const dustMoving=!reading;
 if(!reduced.matches&&(ms<activeUntil||dustMoving))frame=requestAnimationFrame(animate);
}
function restart(){activeUntil=performance.now()+1500;if(!frame&&renderer&&sceneReady&&!contextFailed&&!document.hidden&&(regionVisible||reading))frame=requestAnimationFrame(animate)}

function cue(){
 if(muted)return;
 try{
  ctx??=new (window.AudioContext||window.webkitAudioContext)();
  ctx.resume().catch(()=>{});
  const count=Math.floor(ctx.sampleRate*.14),buffer=ctx.createBuffer(1,count,ctx.sampleRate),out=buffer.getChannelData(0);
  for(let i=0;i<count;i++)out[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/count)*.08;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1800;
  source.connect(filter).connect(ctx.destination);source.start();
 }catch{}
}
function showPage(){
 const item=BOOKS[selected].pages[folio];
 $('folioNo').textContent='Page '+(folio+1)+' / '+BOOKS[selected].pages.length;
 $('pageTitle').textContent=item[0];$('prose').replaceChildren();
 for(const text of item[1].split('\n')){
  const p=document.createElement('p');p.textContent=text;$('prose').append(p);
 }
 $('prev').disabled=folio===0;$('next').disabled=folio===BOOKS[selected].pages.length-1;
 $('buy').hidden=folio!==BOOKS[selected].pages.length-1||!BOOKS[selected].purchase;
 $('buy').href=BOOKS[selected].purchase||'#';$('buy').textContent='View '+BOOKS[selected].title+' on Amazon ↗';
 $('buy').target='_blank';$('buy').rel='noopener noreferrer';
 $('details').href=['/built/','/when-advantage-expires/'][selected];
 $('details').hidden=false;
 $('status').textContent=BOOKS[selected].title+', '+item[0]+', page '+(folio+1)+' of '+BOOKS[selected].pages.length;
 $('paper').scrollTop=0;
}
function turn(dir){
 if(transitioning||!reading)return;
 const next=clamp(folio+dir,0,BOOKS[selected].pages.length-1);if(next===folio)return;
 const leafIndex=dir>0?folio:next,p=pages[leafIndex];
 if(!p){folio=next;showPage();return}
 transitioning=true;cue();
 const state={value:p.userData.f};
 turnTween=gsap.to(state,{value:dir>0?1:0,duration:reduced.matches?0:.85,ease:'power2.inOut',onUpdate:()=>{pose(p,state.value);restart()},onComplete:()=>{folio=next;transitioning=false;showPage()}});
}
function openReader(index){
 if(reading)return;
 savedFocus=document.activeElement;selected=index;folio=0;reading=true;if(renderer)renderer.shadowMap.enabled=true;
 scroller?.stop();document.body.classList.add('reader-open');
 $('bookLabel').textContent=BOOKS[index].title;
 if(renderer&&!contextFailed)makeRig();
 showPage();dialog.showModal();dialog.prepend(rendererCanvas);fit();restart();$('close').focus();
}
function closeReader(){
 if(!reading)return;
 turnTween?.kill();
 reading=false;transitioning=false;dragging=null;if(renderer)renderer.shadowMap.enabled=false;
 dialog.close();document.getElementById('webgl-layer').append(rendererCanvas);document.body.classList.remove('reader-open');scroller?.start();
 // The reader meshes disappear immediately, while the case eases closed.
 dropRig();fit();restart();savedFocus?.focus({preventScroll:true});
}
home.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{
 e.preventDefault();
 if(renderer&&b.classList.contains('art-hit')&&e.detail){
  const rect=rendererCanvas.getBoundingClientRect();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
  const hits=ray.intersectObjects(books.filter(b=>b.visible),true);
  if(hits.length){let object=hits[0].object;while(object.parent&&!books.includes(object))object=object.parent;const index=books.indexOf(object);if(index>=0){openReader(index);return}}
 }
 openReader(Number(b.dataset.open));
});
home.querySelectorAll('[data-edition]').forEach(link=>link.addEventListener('click',event=>{
 event.preventDefault();const index=Number(link.dataset.edition);
 if(reading)closeReader();
 const destination=trigger.start+(trigger.end-trigger.start)*(index===0?.05:.85);
 scroller.scrollTo(destination,{duration:reduced.matches?0:1.1,immediate:reduced.matches,force:true});
 wakeScroll();
 if(reduced.matches){ScrollTrigger.update();progress(index)}
}));
$('close').onclick=closeReader;
dialog.addEventListener('cancel',e=>{e.preventDefault();closeReader()});
$('prev').onclick=()=>turn(-1);$('next').onclick=()=>turn(1);
dialog.addEventListener('keydown',e=>{
 if(e.key==='Tab'){
  const items=[...dialog.querySelectorAll('button,a[href]')].filter(x=>!x.disabled&&!x.hidden&&x.getClientRects().length);
  const first=items[0],last=items.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
 if(e.target.matches('input'))return;
 if(e.key==='ArrowRight'){e.preventDefault();turn(1)}
 if(e.key==='ArrowLeft'){e.preventDefault();turn(-1)}
});
$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(!muted));cue()};
$('drag').addEventListener('pointerdown',e=>{
 if(transitioning||contextFailed)return;dragging={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);
});
$('drag').addEventListener('pointermove',e=>{
 if(!dragging||!pages.length)return;
 const dx=e.clientX-dragging.x,forward=dx<0;
 const p=pages[forward?folio:folio-1];
 if(p){pose(p,(forward?0:1)+clamp(-dx/Math.max(180,innerWidth*.25),-1,1));restart();}
});
function release(e,cancelled=false){
 if(!dragging)return;const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;dragging=null;
 pages.forEach((p,i)=>pose(p,i<folio?1:0));
 if(cancelled||Math.abs(dy)>Math.abs(dx)+25)return;
 turn(Math.abs(dx)<8?1:dx<0?1:-1);
}
$('drag').addEventListener('pointerup',release);
$('drag').addEventListener('pointercancel',e=>release(e,true));
addEventListener('resize',()=>{ScrollTrigger.refresh();fit()});
addEventListener('scroll',()=>{if(view!=='home')restart()},{passive:true});
addEventListener('mackenzie-theme-change',()=>editorial?.theme());
// Pin refresh can change the stage after the window resize event.
const stageObserver=new ResizeObserver(()=>fit());stageObserver.observe(experience);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else restart()});
rendererCanvas.addEventListener('webglcontextlost',event=>{event.preventDefault();turnTween?.kill();transitioning=false;pages.forEach((p,i)=>pose(p,i<folio?1:0));fallback('WebGL context lost. Text reader is active.');});
rendererCanvas.addEventListener('webglcontextrestored',()=>{
 contextFailed=false;rendererCanvas.style.visibility='';document.body.classList.remove('no-gl');document.body.classList.add('gl');fit();restart();
});
reduced.addEventListener('change',()=>{scroller.options.smoothWheel=!reduced.matches;restart()});
initScroll();
window.MackenzieScene={
 beforeView(){if(reading)closeReader();trigger?.disable(true);cameraTween?.kill()},
 setView(next){
  view=next;regionVisible=true;document.body.classList.remove('codex-offstage');
  editorial?.setView(next);
  if(next==='home'){if(trigger)trigger.enable();else mountHomeTrigger();ScrollTrigger.refresh()}
  scroller?.resize();fit();
  if(camera)cameraTween=gsap.to(camera.position,{z:next==='home'?8.5:next==='books'?9:8,duration:reduced.matches?0:1.1,ease:'power2.inOut',onUpdate:restart});
  restart();
 },
 scrollTo(y){scroller?.scrollTo(y,{immediate:true,force:true});wakeScroll()},
 get renderer(){return renderer},get canvas(){return rendererCanvas},
 get state(){return {view,bookCount:books.length,particleCount:particles?.geometry.attributes.position.count,ready:sceneReady}}
};
document.addEventListener('click',event=>{const button=event.target.closest('[data-preview]');if(button)openReader(Number(button.dataset.preview))});
document.fonts.ready.then(()=>{
 document.body.classList.add('no-gl');
 const offer3D=()=>{
  const button=document.createElement('button');button.type='button';button.className='enable-3d';button.textContent='Enable 3D';
  button.setAttribute('aria-label','Enable 3D books. May be slower on this device.');
  button.onclick=()=>{button.disabled=true;button.textContent='Preparing 3D…';start(true).finally(()=>button.remove())};
  document.body.append(button);document.body.dataset.codexFallback='performance';
 };
 const start=async(force=false)=>{
  try{
   if(!force&&await window.MACKENZIE_GPU==='software'){offer3D();return;}
   gpuContext=rendererCanvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance',failIfMajorPerformanceCaveat:!force});
   const debug=gpuContext?.getExtension('WEBGL_debug_renderer_info');
   const device=debug?gpuContext.getParameter(debug.UNMASKED_RENDERER_WEBGL):'';
   const software=/SwiftShader|llvmpipe|softpipe|software rasterizer/i.test(device);
   if(!force&&(!gpuContext||software)){offer3D();return;}
   if(!gpuContext){fallback('WebGL is unavailable. Text reader is active.');return;}
   T=await window.loadMackenzieThree();
   await initScene();document.body.classList.remove('no-gl');fit();
  }catch(error){renderer?.dispose();renderer=null;fallback(error);}
 };
 if('requestIdleCallback' in window)requestIdleCallback(()=>start(),{timeout:1200});else setTimeout(()=>start(),100);
});
addEventListener('pagehide',event=>{
 if(event.persisted){cancelAnimationFrame(frame);frame=0;return;}
 stageObserver.disconnect();editorial?.dispose();cameraTween?.kill();turnTween?.kill();trigger?.kill();scroller?.destroy();cancelAnimationFrame(frame);dropRig();
 const geometries=new Set(),materials=new Set(),textures=new Set();
 scene?.traverse(object=>{
  if(object.geometry)geometries.add(object.geometry);
  const list=object.material?(Array.isArray(object.material)?object.material:[object.material]):[];
  list.forEach(material=>{materials.add(material);if(material.map)textures.add(material.map);if(material.normalMap)textures.add(material.normalMap);});
 });
 geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());renderer?.dispose();ctx?.close();
});
addEventListener('pageshow',event=>{if(event.persisted){fit();ScrollTrigger.refresh();restart();}});



})();
