import { useEffect, type RefObject } from 'react';
import Sortable from 'sortablejs';

const TEXT_SLOT_KINDS = new Set([
  'label',
  'title',
  'subtitle',
  'caption',
  'body',
  'quote',
  'page-num',
  'bullets',
]);

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

export function useSlideEditing(
  slideRootRef: RefObject<HTMLElement | null>,
  onChange?: () => void,
) {
  useEffect(() => {
    const root = slideRootRef.current;
    if (!root) return;

    const slots = root.querySelectorAll<HTMLElement>('[data-slot]');
    slots.forEach((el) => {
      const kind = el.dataset.slot ?? '';
      if (TEXT_SLOT_KINDS.has(kind)) {
        el.contentEditable = 'true';
        el.spellcheck = false;
      }
    });

    const notify = onChange ?? (() => {});
    const onInput = () => notify();
    root.addEventListener('input', onInput);

    // Links inside contenteditable hijack focus and trigger browser navigation
    // on click. Suppress navigation so editors can click-to-edit the link text.
    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (anchor && root.contains(anchor)) e.preventDefault();
    };
    root.addEventListener('click', onAnchorClick);

    const sortableRoot = root.querySelector<HTMLElement>('.slide-inner');
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
        onEnd: () => notify(),
      });
    }

    return () => {
      root.removeEventListener('input', onInput);
      root.removeEventListener('click', onAnchorClick);
      slots.forEach((el) => {
        el.contentEditable = 'inherit';
      });
      insertedHandles.forEach((h) => h.remove());
      sortable?.destroy();
    };
  }, [slideRootRef, onChange]);
}
