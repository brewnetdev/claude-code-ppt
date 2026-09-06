#!/usr/bin/env node
/**
 * export-mobile-deck.js — 슬라이드 데크를 모바일 세로 스크롤 리더로 export
 *
 * Usage:
 *   node export-mobile-deck.js <source.html> <output.html>
 *   node export-mobile-deck.js --selftest
 *
 * 데스크톱 export(export-deck.js)와의 차이 — 왜 별도 스크립트인가:
 *   데스크톱 뷰어는 body{overflow:hidden} + 키보드 전용 네비게이션이라 터치
 *   기기에서 이동 수단이 아예 없다. 여기서는 반대로 "네이티브 세로 스크롤"만
 *   쓰고 JS 네비게이션을 두지 않는다. 목차는 <details>, 이동은 앵커 링크라
 *   스크립트가 죽어도 문서는 계속 읽힌다.
 *
 * 1280×720 고정 좌표를 푸는 방법:
 *   .slide div는 유지한다 (CSS 변수 --bg/--text/--amber가 [data-template]에
 *   걸려 있어 팔레트를 물려받아야 하므로). 지오메트리(width/height/absolute)만
 *   빌드 시점에 인라인 style에서 제거하고, 나머지는 모바일 CSS가 덮는다.
 *
 * Zero external dependencies — Node 표준 라이브러리만 사용.
 *
 * ponytail: 슬라이드 파싱 헬퍼가 export-deck.js와 중복이다. 공용 모듈로 뽑는
 * 대신 복제를 택한 이유는 동작 중인 데스크톱 경로를 건드리지 않기 위해서다.
 * 덱 마크업 구조(export-slide / slide-inner / t-title)가 바뀌면 두 파일 모두
 * 손봐야 한다 — 그때가 공용 모듈로 승격할 시점.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');

// ─── Typography: 1280px 좌표계 폰트 → 모바일 폰트 ──────────────────
// 아핀 압축. 비례 축소(N×0.28)를 쓰면 본문 20px가 5.6px로 무너지고,
// 단일값 고정을 쓰면 제목 48px와 본문 16px이 같아져 위계가 사라진다.
// 기울기 0.30으로 위계는 남기되 하한 15px(모바일 한글 가독 최소선)로 올린다.
const FONT_MIN = 15;
const FONT_MAX = 28;
export function mapFontSize(px) {
  const out = Math.round(10 + 0.3 * px);
  return Math.min(FONT_MAX, Math.max(FONT_MIN, out));
}

// ─── Inline style 재작성 ────────────────────────────────────────────
// 1280×720 좌표에 묶인 선언만 버리고 색·여백·정렬은 보존한다.
const DROP_PROPS = new Set([
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'left', 'top', 'right', 'bottom', 'transform', 'flex', 'flex-basis',
  'inset', 'white-space',
  // 다단 배치를 만드는 선언들 — block 으로 접은 뒤에는 의미가 없다.
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow',
  'flex-direction', 'flex-wrap', 'align-items', 'justify-content',
]);

export function rewriteStyleAttr(style) {
  const kept = [];
  for (const decl of style.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    let value = decl.slice(i + 1).trim();
    if (!prop || !value) continue;

    if (DROP_PROPS.has(prop)) continue;
    // absolute/fixed 배치는 좌표계가 사라지면 겹쳐 쌓이므로 흐름으로 되돌린다.
    if (prop === 'position' && /absolute|fixed/i.test(value)) continue;
    // 인라인 display 는 CSS 로는 !important 없이 못 이긴다. 값 자체를 여기서
    // 접어야 2단 그리드가 세로 화면에서 글자 단위로 쪼개지지 않는다.
    if (prop === 'display' && /^(inline-)?(flex|grid)$/i.test(value)) value = 'block';

    // 그라데이션은 금지(anti-ai-slop). 첫 색상 정지점만 평면으로 남겨 콜아웃의
    // 색 의미는 지키고 그라데이션은 버린다. 색을 못 찾으면 선언째 버린다.
    if (/gradient\(/i.test(value)) {
      const color = value.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b|var\(--[^)]*\)/);
      if (!color) continue;
      value = color[0];
    }
    if (prop === 'font-size') {
      const m = value.match(/^(\d+(?:\.\d+)?)px$/);
      if (m) value = `${mapFontSize(parseFloat(m[1]))}px`;
    }
    kept.push(`${prop}: ${value}`);
  }
  return kept.join('; ');
}

// ─── AI-slop 제거: 테마 CSS 살균 ─────────────────────────────────────
// 원본 테마의 그라데이션·대형/유색 그림자는 모바일에서 숨기는 크롬(topbar,
// slide 박스 그림자)에만 쓰인다. 텍스트로 남으면 check-slop이 잡으므로 제거.
export function sanitizeThemeCss(css) {
  // 그라데이션 인자에는 rgba(...) 처럼 괄호가 중첩된다. 단순 정규식은 첫
  // 닫는 괄호에서 끊겨 `background: var(--amber) 0%, ... 100%);` 같은 깨진
  // 선언을 남기므로, 괄호 깊이를 세어 함수 전체를 통째로 치환한다.
  const re = /(?:-webkit-|-moz-|-o-)?(?:repeating-)?(?:linear|radial|conic)-gradient\(/g;
  let out = '';
  let cursor = 0;
  let m;
  while ((m = re.exec(css)) !== null) {
    if (m.index < cursor) continue;
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < css.length && depth > 0) {
      if (css[i] === '(') depth++;
      else if (css[i] === ')') depth--;
      i++;
    }
    out += css.slice(cursor, m.index) + 'var(--amber, #B45309)';
    cursor = i;
    re.lastIndex = i;
  }
  out += css.slice(cursor);
  out = out.replace(/box-shadow:\s*[^;}]*/g, 'box-shadow: none');

  // 테마 클래스가 직접 지정한 px 폰트도 인라인과 같은 곡선으로 압축한다.
  // 덱마다 다른 클래스(.badge 12px · .prompt-box-label 10px · .step-sub 12px)를
  // 하나씩 오버라이드하는 대신 근원에서 처리해야 새 덱에서도 하한이 지켜진다.
  return out.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g,
    (_all, px) => `font-size: ${mapFontSize(parseFloat(px))}px`);
}

