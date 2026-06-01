import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assembleHtmlDocument } from '../importer/detectResource';
import { useResourceStore } from '../scene/resourceStore';
import { useDocumentEditing } from './useDocumentEditing';

type DocumentCanvasProps = {
  // Read-only preview vs. editable. The Resource tab opens editable by default;
  // a future view/edit toggle (R5) flips this.
  editable?: boolean;
};

const MIN_WIDTH = 480;

// Edit surface for flowing (non-slide) HTML resources. Renders the document in
// a same-origin srcdoc iframe so the resource's own <head> CSS applies in full
// isolation, then makes <body> contenteditable via useDocumentEditing.
export function DocumentCanvas({ editable = true }: DocumentCanvasProps) {
  const resource = useResourceStore((s) => s.resource);
  const bodyHtml = useResourceStore((s) => s.bodyHtml);
  const revision = useResourceStore((s) => s.revision);
  const commitBody = useResourceStore((s) => s.commitBody);
  // Width lives in the store so the Properties panel can show/edit it.
  const widthPx = useResourceStore((s) => s.docWidth);
  const setWidthPx = useResourceStore((s) => s.setDocWidth);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);

  // Default width when a document opens: as wide as the viewport allows, capped
  // at 1100px (a comfortable reading measure).
  const defaultWidth = useCallback(
    () => Math.min(1100, Math.max(MIN_WIDTH, (containerRef.current?.clientWidth ?? 1148) - 48)),
    [],
  );

  // Seed a concrete px width on open (docWidth is reset to null per document)
  // so the Properties panel always has a number to display and edit.
  useEffect(() => {
    if (resource && widthPx === null) setWidthPx(defaultWidth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id, widthPx]);

  // srcdoc is recomputed only when the document is re-seeded (load or
  // undo/redo). Live typing mutates the iframe DOM directly and is committed
  // through useDocumentEditing — we deliberately do NOT echo bodyHtml back into
  // srcdoc on every keystroke (that would blow away the caret).
  const srcDoc = useMemo(() => {
    if (!resource) return '';
    return assembleHtmlDocument({
      headHtml: resource.headHtml,
      bodyHtml,
      lang: resource.lang,
      bodyClassName: resource.bodyClassName,
      title: resource.title,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id, revision]);

  // The seed key forces useDocumentEditing to re-bind after a re-seed.
  useDocumentEditing(frameRef, `${resource?.id ?? ''}:${revision}`, {
    editable,
    onCommit: commitBody,
  });

  // Drag the right edge to resize. The stage is centered, so the cursor delta
  // is doubled (both gutters shrink/grow symmetrically) to keep the handle
  // tracking the pointer. While dragging we kill the iframe's pointer-events so
  // mousemove keeps firing on the parent rather than getting swallowed.
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = stageRef.current?.getBoundingClientRect().width ?? MIN_WIDTH;
    const maxWidth = (containerRef.current?.clientWidth ?? startWidth) - 16;
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const next = Math.round(startWidth + (ev.clientX - startX) * 2);
      setWidthPx(Math.max(MIN_WIDTH, Math.min(next, maxWidth)));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // Clamp the pinned width down if the viewport shrinks below it.
  useEffect(() => {
    const onWinResize = () => {
      const max = (containerRef.current?.clientWidth ?? 0) - 16;
      const w = useResourceStore.getState().docWidth;
      if (w !== null && max > MIN_WIDTH && w > max) setWidthPx(max);
    };
    window.addEventListener('resize', onWinResize);
    return () => window.removeEventListener('resize', onWinResize);
  }, [setWidthPx]);

  if (!resource) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-editor-dim">
        리소스를 선택하세요.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-canvas-role="document"
      className="flex h-full w-full justify-center overflow-auto bg-editor-bg p-6"
    >
      <div
        ref={stageRef}
        className="relative h-full shrink-0"
        style={{ width: widthPx !== null ? `${widthPx}px` : 'min(1100px, 100%)' }}
      >
        <iframe
          ref={frameRef}
          key={`${resource.id}:${revision}`}
          title={resource.title}
          srcDoc={srcDoc}
          className="h-full w-full rounded border border-editor-border bg-white shadow-sm"
          // Kill pointer-events mid-drag so window mousemove isn't swallowed by
          // the iframe document.
          style={{ pointerEvents: dragging ? 'none' : 'auto' }}
          // Same-origin sandbox: allow same-origin so the parent can reach
          // contentDocument for editing; omit allow-scripts — resource JS was
          // already stripped and we don't want it executing.
          sandbox="allow-same-origin"
        />
        {/* Right-edge resize handle. Double-click resets to the default width. */}
        <div
          onMouseDown={onResizeStart}
          onDoubleClick={() => setWidthPx(defaultWidth())}
          title="드래그해서 문서 폭 조절 (더블클릭: 기본값)"
          className="group absolute -right-1.5 top-0 flex h-full w-3 cursor-col-resize items-center justify-center"
        >
          <span
            className={`h-12 w-1 rounded-full transition ${
              dragging ? 'bg-editor-accent' : 'bg-editor-border group-hover:bg-editor-accent'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
