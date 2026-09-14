import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

async function grantedContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('built-analytics-consent', 'granted');
    document.addEventListener('click', (event) => {
      const link = event.target.closest?.('a[href*="a.co/"], a[href*="amazon."]');
      if (link) event.preventDefault();
    }, true);
  });
  await context.route('https://www.googletagmanager.com/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: ''
  }));
  return context;
}

async function eventPayloads(page, eventName) {
  return page.evaluate((name) => window.dataLayer
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === 'event' && entry[1] === name)
    .map((entry) => entry[2] || {}), eventName);
}

async function testFrameworkAndDiscovery(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });

  const state = await page.evaluate(() => ({
    foundations: [...document.querySelectorAll('.foundation-card h3')].map((el) => el.textContent.trim()).sort(),
    diagram: [...document.querySelectorAll('.system-map .node')].map((el) => el.textContent.trim()).sort(),
    hasMisleadingIntro: document.body.textContent.includes('Read the introduction'),
    premise: document.querySelector('#premise p:not(.editorial-quote)')?.textContent.trim() || ''
  }));

  if (JSON.stringify(state.foundations) !== JSON.stringify(state.diagram)) {
    fail(`framework: foundation list and diagram differ (${JSON.stringify(state)})`);
  }
  if (state.hasMisleadingIntro) fail('book discovery: misleading Read the introduction label remains');
  if (!state.premise.includes('Luck, timing and income influence financial outcomes.')) {
    fail(`homepage premise: qualified wording missing (${state.premise})`);
  }

  await context.close();
  pass('homepage framework consistency and book-discovery wording checked');
}

async function testInsightsStructure(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/insights/`, { waitUntil: 'networkidle' });

  const state = await page.evaluate(() => ({
    primaryCount: document.querySelectorAll('.insights-essay-card').length,
    readingPathCount: document.querySelectorAll('.insights-index .learning-grid > li').length,
    anchorIds: ['capital-allocation', 'leverage', 'asymmetric-risk', 'business-systems', 'decision-making', 'compounding', 'information-advantage', 'ownership', 'scale', 'strategic-execution']
      .filter((id) => document.getElementById(id)).length
  }));

  if (state.primaryCount !== 10) fail(`insights: expected 10 primary essays, found ${state.primaryCount}`);
  if (state.readingPathCount !== 3) fail(`insights: reading path should have 3 distinct stages, found ${state.readingPathCount}`);
  if (state.anchorIds !== 10) fail(`insights: preserved ${state.anchorIds}/10 historical anchor ids`);

  await context.close();
  pass('Insights catalogue, reading path and anchors checked');
}

async function testTypography(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });

  const selectors = [
    '.nav > a:not(.button)',
    '.foundation-card a',
    '.text-link',
    '.system-map .node',
    'footer .footer-links a',
    '[data-analytics-preferences]',
    '.consent-banner p'
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.count())) {
      fail(`typography: missing ${selector}`);
      continue;
    }
    const size = await locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    if (size < 14) fail(`typography: ${selector} renders at ${size}px, expected at least 14px`);
  }

  const consentHeight = await page.locator('[data-consent-accept]').evaluate((el) => el.getBoundingClientRect().height);
  if (consentHeight < 44) fail(`touch target: consent accept button is ${consentHeight}px high`);

  await context.close();
  pass('functional typography and consent touch target checked');
}

async function testAnalyticsPreferences(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('https://www.googletagmanager.com/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: ''
  }));
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });

  if (!(await page.locator('[data-consent-banner]').isVisible())) fail('analytics preferences: first-visit panel is missing');
  if (!(await page.locator('[data-analytics-preferences]').count())) fail('analytics preferences: persistent footer control is missing');

  await page.locator('[data-consent-accept]').click();
  const granted = await page.evaluate(() => localStorage.getItem('built-analytics-consent'));
  if (granted !== 'granted') fail(`analytics preferences: accept stored ${granted}`);

  await page.locator('[data-analytics-preferences]').click();
  await page.locator('[data-consent-decline]').click();
  const denied = await page.evaluate(() => localStorage.getItem('built-analytics-consent'));
  if (denied !== 'denied') fail(`analytics preferences: withdrawal stored ${denied}`);

  await page.locator('[data-analytics-preferences]').click();
  await page.locator('[data-consent-accept]').click();
  const scriptCount = await page.locator('script[data-built-analytics-script]').count();
  if (scriptCount !== 1) fail(`analytics preferences: expected one Google tag script, found ${scriptCount}`);

  await context.close();
  pass('analytics accept, withdraw, reopen and reload-safe script behavior checked');
}

async function testAmazonAttribution(browser) {
  const context = await grantedContext(browser);
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });

  await page.locator('header a[href*="a.co/"]').click();
  await page.locator('.premium-hero a[href*="a.co/"]').click();
  await page.locator('.closing-band a[href*="a.co/"]').click();

  let events = await eventPayloads(page, 'amazon_click');
  const homeLocations = events.map((event) => event.cta_location);
  for (const expected of ['header', 'home_hero', 'home_closing']) {
    if (!homeLocations.includes(expected)) fail(`amazon attribution: homepage missing ${expected}`);
  }

  await page.goto(`${baseURL}/built/`, { waitUntil: 'networkidle' });
  await page.locator('.built-cover-section a[href*="a.co/"]').click();
  await page.locator('footer a[href*="a.co/"]').click();
  events = await eventPayloads(page, 'amazon_click');
  const builtLocations = events.map((event) => event.cta_location);
  for (const expected of ['book_page', 'footer']) {
    if (!builtLocations.includes(expected)) fail(`amazon attribution: BUILT page missing ${expected}`);
  }

  for (const event of events) {
    for (const field of ['page_path', 'cta_location', 'link_url', 'link_text']) {
      if (!event[field]) fail(`amazon attribution: event missing ${field}`);
    }
    for (const forbidden of ['name', 'email', 'message']) {
      if (Object.hasOwn(event, forbidden)) fail(`amazon attribution: event contains personal field ${forbidden}`);
    }
  }

  await context.close();
  pass('outbound Amazon click placement and non-personal fields checked');
}

async function fillContact(page) {
  await page.locator('#name').fill('Test Visitor');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#category').selectOption('book');
  await page.locator('#message').fill('Automated QA message.');
}

async function testQueryOnlyContactState(browser) {
  const context = await grantedContext(browser);
  const page = await context.newPage();
  await page.goto(`${baseURL}/contact/?sent=1#form`, { waitUntil: 'networkidle' });

  const status = await page.locator('#form-status').textContent();
  if (/sent successfully|accepted your message/i.test(status || '')) {
    fail(`contact query state: URL alone produced success text (${status})`);
  }
  const leads = await eventPayloads(page, 'generate_lead');
  if (leads.length) fail(`contact query state: URL visit produced ${leads.length} lead event(s)`);

  await context.close();
  pass('query-only contact success and lead tracking blocked');
}

