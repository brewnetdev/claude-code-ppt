import { create } from 'zustand';
import type { ResourceEntry } from '../library/resourceRegistry';

// Store for the flowing-document edit surface (DocumentCanvas). Slide-shaped
// and Markdown resources route through useDeckStore instead — only free-flowing
// HTML lives here. The shape is deliberately small: the iframe owns the live
// DOM, and we just hold the committed body HTML plus the head markup and an
// undo/redo ring that mirrors store.ts's snapshot pattern.

const HISTORY_LIMIT = 50;

export type DocResource = {
  id: string;
  title: string;
  path: string;
  headHtml: string;
  lang: string;
  bodyClassName: string;
};

type Snapshot = { bodyHtml: string };

function pushPast(past: Snapshot[], snap: Snapshot): Snapshot[] {
  const next = [...past, snap];
  if (next.length > HISTORY_LIMIT) next.shift();
  return next;
}

type ResourceState = {
  resource: DocResource | null;
  bodyHtml: string;
  // Bumped on undo/redo to force the DocumentCanvas iframe to re-seed its
  // srcdoc from the restored bodyHtml (the iframe is otherwise uncontrolled).
  revision: number;
  // Document viewport width in px. Shared here (rather than local to
  // DocumentCanvas) so the Properties panel can display the live value and
  // edit it numerically. null = not yet measured (DocumentCanvas seeds a
  // sensible default on open).
  docWidth: number | null;
  past: Snapshot[];
  future: Snapshot[];

  loadDocument: (entry: ResourceEntry, parts: {
    headHtml: string;
    bodyHtml: string;
    lang: string;
    bodyClassName: string;
  }) => void;
  commitBody: (html: string) => void;
  setDocWidth: (w: number | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: () => void;
};

export const useResourceStore = create<ResourceState>((set, get) => ({
  resource: null,
  bodyHtml: '',
  revision: 0,
  docWidth: null,
  past: [],
  future: [],

  loadDocument: (entry, parts) =>
    set({
      resource: {
        id: entry.id,
        title: entry.title,
        path: entry.path,
        headHtml: parts.headHtml,
        lang: parts.lang,
        bodyClassName: parts.bodyClassName,
      },
      bodyHtml: parts.bodyHtml,
      revision: 0,
      docWidth: null,
      past: [],
      future: [],
    }),

  setDocWidth: (w) => set({ docWidth: w }),

  commitBody: (html) =>
    set((state) => {
      if (html === state.bodyHtml) return state;
      return {
        bodyHtml: html,
        past: pushPast(state.past, { bodyHtml: state.bodyHtml }),
        future: [],
      };
    }),

  undo: () =>
    set((state) => {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        bodyHtml: prev.bodyHtml,
        past: state.past.slice(0, -1),
        future: [{ bodyHtml: state.bodyHtml }, ...state.future],
        revision: state.revision + 1,
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        bodyHtml: next.bodyHtml,
        past: pushPast(state.past, { bodyHtml: state.bodyHtml }),
        future: state.future.slice(1),
        revision: state.revision + 1,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  reset: () => set({ resource: null, bodyHtml: '', revision: 0, docWidth: null, past: [], future: [] }),
}));
