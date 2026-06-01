import { useEffect } from 'react';
import { useResourceStore } from '../scene/resourceStore';
import {
  clearDocCodeSelection,
  clearDocImageSelection,
  setActiveDocFrame,
  setSelectedDocCodeBlock,
  setSelectedDocImage,
  stripSelectionClasses,
} from './documentEditingBridge';

// Window event PropertiesPanel listens to so its format-button active states
// (bold/italic/…) reflect the caret position inside the edit iframe.
export const DOC_SELECTION_EVENT = 'resource-doc-selection-change';

// Editor affordance CSS injected into the iframe — focus outline + a roomy
// caret so the contenteditable surface reads as editable without altering the
// resource's own design.
const EDIT_AFFORDANCE_CSS = `
  body[contenteditable="true"] { outline: none; cursor: text; }
  body[contenteditable="true"] *:focus { outline: 2px solid rgba(56,139,253,0.7); outline-offset: 2px; }
  ::selection { background: rgba(56,139,253,0.35); }
  body[contenteditable="true"] img { cursor: pointer; }
  img.doc-img-selected { outline: 2px solid rgba(56,139,253,0.95); outline-offset: 2px; }
  .doc-code-selected { outline: 2px solid rgba(56,139,253,0.95); outline-offset: 2px; }
`;

type Options = {
  editable: boolean;
  // Called (debounced) with the latest body innerHTML after the user edits.
  onCommit: (bodyHtml: string) => void;
};

