import { useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import { useDeckStore } from '../scene/store';

type Props = {
  arrowKeysEnabled?: boolean;
};

export function SlideListSidebar({ arrowKeysEnabled = true }: Props = {}) {
  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const setCurrentIndex = useDeckStore((s) => s.setCurrentIndex);
  const reorderSlide = useDeckStore((s) => s.reorderSlide);
  const listRef = useRef<HTMLDivElement>(null);

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
    <aside className="flex h-full w-56 flex-col border-r border-editor-border bg-editor-panel">
      <div className="border-b border-editor-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-editor-dim">
        Slides ({slides.length})
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
                className={`mb-1 flex w-full items-stretch gap-1 rounded border transition ${
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
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex flex-1 items-center gap-2 rounded px-1.5 py-2 text-left text-xs transition ${
                    active ? 'text-editor-text' : 'text-editor-dim hover:text-editor-text'
                  }`}
                >
                  <span className="font-mono text-[10px] text-editor-accent">{num}</span>
                  <span className="truncate">{slide.title}</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
