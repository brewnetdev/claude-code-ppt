// Build the appendix deck: render the SlidePlan (report/cream), flip the
// cover + TOC + section dividers to the dark base theme (presentation), and
// interleave the 24 pre-built appendix images as full-bleed image slides
// (base64-inlined so the deck is self-contained in the editor library).
//
// This sits beside scripts/slideplan.ts and reuses the same deterministic
// renderer + inlined theme CSS — we only add the two things the SlidePlan
// pipeline intentionally does not do: mixed per-slide theming and images.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadInlineCss } from '../src/generator/inlineThemeCss';
import { renderPlan } from '../src/generator/planRenderer';
import { validateSlidePlan } from '../src/generator/slidePlan';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DECK_ID = 'appendix-claude-code-advanced';
const OUT = resolve(ROOT, 'docs/html/report', `${DECK_ID}.html`);
const IMG_DIR = resolve(ROOT, 'docs/images/appendix');

// Plan slide indices (0-based, matches `slideplan validate` order) that must
// render in the dark base theme: cover, TOC, and the 6 section dividers.
const DARK = new Set([0, 1, 2, 5, 8, 11, 14, 17]);

// Deck order: numbers = plan slide index, strings = appendix image id.
// Each section divider is followed by that section's images, then its detail.
const ORDER: (number | string)[] = [
  0, 1,
  2, 'A1-IMG-1', 'A1-IMG-2', 'A1-IMG-3', 3, 4,
  5, 'A2-IMG-1', 'A2-IMG-2', 'A2-IMG-3', 6, 7,
  8, 'A3-IMG-1', 'A3-IMG-2', 'A3-IMG-3', 9, 10,
  11, 'A4-IMG-1', 'A4-IMG-2', 'A4-IMG-3', 12, 13,
  14, 'A5-IMG-1', 'A5-IMG-2', 'A5-IMG-3', 'A5-IMG-4', 'A5-IMG-5', 15, 16,
  17, 'A6-IMG-1', 'A6-IMG-2', 'A6-IMG-3', 'A6-IMG-4', 'A6-IMG-5', 'A6-IMG-6', 'A6-IMG-7', 18, 19,
  20,
];

function flipDark(html: string): string {
  return html.replace(/data-template="report"/g, 'data-template="presentation"');
}

// Inline styles are used (not just the deck <style>) because the EDITOR renders
// decks with the app's own src/canvas/themes/*.css and ignores the deck's
// inlined <style>. Inline style on the markup is preserved by parsePresentation
// (node.outerHTML) and wins everywhere → consistent beige in editor + standalone.
const BEIGE = '#F0EDE8';
const TH_TONE = '#E7E2D9';

function imageSlide(id: string): string {
  const b64 = readFileSync(resolve(IMG_DIR, `${id}.png`)).toString('base64');
  return [
    `<div class="slide slide-appendix-image" data-template="report" data-appendix-image="${id}" data-slide-bg="${BEIGE}" style="padding:0;overflow:hidden">`,
    `  <img class="appendix-img" src="data:image/png;base64,${b64}" alt="${id}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block">`,
    '</div>',
  ].join('\n');
}

