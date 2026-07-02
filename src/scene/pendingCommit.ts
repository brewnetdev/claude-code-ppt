// SlideRenderer's typing path (and TextOverlayBox's) is debounced (300ms).
// Without this flush hook, pressing Cmd+Z while a debounce timer is pending
// would mutate the store *before* the in-flight DOM edit commits — and the
// later unmount-drain would then commit the pending DOM on top of the undo,
// defeating it (and destroying redo).
//
// Every active edit surface registers its flush here so undo/redo and deck
// switches can drain them all BEFORE mutating the store. It is a Set, not a
// single slot: the active slide AND any editing text overlay must each be able
// to register — a single slot let the second registrant silently evict the
// first, so an editing overlay's debounce was never flushed on undo.

import { useEffect, useRef, type MutableRefObject } from 'react';

const pendingFlushes = new Set<() => void>();

export function registerPendingFlush(fn: () => void): () => void {
  pendingFlushes.add(fn);
  return () => {
    pendingFlushes.delete(fn);
  };
}

export function flushPendingCommit(): void {
  // Iterate a snapshot — a flush may unregister itself (clears its timer) or
  // trigger a remount that unregisters another mid-iteration.
  for (const fn of [...pendingFlushes]) fn();
}

/**
 * Wire an edit surface's typing-debounce into the global pending-commit Set.
 *
 * `timerRef` holds the live setTimeout id (null when idle); `commit` persists
 * the current DOM to the store. The drain — "clear the timer and commit IFF
 * one is queued" — is (1) registered so undo/redo and deck switches flush it
 * BEFORE the store mutates, and (2) run once more on unmount, so the latest
 * text lands before the DOM disappears.
 *
 * We never commit when the timer is idle: drag-reorder / Moveable already
 * committed atomically, so re-committing the live DOM would push a duplicate
 * snapshot and break single-step undo.
 *
 * SlideRenderer and the editing text overlay shared this exact logic verbatim;
 * keeping it in one place is what guarantees both stay undo-correct together.
 */
export function usePendingFlush(
  timerRef: MutableRefObject<number | null>,
  commit: () => void,
): void {
  // Read commit through a ref so the registered drain is stable (registers
  // once) yet always invokes the latest closure.
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const drainRef = useRef(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    commitRef.current();
  });

  useEffect(() => {
    const drain = drainRef.current;
    const unregister = registerPendingFlush(drain);
    return () => {
      unregister();
      drain(); // drain any pending debounce on unmount
    };
  }, []);
}
