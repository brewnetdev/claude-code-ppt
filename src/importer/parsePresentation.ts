export type ParsedSlide = {
  id: string;
  html: string;
  title: string;
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

    return {
      id: `slide-${idx + 1}`,
      html: node.outerHTML,
      title,
    };
  });

  return { slides };
}
