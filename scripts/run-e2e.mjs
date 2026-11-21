/**
 * Browser tests. Starts two dev servers unless they're already running:
 *   :5173  demo mode (no backend)
 *   :5174  Supabase mode pointed at a placeholder project; tests mock its network calls,
 *          so no real backend is contacted.
 * Requires Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const suites = readdirSync(`${root}e2e`).filter((f) => f.endsWith('.e2e.cjs')).sort();
mkdirSync(`${root}e2e/.output`, { recursive: true });

const servers = [];
async function up(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}
async function ensure(port, env) {
  const url = `http://localhost:${port}/`;
  if (await up(url)) return;
  const child = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: root, env: { ...process.env, ...env }, stdio: 'ignore' });
  servers.push(child);
  for (let i = 0; i < 60 && !(await up(url)); i++) await new Promise((r) => setTimeout(r, 500));
}

await ensure(5173, { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' });
await ensure(5174, { VITE_SUPABASE_URL: 'https://placeholder.supabase.co', VITE_SUPABASE_ANON_KEY: 'placeholder' });

let failed = 0;
for (const suite of suites) {
  console.log(`\n▶ ${suite}`);
  const code = await new Promise((resolve) => spawn('node', [`e2e/${suite}`], { cwd: root, stdio: 'inherit' }).on('exit', resolve));
  if (code !== 0) failed++;
}
for (const s of servers) s.kill();
console.log(failed ? `\n${failed} suite(s) failed` : '\nAll browser suites passed');
process.exit(failed ? 1 : 0);
