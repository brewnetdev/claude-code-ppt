import { useEffect, type RefObject } from 'react';
import Sortable from 'sortablejs';
import { showToast } from '../editor/Toast';
import { DATA_BLOCK_ID, ensureBlockId } from '../scene/blockId';
import { useDeckStore } from '../scene/store';
import { tryAutoLinkOnSpace } from './autoLinkUrl';
import { enforceBulletListInvariant, ensureLiWrapper } from './listInvariant';

const CODE_BLOCK_GUARD_MESSAGE =
  '코드블럭, 터미널은 컨텐츠 영역에서 직접 수정할 수 없습니다. 오른쪽 패널에서 코드를 수정한 뒤 Apply를 통해 적용됩니다.';

// Mutating keys block when the cursor is inside a code-block / terminal.
// Allow read-only navigation + copy / select-all so users can still inspect
// or grab the source.
function isMutatingKeydown(e: KeyboardEvent): boolean {
  if (e.isComposing || e.keyCode === 229) return true; // IME → would mutate
  // Modifier-driven shortcuts that don't mutate (copy, select-all, etc.) pass.
  const mod = e.metaKey || e.ctrlKey;
  if (mod) {
    const k = e.key.toLowerCase();
    if (k === 'c' || k === 'a' || k === 'x') return false;
    // Cmd+V would paste — block.
    if (k === 'v') return true;
    return false;
  }
  // Non-printable navigation keys are fine.
  const NAV = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End', 'PageUp', 'PageDown',
    'Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  ]);
  if (NAV.has(e.key)) return false;
  // Everything else (printable chars, Enter, Backspace, Delete) mutates.
  return true;
}

const SINGLE_LINE_SLOTS = new Set(['label', 'title', 'subtitle', 'caption', 'page-num']);
const DRAG_HANDLE_CLASS = 'block-drag-handle';

function createDragHandle(): HTMLElement {
  const handle = document.createElement('div');
  handle.className = DRAG_HANDLE_CLASS;
  handle.textContent = '⋮⋮';
  handle.setAttribute('aria-label', 'Drag block');
  handle.setAttribute('contenteditable', 'false');
  handle.setAttribute('draggable', 'false');
  return handle;
}

function enforceEditable(el: HTMLElement) {
  el.contentEditable = 'true';
  el.spellcheck = false;
}

// Suppress browser newline insertion in single-line slots while keeping IME
// composition functional. During hangul/japanese composition, keyCode=229
// and isComposing=true — leave those alone so the IME can commit normally.
function guardSingleLineEnter(el: HTMLElement) {
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
  });
}

function closestLi(node: Node | null): HTMLLIElement | null {
  if (!node) return null;
  const el = node instanceof Element ? node : node.parentElement;
  return el?.closest<HTMLLIElement>('li') ?? null;
}

function isInBulletOrNumList(li: HTMLLIElement): boolean {
  const ul = li.parentElement;
  if (!ul) return false;
  return ul.classList.contains('bullet-list') || ul.classList.contains('num-list');
}

// Probe whether the range's start touches the very beginning of the <li>'s
// visible content. Authoring HTML is formatted with whitespace between
// `<li>` and the inner `<div>`:
//
//   <li>
//     <div>title<span class="sub">sub</span></div>
//   </li>
//
// That whitespace is layout-irrelevant but counts as a text node, so a raw
// `probe.toString().length === 0` check would miss the "caret at start"
// case. We strip whitespace before comparing.
function isAtStartOfLi(li: HTMLLIElement, range: Range): boolean {
  const probe = document.createRange();
  probe.selectNodeContents(li);
  try {
    probe.setEnd(range.startContainer, range.startOffset);
  } catch {
    return false;
  }
  return probe.toString().trim().length === 0;
}

// Mirror of isAtStartOfLi for forward-delete: caret at the end of visible
// content (trailing structural whitespace is ignored).
function isAtEndOfLi(li: HTMLLIElement, range: Range): boolean {
  const probe = document.createRange();
  probe.selectNodeContents(li);
  try {
    probe.setStart(range.endContainer, range.endOffset);
  } catch {
    return false;
  }
  return probe.toString().trim().length === 0;
}

