import { useEffect, useMemo } from 'react';
import { assembleHtmlDocument } from '../importer/detectResource';
import { useResourceStore } from '../scene/resourceStore';

type Props = {
  onExit: () => void;
};

// Fullscreen, read-only render of the current flowing HTML document. Unlike the
// slide PresentationView there are no slides to page through — the document is
// shown in a scrollable, edit-free iframe so the resource's own <head> CSS
// applies in full isolation. Requests the browser Fullscreen API best-effort
// and listens to `fullscreenchange` so a native Esc/F11 exit stays in sync.
export function DocumentPresentationView({ onExit }: Props) {
  const resource = useResourceStore((s) => s.resource);
  const bodyHtml = useResourceStore((s) => s.bodyHtml);

  // Always assemble from the latest committed body — presentation is launched
  // from a button click that flushes pending edits, so this snapshot is current.
  const srcDoc = useMemo(() => {
    if (!resource) return '';
    return assembleHtmlDocument({
      headHtml: resource.headHtml,
      bodyHtml,
      lang: resource.lang,
      bodyClassName: resource.bodyClassName,
      title: resource.title,
      // Fill the fullscreen width rather than the source's pinned max-width.
      fillWidth: true,
    });
  }, [resource, bodyHtml]);

  useEffect(() => {
    // Best-effort fullscreen — the toolbar click that opened presentation
    // counts as the required user gesture.
    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen().catch(() => undefined);
    }
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [onExit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  if (!resource) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col bg-white"
      role="presentation"
      data-testid="document-presentation-overlay"
    >
      <iframe
        title={resource.title}
        srcDoc={srcDoc}
        className="h-full w-full border-0 bg-white"
        // allow-scripts is omitted (resource JS was stripped on import); the
        // contained document is shown read-only.
        sandbox="allow-same-origin"
      />

      <div className="pointer-events-none fixed bottom-4 right-6 select-none rounded bg-black/60 px-3 py-1 font-mono text-xs text-white/80 opacity-0 transition-opacity duration-200 hover:opacity-100">
        Esc 종료
      </div>

      <button
        type="button"
        onClick={onExit}
        className="fixed right-4 top-4 z-[10] rounded border border-black/20 bg-white/80 px-3 py-1 text-xs text-black/70 opacity-30 transition-opacity duration-200 hover:bg-white hover:opacity-100"
        title="Exit presentation (Esc)"
      >
        ✕ 종료
      </button>
    </div>
  );
}
