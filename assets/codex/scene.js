(()=>{
const BOOKS=window.MACKENZIE_BOOKS;
const T=THREE, $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)');
const rendererCanvas=$('stage'), dialog=$('reader'), books=[], pages=[];
let turnTween, sceneReady=false;
const coverLoads=[];
const experience=document.getElementById("experience");
let regionVisible=true,contextFailed=false,lastRender=0,activeUntil=0,panelsReady=false;
let renderer,camera,scene,particles,rig,folio=0,active=0,reading=false,trigger,scroller,savedFocus,ctx,muted=true,frame=0,previous=0,time=0,selected=0,dragging=null,transitioning=false,desired=0;
const mix=(a,b,t)=>a+(b-a)*t, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function progress(value){
 const next=clamp(value,0,1);if(panelsReady&&Math.abs(next-desired)<.00001)return;
 panelsReady=true;desired=next;active=desired<.5?0:1;
 document.querySelectorAll('.folio').forEach((panel,i)=>{
  panel.setAttribute('aria-hidden',String(i!==active));panel.inert=i!==active;
 });
 document.querySelectorAll('.edition-index [data-open]').forEach((link,i)=>link.setAttribute('aria-current',String(i===active)));
 if(particles)particles.material.uniforms.uTransitionProgress.value=desired;
 restart();
}
gsap.registerPlugin(ScrollTrigger);gsap.ticker.lagSmoothing(0);
function initScroll(){
 scroller=new Lenis({smoothWheel:!reduced.matches,lerp:.13,prevent:node=>Boolean(node.closest('#reader,.nav,.consent-banner'))});
 scroller.on('scroll',ScrollTrigger.update);
 gsap.ticker.add(t=>scroller.raf(t*1000));
 document.body.classList.add('codex-ready');
 trigger=ScrollTrigger.create({
  trigger:experience,start:'top top',end:()=>'+='+experience.offsetHeight*2,
  pin:true,anticipatePin:1,invalidateOnRefresh:true,
  onUpdate:self=>{if(!reading)progress(clamp((self.progress-.25)/.5))},
  onToggle:self=>{regionVisible=self.isActive||self.progress===0;restart()}
 });
 progress(clamp((trigger.progress-.25)/.5));
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
function makeBook(b,index){
 const group=new T.Group(), binding=new T.MeshStandardMaterial({color:0x665339,roughness:.67,metalness:.18}), cream=new T.MeshStandardMaterial({color:0xefece4,roughness:.88});
 // The case has its own front and back boards; its recessed core exposes the page edges.
 const shell=box(1.6,2.4,.28,new T.MeshStandardMaterial({color:0x887644,roughness:.65}));
 shell.scale.set(.038,1,1);shell.position.x=-.771; group.add(shell);
 const block=box(1.56,2.34,.25,cream);group.add(block);
 const back=box(1.6,2.4,.018,binding);back.position.z=-.135;group.add(back);
 const hinge=new T.Group();hinge.position.set(-.8,0,.139);group.add(hinge);
 const face=new T.MeshStandardMaterial({map:coverTexture(b.cover),color:index===1?0xefece4:0xffffff,roughness:.72,metalness:.035});
 const lid=box(1.6,2.4,.018,[binding,binding,binding,binding,face,cream]);lid.position.x=.8;hinge.add(lid);
 const materials=[...new Set([binding,cream,shell.material,face])];
 group.userData={hinge,block,materials,baseColors:materials.map(m=>m.color.clone())};group.rotation.y=-.45;scene.add(group);return group;
}
const particleVertex=`
uniform float uTransitionProgress,uTime,uDpr;
attribute vec3 aSand,aHalo;attribute float aSeed;
varying float vSeed;
// Analytic curl of a smooth 3D vector potential. Divergence-free motion avoids
// the many finite-difference noise samples that stalled low-powered renderers.
vec3 curl(vec3 p){return vec3(cos(p.y)+sin(p.z),cos(p.z)+sin(p.x),cos(p.x)+sin(p.y));}
void main(){float t=uTransitionProgress;float a=smoothstep(0.,1.,t),b=smoothstep(1.,2.,t);vec3 sand=aSand;
float y=fract(aSeed+uTime*.10)*2.-1.;sand.y=-y*1.65;sand.xz*=.12+abs(y)*.34;
vec3 p=position+sin(3.14159*a)*(sand-position)*.35;
float motion=sin(3.14159*fract(t));if(motion>.01)p+=curl(p*.86+vec3(uTime*.12))*.045*motion;
p.y+=b*(1.-b)*1.1;
vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((3.+3.*aSeed)*uDpr/max(1.,-mv.z),1.,4.*uDpr);vSeed=aSeed;}`;
const particleFragment=`
uniform float uDark,uOpacity;varying float vSeed;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
vec3 c=mix(vec3(.40,.30,.11),vec3(.93,.76,.42),uDark);gl_FragColor=vec4(c,exp(-18.*d*d)*(1.-smoothstep(.30,.5,d))*(.32+.52*vSeed)*uOpacity);}`;
function pointCloud(){
 const n=innerWidth<=959?24000:60000,geom=new T.BufferGeometry(),a=new Float32Array(n*3),b=new Float32Array(n*3),c=new Float32Array(n*3),s=new Float32Array(n);
 let seed=81273;const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
 for(let i=0;i<n;i++){
 const u=rand(),y=-1.5+u*3.9;
 const spireRadius=.48*Math.pow(1-u,.65)+.015;
 const rib=Math.floor(rand()*8),angle=rib*Math.PI/4+(rand()-.5)*.10;
 const ribRadius=spireRadius*(.82+.18*rand());
 let x=ribRadius*Math.cos(angle),z=ribRadius*Math.sin(angle);
 if(rand()<.24){const ringAngle=rand()*Math.PI*2;x=spireRadius*Math.cos(ringAngle);z=spireRadius*Math.sin(ringAngle);}
 a.set([x,y,z],3*i);let ang=rand()*Math.PI*2,r=Math.sqrt(rand());b.set([r*Math.cos(ang),0,r*Math.sin(ang)],3*i);
 let radius=1.6+rand()*.53;c.set([radius*Math.cos(ang),.48*radius*Math.sin(ang)+.22*Math.cos(ang),.7*radius*Math.sin(ang)],3*i);s[i]=rand();}
 for(const [key,arr,size] of [['position',a,3],['aSand',b,3],['aHalo',c,3],['aSeed',s,1]])geom.setAttribute(key,new T.BufferAttribute(arr,size));
 const mat=new T.ShaderMaterial({vertexShader:particleVertex,fragmentShader:particleFragment,transparent:true,depthWrite:false,uniforms:{uTransitionProgress:{value:desired},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uDark:{value:1},uOpacity:{value:1}}});
 const cloud=new T.Points(geom,mat);cloud.frustumCulled=false;scene.add(cloud);return cloud;
}
function contactShadow(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,2,64,64,62);
 gradient.addColorStop(0,'rgba(0,0,0,.48)');gradient.addColorStop(.5,'rgba(0,0,0,.18)');gradient.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const material=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,toneMapped:false});
 const mesh=new T.Mesh(new T.PlaneGeometry(2.5,.65),material);mesh.rotation.x=-1.1;scene.add(mesh);return mesh;
}
function dimensions(){return reading?{width:innerWidth,height:innerHeight}:{width:experience.clientWidth,height:experience.clientHeight};}
function fit(){
 if(!renderer)return;
 const size=dimensions();
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<=959?1.5:2));
 renderer.setSize(size.width,size.height,false);camera.aspect=size.width/size.height;camera.updateProjectionMatrix();
 particles.material.uniforms.uDpr.value=renderer.getPixelRatio();restart();
}
function fallback(message){
 console.warn(message);contextFailed=true;
 cancelAnimationFrame(frame);frame=0;
 document.body.classList.remove('gl');document.body.classList.add('no-gl');
 rendererCanvas.style.visibility='hidden';
 $('status').textContent='The text reader remains available.';
}
async function initScene(){
 renderer=new T.WebGLRenderer({canvas:rendererCanvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=false;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.setClearColor(0x0d0d0c,1);scene=new T.Scene();scene.background=new T.Color(0x0d0d0c);camera=new T.PerspectiveCamera(44,1,.1,60);camera.position.z=8.5;
 scene.add(new T.HemisphereLight(0xfff7e3,0xb4a991,1.1));
 const light=new T.DirectionalLight(0xfff2d5,1.8);light.position.set(-3,5,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0004;scene.add(light);
BOOKS.forEach(b=>{const book=makeBook(b,books.length);book.userData.shadow=contactShadow();books.push(book)});particles=pointCloud();fit();layout(100);
 await Promise.all(coverLoads);
 // Compile off the render path where KHR_parallel_shader_compile is available.
 // Keep the semantic covers visible until a complete frame is ready.
 await renderer.compileAsync(scene,camera);
 if(contextFailed)return;
 sceneReady=true;layout(100);renderer.render(scene,camera);
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
 const segments=14,w=1.53;const geo=new T.BoxGeometry(w,2.28,.007,segments,1,1);geo.translate(w/2,0,0);
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
 const mobile=innerWidth<=959,half=Math.tan(camera.fov*Math.PI/360)*camera.position.z,wide=half*camera.aspect;
 const speed=reduced.matches?1:1-Math.exp(-dt*8);
 const heroX=mobile?-.22:wide*.32,backX=mobile?wide*.62:wide*.78;
 books.forEach((g,i)=>{
  const focus=reading&&i===selected,weight=i<2?1-Math.abs(i-desired):0;
  const scrollSize=(.85+.30*weight)*(mobile?Math.min(.62,wide*.57):1);
  const size=focus?(mobile?Math.min(.70,wide*.60):Math.min(1.04,wide*.34)):scrollSize;
  const targetScale=reading?(focus?size:.001):(i<2?size:.001);
  const x=focus?(mobile?.76*size:wide*.37+.72*size):mix(backX,heroX,weight);
  const y=focus?(mobile?half*.28:0):(mobile?-half*.35:0);
  g.position.x=mix(g.position.x,x,speed);g.position.y=mix(g.position.y,y,speed);
  g.position.z=mix(g.position.z,focus?.5:mix(-.9,.5,weight),speed);
  g.scale.setScalar(mix(g.scale.x,targetScale,speed));g.visible=g.scale.x>.008;
  g.rotation.y=mix(g.rotation.y,focus?.035:(i===1?-.42:-.45),speed);
  g.rotation.x=mix(g.rotation.x,focus?-.085:-.035,speed);
  g.userData.hinge.rotation.y=mix(g.userData.hinge.rotation.y,focus?-Math.PI-.06:0,speed);
  const brightness=focus?1:mix(.48,1,weight);
  g.userData.materials.forEach((m,j)=>m.color.lerp(g.userData.baseColors[j].clone().multiplyScalar(brightness),speed));
  const shadow=g.userData.shadow;shadow.visible=g.visible;
  shadow.position.set(g.position.x,g.position.y-1.24*g.scale.x,g.position.z);
  shadow.scale.setScalar(g.scale.x);shadow.material.opacity=mix(shadow.material.opacity,reading?0:1,speed);
 });
 particles.position.set(heroX,mobile?-half*.35:0,-1.3);
 particles.rotation.y=.3;particles.scale.setScalar(mobile?.45:1.07);
 particles.material.uniforms.uOpacity.value=mix(particles.material.uniforms.uOpacity.value,reading?0:1,speed);
}
function animate(ms){
 frame=0;
 if(!renderer||!sceneReady||contextFailed||document.hidden||(!regionVisible&&!reading))return;
 if(!reduced.matches&&ms-lastRender<33){frame=requestAnimationFrame(animate);return;}
 const dt=Math.min(.05,(ms-previous)/1000||.016);previous=ms;lastRender=ms;
 if(!reduced.matches&&!reading)time+=dt;
 particles.material.uniforms.uTime.value=time;layout(dt);renderer.render(scene,camera);
 const first=books[0],second=books[1];
 experience.dataset.sceneState=JSON.stringify({
  active,desired,particleCount:particles.geometry.attributes.position.count,
  first:{z:first.position.z,scale:first.scale.x},
  second:{z:second.position.z,scale:second.scale.x},reading
 });
 if(!reduced.matches&&ms<activeUntil)frame=requestAnimationFrame(animate);
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
 $('buy').href=BOOKS[selected].purchase||'#';$('buy').textContent='View BUILT on Amazon ↗';
 $('buy').target='_blank';$('buy').rel='noopener';
 $('details').href=['/built/','/when-advantage-expires/','#concept'][selected];
 $('details').hidden=selected===2;
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
 dialog.close();experience.prepend(rendererCanvas);document.body.classList.remove('reader-open');scroller?.start();
 // The reader meshes disappear immediately, while the case eases closed.
 dropRig();fit();restart();savedFocus?.focus({preventScroll:true});
}
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{
 e.preventDefault();
 if(renderer&&b.classList.contains('art-hit')&&e.detail){
  const rect=rendererCanvas.getBoundingClientRect();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
  const hits=ray.intersectObjects(books.filter(b=>b.visible),true);
  if(hits.length){let object=hits[0].object;while(object.parent&&!books.includes(object))object=object.parent;const index=books.indexOf(object);if(index>=0){openReader(index);return}}
 }
 openReader(Number(b.dataset.open));
});
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
addEventListener('resize',()=>{fit();ScrollTrigger.refresh()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else restart()});
rendererCanvas.addEventListener('webglcontextlost',event=>{event.preventDefault();turnTween?.kill();transitioning=false;pages.forEach((p,i)=>pose(p,i<folio?1:0));fallback('WebGL context lost. Text reader is active.');});
rendererCanvas.addEventListener('webglcontextrestored',()=>{
 contextFailed=false;rendererCanvas.style.visibility='';document.body.classList.remove('no-gl');document.body.classList.add('gl');fit();restart();
});
reduced.addEventListener('change',()=>{scroller.options.smoothWheel=!reduced.matches;restart()});
initScroll();
document.fonts.ready.then(()=>{
 const start=async()=>{try{await initScene()}catch(error){renderer?.dispose();renderer=null;fallback(error);}};
 if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:1200});else setTimeout(start,100);
});
addEventListener('pagehide',event=>{
 if(event.persisted){cancelAnimationFrame(frame);frame=0;return;}
 turnTween?.kill();trigger?.kill();scroller?.destroy();cancelAnimationFrame(frame);dropRig();
 const geometries=new Set(),materials=new Set(),textures=new Set();
 scene?.traverse(object=>{
  if(object.geometry)geometries.add(object.geometry);
  const list=object.material?(Array.isArray(object.material)?object.material:[object.material]):[];
  list.forEach(material=>{materials.add(material);if(material.map)textures.add(material.map);});
 });
 geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());renderer?.dispose();ctx?.close();
});
addEventListener('pageshow',event=>{if(event.persisted){fit();ScrollTrigger.refresh();restart();}});



})();