const LIST_DELETE_TYPES = new Set([
  'deleteContentBackward',
  'deleteContentForward',
  'deleteByCut',
  'deleteByDrag',
  'deleteWordBackward',
  'deleteWordForward',
]);

// Manual cross-<li> merge that keeps each surviving <li>'s `<div>` wrapper.
// Strategy:
//   1. Truncate startLi from range.start to end of its wrapper (drop the
//      after-caret tail of the first <li>).
//   2. Extract the after-selection tail of endLi as a DocumentFragment.
//   3. Place a Comment marker at the join point inside startWrap, then append
//      the extracted fragment after the marker.
//   4. Remove every <li> strictly between startLi and endLi, plus endLi.
//   5. Compute the marker's parent+offset, drop the marker, and seat the
//      caret at that position. Comment nodes are invisible and don't affect
//      layout, so the user never sees them; computing parent+offset before
//      removal keeps the new Range stable across the marker.remove() call.
function mergeListItems(startLi: HTMLLIElement, endLi: HTMLLIElement, range: Range): void {
  const startWrap = ensureLiWrapper(startLi);
  const endWrap = ensureLiWrapper(endLi);

  const truncStart = document.createRange();
  truncStart.setStart(range.startContainer, range.startOffset);
  truncStart.setEnd(startWrap, startWrap.childNodes.length);
  truncStart.deleteContents();

  const extractEnd = document.createRange();
  extractEnd.setStart(range.endContainer, range.endOffset);
  extractEnd.setEnd(endWrap, endWrap.childNodes.length);
  const suffixFrag = extractEnd.extractContents();

  const marker = document.createComment('cc-ppt-merge-caret');
  startWrap.appendChild(marker);
  startWrap.appendChild(suffixFrag);

  let cursor = startLi.nextElementSibling as HTMLElement | null;
  while (cursor) {
    const next = cursor.nextElementSibling as HTMLElement | null;
    const isEnd = cursor === endLi;
    cursor.remove();
    if (isEnd) break;
    cursor = next;
  }

  const parent = marker.parentNode;
  if (parent) {
    const offset = Array.prototype.indexOf.call(parent.childNodes, marker);
    marker.remove();
    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.setStart(parent, offset);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }
}

