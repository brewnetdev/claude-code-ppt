import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyHighlight,
  clearHighlights,
  selectionInsideCanvas,
  wrapWithStyle,
} from '../../src/editor/textFormatActions';

// Reproduces the actual editor DOM stack so the helpers exercise the same
// ancestor-walk path they do at runtime:
//   .slide-canvas-host > .overlay-layer > .overlay-item.overlay-text >
//     .overlay-text-inner[contenteditable]
let dom: JSDOM;
let document: Document;
let editable: HTMLDivElement;

function buildOverlayDom(initialHtml: string) {
  dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div class="slide-canvas-host">
          <div class="overlay-layer">
            <div class="overlay-item overlay-text">
              <div class="overlay-text-inner" contenteditable="true">${initialHtml}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  document = dom.window.document;
  editable = document.querySelector('.overlay-text-inner') as HTMLDivElement;

  const g = globalThis as Record<string, unknown>;
  g.window = dom.window as unknown as typeof globalThis.window;
  g.document = dom.window.document;
  g.Node = dom.window.Node;
  g.HTMLElement = dom.window.HTMLElement;
  g.InputEvent = dom.window.InputEvent;
  g.Range = dom.window.Range;
}

function selectAll(host: Element) {
  const range = document.createRange();
  range.selectNodeContents(host);
  const sel = dom.window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

function selectFirstTextRange(host: Element, start: number, end: number) {
  const text = host.firstChild as Text;
  const range = document.createRange();
  range.setStart(text, start);
  range.setEnd(text, end);
  const sel = dom.window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.document;
  delete g.Node;
  delete g.HTMLElement;
  delete g.InputEvent;
  delete g.Range;
});

describe('selectionInsideCanvas', () => {
  beforeEach(() => buildOverlayDom('hello world'));

  it('returns the range when selection is inside .slide-canvas-host', () => {
    selectFirstTextRange(editable, 0, 5);
    const r = selectionInsideCanvas();
    expect(r).not.toBeNull();
    expect(r!.toString()).toBe('hello');
  });

  it('returns null when nothing is selected', () => {
    expect(selectionInsideCanvas()).toBeNull();
  });

  it('returns null when selection is collapsed (caret only)', () => {
    selectFirstTextRange(editable, 3, 3);
    expect(selectionInsideCanvas()).toBeNull();
  });

  it('returns null when selection is outside the canvas host', () => {
    const outside = document.createElement('div');
    outside.textContent = 'foreign';
    document.body.appendChild(outside);
    const text = outside.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 4);
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(selectionInsideCanvas()).toBeNull();
  });
});

describe('applyHighlight', () => {
  beforeEach(() => buildOverlayDom('keep important text'));

  it('wraps the selection in a marked span with the swatch hex inline', () => {
    selectFirstTextRange(editable, 5, 14); // "important"
    applyHighlight('#34D399');

    const span = editable.querySelector('span[data-highlight="1"]') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('important');
    // JSDOM normalises the hex to lowercase rgb-ish — accept either form.
    const color = span.style.color.toLowerCase();
    expect(['#34d399', 'rgb(52, 211, 153)']).toContain(color);
    expect(span.style.fontWeight).toBe('700');
  });

  it('fires bubbling input event on the contenteditable host', () => {
    selectFirstTextRange(editable, 5, 14);
    let fired = false;
    editable.addEventListener('input', (e) => {
      // Must bubble so the parent React onInput handler at the same node
      // receives it. JSDOM bubbles natively when bubbles:true is set.
      if (e.bubbles) fired = true;
    });
    applyHighlight('#F59E0B');
    expect(fired).toBe(true);
  });

  it('still wraps when surroundContents would throw (selection spans element boundary)', () => {
    // Set up "<b>important</b> text" then select across the </b> boundary
    editable.innerHTML = '<b>important</b> text';
    const b = editable.querySelector('b')!;
    const range = document.createRange();
    range.setStart(b.firstChild as Text, 5); // "tant"
    range.setEnd(editable.lastChild as Text, 4); // " tex"
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    applyHighlight('#3B82F6');
    const span = editable.querySelector('span[data-highlight="1"]');
    expect(span).not.toBeNull();
  });
});

