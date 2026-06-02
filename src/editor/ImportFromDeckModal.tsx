import { useEffect, useMemo, useState } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import { BUILTIN_DECKS, type DeckRegistryEntry } from '../library/deckRegistry';
import { parsePresentationHTML, type ParsedSlide } from '../importer/parsePresentation';
import { useDeckStore } from '../scene/store';

const THUMB_W = 220;
const THUMB_H = (THUMB_W * SLIDE_HEIGHT) / SLIDE_WIDTH;
const THUMB_SCALE = THUMB_W / SLIDE_WIDTH;

type Props = {
  open: boolean;
  onClose: () => void;
  activeDeckId: string | null;
};

export function ImportFromDeckModal({ open, onClose, activeDeckId }: Props) {
  const insertSlideAfter = useDeckStore((s) => s.insertSlideAfter);
  const currentIndex = useDeckStore((s) => s.currentIndex);

  // Exclude the deck we're currently editing — pasting into yourself is what
  // the existing Duplicate action handles.
  const decks = useMemo(
    () => BUILTIN_DECKS.filter((d) => d.id !== activeDeckId),
    [activeDeckId],
  );

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);

  // Reset selection on each open + auto-select the first available deck so
  // the right pane has content immediately.
  useEffect(() => {
    if (open) {
      setSelectedDeckId(decks[0]?.id ?? null);
      setSelectedSlideIndex(null);
    }
  }, [open, decks]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const selectedDeck = useMemo<DeckRegistryEntry | null>(
    () => decks.find((d) => d.id === selectedDeckId) ?? null,
    [decks, selectedDeckId],
  );

  // Parse on demand — BUILTIN_DECKS holds raw HTML; we only run DOMParser
  // when the user actually clicks a deck. Memoized by selected deck id so
  // we don't re-parse on every render.
  const slides = useMemo<ParsedSlide[]>(() => {
    if (!selectedDeck) return [];
    try {
      return parsePresentationHTML(selectedDeck.html).slides;
    } catch {
      return [];
    }
  }, [selectedDeck]);

  const handleInsert = () => {
    if (selectedSlideIndex === null) return;
    const slide = slides[selectedSlideIndex];
    if (!slide) return;
    insertSlideAfter(currentIndex, slide.html, slide.title);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-[92vw] max-w-[1200px] flex-col overflow-hidden rounded-lg border border-editor-border bg-editor-panel shadow-2xl">
        <header className="flex items-center justify-between border-b border-editor-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-editor-text">다른 데크에서 슬라이드 가져오기</h2>
            <p className="text-[11px] text-editor-dim">
              왼쪽에서 데크 선택 → 오른쪽에서 슬라이드 선택 → 현재 슬라이드 뒤에 삽입. ESC로 닫기.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-editor-border px-2 py-1 text-xs text-editor-dim hover:border-editor-accent hover:text-editor-accent"
          >
            닫기
          </button>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Left: deck list */}
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-editor-border p-2">
            {decks.length === 0 ? (
              <div className="px-3 py-4 text-[12px] text-editor-dim">
                가져올 수 있는 다른 데크가 없습니다.
              </div>
            ) : (
              decks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => {
                    setSelectedDeckId(deck.id);
                    setSelectedSlideIndex(null);
                  }}
                  className={`mb-1 block w-full rounded px-3 py-2 text-left text-[12px] transition ${
                    deck.id === selectedDeckId
                      ? 'bg-editor-accent/15 text-editor-accent'
                      : 'text-editor-text hover:bg-editor-border/40'
                  }`}
                >
                  <div className="font-medium leading-tight">{deck.title}</div>
                  {deck.subtitle ? (
                    <div className="mt-0.5 line-clamp-2 text-[10px] text-editor-dim">{deck.subtitle}</div>
                  ) : null}
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-editor-dim">
                    {deck.template}
                  </div>
                </button>
              ))
            )}
          </aside>

          {/* Right: slide grid */}
          <div className="flex flex-1 flex-col min-h-0">
            <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 overflow-y-auto p-4">
              {slides.length === 0 ? (
                <div className="col-span-full px-3 py-8 text-center text-[12px] text-editor-dim">
                  {selectedDeck ? '슬라이드를 찾을 수 없습니다.' : '왼쪽에서 데크를 선택하세요.'}
                </div>
              ) : (
                slides.map((slide, idx) => (
                  <button
                    key={`${selectedDeckId}-${idx}`}
                    type="button"
                    onClick={() => setSelectedSlideIndex(idx)}
                    onDoubleClick={() => {
                      setSelectedSlideIndex(idx);
                      // Run insert on next tick so state is in sync.
                      setTimeout(handleInsert, 0);
                    }}
                    className={`group flex flex-col gap-2 rounded-md border bg-[#0b1220] p-2 text-left transition ${
                      idx === selectedSlideIndex
                        ? 'border-editor-accent ring-2 ring-editor-accent/40'
                        : 'border-editor-border hover:border-editor-accent/60'
                    }`}
                  >
                    <SlideThumbnail html={slide.html} />
                    <div className="flex items-center justify-between gap-2">
                      <div className="line-clamp-1 text-[11px] text-editor-text group-hover:text-editor-accent">
                        {idx + 1}. {slide.title || `Slide ${idx + 1}`}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-editor-border px-5 py-3">
              <div className="text-[11px] text-editor-dim">
                {selectedSlideIndex !== null && slides[selectedSlideIndex]
                  ? `선택: ${selectedSlideIndex + 1}. ${slides[selectedSlideIndex].title || `Slide ${selectedSlideIndex + 1}`}`
                  : '슬라이드를 선택하세요 (더블클릭으로 즉시 삽입)'}
              </div>
              <button
                type="button"
                onClick={handleInsert}
                disabled={selectedSlideIndex === null}
                className="rounded border border-editor-accent/50 px-3 py-1 text-xs font-medium text-editor-accent transition hover:bg-editor-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                현재 슬라이드 뒤에 삽입
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideThumbnail({ html }: { html: string }) {
  return (
    <div
      className="overflow-hidden rounded border border-editor-border/60 bg-black"
      style={{ width: THUMB_W, height: THUMB_H }}
      aria-hidden
    >
      <div
        className="slide-canvas-host pointer-events-none"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: 'top left',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