// ─── Helpers ────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

// 타이틀 우선순위 — src/importer/parsePresentation.ts의 selectTitleEl 미러
function extractTitle(inner) {
  const patterns = [
    /<[^>]+data-slot="title"[^>]*>([\s\S]*?)<\/[a-zA-Z]+>/,
    /<[^>]+data-slot="label"[^>]*>([\s\S]*?)<\/[a-zA-Z]+>/,
    /<div[^>]*class="[^"]*\bt-hero\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    /<div[^>]*class="[^"]*\bt-title\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    /<div[^>]*class="[^"]*\bt-chapter\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
  ];
  for (const re of patterns) {
    const m = inner.match(re);
    if (m) {
      const t = stripTags(m[1]);
      if (t) return t;
    }
  }
  return null;
}

function extractPageNum(inner) {
  const m = inner.match(/data-slot="page-num"[^>]*>([\s\S]*?)</);
  return m ? stripTags(m[1]) : '';
}

// ─── 슬라이드 → 모바일 article 본문 ──────────────────────────────────
export function transformSlideBody(sectionInner) {
  let html = sectionInner;

  // 1. export-stage 래퍼 제거 (1280×720 고정 스테이지). .slide는 유지 —
  //    CSS 변수가 [data-template]에 걸려 있어 팔레트를 물려받아야 한다.
  //    여는 태그만 지우면 짝 없는 </div>가 남으므로 마지막 하나를 함께 뗀다.
  if (/<div class="export-stage[^"]*"[^>]*>/.test(html)) {
    html = html.replace(/<div class="export-stage[^"]*"[^>]*>/g, '');
    html = html.replace(/<\/div>\s*$/, '');
  }

  // 2. 오버레이 이미지는 좌표 배치라 흐름 밖으로 빼고 본문 끝에 전폭으로 붙인다.
  const overlays = [];
  html = html.replace(/<img[^>]*class="export-overlay"[^>]*>/g, (tag) => {
    const src = (tag.match(/\ssrc="([^"]*)"/) || [])[1];
    if (!src) return '';
    // 원본 좌표의 w/h 를 width/height 속성으로 옮겨 종횡비 상자를 미리 잡는다.
    // 없으면 lazy 이미지가 로드되는 순간 높이가 튀어(CLS) 앵커 점프가 빗나간다
    // (실측: L3 목차에서 목표 슬라이드가 528px 아래로 밀렸다).
    const w = (tag.match(/width:\s*(\d+(?:\.\d+)?)px/) || [])[1];
    const h = (tag.match(/height:\s*(\d+(?:\.\d+)?)px/) || [])[1];
    overlays.push({ src, w, h });
    return '';
  });

  // 3. 장식 크롬 제거 — topbar(그라데이션 바), footer(제목 중복), 편집 핸들.
  html = html.replace(/<div class="slide-topbar"[^>]*><\/div>/g, '');
  html = html.replace(/<div class="slide-footer"[\s\S]*?<\/div>\s*(?=<\/div>|$)/g, '');
  html = html.replace(/<div class="col-resize-handle"[^>]*><\/div>/g, '');

  // 4. 인라인 style에서 1280 좌표계 선언 제거 + 폰트 재매핑.
  html = html.replace(/\sstyle="([^"]*)"/g, (_all, style) => {
    const next = rewriteStyleAttr(style);
    return next ? ` style="${next}"` : '';
  });

  // 5. 표는 좁은 화면에서 뭉개지므로 가로 스크롤 래퍼에 넣는다.
  html = html.replace(/<table/g, '<div class="m-tbl"><table')
             .replace(/<\/table>/g, '</table></div>');

  const overlayHtml = overlays
    .map(({ src, w, h }) => {
      const dims = w && h ? ` width="${Math.round(w)}" height="${Math.round(h)}"` : '';
      return `<img class="m-figure" src="${src}" alt=""${dims} loading="lazy" />`;
    })
    .join('\n');

  return { html: html.trim(), overlayHtml, overlayCount: overlays.length };
}

