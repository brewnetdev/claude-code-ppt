// Importer coverage (M0 safety net + red-first locks for M5).
//
// parsePresentationHTML had zero direct unit tests (finding
// importer-zero-test-coverage). These pin the edge cases the editor relies on
// and lock the data-slide-bg round-trip RED until M5 completes it.
import { beforeAll, describe, expect, it } from 'vitest';
import { installDomParser } from '../_utils/jsdom';
import { parsePresentationHTML } from '../../src/importer/parsePresentation';
import { applyBackgroundToHtml } from '../../src/scene/applySlideBackground';

beforeAll(() => installDomParser());

const slide = (inner: string, attrs = '') =>
  `<div class="slide" data-template="report"${attrs ? ' ' + attrs : ''}>` +
  `<div class="slide-inner">${inner}</div></div>`;

describe('parsePresentationHTML — edge cases', () => {
  it('empty input / empty body yields zero slides (no throw)', () => {
    expect(parsePresentationHTML('').slides).toHaveLength(0);
    expect(
      parsePresentationHTML('<!doctype html><html><body></body></html>').slides,
    ).toHaveLength(0);
  });

  it('single slide parses with id, title and html', () => {
    const { slides } = parsePresentationHTML(slide('<div data-slot="title">Hello</div>'));
    expect(slides).toHaveLength(1);
    expect(slides[0].id).toBe('slide-1');
    expect(slides[0].title).toBe('Hello');
    expect(slides[0].html).toContain('<div class="slide');
    expect(slides[0].background).toBeUndefined();
  });

  it('overlay-free slide with no title slot falls back to "Slide N"', () => {
    const { slides } = parsePresentationHTML(slide('plain text only'));
    expect(slides).toHaveLength(1);
    expect(slides[0].title).toBe('Slide 1');
    expect(slides[0].background).toBeUndefined();
  });

  it('reads data-slide-bg (color) into the structured background field', () => {
    const { slides } = parsePresentationHTML(slide('x', 'data-slide-bg="#F0EDE8"'));
    expect(slides[0].background).toEqual({ kind: 'color', value: '#F0EDE8' });
  });

  it('ignores an invalid data-slide-bg value', () => {
    const { slides } = parsePresentationHTML(slide('x', 'data-slide-bg="not-a-color"'));
    expect(slides[0].background).toBeUndefined();
  });

  it('parses a multi-slide deck preserving order', () => {
    const { slides } = parsePresentationHTML(
      slide('<div data-slot="title">A</div>') + slide('<div data-slot="title">B</div>'),
    );
    expect(slides.map((s) => s.title)).toEqual(['A', 'B']);
    expect(slides.map((s) => s.id)).toEqual(['slide-1', 'slide-2']);
  });
});

// RED-first locks for M5 (export must re-emit data-slide-bg). applyBackgroundToHtml
// currently bakes an inline `background` style onto .slide, but the parser only
// restores from data-slide-bg — so the color/image is LOST on re-import.
// `it.fails` passes while the bug exists; when M5 makes applyBackgroundToHtml
// stamp data-slide-bg (+ -image/-fit), these flip to failing → change to it().
describe('background round-trip — RED until M5', () => {
  it.fails('color background survives applyBackgroundToHtml → parsePresentationHTML', () => {
    const baked = applyBackgroundToHtml(slide('x'), { kind: 'color', value: '#F0EDE8' });
    const { slides } = parsePresentationHTML(baked);
    expect(slides[0].background).toEqual({ kind: 'color', value: '#F0EDE8' });
  });

  it.fails('image background survives the same round-trip', () => {
    const baked = applyBackgroundToHtml(slide('x'), {
      kind: 'image',
      src: 'https://example.com/y.png',
      fit: 'cover',
    });
    const { slides } = parsePresentationHTML(baked);
    expect(slides[0].background).toEqual({
      kind: 'image',
      src: 'https://example.com/y.png',
      fit: 'cover',
    });
  });
});

// Scaffolds for later milestones (full DOM/editor harness lands with each).
describe('scaffold — later milestones', () => {
  // M1 commit-serialization (strips .col-resize-handle / ZWSP) is now covered by
  // tests/scene/stripEditorChrome.test.ts.
  it.todo('M6: overlay padding/object-fit parity across editor / htmlBundle / pngExport / present');
});
