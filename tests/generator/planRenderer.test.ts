import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderPlan } from '../../src/generator/planRenderer';
import { validateSlidePlan } from '../../src/generator/slidePlan';

const FIXTURE_PATH = resolve(__dirname, 'fixtures/sample-plan.json');

describe('renderPlan — hand-authored fixture', () => {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  const validation = validateSlidePlan(raw);

  it('validates the fixture', () => {
    if (!validation.ok) {
      console.error('validation errors:\n' + validation.errors.join('\n'));
    }
    expect(validation.ok).toBe(true);
  });

  if (!validation.ok) return;
  const plan = validation.plan;
  const rendered = renderPlan(plan);

  it('emits one RenderedSlide per plan slide', () => {
    expect(rendered).toHaveLength(plan.slides.length);
  });

  it('every rendered slide is a non-empty HTML fragment with data-template', () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const slides = dom.window.document.querySelectorAll<HTMLDivElement>('div.slide');
    expect(slides.length).toBe(plan.slides.length);
    slides.forEach((el) => {
      expect(el.getAttribute('data-template')).toBe('presentation');
    });
  });

  it('cover slide carries .slide-cover and meta items', () => {
    const dom = new JSDOM(`<!doctype html><html><body>${rendered[0].html}</body></html>`);
    const slide = dom.window.document.querySelector<HTMLDivElement>('div.slide')!;
    expect(slide.classList.contains('slide-cover')).toBe(true);
    const metaItems = slide.querySelectorAll('.cover-meta .cover-meta-item');
    expect(metaItems.length).toBe(2);
  });

  it('section slide carries .slide-section and section-num', () => {
    const sectionIdx = plan.slides.findIndex((s) => s.type === 'section');
    expect(sectionIdx).toBeGreaterThan(0);
    const dom = new JSDOM(`<!doctype html><html><body>${rendered[sectionIdx].html}</body></html>`);
    const slide = dom.window.document.querySelector<HTMLDivElement>('div.slide')!;
    expect(slide.classList.contains('slide-section')).toBe(true);
    expect(slide.querySelector('.section-num')?.textContent?.trim()).toBe('01');
  });

  it('every standard slide has slide-inner, slide-footer, page-num', () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const slides = Array.from(
      dom.window.document.querySelectorAll<HTMLDivElement>('div.slide'),
    ).filter((el) => !el.classList.contains('slide-cover'));
    slides.forEach((el) => {
      expect(el.querySelector('.slide-inner'), 'slide-inner missing').toBeTruthy();
      expect(el.querySelector('.slide-footer'), 'slide-footer missing').toBeTruthy();
      expect(el.querySelector('[data-slot="page-num"]')).toBeTruthy();
    });
  });

  it('title slots appear on every non-cover slide', () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const slides = Array.from(
      dom.window.document.querySelectorAll<HTMLDivElement>('div.slide'),
    ).filter((el) => !el.classList.contains('slide-cover'));
    slides.forEach((el, i) => {
      expect(el.querySelector('[data-slot="title"]'), `slide ${i} missing data-slot=title`).toBeTruthy();
    });
  });

  it('code blocks carry data-slot=code and data-code-lang', () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const codeBlocks = dom.window.document.querySelectorAll<HTMLDivElement>('div.code-block');
    expect(codeBlocks.length).toBeGreaterThan(0);
    codeBlocks.forEach((el) => {
      expect(el.getAttribute('data-slot')).toBe('code');
      expect((el.getAttribute('data-code-lang') ?? '').length).toBeGreaterThan(0);
      expect(el.querySelector('pre > code'), 'code block missing pre>code').toBeTruthy();
    });
  });

  it('comparison-table has thead + tbody with matching column counts', () => {
    const idx = plan.slides.findIndex((s) => s.type === 'comparison-table');
    expect(idx).toBeGreaterThan(0);
    const dom = new JSDOM(`<!doctype html><html><body>${rendered[idx].html}</body></html>`);
    const tbl = dom.window.document.querySelector<HTMLTableElement>('table');
    expect(tbl).toBeTruthy();
    const headerCells = tbl!.querySelectorAll('thead th').length;
    const firstRowCells = tbl!.querySelector('tbody tr')?.querySelectorAll('td').length;
    expect(headerCells).toBeGreaterThan(0);
    expect(firstRowCells).toBe(headerCells);
  });

  it('references slide produces http(s) anchors with sub line', () => {
    const idx = plan.slides.findIndex((s) => s.type === 'references');
    expect(idx).toBeGreaterThan(0);
    const dom = new JSDOM(`<!doctype html><html><body>${rendered[idx].html}</body></html>`);
    const anchors = dom.window.document.querySelectorAll<HTMLAnchorElement>('a');
    expect(anchors.length).toBeGreaterThan(0);
    anchors.forEach((a) => {
      expect(/^https?:\/\//.test(a.getAttribute('href') ?? '')).toBe(true);
    });
  });

  it('page tags follow COVER / SECTION / 01.. pattern', () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const tags = Array.from(
      dom.window.document.querySelectorAll<HTMLElement>('[data-slot="page-num"]'),
    ).map((el) => el.textContent?.trim() ?? '');
    expect(tags[0]).toBe('COVER');
    expect(tags[1]).toBe('SECTION');
    const numericTags = tags.filter((t) => /^\d+$/.test(t));
    numericTags.forEach((t, i) => {
      expect(t).toBe(String(i + 1).padStart(2, '0'));
    });
  });
});