// ─── Mobile CSS (테마 CSS 뒤에 append) ───────────────────────────────
const mobileCss = `
/* ═══════════════════════════════════════════════════════════════
   Mobile reader layout — 세로 스크롤 단일 컬럼
   고정 스테이지를 풀고 네이티브 스크롤에 맡긴다. scroll-snap·100vh·
   overflow:hidden 은 iOS 주소창 리사이즈와 충돌하므로 쓰지 않는다.
   ═══════════════════════════════════════════════════════════════ */
/* overflow-x 는 body 가 아니라 html 에 건다. body 에 걸면 뷰포트로 "전파"되어
   body 자신은 클리핑을 멈추고, 넘친 폭만큼 모바일 브라우저가 레이아웃 뷰포트를
   확대한다(실측: innerWidth 390→477, innerHeight 844→1031 = 전체 18% 축소).
   hidden 을 먼저 두어 구형 iOS 를 받치고, clip 으로 덮어 전파를 끊는다. */
html {
  -webkit-text-size-adjust: 100%;
  background: #0B1220;
  overflow-x: hidden;
  overflow-x: clip;
}
/* 소스 덱은 프레젠테이션 모드용 body{overflow:hidden!important} 와 스크롤
   스냅(body{scroll-snap-type:y mandatory})을 함께 싣고 다닌다. 둘 다 모바일
   스크롤을 죽이므로 !important 로 되돌린다 — 여기서 !important 는 취향이
   아니라 소스의 !important 를 이기기 위한 유일한 수단이다. */
body.m-body {
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  overflow: visible !important;
  overflow-x: clip !important;
  scroll-snap-type: none !important;
  min-height: auto !important;
  height: auto !important;
  background: #0B1220 !important;
  font-family: 'Noto Sans KR', system-ui, sans-serif;
  color: #E2E8F0;
}

/* 상단 고정 바 — 제목 + 목차. 스크롤 위치와 무관하게 항상 이동 가능. */
.m-top {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #060B17;
  border-bottom: 1px solid #1E293B;
}
.m-top-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 14px;
}
.m-deck-title {
  font-size: 14px;
  font-weight: 700;
  color: #F1F5F9;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
}
.m-count {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: #94A3B8;
  white-space: nowrap;
}
.m-toc { border-top: 1px solid #1E293B; }
.m-toc > summary {
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #CBD5E1;
  cursor: pointer;
  list-style: none;
}
.m-toc > summary::-webkit-details-marker { display: none; }
.m-toc > summary::after { content: ' ▾'; color: #64748B; }
.m-toc[open] > summary::after { content: ' ▴'; }
.m-toc ol {
  margin: 0;
  padding: 0 0 8px 0;
  list-style: none;
  max-height: 62vh;
  overflow-y: auto;
  border-top: 1px solid #1E293B;
}
.m-toc li a {
  display: flex;
  gap: 10px;
  padding: 9px 14px;
  font-size: 13px;
  line-height: 1.4;
  color: #CBD5E1;
  text-decoration: none;
  border-bottom: 1px solid #131C2E;
}
.m-toc li a .n {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: #64748B;
  min-width: 26px;
}

/* 슬라이드 = 문서 섹션. scroll-margin-top 은 sticky 헤더에 가리지 않게. */
.m-slide {
  scroll-margin-top: 92px;
  border-bottom: 8px solid #060B17;
}
.m-slide-num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: #64748B;
  padding: 10px 16px 0 16px;
  background: var(--bg, #0F172A);
}
.m-figure {
  display: block;
  width: 100%;
  height: auto;
  margin: 12px 0 0 0;
  border: 1px solid #1E293B;
}
.m-tbl { overflow-x: auto; margin: 10px 0; }
.m-slide .m-tbl table { min-width: 520px; }

/* ─── 가로 오버플로 봉쇄 ───
   flex/grid 자식의 기본 min-width:auto 는 긴 코드 줄·아이콘 행이 컨테이너를
   밀어내게 만든다(진단: pre>code 1066px, .callout-icon 782px). min-width:0 으로
   수축을 허용하고, 넘치는 것은 각자 가로 스크롤로 가둔다. */
.m-slide .slide-inner * { min-width: 0; }
.m-slide pre { overflow-x: auto; max-width: 100%; }
.m-slide img, .m-slide svg { max-width: 100%; height: auto; }
.m-slide .callout { display: block; }

/* ─── 1280×720 지오메트리 해제 ─── */
.m-slide .slide {
  position: static;
  width: auto;
  height: auto;
  min-height: 0;
  overflow: visible;
  box-shadow: none;
}
.m-slide .slide-inner {
  position: static;
  display: block;
  height: auto;
  padding: 12px 16px 24px 16px;
}
.m-slide .slide-inner > * { max-width: 100%; }

/* 좌표 배치는 인라인뿐 아니라 테마 클래스에서도 온다(.section-num·.cover-deco·
   .slide-logo). 고정 좌표계가 사라진 뒤에도 absolute/fixed 로 남으면 스크롤과
   무관하게 전 화면에 겹쳐 찍힌다 — 실제로 87번 슬라이드의 섹션 번호가 커버 위에
   보였다. 크롬이 사는 두 층(.slide 직계 / .slide-inner 직계)만 흐름으로 되돌린다.
   더 깊은 곳의 position:relative(코드블록·표 헤더)는 건드리지 않는다.

   static 이 아니라 relative 인 이유: 이 블록들은 자기 안의 배지(.prompt-box-label
   같은 absolute 자식)의 기준 상자이기도 하다. static 으로 만들면 그 배지가 기준을
   잃고 페이지 좌표로 떨어져 다른 슬라이드 위에 뜬다(L5 PROMPT/BAD/GOOD 실측).
   relative 는 흐름에 되돌리면서 기준 상자 역할은 유지한다. */
.m-slide .slide > *,
.m-slide .slide-inner > * { position: relative !important; }
.m-slide .slide::before,
.m-slide .slide::after { display: none !important; }
/* 슬라이드마다 반복되는 브랜딩 로고는 세로 문서에서는 잡음일 뿐이다 */
.m-slide .slide-logo { display: none !important; }
.m-slide .cover-deco { font-size: 20px; opacity: .7; }

/* 2단 배치는 세로로 접는다. 인라인 display 는 빌드 시점에 이미 block 으로
   바뀌었고, 여기서는 테마 클래스가 만드는 가로 배치만 처리한다. */
.m-slide .two-col,
.m-slide .cover-meta,
.m-slide .cover-meta-item,
.m-slide .arch-box {
  display: block !important;
}
.m-slide .cover-meta-item { margin-bottom: 8px; }
.m-slide .bullet-list { display: block; }
.m-slide .bullet-list li { margin-bottom: 10px; }

/* ─── 타이포 스케일 — 인라인 값이 없는 테마 기본 크기를 모바일로 ─── */
.m-slide .t-hero { font-size: 26px; line-height: 1.3; }
.m-slide .t-title { font-size: 21px; line-height: 1.35; }
.m-slide .t-caption { font-size: 15px; line-height: 1.6; }
/* 눈썹 라벨은 대문자 모노라 13px 아래로 내리면 판독이 급격히 나빠진다 */
.m-slide .t-chapter { font-size: 13px; }
.m-slide .cover-level { font-size: 13px; }
.m-slide .section-num { font-size: 24px; }
.m-slide .cover-subtitle { font-size: 16px; line-height: 1.6; }
.m-slide .cover-deco { font-size: 28px; }
.m-slide .bullet-list li { font-size: 15px; line-height: 1.65; }
.m-slide .tbl { font-size: 14px; }
.m-slide .code-block { overflow-x: auto; padding: 14px 16px; }
.m-slide .code-block pre,
.m-slide .code-block code { font-size: 13px; line-height: 1.6; }

/* 긴 URL·명령어가 화면 밖으로 나가지 않게 */
.m-slide a, .m-slide code { overflow-wrap: anywhere; }

/* 넓은 화면에서는 읽기 폭을 제한 — 데스크톱에서 열어도 깨지지 않는다 */
@media (min-width: 760px) {
  .m-slide .slide-inner { max-width: 720px; margin: 0 auto; }
  .m-top-row, .m-toc > summary, .m-toc li a { max-width: 720px; margin-inline: auto; }
}

@media print {
  .m-top { display: none; }
  .m-slide { break-after: page; }
}
`;

