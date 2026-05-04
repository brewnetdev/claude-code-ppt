// Low-level IndexedDB helper for the deck payload store. Sole purpose: stop
// the 5MB localStorage ceiling from blocking decks with multiple data-URL
// images. Lightweight metadata (last-deck-id, hidden-decks) stays in
// localStorage where the sync API matters.

const DB_NAME = 'claude-code-ppt';
// v2 added the `meta` store for non-deck application state — currently
// holds the FileSystemDirectoryHandle granted by the user for HTML
// write-back so we don't show the directory picker on every export.
const DB_VERSION = 2;
const STORE_DECKS = 'decks';
const STORE_META = 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const p = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DECKS)) {
        db.createObjectStore(STORE_DECKS);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'));
    req.onblocked = () => reject(new Error('indexedDB.open blocked'));
  });
  // Reset the cached promise on failure so the next call retries openDB
  // instead of resurrecting the rejected promise.
  p.catch(() => {
    if (dbPromise === p) dbPromise = null;
  });
  dbPromise = p;
  return p;
}

function awaitRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetDeck(deckId: string): Promise<unknown> {
  const db = await openDB();
  const tx = db.transaction(STORE_DECKS, 'readonly');
  return awaitRequest(tx.objectStore(STORE_DECKS).get(deckId));
}

export async function idbPutDeck(deckId: string, value: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_DECKS, 'readwrite');
  await awaitRequest(tx.objectStore(STORE_DECKS).put(value, deckId));
}

export async function idbDeleteDeck(deckId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_DECKS, 'readwrite');
  await awaitRequest(tx.objectStore(STORE_DECKS).delete(deckId));
}

// Meta store — used for non-deck application state. Values are written via
// IDB's structured-clone path so they accept things localStorage cannot
// (e.g. `FileSystemDirectoryHandle`, which the File System Access API
// explicitly designs to be cloneable into IDB so apps can keep folder
// access across reloads).
export async function idbGetMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORE_META, 'readonly');
  const result = await awaitRequest(tx.objectStore(STORE_META).get(key));
  return result as T | undefined;
}

export async function idbPutMeta(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_META, 'readwrite');
  await awaitRequest(tx.objectStore(STORE_META).put(value, key));
}

export async function idbDeleteMeta(key: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_META, 'readwrite');
  await awaitRequest(tx.objectStore(STORE_META).delete(key));
}
