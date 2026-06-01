// Decouples PropertiesPanel (parent document) from DocumentCanvas (the edit
// iframe). The iframe is same-origin (srcdoc), so the parent can drive
// formatting via execCommand against the iframe's own selection — but only if
// it can reach that iframe's document. Rather than prop-drill the iframe ref
// through App → PropertiesPanel, DocumentCanvas registers its live iframe here
// on mount and PropertiesPanel reads it on demand.
//
// Selection preservation: format buttons must call preventDefault on mousedown
// so focus never leaves the iframe — execCommand then applies to the range the
// user actually has selected inside the document.

import {
  WATERMARK_CLASS,
  WATERMARK_DEFAULT_LINES,
  WATERMARK_LAYER_CLASS,
  watermarkLayerHtml,
} from '../watermark/watermark';

let activeFrame: HTMLIFrameElement | null = null;

export function setActiveDocFrame(frame: HTMLIFrameElement | null): void {
  activeFrame = frame;
}

function activeDoc(): Document | null {
  try {
    return activeFrame?.contentDocument ?? null;
  } catch {
    return null;
  }
}

// Run a contenteditable formatting command inside the edit iframe. Returns
// false when there's no live document (caller can no-op silently).
export function execDocCommand(command: string, value?: string): boolean {
  const doc = activeFrame?.contentDocument;
  if (!doc) return false;
  try {
    // styleWithCSS makes foreColor/backColor/fontSize emit inline style spans
    // rather than deprecated <font> tags — cleaner round-trip into the saved
    // HTML and closer to how the rest of the editor stores formatting.
    doc.execCommand('styleWithCSS', false, 'true');
    doc.execCommand(command, false, value);
    return true;
  } catch {
    return false;
  }
}

// execCommand mutations fire the iframe's 'input' event, which useDocumentEditing
// debounce-commits. Manual DOM edits (wrapSelectionStyle below) don't, so they
// call this to nudge the same commit path.
function notifyInput(): void {
  const doc = activeDoc();
  doc?.body?.dispatchEvent(new Event('input', { bubbles: true }));
}

// Wrap the current selection in a <span> carrying an inline style — used for
// font-size (px), which execCommand('fontSize') can't express (it's limited to
// the legacy 1–7 scale). extractContents handles partial/inline selections;
// multi-block selections degrade gracefully (the span just wraps the fragment).
export function wrapSelectionStyle(prop: string, value: string): boolean {
  const doc = activeFrame?.contentDocument;
  const win = activeFrame?.contentWindow;
  if (!doc || !win) return false;
  const sel = win.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  try {
    const span = doc.createElement('span');
    span.style.setProperty(prop, value);
    span.appendChild(range.extractContents());
    range.insertNode(span);
    const r = doc.createRange();
    r.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(r);
    notifyInput();
    return true;
  } catch {
    return false;
  }
}

// Insert plain text (e.g. an emoji icon) at the document caret. Uses
// execCommand('insertText') so it lands at the iframe's current selection even
// when focus is on a parent toolbar control (same path the format buttons use).
export function insertDocText(text: string): boolean {
  const doc = activeDoc();
  if (!doc?.body) return false;
  if (execDocCommand('insertText', text)) return true;
  // Fallback: no usable selection — append at end of body.
  doc.body.appendChild(doc.createTextNode(text));
  notifyInput();
  return true;
}

// Insert an image. `src` is a data: URL (uploaded files are inlined, matching
// how slide overlays store images). Built with DOM APIs (not
// execCommand('insertImage')) so it works even when the iframe has no caret —
// execCommand silently no-ops without a selection, which made the button do
// nothing unless the user had clicked into the body first. Falls back to
// appending at the end of the body.
export function insertDocImage(src: string): boolean {
  const doc = activeDoc();
  const win = activeFrame?.contentWindow;
  if (!doc?.body || !win) return false;
  const img = doc.createElement('img');
  img.src = src;
  const sel = win.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    doc.body.appendChild(img);
  }
  notifyInput();
  return true;
}

