import brewnetPresentationHtml from '../../docs/html/presentation/brewnet-presentation.html?raw';
import designPatternsHtml from '../../docs/html/presentation/design-patterns.html?raw';
import slideplanSamplePresentationHtml from '../../docs/html/presentation/slideplan-sample.html?raw';
import slideplanSamplePortfolioHtml from '../../docs/html/portfolio/slideplan-sample.html?raw';

export type DeckSourceKind = 'builtin';

export type DeckRegistryEntry = {
  id: string;
  title: string;
  subtitle?: string;
  template: 'presentation' | 'portfolio' | 'report';
  kind: DeckSourceKind;
  html: string;
};

// Built-in decks ship as static HTML under docs/html/presentation/.
// Each entry's `id` is the persistence key — keep stable across sessions
// so localStorage edits remain attached to the same deck.
export const BUILTIN_DECKS: DeckRegistryEntry[] = [
  {
    id: 'brewnet-presentation',
    title: 'Brewnet — Claude Code Master',
    subtitle: '브루넷 발표 데크 (샘플)',
    template: 'presentation',
    kind: 'builtin',
    html: brewnetPresentationHtml,
  },
  {
    id: 'design-patterns',
    title: 'GoF 디자인 패턴',
    subtitle: 'Factory · Singleton · Strategy · Template · Facade · Command',
    template: 'presentation',
    kind: 'builtin',
    html: designPatternsHtml,
  },
  {
    id: 'slideplan-sample-presentation',
    title: 'SlidePlan 샘플 (presentation)',
    subtitle: '결정론적 렌더러 fixture · 9 슬라이드 · 다크 + 앰버',
    template: 'presentation',
    kind: 'builtin',
    html: slideplanSamplePresentationHtml,
  },
  {
    id: 'slideplan-sample-portfolio',
    title: 'SlidePlan 샘플 (portfolio)',
    subtitle: '동일 fixture · data-template만 swap · 화이트 + 블루',
    template: 'portfolio',
    kind: 'builtin',
    html: slideplanSamplePortfolioHtml,
  },
];

export function getDeckById(id: string): DeckRegistryEntry | undefined {
  return BUILTIN_DECKS.find((d) => d.id === id);
}

// Approximate slide count for the library card without full DOMParser cost.
// Each slide ships as <div class="slide"...>, counted via a non-greedy regex.
export function countSlides(html: string): number {
  const matches = html.match(/<div\s+class="slide"/g);
  return matches ? matches.length : 0;
}
