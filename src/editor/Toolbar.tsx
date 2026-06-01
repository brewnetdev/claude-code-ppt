import { useEffect, useRef, useState } from 'react';
import {
  clearResourceFile,
  clearStoredExportRoot,
  getStoredExportRoot,
  getStoredResourceFile,
  isFsaSupported,
  pickExportRoot,
  pickResourceFile,
  writeDeckHtml,
  writeFileHandle,
} from '../exporter/fileSystemAccess';
import { buildHtmlBundle, defaultExportName, downloadBlob } from '../exporter/htmlBundle';
import { exportAllSlidesPng } from '../exporter/pngExport';
import { assembleHtmlDocument, splitHtmlDocument } from '../importer/detectResource';
import { parsePresentationHTML } from '../importer/parsePresentation';
import type { DeckRegistryEntry } from '../library/deckRegistry';
import type { ResourceEntry } from '../library/resourceRegistry';
import { clearDeckFromLocalStorage } from '../persistence/localStore';
import { usePersistenceStore } from '../persistence/persistenceStore';
import { flushPendingCommit } from '../scene/pendingCommit';
import { useResourceStore } from '../scene/resourceStore';
import { useDeckStore } from '../scene/store';
import { ExportDropdown } from './ExportDropdown';
import { HelpModal } from './HelpModal';
import { IconPicker } from './IconPicker';
import { ImportFromDeckModal } from './ImportFromDeckModal';
import { TemplatePicker } from './TemplatePicker';
import { showToast } from './Toast';

type Busy = null | 'html' | 'pdf' | 'png';

type ToolbarProps = {
  onPresent: () => void;
  onExitToLibrary: () => void;
  activeDeck: DeckRegistryEntry | null;
  activeResource: ResourceEntry | null;
  editorKind: 'deck' | 'document';
  librarySection: 'decks' | 'resources';
};

