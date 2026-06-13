import { useCallback, useEffect, useRef, useState } from 'react';

// Ephemeral on-screen annotation layer for presentation mode only.
//
// Lives entirely in local state — nothing is written to the deck store, the
// overlay model, or any persisted slide HTML. Everything here vanishes the
// moment PresentationView unmounts, so the editor and exported artifacts are
// never affected.
//
// Three behaviours:
//   1. Red laser pointer that follows the cursor, 3 size steps. Always on
//      (even when the toolbar is collapsed).
//   2. Drag to draw a red rectangle on top of the slide.
//   3. Each drawn box auto-fades ~2s after it is drawn, then removes itself.
//
// Coordinates are raw viewport pixels (clientX/clientY) — annotations are
// throwaway, so there's no need to normalise into 1280x720 slide space.

const RED = '#dc2626';
const POINTER_SIZES = [14, 22, 34] as const; // small / medium / large (diameter px)
const BOX_LIFETIME_MS = 2000; // auto: a box waits 2s after being drawn, then fades
const ERASE_DELAY_MS = 1000; // manual "지우기": wait 1s, then fade all boxes out
const FADE_MS = 400; // opacity transition once a fade begins (shared by both paths)
const CLICK_THRESHOLD_PX = 4; // drag shorter than this = click, not a box

type Box = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fading: boolean;
};

type Point = { x: number; y: number };

export function PresentationAnnotator() {
  const [pointerSize, setPointerSize] = useState<0 | 1 | 2>(1);
  const [collapsed, setCollapsed] = useState(false);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragNow, setDragNow] = useState<Point | null>(null);

  const idRef = useRef(0);
  const timersRef = useRef<Set<number>>(new Set());

  const track = useCallback((id: number) => {
    timersRef.current.add(id);
  }, []);

  // Clear every pending fade/removal timer on unmount so we never call
  // setState after the presentation view is gone.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

  // Laser pointer follows the cursor globally. pointer-events:none on the dot
  // layer means this listener is the only thing tracking position; it never
  // blocks clicks to the slide, nav arrows, or the exit button.
  useEffect(() => {
    const onMove = (e: MouseEvent) => setPointer({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const commitBox = useCallback(
    (start: Point, end: Point) => {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (w < CLICK_THRESHOLD_PX && h < CLICK_THRESHOLD_PX) return; // a click, not a drag

      const id = idRef.current++;
      setBoxes((prev) => [...prev, { id, x, y, w, h, fading: false }]);

      // After the lifetime, flip to fading (opacity transition kicks in)…
      const fadeTimer = window.setTimeout(() => {
        setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, fading: true } : b)));
      }, BOX_LIFETIME_MS);
      track(fadeTimer);

      // …then remove from the DOM once the fade has finished.
      const removeTimer = window.setTimeout(() => {
        setBoxes((prev) => prev.filter((b) => b.id !== id));
      }, BOX_LIFETIME_MS + FADE_MS);
      track(removeTimer);
    },
    [track],
  );

  // Manual "지우기": wait 1s, then fade every currently-drawn box out together.
  const eraseAll = useCallback(() => {
    const fadeTimer = window.setTimeout(() => {
      setBoxes((prev) => prev.map((b) => ({ ...b, fading: true })));
    }, ERASE_DELAY_MS);
    track(fadeTimer);
    const removeTimer = window.setTimeout(() => setBoxes([]), ERASE_DELAY_MS + FADE_MS);
    track(removeTimer);
  }, [track]);

  const onSurfaceDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const p = { x: e.clientX, y: e.clientY };
    setDragStart(p);
    setDragNow(p);
  }, []);

  const onSurfaceMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragStart) return;
      setDragNow({ x: e.clientX, y: e.clientY });
    },
    [dragStart],
  );

  const endDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!dragStart) return;
      commitBox(dragStart, { x: e.clientX, y: e.clientY });
      setDragStart(null);
      setDragNow(null);
    },
    [dragStart, commitBox],
  );

  const dotSize = POINTER_SIZES[pointerSize];

  // Live preview rectangle while dragging.
  const preview =
    dragStart && dragNow
      ? {
          x: Math.min(dragStart.x, dragNow.x),
          y: Math.min(dragStart.y, dragNow.y),
          w: Math.abs(dragNow.x - dragStart.x),
          h: Math.abs(dragNow.y - dragStart.y),
        }
      : null;

  return (
    <>
      {/* Box drawing surface — only present when the toolbar is expanded, so a
          collapsed toolbar fully restores the slide's native click behaviour. */}
      {!collapsed ? (
        <div
          data-testid="annotator-surface"
          onMouseDown={onSurfaceDown}
          onMouseMove={onSurfaceMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2100,
            cursor: 'crosshair',
            // transparent — purely an event-capture surface
          }}
        />
      ) : null}

      {/* Committed boxes (with their own fade) + the live drag preview. */}
      {boxes.map((b) => (
        <div
          key={b.id}
          data-testid="annotator-box"
          style={{
            position: 'fixed',
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h,
            border: `2px solid ${RED}`,
            borderRadius: 2,
            background: 'rgba(220,38,38,0.06)',
            zIndex: 2120,
            pointerEvents: 'none',
            opacity: b.fading ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease`,
          }}
        />
      ))}
      {preview ? (
        <div
          style={{
            position: 'fixed',
            left: preview.x,
            top: preview.y,
            width: preview.w,
            height: preview.h,
            border: `2px solid ${RED}`,
            borderRadius: 2,
            background: 'rgba(220,38,38,0.06)',
            zIndex: 2120,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* Laser dot — always on, never blocks input. */}
      {pointer ? (
        <div
          data-testid="annotator-dot"
          style={{
            position: 'fixed',
            left: pointer.x - dotSize / 2,
            top: pointer.y - dotSize / 2,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: RED,
            opacity: 0.85,
            zIndex: 2300,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* Toolbar (expanded) / chip (collapsed) — top-right. */}
      {collapsed ? (
        <button
          type="button"
          data-testid="annotator-chip"
          onClick={() => setCollapsed(false)}
          title="주석 도구 열기"
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 2400 }}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 hover:bg-white/10"
        >
          <span style={{ display: 'block', width: 12, height: 12, borderRadius: '50%', background: RED }} />
        </button>
      ) : (
        <div
          data-testid="annotator-toolbar"
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 2400 }}
          className="flex items-center gap-1 rounded border border-white/20 bg-black/60 px-2 py-1"
        >
          {POINTER_SIZES.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setPointerSize(i as 0 | 1 | 2)}
              title={`포인터 크기 ${['소', '중', '대'][i]}`}
              aria-pressed={pointerSize === i}
              className={`flex h-7 w-7 items-center justify-center rounded border ${
                pointerSize === i ? 'border-white/70 bg-white/15' : 'border-transparent hover:bg-white/10'
              }`}
            >
              <span
                style={{
                  display: 'block',
                  width: 6 + i * 5,
                  height: 6 + i * 5,
                  borderRadius: '50%',
                  background: RED,
                }}
              />
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />
          <button
            type="button"
            data-testid="annotator-erase"
            onClick={eraseAll}
            disabled={boxes.length === 0}
            title="그린 박스 모두 지우기 (1초 뒤 페이드)"
            className="flex h-7 items-center justify-center rounded px-2 text-xs text-white/80 hover:bg-white/10 disabled:cursor-default disabled:text-white/30 disabled:hover:bg-transparent"
          >
            지우기
          </button>
          <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="주석 도구 접기"
            className="flex h-7 w-7 items-center justify-center rounded text-xs text-white/80 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
