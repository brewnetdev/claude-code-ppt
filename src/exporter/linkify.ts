// Export-time URL linkification.
//
// Slide HTML can carry both shapes of URL: hand-authored `<a>` tags (already
// hrefed but missing `target="_blank"`) AND bare `https://…` text inside
// captions/footers/bullets that the deck author never wrapped. When the deck
// is exported to a standalone HTML bundle (or printed to PDF from that
// bundle), readers expect every URL to be clickable AND to open in a new
// tab so the deck stays put. We do that here, on the export pipeline only —
// the editor-time DOM is left alone so contenteditable interactions don't
// shift under the user.

const HTTP_URL_RE = /\bhttps?:\/\/[^\s<>"'\)\]]+/g;

// Skip text inside these elements: <a> would double-wrap, <code>/<pre> would
// corrupt syntax-highlighted shiki output, <script>/<style> aren't user copy.
const SKIP_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE']);

// Trailing punctuation that's almost always sentence punctuation, not part of
// the URL — strip it off the match so "see https://example.com." links to
// "https://example.com" with the period left as a text-node sibling.
const TRAILING_PUNCT_RE = /[.,;:!?)\]}>]$/;

function isInsideSkipped(node: Node, root: Element): boolean {
  let p: Element | null = node.parentElement;
  while (p && p !== root) {
    if (SKIP_TAGS.has(p.tagName)) return true;
    p = p.parentElement;
  }
  return false;
}

export function linkifyHtml(html: string, doc: Document): string {
  const container = doc.createElement('div');
  container.innerHTML = html;

  // 1) Stamp every existing http(s) anchor with target/rel. Mailto, tel,
  // anchor-only (#hash), and relative hrefs are left untouched.
  container.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (/^https?:\/\//i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // 2) Wrap bare URLs in eligible text nodes.
  const candidates: Text[] = [];
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = node as Text;
    if (
      !isInsideSkipped(text, container) &&
      /\bhttps?:\/\//.test(text.nodeValue ?? '')
    ) {
      candidates.push(text);
    }
    node = walker.nextNode();
  }

  for (const text of candidates) {
    const value = text.nodeValue ?? '';
    const frag = doc.createDocumentFragment();
    let last = 0;
    HTTP_URL_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = HTTP_URL_RE.exec(value)) !== null) {
      if (match.index > last) {
        frag.appendChild(doc.createTextNode(value.slice(last, match.index)));
      }
      let url = match[0];
      let trailing = '';
      while (url.length > 0 && TRAILING_PUNCT_RE.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      const a = doc.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.textContent = url;
      frag.appendChild(a);
      if (trailing) frag.appendChild(doc.createTextNode(trailing));
      last = match.index + match[0].length;
    }
    if (last < value.length) {
      frag.appendChild(doc.createTextNode(value.slice(last)));
    }
    text.parentNode?.replaceChild(frag, text);
  }

  return container.innerHTML;
}
