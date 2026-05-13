#!/usr/bin/env node
/**
 * export-deck.js — 사이드바+뷰어 레이아웃으로 슬라이드 데크 export
 *
 * Usage:
 *   node export-deck.js [source.html] [output.html]
 *
 * Defaults:
 *   source: docs/html/presentation/claude-code-how-to.html
 *   output: docs/html-export/effective-claude-code.html
 *
 * Zero external dependencies — Node 표준 라이브러리만 사용.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const args = process.argv.slice(2);
const SOURCE = path.resolve(REPO_ROOT, args[0] || 'docs/html/presentation/claude-code-how-to.html');
const OUTPUT = path.resolve(REPO_ROOT, args[1] || 'docs/html-export/effective-claude-code.html');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(SOURCE)) fail(`Source not found: ${SOURCE}`);

const source = fs.readFileSync(SOURCE, 'utf8');

// ─── Meta extraction ───────────────────────────────────────────
const titleMatch = source.match(/<title>([^<]*)<\/title>/);
const subtitleMatch = source.match(/<meta\s+name="subtitle"\s+content="([^"]*)"/);
const deckTitle = (titleMatch ? titleMatch[1] : 'Slide Deck').trim();
const deckSubtitle = (subtitleMatch ? subtitleMatch[1] : '').trim();

// Theme CSS — 소스의 첫 <style>...</style> 블록 그대로 임베드
const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/);
const themeCss = styleMatch ? styleMatch[1] : '';

// Google Fonts links — <head>에서 추출해서 출력에도 동일하게
const fontLinks = (source.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/g) || []).join('\n');

// ─── Helpers ───────────────────────────────────────────────────
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

/**
 * 타이틀 추출 — src/importer/parsePresentation.ts의 selectTitleEl 로직 미러
 * 우선순위: data-slot="title" → "label" → "subtitle" → .t-hero → .t-title → .t-chapter → .cover-level
 */
function extractTitle(slideInner) {
  const patterns = [
    /<[^>]+data-slot="title"[^>]*>([\s\S]*?)<\/[a-zA-Z]+>/,
    /<[^>]+data-slot="label"[^>]*>([\s\S]*?)<\/[a-zA-Z]+>/,
    /<[^>]+data-slot="subtitle"[^>]*>([\s\S]*?)<\/[a-zA-Z]+>/,
    /<div[^>]*class="[^"]*\bt-hero\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    /<div[^>]*class="[^"]*\bt-title\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    /<div[^>]*class="[^"]*\bt-chapter\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    /<div[^>]*class="[^"]*\bcover-level\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
  ];
  for (const re of patterns) {
    const m = slideInner.match(re);
    if (m) {
      const text = stripTags(m[1]);
      if (text) return text;
    }
  }
  return null;
}

function extractPageNum(slideInner) {
  const m = slideInner.match(/data-slot="page-num"[^>]*>([\s\S]*?)</);
  return m ? stripTags(m[1]) : '';
}

// ─── Slide extraction ──────────────────────────────────────────
const slideRe = /<section class="export-slide" data-index="(\d+)"[^>]*>([\s\S]*?)<\/section>/g;
const slides = [];
let m;
while ((m = slideRe.exec(source)) !== null) {
  const idx = parseInt(m[1], 10);
  slides.push({
    index: idx,
    full: m[0],
    inner: m[2],
    title: extractTitle(m[2]) || `Slide ${idx + 1}`,
    pageNum: extractPageNum(m[2]) || String(idx + 1),
  });
}

if (slides.length === 0) {
  fail('No slides found — expected <section class="export-slide" data-index="N">');
}

slides.sort((a, b) => a.index - b.index);

// ─── Sidebar markup ────────────────────────────────────────────
const sidebarItems = slides.map((s, i) => {
  return `    <li class="sidebar-item" data-target="${i}">` +
    `<span class="sb-num">${escapeHtml(s.pageNum)}</span>` +
    `<span class="sb-title">${escapeHtml(s.title)}</span>` +
    `</li>`;
}).join('\n');

// ─── Slide stage ────────────────────────────────────────────────
const slideFrames = slides.map((s, i) => {
  return `    <div class="slide-frame" data-slide="${i}"${i === 0 ? '' : ' hidden'}>${s.full}</div>`;
}).join('\n');

