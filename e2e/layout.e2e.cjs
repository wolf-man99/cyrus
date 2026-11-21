// Run with `npm run e2e` (starts the dev servers). Needs Playwright with Chromium.
const out = (file) => require('path').join(__dirname, '.output', file);
const DEMO = process.env.DEMO_URL || 'http://localhost:5173';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5174';
let failures = 0;
process.on('exit', () => { if (failures) process.exitCode = 1; });
const { chromium, devices } = require('playwright');
const ROUTES = ['/', '/track', '/track/physical', '/track/mental', '/track/intellectual', '/track/financial', '/track/social', '/track/career', '/track/entrepreneurship', '/reflect', '/reflect/weekly/' + (() => { const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d.toISOString().slice(0, 10); })(), '/cyrus'];
const SIZES = [
  { name: 'se', opts: { viewport: { width: 375, height: 667 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  { name: 'iphone', opts: { ...devices['iPhone 14 Pro'], deviceScaleFactor: 1 } },
  { name: 'desktop', opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
];
(async () => {
  const browser = await chromium.launch();
  for (const size of SIZES) {
    const ctx = await browser.newContext(size.opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    for (const route of ROUTES) {
      await page.goto(DEMO + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const { sw, cw, offenders } = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('body *')]
          .filter((el) => { const r = el.getBoundingClientRect(); return r.right > cw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed' && !el.closest('.overflow-x-auto,.no-scrollbar,svg,.cosmos,.orb-field,.cyrus-orb'); })
          .slice(0, 3).map((el) => el.tagName + '.' + String(el.className).slice(0, 50));
        return { sw: document.documentElement.scrollWidth, cw, offenders };
      });
      const name = `audit-${size.name}${route.replace(/\//g, '_') || '_today'}`;
      if (size.name !== 'desktop' || ['/', '/track/financial', '/reflect', '/cyrus'].includes(route)) await page.screenshot({ path: out(`${name}.png`), fullPage: size.name !== 'desktop' && route !== '/cyrus' });
      if (sw > cw) failures++;
      console.log(`${size.name.padEnd(8)} ${route.padEnd(28)} ${sw > cw ? `OVERFLOW ${sw}>${cw} ${offenders.join(' ')}` : 'ok'}`);
    }
    console.log(size.name, errors.length ? 'ERRORS: ' + [...new Set(errors)].join(' | ') : 'no console errors');
    await ctx.close();
  }
  await browser.close();
})();
