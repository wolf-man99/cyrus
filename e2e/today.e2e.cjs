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
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(DEMO + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const done = async () => (await page.locator('section[aria-label="Daily progress"] p').first().innerText()).replace(/\s/g,'');
  console.log('progress before', await done());
  // Habit one-tap
  await page.getByRole('button', { name: /Journal/ }).click();
  await page.waitForTimeout(400);
  console.log('journal pressed', await page.getByRole('button', { name: /Journal/ }).getAttribute('aria-pressed'), 'progress', await done());
  // Weight
  await page.getByRole('button', { name: 'Log weight' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Decrease by 0.1' }).click();
  await page.screenshot({ path: out('sheet-weight.png') });
  await page.getByRole('button', { name: 'Save weight' }).click();
  await page.waitForTimeout(600);
  console.log('toast:', await page.locator('[role=status]').allInnerTexts());
  // Expense validation
  await page.getByRole('button', { name: 'Expense' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Save expense' }).click();
  console.log('expense errors:', await page.locator('[role=alert]').allInnerTexts());
  await page.getByLabel(/Amount in/).fill('14,5');
  await page.getByRole('radio', { name: 'Food' }).click();
  await page.screenshot({ path: out('sheet-expense.png') });
  await page.getByRole('button', { name: 'Save expense' }).click();
  await page.waitForTimeout(600);
  // Add task
  await page.getByRole('button', { name: 'Add task' }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('textbox', { name: 'Task' }).fill('Stretch before bed');
  await page.getByLabel('Time (optional)').fill('21:30');
  await page.screenshot({ path: out('sheet-task.png') });
  await page.getByRole('dialog').getByRole('button', { name: 'Add task' }).click();
  await page.waitForTimeout(700);
  console.log('task added:', await page.getByText('Stretch before bed').count());
  // Cyrus text in demo
  await page.goto(DEMO + '/cyrus', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Type a message' }).click();
  await page.getByLabel('Message Cyrus').fill('Plan my evening');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('cyrus-demo-text.png') });
  console.log('captions:', (await page.locator('[aria-live=polite]').allInnerTexts()).join(' | ').slice(0, 300));
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();
