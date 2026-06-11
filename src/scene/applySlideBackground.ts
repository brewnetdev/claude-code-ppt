import type { SlideBackground } from '../importer/parsePresentation';

// Properties we own. Browsers (and JSDOM) expand the `background` shorthand
// into eight longhands; we list all of them so a strip leaves zero residue.
// If we ever stop using the shorthand, this set still works — removeProperty
// is a no-op for properties that weren't set.
const BG_PROPS = [
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'background-origin',
  'background-clip',
  'background-attachment',
] as const;

// Imperatively apply (or clear) a slide background on a live `.slide` element.
// Used by SlideRenderer on mount and whenever the bg field changes.
export function applyBackgroundToElement(
  el: HTMLElement,
  bg: SlideBackground | null | undefined,
): void {
  for (const p of BG_PROPS) el.style.removeProperty(p);
  if (!bg) {
    if (el.getAttribute('style') === '') el.removeAttribute('style');
    return;
  }
  if (bg.kind === 'color') {
    el.style.setProperty('background', bg.value);
    return;
  }
  el.style.setProperty('background-image', `url("${bg.src}")`);
  el.style.setProperty('background-size', bg.fit);
  el.style.setProperty('background-position', 'center');
  el.style.setProperty('background-repeat', 'no-repeat');
  if (bg.fit === 'contain') el.style.setProperty('background-color', '#000');
}

// Strip the bg-related inline properties from a `.slide` element. Called from
// SlideRenderer.commitFromDom so a runtime-applied background never leaks
// into the persisted html string.
export function stripBackgroundFromElement(el: HTMLElement): void {
  for (const p of BG_PROPS) el.style.removeProperty(p);
  if (el.getAttribute('style') === '') el.removeAttribute('style');
}

// Apply a background to an html string by parsing, mutating, re-serializing.
// Used by exporters where we don't have a live DOM yet.
export function applyBackgroundToHtml(
  html: string,
  bg: SlideBackground | null | undefined,
): string {
  if (!bg) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const slide = doc.querySelector<HTMLElement>('div.slide');
  if (!slide) return html;
  applyBackgroundToElement(slide, bg);
  return slide.outerHTML;
}
