import { create } from 'zustand';

type PersistenceStatus = {
  lastSavedAt: number | null;
  lastError: string | null;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setSaved: (t: number) => void;
  setError: (msg: string) => void;
  reset: () => void;
};

export const usePersistenceStore = create<PersistenceStatus>((set) => ({
  lastSavedAt: null,
  lastError: null,
  saving: false,
  setSaving: (v) => set({ saving: v }),
  setSaved: (t) => set({ lastSavedAt: t, lastError: null, saving: false }),
  setError: (msg) => set({ lastError: msg, saving: false }),
  reset: () => set({ lastSavedAt: null, lastError: null, saving: false }),
}));
