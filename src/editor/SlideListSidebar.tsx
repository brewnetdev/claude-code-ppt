import { useDeckStore } from '../scene/store';

export function SlideListSidebar() {
  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const setCurrentIndex = useDeckStore((s) => s.setCurrentIndex);

  return (
    <aside className="flex h-full w-56 flex-col border-r border-editor-border bg-editor-panel">
      <div className="border-b border-editor-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-editor-dim">
        Slides ({slides.length})
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {slides.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-editor-dim">Loading…</p>
        ) : (
          slides.map((slide, idx) => {
            const active = idx === currentIndex;
            const num = String(idx + 1).padStart(2, '0');
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`mb-1 flex w-full items-center gap-2 rounded border px-2 py-2 text-left text-xs transition ${
                  active
                    ? 'border-editor-accent/50 bg-editor-accent/10 text-editor-text'
                    : 'border-transparent text-editor-dim hover:border-editor-border hover:bg-editor-panel/60 hover:text-editor-text'
                }`}
              >
                <span className="font-mono text-[10px] text-editor-accent">{num}</span>
                <span className="truncate">{slide.title}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