export function useSlideEditing(
  slideRootRef: RefObject<HTMLElement | null>,
  onChange?: () => void,
  onReorder?: () => void,
) {
  useEffect(() => {
    const root = slideRootRef.current;
    if (!root) return;

    const slideInner = root.querySelector<HTMLElement>('.slide-inner');
    const slideFooter = root.querySelector<HTMLElement>('.slide-footer');
    const editableRegions = [slideInner, slideFooter].filter(
      (el): el is HTMLElement => el != null,
    );

    // Make the whole content region editable so any text node — including
    // elements without data-slot — can be modified. Drag handles explicitly
    // opt out via contenteditable=false on creation.
    editableRegions.forEach(enforceEditable);

    // Sweep ephemeral selection classes that may have been baked into the
    // persisted HTML by an earlier commit (e.g., if the user typed while a
    // block was selected, commitFromDom captured the live `.selected-block`
    // class). Without this strip, switching slides or reloading the deck
    // restores stale outline rings on blocks that aren't currently selected.
    root.querySelectorAll('.selected-block').forEach((el) => {
      el.classList.remove('selected-block');
    });

    // Single-line slots get Enter suppression (IME-safe).
    const singleLineSlots = Array.from(
      root.querySelectorAll<HTMLElement>('[data-slot]'),
    ).filter((el) => SINGLE_LINE_SLOTS.has(el.dataset.slot ?? ''));
    singleLineSlots.forEach(guardSingleLineEnter);

    // Table cells aren't under data-slot; ensure they remain editable when a
    // parent is non-editable (e.g., if tables live outside .slide-inner).
    root.querySelectorAll<HTMLElement>('td, th').forEach(enforceEditable);

    // Stamp stable IDs on direct children of .slide-inner so the Properties
    // panel can refer to selected in-flow blocks. IDs survive
    // commitFromDom (cloneNode preserves attributes) so they persist across
    // history snapshots.
    if (slideInner) {
      Array.from(slideInner.children).forEach((child) => {
        if (child instanceof HTMLElement) ensureBlockId(child);
      });
      // Also stamp nested code blocks / terminals. Brewnet sample slides wrap
      // these in larger section divs (e.g., a column with h3 + code-block +
      // callout); without an id on the code-block itself, mousedown's
      // closest('[data-block-id]') would resolve to the wrapper and the
      // selection ring would frame the whole column instead of the code box
      // the user actually clicked.
      slideInner
        .querySelectorAll<HTMLElement>('.code-block, .terminal')
        .forEach((el) => {
          ensureBlockId(el);
          // Make the block itself non-editable. Even though the parent
          // .slide-inner is contenteditable=true, marking these subtrees
          // false stops the browser from accepting typing/IME inside them
          // entirely — the previous capture-listener guard relied on
          // `e.target` matching `.code-block` which is wrong for keydown
          // (target is the contenteditable host, not the deepest node).
          el.contentEditable = 'false';
        });
    }

    const onMouseDownSelect = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // Handle clicks select the block too — the grip is the most
      // discoverable affordance for "this is a block." SortableJS attaches
      // at .slide-inner (deeper in the tree) and receives mousedown before
      // this root listener, so drag-start is unaffected.
      const block = t.closest<HTMLElement>(`[${DATA_BLOCK_ID}]`);
      if (!block) return;
      const id = block.getAttribute(DATA_BLOCK_ID);
      if (!id) return;
      // Paint the selection ring synchronously here instead of waiting on
      // BlockFormatPanel's useEffect — the panel re-render path can race
      // with focus/contenteditable side effects and leave the class
      // unapplied. Strip from any previously-selected sibling first.
      root.querySelectorAll('.selected-block').forEach((n) => {
        if (n !== block) n.classList.remove('selected-block');
      });
      block.classList.add('selected-block');
      useDeckStore.getState().setSelectedBlockId(id);
      // Stop bubbling so SlideCanvas's outer mousedown (which clears
      // selection on background clicks) does not immediately undo us.
      e.stopPropagation();
    };
    root.addEventListener('mousedown', onMouseDownSelect);

    // Double-click selects ALL text in the closest text-leaf element so the
    // user can immediately retype to replace. Native dblclick only picks the
    // word under the cursor; for fast slide editing we want the whole heading,
    // bullet item, table cell, or paragraph.
    const onDblClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('.block-drag-handle')) return;
      const TEXT_LEAVES = 'li, td, th, h1, h2, h3, h4, h5, h6, p, blockquote';
      const leaf =
        t.closest<HTMLElement>(TEXT_LEAVES) ?? t.closest<HTMLElement>('[data-slot]');
      if (!leaf || !root.contains(leaf)) return;
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(leaf);
      sel.removeAllRanges();
      sel.addRange(range);
      e.preventDefault();
    };
    root.addEventListener('dblclick', onDblClick);

    // Code blocks and terminals are NOT meant to be edited inline — typing
    // inside the highlighted `<pre><code>` would corrupt the shiki tokens
    // (and Enter on an emptied <code> in some browsers escapes into the
    // sibling chrome header, duplicating the macOS dots). Block mutating
    // keys, paste, and drop here, and surface a toast pointing at the
    // CodeBlockEditPanel — the legitimate edit path.
    // True if the given DOM node sits inside a read-only code block / terminal.
    const nodeInsideReadOnlyCode = (node: Node | null): boolean => {
      if (!node) return false;
      const el = node instanceof HTMLElement ? node : node.parentElement;
      return !!el?.closest?.('.code-block, .terminal');
    };
    // True if the live caret/selection touches a read-only code block —
    // either the caret is inside one, the selection spans into one, or the
    // caret is parked immediately adjacent to one (so Backspace/Delete
    // would otherwise eat the whole block).
    const selectionTouchesReadOnlyCode = (): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      if (
        nodeInsideReadOnlyCode(range.startContainer) ||
        nodeInsideReadOnlyCode(range.endContainer)
      ) {
        return true;
      }
      // Caret collapsed inside an element node — check the children sitting
      // on either side of the cursor offset. Without this, putting the caret
      // right after a code block and pressing Backspace would silently
      // delete the whole block.
      if (range.collapsed && range.startContainer.nodeType === Node.ELEMENT_NODE) {
        const parent = range.startContainer as Element;
        const offset = range.startOffset;
        const before = parent.childNodes[offset - 1];
        const after = parent.childNodes[offset];
        const matches = (n: Node | undefined): boolean =>
          n instanceof HTMLElement && (n.matches('.code-block') || n.matches('.terminal'));
        if (matches(before) || matches(after)) return true;
      }
      return false;
    };
    const insideReadOnlyCode = (target: EventTarget | null): boolean => {
      if (nodeInsideReadOnlyCode(target as Node | null)) return true;
      // For keydown / beforeinput inside a contenteditable, the event target
      // is typically the editable host (e.g., `.slide-inner`), not the deep
      // node where the caret lives. Fall back to the live selection.
      return selectionTouchesReadOnlyCode();
    };
    const onCodeKeydown = (e: KeyboardEvent) => {
      if (!insideReadOnlyCode(e.target)) return;
      if (!isMutatingKeydown(e)) return;
      e.preventDefault();
      e.stopPropagation();
      showToast({ message: CODE_BLOCK_GUARD_MESSAGE, tone: 'warn' });
    };
    const onCodePaste = (e: ClipboardEvent) => {
      if (!insideReadOnlyCode(e.target)) return;
      e.preventDefault();
      showToast({ message: CODE_BLOCK_GUARD_MESSAGE, tone: 'warn' });
    };
    const onCodeDrop = (e: DragEvent) => {
      if (!insideReadOnlyCode(e.target)) return;
      e.preventDefault();
    };
    const onCodeBeforeInput = (e: InputEvent) => {
      if (!insideReadOnlyCode(e.target)) return;
      // Catches IME commit + drag-text-into edge cases that bypass keydown.
      e.preventDefault();
    };
    root.addEventListener('keydown', onCodeKeydown, true);
    root.addEventListener('paste', onCodePaste, true);
    root.addEventListener('drop', onCodeDrop, true);
    root.addEventListener('beforeinput', onCodeBeforeInput, true);

    const notify = onChange ?? (() => {});
    // Run the bullet/num-list wrapper invariant repair before notify() so any
    // structural breakage from paste / drag / IME / browser default fallthrough
    // is fixed before the 300ms commitFromDom snapshot writes HTML to the
    // store. The util is a no-op on already-healthy <li>s.
    const onInput = () => {
      enforceBulletListInvariant(root);
      notify();
    };
    root.addEventListener('input', onInput);

    // Cross-<li> deletion guard. Catches Backspace, Delete, Cmd+X, drag-out,
    // word-deletes, and IME-driven deletes — all of these hit `beforeinput`
    // with a delete-family `inputType` before the browser mutates the DOM.
    // For deletions confined to a single <li>, the browser default is safe
    // (chars only). Cross-<li> deletions are intercepted and replayed by
    // `mergeListItems`, which preserves each surviving <li>'s `<div>` wrapper.
    // Capture phase so this runs before code-block/etc. handlers downstream.
    const onListItemDelete = (e: InputEvent) => {
      if (!LIST_DELETE_TYPES.has(e.inputType)) return;

      // Use the LIVE selection range — `e.getTargetRanges()` for collapsed
      // Backspace at an `<li>` boundary returns a range that spans the entire
      // previous `<li>`'s wrapper (Chrome treats the inter-block edge as the
      // deletable extent). Driving mergeListItems from that obliterates the
      // previous `<li>`'s content. The selection is the user's actual caret
      // and the right anchor for our merge logic.
      const sel = window.getSelection();
      const selRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (!selRange) return;

      const isBackward =
        e.inputType === 'deleteContentBackward' || e.inputType === 'deleteWordBackward';
      const isForward =
        e.inputType === 'deleteContentForward' || e.inputType === 'deleteWordForward';

      // Collapsed caret cases — user pressed Backspace or Delete with no
      // active selection. Only intercept on the boundary positions; mid-li
      // collapsed deletes are character-only and safe to leave to the browser.
      if (selRange.collapsed) {
        const li = closestLi(selRange.startContainer);
        if (!li || !isInBulletOrNumList(li)) return;

        if (isBackward && isAtStartOfLi(li, selRange)) {
          const prev = li.previousElementSibling;
          if (!(prev instanceof HTMLLIElement)) {
            // First <li>, no previous sibling: per user decision, do nothing.
            e.preventDefault();
            return;
          }
          e.preventDefault();
          const prevWrap = ensureLiWrapper(prev);
          const curWrap = ensureLiWrapper(li);
          const mergeRange = document.createRange();
          mergeRange.setStart(prevWrap, prevWrap.childNodes.length);
          mergeRange.setEnd(curWrap, 0);
          mergeListItems(prev, li, mergeRange);
          enforceBulletListInvariant(root);
          notify();
          return;
        }

        if (isForward && isAtEndOfLi(li, selRange)) {
          const next = li.nextElementSibling;
          if (!(next instanceof HTMLLIElement)) return; // last <li>, browser default
          e.preventDefault();
          const curWrap = ensureLiWrapper(li);
          const nextWrap = ensureLiWrapper(next);
          const mergeRange = document.createRange();
          mergeRange.setStart(curWrap, curWrap.childNodes.length);
          mergeRange.setEnd(nextWrap, 0);
          mergeListItems(li, next, mergeRange);
          enforceBulletListInvariant(root);
          notify();
          return;
        }

        // Mid-li collapsed delete: browser default is safe.
        return;
      }

      // Non-collapsed selection: use the live range as-is.
      const startLi = closestLi(selRange.startContainer);
      const endLi = closestLi(selRange.endContainer);
      if (!startLi || !endLi) return;
      if (!isInBulletOrNumList(startLi) || !isInBulletOrNumList(endLi)) return;

      // Single-<li> selection: browser default only touches characters inside
      // the wrapper, wrapper invariant survives.
      if (startLi === endLi) return;

      // Refuse cross-list merges (e.g., bullet-list <li> ↔ num-list <li>).
      if (startLi.parentElement !== endLi.parentElement) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      mergeListItems(startLi, endLi, selRange);
      enforceBulletListInvariant(root);
      notify();
    };
    root.addEventListener('beforeinput', onListItemDelete, true);

    // Auto-linkify a bare URL when SPACE is pressed right after typing it.
    // Capture phase + early-return semantics so the delete handler above is
    // unaffected (different inputType domain). Read-only code blocks still
    // win because their guard runs in the same capture phase and bails
    // immediately on `insideReadOnlyCode(target)`.
    const onAutoLink = (e: InputEvent) => {
      if (insideReadOnlyCode(e.target)) return;
      if (tryAutoLinkOnSpace(e)) notify();
    };
    root.addEventListener('beforeinput', onAutoLink, true);

    // Tab inside a table cell:
    // - Forward Tab at the last cell of the last row appends a new empty row
    //   that clones the previous row's structure (so styling/striping/column
    //   layout are preserved) and parks the caret in the new row's first cell.
    // - Tab/Shift+Tab in any other cell moves the caret to the adjacent cell
    //   and selects its contents, mirroring the cell-traversal contract users
    //   expect from PowerPoint/Keynote/Excel.
    const onTableTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.isComposing || e.keyCode === 229) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const focus = sel.focusNode;
      if (!focus) return;
      const focusEl = focus instanceof Element ? focus : focus.parentElement;
      const cell = focusEl?.closest<HTMLTableCellElement>('td, th') ?? null;
      if (!cell || !root.contains(cell)) return;
      const table = cell.closest<HTMLTableElement>('table');
      if (!table) return;
      const allCells = Array.from(table.querySelectorAll<HTMLTableCellElement>('td, th'));
      const idx = allCells.indexOf(cell);
      if (idx < 0) return;

      e.preventDefault();
      const backward = e.shiftKey;

      // Forward Tab past the last cell → append a row to <tbody>.
      if (!backward && idx === allCells.length - 1) {
        const tbody = table.querySelector('tbody') ?? table;
        const templateRow =
          tbody.querySelector<HTMLTableRowElement>('tr:last-child') ??
          (cell.parentElement as HTMLTableRowElement | null);
        if (!templateRow) return;
        const newRow = templateRow.cloneNode(true) as HTMLTableRowElement;
        newRow.querySelectorAll('td, th').forEach((c) => {
          // Empty content but keep a <br> so the cell stays clickable and the
          // caret has somewhere to land. Strip any nested elements that came
          // along for the ride (e.g. `<strong>` from the template) so the
          // user starts with a clean cell.
          c.textContent = '';
          c.appendChild(document.createElement('br'));
        });
        tbody.appendChild(newRow);
        const firstCell = newRow.querySelector<HTMLTableCellElement>('td, th');
        if (firstCell) {
          const range = document.createRange();
          range.selectNodeContents(firstCell);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        notify();
        return;
      }

      const nextCell = backward ? allCells[idx - 1] : allCells[idx + 1];
      if (!nextCell) return;
      const range = document.createRange();
      range.selectNodeContents(nextCell);
      sel.removeAllRanges();
      sel.addRange(range);
    };
    root.addEventListener('keydown', onTableTab);

    // Backspace inside a fully-empty <tbody> row → delete the row.
    // Counterpart to onTableTab's "Tab past last cell appends a row":
    // empty row + single Backspace removes it. Header rows in <thead>
    // are structural and never auto-dropped, and we refuse to delete
    // the only remaining body row so the table doesn't end up shapeless.
    // Caret parks at the end of the previous row's last cell.
    const onTableBackspace = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return;
      if (e.isComposing || e.keyCode === 229) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      // A real Backspace over a non-collapsed selection should delete
      // that selection first — defer to the browser.
      if (!sel.isCollapsed) return;
      const focus = sel.focusNode;
      if (!focus) return;
      const focusEl = focus instanceof Element ? focus : focus.parentElement;
      const cell = focusEl?.closest<HTMLTableCellElement>('td, th') ?? null;
      if (!cell || !root.contains(cell)) return;
      const row = cell.parentElement as HTMLTableRowElement | null;
      if (!row) return;
      if (row.closest('thead')) return;

      const allEmpty = Array.from(row.cells).every(
        (c) => (c.textContent ?? '').trim().length === 0,
      );
      if (!allEmpty) return;

      const tbody = row.parentElement;
      if (!tbody) return;
      const bodyRows = Array.from(tbody.children).filter(
        (el): el is HTMLTableRowElement => el.tagName === 'TR',
      );
      if (bodyRows.length <= 1) return;

      e.preventDefault();
      const prev = row.previousElementSibling as HTMLTableRowElement | null;
      const next = row.nextElementSibling as HTMLTableRowElement | null;
      row.remove();

      const target =
        prev?.querySelector<HTMLTableCellElement>('td:last-child, th:last-child') ??
        next?.querySelector<HTMLTableCellElement>('td, th') ??
        null;
      if (target) {
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      notify();
    };
    root.addEventListener('keydown', onTableBackspace);

    // Enter inside a `.bullet-list` / `.num-list` <li>:
    //   plain Enter   → append a fresh `<li><div></div></li>` after the
    //                   current item and move the caret into the new wrapper.
    //                   We construct the node ourselves instead of letting
    //                   the browser split — a default split + Backspace merge
    //                   can strip the inner `<div>` wrapper and flatten the
    //                   flex row (title + `<span class="sub" style="display:block">`),
    //                   which surfaces as the "1열로 올라가는" bug.
    //   Shift+Enter   → soft break (<br>) inside the current <li>, wrapper
    //                   untouched. Same caret-parking trick as the previous
    //                   plain-Enter behavior.
    const onListItemEnter = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (e.isComposing || e.keyCode === 229) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const focus = sel.focusNode;
      if (!focus) return;
      const focusEl = focus instanceof Element ? focus : focus.parentElement;
      const li = focusEl?.closest<HTMLLIElement>('li') ?? null;
      if (!li || !root.contains(li)) return;
      const list = li.parentElement;
      if (!list) return;
      if (
        !list.classList.contains('bullet-list') &&
        !list.classList.contains('num-list')
      ) {
        return;
      }
      e.preventDefault();

      if (e.shiftKey) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement('br');
        range.insertNode(br);
        // Park the caret AFTER the <br>. If the <br> sits at the end of its
        // parent, place a zero-width text node so the caret has somewhere to
        // visually land — some browsers swallow the caret one position back
        // otherwise, defeating the line break.
        const fresh = document.createRange();
        const next = br.nextSibling;
        if (next) {
          fresh.setStartBefore(next);
        } else {
          const placeholder = document.createTextNode('​');
          br.parentNode?.appendChild(placeholder);
          fresh.setStart(placeholder, 1);
        }
        fresh.collapse(true);
        sel.removeAllRanges();
        sel.addRange(fresh);
        notify();
        return;
      }

      // Plain Enter → new bullet. Build the wrapper we need ourselves so the
      // flex layout invariant (every <li> has a single child <div>) holds for
      // the freshly inserted item. An empty text node inside the wrapper
      // gives the caret a typeable anchor without baking visible whitespace
      // into the saved HTML.
      const newLi = document.createElement('li');
      const wrapper = document.createElement('div');
      const caretAnchor = document.createTextNode('');
      wrapper.appendChild(caretAnchor);
      newLi.appendChild(wrapper);
      li.after(newLi);

      const fresh = document.createRange();
      fresh.setStart(caretAnchor, 0);
      fresh.collapse(true);
      sel.removeAllRanges();
      sel.addRange(fresh);
      notify();
    };
    root.addEventListener('keydown', onListItemEnter);

    // Anchors inside contenteditable would navigate on click — block so the
    // href text can be edited without leaving the page.
    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (anchor && root.contains(anchor)) e.preventDefault();
    };
    root.addEventListener('click', onAnchorClick);

    const sortableRoot = slideInner;
    const insertedHandles: HTMLElement[] = [];
    let sortable: Sortable | null = null;

    if (sortableRoot) {
      Array.from(sortableRoot.children).forEach((child) => {
        const block = child as HTMLElement;
        const handle = createDragHandle();
        block.appendChild(handle);
        insertedHandles.push(handle);
      });

      sortable = Sortable.create(sortableRoot, {
        animation: 150,
        handle: `.${DRAG_HANDLE_CLASS}`,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        // Commit reorders synchronously so each drag becomes its own
        // discrete history step. If we relied on the debounced input
        // path, a fast typing→drag (or drag→typing) sequence could
        // collapse into a single snapshot, making block reorders look
        // un-undoable on their own.
        onEnd: () => (onReorder ? onReorder() : notify()),
      });
    }

    return () => {
      root.removeEventListener('input', onInput);
      root.removeEventListener('click', onAnchorClick);
      root.removeEventListener('mousedown', onMouseDownSelect);
      root.removeEventListener('dblclick', onDblClick);
      root.removeEventListener('keydown', onTableTab);
      root.removeEventListener('keydown', onTableBackspace);
      root.removeEventListener('keydown', onListItemEnter);
      root.removeEventListener('keydown', onCodeKeydown, true);
      root.removeEventListener('paste', onCodePaste, true);
      root.removeEventListener('drop', onCodeDrop, true);
      root.removeEventListener('beforeinput', onCodeBeforeInput, true);
      root.removeEventListener('beforeinput', onListItemDelete, true);
      root.removeEventListener('beforeinput', onAutoLink, true);
      editableRegions.forEach((el) => {
        el.contentEditable = 'inherit';
      });
      insertedHandles.forEach((h) => h.remove());
      sortable?.destroy();
    };
  }, [slideRootRef, onChange, onReorder]);
}
