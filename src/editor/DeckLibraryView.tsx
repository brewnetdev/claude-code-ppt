import { useCallback, useMemo, useState } from 'react';
import { BUILTIN_DECKS, countSlides, type DeckRegistryEntry } from '../library/deckRegistry';
import {
  addHiddenDeckId,
  clearDeckFromLocalStorage,
  getHiddenDeckIds,
  removeHiddenDeckId,
} from '../persistence/localStore';
import { showToast } from './Toast';

type DeckLibraryViewProps = {
  onOpen: (deck: DeckRegistryEntry) => void;
};

export function DeckLibraryView({ onOpen }: DeckLibraryViewProps) {
  // The hidden-id set is sourced from localStorage, but we mirror it in
  // component state so hide / restore re-renders the grid without a reload.
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => getHiddenDeckIds());
  const [showHidden, setShowHidden] = useState(false);

  const decksWithMeta = useMemo(
    () => BUILTIN_DECKS.map((d) => ({ ...d, slideCount: countSlides(d.html) })),
    [],
  );
  const visibleDecks = useMemo(
    () => decksWithMeta.filter((d) => !hiddenIds.includes(d.id)),
    [decksWithMeta, hiddenIds],
  );
  const hiddenDecks = useMemo(
    () => decksWithMeta.filter((d) => hiddenIds.includes(d.id)),
    [decksWithMeta, hiddenIds],
  );

  const hideDeck = useCallback((deckId: string, deckTitle: string) => {
    // Confirm because we also wipe the user's saved edits — there's no undo
    // for the persisted payload once it's gone.
    const ok = window.confirm(
      `"${deckTitle}" 데크를 라이브러리에서 숨길까요?\n저장된 편집 내용도 함께 삭제됩니다.\n원본 슬라이드는 보존되며 "숨긴 데크 보기"에서 복원할 수 있습니다.`,
    );
    if (!ok) return;
    addHiddenDeckId(deckId);
    // Fire-and-forget: the UI state is driven by the hidden-id set, which is
    // already updated synchronously above. The IDB delete completing later
    // doesn't change what the user sees.
    void clearDeckFromLocalStorage(deckId);
    setHiddenIds(getHiddenDeckIds());
    showToast({ message: `"${deckTitle}"을(를) 라이브러리에서 숨겼습니다.`, tone: 'info' });
  }, []);

  const restoreDeck = useCallback((deckId: string, deckTitle: string) => {
    removeHiddenDeckId(deckId);
    setHiddenIds(getHiddenDeckIds());
    showToast({ message: `"${deckTitle}"을(를) 복원했습니다.`, tone: 'info' });
  }, []);

  return (
    <div className="flex h-full flex-col bg-editor-bg text-editor-text">
      <header className="flex h-12 items-center border-b border-editor-border bg-editor-panel px-4">
        <span className="text-sm font-bold tracking-wide text-editor-accent">claude-code-ppt</span>
        <span className="ml-3 text-xs text-editor-dim">Deck Library</span>
      </header>
      <main className="flex-1 overflow-auto px-8 py-10">
        <div className="mx-auto max-w-[1144px]">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">발표 데크 선택</h1>
            <p className="mt-1 text-sm text-editor-dim">
              편집할 데크를 선택하세요. 각 데크의 편집 내용은 독립적으로 자동 저장됩니다.
            </p>
          </div>
          {visibleDecks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-editor-border bg-editor-panel/60 px-6 py-10 text-center text-sm text-editor-dim">
              표시할 데크가 없습니다. 아래의 "숨긴 데크 보기"에서 복원하세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onOpen={() => onOpen(deck)}
                  onHide={() => hideDeck(deck.id, deck.title)}
                />
              ))}
            </div>
          )}

          {hiddenDecks.length > 0 ? (
            <div className="mt-10 border-t border-editor-border pt-6">
              <button
                type="button"
                className="text-xs text-editor-dim transition hover:text-editor-text"
                onClick={() => setShowHidden((v) => !v)}
              >
                {showHidden ? '▼' : '▶'} 숨긴 데크 {hiddenDecks.length}개 {showHidden ? '숨기기' : '보기'}
              </button>
              {showHidden ? (
                <ul className="mt-4 divide-y divide-editor-border rounded-md border border-editor-border bg-editor-panel/40">
                  {hiddenDecks.map((deck) => (
                    <li
                      key={deck.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-editor-text">{deck.title}</div>
                        <div className="truncate text-[11px] text-editor-dim">
                          {deck.template} · {deck.slideCount} slides
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded border border-editor-border px-3 py-1 text-xs text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
                        onClick={() => restoreDeck(deck.id, deck.title)}
                      >
                        복원
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

type DeckCardProps = {
  deck: DeckRegistryEntry & { slideCount: number };
  onOpen: () => void;
  onHide: () => void;
};

function DeckCard({ deck, onOpen, onHide }: DeckCardProps) {
  return (
    <div className="group relative flex h-full flex-col rounded-lg border border-editor-border bg-editor-panel transition hover:border-editor-accent hover:bg-editor-panel/80">
      <button
        type="button"
        onClick={onHide}
        aria-label={`${deck.title} 삭제`}
        title="라이브러리에서 삭제 (편집 내용도 함께 비워짐)"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded border border-editor-border bg-editor-bg text-base leading-none text-editor-dim shadow-sm transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-1 focus:ring-editor-accent"
      >
        ×
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full flex-1 flex-col items-stretch p-5 text-left"
      >
        <div className="mb-3 flex items-center justify-between pr-6">
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
    </div>
  );
}
