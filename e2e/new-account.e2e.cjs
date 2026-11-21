// Run with `npm run e2e` (starts the dev servers). Needs Playwright with Chromium.
const out = (file) => require('path').join(__dirname, '.output', file);
const DEMO = process.env.DEMO_URL || 'http://localhost:5173';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5174';
let failures = 0;
process.on('exit', () => { if (failures) process.exitCode = 1; });
const { chromium, devices } = require('playwright');
const USER = '6f1e8a52-0000-4000-8000-00000000c0de';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = []; const failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.addInitScript(([user, exp]) => {
    localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: 'h.p.s', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: user, email: 'new@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }));
  }, [USER, Math.floor(Date.now() / 1000) + 3600]);
  let restCalls = 0;
  await page.route('https://placeholder.supabase.co/**', (route) => {
    const req = route.request(); const url = new URL(req.url());
    const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    if (url.pathname.startsWith('/rest/v1/')) restCalls++;
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? { id: USER, display_name: null, weight_unit: 'kg', currency: 'EUR', timezone: 'Europe/Berlin' } : []) });
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
    if (url.pathname.endsWith('/status')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ready: false, model: null, reason: 'Cyrus AI isn’t configured on the server yet.' }) });
    return route.fulfill({ status: 404, body: '{}' });
  });
  for (const [route, name] of [['/', 'empty-today'], ['/track/physical', 'empty-physical'], ['/track/intellectual', 'empty-intellectual'], ['/reflect', 'empty-reflect'], ['/cyrus', 'empty-cyrus']]) {
    await page.goto(BACKEND + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: out(`${name}.png`), fullPage: route !== '/cyrus' });
  }
  // AI unavailable: typed message must be refused honestly.
  await page.getByRole('button', { name: 'Type a message' }).click();
  await page.getByLabel('Message Cyrus').fill('How am I doing?');
  await page.keyboard.press('Enter');
  await page.getByText(/configured on the server yet\. Nothing was sent/).waitFor();
  console.log('AI-unavailable notice ok');
  console.log('REST calls:', restCalls);
  if (errors.length) failures++;
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
})();
