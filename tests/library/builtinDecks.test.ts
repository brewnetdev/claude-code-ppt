// Round-trip every shipped deck through parsePresentationHTML and assert the
// minimum invariants the editor relies on. This is the regression harness for
// the auto-discovered registry — if someone drops a malformed deck into
// docs/html/<template>/ it fails here, instead of crashing the dev server when
// a user clicks the card.
//
// Invariants per deck:
//   1. Parser does not throw.
//   2. Slide count matches the registry's countSlides(deck.html) heuristic and
//      is >= 1.
//   3. Each parsed slide has an html string that contains `<div class="slide`.
//   4. When the slide html declares data-template, it equals the registry's
//      deck.template — guards against report/portfolio decks accidentally
//      shipping with the wrong theme attribute.
//
// Note we do *not* require a [data-slot] per slide. Some legacy decks
// (brewnet-class, brewnet-presentation-light) ship as overlay-only canvases
// with empty slide divs by design — the user fills them via Moveable overlays
// rather than inline contenteditable. The editor renders them correctly.
//
// Per-deck reinforcement:
//   - Code-heavy decks (`brewnet-presentation`) must keep at least one
//     .code-block — the shiki upgrade path depends on this surviving any
//     future markup change.

import { beforeAll, describe, expect, it } from 'vitest';
import {
  BUILTIN_DECKS,
  countSlides,
  type DeckRegistryEntry,
} from '../../src/library/deckRegistry';
import { parsePresentationHTML } from '../../src/importer/parsePresentation';
import { installDomParser } from '../_utils/jsdom';

// 'harness' — LV.9 harness/evaluator deck theme (canvas/themes/harness.css,
// scoped to [data-template="harness"]). The deck lives in docs/html/harness/
// so inferTemplate resolves its registry template to 'harness', matching the
// uniform slide data-template.
const VALID_TEMPLATES = new Set(['presentation', 'portfolio', 'report', 'harness']);

beforeAll(() => installDomParser());

const CODE_HEAVY_DECK_IDS = new Set<string>([
  'brewnet-presentation',
]);

function dataTemplateValues(html: string): string[] {
  const out: string[] = [];
  const re = /<div\s+[^>]*class="[^"]*\bslide\b[^"]*"[^>]*data-template="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

describe('built-in deck registry — parse round-trip', () => {
  it('registry is non-empty', () => {
    expect(BUILTIN_DECKS.length).toBeGreaterThan(0);
  });

  it.each(BUILTIN_DECKS.map((d) => [d.id, d]))(
    '%s parses, slide count matches, every slide is editable',
    (_id: string, deck: DeckRegistryEntry) => {
      const expectedSlides = countSlides(deck.html);
      expect(expectedSlides).toBeGreaterThan(0);

      const parsed = parsePresentationHTML(deck.html);
      expect(parsed.slides.length).toBe(expectedSlides);

      for (const [i, slide] of parsed.slides.entries()) {
        expect(slide.id, `slide ${i} of ${deck.id} has id`).toBeTruthy();
        expect(slide.html, `slide ${i} of ${deck.id} html non-empty`).toBeTruthy();
        expect(slide.html).toContain('<div class="slide');
      }

      // data-template invariant. Every slide-level data-template must be a
      // known template. Decks are usually uniform (all slides == deck.template)
      // — assert that for the common case, which still guards against a deck
      // shipping with the wrong/garbage theme attribute. Some decks
      // intentionally mix per-slide templates (e.g. the appendix deck uses dark
      // `presentation` cover/divider slides inside a `report` deck for visual
      // rhythm); for those we only require that every value is valid AND the
      // registry template is present among them.
      const observed = dataTemplateValues(deck.html);
      if (observed.length > 0) {
        const distinct = new Set(observed);
        for (const v of distinct) {
          expect(VALID_TEMPLATES.has(v), `${deck.id} slide data-template "${v}" is a known template`).toBe(true);
        }
        if (distinct.size === 1) {
          expect([...distinct][0], `${deck.id} uniform slide data-template`).toBe(deck.template);
        } else {
          expect(
            distinct.has(deck.template),
            `${deck.id} mixed-template deck must include its registry template "${deck.template}" (got ${[...distinct].join(', ')})`,
          ).toBe(true);
        }
      }
    },
  );

  it.each(Array.from(CODE_HEAVY_DECK_IDS))(
    '%s preserves at least one .code-block (shiki upgrade target)',
    (id) => {
      const deck = BUILTIN_DECKS.find((d) => d.id === id);
      expect(deck, `code-heavy deck ${id} should be in registry`).toBeDefined();
      expect(deck!.html).toMatch(/<div\s+class="code-block/);
    },
  );
});
