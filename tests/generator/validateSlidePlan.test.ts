import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateSlidePlan } from '../../src/generator/slidePlan';

// Negative-case regression: each test mutates a known-good plan in exactly
// one way and asserts the validator fires the matching error. The point is
// "the gate stays sharp" — if any of these silently start passing, an LLM
// could produce broken plans that crash the renderer downstream.

const FIXTURE_PATH = resolve(__dirname, 'fixtures/sample-plan.json');
const goodPlan = () => JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));

describe('validateSlidePlan — happy path baseline', () => {
  it('accepts the canonical fixture', () => {
    const result = validateSlidePlan(goodPlan());
    expect(result.ok).toBe(true);
  });
});

describe('validateSlidePlan — negative cases', () => {
  it('rejects a plan whose slides[0].type is not "cover"', () => {
    const plan = goodPlan();
    plan.slides[0] = { type: 'section', num: '01', title: 'No cover' };
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /slides\[0\]\.type must be "cover"/.test(e))).toBe(true);
    }
  });

  it('rejects duplicate section.num', () => {
    const plan = goodPlan();
    // Find the first section and clone its num onto a second section-like slide.
    const sectionIdx = plan.slides.findIndex((s: { type: string }) => s.type === 'section');
    expect(sectionIdx).toBeGreaterThan(0);
    const dup = { type: 'section', num: plan.slides[sectionIdx].num, title: 'Dup section' };
    plan.slides.splice(sectionIdx + 1, 0, dup);
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /duplicate section\.num/.test(e))).toBe(true);
    }
  });

  it('rejects references with non-http(s) hrefs (mailto)', () => {
    const plan = goodPlan();
    const refIdx = plan.slides.findIndex((s: { type: string }) => s.type === 'references');
    expect(refIdx).toBeGreaterThan(0);
    plan.slides[refIdx].links[0].href = 'mailto:hello@example.com';
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /href must be http\(s\) URL/.test(e))).toBe(true);
    }
  });

  it('rejects comparison-table where row length does not match headers', () => {
    const plan = goodPlan();
    const cmpIdx = plan.slides.findIndex(
      (s: { type: string }) => s.type === 'comparison-table',
    );
    expect(cmpIdx).toBeGreaterThan(0);
    const slide = plan.slides[cmpIdx];
    expect(Array.isArray(slide.headers)).toBe(true);
    expect(Array.isArray(slide.rows) && slide.rows.length > 0).toBe(true);
    // Drop one cell from the first row so the column count no longer matches.
    slide.rows[0] = slide.rows[0].slice(0, slide.headers.length - 1);
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /rows\[0\] length must match headers/.test(e))).toBe(
        true,
      );
    }
  });

  it('rejects two-col-code where neither side carries a code block', () => {
    const plan = goodPlan();
    const twoColIdx = plan.slides.findIndex(
      (s: { type: string }) => s.type === 'two-col-code',
    );
    expect(twoColIdx).toBeGreaterThan(0);
    const slide = plan.slides[twoColIdx];
    // Replace both sides with prose-only blocks. Validator should refuse:
    // two-col-code's reason for being is the code listing.
    slide.left = [{ kind: 'paragraph', text: 'left side prose only' }];
    slide.right = [{ kind: 'paragraph', text: 'right side prose only' }];
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) =>
          /two-col-code.*must contain at least one code block|left\/right must contain at least one code block/.test(
            e,
          ),
        ),
      ).toBe(true);
    }
  });

  it('rejects an unknown template name', () => {
    const plan = goodPlan();
    plan.template = 'manual';
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /template must be one of/.test(e))).toBe(true);
    }
  });

  it('rejects a plan missing meta.title', () => {
    const plan = goodPlan();
    delete plan.meta.title;
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /meta\.title must be a non-empty string/.test(e))).toBe(
        true,
      );
    }
  });

  it('rejects an empty slides array', () => {
    const plan = goodPlan();
    plan.slides = [];
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /slides must be a non-empty array/.test(e))).toBe(true);
    }
  });

  it('rejects a cover with an empty title', () => {
    const plan = goodPlan();
    plan.slides[0].title = '   ';
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /title required \(cover\)/.test(e))).toBe(true);
    }
  });

  it('rejects a callout with an unknown tone', () => {
    const plan = goodPlan();
    // 'red' is a valid BadgeTone but NOT a CalloutTone — easy LLM mistake.
    const calloutSlideIdx = plan.slides.findIndex(
      (s: { type: string }) => s.type === 'callout-summary',
    );
    expect(calloutSlideIdx).toBeGreaterThan(0);
    plan.slides[calloutSlideIdx].callouts[0].tone = 'red';
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /tone must be one of/.test(e))).toBe(true);
    }
  });

  it('rejects a block with an unknown kind', () => {
    const plan = goodPlan();
    const titleBodyIdx = plan.slides.findIndex(
      (s: { type: string }) => s.type === 'title-body',
    );
    expect(titleBodyIdx).toBeGreaterThan(0);
    plan.slides[titleBodyIdx].blocks[0] = { kind: 'mystery-block', text: 'x' };
    const result = validateSlidePlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /kind must be one of/.test(e))).toBe(true);
    }
  });
});