describe('wrapWithStyle (color)', () => {
  beforeEach(() => buildOverlayDom('plain text content'));

  it('wraps selection in a span with inline color', () => {
    selectFirstTextRange(editable, 6, 10); // "text"
    wrapWithStyle({ color: '#000000' });

    const spans = editable.querySelectorAll('span');
    expect(spans.length).toBe(1);
    expect(spans[0].textContent).toBe('text');
    const color = spans[0].style.color.toLowerCase();
    expect(['#000000', 'rgb(0, 0, 0)', 'black']).toContain(color);
  });

  it('removes color when set to null and unwraps bare span', () => {
    editable.innerHTML = '<span style="color: rgb(239, 68, 68);">painted</span> tail';
    selectAll(editable);
    wrapWithStyle({ color: null });

    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('painted tail');
  });
});

describe('wrapWithStyle (fontSize)', () => {
  beforeEach(() => buildOverlayDom('size me up'));

  it('wraps selection in span with inline font-size', () => {
    selectFirstTextRange(editable, 5, 7); // "me"
    wrapWithStyle({ fontSize: '24px' });

    const span = editable.querySelector('span') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('me');
    expect(span.style.fontSize).toBe('24px');
  });

  it('removes font-size when set to null and unwraps bare span', () => {
    editable.innerHTML = '<span style="font-size: 32px;">big</span> small';
    selectAll(editable);
    wrapWithStyle({ fontSize: null });

    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('big small');
  });

  it('preserves other inline styles when one key is removed', () => {
    editable.innerHTML =
      '<span style="font-size: 32px; color: rgb(239, 68, 68);">red big</span>';
    selectAll(editable);
    wrapWithStyle({ fontSize: null });

    const span = editable.querySelector('span') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.style.fontSize).toBe('');
    // color should still be there
    expect(span.style.color).not.toBe('');
  });
});

describe('clearHighlights', () => {
  beforeEach(() => buildOverlayDom(''));

  it('strips data-highlight span and inline color/weight, preserves text', () => {
    editable.innerHTML =
      'before <span data-highlight="1" style="color: rgb(245, 158, 11); font-weight: 700;">marked</span> after';
    selectAll(editable);
    clearHighlights();

    expect(editable.querySelector('span[data-highlight]')).toBeNull();
    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('before marked after');
  });

  it('strips legacy hl-* classes and unwraps bare wrappers', () => {
    editable.innerHTML = 'before <span class="hl-amber">old</span> after';
    selectAll(editable);
    clearHighlights();

    expect(editable.querySelector('.hl-amber')).toBeNull();
    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('before old after');
  });

  it('strips highlight marker AND any remaining text-format inline styles', () => {
    // Clear is the "nuclear reset" — once invoked it removes data-highlight
    // markers, hl-* classes, and arbitrary color/fontSize/fontFamily inline
    // styles in range so the user can recover from any accumulated state.
    editable.innerHTML =
      '<span data-highlight="1" style="color: rgb(96, 165, 250); font-weight: 700; font-size: 28px;">multi</span>';
    selectAll(editable);
    clearHighlights();

    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('multi');
  });
});