// Insert a checklist (`<ul class="doc-checklist">`). Each item is a native
// checkbox + label span; the `.doc-checklist input:checked + *` rule (shipped
// in assembleHtmlDocument's head, so it applies while editing AND in the saved
// file) strikes the label when checked. Toggling/persistence is handled
// parent-side in useDocumentEditing because the iframe runs no scripts.
//
// Built with DOM APIs rather than execCommand('insertHTML'): the latter's
// fragment sanitizer strips the empty-ish <span>, which would leave the
// checkbox with no element sibling for the `:checked + *` strike rule to hit.
export function insertDocChecklist(): boolean {
  const doc = activeFrame?.contentDocument;
  const win = activeFrame?.contentWindow;
  if (!doc || !win) return false;
  const sel = win.getSelection();
  const text = sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.toString() : '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = lines.length ? lines : ['할 일'];

  const ul = doc.createElement('ul');
  ul.className = 'doc-checklist';
  for (const t of items) {
    const li = doc.createElement('li');
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.contentEditable = 'false';
    const span = doc.createElement('span');
    span.textContent = t;
    li.append(input, span);
    ul.append(li);
  }

  try {
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(ul);
      range.setStartAfter(ul);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      doc.body.appendChild(ul);
    }
    notifyInput();
    return true;
  } catch {
    return false;
  }
}

// Turn the selection into a link, or — when nothing is selected — insert the
// URL itself as a clickable link at the caret.
export function createDocLink(url: string): boolean {
  const win = activeFrame?.contentWindow;
  const sel = win?.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    return execDocCommand('createLink', url);
  }
  const safe = url.replace(/"/g, '&quot;');
  return execDocCommand('insertHTML', `<a href="${safe}">${url}</a>`);
}

// ── Watermark (document mode) ────────────────────────────────────────────────

export type DocWatermarkState = { enabled: boolean; lines: string[] };

// Reads watermark state from the live document. A watermark may exist as our
// fixed layer OR as standalone `.cc-watermark` spans baked into the source
// (slide-style brand watermark). Detect BOTH so the checkbox reflects reality —
// otherwise the box reads "off" while a watermark shows, and toggling on stacks
// a second one.
export function getDocWatermark(): DocWatermarkState {
  const doc = activeDoc();
  if (!doc) return { enabled: false, lines: WATERMARK_DEFAULT_LINES };
  const layer = doc.querySelector(`.${WATERMARK_LAYER_CLASS}`);
  if (layer) {
    const lines = Array.from(layer.querySelectorAll('span'))
      .map((s) => (s.textContent ?? '').trim())
      .filter(Boolean);
    return { enabled: true, lines: lines.length ? lines : WATERMARK_DEFAULT_LINES };
  }
  const spans = Array.from(doc.querySelectorAll(`.${WATERMARK_CLASS}`));
  if (spans.length) {
    const lines = spans.map((s) => (s.textContent ?? '').trim()).filter(Boolean);
    return { enabled: true, lines: lines.length ? lines : WATERMARK_DEFAULT_LINES };
  }
  return { enabled: false, lines: WATERMARK_DEFAULT_LINES };
}

// Adds / replaces / removes the watermark and commits. Always strips EVERY
// existing watermark first — both our layer and any standalone baked spans —
// so unchecking clears the document's watermark and re-checking never doubles.
export function setDocWatermark(enabled: boolean, lines: string[]): boolean {
  const doc = activeDoc();
  if (!doc?.body) return false;
  doc.querySelectorAll(`.${WATERMARK_LAYER_CLASS}`).forEach((el) => el.remove());
  doc.querySelectorAll(`.${WATERMARK_CLASS}`).forEach((el) => el.remove());
  if (enabled) {
    const cleaned = lines.map((l) => l.trim()).filter(Boolean);
    const tmp = doc.createElement('div');
    tmp.innerHTML = watermarkLayerHtml(cleaned.length ? cleaned : WATERMARK_DEFAULT_LINES);
    const layer = tmp.firstElementChild;
    if (layer) doc.body.appendChild(layer);
  }
  notifyInput();
  return true;
}

// ── Image selection / sizing (document mode) ─────────────────────────────────

export const IMG_SELECTED_CLASS = 'doc-img-selected';

let selectedImg: HTMLImageElement | null = null;

