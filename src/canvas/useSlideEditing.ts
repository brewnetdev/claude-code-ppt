import { useEffect, type RefObject } from 'react';
import Sortable from 'sortablejs';
import { showToast } from '../editor/Toast';
import { DATA_BLOCK_ID, ensureBlockId } from '../scene/blockId';
import { useDeckStore } from '../scene/store';

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
      // Drag handle should not steal block selection.
      if (t.closest('.block-drag-handle')) return;
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
    const onInput = () => notify();
    root.addEventListener('input', onInput);

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
      root.removeEventListener('keydown', onCodeKeydown, true);
      root.removeEventListener('paste', onCodePaste, true);
      root.removeEventListener('drop', onCodeDrop, true);
      root.removeEventListener('beforeinput', onCodeBeforeInput, true);
      editableRegions.forEach((el) => {
        el.contentEditable = 'inherit';
      });
      insertedHandles.forEach((h) => h.remove());
      sortable?.destroy();
    };
  }, [slideRootRef, onChange, onReorder]);
}
