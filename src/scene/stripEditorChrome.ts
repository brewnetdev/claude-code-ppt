// Editor-only DOM decoration that must never persist into the canonical slide
// HTML (committed to the store / IndexedDB / export). Centralised so every
// commit path — SlideRenderer.commitFromDom and store.copyBlock — strips the
// exact same set. Previously each path hand-rolled its own removals, so when
// table col-resize handles were added they were stripped in neither, baking
// `.col-resize-handle` divs into persisted HTML that accumulated on remount.

const CHROME_SELECTOR = '.block-drag-handle, .col-resize-handle';
const TRANSIENT_CLASSES = ['sortable-chosen', 'sortable-ghost', 'sortable-drag', 'selected-block'];
const ZERO_WIDTH_SPACE = '​';

export function stripEditorChrome(el: HTMLElement): void {
  // The element itself may carry transient state (copyBlock clones the block
  // node, which can hold .selected-block / contenteditable directly).
  el.removeAttribute('contenteditable');
  el.classList.remove(...TRANSIENT_CLASSES);

  el.querySelectorAll(CHROME_SELECTOR).forEach((n) => n.remove());
  el.querySelectorAll('[contenteditable]').forEach((n) =>
    (n as HTMLElement).removeAttribute('contenteditable'),
  );
  el.querySelectorAll<HTMLElement>('.' + TRANSIENT_CLASSES.join(', .')).forEach((n) =>
    n.classList.remove(...TRANSIENT_CLASSES),
  );

  // Sortable leaves transient inline transform/transition on the dragged flow
  // children during the 150ms drop animation; strip so they don't bake in.
  el.querySelectorAll<HTMLElement>('.slide-inner > *').forEach((c) => {
    c.style.removeProperty('transform');
    c.style.removeProperty('transition');
    if (c.getAttribute('style') === '') c.removeAttribute('style');
  });

  stripZeroWidthSpaces(el);
}

// The soft-break (Shift+Enter at end of block) path seats the caret on a U+200B
// placeholder text node. Without stripping it the ZWSP bakes into the committed
// html and accumulates on every commit.
function stripZeroWidthSpaces(root: HTMLElement): void {
  const doc = root.ownerDocument;
  if (!doc) return;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if ((n.nodeValue ?? '').includes(ZERO_WIDTH_SPACE)) hits.push(n as Text);
  }
  for (const t of hits) {
    const cleaned = (t.nodeValue ?? '').split(ZERO_WIDTH_SPACE).join('');
    if (cleaned === '') t.remove();
    else t.nodeValue = cleaned;
  }
}