// Same plan, swapped to template:'portfolio'. The whole point of the
// deterministic renderer is "same data, different visual" — so the markup
// (slide count, slide-cover / slide-section presence, code blocks, table
// structure) must stay identical; only data-template flips. The portfolio
// theme adds visual differences via CSS, never via markup.
describe('renderPlan — portfolio template (same plan, different data-template)', () => {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  const portfolioRaw = { ...raw, template: 'portfolio' };
  const validation = validateSlidePlan(portfolioRaw);

  it('validates with template=portfolio', () => {
    if (!validation.ok) {
      console.error('validation errors:\n' + validation.errors.join('\n'));
    }
    expect(validation.ok).toBe(true);
  });

  if (!validation.ok) return;
  const plan = validation.plan;
  const rendered = renderPlan(plan);

  it('every wrapper carries data-template="portfolio"', () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const slides = dom.window.document.querySelectorAll<HTMLDivElement>('div.slide');
    expect(slides.length).toBe(plan.slides.length);
    slides.forEach((el) => {
      expect(el.getAttribute('data-template')).toBe('portfolio');
    });
  });

  it('markup stays identical to presentation: same slide-cover / slide-section / code-block counts', () => {
    const presentationRaw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
    const presentationValidation = validateSlidePlan(presentationRaw);
    expect(presentationValidation.ok).toBe(true);
    if (!presentationValidation.ok) return;
    const presRendered = renderPlan(presentationValidation.plan);

    const presDom = new JSDOM(
      `<!doctype html><html><body>${presRendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const portDom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const counts = (dom: JSDOM) => ({
      slides: dom.window.document.querySelectorAll('div.slide').length,
      covers: dom.window.document.querySelectorAll('div.slide-cover').length,
      sections: dom.window.document.querySelectorAll('div.slide-section').length,
      codeBlocks: dom.window.document.querySelectorAll('div.code-block').length,
      tables: dom.window.document.querySelectorAll('table.tbl').length,
      anchors: dom.window.document.querySelectorAll('a').length,
    });
    expect(counts(portDom)).toEqual(counts(presDom));
  });
});

// Same plan, swapped to template:'report'. Identical invariants as the
// portfolio block — markup is template-agnostic, only data-template flips.
// CSS (src/canvas/themes/report.css) provides the warm-cream + teal visual.
describe('renderPlan — report template (same plan, different data-template)', () => {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  const reportRaw = { ...raw, template: 'report' };
  const validation = validateSlidePlan(reportRaw);

  it('validates with template=report', () => {
    if (!validation.ok) {
      console.error('validation errors:\n' + validation.errors.join('\n'));
    }
    expect(validation.ok).toBe(true);
  });

  if (!validation.ok) return;
  const plan = validation.plan;
  const rendered = renderPlan(plan);

  it('every wrapper carries data-template="report"', () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const slides = dom.window.document.querySelectorAll<HTMLDivElement>('div.slide');
    expect(slides.length).toBe(plan.slides.length);
    slides.forEach((el) => {
      expect(el.getAttribute('data-template')).toBe('report');
    });
  });

  it('markup stays identical to presentation: same slide-cover / slide-section / code-block counts', () => {
    const presentationRaw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
    const presentationValidation = validateSlidePlan(presentationRaw);
    expect(presentationValidation.ok).toBe(true);
    if (!presentationValidation.ok) return;
    const presRendered = renderPlan(presentationValidation.plan);

    const presDom = new JSDOM(
      `<!doctype html><html><body>${presRendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const reportDom = new JSDOM(
      `<!doctype html><html><body>${rendered.map((s) => s.html).join('\n')}</body></html>`,
    );
    const counts = (dom: JSDOM) => ({
      slides: dom.window.document.querySelectorAll('div.slide').length,
      covers: dom.window.document.querySelectorAll('div.slide-cover').length,
      sections: dom.window.document.querySelectorAll('div.slide-section').length,
      codeBlocks: dom.window.document.querySelectorAll('div.code-block').length,
      tables: dom.window.document.querySelectorAll('table.tbl').length,
      anchors: dom.window.document.querySelectorAll('a').length,
    });
    expect(counts(reportDom)).toEqual(counts(presDom));
  });
});
