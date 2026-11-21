// End-to-end: real app (Supabase mode) against a mocked Supabase REST/Auth and a mocked `cyrus` edge function.
// Run with `npm run e2e` (starts the dev servers). Needs Playwright with Chromium.
const out = (file) => require('path').join(__dirname, '.output', file);
const DEMO = process.env.DEMO_URL || 'http://localhost:5173';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5174';
let failures = 0;
process.on('exit', () => { if (failures) process.exitCode = 1; });
const { chromium, devices } = require('playwright');
const USER = '6f1e8a52-0000-4000-8000-00000000c0de';
const GOAL = { id: '0b5c7c1e-0000-4000-8000-0000000000aa', user_id: USER, domain: 'financial', title: 'Emergency fund', description: null, category: 'savings', start_value: 0, target_value: 10000, current_value: 7900, unit: 'USD', target_date: null, status: 'active', created_at: '2026-10-01T00:00:00Z' };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  const exp = Math.floor(Date.now() / 1000) + 3600;
  await page.addInitScript(([user, exp]) => {
    localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: 'header.payload.sig', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: user, email: 'tester@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }));
  }, [USER, exp]);

  const rest = []; const chats = []; let goalState = { ...GOAL };
  await page.route('https://placeholder.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url()); const method = req.method();
    const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.startsWith('/functions/v1/cyrus/')) {
      const ep = url.pathname.split('/').pop();
      if (ep === 'status') return reply({ ready: true, model: 'mock-model' });
      if (ep === 'speech') return reply({ error: 'tts off in test' }, 500);
      if (ep === 'chat') {
        const body = JSON.parse(req.postData()); chats.push(body);
        const last = body.messages.at(-1); const lastUser = [...body.messages].reverse().find((m) => m.role === 'user').content;
        if (last.role === 'user' && /weight/i.test(lastUser)) return reply({ content: null, tool_calls: [{ id: 'c1', name: 'log_weight', arguments: '{"value":91.5,"unit":"kg"}' }] });
        if (last.role === 'user' && /emergency/i.test(lastUser)) return reply({ content: null, tool_calls: [{ id: 'g1', name: 'get_goals', arguments: '{"domain":"financial"}' }] });
        if (last.role === 'tool' && last.tool_call_id === 'g1') {
          const goals = JSON.parse(last.content).data;
          return reply({ content: null, tool_calls: [{ id: 'g2', name: 'update_goal', arguments: JSON.stringify({ goalId: goals[0].id, currentValue: 8000 }) }] });
        }
        if (last.role === 'tool') {
          const r = JSON.parse(last.content);
          return reply({ content: r.ok ? (last.tool_call_id === 'c1' ? 'Logged 91.5 kg.' : 'Emergency fund is now at 8,000.') : 'Okay, I left it as it was.', tool_calls: [] });
        }
        return reply({ content: 'Hello.', tool_calls: [] });
      }
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').pop();
      rest.push(`${method} ${table}${url.search}${req.postData() ? ' ' + req.postData() : ''}`);
      if (table === 'profiles') return reply(single ? { id: USER, display_name: 'Tester', weight_unit: 'kg', currency: 'USD', timezone: 'UTC' } : []);
      if (table === 'conversations' && method === 'POST') return reply(single ? { id: 'conv-1', title: null, started_at: new Date().toISOString(), updated_at: new Date().toISOString(), ended_at: null } : [{}], 201);
      if (table === 'messages' && method === 'POST') { const b = JSON.parse(req.postData()); return reply({ id: 'm-' + rest.length, conversation_id: b.conversation_id, role: b.role, content: b.content, actions: b.actions, created_at: new Date().toISOString() }, 201); }
      if (table === 'weight_logs' && method === 'POST') { const b = JSON.parse(req.postData()); return reply({ id: 'w1', value: b.value, unit: b.unit, logged_at: new Date().toISOString() }, 201); }
      if (table === 'goals' && method === 'GET') return reply([goalState]);
      if (table === 'goals' && method === 'PATCH') { goalState = { ...goalState, ...JSON.parse(req.postData()) }; return reply(goalState); }
      return reply(single ? null : []);
    }
    return reply({}, 404);
  });

  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { failures++; console.log('FAIL', name, e.message.split('\n')[0]); } };
  await page.goto(BACKEND + '/cyrus', { waitUntil: 'networkidle' });
  await step('connected badge', async () => page.getByText('Connected').waitFor());

  await step('natural-language data entry: weight', async () => {
    await page.getByRole('button', { name: 'Type a message' }).click();
    await page.getByLabel('Message Cyrus').fill('Log my weight as 91.5 kg');
    await page.keyboard.press('Enter');
    await page.getByText('Logged 91.5 kg.').waitFor();
    await page.getByText('Logged weight 91.5 kg').waitFor(); // action receipt chip
    if (!rest.some((r) => r.startsWith('POST weight_logs') && r.includes('"value":91.5'))) throw new Error('no insert: ' + rest.join('\n'));
  });
  await step('request carried tools, context and memory', async () => {
    const first = chats[0];
    if (first.tools.length < 20) throw new Error('tools: ' + first.tools.length);
    if (first.context.weightUnit !== 'kg' || first.context.displayName !== 'Tester') throw new Error(JSON.stringify(first.context));
  });
  await step('conversation persisted', async () => {
    if (!rest.some((r) => r.startsWith('POST conversations'))) throw new Error('no conversation');
    if (rest.filter((r) => r.startsWith('POST messages')).length < 2) throw new Error('messages: ' + rest.filter((r) => r.includes('messages')).join('\n'));
  });
  await step('consequential change waits for confirmation', async () => {
    await page.getByLabel('Message Cyrus').fill('Set my emergency fund to 8000');
    await page.keyboard.press('Enter');
    await page.getByRole('alertdialog').waitFor();
    await page.screenshot({ path: out('cy-confirm.png') });
    if (rest.some((r) => r.startsWith('PATCH goals'))) throw new Error('changed before confirming');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByText('Emergency fund is now at 8,000.').waitFor();
    if (!rest.some((r) => r.startsWith('PATCH goals') && r.includes('"current_value":8000'))) throw new Error('no patch');
  });
  await step('declining leaves data unchanged', async () => {
    const before = rest.filter((r) => r.startsWith('PATCH goals')).length;
    await page.getByLabel('Message Cyrus').fill('Actually set the emergency fund to 9000');
    await page.keyboard.press('Enter');
    await page.getByRole('alertdialog').waitFor();
    await page.getByLabel('Message Cyrus').fill('no');
    await page.keyboard.press('Enter');
    await page.getByText('Okay, I left it as it was.').waitFor();
    if (rest.filter((r) => r.startsWith('PATCH goals')).length !== before) throw new Error('patched after decline');
  });
  await step('memory sent on follow-up', async () => {
    const lastChat = chats.at(-1);
    if (!lastChat.messages.some((m) => m.content === 'Log my weight as 91.5 kg')) throw new Error('no memory');
  });
  await page.screenshot({ path: out('cy-e2e.png') });
  if (errors.length) failures++;
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
})();
