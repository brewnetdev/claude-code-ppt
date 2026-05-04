import type { ParsedSlide } from '../importer/parsePresentation';

// Surgical, in-cache migrations for already-persisted decks. The renderer
// emits canonical HTML — but bugs in earlier renderer versions baked broken
// markup into IndexedDB, and the editor reads the cache before the file. To
// avoid forcing users through Reset (which discards their edits), we patch
// the cached HTML on load and persist the result.
//
// Each migration is a single-purpose, idempotent string transform. Migrations
// are tracked per-deck in localStorage so we never re-apply on every boot.

const MIGRATIONS_KEY_PREFIX = 'claude-code-ppt:deck-migrations:';

type Migration = {
  name: string;
  description: string;
  transform: (html: string) => string;
};

// Earlier `renderComparisonTable` / `renderTable` in planRenderer.ts called
// `escapeHtml` on `<th>` cells while rows used `escapeInlineHtml`. Result:
// any inline tag (e.g. <strong>) inside a header was emitted as literal
// `&lt;strong&gt;...&lt;/strong&gt;` and rendered as text, not bold. The file
// fix landed but cached decks still hold the broken HTML. Re-allow the same
// allowlist that `escapeInlineHtml` exposes — strong | em | span | br | code.
const unescapeThInlineTags: Migration = {
  name: 'unescape-th-inline-tags-2026-04-29',
  description:
    'Unescape <strong>/<em>/<span>/<br>/<code> inside <th> cells that the v1 renderer over-escaped.',
  transform(html) {
    return html.replace(/<th([^>]*)>([\s\S]*?)<\/th>/g, (full, attrs, inner) => {
      const fixed = inner.replace(
        /&lt;(\/?)(strong|em|span|br|code)\b([^&<>]*?)&gt;/gi,
        '<$1$2$3>',
      );
      return fixed === inner ? full : `<th${attrs}>${fixed}</th>`;
    });
  },
};

const ALL_MIGRATIONS: Migration[] = [unescapeThInlineTags];

function getAppliedMigrations(deckId: string): string[] {
  try {
    const raw = localStorage.getItem(MIGRATIONS_KEY_PREFIX + deckId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function setAppliedMigrations(deckId: string, names: string[]): void {
  try {
    localStorage.setItem(MIGRATIONS_KEY_PREFIX + deckId, JSON.stringify(names));
  } catch {
    /* swallow — migration tracking is best-effort */
  }
}

export type MigrationResult = {
  slides: ParsedSlide[];
  changed: boolean;
  appliedNames: string[];
};

// Runs every pending migration whose `name` isn't yet recorded for this deck.
// Returns the (possibly mutated) slide list plus a `changed` flag the caller
// uses to decide whether to write back to IDB.
export function runSlideMigrations(slides: ParsedSlide[], deckId: string): MigrationResult {
  const applied = new Set(getAppliedMigrations(deckId));
  const pending = ALL_MIGRATIONS.filter((m) => !applied.has(m.name));
  if (pending.length === 0) {
    return { slides, changed: false, appliedNames: [...applied] };
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
  const updatedApplied = [...applied, ...pending.map((m) => m.name)];
  setAppliedMigrations(deckId, updatedApplied);

  return { slides: next, changed, appliedNames: updatedApplied };
}
