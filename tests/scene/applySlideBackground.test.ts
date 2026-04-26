import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyBackgroundToElement,
  applyBackgroundToHtml,
  stripBackgroundFromElement,
} from '../../src/scene/applySlideBackground';

// Two layers of behaviour to lock down here:
//   1. Element mutation: applyBackgroundToElement / stripBackgroundFromElement
//      manipulate inline style on a `.slide` node — the editor renderer relies
//      on this for live in-place changes without a remount.
//   2. String mutation: applyBackgroundToHtml does the same against a
//      serialized html string — exporters (htmlBundle) hit this path.
//
// If either layer regresses, slides silently lose their picked background on
// either the live canvas or the standalone export.

let dom: JSDOM;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>');
  // applyBackgroundToHtml uses DOMParser internally — wire JSDOM's into globals.
  (globalThis as { DOMParser?: typeof DOMParser }).DOMParser = dom.window.DOMParser;
});

afterEach(() => {
  delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
});

function makeSlide(): HTMLElement {
  const el = dom.window.document.createElement('div');
  el.className = 'slide';
  return el;
}

describe('applyBackgroundToElement', () => {
  it('writes background shorthand for color bg', () => {
    const el = makeSlide();
    applyBackgroundToElement(el, { kind: 'color', value: '#FF0000' });
    expect(el.style.background).toMatch(/red|#ff0000|rgb\(255,\s*0,\s*0\)/i);
  });

  it('writes image properties for cover image bg', () => {
    const el = makeSlide();
    applyBackgroundToElement(el, {
      kind: 'image',
      src: 'data:image/png;base64,XYZ',
      fit: 'cover',
    });
    expect(el.style.backgroundImage).toContain('XYZ');
    expect(el.style.backgroundSize).toBe('cover');
    expect(el.style.backgroundRepeat).toBe('no-repeat');
  });

  it('falls back to a black backdrop for contain so letterbox bars are not transparent', () => {
    const el = makeSlide();
    applyBackgroundToElement(el, {
      kind: 'image',
      src: 'data:image/png;base64,XYZ',
      fit: 'contain',
    });
    expect(el.style.backgroundSize).toBe('contain');
    expect(el.style.backgroundColor).toBeTruthy();
  });

  it('clears bg when called with null', () => {
    const el = makeSlide();
    applyBackgroundToElement(el, { kind: 'color', value: '#FF0000' });
    expect(el.getAttribute('style')).toBeTruthy();
    applyBackgroundToElement(el, null);
    expect(el.getAttribute('style')).toBeNull();
  });

  it('is idempotent on re-apply (no leaked properties from prior bg)', () => {
    const el = makeSlide();
    applyBackgroundToElement(el, {
      kind: 'image',
      src: 'data:image/png;base64,XYZ',
      fit: 'cover',
    });
    applyBackgroundToElement(el, { kind: 'color', value: '#00FF00' });
    // After a color bg overrides an image bg, backgroundImage must no longer
    // reference the prior url. Browsers normalize to either '' or 'none'.
    expect(el.style.backgroundImage).not.toContain('XYZ');
    expect(el.style.background).toMatch(/green|#00ff00|rgb\(0,\s*255,\s*0\)/i);
  });
});

describe('stripBackgroundFromElement', () => {
  it('removes every bg property the helper writes', () => {
    const el = makeSlide();
    applyBackgroundToElement(el, {
      kind: 'image',
      src: 'data:image/png;base64,XYZ',
      fit: 'contain',
    });
    stripBackgroundFromElement(el);
    expect(el.style.backgroundImage).toBe('');
    expect(el.style.backgroundSize).toBe('');
    expect(el.style.backgroundColor).toBe('');
    expect(el.getAttribute('style')).toBeNull();
  });

  it('preserves unrelated inline styles', () => {
    const el = makeSlide();
    el.style.color = 'red';
    applyBackgroundToElement(el, { kind: 'color', value: '#0000FF' });
    stripBackgroundFromElement(el);
    expect(el.style.color).toBe('red');
  });
});

describe('applyBackgroundToHtml', () => {
  it('returns input unchanged when bg is null/undefined', () => {
    const html = '<div class="slide"><div class="slide-inner">x</div></div>';
    expect(applyBackgroundToHtml(html, null)).toBe(html);
    expect(applyBackgroundToHtml(html, undefined)).toBe(html);
  });

  it('injects a style attribute on the .slide element for a color bg', () => {
    const html = '<div class="slide" data-template="report"><div class="slide-inner">x</div></div>';
    const out = applyBackgroundToHtml(html, { kind: 'color', value: '#123456' });
    expect(out).toMatch(/<div class="slide"[^>]*style="[^"]*background[^"]*"/);
    // data-template stays put — bg shouldn't strip other attributes.
    expect(out).toContain('data-template="report"');
  });

  it('injects background-image for image bg', () => {
    const html = '<div class="slide"><div class="slide-inner">x</div></div>';
    const out = applyBackgroundToHtml(html, {
      kind: 'image',
      src: 'data:image/png;base64,ZZZ',
      fit: 'cover',
    });
    expect(out).toContain('background-image');
    expect(out).toContain('ZZZ');
  });

  it('returns html unchanged when no .slide element is present', () => {
    const html = '<section>not a slide</section>';
    const out = applyBackgroundToHtml(html, { kind: 'color', value: '#FF0000' });
    expect(out).toBe(html);
  });
});
