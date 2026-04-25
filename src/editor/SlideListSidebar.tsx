import { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import { useDeckStore } from '../scene/store';
import { SlideThumbnail } from './SlideThumbnail';

type Props = {
  arrowKeysEnabled?: boolean;
};

const BASE_THUMB_WIDTH = 196;
// Grip (20) + row gap (4) + button padding (12) + list padding (16) ≈ 52
const SIDEBAR_CHROME = 52;
const THUMB_ZOOM_MIN = 50;
const THUMB_ZOOM_MAX = 200;
const THUMB_ZOOM_STEP = 10;

const clampThumbZoom = (v: number) =>
  Math.max(THUMB_ZOOM_MIN, Math.min(THUMB_ZOOM_MAX, Math.round(v)));

export function SlideListSidebar({ arrowKeysEnabled = true }: Props = {}) {
  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const setCurrentIndex = useDeckStore((s) => s.setCurrentIndex);
  const reorderSlide = useDeckStore((s) => s.reorderSlide);
  const listRef = useRef<HTMLDivElement>(null);
  const [thumbZoom, setThumbZoom] = useState(100);
  const [zoomDraft, setZoomDraft] = useState<string | null>(null);

  const thumbWidth = Math.round((BASE_THUMB_WIDTH * thumbZoom) / 100);
  const sidebarWidth = thumbWidth + SIDEBAR_CHROME;

  // Global ArrowUp/ArrowDown navigation through the slide list. Skips when
  // a text input or contenteditable is focused so typing isn't hijacked,
  // and when modifier keys are held (those belong to other shortcuts).
  useEffect(() => {
    if (!arrowKeysEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const ae = document.activeElement;
      if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement || ae instanceof HTMLSelectElement) return;
      if (ae instanceof HTMLElement && ae.isContentEditable) return;
      const { slides: cur, currentIndex: i, setCurrentIndex: set } = useDeckStore.getState();
      if (cur.length === 0) return;
      e.preventDefault();
      if (e.key === 'ArrowUp') set(Math.max(0, i - 1));
      else set(Math.min(cur.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [arrowKeysEnabled]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const sortable = Sortable.create(el, {
      animation: 150,
      handle: '.slide-row-grip',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: (e) => {
        const { oldIndex, newIndex, item, from } = e;
        if (oldIndex === undefined || newIndex === undefined) return;
        if (oldIndex === newIndex) return;
        // Revert SortableJS's DOM mutation so React's keyed reconciliation
        // can apply the new order without fiber/DOM mismatches.
        item.remove();
        const children = from.children;
        if (oldIndex >= children.length) from.appendChild(item);
        else from.insertBefore(item, children[oldIndex]);
        reorderSlide(oldIndex, newIndex);
      },
    });
    return () => sortable.destroy();
  }, [reorderSlide]);

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-editor-border bg-editor-panel"
      style={{ width: sidebarWidth }}
    >
      <div
        className="flex items-center justify-between gap-1 border-b border-editor-border px-2 py-1.5 text-[10px] text-editor-text"
        title="썸네일 미리보기 크기"
      >
        <span className="font-semibold uppercase tracking-wider text-editor-dim">
          Slides ({slides.length})
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setThumbZoom((p) => clampThumbZoom(p - THUMB_ZOOM_STEP))}
            disabled={thumbZoom <= THUMB_ZOOM_MIN}
            className="rounded px-1 py-0.5 text-editor-dim transition hover:bg-editor-bg hover:text-editor-text disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="썸네일 축소"
          >
            −
          </button>
          <input
            type="number"
            min={THUMB_ZOOM_MIN}
            max={THUMB_ZOOM_MAX}
            step={THUMB_ZOOM_STEP}
            value={zoomDraft ?? thumbZoom}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const raw = e.target.value;
              setZoomDraft(raw);
              const n = Number(raw);
              if (raw !== '' && Number.isFinite(n)) setThumbZoom(clampThumbZoom(n));
            }}
            onBlur={() => setZoomDraft(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-8 bg-transparent text-center font-mono outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-editor-dim">%</span>
          <button
            type="button"
            onClick={() => setThumbZoom((p) => clampThumbZoom(p + THUMB_ZOOM_STEP))}
            disabled={thumbZoom >= THUMB_ZOOM_MAX}
            className="rounded px-1 py-0.5 text-editor-dim transition hover:bg-editor-bg hover:text-editor-text disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="썸네일 확대"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setThumbZoom(100)}
            disabled={thumbZoom === 100}
            className="ml-0.5 rounded px-1 py-0.5 text-editor-dim transition hover:bg-editor-bg hover:text-editor-text disabled:opacity-40 disabled:hover:bg-transparent"
            title="100%"
            aria-label="100%로 초기화"
          >
            ↺
          </button>
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-2">
        {slides.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-editor-dim">Loading…</p>
        ) : (
          slides.map((slide, idx) => {
            const active = idx === currentIndex;
            const num = String(idx + 1).padStart(2, '0');
            return (
              <div
                key={slide.id}
                className={`mb-2 flex w-full items-stretch gap-1 rounded border transition ${
                  active
                    ? 'border-editor-accent/50 bg-editor-accent/10'
                    : 'border-transparent hover:border-editor-border hover:bg-editor-panel/60'
                }`}
              >
                <span
                  className="slide-row-grip flex w-5 shrink-0 cursor-grab select-none items-center justify-center text-[11px] leading-none text-editor-dim hover:text-editor-text active:cursor-grabbing"
                  title="드래그하여 순서 변경"
                  aria-label="Drag to reorder slide"
                >
                  ⋮⋮
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    setCurrentIndex(idx);
                    // Drop DOM focus so the browser's :focus ring doesn't
                    // linger on the previously-clicked row when subsequent
                    // ArrowUp/ArrowDown navigation moves only store state.
                    e.currentTarget.blur();
                  }}
                  className={`flex flex-1 flex-col gap-1.5 rounded p-1.5 text-left transition focus:outline-none focus-visible:ring-1 focus-visible:ring-editor-accent ${
                    active ? 'text-editor-text' : 'text-editor-dim hover:text-editor-text'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-editor-accent">{num}</span>
                    <span className="truncate text-[11px]">{slide.title}</span>
                  </div>
                  <SlideThumbnail slideId={slide.id} width={thumbWidth} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
