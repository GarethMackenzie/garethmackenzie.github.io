// The original cover is the first-paint asset. WebGL progressively enhances it.
(async()=>{
 const cover=document.querySelector('#folio-1 .flat-cover');
 try{await cover?.decode()}catch{}
 const load=src=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;
  script.onload=resolve;script.onerror=()=>reject(new Error('Unable to load '+src));
  document.head.append(script);
 });
 try{
  await Promise.all([load('/assets/vendor/three.js'),load('/assets/vendor/gsap.js'),load('/assets/vendor/lenis.js')]);
  await load('/assets/vendor/st.js');
  await load('/assets/codex/scene.js');
 }catch{
  document.body.classList.add('no-gl');
 }
})();
