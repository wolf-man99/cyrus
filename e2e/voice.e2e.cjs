// Voice: Chromium's fake microphone and a mocked backend. Run with `npm run e2e`.
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5174';
let failures = 0;
process.on('exit', () => { if (failures) process.exitCode = 1; });
const { chromium, devices } = require('playwright');
const USER = '6f1e8a52-0000-4000-8000-00000000c0de';
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], deviceScaleFactor: 1, permissions: ['microphone'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.addInitScript(([user, exp]) => {
    localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: 'h.p.s', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: user, email: 't@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }));
  }, [USER, Math.floor(Date.now() / 1000) + 3600]);
  // A short valid WAV (0.6 s of a quiet tone) as the spoken reply.
  const wav = (() => { const sr = 8000, n = sr * 0.6, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(8000 * Math.sin(i / 6)), 44 + i * 2); return b; })();
  let transcribed = null;
  await page.route('https://placeholder.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.endsWith('/status')) return reply({ ready: true, model: 'mock' });
    if (url.pathname.endsWith('/transcribe')) { transcribed = { type: req.headers()['content-type'], bytes: (req.postDataBuffer() || []).length }; return reply({ text: 'What is my current weight?' }); }
    if (url.pathname.endsWith('/chat')) return reply({ content: 'You haven’t logged your weight yet.', tool_calls: [] });
    if (url.pathname.endsWith('/speech')) return route.fulfill({ status: 200, contentType: 'audio/wav', body: wav });
    if (url.pathname.endsWith('/profiles')) return reply(single ? { id: USER, display_name: null, weight_unit: 'kg', currency: 'USD', timezone: 'UTC' } : []);
    if (url.pathname.endsWith('/conversations') && req.method() === 'POST') return reply({ id: 'c', title: null, started_at: '', updated_at: '', ended_at: null }, 201);
    if (url.pathname.endsWith('/messages') && req.method() === 'POST') return reply({ id: 'm', conversation_id: 'c', role: 'user', content: 'x', actions: [], created_at: new Date().toISOString() }, 201);
    return reply(single ? null : []);
  });
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { failures++; console.log('FAIL', name, e.message.split('\n')[0]); } };
  await page.goto(BACKEND + '/cyrus', { waitUntil: 'networkidle' });
  await page.getByText('Connected').waitFor();
  const talk = page.getByRole('button', { name: /Talk to Cyrus/ });
  await step('tap starts listening (latched)', async () => {
    await talk.click();
    await page.getByText('Listening…').waitFor();
    await page.getByText('listening · tap to send').waitFor();
  });
  await step('mic level drives the orb', async () => {
    await page.waitForTimeout(800);
    const scale = await page.locator('.orb-blob--1').evaluate((el) => el.style.transform);
    if (!/scale\(/.test(scale)) throw new Error(scale);
  });
  await step('tap again sends: transcription shown, reply spoken', async () => {
    await page.getByRole('button', { name: 'Send to Cyrus' }).click();
    await page.getByText('What is my current weight?').waitFor();
    await page.getByText('You haven’t logged your weight yet.').waitFor();
    if (!transcribed || transcribed.bytes < 1000) throw new Error('no audio uploaded: ' + JSON.stringify(transcribed));
    console.log('     uploaded', transcribed.bytes, 'bytes as', transcribed.type.split(';')[0]);
    await page.getByText('Speaking').waitFor({ timeout: 5000 });
  });
  await step('interrupt stops speech immediately', async () => {
    await page.getByRole('button', { name: 'Interrupt Cyrus' }).click();
    await page.getByText('Interrupted').waitFor({ timeout: 2000 });
    await page.getByText(/Tap the mic and speak/).waitFor({ timeout: 3000 });
  });
  if (errors.length) failures++;
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
})();
