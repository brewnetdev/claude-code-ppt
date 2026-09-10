// 단독 실행본 검증 — 한 번에 한 장만 보이므로 전 장을 순회하며 잰다.
import { chromium } from 'playwright';
import path from 'node:path';
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const DECK = process.argv[2] ?? path.join(REPO, 'docs/html/observability-study-slides.html');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + DECK, { waitUntil: 'networkidle' });

const r = await p.evaluate(() => {
  const S = [...document.querySelectorAll('.slide')];
  const vover = [], hover = [], unsafe = [], accent = [];
  const deck = document.getElementById('deck');
  S.forEach((s, i) => {
    const was = s.classList.contains('on');
    s.classList.add('on');                       // 잰 뒤 되돌린다
    const n = i + 1;
    const t = (s.querySelector('h1,h2')?.textContent || '').trim().slice(0, 28);
    for (const [el, label] of [[s.querySelector('.slide-inner'), 'inner'],
                               [s.querySelector('.body'), 'body']]) {
      if (!el) continue;
      const d = el.scrollHeight - el.clientHeight;
      if (d > 2) vover.push(`p${n} ${label} +${d} | ${t}`);
    }
    for (const e of s.querySelectorAll('*')) {
      if (e.closest('svg')) continue;
      if (e.scrollWidth - e.clientWidth > 2)
        hover.push(`p${n} ${e.tagName.toLowerCase()} +${e.scrollWidth - e.clientWidth} | ${t}`);
    }
    const db = deck.getBoundingClientRect();
    for (const e of s.querySelectorAll('.body > *, h1, h2, .key, .sub, .cnum')) {
      const bb = e.getBoundingClientRect();
      const L = (bb.left - db.left) / 1.25, R = (db.right - bb.right) / 1.25;
      if (L < 51 || R < 51) unsafe.push(`p${n} ${e.tagName.toLowerCase()} L${Math.round(L)} R${Math.round(R)}`);
    }
    let hits = 0;
    for (const e of s.querySelectorAll('*')) {
      if (e.closest('svg')) continue;
      if (getComputedStyle(e).color === 'rgb(26, 79, 160)' && e.textContent.trim()) hits++;
    }
    if (hits > 1) accent.push(`p${n} ${hits}회 | ${t}`);
    if (!was) s.classList.remove('on');
  });
  return { n: S.length, vover, hover: [...new Set(hover)], unsafe: [...new Set(unsafe)], accent };
});

const rows = [
  ['장표 수', r.n, r.n > 0],
  ['세로 넘침', r.vover.length, r.vover.length === 0],
  ['가로 넘침', r.hover.length, r.hover.length === 0],
  ['안전 영역 침범', r.unsafe.length, r.unsafe.length === 0],
  ['강조색 2회+', r.accent.length, r.accent.length === 0],
  ['JS 에러', errs.length, errs.length === 0],
];
console.log(`\n단독 실행본: ${path.relative(REPO, DECK)}\n`);
let fail = 0;
for (const [n, v, ok] of rows) { if (!ok) fail++; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(16)} ${v}`); }
const dump = (l, a) => { if (a.length) { console.log(`\n  ${l}`); a.slice(0, 30).forEach(x => console.log('     ' + x)); } };
dump('세로 넘침', r.vover); dump('가로 넘침', r.hover);
dump('안전 영역', r.unsafe); dump('강조색', r.accent); dump('JS 에러', errs);
console.log(fail === 0 ? '\n전 항목 통과\n' : `\n${fail}개 항목 미통과\n`);
await b.close();
process.exit(fail === 0 ? 0 : 1);
