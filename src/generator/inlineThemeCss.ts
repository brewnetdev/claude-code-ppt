// Single source of truth for the theme CSS that the standalone-deck pipeline
// (scripts/slideplan.ts `render`/`publish`, scripts/render-plan-fixture.ts)
// inlines into the generated deck's <style> block.
//
// Previously THEME_CSS_PATHS / loadInlineCss / stripEditorOverrides were
// copy-pasted into both scripts and had DIVERGED — render-plan-fixture only
// listed brewnet-dark + code-blocks, silently dropping portfolio/report theming
// from its output. Centralising here keeps the CLI and the regression tests
// asserting the exact same inlining behaviour.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This module lives at src/generator/ — the project root is two levels up.
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Order matters: brewnet-dark base first, then the per-template overrides.
// Every theme under src/canvas/themes MUST be listed here (and in
// src/exporter/htmlBundle.ts) — a theme missing from this list renders its
// decks with only the brewnet-dark base (dark chrome leak). harness.css was
// the recurrence: added to SlideRenderer but forgotten here.
export const THEME_CSS_PATHS = [
  'src/canvas/themes/brewnet-dark.css',
  'src/canvas/themes/code-blocks.css',
  'src/canvas/themes/portfolio.css',
  'src/canvas/themes/report.css',
  'src/canvas/themes/harness.css',
];

// brewnet-dark.css ends with an editor-iframe override block (`body { margin: 0
// !important; ... }`) that only makes sense inside the editor. Standalone decks
// stack slides as a real document, so we cut everything from that marker on.
export function stripEditorOverrides(css: string): string {
  const marker = css.indexOf('body {\n  margin: 0 !important;');
  if (marker === -1) return css;
  return css.slice(0, marker).trimEnd() + '\n';
}

export function loadInlineCss(
  paths: string[] = THEME_CSS_PATHS,
  root: string = PROJECT_ROOT,
): string {
  return paths
    .map((p) => {
      const raw = readFileSync(resolve(root, p), 'utf8');
      const cleaned = p.endsWith('brewnet-dark.css') ? stripEditorOverrides(raw) : raw;
      return `/* === ${p} === */\n${cleaned}`;
    })
    .join('\n\n');
}
