import fs from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const routes = [...sitemap.matchAll(/<loc>https:\/\/garethmackenzie\.github\.io([^<]*)<\/loc>/g)]
  .map((match) => match[1] || '/');
for (const route of ['/privacy/', '/terms/', '/404.html']) {
  if (!routes.includes(route)) routes.push(route);
}

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function note(message) {
  notes.push(message);
  console.log(`PASS ${message}`);
}

async function auditViewport(browser, viewport, label, { runAxe = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
  const page = await context.newPage();

  for (const route of routes) {
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    if (!response || !response.ok()) {
      fail(`${label} ${route}: HTTP ${response?.status() ?? 'no response'}`);
      continue;
    }

    const state = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      h1Count: document.querySelectorAll('h1').length,
      mainVisible: (() => {
        const main = document.querySelector('main');
        if (!main) return false;
        const style = getComputedStyle(main);
        const rect = main.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })(),
      brokenImages: [...document.images]
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src),
    }));

    if (state.scrollWidth > state.width + 2) {
      fail(`${label} ${route}: horizontal overflow ${state.scrollWidth}px > ${state.width}px`);
    }
    if (state.h1Count !== 1) {
      fail(`${label} ${route}: expected one h1, found ${state.h1Count}`);
    }
    if (!state.mainVisible) {
      fail(`${label} ${route}: main content is not visibly rendered`);
    }
    if (state.brokenImages.length) {
      fail(`${label} ${route}: broken images ${state.brokenImages.join(', ')}`);
    }

    if (runAxe) {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = results.violations.filter((violation) =>
        ['critical', 'serious'].includes(violation.impact)
      );
      for (const violation of blocking) {
        const details = violation.nodes.slice(0, 8).map((node) => {
          const target = Array.isArray(node.target) ? node.target.join(' ') : String(node.target);
          const summary = (node.failureSummary || '').replace(/\s+/g, ' ').trim();
          return `${target}${summary ? ` :: ${summary}` : ''}`;
        }).join(' | ');
        fail(`axe ${route}: ${violation.id} (${violation.impact}) — ${violation.help}; ${violation.nodes.length} node(s)${details ? `; ${details}` : ''}`);
      }
    }
  }

  await context.close();
  note(`${label}: ${routes.length} routes checked for overflow, H1, rendering and images`);
}

async function testMobileNavigation(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });

  await page.keyboard.press('Tab');
  const firstFocus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    className: document.activeElement?.className || '',
    outline: getComputedStyle(document.activeElement).outlineStyle,
  }));
  if (firstFocus.tag !== 'A' || !String(firstFocus.className).includes('skip-link')) {
    fail(`keyboard: first Tab should focus the skip link, got ${firstFocus.tag}.${firstFocus.className}`);
  }
  if (firstFocus.outline === 'none') {
    fail('keyboard: focused skip link has no visible outline');
  }

  const button = page.locator('[data-menu-button]');
  await button.click();
  if ((await button.getAttribute('aria-expanded')) !== 'true') {
    fail('mobile nav: menu button did not set aria-expanded=true');
  }
  if (!(await page.locator('[data-nav]').isVisible())) {
    fail('mobile nav: navigation is not visible after opening');
  }

  await page.keyboard.press('Escape');
  if ((await button.getAttribute('aria-expanded')) !== 'false') {
    fail('mobile nav: Escape did not close menu');
  }
  const focusReturned = await page.evaluate(() => document.activeElement?.matches('[data-menu-button]') || false);
  if (!focusReturned) fail('mobile nav: focus did not return to menu button after Escape');

  await context.close();
  note('mobile navigation keyboard/open/close behavior checked');
}