// ─── Layout CSS (테마 CSS 뒤에 append) ───────────────────────────
const layoutCss = `
/* ═══════════════════════════════════════════════════════════════
   Export viewer layout — 사이드바 + 컨텐츠 영역
   ═══════════════════════════════════════════════════════════════ */
html, body { height: 100%; margin: 0; padding: 0; }
/* 소스 deck의 'body { display: block !important; ... }' 오버라이드를
   역오버라이드하기 위해 !important 사용 */
body.deck-viewer-body {
  display: flex !important;
  flex-direction: row !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  background: #020617 !important;
  font-family: 'Noto Sans KR', sans-serif !important;
  color: var(--text, #F1F5F9);
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  gap: 0 !important;
  min-height: 100vh !important;
  height: 100vh !important;
  width: 100vw !important;
}

/* ─── Sidebar ─── */
aside.deck-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: #0B1220;
  border-right: 1px solid var(--border, #1E293B);
  overflow-y: auto;
  padding: 0 0 24px 0;
  height: 100vh;
}
.deck-sidebar-header {
  padding: 18px 18px 14px 18px;
  border-bottom: 1px solid #1E293B;
  margin-bottom: 8px;
  background: #060B17;
  position: sticky;
  top: 0;
  z-index: 2;
}
.deck-sidebar-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--amber, #F59E0B);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.04em;
  line-height: 1.3;
}
.deck-sidebar-sub {
  font-size: 10.5px;
  color: var(--muted, #94A3B8);
  margin-top: 6px;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.5;
  letter-spacing: 0.02em;
}
.deck-sidebar-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar-item {
  padding: 9px 16px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: baseline;
  border-left: 3px solid transparent;
  transition: background 0.12s, border-color 0.12s;
}
.sidebar-item:hover {
  background: rgba(245,158,11,0.06);
}
.sidebar-item.active {
  background: rgba(245,158,11,0.14);
  border-left-color: var(--amber, #F59E0B);
}
.sb-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--muted, #94A3B8);
  flex-shrink: 0;
  width: 56px;
  letter-spacing: 0.04em;
}
.sidebar-item.active .sb-num { color: var(--amber, #F59E0B); font-weight: 700; }
.sb-title {
  font-size: 12.5px;
  color: var(--text, #F1F5F9);
  line-height: 1.4;
  word-break: keep-all;
}
.sidebar-item.active .sb-title { font-weight: 600; }

/* ─── Main viewer ─── */
main.deck-viewer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  height: 100vh;
  min-width: 0;
}
.slide-stage {
  position: relative;
  width: 1280px;
  height: 720px;
  transform-origin: center center;
  flex-shrink: 0;
}
.slide-frame {
  position: absolute;
  inset: 0;
  width: 1280px;
  height: 720px;
}
.slide-frame[hidden] { display: none !important; }

/* 임베드된 <section class="export-slide"> 의 기본 vertical-scroll 스타일 무력화 */
.deck-viewer-body .export-slide {
  position: static !important;
  height: 720px !important;
  width: 1280px !important;
  display: block !important;
  border: 0 !important;
  scroll-snap-align: unset !important;
  margin: 0 !important;
  padding: 0 !important;
}
.deck-viewer-body .export-stage {
  position: static !important;
  transform: none !important;
  width: 1280px !important;
  height: 720px !important;
}
.deck-viewer-body .export-nav { display: none !important; }

/* ─── Presentation mode (F key / Present button / Fullscreen API) ─── */
body.deck-viewer-body.present-mode aside.deck-sidebar { display: none !important; }
body.deck-viewer-body.present-mode main.deck-viewer { width: 100vw !important; }
body.deck-viewer-body.present-mode .deck-nav {
  opacity: 0.18;
  transition: opacity 0.2s ease;
}
body.deck-viewer-body.present-mode .deck-nav:hover { opacity: 1; }
body.deck-viewer-body.present-mode .deck-hint {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  background: rgba(15,23,42,0.7);
  border: 1px solid rgba(245,158,11,0.35);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--muted, #94A3B8);
  z-index: 110;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
body.deck-viewer-body.present-mode .deck-hint.show {
  opacity: 1;
}

/* ─── Floating nav bar ─── */
.deck-nav {
  position: fixed;
  bottom: 22px;
  right: 28px;
  display: flex;
  gap: 8px;
  align-items: center;
  background: rgba(15,23,42,0.9);
  border: 1px solid var(--border, #1E293B);
  border-radius: 999px;
  padding: 6px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--muted, #94A3B8);
  z-index: 100;
  backdrop-filter: blur(6px);
}
.deck-nav button {
  background: transparent;
  border: 0;
  color: var(--text, #F1F5F9);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  transition: background 0.12s, color 0.12s;
}
.deck-nav button:hover {
  background: rgba(245,158,11,0.18);
  color: var(--amber, #F59E0B);
}
.deck-nav button:disabled {
  color: #334155;
  cursor: not-allowed;
  background: transparent;
}
.deck-nav .counter {
  font-size: 12px;
  color: var(--text, #F1F5F9);
  font-weight: 700;
  padding: 0 6px;
  min-width: 64px;
  text-align: center;
}
`;

