import { useEffect, type RefObject } from 'react';
import Sortable from 'sortablejs';
import { DATA_BLOCK_ID, ensureBlockId } from '../scene/blockId';
import { useDeckStore } from '../scene/store';

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
      useDeckStore.getState().setSelectedBlockId(id);
      // Stop bubbling so SlideCanvas's outer mousedown (which clears
      // selection on background clicks) does not immediately undo us.
      e.stopPropagation();
    };
    root.addEventListener('mousedown', onMouseDownSelect);

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
      editableRegions.forEach((el) => {
        el.contentEditable = 'inherit';
      });
      insertedHandles.forEach((h) => h.remove());
      sortable?.destroy();
    };
  }, [slideRootRef, onChange, onReorder]);
}
