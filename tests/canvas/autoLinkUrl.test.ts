import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tryAutoLinkOnSpace } from '../../src/canvas/autoLinkUrl';

// Mock InputEvent shape — JSDOM's InputEvent does not accept the full init dict
// we need (`inputType` / `data`), and we need to drive `preventDefault()` from
// the test. Cast to InputEvent at the call site so the helper sees a stable
// surface area.
type FakeInputEvent = {
  inputType: string;
  data: string | null;
  defaultPrevented: boolean;
  preventDefault(): void;
};

function fakeEvent(inputType: string, data: string | null): FakeInputEvent {
  return {
    inputType,
    data,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

let dom: JSDOM;
let document: Document;
let host: HTMLDivElement;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body><div id="host" contenteditable></div></body></html>');
  document = dom.window.document;
  host = document.getElementById('host') as HTMLDivElement;
  // tryAutoLinkOnSpace reaches into globals: `window`, `document`, `Node`.
  // Wire JSDOM onto globalThis so the module-under-test runs in node env.
  const g = globalThis as Record<string, unknown>;
  g.window = dom.window as unknown as typeof globalThis.window;
  g.document = dom.window.document;
  g.Node = dom.window.Node;
});

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.document;
  delete g.Node;
});

function setCaret(textNode: Text, offset: number) {
  const sel = dom.window.getSelection();
  if (!sel) throw new Error('no selection');
  const range = document.createRange();
  range.setStart(textNode, offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

describe('tryAutoLinkOnSpace', () => {
  it('wraps a bare URL when SPACE is typed right after it', () => {
    host.textContent = 'visit https://run-ai.kr';
    const text = host.firstChild as Text;
    setCaret(text, text.nodeValue!.length);

    const e = fakeEvent('insertText', ' ');
    const handled = tryAutoLinkOnSpace(e as unknown as InputEvent);

    expect(handled).toBe(true);
    expect(e.defaultPrevented).toBe(true);
    const a = host.querySelector('a');
    expect(a).not.toBeNull();
    expect(a!.getAttribute('href')).toBe('https://run-ai.kr');
    expect(a!.getAttribute('target')).toBe('_blank');
    expect(a!.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a!.textContent).toBe('https://run-ai.kr');
    // Visible result: "visit <a>https://run-ai.kr</a> "
    expect(host.textContent).toBe('visit https://run-ai.kr ');
  });

  it('strips a trailing period off the URL', () => {
    host.textContent = 'docs at https://example.com.';
    const text = host.firstChild as Text;
    setCaret(text, text.nodeValue!.length);

    const e = fakeEvent('insertText', ' ');
    const handled = tryAutoLinkOnSpace(e as unknown as InputEvent);

    expect(handled).toBe(true);
    const a = host.querySelector('a');
    expect(a!.getAttribute('href')).toBe('https://example.com');
    // The "." stays as a sibling text fragment, not inside the anchor.
    expect(a!.textContent).toBe('https://example.com');
    expect(host.textContent).toBe('docs at https://example.com. ');
  });

  it('parks the caret in a fresh text node AFTER the space', () => {
    host.textContent = 'see https://x.com';
    const text = host.firstChild as Text;
    setCaret(text, text.nodeValue!.length);

    tryAutoLinkOnSpace(fakeEvent('insertText', ' ') as unknown as InputEvent);

    const sel = dom.window.getSelection()!;
    const range = sel.getRangeAt(0);
    // Caret should sit in a text node that is NOT inside the <a> — otherwise
    // continued typing would extend the link text indefinitely.
    let p: Element | null = (range.startContainer as Node).parentElement;
    while (p) {
      expect(p.tagName).not.toBe('A');
      if (p === host) break;
      p = p.parentElement;
    }
    expect(range.collapsed).toBe(true);
  });

  it('ignores non-SPACE inputs', () => {
    host.textContent = 'see https://x.com';
    const text = host.firstChild as Text;
    setCaret(text, text.nodeValue!.length);

    expect(
      tryAutoLinkOnSpace(fakeEvent('insertText', 'a') as unknown as InputEvent),
    ).toBe(false);
    expect(
      tryAutoLinkOnSpace(
        fakeEvent('insertParagraph', null) as unknown as InputEvent,
      ),
    ).toBe(false);
    expect(host.querySelector('a')).toBeNull();
  });

  it('does nothing when the caret is not at the URL boundary', () => {
    host.textContent = 'https://x.com here';
    const text = host.firstChild as Text;
    // caret is at end ("here" follows the URL) — URL is not the trailing token
    setCaret(text, text.nodeValue!.length);

    expect(
      tryAutoLinkOnSpace(fakeEvent('insertText', ' ') as unknown as InputEvent),
    ).toBe(false);
    expect(host.querySelector('a')).toBeNull();
  });

  it('skips when the caret is inside an existing <a>', () => {
    host.innerHTML = '<a href="https://prev.com">https://prev.com</a>';
    const a = host.querySelector('a')!;
    const text = a.firstChild as Text;
    setCaret(text, text.nodeValue!.length);
    // Now extend the text inside the anchor with a fake URL — same scenario
    // as if the user kept typing past the link.
    text.nodeValue = `${text.nodeValue} https://new.com`;
    setCaret(text, text.nodeValue!.length);

    const handled = tryAutoLinkOnSpace(
      fakeEvent('insertText', ' ') as unknown as InputEvent,
    );

    expect(handled).toBe(false);
    // No new anchor wrapping; we leave existing-anchor scope alone.
    expect(host.querySelectorAll('a').length).toBe(1);
  });

  it('skips when caret is inside <code>', () => {
    host.innerHTML = '<code>see https://x.com</code>';
    const code = host.querySelector('code')!;
    const text = code.firstChild as Text;
    setCaret(text, text.nodeValue!.length);

    const handled = tryAutoLinkOnSpace(
      fakeEvent('insertText', ' ') as unknown as InputEvent,
    );

    expect(handled).toBe(false);
    expect(host.querySelector('a')).toBeNull();
  });

  it('handles a URL at the very start of the text node', () => {
    host.textContent = 'https://only.com';
    const text = host.firstChild as Text;
    setCaret(text, text.nodeValue!.length);

    const handled = tryAutoLinkOnSpace(
      fakeEvent('insertText', ' ') as unknown as InputEvent,
    );

    expect(handled).toBe(true);
    const a = host.querySelector('a');
    expect(a).not.toBeNull();
    expect(a!.getAttribute('href')).toBe('https://only.com');
  });
});