// ─── Build ──────────────────────────────────────────────────────────
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function build(sourcePath, outputPath) {
  if (!fs.existsSync(sourcePath)) fail(`Source not found: ${sourcePath}`);
  const source = fs.readFileSync(sourcePath, 'utf8');

  const deckTitle = (source.match(/<title>([^<]*)<\/title>/) || [, 'Slide Deck'])[1].trim();
  const subtitle = (source.match(/<meta\s+name="subtitle"\s+content="([^"]*)"/) || [, ''])[1].trim();
  const themeCss = sanitizeThemeCss((source.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1]);
  const fontLinks = (source.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/g) || []).join('\n');

  const slideRe = /<section class="export-slide" data-index="(\d+)"[^>]*>([\s\S]*?)<\/section>/g;
  const slides = [];
  let m;
  while ((m = slideRe.exec(source)) !== null) {
    slides.push({
      index: parseInt(m[1], 10),
      inner: m[2],
      title: extractTitle(m[2]) || `Slide ${parseInt(m[1], 10) + 1}`,
      pageNum: extractPageNum(m[2]),
    });
  }
  if (slides.length === 0) {
    fail('No slides found — expected <section class="export-slide" data-index="N">');
  }
  slides.sort((a, b) => a.index - b.index);

  let overlayTotal = 0;
  const articles = slides.map((s, i) => {
    const { html, overlayHtml, overlayCount } = transformSlideBody(s.inner);
    overlayTotal += overlayCount;
    const label = s.pageNum ? `${escapeHtml(s.pageNum)} · ${i + 1}/${slides.length}`
                            : `${i + 1}/${slides.length}`;
    return `<article class="m-slide" id="s${i + 1}">
<div class="m-slide-num">${label}</div>
${html}
${overlayHtml}
</article>`;
  }).join('\n');

  const tocItems = slides.map((s, i) =>
    `<li><a href="#s${i + 1}"><span class="n">${i + 1}</span><span>${escapeHtml(s.title)}</span></a></li>`
  ).join('\n');

  const output = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="color-scheme" content="dark" />