describe('regression: transform-mode (contenteditable=false) still formats via .overlay-text-inner host', () => {
  // PowerPoint pattern: a single-click selects the overlay (transform mode,
  // Moveable owns drag) → React renders contenteditable={false} on the inner
  // div. The previous host-walk required `contenteditable !== "false"` and
  // returned null, making every wrapWithStyle / clearHighlights call a silent
  // no-op for template-inserted boxes that the user hadn't yet promoted to
  // edit mode. The .overlay-text-inner class fallback fixes that.
  function buildTransformModeDom(initialHtml: string) {
    dom = new JSDOM(`
      <!doctype html>
      <html><body>
        <div class="slide-canvas-host">
          <div class="overlay-layer">
            <div class="overlay-item overlay-text">
              <div class="overlay-text-inner" contenteditable="false">${initialHtml}</div>
            </div>
          </div>
        </div>
      </body></html>
    `);
    document = dom.window.document;
    editable = document.querySelector('.overlay-text-inner') as HTMLDivElement;
    const g = globalThis as Record<string, unknown>;
    g.window = dom.window as unknown as typeof globalThis.window;
    g.document = dom.window.document;
    g.Node = dom.window.Node;
    g.HTMLElement = dom.window.HTMLElement;
    g.InputEvent = dom.window.InputEvent;
    g.Range = dom.window.Range;
  }

  it('wrapWithStyle({color}) applies even when contenteditable="false"', () => {
    buildTransformModeDom('hello');
    selectFirstTextRange(editable, 0, 5);
    wrapWithStyle({ color: '#000000' });

    const span = editable.querySelector('span') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('hello');
  });

  it('clearHighlights nukes formatting even when contenteditable="false"', () => {
    buildTransformModeDom('<span style="color: rgb(245, 158, 11);">tinted</span>');
    selectAll(editable);
    clearHighlights();
    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('tinted');
  });
});

describe('regression: wrapWithStyle does not accumulate spans on repeated apply', () => {
  beforeEach(() => buildOverlayDom('hello world'));

  it('applying fontSize twice on the same text leaves one span with the latest size', () => {
    selectFirstTextRange(editable, 0, 5);
    wrapWithStyle({ fontSize: '12px' });

    // Re-select the wrapped text and apply a different size.
    const span = editable.querySelector('span')!;
    const text = span.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    wrapWithStyle({ fontSize: '24px' });

    const spans = editable.querySelectorAll('span');
    expect(spans.length).toBe(1);
    expect((spans[0] as HTMLElement).style.fontSize).toBe('24px');
  });

  it('applying color over an existing color span does not nest', () => {
    selectFirstTextRange(editable, 0, 5);
    wrapWithStyle({ color: '#FF0000' });

    const span = editable.querySelector('span')!;
    const text = span.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    wrapWithStyle({ color: '#0000FF' });

    const spans = editable.querySelectorAll('span');
    expect(spans.length).toBe(1);
  });
});

describe('regression: block-element inline color is stripped so outer color wins', () => {
  // Repro the TextBlockTemplates initialiser shape:
  //   <div style="color:#F1F5F9">텍스트 입력</div>
  // Without the cleanup pass, an outer `<span style="color:#000">` wrapping
  // the div loses to the inner div in the DOM cascade, so the user-applied
  // color appears not to take effect.
  beforeEach(() =>
    buildOverlayDom('<div style="color: rgb(241, 245, 249);">텍스트 입력</div>'),
  );

  it('wrapWithStyle({color}) clears block-element color and wraps with new color', () => {
    const div = editable.querySelector('div') as HTMLElement;
    const text = div.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, text.nodeValue!.length);
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    wrapWithStyle({ color: '#000000' });

    expect(div.style.color).toBe('');
    const span = editable.querySelector('span') as HTMLElement;
    expect(span).not.toBeNull();
    const c = span.style.color.toLowerCase();
    expect(['#000000', 'rgb(0, 0, 0)', 'black']).toContain(c);
  });
});

