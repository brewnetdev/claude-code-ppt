// Resource-kind detection and flowing-document splitting.
//
// When a user uploads a file (vs. picking a built-in resource) we don't know
// its kind up front. `detectResourceKind` classifies by extension + content:
//   - .md / .markdown                         → 'md'      (→ generateOnce pipeline)
//   - HTML containing <div class="slide">      → 'slide-html' (→ existing deck editor)
//   - any other HTML                           → 'flow-html'  (→ DocumentCanvas)
//
// `splitHtmlDocument` separates a flowing HTML file into the parts the
// DocumentCanvas iframe needs: the <head> markup (the document's own CSS) and
// the <body> inner HTML (the editable content). <script> tags are stripped —
// the iframe is for editing, not for running the resource's JS.

import type { ResourceKind } from '../library/resourceRegistry';

export function detectResourceKind(filename: string, content: string): ResourceKind {
  if (/\.(md|markdown)$/i.test(filename)) return 'md';
  // Fall back to content sniffing when the extension is missing/ambiguous.
  if (!/\.(html?|xhtml)$/i.test(filename) && !/<html|<!doctype|<div|<body/i.test(content)) {
    // No HTML markers and not an html extension → treat as markdown.
    return 'md';
  }
  return hasSlideMarkup(content) ? 'slide-html' : 'flow-html';
}

function hasSlideMarkup(html: string): boolean {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.querySelector('div.slide') !== null;
  }
  // Token-aware regex fallback (parity with registry scan).
  const re = /<div\b[^>]*\sclass="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1].split(/\s+/).includes('slide')) return true;
  }
  return false;
}

export type SplitDocument = {
  headHtml: string;
  bodyHtml: string;
  lang: string;
  // Inline color from <body style="background:…"> / computed surface, if any.
  bodyClassName: string;
  // Editor canvas width persisted on the source via <body data-doc-width="…">.
  // null when the file has no such marker (→ the editor seeds a default).
  width: number | null;
};

// Build the <head> contents the iframe needs: <style>, <link rel=stylesheet>,
// <base>, and <meta charset>. We drop <title>/<script> and anything that would
// trigger navigation or JS execution.
export function splitHtmlDocument(html: string): SplitDocument {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Strip scripts everywhere — we never want the resource's JS running in the
  // edit iframe (it could mutate the DOM we're committing back to disk).
  doc.querySelectorAll('script').forEach((el) => el.remove());

  const headParts: string[] = ['<meta charset="utf-8">'];
  doc.head?.querySelectorAll('style, link[rel="stylesheet"], base').forEach((el) => {
    headParts.push(el.outerHTML);
  });

  const lang = doc.documentElement.getAttribute('lang') ?? '';
  const bodyClassName = doc.body?.className ?? '';
  const bodyHtml = doc.body?.innerHTML ?? html;
  // Restore the editor canvas width if the file was saved with one. Read off the
  // body tag (not bodyHtml, which is innerHTML and excludes the tag's attrs).
  const widthAttr = doc.body?.getAttribute('data-doc-width')?.trim() ?? '';
  const width = /^\d+$/.test(widthAttr) ? Number(widthAttr) : null;

  return { headHtml: headParts.join('\n'), bodyHtml, lang, bodyClassName, width };
}

