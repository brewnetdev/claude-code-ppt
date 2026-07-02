// Slide-level background override. Lives outside `html` so the markup stays
// canonical (theme CSS still owns the default surface) and the export path
// can opt in or out independently.
export type SlideBackground =
  | { kind: 'color'; value: string }
  | { kind: 'image'; src: string; fit: 'cover' | 'contain' };

export type ParsedSlide = {
  id: string;
  html: string;
  title: string;
  background?: SlideBackground;
};

export type ParsedDeck = {
  slides: ParsedSlide[];
};

// Sidebar title resolver. Tries `data-slot` first (the canonical contract
// emitted by the SlidePlan renderer) and falls back to the brewnet/report
// theme's class hierarchy for hand-authored decks where slot attributes
// were never added — without this fallback, hand-authored decks rendered
// every sidebar entry as "Slide N".
//
// `.t-hero` is the cover-slide main heading and must be checked BEFORE
// `.t-title` so cover pages (which lack `.t-title` but have `.t-hero`)
// surface their hero text rather than falling through to "Slide N".
// `.cover-level` is a last-resort cover label for decks where the hero is
// empty / heavily styled with inner spans (rare).
function selectTitleEl(node: Element): HTMLElement | null {
  return (
    node.querySelector<HTMLElement>('[data-slot="title"]') ??
    node.querySelector<HTMLElement>('[data-slot="label"]') ??
    node.querySelector<HTMLElement>('[data-slot="subtitle"]') ??
    node.querySelector<HTMLElement>('.t-hero') ??
    node.querySelector<HTMLElement>('.t-title') ??
    node.querySelector<HTMLElement>('.t-chapter') ??
    node.querySelector<HTMLElement>('.t-section') ??
    node.querySelector<HTMLElement>('.cover-level')
  );
}

// String-input version used post-import (commit pipeline + openDeck title
// re-derivation). Falls back to caller-supplied `fallback` so renames like
// duplicateSlide's "Slide 41 (copy)" survive when no title element exists.
export function deriveSlideTitleFromHtml(html: string, fallback: string): string {
  if (typeof DOMParser === 'undefined') return fallback;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const node = doc.querySelector<HTMLElement>('div.slide');
  if (!node) return fallback;
  const t = (selectTitleEl(node)?.textContent ?? '').trim();
  return t.length > 0 ? t : fallback;
}

export function parsePresentationHTML(source: string): ParsedDeck {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const nodes = doc.querySelectorAll<HTMLDivElement>('div.slide');

  const slides: ParsedSlide[] = Array.from(nodes).map((node, idx) => {
    const titleEl = selectTitleEl(node);
    const title = (titleEl?.textContent ?? `Slide ${idx + 1}`).trim();

    // Backward compat: older exports emitted .export-overlay images as siblings
    // of .slide inside .export-stage. Pull them in so they round-trip into the
    // overlay store instead of being dropped on re-import.
    const orphanOverlays: string[] = [];
    let sib = node.nextElementSibling;
    while (sib && sib.classList.contains('export-overlay')) {
      orphanOverlays.push(sib.outerHTML);
      sib = sib.nextElementSibling;
    }

    let html = node.outerHTML;
    if (orphanOverlays.length > 0) {
      html = html.replace(/<\/div>\s*$/, `${orphanOverlays.join('\n')}\n</div>`);
    }

    // Optional per-slide background hint. The editor owns slide backgrounds via
    // the structured `background` field and strips inline `background` styles on
    // mount (applySlideBackground), so a deck that wants a non-theme surface
    // (e.g. the appendix deck's unified beige) declares it as `data-slide-bg`
    // (a CSS color) on the `.slide` element rather than as inline CSS.
    const bgAttr = (node.getAttribute('data-slide-bg') ?? '').trim();
    const background: SlideBackground | undefined =
      bgAttr && /^(#[0-9a-fA-F]{3,8}|rgb|hsl)/.test(bgAttr)
        ? { kind: 'color', value: bgAttr }
        : undefined;

    return {
      id: `slide-${idx + 1}`,
      html,
      title,
      ...(background ? { background } : {}),
    };
  });

  return { slides };
}
