// The original cover is the first-paint asset. WebGL progressively enhances it.
(async()=>{
 let probeGPU;
 window.MACKENZIE_GPU=new Promise(resolve=>{probeGPU=()=>{
  if(!('Worker' in window)||!('OffscreenCanvas' in window)){resolve('unknown');return;}
  let worker,timer,done=false;
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);worker?.terminate();resolve(value)};
  try{
   worker=new Worker('/assets/codex/gpu-probe.js');
   worker.onmessage=event=>finish(event.data);
   worker.onerror=event=>{event.preventDefault();finish('unknown')};
   timer=setTimeout(()=>finish('unknown'),2500);
  }catch{finish('unknown')}
 };});
 const cover=document.querySelector('#folio-1 .flat-cover');
 try{await cover?.decode()}catch{}
 await document.fonts.ready;
 // Paint readable content before driver discovery and animation setup compete for CPU.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 probeGPU();
 const load=src=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;
  script.onload=resolve;script.onerror=()=>reject(new Error('Unable to load '+src));
  document.head.append(script);
 });
 let threePromise;
 window.loadMackenzieThree=()=>threePromise??=load('/assets/vendor/three.js').then(()=>window.THREE);
 try{
  await load('/assets/codex/router.js');await window.MackenzieRouter.ready;
  await Promise.all([load('/assets/vendor/gsap.js'),load('/assets/vendor/lenis.js')]);
  await load('/assets/vendor/st.js');
  await load('/assets/codex/views.js');await load('/assets/codex/scene.js');
 }catch{
  document.body.classList.add('no-gl');
 }
})();
