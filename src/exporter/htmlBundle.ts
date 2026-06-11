import brewnetCss from '../canvas/themes/brewnet-dark.css?raw';
import codeBlocksCss from '../canvas/themes/code-blocks.css?raw';
import portfolioCss from '../canvas/themes/portfolio.css?raw';
import reportCss from '../canvas/themes/report.css?raw';
import type { ImageOverlay, Overlay, TextOverlay } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';
import { applyBackgroundToHtml } from '../scene/applySlideBackground';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import { linkifyHtml } from './linkify';

// The standalone bundle must ship the SAME theme CSS the live editor loads
// (SlideRenderer.tsx imports all four) so per-template overrides win the
// cascade — e.g. the report deck's light `[data-template="report"]` token
// block in report.css. Shipping only brewnet-dark made every non-brewnet deck
// (report / portfolio) fall back to the dark base, rendering light decks dark
// and hiding dark-on-light overlay text. Order mirrors SlideRenderer +
// generator/inlineThemeCss: brewnet-dark base first, then per-template overrides.
const themeCss = [brewnetCss, codeBlocksCss, portfolioCss, reportCss].join('\n\n');

const PRESET_CLASS: Record<NonNullable<TextOverlay['preset']>, string> = {
  h1: 't-title',
  h2: 't-h2',
  h3: 't-h3',
  p: 't-body',
};

export type BundleInput = {
  slides: ParsedSlide[];
  overlaysBySlide: Record<string, Overlay[]>;
  title?: string;
};

