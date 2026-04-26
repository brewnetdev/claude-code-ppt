import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The CLI `slideplan render` produces a standalone HTML deck with all
// theme CSS inlined into a single <style> block. These tests guard that
// invariant against accidental drops — if `THEME_CSS_PATHS` shrinks or
// `loadInlineCss` regresses, the standalone output silently loses its
// per-template visuals (amber/blue/teal accents, table emphasis, etc.).
//
// We assert against committed build artefacts in docs/html/<template>/
// rather than re-running the CLI, so the test stays fast and the artefacts
// are demonstrably the same files served by the editor library.

const ROOT = resolve(__dirname, '../..');

function readArtefact(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

function styleBlock(html: string): string {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!m) throw new Error('no <style> block in standalone HTML');
  return m[1];
}

describe('standalone HTML — portfolio sample', () => {
  const html = readArtefact('docs/html/portfolio/slideplan-sample.html');
  const css = styleBlock(html);

  it('inlines portfolio.css selectors', () => {
    expect(css).toMatch(/\[data-template="portfolio"\]\s*\{/);
  });

  it('preserves portfolio brand blue token', () => {
    expect(css).toMatch(/--amber:\s*#3D5AF1/i);
  });

  it('inlines code-blocks.css (.code-block / .terminal class definitions)', () => {
    expect(css).toMatch(/\.code-block/);
    expect(css).toMatch(/\.terminal/);
  });

  it('every slide carries data-template="portfolio"', () => {
    const matches = html.match(/data-template="portfolio"/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
  });

  it('strips the editor-only body override (margin: 0 !important)', () => {
    expect(css).not.toMatch(/body\s*\{\s*margin:\s*0\s*!important;/);
  });
});

describe('standalone HTML — report sample', () => {
  const html = readArtefact('docs/html/report/slideplan-sample.html');
  const css = styleBlock(html);

  it('inlines report.css selectors', () => {
    expect(css).toMatch(/\[data-template="report"\]\s*\{/);
  });

  it('preserves report teal accent token', () => {
    expect(css).toMatch(/--amber:\s*#0F766E/i);
  });

  it('declares the report-grade zebra row rule', () => {
    expect(css).toMatch(/tbody tr:nth-child\(even\) td/);
  });

  it('every slide carries data-template="report"', () => {
    const matches = html.match(/data-template="report"/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('standalone HTML — presentation sample', () => {
  const html = readArtefact('docs/html/presentation/slideplan-sample.html');
  const css = styleBlock(html);

  it('inlines brewnet-dark base tokens (the default presentation surface)', () => {
    expect(css).toMatch(/:root\s*\{/);
    expect(css).toMatch(/--bg/);
  });

  it('every slide carries data-template="presentation"', () => {
    const matches = html.match(/data-template="presentation"/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
  });
});