async function testBreakpointBoundary(browser) {
  for (const width of [1024, 1025]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => ({
      buttonDisplay: getComputedStyle(document.querySelector('[data-menu-button]')).display,
      navDisplay: getComputedStyle(document.querySelector('[data-nav]')).display,
      expanded: document.querySelector('[data-menu-button]')?.getAttribute('aria-expanded'),
    }));
    if (width === 1024 && state.buttonDisplay === 'none') {
      fail('1024px breakpoint: compact menu button is not displayed');
    }
    if (width === 1024 && state.navDisplay !== 'none') {
      fail(`1024px breakpoint: closed compact nav should be hidden, got ${state.navDisplay}`);
    }
    if (width === 1025 && state.buttonDisplay !== 'none') {
      fail(`1025px breakpoint: desktop menu button should be hidden, got ${state.buttonDisplay}`);
    }
    if (width === 1025 && state.navDisplay === 'none') {
      fail('1025px breakpoint: desktop navigation is hidden');
    }
    await context.close();
  }
  note('1024/1025px responsive navigation boundary checked');
}

async function testNoJavaScriptFallback(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  for (const route of ['/', '/about/', '/insights/capital-allocation/']) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => ({
      navVisible: (() => {
        const nav = document.querySelector('[data-nav]');
        return nav ? getComputedStyle(nav).display !== 'none' : false;
      })(),
      mainVisible: (() => {
        const main = document.querySelector('main');
        return main ? getComputedStyle(main).display !== 'none' && main.getBoundingClientRect().height > 0 : false;
      })(),
      hiddenRevealCount: [...document.querySelectorAll('.reveal')].filter((el) => getComputedStyle(el).opacity === '0').length,
      hiddenHeroCount: [...document.querySelectorAll('.hero-step')].filter((el) => getComputedStyle(el).opacity === '0').length,
    }));
    if (!state.navVisible) fail(`no-JS ${route}: navigation fallback is hidden`);
    if (!state.mainVisible) fail(`no-JS ${route}: main content is hidden`);
    if (state.hiddenRevealCount) fail(`no-JS ${route}: ${state.hiddenRevealCount} reveal elements remain hidden`);
    if (state.hiddenHeroCount) fail(`no-JS ${route}: ${state.hiddenHeroCount} hero elements remain hidden`);
  }
  await context.close();
  note('JavaScript-disabled navigation and content fallbacks checked');
}

async function testReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  const state = await page.evaluate(() => {
    const hero = document.querySelector('.hero-step');
    const reveal = document.querySelector('.reveal');
    const heroStyle = hero ? getComputedStyle(hero) : null;
    const revealStyle = reveal ? getComputedStyle(reveal) : null;
    return {
      media: matchMedia('(prefers-reduced-motion: reduce)').matches,
      heroOpacity: heroStyle?.opacity,
      heroTransform: heroStyle?.transform,
      revealOpacity: revealStyle?.opacity,
      revealTransform: revealStyle?.transform,
    };
  });
  if (!state.media) fail('reduced motion: browser preference not active');
  if (state.heroOpacity !== '1' || state.heroTransform !== 'none') {
    fail(`reduced motion: hero remains animated/hidden (${JSON.stringify(state)})`);
  }
  if (state.revealOpacity !== '1' || state.revealTransform !== 'none') {
    fail(`reduced motion: reveal content remains animated/hidden (${JSON.stringify(state)})`);
  }
  await context.close();
  note('reduced-motion rendering checked');
}

async function testAuthorPhoto(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const checks = [
    ['/', '.home-author-portrait img'],
    ['/about/', '.author-portrait img'],
    ['/media/', '.media-assets-grid figure:last-child img'],
  ];

  for (const [route, selector] of checks) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    const state = await page.locator(selector).evaluate((img) => {
      const style = getComputedStyle(img);
      return {
        objectFit: style.objectFit,
        transform: style.transform,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
    });
    if (state.objectFit !== 'contain') {
      fail(`author photo ${route}: object-fit is ${state.objectFit}, expected contain`);
    }
    if (state.transform !== 'none') {
      fail(`author photo ${route}: transform is ${state.transform}, expected none`);
    }
    if (!state.naturalWidth || !state.naturalHeight) {
      fail(`author photo ${route}: source image failed to load`);
    }
  }
  await context.close();
  note('author portrait non-cropping treatment checked on Home, About and Media');
}

