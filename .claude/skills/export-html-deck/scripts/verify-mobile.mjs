// Mobile export verification — 390×844 (iPhone 14 CSS px)
import { chromium } from 'playwright';
import path from 'path';

const file = process.argv[2];
const shotDir = process.argv[3] || '/tmp';
const url = /^https?:\/\//.test(file) ? file : 'file://' + path.resolve(file);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1500);

const fail = [];
const ok = [];

// 1. 세로 스크롤이 실제로 가능한가 (버그 재현 대상)
const scroll = await page.evaluate(() => {
  const before = window.scrollY;
  window.scrollTo(0, document.body.scrollHeight);
  return { before, after: window.scrollY, docH: document.body.scrollHeight, winH: window.innerHeight,
           bodyOverflow: getComputedStyle(document.body).overflow,
           snap: getComputedStyle(document.body).scrollSnapType };
});
(scroll.after > 100 ? ok : fail).push(`scroll: ${scroll.before} → ${scroll.after} (doc ${scroll.docH}px / win ${scroll.winH}px)`);
(scroll.bodyOverflow !== 'hidden' ? ok : fail).push(`body overflow: ${scroll.bodyOverflow}`);
(scroll.snap === 'none' ? ok : fail).push(`scroll-snap: ${scroll.snap}`);

// 2. 가로 오버플로 없음.
//    모바일 브라우저는 콘텐츠가 뷰포트보다 넓으면 레이아웃 뷰포트를 확대해
//    전체를 축소 렌더한다. 그래서 innerWidth 가 요청한 390 그대로인지가
//    scrollWidth 보다 직접적인 판정 기준이다.
const overflow = await page.evaluate(() => {
  const de = document.documentElement;
  // 스크롤 컨테이너(표 래퍼 등) 안쪽은 의도된 가로 스크롤이므로 제외한다.
  const clipped = (el) => {
    let e = el.parentElement;
    while (e && e !== document.body) {
      const ox = getComputedStyle(e).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
      e = e.parentElement;
    }
    return false;
  };
  const wide = [...document.querySelectorAll('.m-slide *')]
    .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2 && !clipped(el))
    .slice(0, 6)
    .map((el) => `${el.tagName}.${(el.className || '').toString().split(' ')[0]}@${Math.round(el.getBoundingClientRect().right)}px`);
  return { scrollW: de.scrollWidth, clientW: de.clientWidth, innerW: window.innerWidth, wide };
});
(overflow.innerW === 390 && overflow.wide.length === 0 ? ok : fail)
  .push(`h-overflow: innerWidth ${overflow.innerW} (want 390, 초과 시 브라우저가 축소 렌더), scrollWidth ${overflow.scrollW}${overflow.wide.length ? ' | ' + overflow.wide.join(', ') : ''}`);

// 3. 본문 폰트 실측 (렌더된 텍스트 노드 기준)
//    SVG 다이어그램 내부 텍스트는 그림의 일부로 뷰포트에 맞춰 축소되며
//    핀치줌으로 확대해 보는 것이 정상이므로 HTML 본문과 분리해 집계한다.
const fonts = await page.evaluate(() => {
  const sizes = [];
  let svgTexts = 0;
  for (const el of document.querySelectorAll('.m-slide .slide-inner *')) {
    const t = (el.textContent || '').trim();
    if (!t || el.children.length > 0) continue;
    if (el.ownerSVGElement || el.closest('svg')) { svgTexts++; continue; }
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs) sizes.push(fs);
  }
  sizes.sort((a, b) => a - b);
  return { min: sizes[0], p10: sizes[Math.floor(sizes.length * 0.1)], median: sizes[Math.floor(sizes.length / 2)], max: sizes[sizes.length - 1], n: sizes.length, svgTexts };
});
(fonts.min >= 13 ? ok : fail).push(`font px: min ${fonts.min} / p10 ${fonts.p10} / median ${fonts.median} / max ${fonts.max} (n=${fonts.n}, svg text ${fonts.svgTexts} 제외)`);

// 4. TOC 앵커 이동
const toc = await page.evaluate(async () => {
  const d = document.querySelector('details.m-toc');
  if (!d) return { err: 'no toc' };
  d.open = true;
  const links = d.querySelectorAll('a[href^="#s"]');
  const target = links[Math.min(40, links.length - 1)];
  const href = target.getAttribute('href');
  target.click();
  await new Promise((r) => setTimeout(r, 400));
  const el = document.querySelector(href);
  const top = el.getBoundingClientRect().top;
  return { count: links.length, href, top: Math.round(top) };
});
(toc.count > 0 && Math.abs(toc.top) < 200 ? ok : fail).push(`toc: ${toc.count} links, jump ${toc.href} → viewport top ${toc.top}px`);

// 5. 콘텐츠 존재 확인
const content = await page.evaluate(() => ({
  slides: document.querySelectorAll('.m-slide').length,
  figures: document.querySelectorAll('img.m-figure').length,
  tables: document.querySelectorAll('.m-tbl table').length,
  absolutes: [...document.querySelectorAll('.m-slide .slide-inner *')].filter((e) => getComputedStyle(e).position === 'absolute').length,
}));
(content.slides > 0 ? ok : fail).push(`content: ${content.slides} slides, ${content.figures} figures, ${content.tables} tables`);

// 6. 좌표 배치 잔존 = 다른 슬라이드 위에 겹쳐 찍히는 결함
//    (.section-num 이 fixed 로 남아 커버 위에 보이던 실제 버그)
// 박스 안에 얹힌 배지처럼 자기 슬라이드 안의 기준 상자를 가진 absolute 는
// 정상이다. 결함은 기준을 잃고 페이지 좌표로 떨어진 것(offsetParent 가 없거나
// 다른 슬라이드 밖) — 그것만 다른 장 위에 겹쳐 찍힌다.
const stray = await page.evaluate(() => {
  const bad = [...document.querySelectorAll('.m-slide .slide *')]
    .filter((e) => {
      const pos = getComputedStyle(e).position;
      if (pos === 'fixed') return true;
      if (pos !== 'absolute') return false;
      const op = e.offsetParent;
      return !op || op.closest('.m-slide') !== e.closest('.m-slide');
    })
    .map((e) => `${(e.className || '').toString().trim().split(/\s+/)[0]}("${(e.textContent || '').trim().slice(0, 14)}")`);
  return { count: bad.length, sample: [...new Set(bad)].slice(0, 5) };
});
(stray.count === 0 ? ok : fail).push(`stray absolute/fixed: ${stray.count}${stray.sample.length ? ' | ' + stray.sample.join(', ') : ''}`);

// 스크린샷 — 커버 / 본문 / 표 슬라이드
await page.evaluate(() => { const d = document.querySelector('details.m-toc'); if (d) d.open = false; window.scrollTo(0, 0); });
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/m-01-cover.png` });
await page.evaluate(() => document.querySelector('#s8')?.scrollIntoView());
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/m-02-body.png` });
await page.evaluate(() => document.querySelector('#s13')?.scrollIntoView());
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/m-03-table.png` });

console.log('PASS:');
ok.forEach((l) => console.log('  ✓ ' + l));
if (fail.length) {
  console.log('FAIL:');
  fail.forEach((l) => console.log('  ✗ ' + l));
}
await browser.close();
process.exit(fail.length ? 1 : 0);