// ─── Navigation script ──────────────────────────────────────────
const navScript = `(function() {
  const slides  = Array.from(document.querySelectorAll('.slide-frame'));
  const items   = Array.from(document.querySelectorAll('.sidebar-item'));
  const counter   = document.getElementById('deck-counter');
  const prevBtn   = document.getElementById('deck-prev');
  const nextBtn   = document.getElementById('deck-next');
  const presentBtn= document.getElementById('deck-present');
  const hint      = document.getElementById('deck-hint');
  const stage     = document.querySelector('.slide-stage');
  const viewer    = document.querySelector('.deck-viewer');
  const total = slides.length;
  let current = 0;
  let hintTimer = null;

  function fit() {
    if (!stage || !viewer) return;
    const w = viewer.clientWidth, h = viewer.clientHeight;
    const s = Math.min(w / 1280, h / 720) * 0.94;
    stage.style.transform = 'scale(' + s + ')';
  }

  function isPresenting() {
    return document.body.classList.contains('present-mode');
  }

  function showHint(msg) {
    if (!hint) return;
    hint.textContent = msg;
    hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function(){ hint.classList.remove('show'); }, 1800);
  }

  function enterPresent(useFs) {
    document.body.classList.add('present-mode');
    presentBtn.textContent = '✕';
    presentBtn.title = 'Exit presentation (F / Esc)';
    if (useFs && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function(){ /* user gesture required, fine */ });
    }
    setTimeout(fit, 50);
    showHint('PRESENTATION MODE — F or Esc to exit · ←→ to navigate');
  }

  function exitPresent() {
    document.body.classList.remove('present-mode');
    presentBtn.textContent = '🖥';
    presentBtn.title = 'Enter presentation (F)';
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function(){});
    }
    setTimeout(fit, 50);
  }

  function togglePresent() {
    if (isPresenting()) exitPresent();
    else enterPresent(true);
  }

  function goTo(n) {
    if (n < 0) n = 0;
    if (n >= total) n = total - 1;
    current = n;
    slides.forEach(function(el, i){ el.hidden = (i !== n); });
    items.forEach(function(el, i){ el.classList.toggle('active', i === n); });
    counter.textContent = (n + 1) + ' / ' + total;
    prevBtn.disabled = (n === 0);
    nextBtn.disabled = (n === total - 1);
    history.replaceState(null, '', '#slide-' + (n + 1));
    if (items[n]) items[n].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function parseHash() {
    const m = (location.hash || '').match(/#slide-(\\d+)/);
    if (!m) return 0;
    const n = parseInt(m[1], 10) - 1;
    return Math.max(0, Math.min(total - 1, n));
  }

  items.forEach(function(el, i){ el.addEventListener('click', function(){ goTo(i); }); });
  prevBtn.addEventListener('click', function(){ goTo(current - 1); });
  nextBtn.addEventListener('click', function(){ goTo(current + 1); });
  if (presentBtn) presentBtn.addEventListener('click', togglePresent);

  document.addEventListener('keydown', function(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault(); goTo(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault(); goTo(current - 1);
    } else if (e.key === 'Home') {
      e.preventDefault(); goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); goTo(total - 1);
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault(); togglePresent();
    } else if (e.key === 'Escape') {
      if (isPresenting()) { e.preventDefault(); exitPresent(); }
    }
  });

  // Sync state when user exits fullscreen via browser's native Esc
  document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement && isPresenting()) {
      exitPresent();
    }
  });

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', function(){ goTo(parseHash()); });

  fit();
  goTo(parseHash());
})();`;

// ─── Compose output ────────────────────────────────────────────
const output = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(deckTitle)} — Web Viewer</title>
${fontLinks}
<style>
${themeCss}
${layoutCss}
</style>
</head>
<body class="deck-viewer-body">
<aside class="deck-sidebar">
  <div class="deck-sidebar-header">
    <div class="deck-sidebar-title">${escapeHtml(deckTitle)}</div>
${deckSubtitle ? `    <div class="deck-sidebar-sub">${escapeHtml(deckSubtitle)}</div>` : ''}
    <div class="deck-sidebar-sub">${slides.length} slides · ↑↓ / ←→ keys</div>
  </div>
  <ul class="deck-sidebar-list">
${sidebarItems}
  </ul>
</aside>
<main class="deck-viewer">
  <div class="slide-stage">
${slideFrames}
  </div>
  <nav class="deck-nav" aria-label="Slide navigation">
    <button id="deck-prev" aria-label="Previous slide">←</button>
    <span class="counter" id="deck-counter">1 / ${slides.length}</span>
    <button id="deck-next" aria-label="Next slide">→</button>
    <button id="deck-present" aria-label="Enter presentation mode" title="Enter presentation (F)">🖥</button>
  </nav>
  <div class="deck-hint" id="deck-hint"></div>
</main>
<script>
${navScript}
</script>
</body>
</html>
`;

// ─── Write ──────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, output);

console.log(`✓ Exported ${slides.length} slides`);
console.log(`  Source: ${path.relative(REPO_ROOT, SOURCE)}`);
console.log(`  Output: ${path.relative(REPO_ROOT, OUTPUT)}`);
console.log(`  Size:   ${(output.length / 1024).toFixed(1)} KB`);
console.log(`  Open:   open ${path.relative(REPO_ROOT, OUTPUT)}`);
