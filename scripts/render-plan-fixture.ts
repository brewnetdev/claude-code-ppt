// Render the hand-authored SlidePlan fixture to a standalone HTML deck.
// Used for visual regression of planRenderer before LLM authoring is wired.
//
// Usage:  npx tsx scripts/render-plan-fixture.ts
// Output: .quality-runs/plan-renderer-check/sample-plan.html
//
// The output is self-contained: brewnet-dark + code-blocks CSS are inlined
// and the editor-iframe override block is stripped so slides stack as a
// real deck. The runtime upgrade pass (shiki + macOS dots chrome) does
// NOT run here — to see those effects, register this file in BUILTIN_DECKS
// and open it through the editor instead.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPlan } from '../src/generator/planRenderer';
import { validateSlidePlan } from '../src/generator/slidePlan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const FIXTURE_PATH = resolve(ROOT, 'tests/generator/fixtures/sample-plan.json');
const OUT_DIR = resolve(ROOT, '.quality-runs/plan-renderer-check');
const OUT_HTML = resolve(OUT_DIR, 'sample-plan.html');

const THEME_CSS_PATHS = [
  'src/canvas/themes/brewnet-dark.css',
  'src/canvas/themes/code-blocks.css',
];

function stripEditorOverrides(css: string): string {
  const marker = css.indexOf('body {\n  margin: 0 !important;');
  if (marker === -1) return css;
  return css.slice(0, marker).trimEnd() + '\n';
}

function loadInlineCss(): string {
  return THEME_CSS_PATHS.map((p) => {
    const raw = readFileSync(resolve(ROOT, p), 'utf8');
    const cleaned = p.endsWith('brewnet-dark.css') ? stripEditorOverrides(raw) : raw;
    return `/* === ${p} === */\n${cleaned}`;
  }).join('\n\n');
}

function wrapDeck(title: string, css: string, slidesHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&amp;family=JetBrains+Mono:wght@400;600&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;600;700&amp;display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
}

function main() {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  const v = validateSlidePlan(raw);
  if (!v.ok) {
    console.error('SlidePlan validation failed:');
    for (const e of v.errors) console.error('  -', e);
    process.exit(1);
  }

  const slides = renderPlan(v.plan);
  const css = loadInlineCss();
  const html = wrapDeck(v.plan.meta.title, css, slides.map((s) => s.html).join('\n\n'));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_HTML, html);

  console.log(`✓ rendered ${slides.length} slides`);
  console.log(`✓ wrote ${OUT_HTML}`);
  console.log('');
  console.log('Open in browser:');
  console.log(`  open ${OUT_HTML}`);
}

main();