// Wires inline editing onto a same-origin srcdoc iframe. The iframe owns the
// live DOM; we make <body> contenteditable, debounce-commit its innerHTML, and
// register the frame with the bridge so PropertiesPanel can drive execCommand.
export function useDocumentEditing(
  frameRef: React.RefObject<HTMLIFrameElement>,
  // Re-run when the document is re-seeded (load / undo / redo) so listeners
  // bind to the fresh contentDocument.
  seed: string,
  { editable, onCommit }: Options,
): void {
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let timer: number | undefined;
    let disposed = false;

    const attach = () => {
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      if (!doc || !win || disposed) return;

      // Affordance stylesheet (idempotent — keyed by id).
      if (!doc.getElementById('__resource_edit_css')) {
        const style = doc.createElement('style');
        style.id = '__resource_edit_css';
        style.textContent = EDIT_AFFORDANCE_CSS;
        doc.head?.appendChild(style);
      }

      doc.body.contentEditable = editable ? 'true' : 'false';
      setActiveDocFrame(frame);
      // Nudge Properties to seed from the now-ready document (watermark state,
      // etc.) even before the user interacts.
      window.dispatchEvent(new CustomEvent(DOC_SELECTION_EVENT));

      // Serialize the body WITHOUT editor-only markers (the image-selection
      // outline class) so they never persist into the saved/exported HTML.
      const serialize = (): string => {
        const clone = doc.body.cloneNode(true) as HTMLElement;
        stripSelectionClasses(clone);
        return clone.innerHTML;
      };

      // IMPORTANT: use the PARENT window's timers, not the iframe's. The iframe
      // is sandboxed without allow-scripts, so its own setTimeout callbacks
      // never fire — a debounce scheduled on `win` would silently never commit.
      // Parent-attached event listeners (input/keydown/etc.) still fire from
      // user interaction; only in-iframe script execution is blocked.
      const scheduleCommit = () => {
        if (!editable) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          onCommit(serialize());
        }, 300);
      };

      const onSelectionChange = () => {
        window.dispatchEvent(new CustomEvent(DOC_SELECTION_EVENT));
      };

      // Keyboard events don't cross the iframe boundary to the parent window,
      // so the Toolbar's global Cmd/Ctrl+Z listener never sees them while focus
      // is inside the document. Handle undo/redo here, routed to the same
      // snapshot store the Toolbar buttons use, and preventDefault so the
      // browser's native (per-keystroke) contenteditable undo doesn't fight it.
      const onKeyDown = (e: KeyboardEvent) => {
        // Enter inside a blockquote exits the quote into a normal paragraph
        // (rather than extending/repeating the quote). Shift+Enter still adds a
        // line break within the quote for multi-line quotes.
        if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && editable) {
          const sel = win.getSelection();
          const anchor = sel && sel.rangeCount > 0 ? sel.anchorNode : null;
          const startEl = anchor
            ? anchor.nodeType === 1
              ? (anchor as Element)
              : anchor.parentElement
            : null;
          const bq = startEl?.closest('blockquote');
          if (bq) {
            e.preventDefault();
            const p = doc.createElement('p');
            p.appendChild(doc.createElement('br'));
            bq.insertAdjacentElement('afterend', p);
            const r = doc.createRange();
            r.setStart(p, 0);
            r.collapse(true);
            sel!.removeAllRanges();
            sel!.addRange(r);
            scheduleCommit();
            return;
          }
        }
        const mod = e.metaKey || e.ctrlKey;
        if (!mod) return;
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          // Flush the pending debounce so the in-progress edit is snapshotted
          // before we step back through history.
          window.clearTimeout(timer);
          useResourceStore.getState().commitBody(serialize());
          if (e.shiftKey) useResourceStore.getState().redo();
          else useResourceStore.getState().undo();
        } else if (key === 'y') {
          e.preventDefault();
          window.clearTimeout(timer);
          useResourceStore.getState().commitBody(serialize());
          useResourceStore.getState().redo();
        }
      };

      // Checklist persistence. The native checkbox toggles itself and the
      // `:checked + *` CSS (in assembleHtmlDocument) strikes the label — no
      // script in the iframe needed. But a native toggle flips the `checked`
      // PROPERTY, not the ATTRIBUTE, so innerHTML serialization wouldn't capture
      // it and the state would be lost on reload. This parent-side listener
      // (the parent isn't sandboxed) mirrors the property onto the attribute and
      // commits. NOTE: `instanceof HTMLInputElement` would be false here — the
      // element belongs to the iframe's realm, not the parent's — so we duck-type
      // via tagName/type.
      const onChange = (ev: Event) => {
        if (!editable) return;
        const t = ev.target as HTMLInputElement | null;
        if (t && t.tagName === 'INPUT' && t.type === 'checkbox' && t.closest('.doc-checklist')) {
          if (t.checked) t.setAttribute('checked', '');
          else t.removeAttribute('checked');
          scheduleCommit();
        }
      };

      // Selection routing: clicking an <img> selects it (size/align controls);
      // clicking a code block selects it (language/source panel); clicking
      // elsewhere clears both. Properties listens via DOC_SELECTION_EVENT.
      const onClick = (ev: MouseEvent) => {
        if (!editable) return;
        const t = ev.target as HTMLElement | null;
        const codeEl = t?.closest<HTMLElement>('.code-block, .terminal') ?? null;
        if (t && t.tagName === 'IMG') {
          setSelectedDocImage(t as HTMLImageElement);
          clearDocCodeSelection();
        } else if (codeEl) {
          setSelectedDocCodeBlock(codeEl);
          clearDocImageSelection();
        } else {
          clearDocImageSelection();
          clearDocCodeSelection();
        }
        window.dispatchEvent(new CustomEvent(DOC_SELECTION_EVENT));
      };

      doc.addEventListener('input', scheduleCommit);
      doc.addEventListener('selectionchange', onSelectionChange);
      doc.addEventListener('keydown', onKeyDown);
      doc.addEventListener('change', onChange);
      doc.addEventListener('click', onClick);

      // Flush on blur so a click away from the iframe lands the latest edit
      // immediately rather than waiting out the debounce.
      const onBlur = () => {
        if (!editable) return;
        window.clearTimeout(timer);
        onCommit(serialize());
      };
      win.addEventListener('blur', onBlur);

      cleanup = () => {
        window.clearTimeout(timer);
        doc.removeEventListener('input', scheduleCommit);
        doc.removeEventListener('selectionchange', onSelectionChange);
        doc.removeEventListener('keydown', onKeyDown);
        doc.removeEventListener('change', onChange);
        doc.removeEventListener('click', onClick);
        win.removeEventListener('blur', onBlur);
      };
    };

    let cleanup = () => {};

    // Critical iframe gotcha: a fresh iframe starts with an initial about:blank
    // document whose readyState is already 'complete'. Attaching to THAT one
    // sets contentEditable / injects CSS on a throwaway doc that the srcdoc load
    // immediately replaces — so edits silently never take. Distinguish the real
    // srcdoc document (location 'about:srcdoc') from the initial blank one.
    const isSrcdocReady = () => {
      const doc = frame.contentDocument;
      if (!doc || doc.readyState !== 'complete') return false;
      const href = frame.contentWindow?.location?.href ?? '';
      return href !== 'about:blank';
    };
    if (isSrcdocReady()) {
      attach();
    } else {
      frame.addEventListener('load', attach, { once: true });
    }

    return () => {
      disposed = true;
      frame.removeEventListener('load', attach);
      cleanup();
      setActiveDocFrame(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameRef, seed, editable]);
}
