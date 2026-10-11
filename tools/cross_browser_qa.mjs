import fs from 'node:fs';
import { firefox, webkit } from 'playwright';

// Smoke test for the two engines the Chromium-based audits do not cover.
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const routes = [...sitemap.matchAll(/<loc>https:\/\/mackenziebooks\.bbroot\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
routes.push('/privacy/', '/terms/', '/404.html');
const failures = [];
const fail = (message) => { failures.push(message); console.error(`FAIL ${message}`); };

for (const [name, engine] of [['firefox', firefox], ['webkit', webkit]]) {
  const browser = await engine.launch();
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => localStorage.setItem('built-analytics-consent', 'declined'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    for (const route of routes) {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
      if (!response || !response.ok()) { fail(`${name} ${width}px ${route}: HTTP ${response?.status()}`); continue; }
      await page.evaluate(() => document.fonts.ready);
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: document.querySelectorAll('h1').length,
        webFontsLoaded: [...document.fonts].filter((face) => face.status === 'loaded' && !face.family.includes('Fallback')).length,
        brokenImages: [...document.images].filter((img) => img.complete && img.currentSrc && img.naturalWidth === 0).length,
      }));
      if (state.overflow > 2) fail(`${name} ${width}px ${route}: horizontal overflow ${state.overflow}px`);
      if (state.h1 !== 1) fail(`${name} ${width}px ${route}: expected one h1, found ${state.h1}`);
      if (state.webFontsLoaded < 2) fail(`${name} ${width}px ${route}: web fonts did not load (${state.webFontsLoaded})`);
      if (state.brokenImages) fail(`${name} ${width}px ${route}: ${state.brokenImages} broken image(s)`);
    }
    if (errors.length) fail(`${name} ${width}px: script errors ${errors.slice(0, 3).join(' | ')}`);
    if (width === 390) {
      await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
      await page.locator('[data-menu-button]').click();
      if (!(await page.locator('[data-nav]').isVisible())) fail(`${name}: compact navigation did not open`);
      await page.keyboard.press('Escape');
      if (await page.locator('[data-nav]').isVisible()) fail(`${name}: Escape did not close compact navigation`);
    }
    await context.close();
  }
  await browser.close();
  console.log(`${name}: ${routes.length} routes at three widths checked`);
}
if (failures.length) { console.error(`Cross-browser QA failed with ${failures.length} issue(s).`); process.exit(1); }
console.log('Cross-browser QA passed with no blocking defects.');
