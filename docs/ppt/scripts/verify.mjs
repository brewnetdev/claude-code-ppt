// 덱 검증 — PLAN.md 의 완료 기준(DoD)을 그대로 측정한다.
//
//   node docs/ppt/scripts/verify.mjs [deck.html]
//
// 눈으로 "잘 나왔다"로 끝내지 않는다. overflow:hidden 때문에 넘친 장표도
// 스크린샷에서는 멀쩡해 보이기 때문이다.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const DECK = process.argv[2] ?? path.join(REPO, 'docs/html/study/observability-study.html');
const THEME = path.join(REPO, 'src/canvas/themes/study.css');

// GUIDE 팔레트 6색 + 도판 전용 5색. 이 밖의 색은 규약 위반이다.
const ALLOWED = new Set([
  '#15181d', '#585f6b', '#d8dbe0', '#f5f6f7', '#1a4fa0', '#8f4408', '#ffffff',
  '#6a4a9c', '#b4621a', '#1f4d8f', '#2e7d4f', '#9aa1ad',
]);

const deck = fs.readFileSync(DECK, 'utf8');
const theme = fs.readFileSync(THEME, 'utf8');

// 에디터·Export 가 하는 것과 같은 조립: 슬라이드 셸 + 테마 CSS
const shell = `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#e9eaec;display:flex;flex-direction:column;gap:24px;align-items:center;padding:24px}
.export-stage{width:1280px;height:720px}
.slide{position:relative;width:1280px;height:720px;overflow:hidden;background:#fff}
${theme}</style>`;
const tmp = '/tmp/study-verify.html';
fs.writeFileSync(tmp, deck.replace('</head>', shell + '</head>'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 820 } });
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(e.message));
await page.goto('file://' + tmp, { waitUntil: 'networkidle' });

const r = await page.evaluate(() => {
  const S = [...document.querySelectorAll('.export-slide')];
  const title = (x) =>
    (x.querySelector('h2, .cover-title')?.textContent || '').trim().slice(0, 30);

  const vover = [];   // 세로 넘침 — .slide-inner 와 .body 양쪽
  const hover = [];   // 가로 넘침 (SVG 내부는 제외 — scrollWidth 가 부정확)
  const unsafe = [];  // 안전 영역 침범
  const accent = [];  // 강조색 2회 이상

  S.forEach((x, i) => {
    const n = i + 1;
    const inn = x.querySelector('.slide-inner');
    if (!inn) return;

    for (const [el, label] of [[inn, 'inner'], [x.querySelector('.body'), 'body']]) {
      if (!el) continue;
      const d = el.scrollHeight - el.clientHeight;
      if (d > 2) vover.push(`p${n} ${label} +${d} | ${title(x)}`);
    }

    for (const e of inn.querySelectorAll('*')) {
      if (e.closest('svg')) continue;
      const d = e.scrollWidth - e.clientWidth;
      if (d > 2) hover.push(`p${n} ${e.tagName.toLowerCase()} +${d} | ${title(x)}`);
    }

    // 안전 영역 — 좌우 53px, 하단 80px(푸터 제외)
    const slide = x.querySelector('.slide').getBoundingClientRect();
    for (const e of inn.querySelectorAll('.body > *, h2, .key')) {
      const b = e.getBoundingClientRect();
      const left = b.left - slide.left, right = slide.right - b.right;
      if (left < 51 || right < 51) unsafe.push(`p${n} ${e.tagName.toLowerCase()} L${Math.round(left)} R${Math.round(right)}`);
    }

    // 강조색은 장표당 한 번. 도판 내부는 의미가 실린 별도 팔레트라 센다 말고 뺀다.
    let hits = 0;
    for (const e of inn.querySelectorAll('*')) {
      if (e.closest('svg')) continue;
      const c = getComputedStyle(e).color;
      if (c === 'rgb(26, 79, 160)' && e.textContent.trim()) hits++;
    }
    if (hits > 1) accent.push(`p${n} ${hits}회 | ${title(x)}`);
  });

  // 팔레트 — 본문(도판 밖)에 쓰인 색 전부
  const used = new Set();
  for (const e of document.querySelectorAll('.slide-inner *')) {
    if (e.closest('svg')) continue;
    const cs = getComputedStyle(e);
    // 테두리 색은 실제로 그려질 때만 센다. table/tr 은 border-style:none 이어도
    // UA 기본 #808080 을 computed 로 돌려줘서 그대로 세면 유령 위반이 잡힌다.
    const drawn = cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0;
    for (const v of [cs.color, cs.backgroundColor, drawn ? cs.borderTopColor : null]) {
      if (!v) continue;
      const m = v.match(/^rgba?\((\d+), (\d+), (\d+)/);
      if (!m) continue;
      if (v.startsWith('rgba') && v.endsWith(', 0)')) continue;
      used.add('#' + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, '0')).join(''));
    }
  }
  return { n: S.length, vover, hover: [...new Set(hover)], unsafe: [...new Set(unsafe)], accent, used: [...used] };
});

// 정적 검사 — 중복 id, 이모지, 금지 효과
const ids = [...deck.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const dupIds = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
const emoji = deck.match(/\p{Extended_Pictographic}/gu) ?? [];
const banned = ['linear-gradient', 'radial-gradient', 'conic-gradient', 'box-shadow', 'backdrop-filter'];
const bannedHit = banned.filter((b) => deck.includes(b) || theme.includes(b));
const strayColors = r.used.filter((c) => !ALLOWED.has(c));

const rows = [
  ['장표 수', r.n, r.n >= 56],
  ['세로 넘침', r.vover.length, r.vover.length === 0],
  ['가로 넘침', r.hover.length, r.hover.length === 0],
  ['안전 영역 침범', r.unsafe.length, r.unsafe.length === 0],
  ['중복 SVG id', dupIds.length, dupIds.length === 0],
  ['팔레트 이탈', strayColors.length, strayColors.length === 0],
  ['강조색 2회+', r.accent.length, r.accent.length === 0],
  ['이모지', emoji.length, emoji.length === 0],
  ['금지 효과', bannedHit.length, bannedHit.length === 0],
  ['JS 에러', jsErrors.length, jsErrors.length === 0],
];

console.log(`\n덱: ${path.relative(REPO, DECK)}\n`);
let fail = 0;
for (const [name, val, ok] of rows) {
  if (!ok) fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(16)} ${val}`);
}
const dump = (label, arr) => {
  if (arr.length) {
    console.log(`\n  ${label}`);
    arr.slice(0, 25).forEach((x) => console.log('     ' + x));
  }
};
dump('세로 넘침', r.vover);
dump('가로 넘침', r.hover);
dump('안전 영역', r.unsafe);
dump('강조색', r.accent);
dump('팔레트 이탈', strayColors);
dump('중복 id', dupIds);
dump('금지 효과', bannedHit);
dump('JS 에러', jsErrors);

console.log(fail === 0 ? '\n전 항목 통과\n' : `\n${fail}개 항목 미통과\n`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
