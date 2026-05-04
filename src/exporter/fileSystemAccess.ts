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
