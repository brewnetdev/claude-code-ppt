import { useEffect, type RefObject } from 'react';
import Sortable from 'sortablejs';

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

    // Single-line slots get Enter suppression (IME-safe).
    const singleLineSlots = Array.from(
      root.querySelectorAll<HTMLElement>('[data-slot]'),
    ).filter((el) => SINGLE_LINE_SLOTS.has(el.dataset.slot ?? ''));
    singleLineSlots.forEach(guardSingleLineEnter);

    // Table cells aren't under data-slot; ensure they remain editable when a
    // parent is non-editable (e.g., if tables live outside .slide-inner).
    root.querySelectorAll<HTMLElement>('td, th').forEach(enforceEditable);

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
      editableRegions.forEach((el) => {
        el.contentEditable = 'inherit';
      });
      insertedHandles.forEach((h) => h.remove());
      sortable?.destroy();
    };
  }, [slideRootRef, onChange, onReorder]);
}
