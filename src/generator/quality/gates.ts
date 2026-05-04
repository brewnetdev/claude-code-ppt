import { JSDOM } from 'jsdom';
import type { ParsedSlide } from '../../importer/parsePresentation';
import type { MdFeatures } from './detector';

// V2 editor-integration gates. Each gate is binary (pass/fail). Categories
// are pegged to a gate; if any required gate fails, the corresponding rubric
// category is forced to 0 regardless of static-HTML scoring.

export type GateId = 'A' | 'B' | 'C-code' | 'C-term' | 'C-text' | 'C-list' | 'C-table' | 'C-heading' | 'D' | 'E';

export type GateResult = {
  id: GateId;
  passed: boolean;
  detail: string;
};

export type GateReport = {
  results: GateResult[];
  failedIds: Set<GateId>;
  // Map: rubric category id (h1/h2/h3/text/link/hr/font/code/term/table/shape)
  // → array of gate IDs that block its score. If any of these gates failed,
  // the category score is zeroed.
  categoryGates: Record<string, GateId[]>;
};

export const CATEGORY_GATES: Record<string, GateId[]> = {
  h1: ['A', 'B', 'C-heading', 'D'],
  h2: ['A', 'B', 'C-heading', 'D'],
  h3: ['A', 'B', 'C-heading', 'D'],
  text: ['A', 'B', 'C-text', 'D'],
  link: ['A'],
  hr: ['A', 'B'],
  font: ['A'],
  code: ['A', 'B', 'C-code', 'D'],
  term: ['A', 'B', 'C-term', 'D'],
  table: ['A', 'B', 'C-table', 'D'],
  shape: ['A', 'B', 'E'],
};

