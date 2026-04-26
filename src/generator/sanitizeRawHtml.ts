import type { Html, Root } from 'mdast';
import { visit } from 'unist-util-visit';

// MD files in the wild sometimes contain raw <div>/<svg> blocks (e.g. the
// trailing footer in `npm 배포 셋업 가이드.md`). Those don't map to any
// adapter and would produce visual debris if passed through to the slide
// HTML — strip them up-front.
//
// Strategy: replace the html node's value with empty string. Leaving the
// node in place (rather than splicing) keeps mdast indices stable for
// concurrent visitors.
export function sanitizeRawHtml(tree: Root): void {
  visit(tree, 'html', (node: Html) => {
    node.value = '';
  });
}
