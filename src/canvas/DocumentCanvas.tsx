import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assembleHtmlDocument } from '../importer/detectResource';
import { useResourceStore } from '../scene/resourceStore';
import {
  applyDocBlockWidth,
  clearDocBlockSelection,
  getSelectedDocBlock,
} from './documentEditingBridge';
import { DOC_SELECTION_EVENT, useDocumentEditing } from './useDocumentEditing';

const MIN_BLOCK_WIDTH = 120;

type BlockHandle = { left: number; top: number; height: number };

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
  // Per-block width handle: position (in stage coords) of the resize grip on the
  // right edge of the currently selected content block, or null when none.
  const [blockHandle, setBlockHandle] = useState<BlockHandle | null>(null);
  const [blockDragging, setBlockDragging] = useState(false);

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

  // srcdoc is seeded once per document (on load / resource switch). Live typing
  // mutates the iframe DOM directly and is committed through useDocumentEditing;
  // undo/redo swap the body in place (see the revision effect below). We
  // deliberately do NOT echo bodyHtml back into srcdoc on every keystroke (that
  // would blow away the caret) nor on undo (a srcdoc reload flashes the iframe
  // white and resets scroll to the top).
  const srcDoc = useMemo(() => {
    if (!resource) return '';
    return assembleHtmlDocument({
      headHtml: resource.headHtml,
      bodyHtml,
      lang: resource.lang,
      bodyClassName: resource.bodyClassName,
      title: resource.title,
      // Let the content fill the canvas width set by the resize handle, instead
      // of staying pinned to the source's max-width (e.g. Notion's 900px).
      fillWidth: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  // Apply undo/redo in place rather than reloading the iframe. `revision` is
  // bumped only by undo/redo (always incrementing); a fresh load / resource
  // switch resets it to 0, which we skip. Swapping body.innerHTML keeps the
  // iframe document (and its scroll position) intact — no white flash, no jump
  // to the top. Scroll is captured and restored around the swap in case the
  // restored content's height differs.
  const prevRevisionRef = useRef(revision);
  useEffect(() => {
    const prev = prevRevisionRef.current;
    prevRevisionRef.current = revision;
    if (revision <= prev) return; // initial mount, or resource switch (reset to 0)
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body) return;
    const scroller = doc.scrollingElement ?? doc.documentElement;
    const top = scroller?.scrollTop ?? 0;
    const left = scroller?.scrollLeft ?? 0;
    doc.body.innerHTML = useResourceStore.getState().bodyHtml;
    if (scroller) {
      scroller.scrollTop = top;
      scroller.scrollLeft = left;
    }
  }, [revision]);

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

  // Position the per-block width handle over the selected block's right edge.
  // The iframe fills the stage 1:1 (no transform), so a block's
  // getBoundingClientRect — measured in the iframe's own viewport — maps
  // directly onto stage coordinates.
  const recomputeBlockHandle = useCallback(() => {
    if (!editable) {
      setBlockHandle(null);
      return;
    }
    const block = getSelectedDocBlock();
    if (!block) {
      setBlockHandle(null);
      return;
    }
    const r = block.getBoundingClientRect();
    const stageH = stageRef.current?.clientHeight ?? Number.POSITIVE_INFINITY;
    // Hide while the block is scrolled out of the visible iframe area.
    if ((r.width === 0 && r.height === 0) || r.bottom < 0 || r.top > stageH) {
      setBlockHandle(null);
      return;
    }
    setBlockHandle({ left: r.right, top: r.top + r.height / 2, height: Math.max(28, r.height) });
  }, [editable]);

  // Recompute on selection changes, iframe scroll, and window resize. Re-bind
  // when the document is re-seeded so the scroll listener targets the live frame.
  useEffect(() => {
    if (!editable) clearDocBlockSelection();
    recomputeBlockHandle();
    const win = frameRef.current?.contentWindow;
    const onChange = () => recomputeBlockHandle();
    window.addEventListener(DOC_SELECTION_EVENT, onChange);
    window.addEventListener('resize', onChange);
    win?.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener(DOC_SELECTION_EVENT, onChange);
      window.removeEventListener('resize', onChange);
      win?.removeEventListener('scroll', onChange, true);
    };
  }, [recomputeBlockHandle, resource?.id, revision, editable]);

  // Drag the block handle to set that block's width. Mirrors the stage resize:
  // kill iframe pointer-events mid-drag so window mousemove keeps firing, write
  // the width live (uncommitted), then commit once on release.
  const onBlockResizeStart = useCallback(
    (e: React.MouseEvent) => {
      const block = getSelectedDocBlock();
      if (!block) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = block.getBoundingClientRect().width;
      const maxWidth = stageRef.current?.clientWidth ?? startWidth;
      let lastW = Math.round(startWidth);
      setBlockDragging(true);

      const onMove = (ev: MouseEvent) => {
        const next = Math.round(startWidth + (ev.clientX - startX));
        lastW = Math.max(MIN_BLOCK_WIDTH, Math.min(next, maxWidth));
        applyDocBlockWidth(lastW, false);
        recomputeBlockHandle();
      };
      const onUp = () => {
        setBlockDragging(false);
        applyDocBlockWidth(lastW, true);
        recomputeBlockHandle();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [recomputeBlockHandle],
  );

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
          key={resource.id}
          title={resource.title}
          srcDoc={srcDoc}
          className="h-full w-full rounded border border-editor-border bg-white shadow-sm"
          // Kill pointer-events mid-drag so window mousemove isn't swallowed by
          // the iframe document.
          style={{ pointerEvents: dragging || blockDragging ? 'none' : 'auto' }}
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

        {/* Per-block width handle — appears on the right edge of the block the
            user clicked into. Drag to set that block's width; double-click to
            clear it back to the document's own layout. */}
        {editable && blockHandle ? (
          <div
            onMouseDown={onBlockResizeStart}
            onDoubleClick={() => {
              applyDocBlockWidth(null, true);
              recomputeBlockHandle();
            }}
            title="드래그: 이 블록 폭 조절 · 더블클릭: 원래대로"
            className="absolute z-20 flex cursor-col-resize items-center justify-center"
            style={{
              left: blockHandle.left - 7,
              top: blockHandle.top,
              height: blockHandle.height,
              width: 14,
              transform: 'translateY(-50%)',
            }}
          >
            <span
              className={`max-h-20 w-1.5 rounded-full transition ${
                blockDragging ? 'bg-editor-accent' : 'bg-editor-accent/70 hover:bg-editor-accent'
              }`}
              style={{ height: '100%' }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
