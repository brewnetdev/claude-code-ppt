// CLI for the SlidePlan pipeline.
//
//   slideplan validate <plan.json>
//   slideplan render <plan.json> [out.html]
//   slideplan score <plan.json> <source.md>
//   slideplan publish <plan.json> <deck-id> [--subtitle "..."] [--force]
//
// `validate` prints the same errors that the in-app validator returns and
// exits non-zero on failure — used by the md-to-slidedeck skill before
// rendering. `render` produces a standalone HTML deck (brewnet-dark + code
// blocks CSS inlined, editor overrides stripped) suitable for opening in a
// browser. To get shiki / macOS dots chrome, the deck must instead be loaded
// through the editor (which runs upgradeSlideCodeBlocks at boot).
// `score` measures coverage of the source MD by the rendered plan against
// the 11-category rubric — exits non-zero when ratio < 0.85 so the
// md-to-slidedeck skill can detect silent content loss.
// `publish` writes the rendered deck into docs/html/<template>/<deck-id>.html
// where the registry's import.meta.glob picks it up on next dev-server boot.
// The deck id becomes the localStorage key, so it should be stable and unique.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPlan } from '../src/generator/planRenderer';
import { parseMarkdown } from '../src/generator/parseMarkdown';
import { detectFeatures } from '../src/generator/quality/detector';
import { scoreHtml } from '../src/generator/quality/scorer';
import { sanitizeRawHtml } from '../src/generator/sanitizeRawHtml';
import { validateSlidePlan } from '../src/generator/slidePlan';

