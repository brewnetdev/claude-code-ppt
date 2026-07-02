import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { stripEditorChrome } from '../../src/scene/stripEditorChrome';

// Fulfils M0's `it.todo('M1: commit serialization strips editor chrome')`.
let doc: Document;
beforeAll(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  doc = dom.window.document;
  (globalThis as { NodeFilter?: unknown }).NodeFilter = dom.window.NodeFilter;
  (globalThis as { Node?: unknown }).Node = dom.window.Node;
});

function el(html: string): HTMLElement {
  const d = doc.createElement('div');
  d.innerHTML = html;
  return d.firstElementChild as HTMLElement;
}

describe('stripEditorChrome (M1)', () => {
  it('removes baked-in .col-resize-handle and .block-drag-handle', () => {
    const slide = el(
      '<div class="slide"><div class="slide-inner">' +
        '<table><tbody><tr><td>x<div class="col-resize-handle"></div></td></tr></tbody></table>' +
        '<div class="block-drag-handle">::</div>' +
        '</div></div>',
    );
    stripEditorChrome(slide);
    expect(slide.querySelector('.col-resize-handle')).toBeNull();
    expect(slide.querySelector('.block-drag-handle')).toBeNull();
  });

  it('strips contenteditable on the element itself and descendants', () => {
    const block = el('<div class="block" contenteditable="true"><span contenteditable="true">x</span></div>');
    stripEditorChrome(block);
    expect(block.hasAttribute('contenteditable')).toBe(false);
    expect(block.querySelector('[contenteditable]')).toBeNull();
  });

  it('removes transient classes from the element and descendants', () => {
    const block = el('<div class="block selected-block"><p class="sortable-ghost">x</p></div>');
    stripEditorChrome(block);
    expect(block.classList.contains('selected-block')).toBe(false);
    expect(block.querySelector('.sortable-ghost')).toBeNull();
  });

  it('strips U+200B placeholders and removes emptied text nodes', () => {
    const slide = el('<div class="slide"><div class="slide-inner"><p>a​b</p><p>​</p></div></div>');
    stripEditorChrome(slide);
    expect(slide.textContent).toBe('ab');
    expect(slide.innerHTML).not.toContain('​');
  });

  it('strips transient inline transform/transition but keeps real styles', () => {
    const slide = el(
      '<div class="slide"><div class="slide-inner">' +
        '<div style="transform: translate(1px, 2px); transition: all 150ms; color: red;">x</div>' +
        '</div></div>',
    );
    stripEditorChrome(slide);
    const child = slide.querySelector('.slide-inner > div') as HTMLElement;
    expect(child.style.transform).toBe('');
    expect(child.style.transition).toBe('');
    expect(child.style.color).toBe('red');
  });
});
