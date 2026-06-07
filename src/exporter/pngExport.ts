import { toPng } from 'html-to-image';
import type { ImageOverlay, Overlay, TextOverlay } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';
import { applyBackgroundToElement } from '../scene/applySlideBackground';
import { SLIDE_HEIGHT, SLIDE_WIDTH, TARGET_WIDTH } from '../scene/constants';

const EXPORT_SCALE = TARGET_WIDTH / SLIDE_WIDTH;
const BETWEEN_DOWNLOADS_MS = 250;

const PRESET_CLASS: Record<NonNullable<TextOverlay['preset']>, string> = {
  h1: 't-title',
  h2: 't-h2',
  h3: 't-h3',
  p: 't-body',
};

export type PngExportDeck = {
  slides: ParsedSlide[];
  overlaysBySlide: Record<string, Overlay[]>;
};

// Export ONLY the currently selected slide as a clean 1920×1080 PNG. Renders
// through the offscreen clean host (same path as exportAllSlidesPng) so no
// editor chrome — selection outlines, drag handles, carets — can leak into the
// image. `index` is the deck position (used for the filename prefix).
export async function exportSelectedSlidePng(
  deck: PngExportDeck,
  index: number,
): Promise<void> {
  const slide = deck.slides[index];
  if (!slide) throw new Error(`no slide at index ${index}`);
  if (document.fonts?.ready) await document.fonts.ready;
  const overlays = deck.overlaysBySlide[slide.id] ?? [];
  await rasterizeSlideToPng(slide, overlays, index);
}

// Render every slide off-screen at 1280×720 and emit one PNG per slide.
// The offscreen host carries `.slide-canvas-host` so the theme CSS applies
// identically, and overlays are inlined with z-index:100 — the same fix that
// keeps them above `.slide-logo` etc. in the HTML bundle.
export async function exportAllSlidesPng(deck: PngExportDeck): Promise<void> {
  if (document.fonts?.ready) await document.fonts.ready;

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    const overlays = deck.overlaysBySlide[slide.id] ?? [];
    await rasterizeSlideToPng(slide, overlays, i);
    // Give the browser breathing room between sequential downloads —
    // Chrome otherwise silently drops all but the first without a prompt.
    if (i < deck.slides.length - 1) {
      await sleep(BETWEEN_DOWNLOADS_MS);
    }
  }
}

// Render one slide to a clean 1920×1080 PNG via an offscreen host and download
// it. Shared by the single-slide and all-slides export paths.
async function rasterizeSlideToPng(
  slide: ParsedSlide,
  overlays: Overlay[],
  index: number,
): Promise<void> {
  const host = buildOffscreenHost(slide, overlays);
  document.body.appendChild(host);
  try {
    await waitForImages(host);
    const dataUrl = await renderHostToPng(host);
    await downloadDataUrl(dataUrl, pngFilename(index + 1, slide.title));
  } finally {
    host.remove();
  }
}

async function renderHostToPng(host: HTMLElement): Promise<string> {
  const options = {
    // html-to-image sizes the canvas as (canvasWidth || width) * pixelRatio.
    // Rendering the 1280×720 host at pixelRatio 1.5 yields exactly 1920×1080
    // (1080p). Do NOT also pass canvasWidth/Height — that double-scales to
    // 2880×1620.
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    pixelRatio: EXPORT_SCALE,
    // No `cacheBust`: it appends `?cacheblock=…` to image URLs, which corrupts
    // blob: object URLs (drag-dropped image overlays) — the clone's <img> then
    // fails to load and the whole export rejects with an img error. Our images
    // are blob:/data:/same-origin, so cache-busting buys nothing here.
    //
    // The host is `position:fixed; top:-10000px` so users don't see a flash.
    // html-to-image clones it into an SVG <foreignObject> and would inherit that
    // offset, pushing content above the viewBox → blank PNG. Override the clone's
    // positioning to render at the origin.
    style: {
      position: 'static',
      top: 'auto',
      left: 'auto',
      transform: 'none',
    },
  };
  try {
    return await toPng(host, options);
  } catch {
    // html-to-image occasionally rejects on the first pass before a cloned
    // image/font has decoded; a single retry almost always succeeds.
    await sleep(150);
    return await toPng(host, options);
  }
}

function buildOffscreenHost(slide: ParsedSlide, overlays: Overlay[]): HTMLElement {
  const host = document.createElement('div');
  host.className = 'slide-canvas-host';
  host.style.cssText = [
    'position:fixed',
    'top:-10000px',
    'left:0',
    `width:${SLIDE_WIDTH}px`,
    `height:${SLIDE_HEIGHT}px`,
    'transform:none',
    'pointer-events:none',
  ].join(';');
  host.innerHTML = slide.html;

  // The persisted html is canonical — bg is owned by ParsedSlide.background.
  // Apply it now so the rasterized PNG matches what the user sees in-editor.
  if (slide.background) {
    const slideEl = host.querySelector<HTMLElement>('div.slide');
    if (slideEl) applyBackgroundToElement(slideEl, slide.background);
  }

  overlays.forEach((o) => {
    // Legacy persisted overlays predate the discriminator — treat as image.
    const kind = (o as Partial<Overlay>).kind ?? 'image';
    if (kind === 'image') {
      const img = o as ImageOverlay;
      const el = document.createElement('img');
      el.src = img.src;
      el.alt = '';
      el.style.cssText = [
        'position:absolute',
        `left:${img.x}px`,
        `top:${img.y}px`,
        `width:${img.w}px`,
        `height:${img.h}px`,
        'z-index:100',
        'user-select:none',
        'pointer-events:none',
        'opacity:1',
      ].join(';');
      host.appendChild(el);
      return;
    }
    const t = o as TextOverlay;
    const wrap = document.createElement('div');
    wrap.style.cssText = [
      'position:absolute',
      `left:${t.x}px`,
      `top:${t.y}px`,
      `width:${t.w}px`,
      `height:${t.h}px`,
      `background:${t.bg ?? 'transparent'}`,
      'z-index:100',
      'pointer-events:none',
    ].join(';');
    const inner = document.createElement('div');
    if (t.preset) inner.className = PRESET_CLASS[t.preset];
    inner.style.cssText = [
      `text-align:${t.align ?? 'left'}`,
      t.fontSizePx ? `font-size:${t.fontSizePx}px` : '',
    ]
      .filter(Boolean)
      .join(';');
    inner.innerHTML = t.html;
    wrap.appendChild(inner);
    host.appendChild(wrap);
  });

  return host;
}

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  return Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
    ),
  ).then(() => undefined);
}

async function downloadDataUrl(dataUrl: string, filename: string): Promise<void> {
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pngFilename(index: number, title?: string): string {
  const base = (title && title.trim()) || 'slide';
  const safe = base.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'slide';
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${p(index)}-${safe}-${stamp}.png`;
}
