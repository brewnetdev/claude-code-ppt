// Pure DOM operations behind the Text Format panel. Extracted from
// TextFormatPanel.tsx so they can be unit-tested under JSDOM without
// rendering React. The panel stays in charge of detecting selection state
// and wiring buttons; this module only knows "given a range inside the
// canvas, apply this transform to it."

const HL_CLASSES = ['hl-amber', 'hl-blue', 'hl-green', 'hl-cyan'] as const;

export function selectionInsideCanvas(): Range | null {
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

// Walk up from a node to the nearest element that should act as the formatting
// root — the element whose `querySelectorAll('*')` covers all inline spans we
// need to rewrite.
//
// Priority order:
//   1. Nearest ancestor with contenteditable != 'false'  (edit mode: the inner
//      div is contenteditable="true" / "plaintext-only" etc.)
//   2. Nearest ancestor with class `overlay-text-inner`  (transform mode: React
//      renders contentEditable={false} which becomes contenteditable="false" in
//      the DOM; the old logic skipped this element and returned null, making
//      every formatting action a silent no-op while the overlay was in
//      single-click / Moveable mode)
//
// We deliberately do NOT use the `isContentEditable` DOM property because JSDOM
// and some cascade edge-cases don't surface it reliably — the explicit attribute
// and class checks behave identically in real browsers and in unit tests.
function nearestFormatHost(node: Node | null): HTMLElement | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as HTMLElement;
      const ce = el.getAttribute('contenteditable');
      // Accept any non-false contenteditable value (true / "" / plaintext-only).
      if (ce !== null && ce !== 'false') return el;
      // Fallback: the overlay text inner wrapper is the correct formatting root
      // even when the overlay is in transform mode (contenteditable="false").
      if (el.classList.contains('overlay-text-inner')) return el;
    }
    cur = cur.parentNode;
  }
  return null;
}

