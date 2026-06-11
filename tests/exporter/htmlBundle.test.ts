import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildHtmlBundle } from '../../src/exporter/htmlBundle';
import type { ParsedSlide } from '../../src/importer/parsePresentation';

// buildHtmlBundle reaches for the ambient `document` / `DOMParser` (linkify +
// applyBackgroundToHtml). The vitest env is `node`, so wire JSDOM onto the
// globals the bundler touches. No overlays/blobs here, so `fetch`/`FileReader`
// are never exercised.
beforeEach(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const g = globalThis as Record<string, unknown>;
  g.document = dom.window.document;
  g.DOMParser = dom.window.DOMParser;
  g.NodeFilter = dom.window.NodeFilter;
});

function slide(html: string, id = 'slide-1', title = 'X'): ParsedSlide {
  return { id, html, title };
}

const REPORT_SLIDE = slide(
  '<div class="slide" data-template="report"><div class="slide-inner"><h1 class="t-title">제목</h1></div></div>',
);

describe('buildHtmlBundle theme bundling', () => {
  it('ships all four theme stylesheets, not just brewnet-dark', async () => {
    const out = await buildHtmlBundle({ slides: [REPORT_SLIDE], overlaysBySlide: {} });
    // report.css light token block — proves the report theme is present so a
    // report deck no longer falls back to the dark base (the original bug).
    expect(out).toContain('[data-template="report"]');
    expect(out).toContain('#FAFAF8'); // report --bg (warm off-white)
    // portfolio.css present too → all per-template overrides are bundled.
    expect(out).toContain('[data-template="portfolio"]');
    // brewnet-dark base is still the foundation.
    expect(out).toMatch(/--bg:\s*#0F172A/);
  });

  it('stamps the deck dominant template onto <html> for a report deck', async () => {
    const out = await buildHtmlBundle({ slides: [REPORT_SLIDE], overlaysBySlide: {} });
    expect(out).toContain('<html lang="ko" data-template="report">');
  });

  it('drives the page surround from the theme, not a hardcoded dark color', async () => {
    const out = await buildHtmlBundle({ slides: [REPORT_SLIDE], overlaysBySlide: {} });
    // The export <style> must resolve the surround from the theme var so a
    // light deck gets a light surround (regression guard for `#020617`).
    expect(out).toMatch(/html\s*\{\s*background:\s*var\(--bg\)/);
    // The old hardcoded surround rule must be gone.
    expect(out).not.toContain('background: #020617; color: #f1f5f9');
  });

  it('leaves <html> untemplated for a deck with no data-template (brewnet)', async () => {
    const brewnet = slide('<div class="slide"><div class="slide-inner"><h1>T</h1></div></div>');
    const out = await buildHtmlBundle({ slides: [brewnet], overlaysBySlide: {} });
    expect(out).toContain('<html lang="ko">');
  });

  it('wraps each slide stage in .slide-canvas-host so host-scoped code-block CSS matches', async () => {
    const out = await buildHtmlBundle({ slides: [REPORT_SLIDE], overlaysBySlide: {} });
    // The editor renders slides inside `.slide-canvas-host` (SlideCanvas.tsx);
    // code-blocks.css scopes ALL terminal chrome + code padding/line-height
    // under that ancestor. The export must reproduce it or terminals lose
    // their padding and line spacing.
    expect(out).toContain('class="export-stage slide-canvas-host"');
    // And the host-scoped rules must actually be in the bundle to match.
    expect(out).toContain('.slide-canvas-host .terminal');
    expect(out).toMatch(/\.slide-canvas-host \.terminal pre\s*\{[^}]*line-height:\s*1\.7/);
  });

  it('preserves an inline text overlay baked into slide html (page-61 case)', async () => {
    // Text overlays live inline in the slide html (only image overlays are
    // promoted into the overlay store), so they must survive export untouched.
    const withOverlay = slide(
      '<div class="slide" data-template="report"><div class="slide-inner"></div>' +
        '<div class="export-overlay export-overlay-text" style="left:834px;top:495px;width:417px;height:144px;background:transparent;">' +
        '<div class="t-body"><span style="color: rgb(24, 24, 27);">5. Show Command 메뉴</span></div></div></div>',
    );
    const out = await buildHtmlBundle({ slides: [withOverlay], overlaysBySlide: {} });
    expect(out).toContain('export-overlay-text');
    expect(out).toContain('5. Show Command 메뉴');
  });
});
