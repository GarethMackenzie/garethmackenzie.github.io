import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const url=process.env.BASE_URL||'http://127.0.0.1:4173';
const out='qa-reports/codex';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const results=[],failures=[];
async function test(name,fn){try{await fn();results.push(name);console.log('PASS',name)}catch(e){failures.push(`${name}: ${e.stack}`);console.error('FAIL',name,e.message)}}
const settle=page=>page.waitForTimeout(1300);
async function start(context,{enable3D=true}={}){
 await context.addInitScript(()=>localStorage.setItem('built-analytics-consent','declined'));
 const page=await context.newPage();page.testErrors=[];page.on('pageerror',e=>page.testErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')page.testErrors.push(m.text())});page.on('requestfailed',r=>page.testErrors.push(r.url()+': '+r.failure()?.errorText));await page.goto(url,{waitUntil:'networkidle'});if(enable3D){await page.waitForFunction(()=>document.body.dataset.codexReady==='true'||document.querySelector('.enable-3d'));const opt=page.locator('.enable-3d');if(await opt.count())await opt.click()}return page;
}
for(const width of [320,390,768,1024,1440,1920]){
 await test(`${width}px: scene, two-way scroll, all readers, focus and screenshots`,async()=>{
 const context=await browser.newContext({viewport:{width,height:width<768?844:1000},recordVideo:width===1440?{dir:`${out}/recording`,size:{width:1440,height:1000}}:undefined,hasTouch:width<768});
 const page=await start(context),errors=page.testErrors;
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 try{
 await page.waitForFunction(()=>document.body.dataset.codexReady==='true',{},{timeout:20000});await settle(page);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'horizontal overflow');
 const state=()=>page.locator('#experience').evaluate(el=>JSON.parse(el.dataset.sceneState));
 let s=await state();assert.equal(s.active,0);assert.equal(s.transition,0);assert(s.first.z>s.second.z);assert(s.first.scale>s.second.scale);assert(s.third.visible);assert(s.first.z>s.third.z);assert.equal(s.atmosphere.z,-1.2);
 if(width>=960){assert.equal(s.atmosphere.x,3.6);assert.equal(s.atmosphere.y,4.4)}
 if(width<768){const bar=await page.locator('.edition-index').boundingBox();assert(bar.y+bar.height<=844-15,'chapter bar overlaps bottom safe margin');assert(bar.x>=15&&bar.x+bar.width<=width-15)}
 await page.screenshot({path:`${out}/hero-${width}.png`});
 await page.evaluate(()=>window.scrollTo(0,document.getElementById('experience').offsetHeight*1.65));await settle(page);
 s=await state();assert.equal(s.active,1);assert.equal(s.transition,1);assert(s.second.z>s.first.z);assert(s.second.z>s.third.z);
 assert.equal(await page.locator('#folio-2').getAttribute('aria-hidden'),'false');
 await page.screenshot({path:`${out}/second-${width}.png`});
 await page.evaluate(()=>window.scrollTo(0,document.getElementById('experience').offsetHeight*2.75));await settle(page);
 s=await state();assert.equal(s.active,2);assert.equal(s.transition,2);assert(s.third.z>s.first.z&&s.third.z>s.second.z);assert(s.third.scale>s.first.scale);assert.equal(await page.locator('#folio-3').getAttribute('aria-hidden'),'false');
 assert.equal(await page.locator('.edition-index [data-open="2"]').getAttribute('aria-current'),'true');
 await page.screenshot({path:`${out}/third-${width}.png`});
 await page.evaluate(()=>window.scrollTo(0,document.getElementById('experience').offsetHeight*1.65));await settle(page);assert.equal((await state()).transition,1);

 await page.evaluate(()=>window.scrollTo(0,0));await settle(page);assert.equal((await state()).active,0);
 for(const [i,title] of ['BUILT','When Advantage Expires','What Comes Next'].entries()){
  const entry=page.locator(`.edition-index [data-open="${i}"]`);await entry.click();await settle(page);
  assert.equal(await page.locator('#reader').evaluate(el=>el.open),true);assert((await page.locator('#bookLabel').innerText()).includes(title));
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
  if(i<2){
   await page.keyboard.press('ArrowRight');await settle(page);assert.match(await page.locator('#folioNo').textContent(),/Page 2/);
   await page.screenshot({path:`${out}/reader-${i}-${width}.png`});
   await page.keyboard.press('ArrowLeft');await settle(page);assert.match(await page.locator('#folioNo').textContent(),/Page 1/);
   const drag=await page.locator('#drag').boundingBox();
   if(width<768){
    const cdp=await context.newCDPSession(page),y=drag.y+drag.height*.4;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:drag.x+drag.width*.7,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:drag.x+drag.width*.2,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   }else{await page.mouse.move(drag.x+drag.width*.7,drag.y+drag.height*.4);await page.mouse.down();await page.mouse.move(drag.x+drag.width*.2,drag.y+drag.height*.4,{steps:8});await page.mouse.up()}
   await settle(page);
   assert.match(await page.locator('#folioNo').textContent(),/Page 2/);
  }else{assert.match(await page.locator('#prose').innerText(),/concept/i);assert(await page.locator('#next').isDisabled());assert(await page.locator('#buy').isHidden())}
  for(let n=0;n<9;n++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.getElementById('reader').contains(document.activeElement)),'focus escaped dialog')}
  await page.keyboard.press('Escape');assert.equal(await page.locator('#reader').evaluate(el=>el.open),false);assert.equal(await entry.evaluate(el=>el===document.activeElement),true);
 }
 // Rapid input and close during a page turn must not leave an inert page.
 await page.locator('.edition-index [data-open="0"]').click();await page.locator('#next').click();await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');
 await page.locator('.edition-index [data-open="1"]').click();assert.match(await page.locator('#folioNo').textContent(),/Page 1/);await page.locator('#close').click();
 assert.deepEqual(errors,[]);
 if(width===390||width===1440){
  const axe=await new AxeBuilder({page}).analyze();fs.writeFileSync(`${out}/axe-${width}.json`,JSON.stringify(axe,null,2));assert.equal(axe.violations.length,0,axe.violations.map(v=>v.id).join(','));
 }
 }finally{await context.close()}
 });
}
await test('short mobile viewports: safe chapter bar and three scroll stops',async()=>{
 for(const [width,height] of [[320,568],[390,667]]){
  const c=await browser.newContext({viewport:{width,height},hasTouch:true}),p=await start(c);
  await p.waitForFunction(()=>document.body.dataset.codexReady==='true');
  for(const [index,offset] of [[0,0],[1,1.65],[2,2.75]]){
   await p.evaluate(offset=>window.scrollTo(0,document.getElementById('experience').offsetHeight*offset),offset);await settle(p);
   const bar=await p.locator('.edition-index').boundingBox();assert(bar.y+bar.height<=height-15);assert(bar.y>=0);
   assert.equal(await p.locator('#experience').evaluate(el=>Math.round(el.getBoundingClientRect().height)),height);
   assert(await p.locator(`#folio-${index+1} .cta`).isVisible());
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   await p.screenshot({path:`${out}/compact-${width}-${height}-${index}.png`});
   await p.locator(`.edition-index [data-open="${index}"]`).click();assert(await p.locator('#reader').evaluate(el=>el.open));await p.keyboard.press('Escape');
  }
  await c.close();
 }
});
await test('reduced motion: immediate poses and working reader',async()=>{
 const c=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}}),p=await start(c);
 await p.waitForFunction(()=>document.body.dataset.codexReady==='true');await p.locator('.edition-index [data-open="1"]').click();await p.locator('#next').click();assert.match(await p.locator('#folioNo').textContent(),/Page 2/);await p.keyboard.press('Escape');await c.close();
});
await test('WebGL unavailable: semantic cover and text reader',async()=>{
 const c=await browser.newContext();await c.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args)}});
 const p=await start(c,{enable3D:false});await p.waitForFunction(()=>document.body.classList.contains('no-gl'));await p.locator('.edition-index [data-open="1"]').click();await p.locator('#next').click();assert.match(await p.locator('#folioNo').textContent(),/Page 2/);await p.screenshot({path:`${out}/fallback.png`});await c.close();
});
await test('WebGL context loss and resizing during reader transition',async()=>{
 const c=await browser.newContext(),p=await start(c);await p.waitForFunction(()=>document.body.dataset.codexReady==='true');await p.locator('.edition-index [data-open="0"]').click();await p.locator('#next').click();await p.setViewportSize({width:390,height:844});
 await p.evaluate(()=>{const canvas=document.getElementById('stage');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext()});await p.waitForFunction(()=>document.body.classList.contains('no-gl'));await p.keyboard.press('Escape');await p.locator('.edition-index [data-open="1"]').click();await p.locator('#next').click();assert.match(await p.locator('#folioNo').textContent(),/Page 2/);await c.close();
});
await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:results,failures},null,2));if(failures.length)process.exitCode=1;
