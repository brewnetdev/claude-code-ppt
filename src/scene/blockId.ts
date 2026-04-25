// Stable block identifier for in-flow content blocks (.slide-inner > *).
// Persisted as a `data-block-id` attribute so it survives commitFromDom →
// store → re-render round-trips. The attribute is preserved by the cloneNode
// path in SlideRenderer (only transform/transition inline styles are
// stripped); brewnet sample HTML never sets this attribute, so we generate
// fresh IDs lazily on first stamp.

export const DATA_BLOCK_ID = 'data-block-id';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function makeBlockId(): string {
  let out = 'b';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[(Math.random() * ALPHABET.length) | 0];
  }
  return out;
}

export function ensureBlockId(el: HTMLElement): string {
  const existing = el.getAttribute(DATA_BLOCK_ID);
  if (existing) return existing;
  const id = makeBlockId();
  el.setAttribute(DATA_BLOCK_ID, id);
  return id;
}
