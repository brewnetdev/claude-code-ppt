import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ensureLiWrapper,
  enforceBulletListInvariant,
} from '../../src/canvas/listInvariant';

// The invariant: every <li> under .bullet-list / .num-list must have exactly
// one direct child <div> (the wrapper that holds the title text + .sub
// decoration). When the browser's native edit (Backspace at li boundary,
// paste, drag-replace) strips that wrapper, the slide CSS — which keys
// `.bullet-list li { display: flex }` and `.bullet-list li .sub { display: block }`
// off the wrapper — collapses every list row into one inline run. Repairing
// the shape here is what keeps the editor's "delete a character" UX from
// silently mangling the structure of every list it touches.

let dom: JSDOM;
let document: Document;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>');
  document = dom.window.document;
  // listInvariant uses bare `document` and `instanceof HTMLDivElement` —
  // wire JSDOM's globals onto globalThis so the module-under-test runs in
  // the node environment configured by vitest.
  const g = globalThis as Record<string, unknown>;
  g.document = dom.window.document;
  g.HTMLDivElement = dom.window.HTMLDivElement;
  g.HTMLLIElement = dom.window.HTMLLIElement;
});

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.document;
  delete g.HTMLDivElement;
  delete g.HTMLLIElement;
});

describe('ensureLiWrapper', () => {
  it('returns the existing single <div> child unchanged', () => {
    const li = document.createElement('li');
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('hello'));
    li.appendChild(div);

    const result = ensureLiWrapper(li);

    expect(result).toBe(div);
    expect(li.childNodes.length).toBe(1);
    expect(li.firstChild).toBe(div);
  });

  it('rewraps loose text + span.sub children into a fresh <div>', () => {
    const li = document.createElement('li');
    li.appendChild(document.createTextNode('Title'));
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = 'sub-detail';
    li.appendChild(sub);

    const wrap = ensureLiWrapper(li);

    expect(li.childNodes.length).toBe(1);
    expect(li.firstChild).toBe(wrap);
    expect(wrap.tagName).toBe('DIV');
    expect(wrap.childNodes.length).toBe(2);
    expect(wrap.firstChild?.textContent).toBe('Title');
    expect(wrap.lastChild).toBe(sub);
    expect(li.querySelector(':scope > .sub')).toBeNull();
    expect(li.querySelector(':scope > div > .sub')).toBe(sub);
  });

  it('preserves text-node identity across the rewrap', () => {
    const li = document.createElement('li');
    const text = document.createTextNode('Identity probe');
    li.appendChild(text);

    ensureLiWrapper(li);

    // The same Text node is moved (not cloned) into the wrapper. This is
    // what lets an active selection Range pointing into the text node stay
    // valid when the invariant runs after browser-level edits.
    expect(li.firstChild?.firstChild).toBe(text);
  });

  it('wraps an empty <li> with an empty <div>', () => {
    const li = document.createElement('li');

    const wrap = ensureLiWrapper(li);

    expect(li.childNodes.length).toBe(1);
    expect(li.firstChild).toBe(wrap);
    expect(wrap.childNodes.length).toBe(0);
  });

  it('rewraps when there are multiple <div>s as direct children', () => {
    const li = document.createElement('li');
    const a = document.createElement('div');
    a.textContent = 'one';
    const b = document.createElement('div');
    b.textContent = 'two';
    li.appendChild(a);
    li.appendChild(b);

    const wrap = ensureLiWrapper(li);

    expect(li.childNodes.length).toBe(1);
    expect(li.firstChild).toBe(wrap);
    expect(wrap.childNodes.length).toBe(2);
    expect(wrap.firstChild).toBe(a);
    expect(wrap.lastChild).toBe(b);
  });
});

describe('enforceBulletListInvariant', () => {
  it('repairs every broken <li> in .bullet-list and .num-list', () => {
    const root = document.createElement('section');
    root.innerHTML = `
      <ul class="bullet-list">
        <li>title 1<span class="sub">sub 1</span></li>
        <li><div>title 2<span class="sub">sub 2</span></div></li>
      </ul>
      <ol class="num-list">
        <li>numbered<span class="sub">numbered sub</span></li>
      </ol>
    `;

    enforceBulletListInvariant(root);

    const lis = root.querySelectorAll('li');
    lis.forEach((li) => {
      expect(li.children.length, li.outerHTML).toBe(1);
      expect(li.firstElementChild?.tagName).toBe('DIV');
      // .sub must be inside the wrapper, not a direct child of <li>.
      const directSub = li.querySelector(':scope > .sub');
      expect(directSub, li.outerHTML).toBeNull();
    });
  });

  it('is idempotent on healthy <li>s', () => {
    const root = document.createElement('section');
    root.innerHTML = `
      <ul class="bullet-list">
        <li><div>title<span class="sub">sub</span></div></li>
      </ul>
    `;
    const before = root.innerHTML;

    enforceBulletListInvariant(root);
    enforceBulletListInvariant(root);

    expect(root.innerHTML).toBe(before);
  });

  it('does not touch <ul>s outside .bullet-list / .num-list', () => {
    const root = document.createElement('section');
    root.innerHTML = `
      <ul>
        <li>raw item one</li>
        <li>raw item two</li>
      </ul>
    `;
    const before = root.innerHTML;

    enforceBulletListInvariant(root);

    // Plain <ul> items must remain untouched — we only own bullet/num lists.
    expect(root.innerHTML).toBe(before);
  });

  it('handles an empty <li> by giving it an empty <div>', () => {
    const root = document.createElement('section');
    root.innerHTML = `<ul class="bullet-list"><li></li></ul>`;

    enforceBulletListInvariant(root);

    const li = root.querySelector('li');
    expect(li?.children.length).toBe(1);
    expect(li?.firstElementChild?.tagName).toBe('DIV');
    expect(li?.firstElementChild?.children.length).toBe(0);
  });
});
