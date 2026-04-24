import { toPng } from 'html-to-image';
import { SLIDE_HEIGHT, SLIDE_WIDTH, TARGET_HEIGHT, TARGET_WIDTH } from '../scene/constants';

const EXPORT_SCALE = TARGET_WIDTH / SLIDE_WIDTH;

// Capture the live `.slide-canvas-host` element at 1920×1080 regardless of
// the editor's current scale-to-fit transform. The host's CSS box stays
// 1280×720; we neutralize the fit transform on the serialized clone and let
// canvasWidth/canvasHeight + pixelRatio size the output to export target.
export async function exportCurrentSlidePng(slideTitle?: string): Promise<void> {
  const host = document.querySelector<HTMLElement>('.slide-canvas-host');
  if (!host) throw new Error('slide-canvas-host element not found');

  // Wait for any pending web-font load so the first capture doesn't render
  // with fallback glyphs (noticeable for Noto Sans KR / JetBrains Mono).
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

  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pngFilename(slideTitle);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pngFilename(title?: string): string {
  const base = (title && title.trim()) || 'slide';
  const safe = base.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'slide';
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${safe}-${stamp}.png`;
}
