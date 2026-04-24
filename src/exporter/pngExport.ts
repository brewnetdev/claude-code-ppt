import { toPng } from 'html-to-image';
import type { OverlayImage } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';
import { SLIDE_HEIGHT, SLIDE_WIDTH, TARGET_HEIGHT, TARGET_WIDTH } from '../scene/constants';

const EXPORT_SCALE = TARGET_WIDTH / SLIDE_WIDTH;
const BETWEEN_DOWNLOADS_MS = 250;

export type PngExportDeck = {
  slides: ParsedSlide[];
  overlaysBySlide: Record<string, OverlayImage[]>;
};

// Capture the live `.slide-canvas-host` element at 1920×1080 regardless of
// the editor's current scale-to-fit transform. Used for "current slide only".
export async function exportCurrentSlidePng(slideTitle?: string): Promise<void> {
  const host = document.querySelector<HTMLElement>('.slide-canvas-host');
  if (!host) throw new Error('slide-canvas-host element not found');

  if (document.fonts?.ready) await document.fonts.ready;

  const dataUrl = await toPng(host, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    canvasWidth: TARGET_WIDTH,
    canvasHeight: TARGET_HEIGHT,
    pixelRatio: EXPORT_SCALE,
    cacheBust: true,
    style: { transform: 'none', transformOrigin: 'center center' },
  });

  await downloadDataUrl(dataUrl, pngFilename(1, slideTitle));
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
    const host = buildOffscreenHost(slide, overlays);
    document.body.appendChild(host);
    try {
      await waitForImages(host);
      const dataUrl = await toPng(host, {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        canvasWidth: TARGET_WIDTH,
        canvasHeight: TARGET_HEIGHT,
        pixelRatio: EXPORT_SCALE,
        cacheBust: true,
      });
      await downloadDataUrl(dataUrl, pngFilename(i + 1, slide.title));
    } finally {
      host.remove();
    }
    // Give the browser breathing room between sequential downloads —
    // Chrome otherwise silently drops all but the first without a prompt.
    if (i < deck.slides.length - 1) {
      await sleep(BETWEEN_DOWNLOADS_MS);
    }
  }
}

function buildOffscreenHost(slide: ParsedSlide, overlays: OverlayImage[]): HTMLElement {
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

  overlays.forEach((o) => {
    const img = document.createElement('img');
    img.src = o.src;
    img.alt = '';
    img.style.cssText = [
      'position:absolute',
      `left:${o.x}px`,
      `top:${o.y}px`,
      `width:${o.w}px`,
      `height:${o.h}px`,
      'z-index:100',
      'user-select:none',
      'pointer-events:none',
      'opacity:1',
    ].join(';');
    host.appendChild(img);
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