// Marks an image as selected (outline via the IMG_SELECTED_CLASS affordance CSS,
// which is editor-only and stripped on commit). Pass null to clear.
export function setSelectedDocImage(img: HTMLImageElement | null): void {
  const doc = activeDoc();
  doc?.querySelectorAll(`img.${IMG_SELECTED_CLASS}`).forEach((el) => el.classList.remove(IMG_SELECTED_CLASS));
  selectedImg = img && img.isConnected ? img : null;
  if (selectedImg) selectedImg.classList.add(IMG_SELECTED_CLASS);
}

export function clearDocImageSelection(): void {
  setSelectedDocImage(null);
}

// Delete the selected image from the document and commit. Returns false if none.
export function deleteSelectedDocImage(): boolean {
  if (!selectedImg) return false;
  selectedImg.remove();
  selectedImg = null;
  notifyInput();
  return true;
}

// The element whose top/bottom margin produces the visible gap around the
// image. Uploaded docs often wrap images in a sole-child <figure>/<p>/<div>
// whose margin (not the img's) is the gap — target that wrapper so setting the
// margin to 0 actually closes the space. Otherwise target the image itself.
function imageGapTarget(img: HTMLImageElement): HTMLElement {
  const p = img.parentElement;
  if (
    p &&
    /^(FIGURE|P|DIV)$/.test(p.tagName) &&
    p.children.length === 1 &&
    (p.textContent ?? '').trim() === ''
  ) {
    return p;
  }
  return img;
}

// The block-level wrapper whose text-align governs horizontal placement of the
// image. Notion-style exports nest the image in an inline <a> inside a
// <figure class="image"> — margin:auto on the inline image does nothing, so we
// align via the nearest FIGURE/P/DIV wrapper instead. Returns the image itself
// when it has no such wrapper (e.g. a bare block image), so the caller can fall
// back to auto-margin centering.
function imageAlignTarget(img: HTMLImageElement): HTMLElement {
  let el = img.parentElement;
  while (el && el.tagName !== 'BODY') {
    if (/^(FIGURE|P|DIV)$/.test(el.tagName)) return el;
    el = el.parentElement;
  }
  return img;
}

export type DocImageState = {
  selected: boolean;
  width: number;
  height: number;
  align: 'left' | 'center' | 'right' | 'none';
  marginTop: number;
  marginBottom: number;
};

export function getDocImageState(): DocImageState {
  if (!selectedImg || !selectedImg.isConnected) {
    selectedImg = null;
    return { selected: false, width: 0, height: 0, align: 'none', marginTop: 0, marginBottom: 0 };
  }
  const rect = selectedImg.getBoundingClientRect();
  const win = selectedImg.ownerDocument.defaultView;
  let align: DocImageState['align'] = 'none';
  if (selectedImg.style.display === 'block') {
    // Auto-margin centering (the image box positioned directly).
    const ml = selectedImg.style.marginLeft === 'auto';
    const mr = selectedImg.style.marginRight === 'auto';
    align = ml && mr ? 'center' : ml ? 'right' : mr ? 'left' : 'left';
  } else {
    // Inline / anchor-wrapped image — read text-align from the anchor or the
    // nearest block wrapper.
    const anchor =
      selectedImg.parentElement?.tagName === 'A'
        ? (selectedImg.parentElement as HTMLElement)
        : null;
    const el = anchor ?? imageAlignTarget(selectedImg);
    if (el && el !== selectedImg) {
      const ta = win?.getComputedStyle(el).textAlign ?? '';
      align =
        ta === 'center'
          ? 'center'
          : ta === 'right' || ta === 'end'
            ? 'right'
            : ta === 'left' || ta === 'start'
              ? 'left'
              : 'none';
    }
  }
  const cs = win?.getComputedStyle(imageGapTarget(selectedImg));
  const mt = Math.round(parseFloat(cs?.marginTop ?? '0') || 0);
  const mb = Math.round(parseFloat(cs?.marginBottom ?? '0') || 0);
  return {
    selected: true,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    align,
    marginTop: mt,
    marginBottom: mb,
  };
}

