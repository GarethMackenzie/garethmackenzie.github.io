import fs from 'node:fs';
import vm from 'node:vm';
const approved={window:{}};vm.runInNewContext(fs.readFileSync('assets/books.js','utf8'),approved);
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const routes=[...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>https:\/\/mackenziebooks\.bbroot\.com([^<]*)<\/loc>/g)].map(m=>m[1]||'/');
for(const r of ['/privacy/','/terms/','/404.html'])if(!routes.includes(r))routes.push(r);
assert.equal(approved.window.MACKENZIE_BOOKS[0].purchase,'https://a.co/d/0gLDcpvu');
assert.equal(approved.window.MACKENZIE_BOOKS[1].purchase,'https://www.amazon.com/dp/B0HQ3FSX3Y?dplnkId=87e87c65-b5c9-48b5-8f40-81b798e15fad&nodl=1');
const out='qa-reports/editorial';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
const errors=[],missing=[],retired=[];let checks=0;
try{
 for(const [width,height] of [[320,568],[390,664],[768,1024],[1024,768],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height}});
  await context.addInitScript(()=>localStorage.setItem('built-analytics-consent','declined'));
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url())});
  page.on('request',r=>{if(/assets\/(codex|vendor)\//.test(r.url()))retired.push(r.url())});
  for(const theme of ['obsidian','light']){
   await page.goto(base);await page.evaluate(theme=>localStorage.setItem('mackenzie_theme',theme),theme);
   for(const route of routes){
    const response=await page.goto(base+route,{waitUntil:'networkidle'});assert(response.ok(),route);
    await page.evaluate(()=>document.fonts.ready);
    // Scroll every image into view so lazy sources are tested, too.
    for(const img of await page.locator('main img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());}
    const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,h1:document.querySelectorAll('h1').length,canvases:document.querySelectorAll('canvas').length,theme:document.documentElement.dataset.theme,broken:[...document.images].filter(i=>i.currentSrc&&i.complete&&!i.naturalWidth).length}));
    assert(state.overflow<=2,`${route} ${width} ${theme} overflow ${state.overflow}`);assert.equal(state.h1,1,route);assert.equal(state.canvases,0);assert.equal(state.broken,0);assert.equal(state.theme,theme);
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`${out}/${theme}-${width}-${route.replace(/[^a-z0-9]/g,'')||'home'}.png`,fullPage:true});checks++;
   }
   await page.goto(base);
   assert.equal(await page.locator('.book-feature').count(),2);
   for(const book of [0,1]){
    const card=page.locator('.book-feature').nth(book),opener=card.locator('[data-preview]');
    const data=await page.evaluate(i=>window.MACKENZIE_BOOKS[i],book);
    assert.equal(await card.locator('a[target="_blank"]').getAttribute('href'),data.purchase);
    const cover=await card.locator('img').evaluate(i=>({w:i.width,h:i.height,nw:i.naturalWidth,nh:i.naturalHeight,fit:getComputedStyle(i).objectFit}));
    assert(Math.abs(cover.w/cover.h-cover.nw/cover.nh)<.02,'Cover aspect ratio');
    await opener.press('Enter');assert(await page.locator('#reader').evaluate(d=>d.open));
    assert.equal(await page.locator('.reader-buy').getAttribute('href'),data.purchase);
    assert.equal(await page.locator('[data-previous]').isDisabled(),true);
    for(let n=0;n<data.pages.length;n++){
     assert.equal(await page.locator('.reader-page h3').textContent(),data.pages[n][0]);
     assert.deepEqual(await page.locator('.reader-prose p').allTextContents(),data.pages[n][1].split('\n'));
     assert.equal(await page.locator('#reader-position').textContent(),`Page ${n+1} of ${data.pages.length}`);
     assert(await page.locator('.reader-buy').isVisible());
     const box=await page.locator('[data-close-reader]').boundingBox();assert(box.y>=0&&box.y+box.height<=height,'Close control stays in viewport');const buyBox=await page.locator('.reader-buy').boundingBox();assert(buyBox.y>=0&&buyBox.y+buyBox.height<=height,'Purchase control stays in viewport');const readerBox=await page.locator('#reader').boundingBox();if(width<=480)assert.equal(readerBox.width,width,'Mobile reader uses available screen width');
     if(n===2){
      const axe=await new AxeBuilder({page}).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`Reader axe ${width} ${theme}`);
      await page.screenshot({path:`${out}/reader-${book}-${theme}-${width}.png`});
     }
     if(n<data.pages.length-1)await page.keyboard.press('ArrowRight');
    }
    assert(await page.locator('[data-next]').isDisabled());
    await page.keyboard.press('ArrowLeft');assert((await page.locator('#reader-position').textContent()).startsWith('Page 5'));
    await page.locator('[data-close-reader]').focus();await page.keyboard.press('Shift+Tab');assert(await page.locator('.reader-about').evaluate(el=>el===document.activeElement));
    await page.keyboard.press('Tab');assert(await page.locator('[data-close-reader]').evaluate(el=>el===document.activeElement));
    await page.keyboard.press('Escape');assert(!(await page.locator('#reader').evaluate(d=>d.open)));assert(await opener.evaluate(el=>el===document.activeElement));
    await opener.click();await page.locator('[data-close-reader]').click();assert(await opener.evaluate(el=>el===document.activeElement));
   }
  }
  // Native navigation, history and hash targets must work without a router.
  await page.goto(base);await page.locator('.book-feature').first().locator('a[href="/built/"]').last().click();assert(new URL(page.url()).pathname==='/built/');
  await page.goBack();assert(new URL(page.url()).pathname==='/');await page.goForward();assert(new URL(page.url()).pathname==='/built/');
  await page.goto(base+'/built/#preview');assert(await page.locator('#preview').isVisible());
  await page.locator('[data-theme-toggle]').click();const theme=await page.locator('html').getAttribute('data-theme');await page.goto(base+'/about/');assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
  await context.close();console.log(`PASS ${width}px: ${routes.length} routes, both themes, covers and both six-page readers`);
 }
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:664}}),page=await context.newPage();
 for(const [i,route] of [[0,'/built/'],[1,'/when-advantage-expires/']]){await page.goto(base);await page.locator(`a[data-preview="${i}"]`).click();assert(page.url().endsWith(route+'#preview'));assert.equal(await page.locator('.sample-pages details').count(),6);for(let n=0;n<6;n++){const sample=page.locator('.sample-pages details').nth(n);assert.equal(await sample.locator('summary').textContent(),approved.window.MACKENZIE_BOOKS[i].pages[n][0]);assert.equal((await sample.locator('p').allTextContents()).join('\n'),approved.window.MACKENZIE_BOOKS[i].pages[n][1]);}await page.locator('.sample-pages summary').nth(2).click();assert(await page.locator('.sample-pages details').nth(2).evaluate(el=>el.open));}
 await context.close();assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.deepEqual(retired,[]);
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,routes,widths:[320,390,768,1024,1440],themes:['obsidian','light'],errors,missing,retired},null,2));
 console.log(`Editorial QA passed: ${checks} route/theme/viewport checks plus reader and navigation checks.`);
}finally{await browser.close()}
