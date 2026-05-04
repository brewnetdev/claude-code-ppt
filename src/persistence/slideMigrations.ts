import { INLINE_TAG_ALLOWLIST } from '../generator/planRenderer';
import type { ParsedSlide } from '../importer/parsePresentation';
import { safeReadStringArray, safeWriteJson } from './localStore';

// Surgical, in-cache migrations for already-persisted decks. The renderer
// emits canonical HTML — but bugs in earlier renderer versions baked broken
// markup into IndexedDB, and the editor reads the cache before the file. To
// avoid forcing users through Reset (which discards their edits), we patch
// the cached HTML on load and persist the result. Applied names are tracked
// per-deck in localStorage so each migration runs exactly once.

const MIGRATIONS_KEY_PREFIX = 'claude-code-ppt:deck-migrations:';

type Migration = {
  name: string;
  description: string;
  transform: (html: string) => string;
};

// Mirror of the renderer's allowlist — kept in sync via the shared
// INLINE_TAG_ALLOWLIST constant so a future tag addition propagates here.
const ESCAPED_INLINE_TAG_PATTERN = new RegExp(
  `&lt;(\\/?)(${INLINE_TAG_ALLOWLIST.join('|')})\\b([^&<>]*?)&gt;`,
  'gi',
);

// Earlier `renderComparisonTable` / `renderTable` called `escapeHtml` on
// `<th>` cells while rows used `escapeInlineHtml`. Result: any inline tag
// inside a header was emitted as literal `&lt;…&gt;` and rendered as text,
// not formatting. The file fix landed but cached decks still hold the
// broken HTML; this migration restores the allowed inline tags inside
// `<th>` cells only, leaving body text alone.
const unescapeThInlineTags: Migration = {
  name: 'unescape-th-inline-tags-2026-04-29',
  description: `Unescape ${INLINE_TAG_ALLOWLIST.join('/')} inside <th> cells that the v1 renderer over-escaped.`,
  transform(html) {
    return html.replace(/<th([^>]*)>([\s\S]*?)<\/th>/g, (full, attrs, inner) => {
      const fixed = inner.replace(ESCAPED_INLINE_TAG_PATTERN, '<$1$2$3>');
      return fixed === inner ? full : `<th${attrs}>${fixed}</th>`;
    });
  },
};

const ALL_MIGRATIONS: Migration[] = [unescapeThInlineTags];

const migrationsKey = (deckId: string) => MIGRATIONS_KEY_PREFIX + deckId;

export type MigrationResult = {
  slides: ParsedSlide[];
  changed: boolean;
};

// Runs every pending migration whose `name` isn't yet recorded for this deck.
// Returns the (possibly mutated) slide list plus a `changed` flag the caller
// uses to decide whether to write back to IDB.
export function runSlideMigrations(slides: ParsedSlide[], deckId: string): MigrationResult {
  const applied = new Set(safeReadStringArray(migrationsKey(deckId)));
  const pending = ALL_MIGRATIONS.filter((m) => !applied.has(m.name));
  if (pending.length === 0) {
    return { slides, changed: false };
  }

  let changed = false;
  const next = slides.map((slide) => {
    let html = slide.html;
    for (const m of pending) {
      const after = m.transform(html);
      if (after !== html) {
        html = after;
        changed = true;
      }
    }
    return html === slide.html ? slide : { ...slide, html };
  });

  // Record every migration we attempted, even ones that produced no diff —
  // their preconditions may simply not match this deck, and recording them
  // prevents pointless re-scans on every reload.
  safeWriteJson(migrationsKey(deckId), [...applied, ...pending.map((m) => m.name)]);

  return { slides: next, changed };
}
