import { useEffect, useState } from 'react';

type SelectionMeta = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

const HL_CLASSES = ['hl-amber', 'hl-blue', 'hl-green', 'hl-cyan'] as const;

const SWATCHES: { className: (typeof HL_CLASSES)[number]; label: string; color: string }[] = [
  { className: 'hl-amber', label: 'Amber', color: '#F59E0B' },
  { className: 'hl-blue', label: 'Blue', color: '#60A5FA' },
  { className: 'hl-green', label: 'Green', color: '#34D399' },
  { className: 'hl-cyan', label: 'Cyan', color: '#22D3EE' },
];

function selectionInsideCanvas(): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const node =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;
  if (!node || !node.closest('.slide-canvas-host')) return null;
  return range;
}

function readMeta(): SelectionMeta {
  return {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
  };
}

// Notify the slide root so the debounced DOM→store commit fires after our
// programmatic edits, just like keyboard typing would.
function notifyInput(range: Range): void {
  const host = (
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement
  )?.closest<HTMLElement>('.slide-canvas-host');
  host?.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

function wrapWithClass(className: string): void {
  const range = selectionInsideCanvas();
  if (!range) return;
  const span = document.createElement('span');
  span.className = className;
  try {
    range.surroundContents(span);
  } catch {
    // Range crosses element boundaries — extract → wrap → reinsert.
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  // Re-select the freshly wrapped content so further actions stack predictably.
  const sel = window.getSelection();
  if (sel) {
    const fresh = document.createRange();
    fresh.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(fresh);
  }
  notifyInput(range);
}

function clearHighlights(): void {
  const range = selectionInsideCanvas();
  if (!range) return;
  // Walk the selected fragment, unwrap any span whose class is one of HL_CLASSES.
  const root = range.commonAncestorContainer.parentElement;
  if (!root) return;
  const all = Array.from(root.querySelectorAll<HTMLElement>('span'));
  for (const el of all) {
    if (!range.intersectsNode(el)) continue;
    const cls = el.className.split(/\s+/).filter((c) => !HL_CLASSES.includes(c as (typeof HL_CLASSES)[number]));
    if (cls.length === el.className.split(/\s+/).length) continue;
    if (cls.length === 0) {
      // Unwrap entirely — replace the span with its children.
      const parent = el.parentNode;
      if (!parent) continue;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    } else {
      el.className = cls.join(' ');
    }
  }
  notifyInput(range);
}

function toggleCmd(cmd: 'bold' | 'italic' | 'underline'): void {
  if (!selectionInsideCanvas()) return;
  document.execCommand(cmd);
  // execCommand emits its own input event when targeting contenteditable, but
  // belt-and-braces: ensure debounced commit sees a tick.
  const range = selectionInsideCanvas();
  if (range) notifyInput(range);
}

export function TextFormatPanel() {
  const [hasSelection, setHasSelection] = useState(false);
  const [meta, setMeta] = useState<SelectionMeta>({ bold: false, italic: false, underline: false });

  useEffect(() => {
    const onChange = () => {
      const range = selectionInsideCanvas();
      setHasSelection(range !== null);
      if (range) setMeta(readMeta());
    };
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, []);

  const guard = (e: React.MouseEvent) => {
    // Prevent the toolbar button click from stealing the canvas selection.
    e.preventDefault();
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
        <span>Text · Format</span>
        {!hasSelection ? <span className="font-normal normal-case text-editor-dim/70">캔버스에서 텍스트 드래그</span> : null}
      </div>
      <div
        className={`space-y-2 rounded border border-editor-border bg-editor-bg p-2 ${
          hasSelection ? '' : 'pointer-events-none opacity-40'
        }`}
      >
        <div className="flex gap-1">
          <FormatButton active={meta.bold} onMouseDown={guard} onClick={() => toggleCmd('bold')} title="Bold (⌘B)">
            <span className="font-bold">B</span>
          </FormatButton>
          <FormatButton active={meta.italic} onMouseDown={guard} onClick={() => toggleCmd('italic')} title="Italic (⌘I)">
            <span className="italic">I</span>
          </FormatButton>
          <FormatButton active={meta.underline} onMouseDown={guard} onClick={() => toggleCmd('underline')} title="Underline (⌘U)">
            <span className="underline">U</span>
          </FormatButton>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-editor-dim">
            Highlight
          </div>
          <div className="flex flex-wrap gap-1">
            {SWATCHES.map((s) => (
              <button
                key={s.className}
                type="button"
                onMouseDown={guard}
                onClick={() => wrapWithClass(s.className)}
                title={s.label}
                className="h-7 w-7 rounded border border-editor-border transition hover:scale-105"
                style={{ backgroundColor: s.color }}
              />
            ))}
            <button
              type="button"
              onMouseDown={guard}
              onClick={clearHighlights}
              title="Remove highlight"
              className="rounded border border-editor-border px-2 text-[10px] text-editor-dim hover:border-editor-accent hover:text-editor-accent"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type FormatButtonProps = {
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
};

function FormatButton({ onClick, onMouseDown, active, title, children }: FormatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      className={`h-7 min-w-[28px] rounded border px-2 text-xs transition ${
        active
          ? 'border-editor-accent bg-editor-accent/10 text-editor-accent'
          : 'border-editor-border text-editor-text hover:border-editor-accent hover:text-editor-accent'
      }`}
    >
      {children}
    </button>
  );
}
