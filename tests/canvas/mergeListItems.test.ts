import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { mergeListItems } from '../../src/canvas/useSlideEditing';

// mergeListItems uses the global document/window (createRange, createComment,
// getSelection). Wire JSDOM's in.
let doc: Document;
beforeAll(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  doc = dom.window.document;
  const g = globalThis as Record<string, unknown>;
  const w = dom.window as unknown as Record<string, unknown>;
  g.document = doc;
  g.window = dom.window;
  // ensureLiWrapper uses `node instanceof HTMLDivElement` — wire the element
  // constructors (and Node) from JSDOM so instanceof checks resolve.
  for (const k of ['Node', 'HTMLElement', 'HTMLDivElement', 'HTMLLIElement', 'HTMLUListElement']) {
    g[k] = w[k];
  }
});

function buildList(): { ul: HTMLUListElement; li0: HTMLLIElement; li1: HTMLLIElement } {
  const ul = doc.createElement('ul');
  ul.className = 'bullet-list';
  ul.innerHTML =
    '<li><div>A</div></li>' +
    '<li><div>B</div><ul class="sub"><li><div>nested</div></li></ul></li>';
  doc.body.appendChild(ul);
  const lis = ul.querySelectorAll('li');
  return { ul, li0: lis[0] as HTMLLIElement, li1: lis[1] as HTMLLIElement };
}

describe('mergeListItems — preserves nested sub-lists (M1)', () => {
  it('moves endLi sub-list under the merged startLi instead of dropping it', () => {
    const { ul, li0, li1 } = buildList();
    const startWrap = li0.querySelector(':scope > div') as HTMLElement;
    const endWrap = li1.querySelector(':scope > div') as HTMLElement;
    const range = doc.createRange();
    range.setStart(startWrap, startWrap.childNodes.length); // end of "A"
    range.setEnd(endWrap, 0); // start of "B"

    mergeListItems(li0, li1, range);

    const topLis = ul.querySelectorAll(':scope > li');
    expect(topLis).toHaveLength(1);
    // text merged into the survivor's wrapper
    expect(topLis[0].querySelector(':scope > div')?.textContent).toBe('AB');
    // the nested sub-list survives, re-parented under the merged <li>
    const sub = topLis[0].querySelector(':scope > ul.sub');
    expect(sub).not.toBeNull();
    expect(sub?.querySelector('li div')?.textContent).toBe('nested');
  });

  it('plain merge with no sub-list still produces one <li> with wrapper intact', () => {
    const ul = doc.createElement('ul');
    ul.innerHTML = '<li><div>A</div></li><li><div>B</div></li>';
    doc.body.appendChild(ul);
    const [li0, li1] = Array.from(ul.querySelectorAll('li')) as HTMLLIElement[];
    const startWrap = li0.querySelector(':scope > div') as HTMLElement;
    const endWrap = li1.querySelector(':scope > div') as HTMLElement;
    const range = doc.createRange();
    range.setStart(startWrap, startWrap.childNodes.length);
    range.setEnd(endWrap, 0);

    mergeListItems(li0, li1, range);

    const topLis = ul.querySelectorAll(':scope > li');
    expect(topLis).toHaveLength(1);
    expect(topLis[0].children).toHaveLength(1);
    expect(topLis[0].firstElementChild?.tagName).toBe('DIV');
    expect(topLis[0].textContent).toBe('AB');
  });
});
