// Run with `npm run e2e` (starts the dev servers). Needs Playwright with Chromium.
const out = (file) => require('path').join(__dirname, '.output', file);
const DEMO = process.env.DEMO_URL || 'http://localhost:5173';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5174';
let failures = 0;
process.on('exit', () => { if (failures) process.exitCode = 1; });
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const toast = async () => (await page.locator('[role=status]').allInnerTexts()).join(' | ').replace(/\n+/g, ' ');
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { failures++; console.log('FAIL', name, e.message.split('\n')[0]); } };

  await page.goto(DEMO + '/track', { waitUntil: 'networkidle' });
  await step('track index shows 7 domains', async () => { const n = await page.locator('a[href^="/track/"]').count(); if (n !== 7) throw new Error(`got ${n}`); });

  await page.goto(DEMO + '/track/mental', { waitUntil: 'networkidle' });
  await step('mood check-in', async () => {
    await page.getByRole('button', { name: 'Check in' }).click();
    await page.getByRole('radio', { name: '4 – Good' }).click();
    await page.getByRole('radio', { name: '3 – Steady' }).click();
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.waitForTimeout(500);
    if (!(await toast()).includes('Check-in saved')) throw new Error(await toast());
  });
  await step('log meditation with preset', async () => {
    await page.getByRole('button', { name: 'Meditation', exact: true }).first().click();
    await page.getByRole('radio', { name: '20 min' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
    if (!(await toast()).includes('Meditation logged')) throw new Error(await toast());
  });
  await step('add a goal (validation then save)', async () => {
    await page.getByRole('button', { name: 'Add', exact: false }).first().click();
    await page.getByRole('button', { name: 'Add goal' }).click();
    const alerts = await page.locator('[role=alert]').allInnerTexts();
    if (!alerts.some((a) => /name|target/i.test(a))) throw new Error('no validation: ' + alerts);
    await page.getByLabel('Goal', { exact: true }).fill('Sleep 7 hours');
    await page.getByLabel('Now').fill('5');
    await page.getByLabel('Target').fill('30');
    await page.getByLabel('Unit (optional)').fill('nights');
    await page.getByRole('button', { name: 'Add goal' }).click();
    await page.waitForTimeout(500);
    await page.getByText('Sleep 7 hours').waitFor();
  });
  await step('update goal progress + history recorded', async () => {
    await page.getByRole('button', { name: /^Sleep 7 hours/ }).click();
    await page.getByLabel('Now').fill('9');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^Sleep 7 hours/ }).click();
    await page.getByText('Recent progress').waitFor({ timeout: 2000 });
    await page.keyboard.press('Escape');
  });
  await step('archive goal', async () => {
    await page.getByRole('button', { name: /^Sleep 7 hours/ }).click();
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('button', { name: 'Archive this goal?' }).click();
    await page.waitForTimeout(500);
    if (await page.getByRole('button', { name: /^Sleep 7 hours/ }).count()) throw new Error('still visible');
    await page.getByRole('tab', { name: /archived/ }).click();
    await page.getByRole('button', { name: /^Sleep 7 hours/ }).waitFor();
  });
  await step('history filter + delete entry', async () => {
    await page.getByRole('tab', { name: 'Meditation' }).click();
    const meta = async () => Number((await page.locator('#history-heading').locator('..').innerText()).match(/(\d+) in/)[1]);
    const before = await meta();
    await page.getByRole('button', { name: /^Delete Meditation/ }).first().click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForTimeout(600);
    const after = await meta();
    if (after !== before - 1) throw new Error(`${before} -> ${after}`);
  });
  await step('range filter changes metrics caption', async () => {
    await page.getByRole('tab', { name: '7D' }).click();
    await page.getByText('Last 7 days', { exact: true }).waitFor();
  });

  await page.goto(DEMO + '/track/physical', { waitUntil: 'networkidle' });
  await step('upload health report (bad type then pdf)', async () => {
    await page.getByRole('button', { name: 'Health report' }).click();
    await page.setInputFiles('#report-file', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
    await page.getByText('Upload a PDF or an image').waitFor();
    await page.setInputFiles('#report-file', { name: 'lipid-panel.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await page.waitForTimeout(600);
    await page.getByText('lipid panel').waitFor();
  });
  await step('log measurement', async () => {
    await page.getByRole('button', { name: 'Measurements' }).click();
    await page.getByLabel(/Waist in cm/).fill('84.6');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
    if (!(await toast()).includes('Waist updated')) throw new Error(await toast());
  });

  await page.goto(DEMO + '/track/intellectual', { waitUntil: 'networkidle' });
  await step('log reading progress', async () => {
    await page.getByRole('button', { name: 'Log reading' }).click();
    await page.getByRole('radio', { name: '20', exact: true }).click();
    await page.getByRole('button', { name: 'Log progress' }).click();
    await page.waitForTimeout(500);
    if (!(await toast()).includes('Progress logged')) throw new Error(await toast());
  });
  await page.goto(DEMO + '/track/entrepreneurship', { waitUntil: 'networkidle' });
  await step('add experiment', async () => {
    await page.getByRole('button', { name: 'Experiment' }).first().click();
    await page.getByLabel('Name').fill('Cold email 50 founders');
    await page.getByLabel('Hypothesis').fill('5 replies means the pitch works');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByText('Cold email 50 founders').waitFor();
  });
  await page.goto(DEMO + '/track/financial', { waitUntil: 'networkidle' });
  await step('log income', async () => {
    await page.getByRole('button', { name: 'Income', exact: true }).click();
    await page.getByLabel(/Amount in/).fill('750');
    await page.getByRole('radio', { name: 'Freelance' }).click();
    await page.getByRole('button', { name: 'Save income' }).click();
    await page.waitForTimeout(500);
    if (!(await toast()).includes('Income logged')) throw new Error(await toast());
  });
  if (errors.length) failures++;
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
})();
