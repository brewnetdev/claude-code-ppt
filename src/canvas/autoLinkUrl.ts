// Auto-linkify a bare http(s) URL when the user presses SPACE right after
// typing it. The export pipeline already linkifies on download
// (`src/exporter/linkify.ts`), but doing nothing in the editor leaves the
// freshly-typed URL as plain black text — confusing because the user can't
// tell whether the deck "saw" the URL until they ship it. Wrapping at edit
// time gives the same visual feedback (blue underline, anchor styling) that
// users expect from Notion / Google Docs / Slack.
//
// Scope: SPACE only. Enter is intentionally skipped — list-item Enter is
// already owned by `onListItemEnter` in useSlideEditing, and chaining DOM
// mutations across both handlers is fragile. Users who type a URL and press
// Enter still get the link in export (linkifyHtml in htmlBundle.ts).

const URL_TAIL_RE = /(?:^|[\s ])(https?:\/\/[^\s<>"']+)$/;
const TRAILING_PUNCT_RE = /[.,;:!?)\]}>]$/;
const SKIP_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE']);

function isInsideSkipped(node: Node): boolean {
  let p: Element | null = node.parentElement;
  while (p) {
    if (SKIP_TAGS.has(p.tagName)) return true;
    p = p.parentElement;
  }
  return false;
}

// Returns true if the event was consumed (URL wrapped + space inserted).
// Caller has already verified the event target is inside an editable region.
export function tryAutoLinkOnSpace(e: InputEvent): boolean {
  if (e.inputType !== 'insertText') return false;
  if (e.data !== ' ') return false;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const container = range.startContainer;
  if (container.nodeType !== Node.TEXT_NODE) return false;
  if (isInsideSkipped(container)) return false;

  const textNode = container as Text;
  const caretOffset = range.startOffset;
  const before = (textNode.nodeValue ?? '').slice(0, caretOffset);
  const match = before.match(URL_TAIL_RE);
  if (!match) return false;

  const rawUrl = match[1];
  let url = rawUrl;
  let trailing = '';
  while (url.length > 0 && TRAILING_PUNCT_RE.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }
  if (url.length === 0) return false;

  const urlStart = caretOffset - rawUrl.length;
  // Delete the full RAW match (URL + any trailing punctuation) so we own the
  // entire span. The trimmed `url` goes inside the anchor; the `trailing`
  // chars come back outside. If we deleted only `url.length`, the residual
  // punctuation would survive at its original offset and end up duplicated
  // when we re-insert `trailing` from the tail text node below.
  const urlEnd = urlStart + rawUrl.length;

  e.preventDefault();

  const doc = textNode.ownerDocument ?? document;
  const replaceRange = doc.createRange();
  replaceRange.setStart(textNode, urlStart);
  replaceRange.setEnd(textNode, urlEnd);
  replaceRange.deleteContents();

  const anchor = doc.createElement('a');
  anchor.setAttribute('href', url);
  anchor.setAttribute('target', '_blank');
  anchor.setAttribute('rel', 'noopener noreferrer');
  anchor.textContent = url;

  // The remaining text node now has [textBefore][trailing][textAfter] with
  // caret-relative offsets shifted by the URL deletion. Insert the anchor at
  // the URL's old start position.
  replaceRange.insertNode(anchor);

  // Park the caret AFTER the anchor and after the simulated space. Using a
  // fresh text node sibling means subsequent typing extends that node, not
  // the anchor — otherwise the browser would happily keep growing the link
  // text as the user keeps typing past the URL.
  const tail = doc.createTextNode(`${trailing} `);
  if (anchor.nextSibling) {
    anchor.parentNode?.insertBefore(tail, anchor.nextSibling);
  } else {
    anchor.parentNode?.appendChild(tail);
  }

  const newRange = doc.createRange();
  newRange.setStart(tail, tail.nodeValue?.length ?? 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  return true;
}
