import { useEffect, useRef, useState } from 'react';
import { ColorSwatchButton } from './ColorPicker';
import { FONT_GROUPS, loadGoogleFont } from './fontList';
import {
  applyHighlight,
  clearHighlights,
  selectionInsideCanvas,
  toggleCmd,
  wrapWithStyle,
} from './textFormatActions';

type SelectionMeta = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

const SWATCHES: { label: string; color: string }[] = [
  { label: 'Mint Glow (키포인트)', color: '#34D399' },
  { label: 'Sky Blue (링크·키워드)', color: '#60A5FA' },
  { label: 'Blue Gray (뮤트·설명)', color: '#94A3B8' },
  { label: 'Soft Red (오류·경고)', color: '#F87171' },
  { label: 'Amber (Brewnet 키)', color: '#F59E0B' },
  { label: 'Emerald Deep (성공·완료)', color: '#065F46' },
  { label: 'Royal Blue (링크·키워드)', color: '#1D4ED8' },
  { label: 'Mid Gray (캡션·보조)', color: '#6B7280' },
  { label: 'Crimson (경고·위험)', color: '#BE123C' },
  { label: 'Golden (핵심 포인트)', color: '#B45309' },
];

function readMeta(): SelectionMeta {
  return {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
  };
}

// Extract the first comma-separated family token in lowercase, stripped of
// surrounding quotes. Used to match a computed font-family against the
// curated FONT_GROUPS entries by primary family name.
function firstFamilyName(stack: string): string {
  const first = stack.split(',')[0]?.trim() ?? '';
  return first.replace(/^["']|["']$/g, '').toLowerCase();
}

// Resolve the font family currently applied to the selection range. Reads
// computed style of the range's nearest element so inline `<span style>`,
// inherited preset (.t-title etc.), and the wrapper's inline override are
// all reflected. Returns the select's option value ("stack||google") or ''
// when no curated entry matches.
function rangeAnchorElement(range: Range): Element | null {
  const node = range.commonAncestorContainer;
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function detectFontKey(range: Range): string {
  const node = rangeAnchorElement(range);
  if (!node) return '';
  const cs = getComputedStyle(node).fontFamily;
  if (!cs) return '';
  const target = firstFamilyName(cs);
  for (const g of FONT_GROUPS) {
    for (const f of g.entries) {
      if (firstFamilyName(f.cssStack) === target) {
        return `${f.cssStack}||${f.google ?? ''}`;
      }
    }
  }
  return '';
}

// `getComputedStyle().fontSize` is always reported in `px` regardless of how
// the rule was authored (em / rem / pt …) — parseFloat is safe.
function detectFontSizePx(range: Range): number | null {
  const node = rangeAnchorElement(range);
  if (!node) return null;
  const v = parseFloat(getComputedStyle(node).fontSize);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
}

// `getComputedStyle().color` returns `rgb(r, g, b)` or `rgba(r, g, b, a)`.
// We feed the result back into `ColorSwatchButton` whose internal popover
// matches active swatch by uppercase hex, so normalise to `#RRGGBB`.
function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`.toUpperCase();
}

function detectTextColorHex(range: Range): string | null {
  const node = rangeAnchorElement(range);
  if (!node) return null;
  return rgbToHex(getComputedStyle(node).color);
}

export function TextFormatPanel() {
  const [hasSelection, setHasSelection] = useState(false);
  const [meta, setMeta] = useState<SelectionMeta>({ bold: false, italic: false, underline: false });
  // Currently-applied font family for the active selection, in select
  // option-value form ("stack||google"). Empty string = no curated match,
  // which displays the "기본 (해제)" placeholder.
  const [fontKey, setFontKey] = useState<string>('');
  // Currently-applied font-size in px, as a string so the user can type
  // freely (e.g. clear the field, type "2" before "24") without React
  // clobbering the partial value. Number conversion happens at apply time.
  const [fontSizeInput, setFontSizeInput] = useState<string>('');
  // Currently-applied text color in `#RRGGBB`. Null = could not detect or
  // selection has no canvas range. Forwarded to `ColorSwatchButton` so the
  // active swatch and hex readout reflect the actual painted color.
  const [textColorHex, setTextColorHex] = useState<string | null>(null);
  // Last canvas selection range, stashed so number/hex inputs can apply
  // changes after focus moves away from contenteditable. Buttons with
  // onMouseDown=preventDefault don't need this; inputs do because focus
  // transfer collapses the visible selection.
  const lastCanvasRange = useRef<Range | null>(null);
  // Last detected font size for the active canvas selection. We only push
  // the detected value into `fontSizeInput` when it *actually changes* —
  // otherwise typing inside the size input itself triggers a stream of
  // `selectionchange` events (the document selection still points at the
  // canvas while focus is in the input), and re-running setFontSizeInput
  // with the previously-detected value clobbers the user's partial typing.
  const lastDetectedFontSize = useRef<number | null>(null);

  useEffect(() => {
    const onChange = () => {
      const range = selectionInsideCanvas();
      setHasSelection(range !== null);
      if (range) {
        lastCanvasRange.current = range.cloneRange();
        setMeta(readMeta());
        setFontKey(detectFontKey(range));
        const px = detectFontSizePx(range);
        if (px !== lastDetectedFontSize.current) {
          lastDetectedFontSize.current = px;
          setFontSizeInput(px !== null ? String(px) : '');
        }
        setTextColorHex(detectTextColorHex(range));
      }
    };
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, []);

  const guard = (e: React.MouseEvent) => {
    // Prevent the toolbar button click from stealing the canvas selection.
    e.preventDefault();
    // ALSO snapshot the live range right now. The selectionchange listener
    // is supposed to keep `lastCanvasRange.current` in sync, but in practice
    // the React commit cycle can fire between the user lifting the drag and
    // pressing the button, and any intermediate selectionchange that lands
    // outside the canvas (e.g. focus moving for any reason) will skip the
    // save branch — leaving us with a stale or null saved range when the
    // button's onClick eventually runs. Snapshotting here is a no-op when
    // the saved value is already correct, and a safety net otherwise.
    const range = selectionInsideCanvas();
    if (range) lastCanvasRange.current = range.cloneRange();
  };

  const restoreRange = () => {
    const r = lastCanvasRange.current;
    if (!r) return false;
    // Reject saved ranges whose endpoints have been detached from the live
    // DOM (overlay deleted, undo/redo remount, React reconciler swap). Using
    // a stale range causes wrapWithStyle to silently no-op or insert into a
    // ghost subtree, neither of which the user sees on the actual canvas.
    const start = r.startContainer;
    if (!start.isConnected) return false;
    const startEl =
      start.nodeType === Node.ELEMENT_NODE
        ? (start as Element)
        : start.parentElement;
    if (!startEl || !startEl.closest('.slide-canvas-host')) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  };

  // Snapshot the current canvas selection on mousedown of the font-size number
  // input. Unlike toolbar buttons, native <input> elements cannot use
  // e.preventDefault() on mousedown (that would prevent focus from transferring
  // to the input). Instead we eagerly capture whatever range exists at that
  // instant — before the browser collapses the canvas selection on focus-out —
  // so the subsequent onBlur / onKeyDown apply path has a valid lastCanvasRange
  // to restore from.
  const snapshotRangeOnMouseDown = () => {
    const range = selectionInsideCanvas();
    if (range) lastCanvasRange.current = range.cloneRange();
  };

  const applyFontSize = (px: number | null) => {
    if (!restoreRange()) return;
    if (px === null) wrapWithStyle({ fontSize: null });
    else if (px > 0) wrapWithStyle({ fontSize: `${px}px` });
  };

  const applyFontFamily = (cssStack: string | null, google?: string) => {
    if (!restoreRange()) return;
    if (cssStack === null) {
      wrapWithStyle({ fontFamily: null });
      return;
    }
    // Lazy-load the Google Fonts <link> on first selection so the dropdown
    // itself stays free of network calls. Subsequent picks of the same
    // family are no-ops thanks to the `loaded` set inside the helper.
    if (google) loadGoogleFont(google);
    wrapWithStyle({ fontFamily: cssStack });
  };

  const applyTextColor = (hex: string | null) => {
    // ColorSwatchButton's popover transfers focus before this fires, so the
    // canvas selection is already collapsed by the time onChange runs. Same
    // restore-then-wrap pattern as size/family — without it, the action is
    // a silent no-op (selectionInsideCanvas returns null inside wrapWithStyle).
    if (!restoreRange()) return;
    wrapWithStyle({ color: hex });
  };

  const applyClear = () => {
    if (!restoreRange()) return;
    clearHighlights();
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
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-editor-dim">
              Highlight
            </span>
            <button
              type="button"
              onMouseDown={guard}
              onClick={applyClear}
              title="Remove highlight"
              className="rounded border border-editor-border px-2 py-0.5 text-[10px] text-editor-dim hover:border-editor-accent hover:text-editor-accent"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {SWATCHES.map((s) => (
              <button
                key={s.color}
                type="button"
                onMouseDown={guard}
                onClick={() => applyHighlight(s.color)}
                title={s.label}
                className="h-7 w-7 rounded border border-editor-border transition hover:scale-105"
                style={{ backgroundColor: s.color }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-editor-dim">
            Font size
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={6}
              max={200}
              placeholder="px"
              data-testid="text-font-size-input"
              value={fontSizeInput}
              onMouseDown={snapshotRangeOnMouseDown}
              onChange={(e) => setFontSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const n = Number((e.target as HTMLInputElement).value);
                  if (Number.isFinite(n) && n > 0) applyFontSize(n);
                  (e.target as HTMLInputElement).blur();
                  return;
                }
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  // Native number-input step fires *after* this handler runs,
                  // so read the value on the next frame to capture the
                  // post-step number and apply it to the selected text.
                  const target = e.target as HTMLInputElement;
                  requestAnimationFrame(() => {
                    const n = Number(target.value);
                    if (Number.isFinite(n) && n > 0) {
                      setFontSizeInput(String(n));
                      applyFontSize(n);
                    }
                  });
                }
              }}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (e.target.value === '') return;
                if (Number.isFinite(n) && n > 0) applyFontSize(n);
              }}
              className="w-16 rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs text-editor-text outline-none focus:border-editor-accent"
            />
            {[12, 16, 20, 24, 32, 48].map((sz) => (
              <button
                key={sz}
                type="button"
                onMouseDown={guard}
                onClick={() => applyFontSize(sz)}
                className="rounded border border-editor-border px-1.5 py-1 text-[10px] text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
              >
                {sz}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={guard}
              onClick={() => applyFontSize(null)}
              title="Reset font size"
              className="rounded border border-editor-border px-1.5 py-1 text-[10px] text-editor-dim hover:border-editor-accent hover:text-editor-accent"
            >
              ×
            </button>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-editor-dim">
            Text color
          </div>
          <div onMouseDown={guard}>
            <ColorSwatchButton
              label="Text color"
              value={textColorHex}
              onChange={applyTextColor}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-editor-dim">
            Font family
          </div>
          <select
            data-testid="text-font-family-select"
            value={fontKey}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const v = e.target.value;
              setFontKey(v);
              if (v === '') {
                applyFontFamily(null);
              } else {
                // value is "stack||google" — google is empty for system fonts
                const [stack, google] = v.split('||');
                applyFontFamily(stack, google || undefined);
              }
            }}
            className="w-full rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs text-editor-text outline-none focus:border-editor-accent"
          >
            <option value="">기본 (해제)</option>
            {FONT_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.entries.map((f) => (
                  <option key={f.name} value={`${f.cssStack}||${f.google ?? ''}`}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
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
