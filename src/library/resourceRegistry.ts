// Resource type definitions.
//
// A *resource* is any editable asset opened through the Resource tab: a flowing
// HTML document, a slide-shaped HTML file, or raw Markdown. Resources are
// uploaded (or re-opened from the IDB "recent" list in recentResources.ts) —
// the editor no longer scans docs/ at build time, so there is no static
// registry here, only the shared shapes.

export type ResourceKind = 'slide-html' | 'flow-html' | 'md';
export type ResourceOrigin = 'builtin' | 'upload';

export type ResourceEntry = {
  id: string;
  title: string;
  // Relative path under the project root (e.g. "docs/html/manual/menual-dark.html")
  // for built-in resources, or just the filename for uploads. Used as the
  // write-back hint and the recents key.
  path: string;
  kind: ResourceKind;
  origin: ResourceOrigin;
  raw: string;
};
