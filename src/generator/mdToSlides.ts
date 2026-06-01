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
// All three templates share the rendering backbone; the template only sets the
// `data-template` attribute, and the attribute-scoped theme CSS gives each its
// visual identity (presentation = dark/amber, portfolio = white/blue,
// report = cream/teal).
export async function mdToSlides(source: string, template: Template): Promise<ParsedSlide[]> {
  const tree = parseMarkdown(source);
  sanitizeRawHtml(tree);
  const groups = blockify(tree);
  return renderPresentation(groups, template);
}
