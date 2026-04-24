import { SampleSlide } from './canvas/SampleSlide';
import { SlideCanvas } from './canvas/SlideCanvas';
import { EditSpikeBanner } from './editor/EditSpikeBanner';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { SlideListSidebar } from './editor/SlideListSidebar';
import { Toolbar } from './editor/Toolbar';

export function App() {
  return (
    <div className="flex h-full flex-col bg-editor-bg text-editor-text">
      <Toolbar />
      <EditSpikeBanner />
      <div className="flex flex-1 overflow-hidden">
        <SlideListSidebar />
        <main className="flex-1 overflow-hidden">
          <SlideCanvas>
            <SampleSlide />
          </SlideCanvas>
        </main>
        <PropertiesPanel />
      </div>
    </div>
  );
}
