import { useEffect, useRef, useState } from 'react';
import { ColorSwatchButton } from './ColorPicker';
import { FONT_GROUPS, loadGoogleFont } from './fontList';

type SelectionMeta = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

// Legacy hl-* classes — older decks still carry these wrappers, and Clear
// must keep recognising them. New highlights use inline style + a
// data-highlight marker so the swatch hex is exactly what gets rendered,
// regardless of the deck's data-template (portfolio/report tinted these
// classes to different colors, which is what the "wrong color applied"
// report actually was).
const HL_CLASSES = ['hl-amber', 'hl-blue', 'hl-green', 'hl-cyan'] as const;

const SWATCHES: { label: string; color: string }[] = [
  { label: 'Amber', color: '#F59E0B' },
  { label: 'Blue', color: '#60A5FA' },
  { label: 'Green', color: '#34D399' },
  { label: 'Cyan', color: '#22D3EE' },
  { label: 'Deep Green', color: '#166534' },
  { label: 'Deep Red', color: '#991B1B' },
  { label: 'Deep Gray', color: '#374151' },
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

// Notify the slide root so the debounced DOM→store commit fires after our
// programmatic edits, just like keyboard typing would. SlideRenderer's
// `input` listener is on the wrapper div *inside* `.slide-canvas-host`, so
// firing on the host element wouldn't bubble down to it. Dispatch on the
// nearest element of the selection range instead — that lives inside the
// editable region, so the event bubbles up through root naturally.
function notifyInput(range: Range): void {
  const target =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as HTMLElement)
      : (range.commonAncestorContainer.parentElement as HTMLElement | null);
  target?.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

// WYSIWYG highlight: write the swatch hex straight into inline `style` and
// flag the span with `data-highlight="1"` so Clear can find it later. We
// stopped using the legacy `hl-amber/blue/green/cyan` classes because each
// template (presentation/portfolio/report) re-tints them — the swatch said
// amber, but a portfolio deck would render brown. Inline color makes the
// painted result match the swatch unconditionally.
function applyHighlight(color: string): void {
  const range = selectionInsideCanvas();
  if (!range) return;
  const span = document.createElement('span');
  span.style.color = color;
  span.style.fontWeight = '700';
  span.setAttribute('data-highlight', '1');
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  const sel = window.getSelection();
  if (sel) {
    const fresh = document.createRange();
    fresh.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(fresh);
  }
  notifyInput(range);
}

// `<span style="…">` wrapper for the active selection. Each property
// supports `null` = remove that one inline style from intersecting spans
// (and unwrap bare spans), or a string value to set+wrap.
type InlineStylePatch = {
  color?: string | null;
  fontSize?: string | null;
  fontFamily?: string | null;
};
const INLINE_STYLE_KEYS = ['color', 'fontSize', 'fontFamily'] as const;

function wrapWithStyle(patch: InlineStylePatch): void {
  const range = selectionInsideCanvas();
  if (!range) return;
  // Null on any key means "strip this style from intersecting spans".
  const removals = INLINE_STYLE_KEYS.filter((k) => patch[k] === null);
  if (removals.length > 0) {
    const root = range.commonAncestorContainer.parentElement;
    if (!root) return;
    Array.from(root.querySelectorAll<HTMLElement>('span')).forEach((el) => {
      if (!range.intersectsNode(el)) return;
      let touched = false;
      for (const k of removals) {
        if ((el.style as unknown as Record<string, string>)[k]) {
          (el.style as unknown as Record<string, string>)[k] = '';
          touched = true;
        }
      }
      if (!touched) return;
      if (!el.getAttribute('style') && !el.className) {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });
    // If nothing else to set, we're done.
    const stillHas = INLINE_STYLE_KEYS.some((k) => typeof patch[k] === 'string');
    if (!stillHas) {
      notifyInput(range);
      return;
    }
  }
  const span = document.createElement('span');
  if (typeof patch.color === 'string') span.style.color = patch.color;
  if (typeof patch.fontSize === 'string') span.style.fontSize = patch.fontSize;
  if (typeof patch.fontFamily === 'string') span.style.fontFamily = patch.fontFamily;
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
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
  const root = range.commonAncestorContainer.parentElement;
  if (!root) return;
  const all = Array.from(root.querySelectorAll<HTMLElement>('span'));
  for (const el of all) {
    if (!range.intersectsNode(el)) continue;

    // Path 1: legacy `hl-*` class wrapper.
    const classTokens = el.className.split(/\s+/).filter(Boolean);
    const remainingClasses = classTokens.filter(
      (c) => !HL_CLASSES.includes(c as (typeof HL_CLASSES)[number]),
    );
    const strippedClass = remainingClasses.length !== classTokens.length;
    if (strippedClass) el.className = remainingClasses.join(' ');

    // Path 2: new inline-style highlight (data-highlight="1"). Drop the
    // marker, reset the inline color/weight we wrote, but leave any other
    // inline styles (font-size, font-family, …) alone.
    const isMarked = el.getAttribute('data-highlight') === '1';
    if (isMarked) {
      el.removeAttribute('data-highlight');
      el.style.color = '';
      el.style.fontWeight = '';
    }

    if (!strippedClass && !isMarked) continue;

    // Unwrap if nothing meaningful remains on the span.
    if (!el.className && !el.getAttribute('style')) {
      const parent = el.parentNode;
      if (!parent) continue;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
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
  };

  const restoreRange = () => {
    const r = lastCanvasRange.current;
    if (!r) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
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
              onClick={clearHighlights}
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
              onChange={(e) => setFontSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const n = Number((e.target as HTMLInputElement).value);
                  if (Number.isFinite(n) && n > 0) applyFontSize(n);
                  (e.target as HTMLInputElement).blur();
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
              onChange={(hex) => wrapWithStyle({ color: hex })}
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
