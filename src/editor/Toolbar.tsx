import { useState } from 'react';
import { buildHtmlBundle, defaultExportName, downloadBlob } from '../exporter/htmlBundle';
import { useDeckStore } from '../scene/store';

export function Toolbar() {
  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const insertBlankSlideAfter = useDeckStore((s) => s.insertBlankSlideAfter);
  const duplicateSlide = useDeckStore((s) => s.duplicateSlide);
  const removeSlide = useDeckStore((s) => s.removeSlide);

  const [exporting, setExporting] = useState(false);

  const canDelete = slides.length > 1;
  const canExport = slides.length > 0 && !exporting;

  const handleExportHtml = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const { slides: latestSlides, overlaysBySlide } = useDeckStore.getState();
      const html = await buildHtmlBundle({
        slides: latestSlides,
        overlaysBySlide,
        title: latestSlides[0]?.title ?? 'Presentation',
      });
      downloadBlob(html, defaultExportName(latestSlides[0]?.title));
    } finally {
      setExporting(false);
    }
  };

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
        <span className="mx-2 h-5 w-px bg-editor-border" aria-hidden="true" />
        <ToolbarButton
          onClick={handleExportHtml}
          disabled={!canExport}
          tone="accent"
        >
          {exporting ? 'Exporting…' : 'Export HTML'}
        </ToolbarButton>
        <span className="ml-3 text-editor-dim">1280×720 · export 1920×1080</span>
      </div>
    </header>
  );
}

type ToolbarButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger' | 'accent';
  children: React.ReactNode;
};

function ToolbarButton({ onClick, disabled, tone = 'default', children }: ToolbarButtonProps) {
  const base =
    'rounded border px-2.5 py-1 font-medium transition disabled:cursor-not-allowed disabled:opacity-40';
  const tones: Record<NonNullable<ToolbarButtonProps['tone']>, string> = {
    default: 'border-editor-border text-editor-text hover:border-editor-accent hover:text-editor-accent',
    danger: 'border-red-500/40 text-red-300 hover:border-red-500 hover:bg-red-500/10',
    accent: 'border-editor-accent/50 text-editor-accent hover:bg-editor-accent/10',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${tones[tone]}`}>
      {children}
    </button>
  );
}