describe('regression: clearHighlights nukes wrapWithStyle spans + block inline styles', () => {
  beforeEach(() => buildOverlayDom(''));

  it('strips inline color/fontSize from a wrapWithStyle span and unwraps it', () => {
    editable.innerHTML =
      '<span style="color: rgb(239, 68, 68); font-size: 24px;">painted</span>';
    selectAll(editable);
    clearHighlights();

    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('painted');
  });

  it("strips block element's inline color but preserves the structural element", () => {
    editable.innerHTML =
      '<div style="color: rgb(241, 245, 249);">target</div>';
    selectAll(editable);
    clearHighlights();

    const div = editable.querySelector('div') as HTMLElement;
    expect(div).not.toBeNull();
    expect(div.style.color).toBe('');
    expect(div.textContent).toBe('target');
  });

  it('clears mixed state — wrapWithStyle span + data-highlight + block color', () => {
    editable.innerHTML =
      '<div style="color: rgb(241, 245, 249);">' +
      '<span style="font-size: 24px;">sized</span> ' +
      '<span data-highlight="1" style="color: rgb(245, 158, 11); font-weight: 700;">marked</span>' +
      '</div>';
    selectAll(editable);
    clearHighlights();

    const div = editable.querySelector('div') as HTMLElement;
    expect(div).not.toBeNull();
    expect(div.style.color).toBe('');
    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('sized marked');
  });
});

describe('cross-span queries (regression: selection inside single text node)', () => {
  // Original bug: `clearHighlights` and `wrapWithStyle` (removal path) used
  // `range.commonAncestorContainer.parentElement` as the query root. When the
  // selection sits entirely inside ONE highlighted span's text node, the
  // commonAncestorContainer is that text node and parentElement is the span
  // itself — which has no descendant spans, so nothing gets cleared. The
  // editable-host walk fixes this by always querying from the contenteditable
  // root.
  beforeEach(() => buildOverlayDom(''));

  it('clearHighlights finds the span when selection is inside its text', () => {
    editable.innerHTML =
      '<span data-highlight="1" style="color: rgb(52, 211, 153); font-weight: 700;">target</span>';
    const span = editable.querySelector('span')!;
    const text = span.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, text.nodeValue!.length);
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    clearHighlights();

    expect(editable.querySelector('span[data-highlight]')).toBeNull();
    expect(editable.textContent).toBe('target');
  });

  it('wrapWithStyle removal finds the span when selection is inside its text', () => {
    editable.innerHTML =
      '<span style="color: rgb(239, 68, 68);">crimson</span>';
    const span = editable.querySelector('span')!;
    const text = span.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, text.nodeValue!.length);
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    wrapWithStyle({ color: null });

    expect(editable.querySelector('span')).toBeNull();
    expect(editable.textContent).toBe('crimson');
  });
});

// Regression: cleanup pass must NOT strip styles from a parent span when the
// user only selects PART of its text. Prior bug: applying red to "text" inside
// `<span style="color:blue">plain text content</span>` stripped+unwrapped the
// parent span, turning "plain " and " content" black. The fix anchors the
// "fully in range" probe at the element's deepest first/last leaf so a
// (text, 0)..(text, length) range only covers the span when ALL its text is
// selected — partial-overlap leaves the span intact.
describe('regression: wrapWithStyle preserves parent color on partial selection', () => {
  beforeEach(() => buildOverlayDom(''));

  it('keeps parent span color for un-selected siblings when only inner text is wrapped', () => {
    editable.innerHTML =
      '<span style="color: rgb(0, 0, 255);">plain text content</span>';
    const span = editable.querySelector('span')!;
    const text = span.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 6); // "text"
    range.setEnd(text, 10);
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    wrapWithStyle({ color: '#FF0000' });

    // Outer span MUST keep its blue — this is the user-reported bug.
    const outer = editable.querySelector('span') as HTMLElement;
    expect(outer).not.toBeNull();
    expect(outer.style.color).toMatch(/rgb\(0, 0, 255\)|#0000ff|blue/i);

    // The wrapped portion should be a nested red span.
    const inner = outer.querySelector('span') as HTMLElement;
    expect(inner).not.toBeNull();
    expect(inner.textContent).toBe('text');
    expect(inner.style.color.toLowerCase()).toMatch(
      /rgb\(255, 0, 0\)|#ff0000|red/i,
    );
  });
});
