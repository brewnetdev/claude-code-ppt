import { useMemo } from 'react';
import { BUILTIN_DECKS, countSlides, type DeckRegistryEntry } from '../library/deckRegistry';

type DeckLibraryViewProps = {
  onOpen: (deck: DeckRegistryEntry) => void;
};

export function DeckLibraryView({ onOpen }: DeckLibraryViewProps) {
  const decks = useMemo(
    () =>
      BUILTIN_DECKS.map((d) => ({
        ...d,
        slideCount: countSlides(d.html),
      })),
    [],
  );

  return (
    <div className="flex h-full flex-col bg-editor-bg text-editor-text">
      <header className="flex h-12 items-center border-b border-editor-border bg-editor-panel px-4">
        <span className="text-sm font-bold tracking-wide text-editor-accent">claude-code-ppt</span>
        <span className="ml-3 text-xs text-editor-dim">Deck Library</span>
      </header>
      <main className="flex-1 overflow-auto px-8 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">발표 데크 선택</h1>
            <p className="mt-1 text-sm text-editor-dim">
              편집할 데크를 선택하세요. 각 데크의 편집 내용은 독립적으로 자동 저장됩니다.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} onOpen={() => onOpen(deck)} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

type DeckCardProps = {
  deck: DeckRegistryEntry & { slideCount: number };
  onOpen: () => void;
};

function DeckCard({ deck, onOpen }: DeckCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col items-stretch rounded-lg border border-editor-border bg-editor-panel p-5 text-left transition hover:border-editor-accent hover:bg-editor-panel/80"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded bg-editor-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-editor-accent">
          {deck.template}
        </span>
        <span className="text-[11px] text-editor-dim">{deck.slideCount} slides</span>
      </div>
      <div className="flex-1">
        <h3 className="text-base font-semibold leading-snug text-editor-text">{deck.title}</h3>
        {deck.subtitle ? (
          <p className="mt-1 text-xs leading-relaxed text-editor-dim">{deck.subtitle}</p>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-end text-xs text-editor-dim transition group-hover:text-editor-accent">
        편집 열기 →
      </div>
    </button>
  );
}
