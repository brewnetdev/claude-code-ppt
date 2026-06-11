import { useState } from 'react';
import { upgradeSlideCodeBlocks } from '../importer/upgradeCodeBlocks';
import { parsePresentationHTML } from '../importer/parsePresentation';
import type { DeckRegistryEntry } from '../library/deckRegistry';
import {
  clearDeckFromLocalStorage,
  saveDeckToLocalStorage,
} from '../persistence/localStore';
import { usePersistenceStore } from '../persistence/persistenceStore';
import { useDeckStore } from '../scene/store';

type Props = { activeDeck: DeckRegistryEntry };

// Surfaces when openDeck detects the cached payload's sourceHash differs from
// the registry's current sourceHash for the same deck id. Two paths out:
//   - "현재 편집 유지" → mark cache as up-to-date (write current state with the
//     new hash). User keeps everything they edited; the banner won't reappear
//     until the next re-publish.
//   - "원본으로 갱신" → wipe the IDB cache for this deck and re-import from the
//     registry HTML. Loses user edits — the confirm() guards this.
export function StaleCacheBanner({ activeDeck }: Props) {
  const sourceStale = usePersistenceStore((s) => s.sourceStale);
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const [busy, setBusy] = useState<'keep' | 'refresh' | null>(null);

  if (!sourceStale) return null;

  const handleKeep = async () => {
    setBusy('keep');
    try {
      const { slides, overlaysBySlide, currentIndex } = useDeckStore.getState();
      // Pin the cache to the new registry hash so the next boot doesn't
      // re-prompt. Auto-save would do this on the next user edit anyway, but
      // an explicit save makes "Keep" durable even if the user closes the
      // tab without editing further.
      await saveDeckToLocalStorage(activeDeck.id, {
        slides,
        overlaysBySlide,
        currentIndex,
        sourceHash: activeDeck.sourceHash,
      });
      usePersistenceStore.getState().setSourceStale(false);
    } finally {
      setBusy(null);
    }
  };

  const handleRefresh = async () => {
    const ok = window.confirm(
      '캐시된 편집을 모두 버리고 원본 HTML 로 다시 불러옵니다. 되돌릴 수 없습니다. 계속하시겠습니까?',
    );
    if (!ok) return;
    setBusy('refresh');
    try {
      await clearDeckFromLocalStorage(activeDeck.id);
      const { slides } = parsePresentationHTML(activeDeck.html);
      const upgraded = await upgradeSlideCodeBlocks(slides);
      loadDeck(upgraded);
      usePersistenceStore.getState().reset();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100"
    >
      <span aria-hidden="true">⚠️</span>
      <div className="flex-1">
        <span className="font-medium">원본 HTML 이 갱신되었습니다.</span>{' '}
        <span className="text-amber-200/80">
          현재 보고 있는 슬라이드는 이전 버전을 기반으로 한 캐시본입니다.
        </span>
      </div>
      <button
        type="button"
        onClick={handleKeep}
        disabled={busy !== null}
        className="rounded border border-amber-300/50 px-3 py-1 text-xs font-medium hover:bg-amber-500/20 disabled:opacity-50"
      >
        {busy === 'keep' ? '저장 중…' : '현재 편집 유지'}
      </button>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={busy !== null}
        className="rounded border border-amber-300/50 bg-amber-500/30 px-3 py-1 text-xs font-medium hover:bg-amber-500/40 disabled:opacity-50"
      >
        {busy === 'refresh' ? '불러오는 중…' : '원본으로 갱신'}
      </button>
    </div>
  );
}
