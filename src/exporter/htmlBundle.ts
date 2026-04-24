import themeCss from '../canvas/themes/brewnet-dark.css?raw';
import type { OverlayImage } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';

export type BundleInput = {
  slides: ParsedSlide[];
  overlaysBySlide: Record<string, OverlayImage[]>;
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

async function renderOverlays(overlays: OverlayImage[]): Promise<string> {
  if (overlays.length === 0) return '';
  const parts = await Promise.all(
    overlays.map(async (o) => {
      const src = await blobUrlToDataUrl(o.src);
      return `<img class="export-overlay" src="${escapeAttr(src)}" alt="" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;" />`;
    }),
  );
  return parts.join('\n');
}

export async function buildHtmlBundle(input: BundleInput): Promise<string> {
  const { slides, overlaysBySlide, title = 'Presentation' } = input;

  const sections = await Promise.all(
    slides.map(async (s, i) => {
      const overlayHtml = await renderOverlays(overlaysBySlide[s.id] ?? []);
      return `<section class="export-slide" data-index="${i}"${i === 0 ? '' : ' hidden'}>
<div class="export-stage">
${s.html}
${overlayHtml}
</div>
</section>`;
    }),
  );

  // Inline the editor's canvas CSS but not editing-only affordances
  // (drag handles, outlines). The theme CSS alone already renders the slide
  // exactly as authored.
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&amp;family=JetBrains+Mono:wght@400;600&amp;display=swap" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;600;700&amp;display=swap" />
<style>
${themeCss}

html, body { width: 100%; height: 100%; margin: 0; background: #020617; color: #f1f5f9; overflow: hidden; }
body { font-family: 'Inter', 'Noto Sans KR', system-ui, sans-serif; }
.export-slide { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
.export-slide[hidden] { display: none !important; }
.export-stage { position: relative; width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; transform-origin: center center; }
.export-overlay { position: absolute; user-select: none; pointer-events: none; }
.export-nav {
  position: fixed; right: 20px; bottom: 16px; z-index: 1000;
  font: 500 12px/1 'JetBrains Mono', ui-monospace, monospace; color: #94a3b8;
  background: rgba(15,23,42,0.8); padding: 8px 12px;
  border: 1px solid #1e293b; border-radius: 6px; user-select: none;
}
@media print {
  @page { size: 1920px 1080px; margin: 0; }
  html, body { overflow: visible !important; background: var(--bg) !important; }
  .export-slide { position: relative !important; width: 1920px !important; height: 1080px !important; page-break-after: always; break-after: page; display: flex !important; }
  .export-slide:last-child { page-break-after: auto; break-after: auto; }
  .export-slide[hidden] { display: flex !important; }
  .export-stage { transform: scale(1.5) !important; }
  .export-nav { display: none !important; }
}
</style>
</head>
<body>
${sections.join('\n')}
<div class="export-nav" id="export-nav">1 / ${slides.length} · ← → Space · P = Print</div>
<script>
(function(){
  var slides = Array.prototype.slice.call(document.querySelectorAll('.export-slide'));
  var nav = document.getElementById('export-nav');
  var idx = 0;
  function fit() {
    var stage = slides[idx] && slides[idx].querySelector('.export-stage');
    if (!stage) return;
    var w = window.innerWidth, h = window.innerHeight;
    var s = Math.min(w / ${SLIDE_WIDTH}, h / ${SLIDE_HEIGHT}) * 0.96;
    stage.style.transform = 'scale(' + s + ')';
  }
  function show(n) {
    if (n < 0) n = 0;
    if (n > slides.length - 1) n = slides.length - 1;
    slides[idx].hidden = true;
    idx = n;
    slides[idx].hidden = false;
    nav.textContent = (idx + 1) + ' / ' + slides.length + ' · \\u2190 \\u2192 Space · P = Print';
    fit();
  }
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); show(idx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1); }
    else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); window.print(); }
  });
  document.addEventListener('click', function(e){
    if (e.target && e.target.closest && e.target.closest('a')) return;
    show(idx + 1);
  });
  fit();
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
