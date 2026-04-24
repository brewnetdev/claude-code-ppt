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
]);

export function useSlideEditing(slideRootRef: RefObject<HTMLElement | null>) {
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

    const sortableRoot = root.querySelector<HTMLElement>('.slide-inner');
    let sortable: Sortable | null = null;
    if (sortableRoot) {
      sortable = Sortable.create(sortableRoot, {
        animation: 150,
        delay: 250,
        delayOnTouchOnly: false,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        filter: '[contenteditable="true"]:focus',
        preventOnFilter: false,
      });
    }

    return () => {
      slots.forEach((el) => {
        el.contentEditable = 'inherit';
      });
      sortable?.destroy();
    };
  }, [slideRootRef]);
}