<meta name="description" content="${escapeHtml(subtitle || deckTitle)}" />
<title>${escapeHtml(deckTitle)} — 모바일</title>
${fontLinks}
<style>
${themeCss}
${mobileCss}
</style>
</head>
<body class="m-body">
<header class="m-top">
  <div class="m-top-row">
    <div class="m-deck-title">${escapeHtml(deckTitle)}</div>
    <div class="m-count">${slides.length}p</div>
  </div>
  <details class="m-toc">
    <summary>목차</summary>
    <ol>
${tocItems}
    </ol>
  </details>
</header>
<main>
${articles}
</main>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);

  console.log(`✓ Exported ${slides.length} slides (mobile)`);
  console.log(`  Source:   ${path.relative(REPO_ROOT, sourcePath)}`);
  console.log(`  Output:   ${path.relative(REPO_ROOT, outputPath)}`);
  console.log(`  Overlays: ${overlayTotal}`);
  console.log(`  Size:     ${(Buffer.byteLength(output) / 1024).toFixed(1)} KB`);
}

// ─── Self-check ─────────────────────────────────────────────────────
function selftest() {
  const assert = (cond, msg) => { if (!cond) { console.error(`✗ ${msg}`); process.exit(1); } };

  // 폰트 매핑: 위계 보존 + 하한/상한
  assert(mapFontSize(48) > mapFontSize(20), 'title must stay larger than body');
  assert(mapFontSize(8) === FONT_MIN, 'tiny source font must be lifted to the floor');
  assert(mapFontSize(120) === FONT_MAX, 'huge source font must be capped');
  assert(mapFontSize(20) >= 15 && mapFontSize(20) <= 18, `body 20px → ${mapFontSize(20)}px out of range`);

  // style 재작성: 좌표 제거, 색·여백 보존, 폰트 재매핑
  const out = rewriteStyleAttr('position: absolute; left: 72px; top: 161px; width: 1200px; font-size: 20px; color: #333; margin-top: 12px');
  // 속성 이름 경계로 검사한다 — 부분 문자열로 보면 margin-top 이 top 으로 오탐된다.
  const props = out.split(';').map((d) => d.split(':')[0].trim());
  assert(!props.some((p) => ['position', 'left', 'top', 'width'].includes(p)), `geometry survived: ${out}`);
  assert(/color: #333/.test(out) && /margin-top: 12px/.test(out), `visual props lost: ${out}`);
  assert(/font-size: 1[5-8]px/.test(out), `font not remapped: ${out}`);

  // 다단 배치는 세로 1단으로 접힌다 (인라인 display 는 CSS 로 못 이기므로)
  const grid = rewriteStyleAttr('display: grid; grid-template-columns: 1fr 1fr; gap: 16px; color: #111');
  assert(/display: block/.test(grid), `grid not flattened: ${grid}`);
  assert(!/grid-template-columns/.test(grid), `column spec survived: ${grid}`);
  assert(/gap: 16px/.test(grid) && /color: #111/.test(grid), `harmless props lost: ${grid}`);
  assert(/display: block/.test(rewriteStyleAttr('display: flex')), 'inline flex not flattened');

  // 인라인 그라데이션 → 첫 색상 정지점만 평면으로
  const grad = rewriteStyleAttr('background: linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06)); border: 1px solid #333');
  assert(!/gradient/.test(grad), `inline gradient survived: ${grad}`);
  assert(/background: rgba\(245,158,11,0\.18\)/.test(grad), `first stop not kept flat: ${grad}`);
  assert(/border: 1px solid #333/.test(grad), `sibling declaration lost: ${grad}`);

  // 테마 살균: gradient·shadow 소거
  const css = sanitizeThemeCss('.a{background: linear-gradient(90deg, #fff 0%, transparent 100%); box-shadow: 0 8px 40px rgba(0,0,0,.18);}');
  assert(!/gradient/.test(css), `gradient survived: ${css}`);
  assert(!/box-shadow:\s*0/.test(css), `shadow survived: ${css}`);
  // 중첩 괄호(rgba) — 함수 전체가 사라져야 하고 고아 인자가 남으면 안 된다
  const nested = sanitizeThemeCss('.b{background: linear-gradient(135deg, rgba(15,23,42,0.82) 0%, rgba(0,0,0,.5) 50%); color: red;}');
  assert(!/gradient/.test(nested), `nested gradient survived: ${nested}`);
  assert(!/0%|50%|rgba\(15/.test(nested), `orphan gradient args left: ${nested}`);
  assert(/color: red/.test(nested), `following declaration lost: ${nested}`);
  assert((nested.match(/\(/g) || []).length === (nested.match(/\)/g) || []).length, `unbalanced parens: ${nested}`);

  // 슬라이드 변환: 크롬 제거, 오버레이 분리, 표 래핑
  const section = `<div class="export-stage slide-canvas-host">
<div class="slide" data-template="report">
  <div class="slide-topbar"></div>
  <div class="slide-inner"><div class="t-title" style="font-size:48px;width:840px;">T</div>
  <table class="tbl"><tr><td>x</td></tr></table></div>
  <img class="export-overlay" src="data:image/png;base64,AAA" style="left:10px;top:20px;width:100px;height:50px;" />
  <div class="slide-footer"><span>f</span></div>
</div></div>`;
  const r = transformSlideBody(section);
  assert(!/slide-topbar|slide-footer|export-stage/.test(r.html), 'chrome survived transform');
  assert(!/export-overlay/.test(r.html) && r.overlayCount === 1, 'overlay not extracted');
  assert(/class="m-figure"/.test(r.overlayHtml), 'overlay figure not emitted');
  assert(/<div class="m-tbl"><table/.test(r.html) && /<\/table><\/div>/.test(r.html), 'table not wrapped');
  assert(/data-template="report"/.test(r.html), 'palette carrier .slide dropped');
  assert(!/width: 840px/.test(r.html), 'inline width survived');

  console.log('✓ selftest passed (4 groups, 17 assertions)');
}

const args = process.argv.slice(2);
if (args[0] === '--selftest') {
  selftest();
} else {
  if (args.length < 2) fail('Usage: node export-mobile-deck.js <source.html> <output.html>  |  --selftest');
  build(path.resolve(REPO_ROOT, args[0]), path.resolve(REPO_ROOT, args[1]));
}