// Apply size / alignment / vertical margin to the selected image and commit.
// width/height: number (px) or null to clear to auto. marginTop/marginBottom:
// number (px, 0 closes the gap by overriding the doc's CSS margin) or null to
// revert to the document's own styling.
export function applyDocImageStyle(patch: {
  width?: number | null;
  height?: number | null;
  align?: 'left' | 'center' | 'right';
  marginTop?: number | null;
  marginBottom?: number | null;
}): boolean {
  if (!selectedImg) return false;
  if (patch.width !== undefined) selectedImg.style.width = patch.width ? `${patch.width}px` : '';
  if (patch.height !== undefined) selectedImg.style.height = patch.height ? `${patch.height}px` : '';
  if (patch.align) {
    const align = patch.align;
    const wrapper = imageAlignTarget(selectedImg);
    const anchor =
      selectedImg.parentElement?.tagName === 'A'
        ? (selectedImg.parentElement as HTMLElement)
        : null;
    if (anchor) {
      // Inline image wrapped in an <a> (e.g. Notion's <figure><a><img>): make
      // the anchor a block and center its inline content via text-align. Clear
      // any block/margins on the image so they don't fight it.
      selectedImg.style.display = '';
      selectedImg.style.marginLeft = '';
      selectedImg.style.marginRight = '';
      anchor.style.display = 'block';
      anchor.style.textAlign = align;
      if (wrapper !== selectedImg) wrapper.style.textAlign = align;
    } else {
      // Image is a direct child of its container. Centering via the parent's
      // text-align only works while the image is inline-level; many docs render
      // images as display:block (which ignores text-align), so we position the
      // image box itself with auto margins — the reliable cross-case approach.
      selectedImg.style.display = 'block';
      selectedImg.style.marginLeft = align === 'left' ? '0' : 'auto';
      selectedImg.style.marginRight = align === 'right' ? '0' : 'auto';
      // Belt-and-suspenders for inline-level images: also set wrapper text-align.
      if (wrapper !== selectedImg) wrapper.style.textAlign = align;
    }
  }
  if (patch.marginTop !== undefined || patch.marginBottom !== undefined) {
    const target = imageGapTarget(selectedImg);
    // Vertical margin is ignored on inline images — promote to block.
    if (target === selectedImg && selectedImg.style.display !== 'block') {
      selectedImg.style.display = 'block';
    }
    if (patch.marginTop !== undefined) {
      target.style.marginTop = patch.marginTop != null ? `${patch.marginTop}px` : '';
    }
    if (patch.marginBottom !== undefined) {
      target.style.marginBottom = patch.marginBottom != null ? `${patch.marginBottom}px` : '';
    }
  }
  notifyInput();
  return true;
}

// Strip editor-only selection classes (image + code block + block) from a
// serialized body clone so they never land in the saved/exported HTML.
export function stripSelectionClasses(bodyEl: HTMLElement): void {
  bodyEl
    .querySelectorAll(`.${IMG_SELECTED_CLASS}, .${CODE_SELECTED_CLASS}, .${BLOCK_SELECTED_CLASS}`)
    .forEach((el) => {
      el.classList.remove(IMG_SELECTED_CLASS, CODE_SELECTED_CLASS, BLOCK_SELECTED_CLASS);
      if (el.getAttribute('class') === '') el.removeAttribute('class');
    });
}

// ── Block width (document mode) ──────────────────────────────────────────────
// Lets the user resize an individual content block (paragraph / table / figure
// / list …) by dragging a handle on its right edge — independent of the
// document-wide width. The chosen width is written as an inline style so it
// round-trips into the saved/exported HTML; the selection outline class is
// editor-only and stripped on serialize.

export const BLOCK_SELECTED_CLASS = 'doc-block-selected';

let selectedBlock: HTMLElement | null = null;

export function setSelectedDocBlock(el: HTMLElement | null): void {
  const doc = activeDoc();
  doc?.querySelectorAll(`.${BLOCK_SELECTED_CLASS}`).forEach((e) => e.classList.remove(BLOCK_SELECTED_CLASS));
  selectedBlock = el && el.isConnected ? el : null;
  if (selectedBlock) selectedBlock.classList.add(BLOCK_SELECTED_CLASS);
}

