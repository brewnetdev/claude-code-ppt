import { useCallback, useEffect, useState } from 'react';
import { SlideCanvas } from './canvas/SlideCanvas';
import { DeckLibraryView } from './editor/DeckLibraryView';
import { PresentationView } from './editor/PresentationView';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { SlideListSidebar } from './editor/SlideListSidebar';
import { StaleCacheBanner } from './editor/StaleCacheBanner';
import { ToastHost } from './editor/Toast';
import { Toolbar } from './editor/Toolbar';
import { deriveSlideTitleFromHtml, parsePresentationHTML } from './importer/parsePresentation';
import { upgradeSlideCodeBlocks } from './importer/upgradeCodeBlocks';
import { getDeckById, type DeckRegistryEntry } from './library/deckRegistry';
import {
  loadDeckFromLocalStorage,
  saveDeckToLocalStorage,
  setLastOpenedDeckId,
} from './persistence/localStore';
import { usePersistenceStore } from './persistence/persistenceStore';
import { runSlideMigrations } from './persistence/slideMigrations';
import { useAutoSave } from './persistence/useAutoSave';
import { loadSlideClipboardFromSession, useDeckStore } from './scene/store';

type BootMode = 'library' | 'editor';

export function App() {
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const loadDeckFull = useDeckStore((s) => s.loadDeckFull);
  const [mode, setMode] = useState<BootMode>('library');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [bootReady, setBootReady] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const exitPresenting = useCallback(() => setPresenting(false), []);

  // Rehydrate slide-level clipboard from sessionStorage once per app load.
  // Lets users Cmd+C in deck A, navigate to deck B, and Cmd+V — the
  // selection survives because we keep a mirror outside the Zustand store.
  useEffect(() => {
    loadSlideClipboardFromSession();
  }, []);

  const openDeck = useCallback(
    async (deck: DeckRegistryEntry) => {
      const persisted = await loadDeckFromLocalStorage(deck.id);
      if (persisted) {
        // Surgical patches for HTML that an older renderer baked into the
        // cache (e.g. over-escaped <strong> in <th>). Runs once per deck per
        // migration; idempotent; preserves the user's edits.
        const migrated = runSlideMigrations(persisted.slides, deck.id);
        // Re-derive sidebar titles from the (possibly migrated) html. This
        // backfills the lenient `.t-title` / `.t-chapter` fallback for decks
        // cached before that fallback existed — without this, hand-authored
        // decks (L3) opened from IDB kept showing every slide as "Slide N".
        // Idempotent: same html → same title, so a no-op for already-correct
        // caches.
        const retitled = migrated.slides.map((s) => {
          const next = deriveSlideTitleFromHtml(s.html, s.title);
          return next === s.title ? s : { ...s, title: next };
        });
        const titlesChanged = retitled.some((s, i) => s !== migrated.slides[i]);
        const finalSlides = titlesChanged ? retitled : migrated.slides;
        if (migrated.changed || titlesChanged) {
          await saveDeckToLocalStorage(deck.id, {
            slides: finalSlides,
            overlaysBySlide: persisted.overlaysBySlide,
            currentIndex: persisted.currentIndex,
            sourceHash: persisted.sourceHash,
          });
        }
        // Persisted decks were already upgraded on first import; re-upgrading
        // is idempotent (skips wired blocks) but we avoid the cost when
        // possible by checking the first slide for the marker attribute.
        const hasShiki = /data-code-source="/.test(finalSlides[0]?.html ?? '');
        const slides = hasShiki ? finalSlides : await upgradeSlideCodeBlocks(finalSlides);
        // Always land on the first slide when opening from the library —
        // the persisted currentIndex was the last position from a prior
        // session, but selecting from the deck grid is a "fresh start" UX.
        loadDeckFull({
          slides,
          overlaysBySlide: persisted.overlaysBySlide,
          currentIndex: 0,
        });
        usePersistenceStore.getState().setSaved(persisted.savedAt);
        // Stale-cache detection: only flag when both sides have a hash and
        // they differ. Missing-on-either-side stays silent — that's the
        // backward-compat path for legacy caches and hand-authored decks.
        const stale = Boolean(
          deck.sourceHash && persisted.sourceHash && deck.sourceHash !== persisted.sourceHash,
        );
        usePersistenceStore.getState().setSourceStale(stale);
      } else {
        const { slides } = parsePresentationHTML(deck.html);
        const upgraded = await upgradeSlideCodeBlocks(slides);
        loadDeck(upgraded);
        usePersistenceStore.getState().reset();
      }
      setActiveDeckId(deck.id);
      setLastOpenedDeckId(deck.id);
      setMode('editor');
      setBootReady(true);
    },
    [loadDeck, loadDeckFull],
  );

  const exitToLibrary = useCallback(() => {
    setPresenting(false);
    setMode('library');
    setActiveDeckId(null);
    setBootReady(false);
    usePersistenceStore.getState().reset();
  }, []);

  // Auto-save is bound to the active deck id. While in the library view
  // there is no active deck, so the hook short-circuits.
  useAutoSave(activeDeckId, bootReady && mode === 'editor');

  // Reload the deck from a freshly-edited source (e.g. user picks a new
  // template via Reset). Only fires when activeDeckId is non-null.
  useEffect(() => {
    if (mode !== 'editor' || !activeDeckId) return;
    // No-op: openDeck already populated the store. This effect exists so
    // future deep-link / URL routing can re-seed the store from activeDeckId.
  }, [mode, activeDeckId]);

  if (mode === 'library') {
    return (
      <>
        <DeckLibraryView onOpen={openDeck} />
        <ToastHost />
      </>
    );
  }

  const activeDeck = activeDeckId ? getDeckById(activeDeckId) : undefined;

  return (
    <div className="flex h-full flex-col bg-editor-bg text-editor-text">
      <Toolbar
        onPresent={() => setPresenting(true)}
        onExitToLibrary={exitToLibrary}
        activeDeck={activeDeck ?? null}
      />
      {activeDeck ? <StaleCacheBanner activeDeck={activeDeck} /> : null}
      <div className="flex flex-1 overflow-hidden">
        <SlideListSidebar arrowKeysEnabled={!presenting} />
        <main className="flex-1 overflow-hidden">
          <SlideCanvas />
        </main>
        <PropertiesPanel />
      </div>
      {presenting ? <PresentationView onExit={exitPresenting} /> : null}
      <ToastHost />
    </div>
  );
}