export function Toolbar({
  onPresent,
  onExitToLibrary,
  activeDeck,
  activeResource,
  editorKind,
  librarySection,
}: ToolbarProps) {
  const isDoc = editorKind === 'document';

  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const insertSlideAfter = useDeckStore((s) => s.insertSlideAfter);
  const duplicateSlide = useDeckStore((s) => s.duplicateSlide);
  const removeSlide = useDeckStore((s) => s.removeSlide);
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const undo = useDeckStore((s) => s.undo);
  const redo = useDeckStore((s) => s.redo);
  const pastLen = useDeckStore((s) => s.past.length);
  const futureLen = useDeckStore((s) => s.future.length);

  // Document-mode store (flowing HTML resources).
  const docResource = useResourceStore((s) => s.resource);
  const docPastLen = useResourceStore((s) => s.past.length);
  const docFutureLen = useResourceStore((s) => s.future.length);
  const docUndo = useResourceStore((s) => s.undo);
  const docRedo = useResourceStore((s) => s.redo);
  const loadDocument = useResourceStore((s) => s.loadDocument);

  const [busy, setBusy] = useState<Busy>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const saveActionRef = useRef<() => void>(() => {});

  const canDelete = slides.length > 1;
  const canExport = isDoc ? docResource !== null && busy === null : slides.length > 0 && busy === null;
  const canUndo = isDoc ? docPastLen > 0 : pastLen > 0;
  const canRedo = isDoc ? docFutureLen > 0 : futureLen > 0;

  const undoWithFlush = () => {
    if (isDoc) {
      docUndo();
      return;
    }
    flushPendingCommit();
    undo();
  };
  const redoWithFlush = () => {
    if (isDoc) {
      docRedo();
      return;
    }
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
        if (isDoc) {
          if (e.shiftKey) docRedo();
          else docUndo();
          return;
        }
        flushPendingCommit();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        e.preventDefault();
        if (isDoc) {
          docRedo();
          return;
        }
        flushPendingCommit();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, docUndo, docRedo, isDoc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActionRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const withBusy = async (kind: NonNullable<Busy>, fn: () => Promise<void>) => {
    if (!canExport) return;
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  // ── Document-mode full-document HTML (head + edited body) ──────────────────
  const currentDocHtml = (): string | null => {
    const { resource, bodyHtml } = useResourceStore.getState();
    if (!resource) return null;
    return assembleHtmlDocument({
      headHtml: resource.headHtml,
      bodyHtml,
      lang: resource.lang,
      bodyClassName: resource.bodyClassName,
      title: resource.title,
    });
  };

  // ── Save (💾) — overwrite source file in place via FSA ─────────────────────
  const handleSaveDeck = () =>
    withBusy('html', async () => {
      const { slides: latestSlides, overlaysBySlide } = useDeckStore.getState();
      const html = await buildHtmlBundle({
        slides: latestSlides,
        overlaysBySlide,
        title: activeDeck?.title ?? latestSlides[0]?.title ?? 'Presentation',
      });
      if (activeDeck && isFsaSupported()) {
        try {
          let root = await getStoredExportRoot();
          if (!root) root = await pickExportRoot();
          if (root) {
            const path = await writeDeckHtml(root, activeDeck.template, activeDeck.id, html);
            usePersistenceStore.getState().setSaved(Date.now());
            showToast({ message: `저장됨: ${path}`, tone: 'info' });
            return;
          }
          return;
        } catch (err) {
          console.error('Export write-back failed; falling back to download.', err);
          await clearStoredExportRoot();
        }
      }
      downloadBlob(html, defaultExportName(latestSlides[0]?.title));
      showToast({ message: '파일로 다운로드했습니다.', tone: 'info' });
    });

  const handleSaveDocument = () =>
    withBusy('html', async () => {
      const html = currentDocHtml();
      const resource = useResourceStore.getState().resource;
      if (!html || !resource) return;
      if (isFsaSupported()) {
        try {
          // Reuse the saved file handle if we have one; otherwise the Save-As
          // dialog (this click is the required user gesture) lets the user pick
          // the target file once. Both built-in and uploaded resources work.
          let handle = await getStoredResourceFile(resource.id, true);
          if (!handle) {
            const suggested = resource.path.includes('/')
              ? resource.path.split('/').pop() ?? `${resource.title}.html`
              : resource.path || `${sanitizeFilename(resource.title)}.html`;
            handle = await pickResourceFile(resource.id, suggested);
          }
          if (handle) {
            const name = await writeFileHandle(handle, html);
            usePersistenceStore.getState().setSaved(Date.now());
            showToast({ message: `저장됨: ${name}`, tone: 'info' });
            return;
          }
          return; // user cancelled the dialog
        } catch (err) {
          console.error('Resource save failed; falling back to download.', err);
          await clearResourceFile(resource.id);
        }
      }
      // No FSA support → download a standalone copy.
      downloadBlob(html, sanitizeFilename(resource.title) + '.html');
      showToast({ message: '파일로 다운로드했습니다.', tone: 'info' });
    });

  const handleSave = isDoc ? handleSaveDocument : handleSaveDeck;

  saveActionRef.current = () => {
    if (!canExport || busy === 'html') return;
    if (!isDoc) flushPendingCommit();
    void handleSave();
  };

  // ── Export dropdown (download / print) ─────────────────────────────────────
  const handleDownloadHtml = () =>
    withBusy('html', async () => {
      if (isDoc) {
        const html = currentDocHtml();
        const resource = useResourceStore.getState().resource;
        if (!html || !resource) return;
        downloadBlob(html, sanitizeFilename(resource.title) + '.html');
        return;
      }
      const { slides: latestSlides, overlaysBySlide } = useDeckStore.getState();
      const html = await buildHtmlBundle({
        slides: latestSlides,
        overlaysBySlide,
        title: activeDeck?.title ?? latestSlides[0]?.title ?? 'Presentation',
      });
      downloadBlob(html, defaultExportName(activeDeck?.title ?? latestSlides[0]?.title));
    });

  const handleExportPng = () =>
    withBusy('png', async () => {
      const { slides: latestSlides, overlaysBySlide } = useDeckStore.getState();
      if (latestSlides.length === 0) return;
      await exportAllSlidesPng({ slides: latestSlides, overlaysBySlide });
    });

  const title = isDoc ? docResource?.title ?? activeResource?.title ?? '' : activeDeck?.title ?? '';

  return (
    <>
      <header className="flex h-12 items-center justify-between border-b border-editor-border bg-editor-panel px-4">
        <div className="flex items-center gap-2">
          {/* Breadcrumb: claude-code-ppt › <section> › <title>. The first two
              crumbs navigate back to the library at the section the editor was
              opened from. */}
          <nav className="flex items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={onExitToLibrary}
              title="라이브러리로 돌아가기"
              className="font-medium text-editor-dim transition hover:text-editor-accent"
            >
              claude-code-ppt
            </button>
            <span className="text-editor-dim/50">›</span>
            <button
              type="button"
              onClick={onExitToLibrary}
              title={`${librarySection === 'resources' ? '리소스 편집' : '발표 데크'}으로 돌아가기`}
              className="font-medium text-editor-dim transition hover:text-editor-accent"
            >
              {librarySection === 'resources' ? '리소스 편집' : '발표 데크'}
            </button>
            {title ? (
              <>
                <span className="text-editor-dim/50">›</span>
                <span className="max-w-[260px] truncate text-editor-text" title={title}>
                  {title}
                </span>
              </>
            ) : null}
          </nav>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            title="도움말 (편집·단축키·내보내기)"
            aria-label="도움말 열기"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-editor-border text-[11px] text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
          >
            ?
          </button>
          <span className="text-xs text-editor-dim">
            {isDoc
              ? '문서 편집'
              : slides.length > 0
                ? `Slide ${currentIndex + 1} / ${slides.length}`
                : 'Loading…'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <ToolbarButton onClick={undoWithFlush} disabled={!canUndo} title="Undo (⌘Z / Ctrl+Z)">
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
          {!isDoc ? (
            <>
              <ToolbarButton
                onClick={() => {
                  flushPendingCommit();
                  onPresent();
                }}
                disabled={slides.length === 0}
                title="Present full screen (← → 이동, Esc 종료)"
              >
                ⛶ Present
              </ToolbarButton>
              <span className="mx-2 h-5 w-px bg-editor-border" aria-hidden="true" />
              <ToolbarButton onClick={() => setPickerOpen(true)}>+ New</ToolbarButton>
              <ToolbarButton
                onClick={() => setImportOpen(true)}
                title="다른 데크에서 슬라이드 가져오기 (Cmd+V로도 가능)"
              >
                📥 Import
              </ToolbarButton>
              <ToolbarButton onClick={() => duplicateSlide(currentIndex)}>Duplicate</ToolbarButton>
              <ToolbarButton
                onClick={() => canDelete && removeSlide(currentIndex)}
                disabled={!canDelete}
                tone="danger"
              >
                Delete
              </ToolbarButton>
              <span className="mx-2 h-5 w-px bg-editor-border" aria-hidden="true" />
              <IconPicker />
            </>
          ) : null}
          <ExportDropdown
            busy={busy}
            disabled={!canExport}
            onExportHtml={handleDownloadHtml}
            onExportPng={isDoc ? undefined : handleExportPng}
          />
          <span className="mx-2 h-5 w-px bg-editor-border" aria-hidden="true" />
          <SaveIndicator />
          <ToolbarButton
            onClick={async () => {
              if (isDoc) {
                if (!activeResource) return;
                const ok = window.confirm('편집 내용을 버리고 원본 문서로 되돌립니다. 계속하시겠습니까?');
                if (!ok) return;
                const parts = splitHtmlDocument(activeResource.raw);
                loadDocument(activeResource, parts);
                usePersistenceStore.getState().reset();
                return;
              }
              if (!activeDeck) return;
              const ok = window.confirm(
                '이 데크의 저장된 편집을 모두 지우고 원본으로 되돌립니다. 계속하시겠습니까?',
              );
              if (!ok) return;
              await clearDeckFromLocalStorage(activeDeck.id);
              usePersistenceStore.getState().reset();
              const { slides: fresh } = parsePresentationHTML(activeDeck.html);
              loadDeck(fresh);
            }}
            disabled={isDoc ? !activeResource : !activeDeck}
            tone="danger"
            title="편집 내역을 지우고 원본으로 리셋"
          >
            Reset
          </ToolbarButton>
          <ToolbarButton
            onClick={handleSave}
            disabled={!canExport}
            tone="accent"
            title="원본 파일로 저장 (⇧⌘S / Ctrl+Shift+S)"
          >
            {busy === 'html' ? 'Saving…' : '💾 Save'}
          </ToolbarButton>
        </div>
      </header>
      <TemplatePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(t) => {
          insertSlideAfter(currentIndex, t.html, t.title);
          setPickerOpen(false);
        }}
      />
      <ImportFromDeckModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        activeDeckId={activeDeck?.id ?? null}
      />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^\w가-힣 .-]+/g, '').trim().replace(/\s+/g, '-');
  return cleaned.length > 0 ? cleaned : 'document';
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
