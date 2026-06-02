// Shared brand-watermark spec. The watermark originated as hand-authored
// `<span class="cc-watermark">` elements inside the presentation deck
// (docs/html/presentation/claude-code-how-to.html). This module is the single
// source of truth for its look so the editor toggle (deck + document modes)
// and the `watermark` skill all stay in sync.
//
// Tweaked per request: one step darker (alpha 0.16 → 0.24) and +4px
// (40 → 44px) so it reads clearly without dominating the content.

export const WATERMARK_CLASS = 'cc-watermark';
export const WATERMARK_LAYER_CLASS = 'cc-watermark-layer';

export const WATERMARK_DEFAULT_LINES = ['https://run-ai.kr', 'brewnet.dev@gmail.com'];

const COLOR = 'rgba(148,163,184,0.24)';
const FONT_SIZE = 44;
// Vertical anchors (percent) for the two canonical lines; extra lines step
// further down so 3+ lines don't overlap.
const TOPS = [40, 66];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function spanStyle(topPercent: number): string {
  return (
    `position:absolute; left:50%; top:${topPercent}%; ` +
    `transform:translate(calc(-50% + 200px),-50%) rotate(-26deg); white-space:nowrap; ` +
    `font-family:'JetBrains Mono',monospace; font-size:${FONT_SIZE}px; letter-spacing:0.10em; ` +
    `color:${COLOR}; pointer-events:none; user-select:none; z-index:5;`
  );
}

function topFor(index: number): number {
  return TOPS[index % TOPS.length] + Math.floor(index / TOPS.length) * 26;
}

// Watermark spans for a positioned container (a 1280×720 `.slide` div). Returns
// raw HTML string for injection into slide markup.
export function watermarkSpansHtml(lines: string[]): string {
  return lines
    .map(
      (line, i) =>
        `<span class="${WATERMARK_CLASS}" aria-hidden="true" style="${spanStyle(topFor(i))}">${escapeHtml(
          line,
        )}</span>`,
    )
    .join('\n');
}

// ── Deck (slide) helpers ─────────────────────────────────────────────────────

export function slideHasWatermark(slideHtml: string): boolean {
  return slideHtml.includes(WATERMARK_CLASS);
}

// Extract the current watermark lines from a slide's html (for seeding the UI).
export function extractWatermarkLines(slideHtml: string): string[] {
  if (typeof DOMParser === 'undefined') return WATERMARK_DEFAULT_LINES;
  const doc = new DOMParser().parseFromString(slideHtml, 'text/html');
  const spans = doc.querySelectorAll(`.${WATERMARK_CLASS}`);
  const lines = Array.from(spans).map((s) => (s.textContent ?? '').trim()).filter(Boolean);
  return lines.length ? lines : WATERMARK_DEFAULT_LINES;
}

// Add / replace / remove watermark spans inside a single `.slide` and return the
// updated outerHTML. Idempotent: always strips existing cc-watermark first.
export function setSlideWatermark(slideHtml: string, enabled: boolean, lines: string[]): string {
  if (typeof DOMParser === 'undefined') return slideHtml;
  const doc = new DOMParser().parseFromString(slideHtml, 'text/html');
  const slide = doc.querySelector('div.slide');
  if (!slide) return slideHtml;
  slide.querySelectorAll(`.${WATERMARK_CLASS}`).forEach((el) => el.remove());
  if (enabled) {
    const cleaned = lines.map((l) => l.trim()).filter(Boolean);
    const tmp = doc.createElement('div');
    tmp.innerHTML = watermarkSpansHtml(cleaned.length ? cleaned : WATERMARK_DEFAULT_LINES);
    Array.from(tmp.children).forEach((c) => slide.appendChild(c));
  }
  return slide.outerHTML;
}

// Full-viewport fixed layer for a scrolling document. Stays in view while
// scrolling (position:fixed) and never intercepts edits (pointer-events:none,
// contenteditable=false). Returns the layer's outer HTML.
export function watermarkLayerHtml(lines: string[]): string {
  const spans = lines
    .map(
      (line, i) =>
        `<span class="${WATERMARK_CLASS}" aria-hidden="true" style="${spanStyle(topFor(i))}">${escapeHtml(
          line,
        )}</span>`,
    )
    .join('');
  return (
    `<div class="${WATERMARK_LAYER_CLASS}" contenteditable="false" aria-hidden="true" ` +
    `style="position:fixed; inset:0; pointer-events:none; z-index:9999;">${spans}</div>`
  );
}
