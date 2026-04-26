import type { Heading, Root, RootContent } from 'mdast';
import { toString as mdToString } from 'mdast-util-to-string';

// Hint flags from the retry loop. Each adjusts blockify behaviour without
// requiring the rest of the pipeline to know what changed.
export type BlockifyHint = {
  // When true, treat any heading.depth === 1 after the first as a slide
  // boundary instead of folding it into the previous group. Useful for
  // 디자인패턴.md which uses `#` for both the document title and each
  // chapter title.
  splitOnEveryH1?: boolean;
  // Skip H3-driven splits inside long sections — produces fewer, denser
  // slides when a previous attempt over-cut content.
  relaxH3?: boolean;
};

export type SlideKind = 'cover' | 'section' | 'content';

export type SlideGroup = {
  kind: SlideKind;
  // Source-order children that belong to this slide. The cover slide always
  // owns exactly one heading; section slides typically own one heading + a
  // tail of paragraphs/lists/code/etc.
  nodes: RootContent[];
  // Pre-extracted title text for adapters that need it without re-walking.
  title: string | null;
  // Heading depth that opened this group (null when the group started from
  // a thematic break with no heading).
  depth: number | null;
};

const LONG_SLIDE_CHARS = 600;
const LONG_SLIDE_LIST_ITEMS = 12;

function isHeading(n: RootContent): n is Heading {
  return n.type === 'heading';
}

function nodeChars(n: RootContent): number {
  // listItem text counts toward slide length; code blocks always exceed the
  // threshold by themselves so we cap their contribution to keep the
  // long-slide check from over-firing.
  if (n.type === 'code') return Math.min((n.value ?? '').length, 200);
  return mdToString(n).length;
}

function listItemCount(n: RootContent): number {
  if (n.type !== 'list') return 0;
  return n.children?.length ?? 0;
}

function makeGroup(
  kind: SlideKind,
  nodes: RootContent[],
  depth: number | null,
): SlideGroup {
  const headingNode = nodes.find(isHeading);
  return {
    kind,
    nodes,
    title: headingNode ? mdToString(headingNode).trim() : null,
    depth,
  };
}

// First pass: cut on `---` (thematicBreak) and on H1/H2. Code blocks force a
// soft cut so each big code sample lands on its own slide rather than being
// crammed in with prose.
function primaryCut(tree: Root, hint: BlockifyHint | undefined): SlideGroup[] {
  const groups: SlideGroup[] = [];
  let buf: RootContent[] = [];
  let bufDepth: number | null = null;
  let bufKind: SlideKind = 'content';
  let seenH1 = false;

  const flush = () => {
    if (buf.length === 0) return;
    groups.push(makeGroup(bufKind, buf, bufDepth));
    buf = [];
    bufDepth = null;
    bufKind = 'content';
  };

  for (const node of tree.children) {
    // Strong cut: thematic break ends current slide, doesn't start a new one
    // until next content arrives.
    if (node.type === 'thematicBreak') {
      flush();
      continue;
    }

    if (isHeading(node)) {
      const d = node.depth;

      if (d === 1 && !seenH1) {
        // Cover slide: first H1 always stands alone. Subsequent prose can
        // attach until the next heading/HR.
        flush();
        seenH1 = true;
        bufKind = 'cover';
        bufDepth = 1;
        buf.push(node);
        continue;
      }

      // H1 (after first, when hinted) and any H2 act as slide boundaries.
      const isSlideBoundary = d === 2 || (d === 1 && !!hint?.splitOnEveryH1);
      if (isSlideBoundary) {
        flush();
        bufKind = 'section';
        bufDepth = d;
        buf.push(node);
        continue;
      }
      // Other headings (further H1 without hint, or H3+) stay with the
      // current slide.
      buf.push(node);
      continue;
    }

    if (node.type === 'code') {
      // Soft cut before a code block when current buffer already has prose,
      // so a long Java sample doesn't share a slide with 200 lines of intro.
      // But: if the buffer is just a heading + nothing else, keep the code
      // attached so the heading isn't orphaned.
      const hasNonHeading = buf.some((n) => !isHeading(n));
      if (hasNonHeading) {
        flush();
      }
      buf.push(node);
      continue;
    }

    buf.push(node);
  }
  flush();
  return groups;
}

// Second pass: split groups that are too long. Operates on already-cut
// groups so we never merge across HR/H2 boundaries.
function splitLongGroups(groups: SlideGroup[], hint: BlockifyHint | undefined): SlideGroup[] {
  const out: SlideGroup[] = [];

  for (const g of groups) {
    const totalChars = g.nodes.reduce((acc, n) => acc + nodeChars(n), 0);
    const totalListItems = g.nodes.reduce((acc, n) => acc + listItemCount(n), 0);

    if (totalChars <= LONG_SLIDE_CHARS && totalListItems <= LONG_SLIDE_LIST_ITEMS) {
      out.push(g);
      continue;
    }

    // Split: keep heading on the first chunk, then break into chunks each
    // bounded by char budget. Don't split a single code block.
    const headingNode = g.nodes.find(isHeading) ?? null;
    const body = g.nodes.filter((n) => n !== headingNode);

    let chunk: RootContent[] = headingNode ? [headingNode] : [];
    let chunkChars = headingNode ? nodeChars(headingNode) : 0;
    let chunkListItems = 0;
    const flushChunk = (kind: SlideKind, depth: number | null) => {
      if (chunk.length === 0) return;
      out.push(makeGroup(kind, chunk, depth));
      chunk = [];
      chunkChars = 0;
      chunkListItems = 0;
    };

    for (const n of body) {
      const c = nodeChars(n);
      const li = listItemCount(n);

      if (
        !hint?.relaxH3 &&
        n.type === 'heading' &&
        n.depth >= 3 &&
        chunk.length > 0
      ) {
        // H3 starts a sub-slide unless we're explicitly relaxing.
        flushChunk(g.kind, g.depth);
      }

      if (
        chunk.length > 0 &&
        (chunkChars + c > LONG_SLIDE_CHARS || chunkListItems + li > LONG_SLIDE_LIST_ITEMS)
      ) {
        flushChunk(g.kind, g.depth);
      }

      chunk.push(n);
      chunkChars += c;
      chunkListItems += li;
    }
    flushChunk(g.kind, g.depth);
  }

  return out;
}

export function blockify(tree: Root, hint?: BlockifyHint): SlideGroup[] {
  const primary = primaryCut(tree, hint);
  const split = splitLongGroups(primary, hint);
  // Enforce: deck always has exactly one cover at index 0. Heading-less MDs
  // (e.g., npm guide where Steps are paragraphs not headings) would otherwise
  // bury the cover at slide #6 — the adapter synthesizes a hero from the
  // first paragraph instead.
  if (split.length === 0) return split;
  for (let i = 1; i < split.length; i++) {
    if (split[i].kind === 'cover') split[i] = { ...split[i], kind: 'section' };
  }
  if (split[0].kind !== 'cover') split[0] = { ...split[0], kind: 'cover' };
  return split;
}