async function testTextZoom(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const representative = ['/', '/about/', '/built/', '/insights/', '/insights/capital-allocation/', '/contact/', '/404.html'];
  for (const route of representative) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.waitForTimeout(50);
    const state = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    if (state.scrollWidth > state.width + 2) {
      fail(`200% text scale ${route}: horizontal overflow ${state.scrollWidth}px > ${state.width}px`);
    }
  }
  await context.close();
  note('representative pages checked at 200% root text scale');
}

async function testAnalyticsConsent(browser) {
  const acceptContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const acceptPage = await acceptContext.newPage();
  const acceptRequests = [];
  acceptPage.on('request', (request) => {
    if (request.url().includes('googletagmanager.com/gtag/js')) acceptRequests.push(request.url());
  });
  await acceptPage.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  if (acceptRequests.length) fail('analytics consent: Google tag requested before consent');
  await acceptPage.locator('[data-consent-accept]').click();
  await acceptPage.waitForTimeout(250);
  if (!acceptRequests.length) fail('analytics consent: accepting analytics did not initiate Google tag request');
  await acceptContext.close();

  const declineContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const declinePage = await declineContext.newPage();
  const declineRequests = [];
  declinePage.on('request', (request) => {
    if (request.url().includes('googletagmanager.com/gtag/js')) declineRequests.push(request.url());
  });
  await declinePage.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await declinePage.locator('[data-consent-decline]').click();
  await declinePage.waitForTimeout(250);
  if (declineRequests.length) fail('analytics consent: declining analytics still initiated Google tag request');
  await declineContext.close();
  note('analytics network behavior before accept/after decline checked');
}

async function testContactFormSemantics(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/contact/`, { waitUntil: 'networkidle' });
  const state = await page.evaluate(() => {
    const form = document.querySelector('[data-contact-form]');
    const status = document.getElementById('form-status');
    const required = [...form.querySelectorAll('[required]')];
    return {
      endpointIsHttps: String(form?.dataset.endpoint || '').startsWith('https://'),
      statusRole: status?.getAttribute('role'),
      statusLive: status?.getAttribute('aria-live'),
      requiredCount: required.length,
      allInitiallyInvalid: required.every((el) => !el.checkValidity()),
    };
  });
  if (!state.endpointIsHttps) fail('contact form: endpoint is not HTTPS');
  if (state.statusRole !== 'status' || state.statusLive !== 'polite') {
    fail(`contact form: status region is not accessible (${JSON.stringify(state)})`);
  }
  if (state.requiredCount < 4 || !state.allInitiallyInvalid) {
    fail(`contact form: required validation is incomplete (${JSON.stringify(state)})`);
  }
  await context.close();
  note('contact form validation semantics and status region checked');
}

const browser = await chromium.launch({ headless: true });
try {
  const viewports = [
    [{ width: 320, height: 800 }, '320px'],
    [{ width: 390, height: 844 }, '390px'],
    [{ width: 768, height: 1024 }, '768px'],
    [{ width: 1024, height: 768 }, '1024px'],
    [{ width: 1025, height: 800 }, '1025px'],
    [{ width: 1440, height: 1000 }, '1440px'],
    [{ width: 1920, height: 1080 }, '1920px'],
  ];
  for (const [viewport, label] of viewports) {
    await auditViewport(browser, viewport, label, { runAxe: label === '1440px' });
  }
  await testMobileNavigation(browser);
  await testBreakpointBoundary(browser);
  await testNoJavaScriptFallback(browser);
  await testReducedMotion(browser);
  await testAuthorPhoto(browser);
  await testTextZoom(browser);
  await testAnalyticsConsent(browser);
  await testContactFormSemantics(browser);
} finally {
  await browser.close();
}

console.log(`Browser QA checked ${routes.length} routes across seven viewport widths.`);
if (failures.length) {
  console.error(`Browser QA failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}
console.log('Browser QA passed with no blocking defects.');
