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

export function parsePresentationHTML(source: string): ParsedDeck {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const nodes = doc.querySelectorAll<HTMLDivElement>('div.slide');

  const slides: ParsedSlide[] = Array.from(nodes).map((node, idx) => {
    const titleEl =
      node.querySelector<HTMLElement>('[data-slot="title"]') ??
      node.querySelector<HTMLElement>('[data-slot="label"]') ??
      node.querySelector<HTMLElement>('[data-slot="subtitle"]');
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

    return {
      id: `slide-${idx + 1}`,
      html,
      title,
    };
  });

  return { slides };
}
