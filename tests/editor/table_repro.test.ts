import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it } from 'vitest';
import { wrapWithStyle } from '../../src/editor/textFormatActions';

let dom: JSDOM;
let document: Document;

function setupGlobals() {
  const g = globalThis as Record<string, unknown>;
  g.window = dom.window as unknown as typeof globalThis.window;
  g.document = dom.window.document;
  g.Node = dom.window.Node;
  g.HTMLElement = dom.window.HTMLElement;
  g.InputEvent = dom.window.InputEvent;
  g.Range = dom.window.Range;
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

describe('table cross-cell repro', () => {
  it('cross-cell selection: fontSize applied per-cell as inline style', () => {
    dom = new JSDOM(`
      <!doctype html>
      <html><body>
        <div class="slide-canvas-host">
          <div class="slide">
            <div class="slide-inner" contenteditable="true">
              <table class="tbl"><tbody>
                <tr><td contenteditable="true" id="a">기법</td><td contenteditable="true" id="b">정의</td></tr>
                <tr><td contenteditable="true" id="c">Zero-shot</td><td contenteditable="true" id="d">예시 없이</td></tr>
              </tbody></table>
            </div>
          </div>
        </div>
      </body></html>
    `);
    document = dom.window.document;
    setupGlobals();

    // Simulate a cell-level drag selection from cell A to cell D.
    const a = document.getElementById('a')!.firstChild as Text;
    const d = document.getElementById('d')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(a, 0);
    range.setEnd(d, d.length);
    const sel = dom.window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    wrapWithStyle({ fontSize: '20px' });

    // Cross-cell selection applies fontSize directly on td (preserves table
    // structure). Span-wrapping would corrupt the table because the span gets
    // hoisted out of <tr> by the browser's HTML parser.
    const tds = Array.from(document.querySelectorAll('td'));
    const sized = tds.filter((td) => td.style.fontSize === '20px');
    const tableRows = document.querySelectorAll('table > tbody > tr').length;

    // All cells get the style, and the table structure stays intact.
    expect(sized.length).toBe(tds.length);
    expect(tableRows).toBe(2);
    // No stray spans wrapping cell content (the failure mode of the old code).
    expect(document.querySelectorAll('table span').length).toBe(0);
  });
});
