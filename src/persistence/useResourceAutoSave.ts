import { useEffect } from 'react';
import { getStoredResourceFile, recordWrittenMtime, writeFileHandle } from '../exporter/fileSystemAccess';
import { assembleHtmlDocument } from '../importer/detectResource';
import { useResourceStore } from '../scene/resourceStore';
import { usePersistenceStore } from './persistenceStore';
import { updateRecentDoc } from './recentResources';

const DEBOUNCE_MS = 800;

// Near-real-time write-back for flowing-document edits. Mirrors useAutoSave's
// debounce/inflight shape but the sink is the source file on disk via the File
// System Access API rather than IndexedDB.
//
// Constraints that shape this:
//   - The first permission grant needs a user gesture (the 💾 Save button,
//     which opens the Save-As dialog and stores a file handle). Until a handle
//     exists for this resource, getStoredResourceFile(..., false) returns null
//     and we silently skip — manual Save bootstraps it.
//   - Works for both built-in and uploaded resources, since the binding is the
//     user-chosen file handle, not a project-relative path.
export function useResourceAutoSave(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let inflight = false;
    let pending = false;

    const persistNow = async () => {
      const { resource, bodyHtml, docWidth } = useResourceStore.getState();
      if (!resource) return;
      if (inflight) {
        pending = true;
        return;
      }
      // Always persist the edited document to the recents store (IDB) so the
      // resource — uploads included — re-opens from the library list with edits
      // intact, independent of any on-disk file. `width` is editor view state
      // (not part of the saved HTML), so it rides along here. Fire-and-forget;
      // failures here shouldn't block the FSA write-back below.
      void updateRecentDoc(resource.id, {
        headHtml: resource.headHtml,
        bodyHtml,
        lang: resource.lang,
        bodyClassName: resource.bodyClassName,
        width: docWidth,
      });
      // withGesture=false: never prompt for permission from a timer. If the
      // handle isn't already granted, skip the file write until the next manual
      // Save (the recents snapshot above already captured the edit).
      const handle = await getStoredResourceFile(resource.id, false);
      if (!handle) return;

      inflight = true;
      usePersistenceStore.getState().setSaving(true);
      try {
        const html = assembleHtmlDocument({
          headHtml: resource.headHtml,
          bodyHtml,
          lang: resource.lang,
          bodyClassName: resource.bodyClassName,
          title: resource.title,
          // Persist the chosen canvas width onto the file (data-doc-width) so
          // reopening from the source restores it.
          docWidth,
        });
        await writeFileHandle(handle, html);
        await recordWrittenMtime(resource.id, handle);
        usePersistenceStore.getState().setSaved(Date.now());
      } catch (err) {
        usePersistenceStore.getState().setError(
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        inflight = false;
        if (pending) {
          pending = false;
          void persistNow();
        }
      }
    };

    const unsub = useResourceStore.subscribe((state, prev) => {
      // Persist on content edits AND width changes (the latter is view state and
      // wouldn't otherwise trigger a save, so reopening lost the width).
      if (state.bodyHtml === prev.bodyHtml && state.docWidth === prev.docWidth) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(persistNow, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
