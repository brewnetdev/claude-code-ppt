import { useCallback, useEffect, useState } from 'react';
import presentationHtml from '../docs/html/presentation/brewnet-presentation.html?raw';
import { SlideCanvas } from './canvas/SlideCanvas';
import { EditSpikeBanner } from './editor/EditSpikeBanner';
import { PresentationView } from './editor/PresentationView';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { SlideListSidebar } from './editor/SlideListSidebar';
import { Toolbar } from './editor/Toolbar';
import { parsePresentationHTML } from './importer/parsePresentation';
import { loadDeckFromLocalStorage } from './persistence/localStore';
import { usePersistenceStore } from './persistence/persistenceStore';
import { useAutoSave } from './persistence/useAutoSave';
import { useDeckStore } from './scene/store';

export function App() {
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const loadDeckFull = useDeckStore((s) => s.loadDeckFull);
  const hasSlides = useDeckStore((s) => s.slides.length > 0);
  const [bootReady, setBootReady] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const exitPresenting = useCallback(() => setPresenting(false), []);

  useEffect(() => {
    if (hasSlides) {
      setBootReady(true);
      return;
    }
    const persisted = loadDeckFromLocalStorage();
    if (persisted) {
      loadDeckFull({
        slides: persisted.slides,
        overlaysBySlide: persisted.overlaysBySlide,
        currentIndex: persisted.currentIndex,
      });
      usePersistenceStore.getState().setSaved(persisted.savedAt);
    } else {
      const { slides } = parsePresentationHTML(presentationHtml);
      loadDeck(slides);
    }
    setBootReady(true);
  }, [hasSlides, loadDeck, loadDeckFull]);

  useAutoSave(bootReady);

  return (
    <div className="flex h-full flex-col bg-editor-bg text-editor-text">
      <Toolbar onPresent={() => setPresenting(true)} />
      <EditSpikeBanner />
      <div className="flex flex-1 overflow-hidden">
        <SlideListSidebar arrowKeysEnabled={!presenting} />
        <main className="flex-1 overflow-hidden">
          <SlideCanvas />
        </main>
        <PropertiesPanel />
      </div>
      {presenting ? <PresentationView onExit={exitPresenting} /> : null}
    </div>
  );
}
