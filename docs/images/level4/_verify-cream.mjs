// Dev tool (not a slide asset): composite transparent level4 PNGs onto the
// report slide cream bg (#F0EDE8) so dark text can be eyeballed on the real
// background. Usage: node _verify-cream.mjs <png>...  -> writes <png>.cream.png
import { chromium } from 'playwright';
import { resolve, dirname, join } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';
const pngs = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
for (const png of pngs) {
  const abs = resolve(png);
  const tmp = join(dirname(abs), '._verify_wrap.html');
  writeFileSync(tmp,
    `<style>*{margin:0;padding:0}html,body{width:1280px;height:720px}` +
    `body{background:#F0EDE8;display:flex;align-items:center;justify-content:center}` +
    `img{width:1280px;height:720px;display:block}</style>` +
    `<img src="file://${abs}">`);
  await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await page.waitForTimeout(120);
  const out = png.replace(/\.png$/, '.cream.png');
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  unlinkSync(tmp);
  console.log('cream', out);
}
await browser.close();
