import { useCallback, useEffect, useState } from 'react';
import { DocumentCanvas } from './canvas/DocumentCanvas';
import { SlideCanvas } from './canvas/SlideCanvas';
import { DeckLibraryView } from './editor/DeckLibraryView';
import { DocumentPresentationView } from './editor/DocumentPresentationView';
import { PresentationView } from './editor/PresentationView';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { SlideListSidebar } from './editor/SlideListSidebar';
import { StaleCacheBanner } from './editor/StaleCacheBanner';
import { showToast, ToastHost } from './editor/Toast';
import { Toolbar } from './editor/Toolbar';
import { mdToSlides, type Template } from './generator/mdToSlides';
import { splitHtmlDocument } from './importer/detectResource';
import { deriveSlideTitleFromHtml, parsePresentationHTML } from './importer/parsePresentation';
import { upgradeSlideCodeBlocks } from './importer/upgradeCodeBlocks';
import type { DeckRegistryEntry, DeckTemplate } from './library/deckRegistry';
import type { ResourceEntry } from './library/resourceRegistry';
import {
  loadDeckFromLocalStorage,
  saveDeckToLocalStorage,
  setLastOpenedDeckId,
} from './persistence/localStore';
import { usePersistenceStore } from './persistence/persistenceStore';
import { runSlideMigrations } from './persistence/slideMigrations';
import {
  getRecentResourceContent,
  recordRecentResource,
} from './persistence/recentResources';
import { useAutoSave } from './persistence/useAutoSave';
import { useResourceAutoSave } from './persistence/useResourceAutoSave';
import { useResourceStore } from './scene/resourceStore';
import { loadSlideClipboardFromSession, useDeckStore } from './scene/store';

type BootMode = 'library' | 'editor';
type EditorKind = 'deck' | 'document';

// localStorage key prefix for resource-backed decks (slide-html / md). Keeps
// their persisted edits from colliding with built-in deck ids.
const RESOURCE_DECK_PREFIX = 'resource:';

