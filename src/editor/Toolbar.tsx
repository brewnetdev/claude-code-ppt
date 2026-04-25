import { useEffect, useState } from 'react';
import presentationHtml from '../../docs/html/presentation/brewnet-presentation.html?raw';
import {
  buildHtmlBundle,
  defaultExportName,
  downloadBlob,
  openPrintablePreview,
} from '../exporter/htmlBundle';
import { exportAllSlidesPng } from '../exporter/pngExport';
import { parsePresentationHTML } from '../importer/parsePresentation';
import { clearDeckFromLocalStorage } from '../persistence/localStore';
import { usePersistenceStore } from '../persistence/persistenceStore';
import { flushPendingCommit } from '../scene/pendingCommit';
import { useDeckStore } from '../scene/store';

type Busy = null | 'html' | 'pdf' | 'png';

export function Toolbar() {
  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const insertBlankSlideAfter = useDeckStore((s) => s.insertBlankSlideAfter);
  const duplicateSlide = useDeckStore((s) => s.duplicateSlide);
  const removeSlide = useDeckStore((s) => s.removeSlide);
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const undo = useDeckStore((s) => s.undo);
  const redo = useDeckStore((s) => s.redo);
  const pastLen = useDeckStore((s) => s.past.length);
  const futureLen = useDeckStore((s) => s.future.length);

  const [busy, setBusy] = useState<Busy>(null);

  const canDelete = slides.length > 1;
  const canExport = slides.length > 0 && busy === null;
  const canUndo = pastLen > 0;
  const canRedo = futureLen > 0;

  // Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z → store undo. Cmd/Ctrl+Y → redo.
  // We intentionally hijack plain Cmd/Ctrl+Z (the OS-conventional shortcut)
  // because the browser's native contenteditable undo only tracks `input`
  // events — it can't see Sortable reorders or Moveable drag/resize, so
  // those would silently never undo if we let the native handler win.
  // Trade-off: per-character native undo is gone; our debounced snapshots
  // give 300ms-burst granularity instead.
  const undoWithFlush = () => {
    flushPendingCommit();
    undo();
  };
  const redoWithFlush = () => {
    flushPendingCommit();
    redo();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        flushPendingCommit();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        e.preventDefault();
        flushPendingCommit();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const withBusy = async (kind: NonNullable<Busy>, fn: () => Promise<void>) => {
    if (!canExport) return;
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const handleExportHtml = () =>
    withBusy('html', async () => {
      const { slides: latestSlides, overlaysBySlide } = useDeckStore.getState();
      const html = await buildHtmlBundle({
        slides: latestSlides,
        overlaysBySlide,
        title: latestSlides[0]?.title ?? 'Presentation',
      });
      downloadBlob(html, defaultExportName(latestSlides[0]?.title));
    });

  const handleExportPdf = () =>
    withBusy('pdf', async () => {
      const { slides: latestSlides, overlaysBySlide } = useDeckStore.getState();
      const html = await buildHtmlBundle({
        slides: latestSlides,
        overlaysBySlide,
        title: latestSlides[0]?.title ?? 'Presentation',
      });
      openPrintablePreview(html);
    });

  const handleExportPng = () =>
    withBusy('png', async () => {
      const { slides: latestSlides, overlaysBySlide } = useDeckStore.getState();
      if (latestSlides.length === 0) return;
      await exportAllSlidesPng({ slides: latestSlides, overlaysBySlide });
    });

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
        <ToolbarButton
          onClick={undoWithFlush}
          disabled={!canUndo}
          title="Undo (⌘Z / Ctrl+Z)"
        >
          ↶ Undo
        </ToolbarButton>
        <ToolbarButton
          onClick={redoWithFlush}
          disabled={!canRedo}
          title="Redo (⇧⌘Z / ⌘Y / Ctrl+Y)"
        >
          ↷ Redo
        </ToolbarButton>
        <span className="mx-2 h-5 w-px bg-editor-border" aria-hidden="true" />
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
        <ToolbarButton onClick={handleExportHtml} disabled={!canExport} tone="accent">
          {busy === 'html' ? 'Exporting…' : 'Export HTML'}
        </ToolbarButton>
        <ToolbarButton onClick={handleExportPdf} disabled={!canExport} tone="accent">
          {busy === 'pdf' ? 'Opening…' : 'Export PDF'}
        </ToolbarButton>
        <ToolbarButton onClick={handleExportPng} disabled={!canExport} tone="accent">
          {busy === 'png' ? 'Rendering…' : 'PNG (all)'}
        </ToolbarButton>
        <span className="mx-2 h-5 w-px bg-editor-border" aria-hidden="true" />
        <SaveIndicator />
        <ToolbarButton
          onClick={() => {
            const ok = window.confirm(
              '저장된 작업을 모두 지우고 샘플 슬라이드로 되돌립니다. 계속하시겠습니까?',
            );
            if (!ok) return;
            clearDeckFromLocalStorage();
            usePersistenceStore.getState().reset();
            const { slides: fresh } = parsePresentationHTML(presentationHtml);
            loadDeck(fresh);
          }}
          tone="danger"
          title="localStorage 비우고 샘플로 리셋"
        >
          Reset
        </ToolbarButton>
        <span className="ml-3 text-editor-dim">1280×720 · export 1920×1080</span>
      </div>
    </header>
  );
}

function SaveIndicator() {
  const lastSavedAt = usePersistenceStore((s) => s.lastSavedAt);
  const lastError = usePersistenceStore((s) => s.lastError);
  const saving = usePersistenceStore((s) => s.saving);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  let label: string;
  let tone: string;
  if (lastError) {
    label = `Save failed`;
    tone = 'text-red-300';
  } else if (saving) {
    label = 'Saving…';
    tone = 'text-editor-dim';
  } else if (lastSavedAt === null) {
    label = 'Not saved yet';
    tone = 'text-editor-dim';
  } else {
    label = `Saved ${formatAgo(now - lastSavedAt)}`;
    tone = 'text-editor-dim';
  }
  return (
    <span
      className={`text-[11px] ${tone}`}
      title={lastError ?? (lastSavedAt ? new Date(lastSavedAt).toLocaleString() : '')}
    >
      {label}
    </span>
  );
}

function formatAgo(ms: number): string {
  if (ms < 5_000) return 'just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

type ToolbarButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger' | 'accent';
  title?: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, disabled, tone = 'default', title, children }: ToolbarButtonProps) {
  const base =
    'rounded border px-2.5 py-1 font-medium transition disabled:cursor-not-allowed disabled:opacity-40';
  const tones: Record<NonNullable<ToolbarButtonProps['tone']>, string> = {
    default: 'border-editor-border text-editor-text hover:border-editor-accent hover:text-editor-accent',
    danger: 'border-red-500/40 text-red-300 hover:border-red-500 hover:bg-red-500/10',
    accent: 'border-editor-accent/50 text-editor-accent hover:bg-editor-accent/10',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`${base} ${tones[tone]}`}>
      {children}
    </button>
  );
}
