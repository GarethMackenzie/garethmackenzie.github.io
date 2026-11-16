import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const base='https://mackenziebooks.bbroot.com', expected=process.env.EXPECTED_SHA;
assert.match(expected||'',/^[a-f0-9]{40}$/);
const routes=['/','/books/','/when-advantage-expires/','/built/','/about/','/insights/','/contact/'];
const assets=['/assets/books.js','/assets/reader.js','/dist/author-home.css','/dist/site.css','/dist/pages.css','/insight-article.css','/script.js','/analytics.js'];
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
const browser=await chromium.launch();
for(const width of [390,1440]){
 const c=await browser.newContext({viewport:{width,height:width===390?844:1000}});
 await c.addInitScript(()=>localStorage.setItem('built-analytics-consent','declined'));
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base,{waitUntil:'networkidle'});
 assert.equal(await p.locator('canvas').count(),0);
 assert.equal(await p.locator('.book-feature').count(),2);
 await p.screenshot({path:`qa-reports/production/home-${width}.png`});
 for(const i of [0,1]){
  const opener=p.locator(`a[data-preview="${i}"]`);
  await opener.press('Enter');assert(await p.locator('#reader').evaluate(el=>el.open));
  const purchase=await p.evaluate(i=>window.MACKENZIE_BOOKS[i].purchase,i);
  assert.equal(await p.locator('.reader-buy').getAttribute('href'),purchase);
  await p.locator('[data-next]').click();assert((await p.locator('#reader-position').textContent()).startsWith('Page 2'));
  await p.keyboard.press('Escape');assert(await opener.evaluate(el=>el===document.activeElement));
 }
 await p.locator('[data-theme-toggle]').click();
 const theme=await p.locator('html').getAttribute('data-theme');
 await p.goto(base+'/about/');assert.equal(await p.locator('html').getAttribute('data-theme'),theme);
 for(const route of routes.slice(1)){
  const response=await p.goto(base+route,{waitUntil:'networkidle'});assert(response.ok(),route);
  assert(await p.locator('h1').isVisible(),route);
  assert(await p.evaluate(()=>[...document.images].every(i=>!i.complete||!i.currentSrc||i.naturalWidth>0)),route+' images');
 }
 assert.deepEqual(errors,[]);await c.close();
}
await browser.close();
fs.writeFileSync('qa-reports/production/results.json',JSON.stringify({commit:expected,domain:base,routes,verified:true},null,2));
console.log('Verified custom-domain source hashes, two readers, both static book presentations, and existing pages at',expected);