export function App() {
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const loadDeckFull = useDeckStore((s) => s.loadDeckFull);
  const loadDocument = useResourceStore((s) => s.loadDocument);
  const [mode, setMode] = useState<BootMode>('library');
  const [editorKind, setEditorKind] = useState<EditorKind>('deck');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  // Held directly (rather than re-derived via getDeckById) so synthetic
  // resource-backed decks — which aren't in the built-in registry — still
  // give the Toolbar a title / template / source HTML for Reset and export.
  const [activeDeck, setActiveDeck] = useState<DeckRegistryEntry | null>(null);
  const [activeResource, setActiveResource] = useState<ResourceEntry | null>(null);
  // Which library tab the current editor session was opened from — so the
  // breadcrumb / back navigation returns to the right place.
  const [librarySection, setLibrarySection] = useState<'decks' | 'resources'>('decks');
  // Flowing-document edit/view toggle. Defaults to edit; the toolbar flips it to
  // a read-only preview so layout-sensitive docs aren't edited by accident.
  const [docEditable, setDocEditable] = useState(true);
  const [bootReady, setBootReady] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const exitPresenting = useCallback(() => setPresenting(false), []);

  // Rehydrate slide-level clipboard from sessionStorage once per app load.
  useEffect(() => {
    loadSlideClipboardFromSession();
  }, []);

  const openDeck = useCallback(
    async (deck: DeckRegistryEntry) => {
      const persisted = await loadDeckFromLocalStorage(deck.id);
      if (persisted) {
        const migrated = runSlideMigrations(persisted.slides, deck.id);
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
        const hasShiki = /data-code-source="/.test(finalSlides[0]?.html ?? '');
        const slides = hasShiki ? finalSlides : await upgradeSlideCodeBlocks(finalSlides);
        loadDeckFull({
          slides,
          overlaysBySlide: persisted.overlaysBySlide,
          currentIndex: 0,
        });
        usePersistenceStore.getState().setSaved(persisted.savedAt);
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
      setActiveDeck(deck);
      setActiveResource(null);
      setEditorKind('deck');
      setLibrarySection('decks');
      setLastOpenedDeckId(deck.id);
      setMode('editor');
      setBootReady(true);
    },
    [loadDeck, loadDeckFull],
  );

  // Open a slide-shaped or Markdown resource through the deck editor. The
  // resource's id is namespaced so its persisted edits never collide with a
  // built-in deck. `slides` is the parsed/generated deck content.
  const openResourceAsDeck = useCallback(
    async (entry: ResourceEntry, slides: Awaited<ReturnType<typeof upgradeSlideCodeBlocks>>, template: DeckTemplate) => {
      const deckId = `${RESOURCE_DECK_PREFIX}${entry.id}`;
      const persisted = await loadDeckFromLocalStorage(deckId);
      if (persisted) {
        loadDeckFull({
          slides: persisted.slides,
          overlaysBySlide: persisted.overlaysBySlide,
          currentIndex: 0,
        });
        usePersistenceStore.getState().setSaved(persisted.savedAt);
      } else {
        loadDeck(slides);
        usePersistenceStore.getState().reset();
      }
      // Synthetic registry entry — gives Toolbar a title, a Reset source, and
      // a template (used only by the FSA deck write-path, which resources
      // bypass in favor of write-back by path).
      const synth: DeckRegistryEntry = {
        id: deckId,
        title: entry.title,
        template,
        kind: 'builtin',
        html: slides.map((s) => s.html).join('\n'),
      };
      setActiveDeckId(deckId);
      setActiveDeck(synth);
      setActiveResource(entry);
      setEditorKind('deck');
      setMode('editor');
      setBootReady(true);
    },
    [loadDeck, loadDeckFull],
  );

  const openResource = useCallback(
    async (entry: ResourceEntry, template: Template = 'presentation') => {
      setLibrarySection('resources');
      try {
        const recentBase = {
          id: entry.id,
          title: entry.title,
          path: entry.path,
          kind: entry.kind,
          origin: entry.origin,
        };
        if (entry.kind === 'slide-html') {
          const { slides } = parsePresentationHTML(entry.raw);
          if (slides.length === 0) {
            showToast({ message: '슬라이드를 찾지 못했습니다.', tone: 'error' });
            return;
          }
          const upgraded = await upgradeSlideCodeBlocks(slides);
          await openResourceAsDeck(entry, upgraded, 'report');
          void recordRecentResource(recentBase, entry.raw);
          return;
        }
        if (entry.kind === 'md') {
          const slides = await mdToSlides(entry.raw, template);
          if (slides.length === 0) {
            showToast({ message: 'MD에서 슬라이드를 생성하지 못했습니다.', tone: 'error' });
            return;
          }
          const upgraded = await upgradeSlideCodeBlocks(slides);
          await openResourceAsDeck(entry, upgraded, template as DeckTemplate);
          void recordRecentResource(recentBase, entry.raw);
          return;
        }
        // flow-html → document canvas
        const parts = splitHtmlDocument(entry.raw);
        loadDocument(entry, parts);
        setDocEditable(true);
        setActiveDeck(null);
        setActiveDeckId(null);
        setActiveResource(entry);
        setEditorKind('document');
        usePersistenceStore.getState().reset();
        setMode('editor');
        setBootReady(true);
        void recordRecentResource(recentBase, entry.raw, parts);
      } catch (err) {
        console.error('openResource failed', err);
        showToast({ message: '리소스를 여는 중 오류가 발생했습니다.', tone: 'error' });
      }
    },
    [openResourceAsDeck, loadDocument],
  );

  // Re-open a resource from the recents list. Uploaded resources live only in
  // IDB, so we rebuild the ResourceEntry from stored content. For flowing docs
  // we reload the *edited* snapshot when present so edits survive re-open.
  const openRecentResource = useCallback(
    async (id: string) => {
      const stored = await getRecentResourceContent(id);
      if (!stored) {
        showToast({ message: '리소스 내용을 찾지 못했습니다.', tone: 'error' });
        return;
      }
      const entry: ResourceEntry = { ...stored.entry, raw: stored.raw };
      setLibrarySection('resources');
      if (entry.kind === 'flow-html' && stored.doc) {
        loadDocument(entry, stored.doc);
        // loadDocument resets width to null (→ default); restore the saved
        // column width synchronously so DocumentCanvas's default-seeding effect
        // sees a non-null value and doesn't override it.
        if (stored.doc.width != null) {
          useResourceStore.getState().setDocWidth(stored.doc.width);
        }
        setDocEditable(true);
        setActiveDeck(null);
        setActiveDeckId(null);
        setActiveResource(entry);
        setEditorKind('document');
        usePersistenceStore.getState().reset();
        setMode('editor');
        setBootReady(true);
        return;
      }
      await openResource(entry);
    },
    [loadDocument, openResource],
  );

  const exitToLibrary = useCallback(() => {
    setPresenting(false);
    setMode('library');
    setActiveDeckId(null);
    setActiveDeck(null);
    setActiveResource(null);
    setBootReady(false);
    useResourceStore.getState().reset();
    usePersistenceStore.getState().reset();
  }, []);

  // Auto-save binds to the active deck id (deck-mode only). Document-mode
  // persistence is write-back to the source file (R4), handled separately.
  useAutoSave(activeDeckId, bootReady && mode === 'editor' && editorKind === 'deck');
  // Document-mode near-real-time write-back to the source file (FSA).
  useResourceAutoSave(bootReady && mode === 'editor' && editorKind === 'document');

  if (mode === 'library') {
    return (
      <>
        <DeckLibraryView
          onOpen={openDeck}
          onOpenResource={openResource}
          onOpenRecent={openRecentResource}
          initialTab={librarySection}
        />
        <ToastHost />
      </>
    );
  }

  return (
    <div className="flex h-full flex-col bg-editor-bg text-editor-text">
      <Toolbar
        onPresent={() => setPresenting(true)}
        onExitToLibrary={exitToLibrary}
        activeDeck={activeDeck}
        activeResource={activeResource}
        editorKind={editorKind}
        librarySection={librarySection}
        docEditable={docEditable}
        onToggleDocEditable={() => setDocEditable((v) => !v)}
      />
      {editorKind === 'deck' && activeDeck ? <StaleCacheBanner activeDeck={activeDeck} /> : null}
      <div className="flex flex-1 overflow-hidden">
        {editorKind === 'deck' ? (
          <>
            <SlideListSidebar arrowKeysEnabled={!presenting} />
            <main className="flex-1 overflow-hidden">
              <SlideCanvas />
            </main>
          </>
        ) : (
          <main className="flex-1 overflow-hidden">
            <DocumentCanvas editable={docEditable} />
          </main>
        )}
        <PropertiesPanel editorKind={editorKind} />
      </div>
      {presenting && editorKind === 'deck' ? <PresentationView onExit={exitPresenting} /> : null}
      {presenting && editorKind === 'document' ? (
        <DocumentPresentationView onExit={exitPresenting} />
      ) : null}
      <ToastHost />
    </div>
  );
}
