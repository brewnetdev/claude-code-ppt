# Dependency Graph

## Most Imported Files (change these carefully)

- `src/importer/parsePresentation.ts` — imported by **22** files
- `src/scene/store.ts` — imported by **21** files
- `src/scene/constants.ts` — imported by **11** files
- `src/canvas/OverlayLayer.tsx` — imported by **9** files
- `src/scene/resourceStore.ts` — imported by **7** files
- `src/generator/planRenderer.ts` — imported by **6** files
- `src/generator/slidePlan.ts` — imported by **6** files
- `src/importer/detectResource.ts` — imported by **6** files
- `src/library/resourceRegistry.ts` — imported by **6** files
- `src/scene/pendingCommit.ts` — imported by **6** files
- `src/library/deckRegistry.ts` — imported by **5** files
- `src/persistence/persistenceStore.ts` — imported by **5** files
- `src/exporter/linkify.ts` — imported by **5** files
- `src/highlight/highlighter.ts` — imported by **5** files
- `src/generator/blockify.ts` — imported by **5** files
- `src/generator/inlineThemeCss.ts` — imported by **4** files
- `src/generator/quality/detector.ts` — imported by **4** files
- `src/editor/Toast.tsx` — imported by **4** files
- `src/scene/applySlideBackground.ts` — imported by **4** files
- `src/scene/blockId.ts` — imported by **4** files

## Import Map (who imports what)

- `src/importer/parsePresentation.ts` ← `src/App.tsx`, `src/editor/ImportFromDeckModal.tsx`, `src/editor/StaleCacheBanner.tsx`, `src/editor/Toolbar.tsx`, `src/exporter/htmlBundle.ts` +17 more
- `src/scene/store.ts` ← `src/App.tsx`, `src/canvas/OverlayLayer.tsx`, `src/canvas/SlideCanvas.tsx`, `src/canvas/SlideRenderer.tsx`, `src/canvas/useSlideEditing.ts` +16 more
- `src/scene/constants.ts` ← `src/canvas/SlideCanvas.tsx`, `src/editor/BlockFormatPanel.tsx`, `src/editor/ImportFromDeckModal.tsx`, `src/editor/PresentationView.tsx`, `src/editor/PropertiesPanel.tsx` +6 more
- `src/canvas/OverlayLayer.tsx` ← `src/canvas/SlideCanvas.tsx`, `src/editor/PresentationView.tsx`, `src/editor/SlideThumbnail.tsx`, `src/editor/TextBlockTemplates.tsx`, `src/editor/TextOverlayPropertiesSection.tsx` +4 more
- `src/scene/resourceStore.ts` ← `src/App.tsx`, `src/canvas/DocumentCanvas.tsx`, `src/canvas/useDocumentEditing.ts`, `src/editor/DocumentPresentationView.tsx`, `src/editor/DocumentPropertiesSection.tsx` +2 more
- `src/generator/planRenderer.ts` ← `scripts/build-appendix-deck.ts`, `scripts/render-plan-fixture.ts`, `scripts/slideplan.ts`, `src/persistence/slideMigrations.ts`, `tests/generator/planRenderer.test.ts` +1 more
- `src/generator/slidePlan.ts` ← `scripts/build-appendix-deck.ts`, `scripts/render-plan-fixture.ts`, `scripts/slideplan.ts`, `tests/generator/planRenderer.test.ts`, `tests/generator/standaloneHtml.test.ts` +1 more
- `src/importer/detectResource.ts` ← `src/App.tsx`, `src/canvas/DocumentCanvas.tsx`, `src/editor/DeckLibraryView.tsx`, `src/editor/DocumentPresentationView.tsx`, `src/editor/Toolbar.tsx` +1 more
- `src/library/resourceRegistry.ts` ← `src/App.tsx`, `src/editor/DeckLibraryView.tsx`, `src/editor/Toolbar.tsx`, `src/importer/detectResource.ts`, `src/persistence/recentResources.ts` +1 more
- `src/scene/pendingCommit.ts` ← `src/canvas/OverlayLayer.tsx`, `src/canvas/SlideRenderer.tsx`, `src/editor/Toolbar.tsx`, `src/scene/store.ts`, `tests/scene/pendingCommit.test.ts` +1 more
