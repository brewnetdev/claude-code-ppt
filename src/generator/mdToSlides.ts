import type { ParsedSlide } from '../importer/parsePresentation';
import { renderPresentation } from './adapters/presentationAdapter';
import { blockify } from './blockify';
import { parseMarkdown } from './parseMarkdown';
import { sanitizeRawHtml } from './sanitizeRawHtml';

export type Template = 'presentation' | 'portfolio' | 'report';

// Browser-safe MD → slides conversion.
//
// This mirrors generateOnce()'s transform (parse → sanitize → blockify →
// render) but deliberately OMITS the quality gates and scorer. Those import
// `jsdom`, a Node-only library that references `process` at module load — pull
// it into the browser bundle and the whole app crashes with
// "process is not defined" before React even mounts. The in-app Resource tab
// only needs the slides, not the publish-time quality report, so we skip the
// jsdom path entirely and keep the editor bundle clean.
//
// portfolio/report reuse the presentation renderer, matching pipeline.ts's
// current behavior (their dedicated adapters are a future addition).
export async function mdToSlides(source: string, _template: Template): Promise<ParsedSlide[]> {
  const tree = parseMarkdown(source);
  sanitizeRawHtml(tree);
  const groups = blockify(tree);
  return renderPresentation(groups);
}
