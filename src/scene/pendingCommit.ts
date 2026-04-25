// SlideRenderer's typing path is debounced (300ms) — without this flush
// hook, pressing Cmd+Z while a debounce timer is pending would unmount
// the slide *before* the in-flight DOM edit commits. The unmount cleanup
// would then commit the pending DOM (typed text) right after undo()
// reverted the store, defeating the undo. The active slide registers
// here so undo/redo can flush before mutating the store.

let pendingFlush: (() => void) | null = null;

export function registerPendingFlush(fn: () => void): () => void {
  pendingFlush = fn;
  return () => {
    if (pendingFlush === fn) pendingFlush = null;
  };
}

export function flushPendingCommit(): void {
  pendingFlush?.();
}
