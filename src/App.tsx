import { useCallback, useEffect, useState } from 'react';
import { SlideCanvas } from './canvas/SlideCanvas';
import { DeckLibraryView } from './editor/DeckLibraryView';
import { PresentationView } from './editor/PresentationView';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { SlideListSidebar } from './editor/SlideListSidebar';
import { ToastHost } from './editor/Toast';
import { Toolbar } from './editor/Toolbar';
import { parsePresentationHTML } from './importer/parsePresentation';
import { upgradeSlideCodeBlocks } from './importer/upgradeCodeBlocks';
import { getDeckById, type DeckRegistryEntry } from './library/deckRegistry';
import { loadDeckFromLocalStorage, setLastOpenedDeckId } from './persistence/localStore';
import { usePersistenceStore } from './persistence/persistenceStore';
import { useAutoSave } from './persistence/useAutoSave';
import { useDeckStore } from './scene/store';

type BootMode = 'library' | 'editor';

export function App() {
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const loadDeckFull = useDeckStore((s) => s.loadDeckFull);
  const [mode, setMode] = useState<BootMode>('library');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [bootReady, setBootReady] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const exitPresenting = useCallback(() => setPresenting(false), []);

  const openDeck = useCallback(
    async (deck: DeckRegistryEntry) => {
      const persisted = loadDeckFromLocalStorage(deck.id);
      if (persisted) {
        // Persisted decks were already upgraded on first import; re-upgrading
        // is idempotent (skips wired blocks) but we avoid the cost when
        // possible by checking the first slide for the marker attribute.
        const hasShiki = /data-code-source="/.test(persisted.slides[0]?.html ?? '');
        const slides = hasShiki ? persisted.slides : await upgradeSlideCodeBlocks(persisted.slides);
        loadDeckFull({
          slides,
          overlaysBySlide: persisted.overlaysBySlide,
          currentIndex: persisted.currentIndex,
        });
        usePersistenceStore.getState().setSaved(persisted.savedAt);
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
