import { useEffect } from 'react';
import { getDeckById } from '../library/deckRegistry';
import { useDeckStore } from '../scene/store';
import { saveDeckToLocalStorage } from './localStore';
import { usePersistenceStore } from './persistenceStore';

const DEBOUNCE_MS = 800;

export function useAutoSave(deckId: string | null, enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !deckId) return;
    // Pin the source hash for the lifetime of this active session. The
    // registry is build-time static so this won't change underneath us.
    const sourceHash = getDeckById(deckId)?.sourceHash;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let inflight = false;
    let pending = false;

    const persistNow = async () => {
      if (inflight) {
        pending = true;
        return;
      }
      inflight = true;
      usePersistenceStore.getState().setSaving(true);
      const { slides, overlaysBySlide, currentIndex } = useDeckStore.getState();
      if (slides.length === 0) {
        usePersistenceStore.getState().setSaving(false);
        inflight = false;
        return;
      }
      const result = await saveDeckToLocalStorage(deckId, {
        slides,
        overlaysBySlide,
        currentIndex,
        sourceHash,
      });
      if (result.ok) {
        usePersistenceStore.getState().setSaved(result.savedAt);
      } else {
        usePersistenceStore.getState().setError(result.reason);
      }
      inflight = false;
      if (pending) {
        pending = false;
        void persistNow();
      }
    };

    const unsub = useDeckStore.subscribe((state, prev) => {
      // Only persist when authoring data actually changed.
      if (
        state.slides === prev.slides &&
        state.overlaysBySlide === prev.overlaysBySlide &&
        state.currentIndex === prev.currentIndex
      ) {
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(persistNow, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [deckId, enabled]);
}
