// Dev tool: bump small fonts (17/18/19px -> +2px, descending so none double-bumps),
// re-render the transparent slide PNG, and emit a cream-bg composite for review.
// Usage: node _batch-bump.mjs <file.html>...   (omit args = all slide html files)
// Flags via env: BUMP=0 to skip editing (render+cream only).
import { chromium } from 'playwright';
import { resolve, dirname, join, basename } from 'node:path';
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';

const DIR = resolve('.');
const skip = new Set(['render.mjs', '_verify-cream.mjs', '_batch-bump.mjs']);
let files = process.argv.slice(2);
if (files.length === 0) {
  files = readdirSync(DIR).filter(f => f.endsWith('.html') && !skip.has(f));
}
const doBump = process.env.BUMP !== '0';

function bump(html) {
  let out = html, changed = 0;
  // descending: 19->21, 18->20, 17->19 (also 16->18, 15->17 for safety)
  for (const n of [19, 18, 17, 16, 15]) {
    const re = new RegExp(`(font-size:\\s?)${n}px`, 'g');
    out = out.replace(re, (_, p) => { changed++; return `${p}${n + 2}px`; });
  }
  return { out, changed };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
for (const f of files) {
  const htmlPath = join(DIR, f);
  if (doBump) {
    const src = readFileSync(htmlPath, 'utf8');
    const { out, changed } = bump(src);
    if (changed) writeFileSync(htmlPath, out);
    console.log(`bump ${f}: ${changed} sizes +2`);
  }
  // render transparent png
  const png = htmlPath.replace(/\.html$/, '.png');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await page.waitForTimeout(180);
  const el = await page.$('.frame');
  if (el) await el.screenshot({ path: png, omitBackground: true });
  else await page.screenshot({ path: png, omitBackground: true, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  // cream composite for review
  const tmp = join(DIR, '._verify_wrap.html');
  writeFileSync(tmp,
    `<style>*{margin:0;padding:0}html,body{width:1280px;height:720px}` +
    `body{background:#F0EDE8;display:flex;align-items:center;justify-content:center}` +
    `img{width:1280px;height:720px;display:block}</style><img src="file://${png}">`);
  await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await page.waitForTimeout(80);
  const cream = png.replace(/\.png$/, '.cream.png');
  await page.screenshot({ path: cream, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  unlinkSync(tmp);
  console.log(`  -> ${basename(png)} + cream`);
}
await browser.close();
