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

// The curriculum slide (page 3) shipped its stage "topics" as flex `<div
// class="curr-topic">` rows inside a plain `<div class="curr-topics">`. The
// editor's Enter handler only manages `<ul class="bullet-list">` / `<li><div>`
// lists, so pressing Enter inside a flex `.curr-topic` let the browser split
// the row into side-by-side flex children — the "옆으로 단이 나뉘는" bug.
// Converting the cached markup to the supported bullet-list structure lets the
// list-aware Enter/Backspace logic take over (Enter → new bullet `<li>`).
// Idempotent: once converted the `<div class="curr-topics">` head no longer
// matches, so re-runs are no-ops.
const curriculumTopicsToBulletList: Migration = {
  name: 'curriculum-topics-to-bullet-list-2026-05-29',
  description:
    'Convert the curriculum slide\'s flex `.curr-topic` divs into `<ul class="bullet-list"><li><div>` so the editor manages Enter as list items.',
  transform(html) {
    return html.replace(
      /<div class="curr-topics"([^>]*)>([\s\S]*?)<\/div>(\s*<div class="curr-deliv")/g,
      (_full, attrs, inner, tail) => {
        const lis = inner.replace(
          /<div class="curr-topic"([^>]*)>([\s\S]*?)<\/div>/g,
          '<li class="curr-topic"$1><div>$2</div></li>',
        );
        return `<ul class="curr-topics bullet-list"${attrs}>${lis}</ul>${tail}`;
      },
    );
  },
};

// Earlier commit paths baked editor-only chrome into the cached HTML: table
// `.col-resize-handle` divs (appended on table mount, never stripped on commit)
// and U+200B soft-break placeholders. They accumulate on every remount and leak
// into export. The commit path now strips them (stripEditorChrome); this scrubs
// decks already poisoned in IndexedDB. Idempotent: clean HTML has no matches.
const stripCommittedEditorChrome: Migration = {
  name: 'strip-committed-editor-chrome-2026-06-12',
  description: 'Remove baked-in .col-resize-handle divs and U+200B placeholders from cached slide HTML.',
  transform(html) {
    return html
      .replace(/<div[^>]*class="[^"]*\bcol-resize-handle\b[^"]*"[^>]*>\s*<\/div>/g, '')
      .replace(/​/g, '');
  },
};

const ALL_MIGRATIONS: Migration[] = [
  unescapeThInlineTags,
  curriculumTopicsToBulletList,
  stripCommittedEditorChrome,
];

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
