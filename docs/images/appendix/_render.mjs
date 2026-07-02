// Render each appendix image HTML → PNG at 1920×1080 (1.5× of 1280×720 authoring),
// and objectively detect clipping (elements escaping the 1280×720 .frame).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const dir = path.resolve('docs/images/appendix');
const files = fs.readdirSync(dir).filter((f) => /^A\d+-IMG-\d+\.html$/.test(f)).sort();

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
const report = [];

for (const f of files) {
  const url = 'file://' + path.join(dir, f);
  await page.goto(url, { waitUntil: 'networkidle' });
  try { await page.evaluate(() => document.fonts.ready); } catch {}
  const clip = await page.evaluate(() => {
    const W = 1280, H = 720, TOL = 1.5;
    const over = [];
    document.querySelectorAll('.frame *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > W + TOL || r.bottom > H + TOL || r.left < -TOL || r.top < -TOL) {
        over.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 30),
          l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom),
          txt: (el.textContent || '').trim().slice(0, 24),
        });
      }
    });
    return { overflowCount: over.length, sample: over.slice(0, 5) };
  });
  const png = f.replace(/\.html$/, '.png');
  await page.screenshot({ path: path.join(dir, png) });
  report.push({ f, ...clip });
}

await browser.close();
fs.writeFileSync(path.join(dir, '_render-report.json'), JSON.stringify(report, null, 2));
let clipped = 0;
for (const r of report) {
  const flag = r.overflowCount > 0 ? '  ⚠ CLIP ' + JSON.stringify(r.sample) : '';
  if (r.overflowCount > 0) clipped++;
  console.log(`${r.f.padEnd(16)} clip=${r.overflowCount}${flag}`);
}
console.log(`\n${files.length} rendered · ${clipped} with clipping`);
