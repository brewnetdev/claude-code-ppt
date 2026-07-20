import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadInlineCss } from '../../src/generator/inlineThemeCss';
import { renderPlan } from '../../src/generator/planRenderer';
import { validateSlidePlan } from '../../src/generator/slidePlan';

// The standalone-deck pipeline (`slideplan render`/`publish`) inlines every
// theme in THEME_CSS_PATHS into a single <style> block via loadInlineCss(),
// and renderPlan() tags each slide div with the plan's template. These tests
// guard both invariants *directly against the generator* — not against a
// committed docs/html/<template>/*.html artefact.
//
// We deliberately do NOT read a built deck here: the committed report decks are
// produced by the editor's export path (which applies theme CSS at runtime, not
// inline), so asserting CLI-inlining behaviour against them is a category error
// — that mismatch is exactly what previously made this file flap. Asserting on
// loadInlineCss()/renderPlan() keeps the regression guard honest and fast: if
// THEME_CSS_PATHS shrinks or loadInlineCss regresses, the per-template visuals
// (report teal accent, table zebra rows, terminal chrome) silently vanish and
// these assertions fail instead.

const ROOT = resolve(__dirname, '../..');

function loadReportPlan() {
  const raw = JSON.parse(
    readFileSync(resolve(ROOT, 'tests/generator/fixtures/sample-report-plan.json'), 'utf8'),
  );
  const v = validateSlidePlan(raw);
  if (!v.ok) throw new Error(`report fixture failed validation: ${v.errors.join('; ')}`);
  return v.plan;
}

describe('standalone HTML — inlined theme CSS', () => {
  const css = loadInlineCss();

  it('inlines report.css selectors', () => {
    expect(css).toMatch(/\[data-template="report"\]\s*\{/);
  });

  it('preserves report teal accent token', () => {
    expect(css).toMatch(/--amber:\s*#0F766E/i);
  });

  it('declares the report-grade zebra row rule', () => {
    expect(css).toMatch(/tbody tr:nth-child\(even\) td/);
  });

  it('inlines code-blocks.css (.code-block / .terminal class definitions)', () => {
    expect(css).toMatch(/\.code-block/);
    expect(css).toMatch(/\.terminal/);
  });

  it('inlines harness.css selectors (LV.9 harness/evaluator deck theme)', () => {
    expect(css).toMatch(/\[data-template="harness"\]\s*\{/);
  });
});

describe('standalone HTML — report template tagging', () => {
  const slides = renderPlan(loadReportPlan());

  it('renders every fixture slide', () => {
    expect(slides.length).toBeGreaterThan(0);
  });

  it('every rendered slide carries data-template="report"', () => {
    for (const slide of slides) {
      expect(slide.html).toMatch(/data-template="report"/);
    }
  });
});
