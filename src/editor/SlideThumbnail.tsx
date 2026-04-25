import { useDeckStore } from '../scene/store';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import type { ImageOverlay, Overlay, TextOverlay } from '../canvas/OverlayLayer';

const PRESET_CLASS: Record<NonNullable<TextOverlay['preset']>, string> = {
  h1: 't-title',
  h2: 't-h2',
  h3: 't-h3',
  p: 't-body',
};

type Props = {
  slideId: string;
  width: number;
};

// Read-only mini-render of a slide. Mirrors SlideCanvas + OverlayLayer minus
// all interactivity: no Moveable, no contenteditable, no drag handles. The
// scaled host has pointer-events:none so the parent row button receives the
// click. Sample CSS (.slide / .t-* / etc.) is loaded via SlideRenderer's
// import side effect and applies wherever a `.slide-canvas-host` wrapper
// exists.
export function SlideThumbnail({ slideId, width }: Props) {
  const slide = useDeckStore((s) => s.slides.find((sl) => sl.id === slideId));
  const overlays = useDeckStore((s) => s.overlaysBySlide[slideId] ?? []);

  const scale = width / SLIDE_WIDTH;
  const height = SLIDE_HEIGHT * scale;
  const html = slide?.html ?? '';

  return (
    <div
      className="relative overflow-hidden rounded border border-editor-border bg-black"
      style={{ width, height }}
    >
      <div
        className="slide-canvas-host pointer-events-none absolute left-0 top-0"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <div className="overlay-layer">
          {overlays.map((it) => {
            const kind = (it as Partial<Overlay>).kind ?? 'image';
            if (kind === 'text') {
              const t = it as TextOverlay;
              const presetClass = t.preset ? PRESET_CLASS[t.preset] : '';
              return (
                <div
                  key={t.id}
                  className="overlay-item overlay-text"
                  style={{
                    left: t.x,
                    top: t.y,
                    width: t.w,
                    height: t.h,
                    background: t.bg ?? 'transparent',
                    padding: t.padding
                      ? `${t.padding.t}px ${t.padding.r}px ${t.padding.b}px ${t.padding.l}px`
                      : undefined,
                  }}
                >
                  <div
                    className={`overlay-text-inner ${presetClass}`}
                    style={{
                      textAlign: t.align ?? 'left',
                      fontSize: t.fontSizePx ? `${t.fontSizePx}px` : undefined,
                    }}
                    dangerouslySetInnerHTML={{ __html: t.html }}
                  />
                </div>
              );
            }
            const img = it as ImageOverlay;
            return (
              <div
                key={img.id}
                className="overlay-item"
                style={{ left: img.x, top: img.y, width: img.w, height: img.h }}
              >
                <img src={img.src} alt="" draggable={false} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
