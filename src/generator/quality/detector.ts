import type { Code, Heading, Root, RootContent } from 'mdast';
import { toString as mdToString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import { classifyCodeBlock } from '../detectTerminal';
import type { RubricId } from './rubric';

export type MdFeatures = {
  // Counts of each rubric-relevant element observed in the source MD.
  // Used both for present-in-md detection and for "coverage" scoring
  // (e.g., 5 of 25 code blocks rendered → 20%).
  h1: number;
  h2: number;
  h3: number;
  textChars: number;
  links: number;
  hrs: number;
  fontMarks: number; // strong + emphasis + inlineCode
  codeBlocks: number;
  terminalBlocks: number;
  tables: number;
  // shape proxy: a deck has "shape potential" if there's at least one H1
  // (cover slide will get the template's decorative element) or a numbered
  // step list. Detector reports the count; scorer asks "did the template
  // render at least one decoration".
  shapeAffordances: number;
  // Per-block details for downstream scoring.
  codeBlockSamples: Array<{ kind: 'code' | 'terminal'; lang: string; sourceHash: string }>;
  linkSamples: Array<{ href: string; text: string }>;
  tableSamples: Array<{ rows: number; cols: number }>;
  // Aggregate text used by the `text` scorer to verify nothing was dropped.
  fullText: string;
};

function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export function detectFeatures(tree: Root): MdFeatures {
  const f: MdFeatures = {
    h1: 0,
    h2: 0,
    h3: 0,
    textChars: 0,
    links: 0,
    hrs: 0,
    fontMarks: 0,
    codeBlocks: 0,
    terminalBlocks: 0,
    tables: 0,
    shapeAffordances: 0,
    codeBlockSamples: [],
    linkSamples: [],
    tableSamples: [],
    fullText: '',
  };

  const textChunks: string[] = [];

  visit(tree, (node: RootContent | Root) => {
    if ('type' in node) {
      if (node.type === 'heading') {
        const h = node as Heading;
        if (h.depth === 1) f.h1++;
        else if (h.depth === 2) f.h2++;
        else if (h.depth === 3) f.h3++;
        textChunks.push(mdToString(h));
      } else if (node.type === 'paragraph') {
        // listItem text is captured via its child paragraph — pushing both
        // would double-count and make the text-probe scorer's expected
        // string longer than what the renderer emits.
        textChunks.push(mdToString(node as RootContent));
      } else if (node.type === 'thematicBreak') {
        f.hrs++;
      } else if (node.type === 'link') {
        const text = mdToString(node as RootContent);
        f.links++;
        f.linkSamples.push({ href: (node as { url: string }).url, text });
      } else if (node.type === 'strong' || node.type === 'emphasis' || node.type === 'inlineCode') {
        f.fontMarks++;
      } else if (node.type === 'code') {
        const c = node as Code;
        const kind = classifyCodeBlock(c);
        if (kind === 'terminal') f.terminalBlocks++;
        else f.codeBlocks++;
        f.codeBlockSamples.push({
          kind,
          lang: c.lang ?? '',
          sourceHash: shortHash(c.value ?? ''),
        });
      } else if (node.type === 'table') {
        const t = node as { children: Array<{ children: unknown[] }> };
        const rows = t.children.length;
        const cols = rows > 0 ? t.children[0].children.length : 0;
        f.tables++;
        f.tableSamples.push({ rows, cols });
      } else if (node.type === 'list') {
        const l = node as { ordered?: boolean; children: unknown[] };
        if (l.ordered && l.children.length >= 5) f.shapeAffordances++;
      }
    }
  });

  // Cover slide is also a shape affordance (decorative title element).
  if (f.h1 >= 1) f.shapeAffordances++;

  f.fullText = textChunks.join(' ');
  f.textChars = f.fullText.length;
  return f;
}

// Maps a rubric id to "is this category present in the MD?".
export function isPresent(features: MdFeatures, id: RubricId): boolean {
  switch (id) {
    case 'h1':
      return features.h1 >= 1;
    case 'h2':
      return features.h2 >= 1;
    case 'h3':
      return features.h3 >= 1;
    case 'text':
      return features.textChars >= 100;
    case 'link':
      return features.links >= 1;
    case 'hr':
      return features.hrs >= 1;
    case 'font':
      return features.fontMarks >= 1;
    case 'code':
      return features.codeBlocks >= 1;
    case 'term':
      return features.terminalBlocks >= 1;
    case 'table':
      return features.tables >= 1;
    case 'shape':
      return features.shapeAffordances >= 1;
  }
}
