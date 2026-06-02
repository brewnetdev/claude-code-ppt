import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDeckStore } from '../../src/scene/store';

// Regression: removeBlock on a deeply-nested .code-block (e.g. inside
// .two-col > div > .code-block) used to silently no-op when invoked before
// the first debounced commit landed. useSlideEditing stamps data-block-id on
// such blocks at mount, but parseSlideWithLiveIds only propagated ids for
// direct children of .slide-inner — so removeBlock looked up the runtime id
// in slide.html (which still lacked it) and bailed without mutating state.

let dom: JSDOM;
const RUNTIME_CODE_BLOCK_ID = 'b-code-runtime';

function setupGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  g.window = dom.window as unknown as typeof globalThis.window;
  g.document = dom.window.document;
  g.DOMParser = dom.window.DOMParser;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
}

function teardownGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.document;
  delete g.DOMParser;
  delete g.HTMLElement;
  delete g.Element;
  delete g.Node;
}

// slide.html stored in the deck — note the .code-block has NO data-block-id
// (it's stamped only at runtime by useSlideEditing).
const STORED_SLIDE_HTML = `<div class="slide" data-template="report">
  <div class="slide-topbar"></div>
  <div class="slide-inner">
    <div class="t-chapter">3.1.6 CONTEXT WINDOW</div>
    <div class="t-title">200K 토큰 배분</div>
    <div class="two-col">
      <div>
        <div class="t-h3">컨텍스트 윈도우 5층 구조</div>
        <div class="code-block"><pre><code>┌─────┐</code></pre></div>
      </div>
      <div></div>
    </div>
  </div>
  <div class="slide-footer"></div>
</div>`;

beforeEach(() => {
  // Live DOM mirrors the stored html structurally, but the .code-block has the
  // runtime block-id stamped — exactly the state useSlideEditing leaves the DOM
  // in when slide 17 first mounts and the user hasn't typed anything yet.
  dom = new JSDOM(`<!doctype html><html><body>
    <div data-canvas-role="main">
      <div class="slide" data-template="report">
        <div class="slide-topbar"></div>
        <div class="slide-inner">
          <div class="t-chapter">3.1.6 CONTEXT WINDOW</div>
          <div class="t-title">200K 토큰 배분</div>
          <div class="two-col">
            <div>
              <div class="t-h3">컨텍스트 윈도우 5층 구조</div>
              <div class="code-block" data-block-id="${RUNTIME_CODE_BLOCK_ID}"><pre><code>┌─────┐</code></pre></div>
            </div>
            <div></div>
          </div>
        </div>
        <div class="slide-footer"></div>
      </div>
    </div>
  </body></html>`);
  setupGlobals();
});

afterEach(() => {
  teardownGlobals();
});

describe('removeBlock for deeply-nested code-blocks', () => {
  it('removes a .code-block that was stamped with a runtime id but never committed back to slide.html', () => {
    useDeckStore.getState().loadDeck([
      { id: 'slide-17', html: STORED_SLIDE_HTML, title: 'Context Window' },
    ]);

    useDeckStore.getState().removeBlock('slide-17', RUNTIME_CODE_BLOCK_ID);

    const updated = useDeckStore.getState().slides.find((s) => s.id === 'slide-17');
    expect(updated).toBeDefined();
    // The code-block should be gone from the persisted html.
    expect(updated!.html).not.toContain('class="code-block"');
    // And the surrounding structure should still be intact.
    expect(updated!.html).toContain('class="t-h3"');
    expect(updated!.html).toContain('CONTEXT WINDOW');
  });
});
