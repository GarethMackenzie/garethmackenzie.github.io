import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const failures = [];
const fail = (message) => { failures.push(message); console.error(`FAIL ${message}`); };
const pass = (message) => console.log(`PASS ${message}`);

const series = [
  ['/insights/capital-allocation/', 'Capital allocation is the operating system of wealth'],
  ['/insights/leverage/', 'Leverage should multiply a system, not a weakness'],
  ['/insights/asymmetric-risk/', 'Design the shape of the risk before you chase the upside'],
  ['/insights/business-systems/', 'A system turns good decisions into repeatable outcomes'],
  ['/insights/decision-making/', 'Decision quality depends on the frame before the choice'],
  ['/insights/compounding/', 'Compounding rewards continuity more than intensity'],
  ['/insights/information-advantage/', 'Information advantage is about better decisions, not more data'],
  ['/insights/ownership/', 'Ownership changes the relationship between effort and outcome'],
  ['/insights/scale/', 'Scale should expand what already works'],
  ['/insights/strategic-execution/', 'Strategy becomes real only when execution has a system'],
];

const browser = await chromium.launch({ headless: true });
try {
  // Raw-source semantics must remain correct with JavaScript disabled.
  const noJs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await noJs.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });

  const home = await page.evaluate(() => ({
    foundations: [...document.querySelectorAll('.foundation-card a')].map((a) => ({ href: a.getAttribute('href'), label: a.getAttribute('aria-label') })),
    diagramTabStops: [...document.querySelectorAll('.system-map .node')].filter((el) => el.hasAttribute('tabindex')).length,
    menuButtonDisplay: getComputedStyle(document.querySelector('[data-menu-button]')).display,
    navDisplay: getComputedStyle(document.querySelector('[data-nav]')).display,
  }));

  const expectedFoundations = [
    '/insights/capital-allocation/', '/insights/leverage/', '/insights/asymmetric-risk/',
    '/insights/business-systems/', '/insights/information-advantage/', '/insights/scale/', '/insights/compounding/'
  ];
  if (home.foundations.map((x) => x.href).join('|') !== expectedFoundations.join('|')) {
    fail(`homepage foundation destinations are not source-native: ${JSON.stringify(home.foundations)}`);
  }
  if (home.foundations.some((x) => !x.label)) fail('homepage foundation links are missing descriptive aria-label values');
  if (home.diagramTabStops) fail(`system diagram exposes ${home.diagramTabStops} decorative keyboard stop(s)`);
  if (home.menuButtonDisplay !== 'none' || home.navDisplay === 'none') fail(`no-JS compact navigation fallback is inconsistent: ${JSON.stringify(home)}`);

  for (let i = 0; i < series.length; i++) {
    const [route] = series[i];
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('.article-nav a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    const expectedLeft = i === 0 ? '/insights/' : series[i - 1][0];
    const expectedRight = i === series.length - 1 ? '/insights/' : series[i + 1][0];
    if (hrefs[0] !== expectedLeft || hrefs[1] !== expectedRight) {
      fail(`${route}: static article navigation is wrong (${hrefs.join(', ')})`);
    }
  }
  await noJs.close();
  pass('source-native foundation links, decorative focus behavior, no-JS navigation and static essay sequence checked');

  // Force below-fold lazy assets into view and verify they actually decode.
  const visual = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const visualPage = await visual.newPage();
  for (const route of ['/', '/built/', '/about/', '/media/']) {
    await visualPage.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    await visualPage.evaluate(async () => {
      const max = document.documentElement.scrollHeight;
      for (let y = 0; y <= max; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      window.scrollTo(0, max);
    });
    await visualPage.waitForTimeout(300);
    const broken = await visualPage.evaluate(() => [...document.images]
      .filter((img) => img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src));
    if (broken.length) fail(`${route}: image(s) still failed after scrolling: ${broken.join(', ')}`);
  }
  await visual.close();
  pass('below-fold lazy images checked after scrolling on image-heavy pages');
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Semantic QA failed with ${failures.length} issue(s).`);
  process.exit(1);
}
console.log('Semantic QA passed with no blocking defects.');
