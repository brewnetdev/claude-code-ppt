#!/usr/bin/env node
// SLIDE-RULE deck verifier — deterministic layout gate.
// Usage: node verify.mjs <deck.html> [--shots <outdir> <n,n,...>]
// Checks every .slide for vertical overflow (content bottom > 660px,
// footer zone) and deep horizontal overflow (any descendant outside
// 0..1280). Exit 1 on violations. Optionally screenshots given slides.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const file = process.argv[2];
if (!file) { console.error('usage: node verify.mjs <deck.html> [--shots <dir> <n,n,...>]'); process.exit(2); }
const url = pathToFileURL(resolve(file)).href;

const shotsIdx = process.argv.indexOf('--shots');
const shotDir = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;
const shotNums = shotsIdx > -1 ? (process.argv[shotsIdx + 2] || '').split(',').filter(Boolean).map(Number) : [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url);
await page.waitForTimeout(600);

const report = await page.evaluate(() => {
  const deck = document.getElementById('deck');
  deck.style.transform = 'none';
  const slides = [...document.querySelectorAll('.slide')];
  const bad = [];
  slides.forEach((s, k) => {
    const wasOn = s.classList.contains('on');
    s.classList.add('on');
    // vertical: direct children (excluding absolute .foot)
    let bottom = 0;
    [...s.children].forEach(el => {
      if (el.classList.contains('foot')) return;
      bottom = Math.max(bottom, el.offsetTop + el.offsetHeight);
    });
    // horizontal: every descendant's rendered rect vs deck rect
    const dr = deck.getBoundingClientRect();
    let right = 0, left = 9999;
    s.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      right = Math.max(right, r.right - dr.left);
      left = Math.min(left, r.left - dr.left);
    });
    if (!wasOn) s.classList.remove('on');
    const title = (s.querySelector('h1,h2')?.textContent || '').trim().slice(0, 28);
    if (bottom > 660 || right > 1280 || left < 0) {
      bad.push({ n: k + 1, title, bottom: Math.round(bottom), right: Math.round(right), left: Math.round(left) });
    }
  });
  return { total: slides.length, bad };
});

console.log(`slides: ${report.total}`);
if (report.bad.length) {
  console.log('LAYOUT VIOLATIONS (bottom>660 / right>1280 / left<0):');
  report.bad.forEach(b => console.log(`  #${b.n} "${b.title}" bottom=${b.bottom} right=${b.right} left=${b.left}`));
} else {
  console.log('layout: ALL CLEAR');
}

for (const n of shotNums) {
  // hash-only navigation is same-document: go via about:blank so init reruns
  await page.goto('about:blank');
  await page.goto(url + '#' + n);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shotDir}/s${String(n).padStart(2, '0')}.png` });
  console.log(`shot: ${shotDir}/s${String(n).padStart(2, '0')}.png`);
}

await browser.close();
process.exit(report.bad.length ? 1 : 0);
