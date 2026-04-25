import { useEffect, useMemo, useRef, useState } from 'react';
import Moveable, { type OnDrag, type OnResize } from 'moveable';
import { useDeckStore } from '../scene/store';

type OverlayBase = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ImageOverlay = OverlayBase & {
  kind: 'image';
  src: string;
};

// Free-positioned text box. The internal `html` is editable via
// contenteditable; per-selection formatting (bold/color/etc.) lives inside
// that html via inline spans, the same as in-flow blocks.
export type TextOverlay = OverlayBase & {
  kind: 'text';
  html: string;
  bg: string | null;
  // Wrapper-level controls applied as inline style on the contenteditable.
  align?: 'left' | 'center' | 'right';
  fontSizePx?: number; // optional override
  // Wrapper class hint — maps to brewnet .t-title / .t-h2 / .t-h3 / .t-body
  preset?: 'h1' | 'h2' | 'h3' | 'p' | null;
  // Inner padding (px) per side. Box-sizing is border-box (Tailwind default)
  // so this eats into the text area without changing the box's outer size.
  padding?: { t: number; r: number; b: number; l: number };
};

export type Overlay = ImageOverlay | TextOverlay;

// Backward-compat: legacy persisted decks stored OverlayImage without a
// `kind` field. Treat unmarked entries as images so existing decks keep
// loading.
export type OverlayImage = ImageOverlay;

const PRESET_CLASS: Record<NonNullable<TextOverlay['preset']>, string> = {
  h1: 't-title',
  h2: 't-h2',
  h3: 't-h3',
  p: 't-body',
};

type Props = {
  items: Overlay[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Overlay>) => void;
};

export function OverlayLayer({ items, selectedId, onSelect, onUpdate }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const selected = items.find((it) => it.id === selectedId) ?? null;
  // Bumped on undo/redo by the store. Used as part of the TextOverlayBox key
  // so a history snapshot's html replaces the live contenteditable DOM —
  // outside of those moments we must NEVER rebuild the editable subtree
  // (doing so resets the caret to position 0 and reverses typed text).
  const revision = useDeckStore((s) => s.revision);
  // PowerPoint pattern: a selected text overlay is in "transform mode"
  // (Moveable owns mousedowns for drag/resize). Double-click promotes to
  // "edit mode" — Moveable is destroyed and the inner contenteditable
  // receives mousedowns directly so users can place the caret, drag-select
  // text, and type. Selection change or Escape returns to transform mode.
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // If selection moves elsewhere (or clears), exit edit mode automatically.
  useEffect(() => {
    if (editingTextId && editingTextId !== selectedId) setEditingTextId(null);
  }, [selectedId, editingTextId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Single Escape clears EVERYTHING: text-overlay edit mode, overlay
      // selection, in-flow block selection, native text selection, and
      // contenteditable focus. Users expect one tap to "get out" of any
      // selection state, regardless of where focus currently is.
      setEditingTextId(null);
      onSelect(null);
      useDeckStore.getState().setSelectedBlockId(null);
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.isContentEditable) active.blur();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSelect]);

  useEffect(() => {
    if (!selectedId) return;
    // While editing a text overlay, suppress Moveable so the contenteditable
    // owns mousedown/drag for native caret + text selection.
    if (editingTextId === selectedId) return;
    const layer = layerRef.current;
    if (!layer) return;
    const target = layer.querySelector<HTMLElement>(`[data-overlay-id="${selectedId}"]`);
    if (!target) return;

    const moveable = new Moveable(document.body, {
      target,
      draggable: true,
      resizable: true,
      keepRatio: false,
      origin: false,
      edge: false,
      throttleDrag: 0,
      throttleResize: 0,
    });
    moveableRef.current = moveable;

    moveable.on('drag', ({ left, top, target: t }: OnDrag) => {
      (t as HTMLElement).style.left = `${left}px`;
      (t as HTMLElement).style.top = `${top}px`;
    });

    moveable.on('dragEnd', ({ target: t }) => {
      const el = t as HTMLElement;
      onUpdate(selectedId, { x: parseFloat(el.style.left), y: parseFloat(el.style.top) });
    });

    moveable.on('resize', ({ width, height, drag, target: t }: OnResize) => {
      const el = t as HTMLElement;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.left = `${drag.left}px`;
      el.style.top = `${drag.top}px`;
    });

    moveable.on('resizeEnd', ({ target: t }) => {
      const el = t as HTMLElement;
      onUpdate(selectedId, {
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
        w: parseFloat(el.style.width),
        h: parseFloat(el.style.height),
      });
    });

    return () => {
      moveable.destroy();
      if (moveableRef.current === moveable) moveableRef.current = null;
    };
  }, [selectedId, onUpdate, editingTextId]);

  // Keep Moveable handles in sync when the selected overlay's geometry is
  // edited from the properties panel instead of via drag handles.
  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [selected?.x, selected?.y, selected?.w, selected?.h]);

  return (
    <div ref={layerRef} className="overlay-layer">
      {items.map((it) => {
        // Tolerate legacy persisted overlays that pre-date the discriminator.
        const kind = (it as Partial<Overlay>).kind ?? 'image';
        if (kind === 'text') {
          const t = it as TextOverlay;
          return (
            <TextOverlayBox
              key={`${t.id}:${revision}`}
              overlay={t}
              isSelected={selectedId === t.id}
              isEditing={editingTextId === t.id}
              onSelect={onSelect}
              onEnterEdit={(id) => setEditingTextId(id)}
              onUpdate={onUpdate}
            />
          );
        }
        const img = it as ImageOverlay;
        return (
          <div
            key={img.id}
            data-overlay-id={img.id}
            className={`overlay-item ${selectedId === img.id ? 'selected' : ''}`}
            style={{ left: img.x, top: img.y, width: img.w, height: img.h }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelect(img.id);
            }}
          >
            <img src={img.src} alt="" draggable={false} />
          </div>
        );
      })}
    </div>
  );
}