// Notify the contenteditable so the host's debounced commit fires after our
// programmatic edits. Dispatches on the editable host directly (not on the
// range's container, which may be a freshly inserted span or a text node
// whose ancestry path through React's reconciler is uncertain). The host is
// the element whose `onInput` React listener owns store commits.
export function notifyInput(range: Range): void {
  const host = nearestFormatHost(range.commonAncestorContainer);
  if (!host) return;
  host.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

// WYSIWYG highlight: write the swatch hex straight into inline `style` and
// flag the span with `data-highlight="1"` so Clear can find it later.
export function applyHighlight(color: string): void {
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

export type InlineStylePatch = {
  color?: string | null;
  fontSize?: string | null;
  fontFamily?: string | null;
};
const INLINE_STYLE_KEYS = ['color', 'fontSize', 'fontFamily'] as const;

// When the live selection straddles two or more table cells in the same
// table, `range.surroundContents` throws (boundary splits a non-Text node)
// and the `extractContents` fallback inserts a `<span>` between `<tr>`s —
// invalid markup that the browser hoists out of the table, dropping every
// style we tried to apply. Detect this case and return the cells so the
// caller can apply styles per-cell as block-level inline style instead,
// which preserves table structure and matches the user's likely intent
// ("make these cells bigger/coloured").
function intersectingCellsAcrossBoundary(range: Range): HTMLTableCellElement[] | null {
  // Resolve to the nearest element starting from commonAncestorContainer,
  // then closest('table'). Avoids `instanceof HTMLTableElement` which is
  // unreliable across JSDOM-driven test environments where the constructor
  // isn't bound on the global. tagName check on a found element works the
  // same in browsers and in tests.
  const start =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;
  if (!start) return null;
  const table = start.closest('table');
  if (!table) return null;
  const cells = Array.from(
    table.querySelectorAll<HTMLTableCellElement>('td, th'),
  ).filter((c) => range.intersectsNode(c));
  return cells.length > 1 ? cells : null;
}

function applyPatchToCells(
  cells: HTMLTableCellElement[],
  patch: InlineStylePatch,
): void {
  const keys = INLINE_STYLE_KEYS.filter((k) => patch[k] !== undefined);
  for (const cell of cells) {
    // Strip nested span styles for the keys being set so cell-level inline
    // wins on the cascade — same intent as the single-range cleanup pass.
    cell.querySelectorAll<HTMLElement>('*').forEach((el) => {
      let touched = false;
      for (const k of keys) {
        if ((el.style as unknown as Record<string, string>)[k]) {
          (el.style as unknown as Record<string, string>)[k] = '';
          touched = true;
        }
      }
      if (!touched) return;
      if (el.tagName === 'SPAN' && !el.getAttribute('style') && !el.className) {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });
    for (const k of keys) {
      const v = patch[k];
      (cell.style as unknown as Record<string, string>)[k] =
        typeof v === 'string' ? v : '';
    }
  }
}

// True iff `range` covers ALL of `el`'s text content. Used to decide
// which descendants the cleanup pass may safely strip styles from. The
// previous `range.intersectsNode` check fired for partial-overlap
// descendants too — so selecting "text" inside
// `<span style="color:blue">plain text content</span>` and applying red
// would strip the parent span's blue and unwrap it, turning "plain " and
// " content" black even though only "text" was supposed to change.
//
// We compare against a probe range anchored at `el`'s deepest first/last
// leaves (not `selectNode` / `selectNodeContents` which both anchor at the
// element-level boundaries). The reason: a range whose endpoints sit at a
// text-node's offsets `(text, 0)` and `(text, length)` is the canonical
// "select all of this element's text" shape, but in tree order
// `(span, 0)` is BEFORE `(text, 0)` — so anchoring the probe at the span
// itself makes that range look like a partial-overlap. Anchoring at the
// deepest leaf instead gives us position-equivalence with the typical
// select-all selection.
function isElementFullyInRange(el: Element, range: Range): boolean {
  const probe = el.ownerDocument!.createRange();
  let firstLeaf: Node = el;
  while (firstLeaf.firstChild) firstLeaf = firstLeaf.firstChild;
  let lastLeaf: Node = el;
  while (lastLeaf.lastChild) lastLeaf = lastLeaf.lastChild;
  try {
    probe.setStart(firstLeaf, 0);
    if (lastLeaf.nodeType === Node.TEXT_NODE) {
      probe.setEnd(lastLeaf, (lastLeaf as Text).length);
    } else {
      probe.setEndAfter(lastLeaf);
    }
  } catch {
    return false;
  }
  return (
    range.compareBoundaryPoints(Range.START_TO_START, probe) <= 0 &&
    range.compareBoundaryPoints(Range.END_TO_END, probe) >= 0
  );
}

// `<span style="…">` wrapper for the active selection. Each property
// supports `null` = remove that one inline style from intersecting elements,
// or a string value to set+wrap (also clearing the same key from intersecting
// elements first, so applying fontSize twice doesn't accumulate nested spans
// and a block-level `<div style="color:…">` doesn't out-specificity an outer
// color wrapper via DOM-cascade proximity).
export function wrapWithStyle(patch: InlineStylePatch): void {
  const range = selectionInsideCanvas();
  if (!range) return;

  // Multi-cell selection diverts to per-cell block-level inline style.
  // Anything that crosses td/th boundaries can't be wrapped in one span
  // without corrupting the table; per-cell apply preserves structure.
  const cells = intersectingCellsAcrossBoundary(range);
  if (cells) {
    applyPatchToCells(cells, patch);
    notifyInput(range);
    return;
  }

  const host = nearestFormatHost(range.commonAncestorContainer);
  if (!host) return;

  // Cleanup pass: strip every key that's being set or removed from
  // descendants that are FULLY contained by the range. Partial-overlap
  // descendants (range covers only part of their content) and ancestors of
  // the range are intentionally skipped — they hold styling that applies
  // to *neighboring un-selected text*, and stripping it would corrupt
  // colors/sizes outside the user's selection. The wrap span we create
  // below sits deeper in the cascade than any ancestor and wins via
  // specificity, so we don't need to clear ancestor styles.
  // Bare SPANs are unwrapped after cleanup; block elements stay structural.
  const keysInPatch = INLINE_STYLE_KEYS.filter((k) => patch[k] !== undefined);
  if (keysInPatch.length > 0) {
    const all = Array.from(host.querySelectorAll<HTMLElement>('*'));
    for (const el of all) {
      if (el === host) continue;
      if (!isElementFullyInRange(el, range)) continue;
      let touched = false;
      for (const k of keysInPatch) {
        if ((el.style as unknown as Record<string, string>)[k]) {
          (el.style as unknown as Record<string, string>)[k] = '';
          touched = true;
        }
      }
      if (!touched) continue;
      if (el.tagName === 'SPAN' && !el.getAttribute('style') && !el.className) {
        const parent = el.parentNode;
        if (!parent) continue;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    }
  }

  const stillHas = INLINE_STYLE_KEYS.some((k) => typeof patch[k] === 'string');
  if (!stillHas) {
    notifyInput(range);
    return;
  }

  // Cleanup may have unwrapped spans, restructuring the DOM. The original
  // `range` text-node endpoints are still valid (children get re-parented,
  // not removed), so reuse it directly.
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

// Nuclear reset: strip every form of text formatting in the selection so
// the user can recover from arbitrary state. Cleans (1) data-highlight
// markers + their companion font-weight, (2) legacy hl-* classes, (3) any
// arbitrary `color`/`fontSize`/`fontFamily` inline style on spans created
// by `wrapWithStyle`, and (4) the same inline keys on block elements like
// the template-injected `<div style="color:#F1F5F9">`. Bare spans are
// unwrapped; block elements stay as structural nodes.
export function clearHighlights(): void {
  const range = selectionInsideCanvas();
  if (!range) return;
  const host = nearestFormatHost(range.commonAncestorContainer);
  if (!host) return;
  const all = Array.from(host.querySelectorAll<HTMLElement>('*'));
  for (const el of all) {
    if (el === host) continue;
    if (!range.intersectsNode(el)) continue;

    let touched = false;

    const classTokens = el.className.split(/\s+/).filter(Boolean);
    const remainingClasses = classTokens.filter(
      (c) => !HL_CLASSES.includes(c as (typeof HL_CLASSES)[number]),
    );
    if (remainingClasses.length !== classTokens.length) {
      el.className = remainingClasses.join(' ');
      touched = true;
    }

    if (el.getAttribute('data-highlight') === '1') {
      el.removeAttribute('data-highlight');
      el.style.fontWeight = '';
      touched = true;
    }

    for (const k of INLINE_STYLE_KEYS) {
      if ((el.style as unknown as Record<string, string>)[k]) {
        (el.style as unknown as Record<string, string>)[k] = '';
        touched = true;
      }
    }

    if (!touched) continue;

    if (el.tagName === 'SPAN' && !el.className && !el.getAttribute('style')) {
      const parent = el.parentNode;
      if (!parent) continue;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  }
  notifyInput(range);
}

export function toggleCmd(cmd: 'bold' | 'italic' | 'underline'): void {
  if (!selectionInsideCanvas()) return;
  document.execCommand(cmd);
  const range = selectionInsideCanvas();
  if (range) notifyInput(range);
}