export function runGates(
  generatedHtml: string,
  parsedSlides: ParsedSlide[],
  features: MdFeatures,
  expectedSlideCount: number,
): GateReport {
  const dom = new JSDOM(`<!doctype html><html><body>${generatedHtml}</body></html>`);
  const doc = dom.window.document;
  const slideEls = Array.from(doc.querySelectorAll<HTMLDivElement>('div.slide'));

  const results: GateResult[] = [];
  const push = (id: GateId, passed: boolean, detail: string) => results.push({ id, passed, detail });

  // ── Gate A — round-trip parse via parsePresentationHTML ───────────────────
  // We don't import parsePresentationHTML here to avoid pulling browser DOM
  // into the test env; instead we replicate its essential checks against the
  // already-parsed `parsedSlides` array provided by the pipeline.
  const A_idsUnique = new Set(parsedSlides.map((s) => s.id)).size === parsedSlides.length;
  const A_count = parsedSlides.length === expectedSlideCount && parsedSlides.length === slideEls.length;
  const A_wrappers = slideEls.every((el) => el.classList.contains('slide') && !!el.getAttribute('data-template'));
  const A = A_idsUnique && A_count && A_wrappers;
  push(
    'A',
    A,
    `slides=${parsedSlides.length}/${expectedSlideCount}, ids unique=${A_idsUnique}, wrappers=${A_wrappers}`,
  );

  // ── Gate B — sidebar slide list ───────────────────────────────────────────
  const B_innersOk = slideEls.every((el) => {
    const inner = el.querySelector<HTMLElement>('.slide-inner');
    return !!inner && inner.children.length > 0;
  });
  const B_titlesOk = parsedSlides.every((s) => (s.title ?? '').trim().length > 0);
  const B = B_innersOk && B_titlesOk;
  push('B', B, `inners non-empty=${B_innersOk}, titles non-empty=${B_titlesOk}`);

  // ── Gate C — content-block addressability ─────────────────────────────────
  // Decode helper: pulls back the original MD source from data-code-source.
  const dec = (s: string): string => {
    try {
      return decodeURIComponent(s);
    } catch {
      return '';
    }
  };

  // C-code: every code block carries id + correctly-encoded source + lang
  const codeBlocks = Array.from(doc.querySelectorAll<HTMLDivElement>('div.code-block'));
  const C_code_id = codeBlocks.every((el) => !!el.getAttribute('data-block-id')?.startsWith('code-'));
  const C_code_lang = codeBlocks.every((el) => (el.getAttribute('data-code-lang') ?? '').length > 0);
  const C_code_src = codeBlocks.every((el) => dec(el.getAttribute('data-code-source') ?? '').length > 0);
  const C_code_count = codeBlocks.length === features.codeBlocks;
  const C_code = features.codeBlocks === 0 || (C_code_id && C_code_lang && C_code_src && C_code_count);
  push(
    'C-code',
    C_code,
    `count=${codeBlocks.length}/${features.codeBlocks}, ids=${C_code_id}, lang=${C_code_lang}, src=${C_code_src}`,
  );

  // C-term: same as C-code but for terminal blocks
  const termBlocks = Array.from(doc.querySelectorAll<HTMLDivElement>('div.terminal'));
  const C_term_id = termBlocks.every((el) => !!el.getAttribute('data-block-id')?.startsWith('term-'));
  const C_term_lang = termBlocks.every((el) => el.getAttribute('data-code-lang') === 'bash');
  const C_term_src = termBlocks.every((el) => dec(el.getAttribute('data-code-source') ?? '').length > 0);
  const C_term_count = termBlocks.length === features.terminalBlocks;
  const C_term = features.terminalBlocks === 0 || (C_term_id && C_term_lang && C_term_src && C_term_count);
  push(
    'C-term',
    C_term,
    `count=${termBlocks.length}/${features.terminalBlocks}, ids=${C_term_id}, lang=${C_term_lang}, src=${C_term_src}`,
  );

  // C-text: every body/subtitle/caption/quote element has a data-block-id
  const textBlocks = Array.from(
    doc.querySelectorAll<HTMLElement>('[data-slot="body"], [data-slot="subtitle"], [data-slot="caption"], [data-slot="quote"]'),
  );
  const C_text_idOk = textBlocks.every((el) => !!el.getAttribute('data-block-id'));
  const C_text = features.textChars < 100 || (textBlocks.length > 0 && C_text_idOk);
  push('C-text', C_text, `text blocks=${textBlocks.length}, ids ok=${C_text_idOk}`);

  // C-list: each <ul|ol class="t-bullets">  has data-block-id, listItem count
  // matches any list in the MD.
  const listBlocks = Array.from(doc.querySelectorAll<HTMLElement>('.t-bullets[data-slot="bullets"]'));
  const C_list_idOk = listBlocks.every((el) => !!el.getAttribute('data-block-id'));
  const hasMdLists = (features as MdFeatures & { _hasLists?: boolean }); // not tracked yet, infer from textChars
  // Lists are not directly tracked in features; just enforce id presence on
  // any rendered list. Pass if no lists were rendered (vacuously true).
  const C_list = listBlocks.length === 0 || C_list_idOk;
  push('C-list', C_list, `lists=${listBlocks.length}, ids ok=${C_list_idOk}`);
  void hasMdLists;

  // C-table: same shape — id present
  const tableBlocks = Array.from(doc.querySelectorAll<HTMLTableElement>('table[data-slot="table"]'));
  const C_table_idOk = tableBlocks.every((el) => !!el.getAttribute('data-block-id'));
  const C_table_count = tableBlocks.length === features.tables;
  const C_table = features.tables === 0 || (C_table_idOk && C_table_count);
  push('C-table', C_table, `tables=${tableBlocks.length}/${features.tables}, ids ok=${C_table_idOk}`);

  // C-heading: every title/label/subtitle (non-text-paragraph) has id
  const headBlocks = Array.from(
    doc.querySelectorAll<HTMLElement>('[data-slot="title"], [data-slot="label"]'),
  );
  const subTitleBlocks = Array.from(doc.querySelectorAll<HTMLElement>('[data-slot="subtitle"]'));
  const headIdOk = headBlocks.every((el) => !!el.getAttribute('data-block-id'));
  const subTitleIdOk = subTitleBlocks.every((el) => !!el.getAttribute('data-block-id'));
  const C_heading = headBlocks.length > 0 && headIdOk && subTitleIdOk;
  push(
    'C-heading',
    C_heading,
    `title/label=${headBlocks.length}, subtitles=${subTitleBlocks.length}, ids ok=${headIdOk && subTitleIdOk}`,
  );

  // ── Gate D — properties-panel addressability ─────────────────────────────
  // Every data-block-id must be unique deck-wide AND a single-element query
  // by that id must return exactly one element.
  const allIdEls = Array.from(doc.querySelectorAll<HTMLElement>('[data-block-id]'));
  const ids = allIdEls.map((el) => el.getAttribute('data-block-id') ?? '');
  const D_unique = new Set(ids).size === ids.length;
  const D_query = ids.every((id) => doc.querySelectorAll(`[data-block-id="${id}"]`).length === 1);
  const D = D_unique && D_query;
  push('D', D, `total=${ids.length}, unique=${D_unique}, single-match=${D_query}`);

  // ── Gate E — visual sanity for cover decoration ──────────────────────────
  const cover = slideEls[0];
  const sels = ['.t-hero', '.t-chapter', '.outline-num', '.s-section-divider', '.border-line-top', '.cover-title'];
  const E = !!cover && sels.some((sel) => cover.querySelector(sel) !== null);
  push('E', E, `cover decoration: ${E ? 'present' : 'missing'}`);

  const failedIds = new Set(results.filter((r) => !r.passed).map((r) => r.id));
  return { results, failedIds, categoryGates: CATEGORY_GATES };
}
