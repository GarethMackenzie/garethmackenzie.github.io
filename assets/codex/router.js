(()=>{
 const routes={'/':'home','/books/':'books','/insights/':'writing','/about/':'about','/media/':'media','/contact/':'contact','/built/':'detail','/when-advantage-expires/':'detail','/privacy/':'legal','/terms/':'legal'};
 const path=url=>{const p=new URL(url,location.href).pathname;return p==='/'?p:p.replace(/\/$/,'')+'/'};
 for(const slug of ['capital-allocation','leverage','asymmetric-risk','business-systems','decision-making','compounding','information-advantage','ownership','scale','strategic-execution'])routes['/insights/'+slug+'/']='article';
 const cache=new Map(),positions=new Map();let current=path(location.href),request=0;
 const initial=document.querySelector('main');
 const snapshot=doc=>({main:doc.querySelector('main'),robots:doc.querySelector('meta[name="robots"]')?.content||'index, follow',title:doc.title,description:doc.querySelector('meta[name="description"]')?.content||'',canonical:doc.querySelector('link[rel="canonical"]')?.href,social:[...doc.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')].map(n=>({property:n.getAttribute('property'),name:n.getAttribute('name'),content:n.content})),schemas:[...doc.querySelectorAll('script[type="application/ld+json"]')].map(n=>n.textContent)});
 cache.set(current,snapshot(document));
 async function get(route){
  if(cache.has(route))return cache.get(route);
  const response=await fetch(route,{headers:{Accept:'text/html'}});if(!response.ok)throw new Error('View unavailable');
  const doc=new DOMParser().parseFromString(await response.text(),'text/html'),entry=snapshot(doc);
  if(!entry.main||!entry.title)throw new Error('Invalid view');entry.document=doc;cache.set(route,entry);return entry;
 }
 const status=document.createElement('p');status.className='sr-only';status.setAttribute('role','status');document.body.append(status);
 function prepare(entry,view){
  entry.main.dataset.editorialView=view||'legal';
  entry.main.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
  if(entry.main.dataset.prepared)return;entry.main.dataset.prepared='true';
  entry.main.querySelectorAll('[data-scene-slot]').forEach(el=>el.remove());
  if(view==='books')entry.main.querySelectorAll('.catalogue-entry').forEach((item,i)=>{
   const slot=document.createElement('section');slot.className='scene-slot webgl-slot';slot.dataset.bookSlot=i;slot.setAttribute('aria-label',BOOK_LABELS[i]+' interactive cover');
   slot.innerHTML='<div class="inspection-controls"><button type="button" data-slot-orbit="-1" aria-label="Rotate cover left">↶</button><span>Drag to inspect · 360°</span><button type="button" data-slot-orbit="1" aria-label="Rotate cover right">↷</button></div><div class="preview-controls"><button type="button" data-preview="'+i+'">Open 3D Reader Preview</button></div>';
   item.prepend(slot);
  });
  if(view==='home'||view==='writing')entry.main.querySelectorAll(view==='home'?'.ledger li':'.insights-essay-card').forEach((row,i)=>{
   const slot=document.createElement('div');slot.className='webgl-slot essay-art';slot.dataset.essaySlot=i;slot.setAttribute('aria-hidden','true');row.append(slot);
  });
  if(view==='about'){
   const slot=document.createElement('section');slot.className='scene-slot webgl-slot';slot.dataset.sceneSlot='about';slot.setAttribute('aria-label','Architectural studio');slot.innerHTML='<p class="scene-caption">The studio</p>';entry.main.insertBefore(slot,entry.main.children[1]||null);
  }
 }
 const BOOK_LABELS=['BUILT','When Advantage Expires'];
 function metadata(entry){
  document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]').forEach(n=>n.remove());entry.social.forEach(m=>{const n=document.createElement('meta');n.setAttribute(m.property?'property':'name',m.property||m.name);n.content=m.content;document.head.append(n)});
  document.title=entry.title;document.querySelector('meta[name="robots"]')?.setAttribute('content',entry.robots);document.querySelector('meta[name="description"]')?.setAttribute('content',entry.description);
  if(entry.canonical)document.querySelector('link[rel="canonical"]')?.setAttribute('href',entry.canonical);
  document.querySelectorAll('script[type="application/ld+json"]').forEach(n=>n.remove());
  entry.schemas.forEach(text=>{const n=document.createElement('script');n.type='application/ld+json';n.textContent=text;document.head.append(n)});
 }
 function reflect(view){
  document.body.dataset.view=view;document.body.classList.toggle('article-page',view==='article');document.body.classList.toggle('author-home',view==='home');document.body.classList.toggle('codex-home',view==='home');document.body.classList.toggle('premium-page',view!=='home');
  document.querySelectorAll('[data-nav] a').forEach(a=>{if(path(a.href)===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 }
 async function navigate(url,{pop=false}={}){
  const destination=new URL(url,location.href),route=path(destination),id=++request;if(!routes[route])return;
  positions.set(current,scrollY);document.body.setAttribute('aria-busy','true');
  try{
   const entry=await get(route);if(id!==request)return;
   window.MackenzieScene?.beforeView();prepare(entry,routes[route]);document.querySelector('main').replaceWith(entry.main);current=route;
   if(!pop)history.pushState({mackenzie:true},'',destination.pathname+destination.search+destination.hash);
   metadata(entry);reflect(routes[route]);window.MackenzieScene?.setView(routes[route]);
   document.querySelector('[data-menu-button]')?.setAttribute('aria-expanded','false');const nav=document.querySelector('[data-nav]');nav?.classList.remove('open');if(nav)nav.inert=matchMedia('(max-width:1024px)').matches;document.body.classList.remove('menu-open');
   await new Promise(resolve=>requestAnimationFrame(resolve));if(id!==request)return;
   const target=destination.hash?document.getElementById(decodeURIComponent(destination.hash.slice(1))):null;
   const y=target?target.getBoundingClientRect().top+scrollY-96:pop?(positions.get(route)||0):0;
   window.MackenzieScene?.scrollTo(y);window.scrollTo({top:y,behavior:'instant'});
   const heading=entry.main.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}
   status.textContent=entry.title;dispatchEvent(new CustomEvent('mackenzie-view',{detail:{view:routes[route],path:route}}));
  }catch(error){if(id===request)location.assign(destination.href)}finally{if(id===request)document.body.removeAttribute('aria-busy')}
 }
 const ready=(async()=>{
  const home=await get('/');prepare(home,'home');
  if(!document.getElementById('reader'))document.body.append(home.document.getElementById('reader'));
  const layer=document.createElement('div');layer.id='webgl-layer';layer.setAttribute('aria-hidden','true');document.body.prepend(layer);
  layer.append(home.main.querySelector('#webgl-stage'));
  prepare(cache.get(current),routes[current]);reflect(routes[current]);history.scrollRestoration='manual';
  document.addEventListener('click',event=>{
   const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download')||link.hasAttribute('data-open')||link.hasAttribute('data-edition'))return;
   const url=new URL(link.href,location.href);if(url.origin!==location.origin||!routes[path(url)])return;
   // In-view anchors keep native semantics and the existing scroll controls.
   if(path(url)===current&&url.hash)return;
   event.preventDefault();navigate(url);
  });
  addEventListener('popstate',()=>navigate(location.href,{pop:true}));
  return home.main;
 })();
 window.MackenzieRouter={ready,get home(){return cache.get('/')?.main},get view(){return routes[current]},navigate};
})();