async function testContactAccepted(browser) {
  const context = await grantedContext(browser);
  await context.route('https://formsubmit.co/ajax/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: 'true', message: 'Accepted' })
  }));
  const page = await context.newPage();
  await page.goto(`${baseURL}/contact/`, { waitUntil: 'networkidle' });
  await fillContact(page);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#form-status')?.textContent.includes('FormSubmit accepted your message'));

  const leads = await eventPayloads(page, 'generate_lead');
  if (leads.length !== 1) fail(`contact accepted: expected one lead event, found ${leads.length}`);
  if (leads[0] && Object.keys(leads[0]).some((key) => ['name', 'email', 'message'].includes(key))) {
    fail('contact accepted: lead event contains a personal field');
  }
  const values = await page.evaluate(() => ({
    name: document.querySelector('#name').value,
    email: document.querySelector('#email').value,
    message: document.querySelector('#message').value
  }));
  if (values.name || values.email || values.message) fail(`contact accepted: form did not reset (${JSON.stringify(values)})`);

  await context.close();
  pass('mocked FormSubmit acceptance produces one consented lead event');
}

async function testContactFailure(browser) {
  const context = await grantedContext(browser);
  await context.route('https://formsubmit.co/ajax/**', route => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ success: 'false' })
  }));
  const page = await context.newPage();
  await page.goto(`${baseURL}/contact/`, { waitUntil: 'networkidle' });
  await fillContact(page);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#form-status')?.textContent.includes('was not accepted'));

  const leads = await eventPayloads(page, 'generate_lead');
  if (leads.length) fail(`contact failure: failed request produced ${leads.length} lead event(s)`);
  const values = await page.evaluate(() => ({
    name: document.querySelector('#name').value,
    email: document.querySelector('#email').value,
    message: document.querySelector('#message').value
  }));
  if (!values.name || !values.email || !values.message) fail(`contact failure: form values were not preserved (${JSON.stringify(values)})`);

  await context.close();
  pass('mocked FormSubmit failure preserves input and produces no lead');
}

const browser = await chromium.launch({ headless: true });
try {
  await testFrameworkAndDiscovery(browser);
  await testInsightsStructure(browser);
  await testTypography(browser);
  await testAnalyticsPreferences(browser);
  await testAmazonAttribution(browser);
  await testQueryOnlyContactState(browser);
  await testContactAccepted(browser);
  await testContactFailure(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Product QA failed with ${failures.length} issue(s).`);
  process.exit(1);
}
console.log('Product QA passed with no blocking defects.');
