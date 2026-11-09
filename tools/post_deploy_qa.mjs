import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const base='https://mackenziebooks.bbroot.com', expected=process.env.EXPECTED_SHA;
assert.match(expected||'',/^[a-f0-9]{40}$/);
const routes=['/','/books/','/when-advantage-expires/','/built/','/about/','/insights/','/contact/'];
const assets=['/assets/codex/scene.js','/assets/codex/books.js','/assets/codex/bootstrap.js','/assets/codex/gpu-probe.js','/dist/author-home.css','/dist/site.css','/script.js','/assets/codex/router.js','/assets/codex/views.js','/dist/editorial-views.css'];
const hash=x=>createHash('sha256').update(x).digest('hex');
let served=false;
for(let i=0;i<60;i++){
 try{
  const response=await fetch(`${base}/release.json?rev=${expected}&attempt=${i}`,{signal:AbortSignal.timeout(10000)});
  if(response.ok&&(await response.json()).commit===expected){
   let identical=true;
   for(const route of [...routes,...assets]){
    const response=await fetch(base+route+'?rev='+expected,{signal:AbortSignal.timeout(10000)});
    const local=route.endsWith('/')?route.slice(1)+'index.html':route.slice(1);
    if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==hash(fs.readFileSync(local))){identical=false;break}
   }
   if(identical){served=true;break}
  }
 }catch(error){console.log('Waiting for verified release:',error.message)}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
assert(served,'The custom domain is not serving the intended commit and source files');
fs.mkdirSync('qa-reports/production',{recursive:true});
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
for(const width of [390,1440]){
 const c=await browser.newContext({viewport:{width,height:width===390?844:1000}});
 await c.addInitScript(()=>localStorage.setItem('built-analytics-consent','declined'));
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.body.dataset.codexReady==='true'||document.querySelector('.enable-3d'));if(await p.locator('.enable-3d').count())await p.locator('.enable-3d').click();await p.waitForFunction(()=>document.body.dataset.codexReady==='true');await p.waitForTimeout(1600);
 await p.screenshot({path:`qa-reports/production/home-${width}.png`});
 for(const [index,offset] of [[1,1.65],[0,0]]){
  await p.evaluate(offset=>window.scrollTo(0,document.getElementById('experience').offsetHeight*offset),offset);
  await p.waitForFunction(index=>{const s=JSON.parse(document.getElementById('experience').dataset.sceneState);return s.active===index&&s.transition===index},index);
  await p.waitForTimeout(1300);
  if(index===1)await p.screenshot({path:`qa-reports/production/second-${width}.png`});
 }

 for(const i of [0,1]){
  await p.locator(`.edition-index [data-edition="${i}"]`).click();
  await p.waitForFunction(i=>document.querySelector(`#folio-${i+1}`).getAttribute("aria-hidden")==="false",i);
  await p.locator(`.art-hit[data-open="${i}"]`).press("Enter");
  assert(await p.locator('#reader').evaluate(el=>el.open));
  if(i<2){await p.locator('#next').click();await p.waitForFunction(()=>document.getElementById('folioNo').textContent.startsWith('Page 2'))}
  await p.keyboard.press('Escape');
 }
 await p.evaluate(()=>{window.productionCanvas=document.querySelector('canvas#stage');window.productionRenderer=window.MackenzieScene.renderer});
 for(const [route,view] of [['/books/','books'],['/insights/','writing'],['/about/','about'],['/','home']]){
  await p.evaluate(route=>window.MackenzieRouter.navigate(new URL(route,location.href)),route);
  await p.waitForFunction(view=>window.MackenzieScene.state.view===view,view);
  assert(await p.evaluate(()=>document.querySelector('canvas#stage')===window.productionCanvas&&window.MackenzieScene.renderer===window.productionRenderer),'Persistent renderer on '+route);
  assert.equal(await p.locator('h1').count(),1);
  if(view==='books'){
   await p.locator('[data-preview="1"]').click();
   assert(await p.locator('#reader').evaluate(el=>el.open));
   await p.keyboard.press('Escape');
  }
  await p.waitForTimeout(1400);
  await p.screenshot({path:`qa-reports/production/${view}-${width}.png`});
 }
 for(const route of routes.slice(1)){
  const response=await p.goto(base+route,{waitUntil:'networkidle'});assert(response.ok(),route);
  assert(await p.locator('h1').isVisible(),route);
  assert(await p.evaluate(()=>[...document.images].every(i=>!i.complete||!i.currentSrc||i.naturalWidth>0)),route+' images');
 }
 assert.deepEqual(errors,[]);await c.close();
}
await browser.close();
fs.writeFileSync('qa-reports/production/results.json',JSON.stringify({commit:expected,domain:base,routes,verified:true},null,2));
console.log('Verified custom-domain source hashes, two readers, two-edition ledger, and existing pages at',expected);
