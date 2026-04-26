import type { ParsedSlide } from '../importer/parsePresentation';
import { renderPresentation } from './adapters/presentationAdapter';
import type { BlockifyHint } from './blockify';
import { blockify } from './blockify';
import { parseMarkdown } from './parseMarkdown';
import { detectFeatures, type MdFeatures } from './quality/detector';
import { runGates, type GateReport } from './quality/gates';
import { scoreHtml } from './quality/scorer';
import type { ScoreReport } from './quality/rubric';
import { sanitizeRawHtml } from './sanitizeRawHtml';

export type Template = 'presentation' | 'portfolio' | 'report';

export type GenerateInput = {
  source: string;
  template: Template;
  hint?: BlockifyHint;
};

export type GenerateOutput = {
  slides: ParsedSlide[];
  features: MdFeatures;
  gates: GateReport;
  score: ScoreReport;
  timing: {
    parse_ms: number;
    blockify_ms: number;
    render_ms: number;
    score_ms: number;
    total_ms: number;
  };
};

async function renderForTemplate(template: Template, groups: Awaited<ReturnType<typeof blockify>>): Promise<ParsedSlide[]> {
  switch (template) {
    case 'presentation':
      return renderPresentation(groups);
    case 'portfolio':
    case 'report':
      // Phase 5 will add proper adapters. For now fall back to the
      // presentation renderer so the pipeline shape works end-to-end.
      return renderPresentation(groups);
  }
}

export async function generateOnce({ source, template, hint }: GenerateInput): Promise<GenerateOutput> {
  const t0 = performance.now();
  const tree = parseMarkdown(source);
  sanitizeRawHtml(tree);
  const t1 = performance.now();

  const features = detectFeatures(tree);
  const groups = blockify(tree, hint);
  const t2 = performance.now();

  const slides = await renderForTemplate(template, groups);
  const html = slides.map((s) => s.html).join('\n');
  const t3 = performance.now();

  const gates = runGates(html, slides, features, slides.length);
  const score = scoreHtml(html, features, gates);
  const t4 = performance.now();

  return {
    slides,
    features,
    gates,
    score,
    timing: {
      parse_ms: Math.round(t1 - t0),
      blockify_ms: Math.round(t2 - t1),
      render_ms: Math.round(t3 - t2),
      score_ms: Math.round(t4 - t3),
      total_ms: Math.round(t4 - t0),
    },
  };
}
