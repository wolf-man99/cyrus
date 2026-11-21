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
  // Never let the placeholder backend be contacted: answer auth calls locally.
  await page.route('https://placeholder.supabase.co/**', (route) => {
    const url = route.request().url();
    if (url.includes('/token?grant_type=password')) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' }) });
    if (url.includes('/recover')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (url.includes('/signup')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', email: 'new@example.com', aud: 'authenticated', role: '', created_at: new Date().toISOString(), confirmation_sent_at: new Date().toISOString(), identities: [{}] }) });
    return route.fulfill({ status: 404, body: '{}' });
  });
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { failures++; console.log('FAIL', name, e.message.split('\n')[0]); } };
  await page.goto(BACKEND + '/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: out('a-signin.png') });
  await step('validation', async () => {
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await page.getByText('Enter a valid email address').waitFor();
    await page.getByText('Use at least 8 characters').waitFor();
  });
  await step('wrong password message', async () => {
    await page.getByLabel('Email').fill('me@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrongpassword');
    await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('Email or password is incorrect').waitFor();
  });
  await step('show password toggle', async () => {
    await page.getByRole('button', { name: 'Show password' }).click();
    if ((await page.getByLabel('Password', { exact: true }).getAttribute('type')) !== 'text') throw new Error('still hidden');
  });
  await step('forgot password flow', async () => {
    await page.getByRole('button', { name: 'Forgot your password?' }).click();
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await page.getByText('Check your inbox').waitFor();
    await page.getByRole('button', { name: 'Back to sign in' }).click();
  });
  await step('sign up needing confirmation', async () => {
    await page.getByRole('tab', { name: 'Create account' }).click();
    await page.getByLabel('Name (optional)').fill('Alex');
    await page.getByLabel('Email').fill('new@example.com');
    await page.getByLabel('Password', { exact: true }).fill('a-strong-password');
    await page.screenshot({ path: out('a-signup.png') });
    await page.locator('form').getByRole('button', { name: 'Create account' }).click();
    await page.getByText('Confirm your email').waitFor();
  });
  await browser.close();
})();
