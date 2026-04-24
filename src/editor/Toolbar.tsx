import { useDeckStore } from '../scene/store';

export function Toolbar() {
  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const insertBlankSlideAfter = useDeckStore((s) => s.insertBlankSlideAfter);
  const duplicateSlide = useDeckStore((s) => s.duplicateSlide);
  const removeSlide = useDeckStore((s) => s.removeSlide);

  const canDelete = slides.length > 1;

  return (
    <header className="flex h-12 items-center justify-between border-b border-editor-border bg-editor-panel px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-wide text-editor-accent">
          claude-code-ppt
        </span>
        <span className="text-xs text-editor-dim">
          {slides.length > 0
            ? `Slide ${currentIndex + 1} / ${slides.length}`
            : 'Loading…'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <ToolbarButton onClick={() => insertBlankSlideAfter(currentIndex)}>
          + New
        </ToolbarButton>
        <ToolbarButton onClick={() => duplicateSlide(currentIndex)}>
          Duplicate
        </ToolbarButton>
        <ToolbarButton
          onClick={() => canDelete && removeSlide(currentIndex)}
          disabled={!canDelete}
          tone="danger"
        >
          Delete
        </ToolbarButton>
        <span className="ml-3 text-editor-dim">1280×720 · export 1920×1080</span>
      </div>
    </header>
  );
}

type ToolbarButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
};

function ToolbarButton({ onClick, disabled, tone = 'default', children }: ToolbarButtonProps) {
  const base =
    'rounded border px-2.5 py-1 font-medium transition disabled:cursor-not-allowed disabled:opacity-40';
  const tones =
    tone === 'danger'
      ? 'border-red-500/40 text-red-300 hover:border-red-500 hover:bg-red-500/10'
      : 'border-editor-border text-editor-text hover:border-editor-accent hover:text-editor-accent';
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${tones}`}>
      {children}
    </button>
  );
}
