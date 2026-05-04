import { create } from 'zustand';

// `sourceStale` is set at deck open time when the cache's recorded sourceHash
// no longer matches the registry's current value — i.e. the on-disk HTML has
// been re-published since the user's edits were captured. Surfaces a banner
// so the user can choose to keep their edits or refresh from source. Cleared
// when the user dismisses the banner or chooses refresh.
type PersistenceStatus = {
  lastSavedAt: number | null;
  lastError: string | null;
  saving: boolean;
  sourceStale: boolean;
  setSaving: (v: boolean) => void;
  setSaved: (t: number) => void;
  setError: (msg: string) => void;
  setSourceStale: (v: boolean) => void;
  reset: () => void;
};

export const usePersistenceStore = create<PersistenceStatus>((set) => ({
  lastSavedAt: null,
  lastError: null,
  saving: false,
  sourceStale: false,
  setSaving: (v) => set({ saving: v }),
  setSaved: (t) => set({ lastSavedAt: t, lastError: null, saving: false }),
  setError: (msg) => set({ lastError: msg, saving: false }),
  setSourceStale: (v) => set({ sourceStale: v }),
  reset: () => set({ lastSavedAt: null, lastError: null, saving: false, sourceStale: false }),
}));
