import { JSDOM } from 'jsdom';
import type { MdFeatures } from './detector';
import { CATEGORY_GATES, type GateId, type GateReport } from './gates';
import { POINTS_PER_ITEM, RUBRIC_LABELS, RUBRIC_IDS, summarize, type RubricItemScore, type ScoreReport } from './rubric';

// Normalize Korean / mixed text for fuzzy comparison: collapse whitespace,
// strip zero-width chars, lowercase ASCII. Don't strip punctuation —
// inline code text often has meaningful symbols.
function normalize(s: string): string {
  return s.replace(/​/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function textOf(el: Element | null): string {
  return normalize(el?.textContent ?? '');
}

export function scoreHtml(html: string, mdFeatures: MdFeatures, gateReport?: GateReport): ScoreReport {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  const doc = dom.window.document;
  const slides = Array.from(doc.querySelectorAll<HTMLDivElement>('div.slide'));

  const allTitles = slides.map((s) => textOf(s.querySelector('[data-slot="title"]')));
  const allSubtitles = slides.map((s) => textOf(s.querySelector('[data-slot="subtitle"]')));
  const allText = normalize(slides.map((s) => s.textContent ?? '').join(' '));

  // Per-category scoring. Each returns { score (0..10), detail }.
  const items: RubricItemScore[] = RUBRIC_IDS.map((id) => {
    const present = isPresentInMd(mdFeatures, id);
    if (!present) {
      return {
        id,
        label: RUBRIC_LABELS[id],
        presentInMd: false,
        score: null,
        detail: 'absent in MD — N/A',
      };
    }
    const { score, detail } = scoreCategory(id, mdFeatures, slides, allTitles, allSubtitles, allText, doc);

    // V2 — editor-integration gate AND-filter. If any required gate for
    // this category failed, force the score to 0 regardless of static
    // HTML completeness. The detail string is annotated with the failed
    // gate ids so the harness output makes the cause visible.
    if (gateReport) {
      const required = CATEGORY_GATES[id] ?? [];
      const missed: GateId[] = required.filter((g) => gateReport.failedIds.has(g));
      if (missed.length > 0) {
        return {
          id,
          label: RUBRIC_LABELS[id],
          presentInMd: true,
          score: 0,
          detail: `${detail} | gate-blocked: ${missed.join(',')}`,
        };
      }
    }

    return { id, label: RUBRIC_LABELS[id], presentInMd: true, score, detail };
  });

  return summarize(items);
}

function isPresentInMd(f: MdFeatures, id: string): boolean {
  switch (id) {
    case 'h1':
      return f.h1 >= 1;
    case 'h2':
      return f.h2 >= 1;
    case 'h3':
      return f.h3 >= 1;
    case 'text':
      return f.textChars >= 100;
    case 'link':
      return f.links >= 1;
    case 'hr':
      return f.hrs >= 1;
    case 'font':
      return f.fontMarks >= 1;
    case 'code':
      return f.codeBlocks >= 1;
    case 'term':
      return f.terminalBlocks >= 1;
    case 'table':
      return f.tables >= 1;
    case 'shape':
      return f.shapeAffordances >= 1;
    default:
      return false;
  }
}

function scoreCategory(
  id: string,
  f: MdFeatures,
  slides: HTMLDivElement[],
  titles: string[],
  subtitles: string[],
  allText: string,
  doc: Document,
): { score: number; detail: string } {
  switch (id) {
    case 'h1': {
      // First slide should carry the H1 text in its title slot.
      const cover = slides[0];
      if (!cover) return { score: 0, detail: 'no slides' };
      const t = textOf(cover.querySelector('[data-slot="title"]'));
      const expected = normalize(f.fullText.split(/\s+/).slice(0, 8).join(' '));
      // Soft check: cover title is non-empty and at least 4 chars.
      const ok = t.length >= 4;
      return { score: ok ? POINTS_PER_ITEM : 0, detail: `cover title="${t.slice(0, 40)}" expected~"${expected.slice(0, 40)}"` };
    }
    case 'h2': {
      // Coverage: how many distinct H2 texts surfaced as a slide title.
      // We don't have the original H2 texts here, so use slide count as
      // a proxy: at least f.h2 slides should have a non-empty title.
      const slidesWithTitle = titles.filter((t) => t.length >= 2).length;
      const ratio = Math.min(1, slidesWithTitle / Math.max(1, f.h2 + 1));
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `${slidesWithTitle}/${f.h2 + 1} slides have title` };
    }
    case 'h3': {
      // At least one slide should have a subtitle slot occupied.
      const hits = subtitles.filter((s) => s.length >= 2).length;
      const ratio = Math.min(1, hits / Math.max(1, Math.ceil(f.h3 / 3)));
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `${hits} slides have subtitle, md has ${f.h3} h3` };
    }
    case 'text': {
      // Rough containment: take first 80 chars of normalized fullText, the
      // last 80 chars, and 80 chars from the middle. Each must appear in
      // the rendered HTML's normalized text.
      const probes = sampleProbes(normalize(f.fullText), 80, 3);
      const hits = probes.filter((p) => allText.includes(p)).length;
      const ratio = hits / probes.length;
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `${hits}/${probes.length} text probes found` };
    }
    case 'link': {
      const links = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const hrefs = new Set(links.map((a) => a.getAttribute('href') ?? ''));
      const hits = f.linkSamples.filter((s) => hrefs.has(s.href)).length;
      const ratio = f.linkSamples.length === 0 ? 0 : hits / f.linkSamples.length;
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `${hits}/${f.linkSamples.length} hrefs preserved` };
    }
    case 'hr': {
      // The slide count itself satisfies HR — every `---` becomes a slide
      // boundary. Score full if slides.length >= f.hrs (one boundary per HR).
      const ratio = Math.min(1, slides.length / Math.max(1, f.hrs));
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `${slides.length} slides for ${f.hrs} HRs` };
    }
    case 'font': {
      // Count <strong>, <em>, <code> nodes. We don't track exact MD positions,
      // just want at-least-some preservation.
      const strong = doc.querySelectorAll('strong').length;
      const em = doc.querySelectorAll('em').length;
      const code = doc.querySelectorAll('code').length;
      const total = strong + em + code;
      const ratio = Math.min(1, total / Math.max(1, Math.floor(f.fontMarks * 0.5)));
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `font marks: ${total}/${f.fontMarks}` };
    }
    case 'code': {
      const blocks = doc.querySelectorAll('div.code-block[data-code-source]');
      const ratio = Math.min(1, blocks.length / Math.max(1, f.codeBlocks));
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `code-blocks: ${blocks.length}/${f.codeBlocks}` };
    }
    case 'term': {
      const blocks = doc.querySelectorAll('div.terminal[data-code-source]');
      const ratio = Math.min(1, blocks.length / Math.max(1, f.terminalBlocks));
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `terminal blocks: ${blocks.length}/${f.terminalBlocks}` };
    }
    case 'table': {
      const tables = doc.querySelectorAll('table');
      const ratio = Math.min(1, tables.length / Math.max(1, f.tables));
      return { score: Math.round(POINTS_PER_ITEM * ratio), detail: `tables: ${tables.length}/${f.tables}` };
    }
    case 'shape': {
      // Cover slide must carry at least one decorative element from the
      // template family. For presentation: .t-hero or .t-chapter.
      // For portfolio: .outline-num or "THANK YOU" ascii. For report:
      // .s-section-divider or .border-line-top. We accept any of these.
      const cover = slides[0];
      if (!cover) return { score: 0, detail: 'no slides' };
      const sels = [
        '.t-hero',
        '.t-chapter',
        '.outline-num',
        '.s-section-divider',
        '.border-line-top',
        '.cover-title',
      ];
      const found = sels.some((sel) => cover.querySelector(sel) !== null);
      return { score: found ? POINTS_PER_ITEM : 0, detail: `cover decoration: ${found ? 'present' : 'missing'}` };
    }
    default:
      return { score: 0, detail: 'unknown rubric id' };
  }
}

function sampleProbes(text: string, len: number, count: number): string[] {
  if (text.length < len) return [text];
  const out: string[] = [];
  out.push(text.slice(0, len));
  if (count >= 2) out.push(text.slice(text.length - len));
  if (count >= 3) {
    const mid = Math.floor(text.length / 2);
    out.push(text.slice(Math.max(0, mid - len / 2), Math.max(0, mid - len / 2) + len));
  }
  return out;
}
