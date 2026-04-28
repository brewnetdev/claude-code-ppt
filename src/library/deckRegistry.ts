// Built-in deck registry.
//
// Decks are HTML files committed under docs/html/<template>/<id>.html.
// Vite's `import.meta.glob` resolves them at build time so the library grid
// always reflects whatever ships in the repo — no hand-edit step. The
// `slideplan publish` CLI writes new decks straight into that tree.
//
// Stable IDs matter: localStorage edits are keyed by deck id. The
// override maps below let us pin a title/subtitle/priority for hand-curated
// decks (e.g. the Brewnet sample) without changing their on-disk filename.

// Restricted to the three template subdirs so unrelated reference HTML at
// docs/html/* and docs/html/manual/* (developer scratch files, not decks)
// stays out of the bundle and out of the library grid.
const eagerHtml = import.meta.glob(
  '../../docs/html/{presentation,portfolio,report}/**/*.html',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

export type DeckTemplate = 'presentation' | 'portfolio' | 'report';
export type DeckSourceKind = 'builtin';

export type DeckRegistryEntry = {
  id: string;
  title: string;
  subtitle?: string;
  template: DeckTemplate;
  kind: DeckSourceKind;
  html: string;
};

const KNOWN_TEMPLATES: ReadonlyArray<DeckTemplate> = ['presentation', 'portfolio', 'report'];

const TITLE_OVERRIDES: Record<string, string> = {
  'brewnet-presentation': 'Brewnet — Claude Code Master',
};

const SUBTITLE_OVERRIDES: Record<string, string> = {
  'brewnet-presentation': '브루넷 발표 데크 (샘플)',
};

// Lower priority sorts first. Anything not listed lands at the end in
// alphabetical id order, which gives a stable but unsurprising default.
const PRIORITY: Record<string, number> = {
  'brewnet-presentation': 10,
};

function inferTemplate(path: string): DeckTemplate | null {
  for (const t of KNOWN_TEMPLATES) {
    if (path.includes(`/docs/html/${t}/`)) return t;
  }
  return null;
}

function basename(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(i + 1) : path;
}

function stem(filename: string): string {
  return filename.replace(/\.html$/i, '');
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const decoded = m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  return decoded.length > 0 ? decoded : null;
}

function extractMetaSubtitle(html: string): string | null {
  // `<meta name="subtitle" content="...">` — published decks may emit this so
  // the registry can pick up agent-authored subtitles without an overrides patch.
  const m = html.match(/<meta\s+name=["']subtitle["']\s+content=["']([^"']*)["']/i);
  if (!m) return null;
  const v = m[1].trim();
  return v.length > 0 ? v : null;
}

function buildRegistry(): DeckRegistryEntry[] {
  const out: DeckRegistryEntry[] = [];
  for (const [path, html] of Object.entries(eagerHtml)) {
    const template = inferTemplate(path);
    if (!template) continue;
    const id = stem(basename(path));
    const fileTitle = extractTitle(html);
    const title = TITLE_OVERRIDES[id] ?? fileTitle ?? id;
    const subtitle = SUBTITLE_OVERRIDES[id] ?? extractMetaSubtitle(html) ?? undefined;
    out.push({ id, title, subtitle, template, kind: 'builtin', html });
  }
  out.sort((a, b) => {
    const pa = PRIORITY[a.id] ?? 1000;
    const pb = PRIORITY[b.id] ?? 1000;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
  return out;
}

export const BUILTIN_DECKS: DeckRegistryEntry[] = buildRegistry();

export function getDeckById(id: string): DeckRegistryEntry | undefined {
  return BUILTIN_DECKS.find((d) => d.id === id);
}

// Approximate slide count for the library card without full DOMParser cost.
// Walks every <div class="..."> tag, splits the class string on whitespace,
// and counts those where `slide` appears as a complete token. The naive
// /<div\s+class="slide"/ regex misses real-world variants like
// `class="slide slide-cover"` or `class="slide s01"` that the live parser
// (`querySelector('div.slide')`) does pick up — this kept reported slide
// counts wrong for most hand-authored decks before the fix.
export function countSlides(html: string): number {
  const re = /<div\b[^>]*\sclass="([^"]*)"/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tokens = m[1].split(/\s+/);
    if (tokens.includes('slide')) count++;
  }
  return count;
}
