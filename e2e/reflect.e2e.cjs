// Run with `npm run e2e` (starts the dev servers). Needs Playwright with Chromium.
const out = (file) => require('path').join(__dirname, '.output', file);
const DEMO = process.env.DEMO_URL || 'http://localhost:5173';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5174';
let failures = 0;
process.on('exit', () => { if (failures) process.exitCode = 1; });
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 14 Pro'], deviceScaleFactor: 1 })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { failures++; console.log('FAIL', name, e.message.split('\n')[0]); } };
  await page.goto(DEMO + '/reflect', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out('r-index.png'), fullPage: true });
  await step('weekly summary renders', async () => { await page.getByText('Habit consistency').waitFor(); });
  await step('daily flow: write, check in, skip, save', async () => {
    await page.getByRole('link', { name: /Daily reflection/ }).click();
    await page.getByRole('heading', { name: 'What went well today?' }).waitFor();
    await page.screenshot({ path: out('r-step1.png') });
    await page.keyboard.type('Shipped the strategy outline before lunch.');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByText('From your records').waitFor();
    await page.screenshot({ path: out('r-step2.png') });
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('radio', { name: '4 – Good' }).click();
    await page.getByRole('radio', { name: '3 – Steady' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.keyboard.type('Phone in another room until noon.');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('heading', { name: 'Looks good?' }).waitFor();
    await page.screenshot({ path: out('r-review.png') });
    await page.getByRole('button', { name: 'Save reflection' }).click();
    await page.waitForURL('**/reflect');
    await page.getByRole('link', { name: /Daily reflection.*Done/ }).waitFor();
  });
  await step('history shows it and opens detail', async () => {
    await page.getByRole('button', { name: /Shipped the strategy outline/ }).click();
    await page.getByRole('dialog').getByText('Phone in another room until noon.').waitFor();
  });
  await step('edit from detail keeps answers', async () => {
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('heading', { name: 'What went well today?' }).waitFor();
    const v = await page.getByRole('textbox').inputValue();
    if (!v.includes('strategy outline')) throw new Error(v);
  });
  await step('weekly flow domain ratings + goals', async () => {
    await page.goto(DEMO + '/reflect', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Weekly review/ }).click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('radiogroup', { name: 'Physical rating' }).getByRole('radio', { name: '4' }).click();
    await page.getByRole('radiogroup', { name: 'Career rating' }).getByRole('radio', { name: '5' }).click();
    await page.screenshot({ path: out('r-domains.png') });
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: /First \$1,000 MRR/ }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByText('Physical 4 · Career 5').waitFor();
    await page.getByRole('button', { name: /Save/ }).click();
    await page.waitForURL('**/reflect');
  });
  await step('draft survives leaving mid-way', async () => {
    await page.getByRole('link', { name: /Monthly review/ }).click();
    await page.getByRole('heading', { name: /How did the month go/ }).waitFor();
    await page.keyboard.type('A strong month for work.');
    await page.getByRole('link', { name: 'Close and keep draft' }).click();
    await page.getByRole('link', { name: /Monthly review/ }).click();
    await page.getByRole('heading', { name: /How did the month go/ }).waitFor();
    const v = await page.getByRole('textbox').inputValue();
    if (v !== 'A strong month for work.') throw new Error(v);
  });
  if (errors.length) failures++;
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
})();
