// Dev tool: report whether any slide's .frame content overflows 720px after edits.
// Measures .frame scrollHeight + checks every descendant's bottom against the frame.
// Usage: node _overflow-check.mjs [file.html...]  (omit = all)  -> prints OVERFLOW lines
import { chromium } from 'playwright';
import { resolve, join } from 'node:path';
import { readdirSync } from 'node:fs';
const DIR = resolve('.');
const skip = new Set(['render.mjs', '_verify-cream.mjs', '_batch-bump.mjs', '_overflow-check.mjs']);
let files = process.argv.slice(2);
if (!files.length) files = readdirSync(DIR).filter(f => f.endsWith('.html') && !skip.has(f));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
let bad = 0;
for (const f of files) {
  await page.goto('file://' + join(DIR, f), { waitUntil: 'networkidle' });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const fr = document.querySelector('.frame');
    if (!fr) return { noframe: true };
    const fb = fr.getBoundingClientRect();
    let maxBottom = 0, worst = '';
    const inner = [];
    fr.querySelectorAll('*').forEach(el => {
      const b = el.getBoundingClientRect().bottom;
      if (b > maxBottom) { maxBottom = b; worst = el.className || el.tagName; }
      // inner clipping: element's own content taller/wider than its clipped box
      const cs = getComputedStyle(el);
      const clips = /hidden|auto|scroll/.test(cs.overflowY + cs.overflowX + cs.overflow);
      if (clips) {
        const dv = el.scrollHeight - el.clientHeight;
        const dh = el.scrollWidth - el.clientWidth;
        if (dv > 2 || dh > 2) inner.push(`${(el.className || el.tagName)}(+${dv}h/+${dh}w)`);
      }
    });
    return { sh: fr.scrollHeight, ch: fr.clientHeight, h: Math.round(fb.height), overBy: Math.round(maxBottom - fb.bottom), worst: String(worst).slice(0, 40), inner: inner.slice(0, 4) };
  });
  if (r.noframe) { console.log(`?? ${f}: no .frame`); continue; }
  const over = r.sh - r.ch;
  const flag = (over > 1 || r.overBy > 1 || (r.inner && r.inner.length));
  if (flag) { bad++; console.log(`OVERFLOW ${f}: frame+${over} childOverBy=${r.overBy}px worst="${r.worst}" inner=[${(r.inner||[]).join(', ')}]`); }
  else console.log(`ok       ${f}: ${r.sh}/${r.ch}  childOverBy=${r.overBy}`);
}
console.log(`\n== ${bad} overflowing / ${files.length} ==`);
await browser.close();