// blob: URLs only live in the authoring session — embed as data URLs so the
// exported HTML is self-contained and can be opened or emailed standalone.
async function blobUrlToDataUrl(url: string): Promise<string> {
  if (!url.startsWith('blob:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}

// The editor stamps `data-template="<template>"` on each `.slide`; report.css /
// portfolio.css scope their token overrides to that attribute. Pick the deck's
// dominant template so the standalone `<html>` can carry it too — without it,
// the page surround (letterbox + print background) resolves var(--bg) from the
// brewnet-dark `:root` (dark) instead of the deck's actual palette.
function detectDeckTemplate(slides: ParsedSlide[]): string | null {
  const counts = new Map<string, number>();
  for (const s of slides) {
    const m = s.html.match(/\bdata-template="([^"]+)"/);
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [name, n] of counts) {
    if (n > bestN) {
      best = name;
      bestN = n;
    }
  }
  return best;
}

async function renderOverlays(overlays: Overlay[]): Promise<string> {
  if (overlays.length === 0) return '';
  const parts = await Promise.all(
    overlays.map(async (o) => {
      // Legacy persisted overlays predate the discriminator — treat as image.
      const kind = (o as Partial<Overlay>).kind ?? 'image';
      if (kind === 'image') {
        const img = o as ImageOverlay;
        const src = await blobUrlToDataUrl(img.src);
        return `<img class="export-overlay" src="${escapeAttr(src)}" alt="" style="left:${img.x}px;top:${img.y}px;width:${img.w}px;height:${img.h}px;" />`;
      }
      const t = o as TextOverlay;
      const presetClass = t.preset ? PRESET_CLASS[t.preset] : '';
      const inner = `style="text-align:${t.align ?? 'left'};${t.fontSizePx ? `font-size:${t.fontSizePx}px;` : ''}"`;
      const wrapStyle = `left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px;background:${t.bg ?? 'transparent'};`;
      const linkedHtml = linkifyHtml(t.html, document);
      return `<div class="export-overlay export-overlay-text" style="${escapeAttr(wrapStyle)}"><div class="${presetClass}" ${inner}>${linkedHtml}</div></div>`;
    }),
  );
  return parts.join('\n');
}

export async function buildHtmlBundle(input: BundleInput): Promise<string> {
  const { slides, overlaysBySlide, title = 'Presentation' } = input;

  // Carry the deck's template onto <html> so the theme tokens (--bg/--text)
  // resolve to the right palette for the page surround, mirroring how the
  // editor stamps it on each .slide.
  const template = detectDeckTemplate(slides);
  const htmlAttrs = template ? ` data-template="${escapeAttr(template)}"` : '';

  const sections = await Promise.all(
    slides.map(async (s, i) => {
      const overlayHtml = await renderOverlays(overlaysBySlide[s.id] ?? []);
      // Bake the slide-level background into the .slide style attribute so
      // the standalone bundle is self-contained — no runtime apply needed.
      // linkifyHtml runs after background application so any URLs that exist
      // in the slide body get target="_blank" + rel before shipping.
      const slideHtmlRaw = linkifyHtml(
        applyBackgroundToHtml(s.html, s.background),
        document,
      );
      // Overlays must live INSIDE .slide so a re-import (parsePresentation reads
      // div.slide outerHTML) round-trips them. The last </div> in slideHtmlRaw
      // closes .slide because slideHtmlRaw is the outerHTML of one div.slide.
      const slideHtml = overlayHtml
        ? slideHtmlRaw.replace(/<\/div>\s*$/, `${overlayHtml}\n</div>`)
        : slideHtmlRaw;
      // Mirror the editor's host element (SlideCanvas.tsx — `.slide-canvas-host`)
      // so theme rules code-blocks.css scopes under `.slide-canvas-host` (all
      // terminal chrome + code-block pre padding / line-height / mono font /
      // shiki legibility tweaks) match in the standalone bundle. Without this
      // ancestor those 18 rules silently miss and terminals lose their padding
      // and line spacing. `data-canvas-role` is intentionally omitted — it only
      // gates spike.css edit affordances, which the export does not ship.
      return `<section class="export-slide" data-index="${i}">
<div class="export-stage slide-canvas-host">
${slideHtml}
</div>
</section>`;
    }),
  );

  // All slides stack vertically — each fills the viewport (16:9, fit-scaled)
  // so scrolling reveals the full deck, mirroring the PDF page model. Keyboard
  // nav scrolls slide-by-slide. Print CSS keeps one slide per page.
  return `<!DOCTYPE html>
<html lang="ko"${htmlAttrs}>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&amp;family=JetBrains+Mono:wght@400;600&amp;display=swap" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;600;700&amp;display=swap" />
<style>
${themeCss}

/* Page surround follows the deck theme. Set the surface on \`html\` (not
   \`body\`) because brewnet-dark's editor-iframe block force-styles \`body\`
   with !important; \`html\` carries data-template so var(--bg)/var(--text)
   resolve to the deck's palette — cream for report, dark for brewnet. */
html { background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
html, body { width: 100%; margin: 0; }
body { background: transparent; font-family: 'Inter', 'Noto Sans KR', system-ui, sans-serif; overflow-y: auto; overflow-x: hidden; scroll-snap-type: y mandatory; }
.export-slide { height: 100vh; display: flex; align-items: center; justify-content: center; scroll-snap-align: start; border-bottom: 1px solid rgba(30,41,59,0.6); }
.export-slide:last-child { border-bottom: 0; }
.export-stage { position: relative; width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; transform-origin: center center; }
/* Overlays must paint above every in-slide layer, including .slide-logo (z-index: 10) */
.export-overlay { position: absolute; user-select: none; pointer-events: none; opacity: 1 !important; z-index: 100; }
.export-nav {
  position: fixed; right: 20px; bottom: 16px; z-index: 1000;
  font: 500 12px/1 'JetBrains Mono', ui-monospace, monospace; color: #94a3b8;
  background: rgba(15,23,42,0.8); padding: 8px 12px;
  border: 1px solid #1e293b; border-radius: 6px; user-select: none;
}
@media print {
  @page { size: 1920px 1080px; margin: 0; }
  html, body { overflow: visible !important; background: var(--bg) !important; scroll-snap-type: none !important; }
  .export-slide { position: relative !important; width: 1920px !important; height: 1080px !important; page-break-after: always; break-after: page; display: flex !important; border: 0 !important; }
  .export-slide:last-child { page-break-after: auto; break-after: auto; }
  .export-stage { transform: scale(1.5) !important; }
  .export-nav { display: none !important; }
}
</style>
</head>
<body>
${sections.join('\n')}
<div class="export-nav" id="export-nav">1 / ${slides.length} · ↑ ↓ · P = Print</div>
<script>
(function(){
  var slides = Array.prototype.slice.call(document.querySelectorAll('.export-slide'));
  var nav = document.getElementById('export-nav');
  function fitAll() {
    var w = window.innerWidth, h = window.innerHeight;
    var s = Math.min(w / ${SLIDE_WIDTH}, h / ${SLIDE_HEIGHT}) * 0.96;
    slides.forEach(function(sec){
      var stage = sec.querySelector('.export-stage');
      if (stage) stage.style.transform = 'scale(' + s + ')';
    });
  }
  function currentIndex() {
    var mid = window.innerHeight / 2;
    for (var i = 0; i < slides.length; i++) {
      var r = slides[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) return i;
    }
    return 0;
  }
  function updateNav() {
    nav.textContent = (currentIndex() + 1) + ' / ' + slides.length + ' · \\u2191 \\u2193 · P = Print';
  }
  function goTo(n) {
    if (n < 0) n = 0;
    if (n > slides.length - 1) n = slides.length - 1;
    slides[n].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.addEventListener('resize', fitAll);
  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('keydown', function(e){
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goTo(currentIndex() + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(currentIndex() - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(slides.length - 1); }
    else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); window.print(); }
  });
  fitAll();
  updateNav();
  if (window.location.hash === '#print') {
    // Give fonts/layout a tick to settle before invoking the print dialog.
    setTimeout(function(){ window.print(); }, 300);
  }
})();
</script>
</body>
</html>`;
}

export function openPrintablePreview(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(`${url}#print`, '_blank');
  if (!w) {
    // Popup blocked — fall back to same-tab navigation so users still see
    // the printable view, even if they must trigger print manually there.
    window.location.href = `${url}#print`;
  }
  // Blob URL lifetime tied to the opening document; release after a while.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadBlob(content: string, filename: string, mime = 'text/html;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function defaultExportName(title?: string): string {
  const base = (title && title.trim()) || 'presentation';
  const safe = base.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'presentation';
  return `${safe}-${timestamp()}.html`;
}
