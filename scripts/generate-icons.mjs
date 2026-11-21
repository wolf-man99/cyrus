/**
 * Renders the PWA / Home Screen icons from public/icons/favicon.svg.
 * Requires Playwright with Chromium (dev-only): `npm run icons`.
 */
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = fileURLToPath(new URL('../public/icons/', import.meta.url));
const svg = await readFile(`${root}favicon.svg`, 'utf8');

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:#090611">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: `${root}${file}`, omitBackground: false });
  console.log('wrote', file);
}
await browser.close();
