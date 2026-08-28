const { chromium } = require('playwright');

const baseUrl = 'https://garethmackenzie.github.io';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const routes = ['/', '/built/', '/about/', '/insights/', '/media/', '/contact/', '/privacy/', '/terms/'];
const widths = [320, 390, 768, 1024, 1440];
const failures = [];

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const context = await browser.newContext();
await context.addInitScript(() => localStorage.setItem('built-analytics-consent', 'denied'));
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => pageErrors.push(error.message));

for (const width of widths) {
  await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}?live-audit=2caa1c9`, { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => {
      const menu = document.querySelector('[data-menu-button]');
      const image = document.querySelector('picture img');
      return {
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        h1Count: document.querySelectorAll('h1').length,
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        analytics: [...document.scripts].some(script => script.src.endsWith('/analytics.js')),
        menuVisible: menu ? getComputedStyle(menu).display !== 'none' : false,
        menuWidth: menu?.getBoundingClientRect().width || 0,
        menuHeight: menu?.getBoundingClientRect().height || 0,
        imageSource: image?.currentSrc || ''
      };
    });

    if (result.overflow > 1) failures.push(`${width}px ${route}: overflow ${result.overflow}px`);
    if (result.h1Count !== 1) failures.push(`${width}px ${route}: ${result.h1Count} h1 elements`);
    if (!result.canonical.startsWith(baseUrl)) failures.push(`${width}px ${route}: wrong canonical`);
    if (!result.analytics) failures.push(`${width}px ${route}: analytics.js missing`);
    if (width <= 768 && (!result.menuVisible || result.menuWidth < 44 || result.menuHeight < 44)) {
      failures.push(`${width}px ${route}: mobile menu is not a 44px target`);
    }
    if (result.imageSource && width <= 390 && !result.imageSource.endsWith('.webp')) {
      failures.push(`${width}px ${route}: responsive WebP not selected`);
    }
  }
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}/?menu-audit=2caa1c9`, { waitUntil: 'networkidle' });
const menuButton = page.locator('[data-menu-button]');
await menuButton.click();
if (!(await page.locator('[data-nav]').evaluate(element => element.classList.contains('open')))) {
  failures.push('Mobile menu did not open');
}
await page.keyboard.press('Escape');
const menuClosed = await page.locator('[data-nav]').evaluate(element => !element.classList.contains('open'));
const focusReturned = await menuButton.evaluate(element => element === document.activeElement);
if (!menuClosed) failures.push('Mobile menu did not close with Escape');
if (!focusReturned) failures.push('Mobile menu did not return focus after Escape');

await page.goto(`${baseUrl}/?amazon-audit=2caa1c9`, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  document.addEventListener('click', event => {
    if (event.target.closest('a[data-amazon-cta]')) event.preventDefault();
  }, true);
});
await page.locator('a[data-amazon-cta]').first().click();
await page.waitForTimeout(200);
const amazonEvent = await page.evaluate(() => (window.dataLayer || []).some(entry => {
  const values = Array.from(entry);
  return values[0] === 'event' && values[1] === 'amazon_click';
}));
if (!amazonEvent) failures.push('Amazon CTA did not queue the amazon_click GA4 event');

await page.goto(`${baseUrl}/contact/?form-audit=2caa1c9`, { waitUntil: 'networkidle' });
const form = await page.locator('[data-contact-form]').evaluate(element => ({
  action: element.action,
  method: element.method,
  endpoint: element.dataset.endpoint,
  requiredFields: [...element.querySelectorAll('[required]')].map(field => field.name),
  sourceUrl: element.querySelector('[name="_url"]')?.value || ''
}));
if (form.action !== 'https://formsubmit.co/gmackenzie199@gmail.com') failures.push('Contact form fallback action is wrong');
if (form.method.toLowerCase() !== 'post') failures.push('Contact form fallback method is not POST');
if (form.endpoint !== 'https://formsubmit.co/ajax/gmackenzie199@gmail.com') failures.push('Contact AJAX endpoint is wrong');
if (form.requiredFields.join(',') !== 'name,email,category,message') failures.push('Contact required fields are incomplete');
if (form.sourceUrl !== `${baseUrl}/contact/`) failures.push('Contact source URL is wrong');

await browser.close();

const benignErrors = consoleErrors.filter(message => !message.includes('favicon'));
if (benignErrors.length) failures.push(`Console errors: ${benignErrors.join(' | ')}`);
if (pageErrors.length) failures.push(`Page errors: ${pageErrors.join(' | ')}`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Live audit passed: ${routes.length} routes across ${widths.length} viewport widths.`);
console.log('Mobile menu, responsive images, GitHub canonicals, GA4 loader, Amazon event, and contact form passed.');
