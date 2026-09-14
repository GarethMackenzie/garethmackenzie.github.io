import fs from 'node:fs';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
fs.mkdirSync('qa-reports/screenshots', { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const captures = [
    { route: '/', width: 1440, height: 1000, name: 'home-desktop.png' },
    { route: '/', width: 390, height: 844, name: 'home-mobile.png' },
    { route: '/built/', width: 1440, height: 1000, name: 'built-desktop.png' },
    { route: '/insights/', width: 390, height: 844, name: 'insights-mobile.png' }
  ];

  for (const capture of captures) {
    const context = await browser.newContext({ viewport: { width: capture.width, height: capture.height } });
    await context.addInitScript(() => localStorage.setItem('built-analytics-consent', 'denied'));
    const page = await context.newPage();
    const response = await page.goto(`${baseURL}${capture.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error(`${capture.route} returned ${response?.status() ?? 'no response'}`);
    await page.screenshot({ path: `qa-reports/screenshots/${capture.name}`, fullPage: true });
    await context.close();
    console.log(`Captured ${capture.name}`);
  }
} finally {
  await browser.close();
}