export function getSelectedDocBlock(): HTMLElement | null {
  if (selectedBlock && !selectedBlock.isConnected) selectedBlock = null;
  return selectedBlock;
}

export function clearDocBlockSelection(): void {
  const doc = activeDoc();
  doc?.querySelectorAll(`.${BLOCK_SELECTED_CLASS}`).forEach((e) => e.classList.remove(BLOCK_SELECTED_CLASS));
  selectedBlock = null;
}

// Apply an explicit pixel width to the selected block (null clears it back to
// the document's own layout). When the block is a flex child, also pin its flex
// basis so the chosen width isn't overridden by the flex container. commit=true
// nudges the debounced save (skip it during a live drag, commit once on release).
export function applyDocBlockWidth(px: number | null, commit: boolean): boolean {
  if (!selectedBlock || !selectedBlock.isConnected) return false;
  const el = selectedBlock;
  if (px == null) {
    el.style.width = '';
    el.style.maxWidth = '';
    el.style.flex = '';
  } else {
    el.style.width = `${px}px`;
    el.style.maxWidth = 'none';
    const parent = el.parentElement;
    const win = el.ownerDocument.defaultView;
    const disp = parent && win ? win.getComputedStyle(parent).display : '';
    if (disp === 'flex' || disp === 'inline-flex') el.style.flex = `0 0 ${px}px`;
  }
  if (commit) notifyInput();
  return true;
}

// ── Code block (document mode) ───────────────────────────────────────────────

export const CODE_SELECTED_CLASS = 'doc-code-selected';

let selectedCode: HTMLElement | null = null;

export function setSelectedDocCodeBlock(el: HTMLElement | null): void {
  const doc = activeDoc();
  doc?.querySelectorAll(`.${CODE_SELECTED_CLASS}`).forEach((e) => e.classList.remove(CODE_SELECTED_CLASS));
  selectedCode = el && el.isConnected ? el : null;
  if (selectedCode) selectedCode.classList.add(CODE_SELECTED_CLASS);
}

export function getSelectedDocCodeBlock(): HTMLElement | null {
  if (selectedCode && !selectedCode.isConnected) selectedCode = null;
  return selectedCode;
}

export function clearDocCodeSelection(): void {
  const doc = activeDoc();
  doc?.querySelectorAll(`.${CODE_SELECTED_CLASS}`).forEach((e) => e.classList.remove(CODE_SELECTED_CLASS));
  selectedCode = null;
}

// Delete the selected code block from the document and commit. Returns false if none.
export function deleteSelectedDocCodeBlock(): boolean {
  if (!selectedCode) return false;
  selectedCode.remove();
  selectedCode = null;
  notifyInput();
  return true;
}

// Insert a prebuilt code-block (the shared shiki `.code-block` markup) into the
// document. The block is contenteditable=false so the caret treats it as an
// atomic unit (edit its source via the Properties code panel, like the deck). A
// trailing empty paragraph is added so the user can keep typing after it.
export function insertDocCodeBlock(html: string): boolean {
  const doc = activeDoc();
  const win = activeFrame?.contentWindow;
  if (!doc?.body || !win) return false;
  const tmp = doc.createElement('div');
  tmp.innerHTML = html;
  const node = tmp.firstElementChild as HTMLElement | null;
  if (!node) return false;
  node.contentEditable = 'false';
  const sel = win.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    range.insertNode(node);
    const p = doc.createElement('p');
    p.appendChild(doc.createElement('br'));
    node.insertAdjacentElement('afterend', p);
    range.setStart(p, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    doc.body.appendChild(node);
  }
  notifyInput();
  return true;
}

export type DocSelectionState = {
  hasSelection: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
};

export function getDocSelectionState(): DocSelectionState {
  const doc = activeDoc();
  const sel = activeFrame?.contentWindow?.getSelection();
  const hasSelection = Boolean(sel && sel.rangeCount > 0 && !sel.isCollapsed);
  const q = (cmd: string): boolean => {
    try {
      return doc?.queryCommandState(cmd) ?? false;
    } catch {
      return false;
    }
  };
  return {
    hasSelection,
    bold: q('bold'),
    italic: q('italic'),
    underline: q('underline'),
    strike: q('strikeThrough'),
  };
}