const SCORE_HARD_GATE = 0.85;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const THEME_CSS_PATHS = [
  'src/canvas/themes/brewnet-dark.css',
  'src/canvas/themes/code-blocks.css',
  'src/canvas/themes/portfolio.css',
  'src/canvas/themes/report.css',
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

function escapeAttr(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Stable identity for the deck's source content. Used by the editor to detect
// when a built-in deck's HTML on disk has been re-published since the user's
// IndexedDB cache was written. Only the slide markup contributes — wrapper
// chrome (font links, subtitle meta, CSS) is excluded so cosmetic boilerplate
// changes don't churn the hash.
function computeDeckSourceHash(slidesHtml: string): string {
  return createHash('sha256').update(slidesHtml, 'utf8').digest('hex').slice(0, 32);
}

function wrapDeck(
  title: string,
  css: string,
  slidesHtml: string,
  opts?: { subtitle?: string; sourceHash?: string },
): string {
  const subtitleMeta =
    opts?.subtitle && opts.subtitle.trim().length > 0
      ? `\n<meta name="subtitle" content="${escapeAttr(opts.subtitle.trim())}">`
      : '';
  const sourceHashMeta =
    opts?.sourceHash && opts.sourceHash.length > 0
      ? `\n<meta name="deck-source-hash" content="${escapeAttr(opts.sourceHash)}">`
      : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeText(title)}</title>${subtitleMeta}${sourceHashMeta}
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

function loadPlan(planPath: string) {
  if (!existsSync(planPath)) {
    console.error(`✗ plan file not found: ${planPath}`);
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(planPath, 'utf8'));
  const result = validateSlidePlan(raw);
  return { raw, result };
}

function cmdValidate(planPath: string): never {
  const { result } = loadPlan(planPath);
  if (!result.ok) {
    console.error('✗ SlidePlan validation FAILED');
    for (const e of result.errors) console.error('  -', e);
    process.exit(1);
  }
  console.log(`✓ SlidePlan OK (${result.plan.slides.length} slides, template=${result.plan.template})`);
  for (const s of result.plan.slides) {
    const tag = s.type.padEnd(18);
    const summary =
      s.type === 'cover'
        ? s.title
        : s.type === 'section'
          ? `${s.num} · ${s.title}`
          : s.title;
    console.log(`  ${tag} ${summary}`);
  }
  process.exit(0);
}

function cmdRender(planPath: string, outPath: string | undefined): never {
  const { result } = loadPlan(planPath);
  if (!result.ok) {
    console.error('✗ Cannot render — plan failed validation:');
    for (const e of result.errors) console.error('  -', e);
    process.exit(1);
  }
  const plan = result.plan;
  const slides = renderPlan(plan);

  const finalOut =
    outPath ?? resolve(ROOT, '.quality-runs/slideplan/' + safeStem(planPath) + '.html');
  mkdirSync(dirname(finalOut), { recursive: true });

  const css = loadInlineCss();
  const html = wrapDeck(plan.meta.title, css, slides.map((s) => s.html).join('\n\n'));
  writeFileSync(finalOut, html);
  console.log(`✓ rendered ${slides.length} slides → ${finalOut}`);
  console.log('');
  console.log('Open in browser:');
  console.log(`  open ${finalOut}`);
  process.exit(0);
}

function cmdScore(planPath: string, mdPath: string): never {
  const { result } = loadPlan(planPath);
  if (!result.ok) {
    console.error('✗ Cannot score — plan failed validation:');
    for (const e of result.errors) console.error('  -', e);
    process.exit(1);
  }
  if (!existsSync(mdPath)) {
    console.error(`✗ source MD not found: ${mdPath}`);
    process.exit(2);
  }

  // Render the agent-authored plan to HTML using the same emitter the editor
  // uses. We do NOT rely on the bundled standalone wrapper here — the scorer
  // only inspects slide-level structure (`<div class="slide">`).
  const slides = renderPlan(result.plan);
  const html = slides.map((s) => s.html).join('\n');

  // Parse the source MD identically to the automated pipeline so feature
  // counts match what the rubric expects. sanitizeRawHtml strips embedded
  // raw <svg>/<div> noise that would otherwise inflate text-coverage probes.
  const source = readFileSync(mdPath, 'utf8');
  const tree = parseMarkdown(source);
  sanitizeRawHtml(tree);
  const features = detectFeatures(tree);

  const score = scoreHtml(html, features);

  console.log('═══ Coverage Report ═══');
  console.log(`  plan:   ${planPath}`);
  console.log(`  source: ${mdPath}`);
  console.log(`  ratio:  ${(score.ratio * 100).toFixed(1)}% (${score.earned}/${score.presentMax})`);
  console.log(`  gate:   ratio ≥ ${(SCORE_HARD_GATE * 100).toFixed(0)}% → ${score.ratio >= SCORE_HARD_GATE ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log('  ID    Label        Score   Detail');
  console.log('  ───── ──────────── ─────── ────────────────────────────────────────');
  for (const item of score.items) {
    const idCol = item.id.padEnd(5);
    const labelCol = item.label.padEnd(10);
    const scoreCol = (item.score === null ? 'N/A' : `${item.score}/10`).padEnd(7);
    console.log(`  ${idCol} ${labelCol}   ${scoreCol} ${item.detail}`);
  }
  console.log('');

  // Surface what the agent likely missed so the next plan revision can target it.
  const missed = score.items.filter((i) => i.presentInMd && (i.score ?? 0) < 7);
  if (missed.length > 0) {
    console.log('⚠ Missed / low-coverage categories (revise plan to capture):');
    for (const m of missed) console.log(`  - ${m.id} (${m.label}): ${m.detail}`);
    console.log('');
  }

  if (score.ratio < SCORE_HARD_GATE) {
    console.error(`✗ coverage gate FAILED (${(score.ratio * 100).toFixed(1)}% < ${(SCORE_HARD_GATE * 100).toFixed(0)}%)`);
    process.exit(1);
  }
  console.log('✓ coverage gate PASSED');
  process.exit(0);
}

function safeStem(p: string): string {
  return p
    .split('/')
    .pop()!
    .replace(/\.json$/i, '')
    .replace(/[^A-Za-z0-9가-힣\-_.]/g, '-');
}

// Deck ids land in localStorage and on disk. Keep them URL-safe and lowercase
// so the registry's filename-based id derivation matches what we wrote.
function isValidDeckId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(id) && id.length <= 64;
}

type PublishOpts = { subtitle?: string; force?: boolean };

function parsePublishOpts(rest: string[]): PublishOpts {
  const opts: PublishOpts = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--subtitle') {
      const v = rest[++i];
      if (v === undefined) {
        console.error('✗ --subtitle requires a value');
        process.exit(64);
      }
      opts.subtitle = v;
    } else if (a === '--force') {
      opts.force = true;
    } else {
      console.error(`✗ unknown publish flag: ${a}`);
      process.exit(64);
    }
  }
  return opts;
}

function cmdPublish(planPath: string, deckId: string, opts: PublishOpts): never {
  if (!isValidDeckId(deckId)) {
    console.error(
      `✗ invalid deck id "${deckId}" — must match /^[a-z0-9][a-z0-9-]*$/ (lowercase, dashes, ≤64).`,
    );
    process.exit(64);
  }

  const { result } = loadPlan(planPath);
  if (!result.ok) {
    console.error('✗ Cannot publish — plan failed validation:');
    for (const e of result.errors) console.error('  -', e);
    process.exit(1);
  }
  const plan = result.plan;

  const outDir = resolve(ROOT, 'docs/html', plan.template);
  const outPath = resolve(outDir, `${deckId}.html`);
  if (existsSync(outPath) && !opts.force) {
    console.error(`✗ refusing to overwrite ${outPath} — pass --force to replace.`);
    process.exit(1);
  }

  const slides = renderPlan(plan);
  const css = loadInlineCss();
  const subtitle = opts.subtitle ?? plan.meta.subtitle;
  const slidesHtml = slides.map((s) => s.html).join('\n\n');
  const sourceHash = computeDeckSourceHash(slidesHtml);
  const html = wrapDeck(plan.meta.title, css, slidesHtml, {
    subtitle,
    sourceHash,
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html);
  console.log(`✓ published ${slides.length} slides → ${outPath}`);
  console.log(`  template: ${plan.template}`);
  console.log(`  title:    ${plan.meta.title}`);
  if (subtitle) console.log(`  subtitle: ${subtitle}`);
  console.log(`  src hash: ${sourceHash}`);
  console.log(`  deck id:  ${deckId}`);
  console.log('');
  console.log('Next: restart `npm run dev` and the library will list the new deck.');
  process.exit(0);
}

function usage(): never {
  console.error('Usage:');
  console.error('  slideplan validate <plan.json>');
  console.error('  slideplan render <plan.json> [out.html]');
  console.error('  slideplan score <plan.json> <source.md>');
  console.error('  slideplan publish <plan.json> <deck-id> [--subtitle "..."] [--force]');
  process.exit(64);
}

function main() {
  const [, , cmd, p1, p2, ...rest] = process.argv;
  if (!cmd) usage();
  if (cmd === 'validate' && p1) cmdValidate(resolve(p1));
  if (cmd === 'render' && p1) cmdRender(resolve(p1), p2 ? resolve(p2) : undefined);
  if (cmd === 'score' && p1 && p2) cmdScore(resolve(p1), resolve(p2));
  if (cmd === 'publish' && p1 && p2) cmdPublish(resolve(p1), p2, parsePublishOpts(rest));
  usage();
}

main();
