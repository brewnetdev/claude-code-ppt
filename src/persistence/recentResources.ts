// Recent / uploaded resource tracking.
//
// The Resource tab's "기존 리소스" list is a build-time scan of docs/html and
// docs/md — it can't show files a user uploaded in the browser (they never
// touch the bundle) nor reflect saves to arbitrary disk locations. This module
// keeps a small IndexedDB-backed list of resources the user has actually opened
// (uploads included), with enough content to re-open them — edits and all —
// regardless of where (or whether) they were saved to disk.
//
// IDB (not localStorage) because uploaded HTML can be large (inlined images).

import type { ResourceKind } from '../library/resourceRegistry';
import { idbDeleteMeta, idbGetMeta, idbPutMeta } from './idb';

const INDEX_KEY = 'recent-resources:index:v1';
const CONTENT_KEY = (id: string) => `recent-resource:v1:${id}`;
const LIMIT = 30;

export type RecentResource = {
  id: string;
  title: string;
  path: string;
  kind: ResourceKind;
  origin: 'upload' | 'builtin';
  savedAt: number;
};

// Edited flowing-document snapshot, so re-opening an upload restores its edits
// even though it lives only in the browser. `width` is editor view state (the
// document column width) — kept here rather than in the saved HTML because it's
// an editing preference, not document content.
export type RecentDoc = {
  headHtml: string;
  bodyHtml: string;
  lang: string;
  bodyClassName: string;
  width?: number | null;
};

type StoredContent = {
  entry: RecentResource;
  raw: string;
  doc?: RecentDoc;
};

export async function listRecentResources(): Promise<RecentResource[]> {
  return (await idbGetMeta<RecentResource[]>(INDEX_KEY)) ?? [];
}

async function writeIndex(index: RecentResource[]): Promise<void> {
  await idbPutMeta(INDEX_KEY, index.slice(0, LIMIT));
}

// Upsert by id, moving the entry to the front. Drops content for any entry that
// falls past LIMIT so storage stays bounded.
export async function recordRecentResource(
  entry: Omit<RecentResource, 'savedAt'>,
  raw: string,
  doc?: RecentDoc,
): Promise<void> {
  const now = Date.now();
  const full: RecentResource = { ...entry, savedAt: now };
  const index = await listRecentResources();
  const next = [full, ...index.filter((r) => r.id !== entry.id)];
  const kept = next.slice(0, LIMIT);
  const dropped = next.slice(LIMIT);
  await writeIndex(kept);
  await idbPutMeta(CONTENT_KEY(entry.id), { entry: full, raw, doc } satisfies StoredContent);
  for (const d of dropped) await idbDeleteMeta(CONTENT_KEY(d.id));
}

export async function getRecentResourceContent(id: string): Promise<StoredContent | null> {
  return (await idbGetMeta<StoredContent>(CONTENT_KEY(id))) ?? null;
}

// Persist the latest edited document body for a flowing-doc resource. Also
// bumps it to the front of the recents list (most-recently-edited first).
export async function updateRecentDoc(id: string, doc: RecentDoc): Promise<void> {
  const stored = await getRecentResourceContent(id);
  if (!stored) return;
  const now = Date.now();
  const entry: RecentResource = { ...stored.entry, savedAt: now };
  await idbPutMeta(CONTENT_KEY(id), { ...stored, entry, doc } satisfies StoredContent);
  const index = await listRecentResources();
  await writeIndex([entry, ...index.filter((r) => r.id !== id)]);
}

export async function removeRecentResource(id: string): Promise<void> {
  const index = await listRecentResources();
  await writeIndex(index.filter((r) => r.id !== id));
  await idbDeleteMeta(CONTENT_KEY(id));
}
