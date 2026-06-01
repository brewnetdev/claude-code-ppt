// Thin wrapper over the File System Access API so HTML export can write
// straight into docs/html/<template>/<id>.html instead of forcing the user
// to download a file and drop it back into the source tree.
//
// Lifecycle:
//   1. First export: showDirectoryPicker prompts the user for the docs/html/
//      folder. The granted handle is stored in IDB (the API explicitly
//      structures handles for clone into IDB so they survive reloads).
//   2. Subsequent exports: we re-use the cached handle. Browsers drop the
//      "granted" permission state across reloads, so we re-request inside
//      the click handler — that runs in a user gesture and avoids the
//      AbortError that fires when requestPermission is called outside one.
//   3. Stale handle (folder moved/deleted): caller catches the error and
//      calls clearStoredExportRoot() so the next attempt re-prompts.
//
// Browser support: Chromium-based browsers only. Firefox/Safari should fall
// back to the existing downloadBlob path — see isFsaSupported() callers.

import { idbDeleteMeta, idbGetMeta, idbPutMeta } from '../persistence/idb';

const META_KEY = 'export-root-handle:v1';

// `showDirectoryPicker` and the `mode`-bearing permission methods are part
// of the WICG File System Access spec, which lib.dom hasn't fully adopted
// yet. Declare just enough to keep the rest of the module strongly typed.
type PermissionState = 'granted' | 'denied' | 'prompt';
type PermissionDescriptor = { mode: 'read' | 'readwrite' };

interface FsaDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission(desc: PermissionDescriptor): Promise<PermissionState>;
  requestPermission(desc: PermissionDescriptor): Promise<PermissionState>;
}

interface ShowDirectoryPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

declare global {
  interface Window {
    showDirectoryPicker?: (
      options?: ShowDirectoryPickerOptions,
    ) => Promise<FsaDirectoryHandle>;
  }
}

export function isFsaSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function ensureWritable(handle: FsaDirectoryHandle): Promise<boolean> {
  const desc: PermissionDescriptor = { mode: 'readwrite' };
  const current = await handle.queryPermission(desc);
  if (current === 'granted') return true;
  // Must be invoked from a user gesture — callers ensure that by routing
  // through the Export click handler.
  const next = await handle.requestPermission(desc);
  return next === 'granted';
}

export async function getStoredExportRoot(): Promise<FsaDirectoryHandle | null> {
  if (!isFsaSupported()) return null;
  const handle = await idbGetMeta<FsaDirectoryHandle>(META_KEY);
  if (!handle) return null;
  const ok = await ensureWritable(handle);
  if (!ok) return null;
  return handle;
}

export async function pickExportRoot(): Promise<FsaDirectoryHandle | null> {
  if (!isFsaSupported() || !window.showDirectoryPicker) return null;
  try {
    const handle = await window.showDirectoryPicker({
      id: 'claude-code-ppt-docs-html',
      mode: 'readwrite',
      startIn: 'documents',
    });
    const ok = await ensureWritable(handle);
    if (!ok) return null;
    await idbPutMeta(META_KEY, handle);
    return handle;
  } catch (err) {
    // User dismissed the picker — not an error worth bubbling up.
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
}

export async function clearStoredExportRoot(): Promise<void> {
  await idbDeleteMeta(META_KEY);
}

// ── Resource (flowing-document) write-back via a per-file handle ─────────────
//
// Earlier this used a single directory handle + path navigation, but that
// forced the user to pick the exact project root or the write silently fell
// back to download (picking docs/html instead of the repo root broke the
// docs/… navigation). showSaveFilePicker is far less error-prone: the user
// navigates straight to the target file once, we persist that FileSystemFile-
// Handle keyed by resource id, and every later save (manual or auto) writes to
// it silently. This is a real "save in place", cleanly distinct from Export's
// blob download.

type FsaFileHandle = FileSystemFileHandle & {
  queryPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
};

interface ShowSaveFilePickerOptions {
  id?: string;
  suggestedName?: string;
  startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  types?: { description?: string; accept: Record<string, string[]> }[];
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: ShowSaveFilePickerOptions) => Promise<FsaFileHandle>;
  }
}

const RESOURCE_FILE_KEY = (id: string) => `resource-file-handle:v1:${id}`;

async function fileHandleWritable(handle: FsaFileHandle, withGesture: boolean): Promise<boolean> {
  const desc = { mode: 'readwrite' as const };
  const current = await handle.queryPermission(desc);
  if (current === 'granted') return true;
  // requestPermission must run inside a user gesture. Auto-save passes
  // withGesture=false so it never throws/looping — it just skips until the
  // next manual Save re-grants.
  if (!withGesture) return false;
  const next = await handle.requestPermission(desc);
  return next === 'granted';
}

// Returns the stored, write-permitted handle for this resource, or null.
// `withGesture` distinguishes a manual Save (may prompt for permission) from
// auto-save (must stay silent).
export async function getStoredResourceFile(
  resourceId: string,
  withGesture: boolean,
): Promise<FsaFileHandle | null> {
  if (!isFsaSupported()) return null;
  const handle = await idbGetMeta<FsaFileHandle>(RESOURCE_FILE_KEY(resourceId));
  if (!handle) return null;
  const ok = await fileHandleWritable(handle, withGesture);
  return ok ? handle : null;
}

// Opens the Save-As dialog, persists the chosen handle for this resource, and
// returns it. Returns null if the user cancels. Must be called from a gesture.
export async function pickResourceFile(
  resourceId: string,
  suggestedName: string,
): Promise<FsaFileHandle | null> {
  if (!isFsaSupported() || !window.showSaveFilePicker) return null;
  try {
    const isMd = /\.md$/i.test(suggestedName);
    const handle = await window.showSaveFilePicker({
      id: 'claude-code-ppt-resource',
      suggestedName,
      types: isMd
        ? [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
        : [{ description: 'HTML', accept: { 'text/html': ['.html', '.htm'] } }],
    });
    const ok = await fileHandleWritable(handle, true);
    if (!ok) return null;
    await idbPutMeta(RESOURCE_FILE_KEY(resourceId), handle);
    return handle;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
}

export async function clearResourceFile(resourceId: string): Promise<void> {
  await idbDeleteMeta(RESOURCE_FILE_KEY(resourceId));
}

// Writes content to an already-resolved file handle. Returns the file name.
export async function writeFileHandle(handle: FsaFileHandle, content: string): Promise<string> {
  const writer = await handle.createWritable();
  await writer.write(content);
  await writer.close();
  return handle.name;
}

// Writes the bundle to <root>/<template>/<id>.html, creating the template
// subdirectory on demand. Returns a human-readable path for status UX.
export async function writeDeckHtml(
  root: FsaDirectoryHandle,
  template: string,
  id: string,
  html: string,
): Promise<string> {
  const subdir = await root.getDirectoryHandle(template, { create: true });
  const file = await subdir.getFileHandle(`${id}.html`, { create: true });
  const writer = await file.createWritable();
  await writer.write(html);
  await writer.close();
  return `${root.name}/${template}/${id}.html`;
}
