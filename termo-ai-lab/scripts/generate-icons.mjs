// Generuje ikony PNG aplikacji (PWA, iOS, Android) z pliku public/favicon.svg.
// Wymaga Playwright z przeglądarką Chromium: node scripts/generate-icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0, bg: null },
  { file: 'icon-512.png', size: 512, padding: 0, bg: null },
  // Ikona „maskable”: ważna treść w bezpiecznym polu (ok. 80%), pełne tło.
  { file: 'icon-maskable-512.png', size: 512, padding: 0.12, bg: '#070b18' },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.06, bg: '#070b18' },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  const inner = Math.round(t.size * (1 - t.padding * 2));
  const html = `<!doctype html><html><body style="margin:0;width:${t.size}px;height:${t.size}px;display:grid;place-items:center;background:${t.bg ?? 'transparent'}">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`;
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(html);
  const buf = await page.screenshot({ omitBackground: !t.bg, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  writeFileSync(new URL(t.file, out), buf);
  console.log('✓', t.file);
}
await browser.close();
