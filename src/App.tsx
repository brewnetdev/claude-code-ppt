import { useEffect } from 'react';
import presentationHtml from '../docs/html/presentation/brewnet-presentation.html?raw';
import { SlideCanvas } from './canvas/SlideCanvas';
import { EditSpikeBanner } from './editor/EditSpikeBanner';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { SlideListSidebar } from './editor/SlideListSidebar';
import { Toolbar } from './editor/Toolbar';
import { parsePresentationHTML } from './importer/parsePresentation';
import { useDeckStore } from './scene/store';

export function App() {
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const hasSlides = useDeckStore((s) => s.slides.length > 0);

  useEffect(() => {
    if (hasSlides) return;
    const { slides } = parsePresentationHTML(presentationHtml);
    loadDeck(slides);
  }, [hasSlides, loadDeck]);

  return (
    <div className="flex h-full flex-col bg-editor-bg text-editor-text">
      <Toolbar />
      <EditSpikeBanner />
      <div className="flex flex-1 overflow-hidden">
        <SlideListSidebar />
        <main className="flex-1 overflow-hidden">
          <SlideCanvas />
        </main>
        <PropertiesPanel />
      </div>
    </div>
  );
}