const COMMIT_DEBOUNCE_MS = 300;

type TextOverlayBoxProps = {
  overlay: TextOverlay;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (id: string | null) => void;
  onEnterEdit: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Overlay>) => void;
};

// Uncontrolled contenteditable. The initial html is injected exactly once
// per mount (the parent re-keys on revision so undo/redo still refreshes
// it). Typing is committed back to the store via a 300ms debounce, which
// matches SlideRenderer's pattern. We must NOT thread the live `html` back
// into dangerouslySetInnerHTML — doing so causes React to overwrite the
// DOM on every keystroke, resetting the caret to position 0 and producing
// the reversed-typing / broken-IME / dead-backspace symptoms.
function TextOverlayBox({
  overlay,
  isSelected,
  isEditing,
  onSelect,
  onEnterEdit,
  onUpdate,
}: TextOverlayBoxProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const initialHtml = useMemo(() => overlay.html, [overlay.id]);
  const presetClass = overlay.preset ? PRESET_CLASS[overlay.preset] : '';
  const timerRef = useRef<number | null>(null);

  // When edit mode opens, focus the editable and place the caret at the end
  // so the user can immediately start typing without needing another click.
  useEffect(() => {
    if (!isEditing) return;
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [isEditing]);

  const flush = () => {
    const el = editableRef.current;
    if (!el) return;
    onUpdate(overlay.id, { html: el.innerHTML });
  };

  const onInput = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      flush();
      timerRef.current = null;
    }, COMMIT_DEBOUNCE_MS);
  };

  // Drain any pending debounce on unmount (selection change, undo remount,
  // overlay deletion) so the latest text reaches the store before the DOM
  // disappears.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        flush();
      }
    };
    // flush closes over editableRef + onUpdate which are stable enough; we
    // intentionally only run cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-overlay-id={overlay.id}
      className={`overlay-item overlay-text ${isSelected ? 'selected' : ''} ${
        isEditing ? 'editing' : ''
      }`}
      style={{
        left: overlay.x,
        top: overlay.y,
        width: overlay.w,
        height: overlay.h,
        background: overlay.bg ?? 'transparent',
        cursor: isEditing ? 'text' : 'move',
        padding: overlay.padding
          ? `${overlay.padding.t}px ${overlay.padding.r}px ${overlay.padding.b}px ${overlay.padding.l}px`
          : undefined,
      }}
      onMouseDown={(e) => {
        // Always stop bubbling so SlideCanvas's background-click handler
        // (which clears selection) doesn't immediately undo us.
        e.stopPropagation();
        if (isEditing) {
          // Let mousedown reach the contenteditable for caret placement
          // and drag-to-select. No further action needed.
          return;
        }
        if (!isSelected) onSelect(overlay.id);
      }}
      onDoubleClick={(e) => {
        // Promote a selected text overlay into edit mode. PowerPoint pattern:
        // 1st click selects (Moveable owns drag), 2nd click (or double-click)
        // hands the box to contenteditable for native text editing.
        e.stopPropagation();
        if (!isEditing) onEnterEdit(overlay.id);
      }}
    >
      <div
        ref={editableRef}
        className={`overlay-text-inner ${presetClass}`}
        contentEditable={isEditing}
        suppressContentEditableWarning
        spellCheck={false}
        style={{
          textAlign: overlay.align ?? 'left',
          // Inline font-size beats brewnet `.t-title` (36px) etc. by
          // selector specificity; without this the user's px override
          // is silently dropped.
          fontSize: overlay.fontSizePx ? `${overlay.fontSizePx}px` : undefined,
        }}
        onInput={onInput}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
      {isSelected && !isEditing ? (
        <div className="overlay-edit-hint" aria-hidden="true">
          더블클릭하여 편집
        </div>
      ) : null}
    </div>
  );
}
