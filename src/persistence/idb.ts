// Low-level IndexedDB helper for the deck payload store. Sole purpose: stop
// the 5MB localStorage ceiling from blocking decks with multiple data-URL
// images. Lightweight metadata (last-deck-id, hidden-decks) stays in
// localStorage where the sync API matters.

const DB_NAME = 'claude-code-ppt';
const DB_VERSION = 1;
const STORE_DECKS = 'decks';

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