// Checklist styling. Shipped inside every assembled document (not just the
// edit affordance CSS) so checklists render identically while editing, when
// exported, and when the saved file is reopened standalone. The :checked rule
// strikes the label via pure CSS — no script needed, which matters because the
// edit iframe runs sandboxed without allow-scripts.
// Editor block styling shipped inside every assembled document so the blocks
// the Properties panel inserts (checklist, blockquote, code) render visibly
// while editing AND in the saved/exported file — without depending on the
// resource's own stylesheet (which often doesn't style blockquote/pre, so
// "인용/코드블럭 적용 안 됨" was really "applied but unstyled").
//
// Appended AFTER the document's own <head> CSS, so for a document that already
// styles these, the document's rules can still win where more specific. The
// code block mirrors the slide deck's `.code-block` palette (#0b1220).
const CHECKLIST_CSS = `
ul.doc-checklist { list-style: none; padding-left: 0; margin-left: 0; }
ul.doc-checklist > li { display: flex; align-items: center; gap: 0.5em; margin: 0.25em 0; }
ul.doc-checklist > li > input[type="checkbox"] { margin: 0; flex: 0 0 auto; cursor: pointer; }
ul.doc-checklist > li > input[type="checkbox"]:checked + * { text-decoration: line-through; opacity: 0.55; }

blockquote { margin: 0.6em 0; padding: 0.5em 1em; border-left: 4px solid #94a3b8; background: rgba(148,163,184,0.08); color: #475569; font-style: italic; }

pre { background: #0b1220; color: #e2e8f0; padding: 14px 16px; border-radius: 8px; overflow: auto; line-height: 1.5; font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9em; }
pre code { background: transparent; padding: 0; color: inherit; font-family: inherit; }
:not(pre) > code { background: rgba(148,163,184,0.18); padding: 0.1em 0.35em; border-radius: 4px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.9em; }

/* Shared shiki code-block chrome (mirrors the slide deck's .code-block / .terminal).
   border:none is forced so a host document's own code/pre/box border can't bleed
   onto OUR inserted block — the slide version has no border. !important is scoped
   to our classes only, so the resource's own code blocks are untouched. */
.code-block { background: #0b1220; border: none !important; border-radius: 10px; padding: 14px 16px; margin: 0.6em 0; overflow: auto; }
.terminal { background: #020408; border: none !important; border-radius: 10px; margin: 0.6em 0; overflow: hidden; }
.terminal-header { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid rgba(148,163,184,0.12); }
.terminal-title { color: #94a3b8; font: 600 11px/1 'JetBrains Mono', ui-monospace, monospace; }
.code-dots { display: flex; gap: 6px; }
.code-dots span { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
.code-dots .dot-r { background: #ef4444; }
.code-dots .dot-y { background: #f59e0b; }
.code-dots .dot-g { background: #10b981; }
.code-block pre, .terminal pre { background: transparent; border: none !important; margin: 0.5em 0 0; padding: 0; border-radius: 0; }
.terminal pre { padding: 12px 14px; }
.code-block pre code, .terminal pre code { background: transparent !important; border: none !important; padding: 0; color: #e2e8f0; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.88em; line-height: 1.5; }
`;

// Re-assemble a full standalone HTML document from an edited body + the
// original head. Used by Export HTML and the file write-back for flow docs.
export function assembleHtmlDocument(input: {
  headHtml: string;
  bodyHtml: string;
  lang?: string;
  bodyClassName?: string;
  title?: string;
  // Editor/presentation display override. Many source docs (e.g. Notion HTML
  // exports) pin `body { max-width: 900px }`, so widening the canvas leaves the
  // text wrapping at 900px. When `fillWidth` is true we neutralize that cap so
  // the content fills the chosen canvas width. Omitted on save/export so the
  // standalone file keeps its original measure.
  fillWidth?: boolean;
  // Editor canvas width (px) to persist on the saved file as
  // <body data-doc-width="…">, so reopening from the source restores it.
  // Omitted (or null) writes no marker. View-state only — never affects the
  // document's own layout/measure when opened standalone in a browser.
  docWidth?: number | null;
}): string {
  const langAttr = input.lang ? ` lang="${input.lang}"` : '';
  const bodyClassAttr = input.bodyClassName ? ` class="${input.bodyClassName}"` : '';
  const docWidthAttr =
    input.docWidth != null && input.docWidth > 0
      ? ` data-doc-width="${Math.round(input.docWidth)}"`
      : '';
  const titleTag = input.title ? `<title>${escapeHtml(input.title)}</title>` : '';
  // `html body` raises specificity above the source's bare `body` rule; the
  // !important + explicit margins win over `@media only screen { body { ... } }`.
  const fillWidthCss = input.fillWidth
    ? `html body { max-width: none !important; width: auto !important; margin-left: auto !important; margin-right: auto !important; box-sizing: border-box; }`
    : '';
  return `<!DOCTYPE html>
<html${langAttr}>
<head>
${titleTag}
${input.headHtml}
<style>${CHECKLIST_CSS}</style>
<style>${fillWidthCss}</style>
</head>
<body${bodyClassAttr}${docWidthAttr}>
${input.bodyHtml}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