function escText(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(v: string): string {
  return escText(v).replace(/"/g, '&quot;');
}

const EXTRA_CSS = `
/* === appendix deck additions === */
/* Image slides carry their layout inline (see imageSlide); the cream
   background comes from the shared [data-template="report"].slide rule below. */
/* Keep the report topbar accent a solid bar (anti-ai-slop: no gradient) */
[data-template="report"] .slide-topbar { background: #0F766E; }
/* Unify main content background with the appendix images (beige #F0EDE8).
   Only the report (cream) content slides are affected — cover/TOC/dividers
   are data-template="presentation" (dark) and stay untouched. */
[data-template="report"].slide { background: #F0EDE8; }
/* Table header tone (images use #E7E2D9) so headers don't blend into beige */
[data-template="report"] .tbl th { background: #E7E2D9; }
`;

// Localized anti-ai-slop de-slop of the INLINED theme CSS only (source theme
// files are untouched). The shipped brewnet/report themes carry a few
// gradients + ≥20px shadows that the project's check-slop gate rejects; we
// solidify them for this generated deck so the output passes cleanly.
function stripGradients(css: string): string {
  const re = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const start = m.index;
    let i = re.lastIndex;
    let depth = 1;
    while (i < css.length && depth > 0) {
      const c = css[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      i++;
    }
    const inner = css.slice(re.lastIndex, i - 1);
    const color = inner.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/);
    out += css.slice(last, start) + (color ? color[0] : 'transparent');
    last = i;
    re.lastIndex = i;
  }
  return out + css.slice(last);
}

function capShadows(css: string): string {
  return css.replace(/box-shadow\s*:\s*([^;{}]+);/gi, (full, val: string) => {
    const big = (val.match(/(\d+(?:\.\d+)?)px/g) || []).map(parseFloat).some((n) => n >= 20);
    return big ? 'box-shadow: 0 1px 2px rgba(0,0,0,.06);' : full;
  });
}

function deslop(css: string): string {
  return capShadows(stripGradients(css));
}

function main() {
  const planPath = resolve(ROOT, '.tmp/slideplan-appendix.json');
  const res = validateSlidePlan(JSON.parse(readFileSync(planPath, 'utf8')));
  if (!res.ok) {
    console.error('✗ plan invalid:');
    for (const e of res.errors) console.error('  -', e);
    process.exit(1);
  }
  const plan = res.plan;
  const rendered = renderPlan(plan);

  const slidesHtml = ORDER.map((item) => {
    if (typeof item === 'string') return imageSlide(item);
    let h = rendered[item].html;
    if (DARK.has(item)) {
      h = flipDark(h); // cover / TOC / dividers → dark base theme
    } else {
      // content (report) slide → unified beige. data-slide-bg is read by
      // parsePresentation into the structured background field so the EDITOR
      // applies it (inline `background` would be stripped on mount); the deck
      // <style> override below covers the standalone HTML.
      h = h.replace('data-template="report">', `data-template="report" data-slide-bg="${BEIGE}">`);
      // table headers: contrasting tone so they don't blend into the beige
      h = h.replace(/<th>/g, `<th style="background:${TH_TONE}">`);
    }
    return h;
  }).join('\n\n');

  // Drop the unused portfolio theme; de-slop the inlined theme CSS.
  const themeCss = loadInlineCss([
    'src/canvas/themes/brewnet-dark.css',
    'src/canvas/themes/code-blocks.css',
    'src/canvas/themes/report.css',
  ]);
  const css = deslop(themeCss) + '\n' + EXTRA_CSS;
  // Hash over slides + CSS so CSS-only theme changes (e.g. the beige unify)
  // still bump deck-source-hash → the editor's "원본 갱신" banner fires and the
  // cached deck refreshes instead of serving stale colors.
  const sourceHash = createHash('sha256').update(slidesHtml + '\n<style>' + css, 'utf8').digest('hex').slice(0, 32);
  const subtitle = plan.meta.subtitle ?? '';

  // NOTE: deliberately NO data-template on <html>. The renderer puts it on each
  // .slide; report.css uses descendant selectors ([data-template="report"]
  // .slide-topbar), so an <html>-level attr would re-theme the dark slides too.
  // Per-slide attributes alone give correct mixed theming.
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escText(plan.meta.title)}</title>
<meta name="subtitle" content="${escAttr(subtitle)}">
<meta name="deck-source-hash" content="${escAttr(sourceHash)}">
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

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, html);
  const count = ORDER.length;
  console.log(`✓ built ${count} slides → ${OUT}`);
  console.log(`  deck id:  ${DECK_ID}`);
  console.log(`  src hash: ${sourceHash}`);
  console.log(`  size:     ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
}

main();
