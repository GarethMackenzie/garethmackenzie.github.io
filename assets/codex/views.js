// Additional compositions share the renderer, camera, lights and book meshes.
window.createEditorialViews=({T,scene,books,camera,reduced,restart})=>{
 const root=new T.Group();scene.add(root);
 const gold=new T.MeshStandardMaterial({color:0xc5a059,metalness:.72,roughness:.35});
 const stone=new T.MeshStandardMaterial({color:0x151412,metalness:.2,roughness:.65});
 const rooms={books:new T.Group(),writing:new T.Group(),about:new T.Group()};Object.values(rooms).forEach(g=>root.add(g));
 const mesh=(geometry,material,parent,x=0,y=0,z=0)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m};
 [-1.25,1.25].forEach(x=>{
  mesh(new T.CylinderGeometry(.94,1.03,.28,48),stone,rooms.books,x,-1.52);
  mesh(new T.TorusGeometry(.96,.014,8,64),gold,rooms.books,x,-1.37).rotation.x=Math.PI/2;
  const spot=new T.SpotLight(0xffeed0,12,12,.46,.8,1.5);spot.position.set(x,4,3);spot.target.position.set(x,0,0);rooms.books.add(spot,spot.target);
 });
 const engravingUniforms={uTime:{value:0},uHover:{value:0},uGold:{value:new T.Color(0xc5a059)}};
 const engravingMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:engravingUniforms,vertexShader:`uniform float uTime,uHover;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*4.+uTime)*cos(p.y*3.-uTime*.5)*.045*uHover;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 uGold;uniform float uHover;varying vec2 vUv;void main(){vec2 p=abs(fract(vUv*32.)-.5);float grid=1.-smoothstep(.018,.04,min(p.x,p.y));float edge=smoothstep(0.,.16,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));gl_FragColor=vec4(uGold,grid*edge*(.06+.12*uHover));}`});
 mesh(new T.PlaneGeometry(4.7,4.2,32,32),engravingMat,rooms.writing,0,0,-.25);
 const bridge=new T.Group(),hourglass=new T.Group();rooms.writing.add(bridge,hourglass);
 const lineMat=new T.LineBasicMaterial({color:0xc5a059,transparent:true,opacity:.8});
 function line(points,parent){const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const l=new T.Line(g,lineMat);parent.add(l);return l}
 for(const z of [-.15,.15]){
  for(const x of [-1.1,1.1]){line([[x-.13,-1,z],[x-.13,1.2,z],[x+.13,1.2,z],[x+.13,-1,z]],bridge)}
  line([[-2,-.5,z],[2,-.5,z]],bridge);
  const cable=[];for(let i=0;i<=40;i++){const x=-2+i*.1,y=.1+.7*Math.pow(Math.abs(x)/1.1,2);cable.push([x,Math.min(1.2,y),z]);if(i%3===0)line([[x,-.5,z],[x,Math.min(1.2,y),z]],bridge)}line(cable,bridge);
 }
 for(const y of [-1.25,1.25])mesh(new T.TorusGeometry(.85,.025,8,64),gold,hourglass,0,y).rotation.x=Math.PI/2;
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2,points=[];for(let j=0;j<=24;j++){const y=-1.25+j/24*2.5,r=.12+.73*Math.abs(y/1.25);points.push([Math.cos(a)*r,y,Math.sin(a)*r])}line(points,hourglass)}
 const monolith=new T.Group();rooms.about.position.x=-.45;rooms.about.add(monolith);
 mesh(new T.BoxGeometry(1.25,3.2,.68),stone,monolith);
 const edges=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.27,3.22,.70)),lineMat);monolith.add(edges);
 for(let i=0;i<7;i++)mesh(new T.BoxGeometry(.018,2.6-i*.24,.035),gold,monolith,-.47+i*.155,0,.365);
 const portal=new T.Group();portal.position.set(1.45,-.1,-.4);portal.rotation.y=-.25;rooms.about.add(portal);
 const glass=new T.MeshPhysicalMaterial({color:0xb1b8b4,metalness:.1,roughness:.12,transparent:true,opacity:.16,depthWrite:false});
 mesh(new T.BoxGeometry(1.2,1.8,.06),glass,portal);
 portal.add(new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.26,1.86,.1)),lineMat));
 // A supplied, same-origin film can be connected here. No empty player or upload UI.
 let video,videoTexture;
 const source=window.MACKENZIE_STUDIO_VIDEO;
 if(typeof source==='string'&&source.startsWith('/assets/')&&!source.includes('..')){
  video=document.createElement('video');video.src=source;video.loop=true;video.muted=true;video.playsInline=true;video.preload='none';
  videoTexture=new T.VideoTexture(video);mesh(new T.PlaneGeometry(1.16,1.74),new T.MeshBasicMaterial({map:videoTexture}),portal,0,0,.06);
 }
 const cursorLight=new T.PointLight(0xffe6a6,.65,12,2);cursorLight.position.set(0,2,4);scene.add(cursorLight);
 const studioLight=new T.SpotLight(0xffe6a6,10,15,.5,.8,1.5);studioLight.position.set(1,3,4);studioLight.target=monolith;rooms.about.add(studioLight);
 let view='home',angle=0,targetAngle=0,pointer={x:0,y:0},hover=0,targetHover=0,essay=0,drag;
 const abort=new AbortController(),options={signal:abort.signal};
 document.addEventListener('pointermove',e=>{
  pointer={x:e.clientX/innerWidth*2-1,y:1-e.clientY/innerHeight*2};
  if(drag&&e.pointerId===drag.id){targetAngle=drag.angle+(e.clientX-drag.x)*.012;restart()}
  if(!reduced.matches)restart();
 },options);
 document.addEventListener('pointerdown',e=>{const slot=e.target.closest('[data-scene-slot="books"]');if(!slot||e.target.closest('button,a')||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,angle:targetAngle};slot.setPointerCapture(e.pointerId)},options);
 for(const name of ['pointerup','pointercancel'])document.addEventListener(name,()=>drag=null,options);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-orbit]');if(b){targetAngle+=Number(b.dataset.orbit)*Math.PI/4;restart()}},options);
 const highlight=e=>{const row=e.target.closest('.insights-essay-card');if(row){essay=[...document.querySelectorAll('.insights-essay-card')].indexOf(row);targetHover=1;restart()}};
 document.addEventListener('pointerover',highlight,options);document.addEventListener('focusin',highlight,options);
 document.addEventListener('pointerout',e=>{if(e.target.closest('.insights-essay-card')&&!e.relatedTarget?.closest?.('.insights-essay-card'))targetHover=0},options);
 return {
  setView(next){view=next;drag=null;Object.entries(rooms).forEach(([k,g])=>g.visible=k===view);if(video){if(view==='about'&&!reduced.matches)video.play().catch(()=>{});else video.pause()}},
  layout(dt,time,reading){
   const ease=reduced.matches?1:1-Math.exp(-dt*7);angle+=(targetAngle-angle)*ease;hover+=(targetHover-hover)*ease;
   cursorLight.position.lerp(new T.Vector3(pointer.x*4,pointer.y*3,4),ease);studioLight.position.copy(cursorLight.position);
   root.visible=!reading;if(view==='home'||reading)return;
   books.forEach((book,i)=>{
    const inRoom=view==='books';book.visible=true;book.scale.lerp(new T.Vector3().setScalar(inRoom?.76:.22),ease);
    book.position.lerp(new T.Vector3(inRoom?(i?1.25:-1.25):(i?2:-2),inRoom?-.12:-2,inRoom?0:-5),ease);
    book.rotation.y+=( (inRoom?angle-.25:0)-book.rotation.y)*ease;book.rotation.x+=(0-book.rotation.x)*ease;book.userData.hinge.rotation.y*=1-ease;
    book.userData.materials.forEach((m,j)=>m.color.lerp(book.userData.baseColors[j].clone().multiplyScalar(inRoom?1:.3),ease));book.userData.shadow.visible=false;
   });
   bridge.visible=essay%2===0;hourglass.visible=!bridge.visible;
   const artwork=bridge.visible?bridge:hourglass;
   artwork.rotation.y+=(pointer.x*.22-artwork.rotation.y)*ease;artwork.rotation.x+=(-pointer.y*.09-artwork.rotation.x)*ease;
   artwork.position.z+=(hover*.55-artwork.position.z)*ease;
   engravingUniforms.uHover.value=hover;engravingUniforms.uTime.value=time;
   monolith.rotation.y=reduced.matches?-.28:-.28+Math.sin(time*.12)*.18+Math.min(1,scrollY/Math.max(1,document.body.scrollHeight-innerHeight))*.5;
  },
  theme(){const color=getComputedStyle(document.documentElement).getPropertyValue('--gold-primary').trim();gold.color.set(color);lineMat.color.set(color);engravingUniforms.uGold.value.set(color)},
  get state(){return {view,angle,essay,hover,videoSupplied:!!video}},
  dispose(){abort.abort();video?.pause();if(video){video.removeAttribute('src');video.load()}videoTexture?.dispose()}
 };
};
