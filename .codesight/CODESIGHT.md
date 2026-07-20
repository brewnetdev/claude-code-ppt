# claude-code-ppt — AI Context Map

> **Stack:** raw-http | none | react | typescript

> 0 routes | 0 models | 31 components | 48 lib files | 3 env vars | 0 middleware | 0% test coverage
> **Token savings:** this file is ~5,100 tokens. Without it, AI exploration would cost ~32,000 tokens. **Saves ~27,000 tokens per conversation.**
> **Last scanned:** 2026-07-20 18:43 — re-run after significant changes

---

# Components

- **WikiPage** — `docs/seo/page.tsx`
- **App** — `src/App.tsx`
- **DocumentCanvas** — props: editable — `src/canvas/DocumentCanvas.tsx`
- **OverlayLayer** — props: items, selectedId, onSelect, onUpdate — `src/canvas/OverlayLayer.tsx`
- **SlideCanvas** — `src/canvas/SlideCanvas.tsx`
- **SlideRenderer** — props: slideId — `src/canvas/SlideRenderer.tsx`
- **BlockFormatPanel** — props: blockId — `src/editor/BlockFormatPanel.tsx`
- **CodeBlockEditPanel** — props: getEl, seedKey — `src/editor/CodeBlockEditPanel.tsx`
- **CodeBlockTemplates** — `src/editor/CodeBlockTemplates.tsx`
- **ColorPickerPopover** — props: value, onChange, allowNone — `src/editor/ColorPicker.tsx`
- **ColorSwatchButton** — props: value, onChange, label, allowNone — `src/editor/ColorPicker.tsx`
- **DeckLibraryView** — props: onOpen, onOpenResource, onOpenRecent, initialTab — `src/editor/DeckLibraryView.tsx`
- **DeckWatermarkSection** — `src/editor/DeckWatermarkSection.tsx`
- **DocumentPresentationView** — props: onExit — `src/editor/DocumentPresentationView.tsx`
- **DocumentPropertiesSection** — `src/editor/DocumentPropertiesSection.tsx`
- **ExportDropdown** — props: busy, disabled, onExportHtml, onExportPng — `src/editor/ExportDropdown.tsx`
- **HelpModal** — props: open, onClose — `src/editor/HelpModal.tsx`
- **IconPicker** — props: className, onPick — `src/editor/IconPicker.tsx`
- **ImportFromDeckModal** — props: open, onClose, activeDeckId — `src/editor/ImportFromDeckModal.tsx`
- **PresentationView** — props: onExit — `src/editor/PresentationView.tsx`
- **PropertiesPanel** — props: editorKind — `src/editor/PropertiesPanel.tsx`
- **SlideBackgroundSection** — `src/editor/SlideBackgroundSection.tsx`
- **SlideListSidebar** — props: arrowKeysEnabled — `src/editor/SlideListSidebar.tsx`
- **SlideThumbnail** — props: slideId, width — `src/editor/SlideThumbnail.tsx`
- **StaleCacheBanner** — props: activeDeck — `src/editor/StaleCacheBanner.tsx`
- **TemplatePicker** — props: open, onClose, onSelect — `src/editor/TemplatePicker.tsx`
- **TextBlockTemplates** — `src/editor/TextBlockTemplates.tsx`
- **TextFormatPanel** — `src/editor/TextFormatPanel.tsx`
- **TextOverlayPropertiesSection** — props: slideId, overlay — `src/editor/TextOverlayPropertiesSection.tsx`
- **Toolbar** — props: onPresent, onExitToLibrary, activeDeck, activeResource, editorKind, librarySection, docEditable, onToggleDocEditable — `src/editor/Toolbar.tsx`
- **WatermarkControls** — props: enabled, text, toggleLabel, onToggle, onTextChange, onTextBlur, onApply — `src/editor/WatermarkControls.tsx`

---

# Libraries

- `docs/images/level0/gen-intro-diagrams.py`
  - function page: (body)
  - function esc: (s)
  - function level_diagram: (num, parts, missions)
  - function map_diagram: ()
  - function paths_diagram: ()
- `scripts/insert-global-settings-slide.py` — function line: (inner)
- `src/canvas/autoLinkUrl.ts` — function tryAutoLinkOnSpace: (e) => boolean
- `src/canvas/documentEditingBridge.ts`
  - function setActiveDocFrame: (frame) => void
  - function execDocCommand: (command, value?) => boolean
  - function wrapSelectionStyle: (prop, value) => boolean
  - function insertDocText: (text) => boolean
  - function insertDocImage: (src) => boolean
  - function insertDocChecklist: () => boolean
  - _...29 more_
- `src/canvas/listInvariant.ts` — function ensureLiWrapper: (li) => HTMLDivElement, function enforceBulletListInvariant: (root) => void
- `src/canvas/useDocumentEditing.ts` — function useDocumentEditing: (frameRef, // Re-run when the document is re-seeded (load / undo / redo) => void, const DOC_SELECTION_EVENT
- `src/canvas/useSlideEditing.ts` — function mergeListItems: (startLi, endLi, range) => void, function useSlideEditing: (slideRootRef, onChange?) => void
- `src/editor/codeBlockHtml.ts`
  - function readCodeSource: (el) => string
  - function readCodeLang: (el) => string
  - function isCodeBlockEl: (el) => boolean
  - function buildCodeBlockHtml: (source, lang) => Promise<string>
  - function buildTerminalHtml: (source) => Promise<string>
  - function applyCodeBlockToEl: (el, source, lang) => Promise<boolean>
  - _...2 more_
- `src/editor/fontList.ts`
  - function loadGoogleFont: (google) => void
  - type FontEntry
  - type FontGroup
  - const SYSTEM_FONTS: FontEntry[]
  - const DEV_MONO_FONTS: FontEntry[]
  - const DEV_SANS_FONTS: FontEntry[]
  - _...1 more_
- `src/editor/hexColor.ts` — function parseHexColorInput: (input) => string | null
- `src/editor/textFormatActions.ts`
  - function selectionInsideCanvas: () => Range | null
  - function notifyInput: (range) => void
  - function applyHighlight: (color) => void
  - function wrapWithStyle: (patch) => void
  - function clearHighlights: () => void
  - function toggleCmd: (cmd) => void
  - _...1 more_
- `src/exporter/fileSystemAccess.ts`
  - function isFsaSupported: () => boolean
  - function getStoredExportRoot: () => Promise<FsaDirectoryHandle | null>
  - function pickExportRoot: () => Promise<FsaDirectoryHandle | null>
  - function clearStoredExportRoot: () => Promise<void>
  - function getStoredResourceFile: (resourceId, withGesture) => Promise<FsaFileHandle | null>
  - function pickResourceFile: (resourceId, suggestedName) => Promise<FsaFileHandle | null>
  - _...5 more_
- `src/exporter/htmlBundle.ts`
  - function buildHtmlBundle: (input) => Promise<string>
  - function openPrintablePreview: (html) => void
  - function downloadBlob: (content, filename, mime) => void
  - function defaultExportName: (title?) => string
  - type BundleInput
- `src/exporter/linkify.ts` — function linkifyHtml: (html, doc) => string
- `src/exporter/pngExport.ts`
  - function exportSelectedSlidePng: (deck, index) => Promise<void>
  - function exportAllSlidesPng: (deck) => Promise<void>
  - type PngExportDeck
- `src/generator/adapters/presentationAdapter.ts` — function renderPresentation: (groups, template) => Promise<ParsedSlide[]>
- `src/generator/adapters/shared.ts`
  - function escapeHtml: (s) => string
  - function makeBlockId: (prefix) => string
  - function makeSlideId: (template) => string
  - function wrapSlide: (opts) => string
  - function toParsedSlide: (idx, template, html, title) => ParsedSlide
- `src/generator/blockify.ts`
  - function blockify: (tree, hint?) => SlideGroup[]
  - type BlockifyHint
  - type SlideKind
  - type SlideGroup
- `src/generator/detectTerminal.ts` — function classifyCodeBlock: (node) => 'terminal' | 'code', function inferLang: (node) => string
- `src/generator/inlineThemeCss.ts`
  - function stripEditorOverrides: (css) => string
  - function loadInlineCss: (paths, root) => string
  - const THEME_CSS_PATHS
- `src/generator/mdToSlides.ts` — function mdToSlides: (source, template) => Promise<ParsedSlide[]>, type Template
- `src/generator/parseMarkdown.ts` — function parseMarkdown: (source) => Root
- `src/generator/pipeline.ts`
  - function generateOnce: ({...}, template, hint }) => Promise<GenerateOutput>
  - type Template
  - type GenerateInput
  - type GenerateOutput
- `src/generator/planRenderer.ts`
  - function renderPlan: (plan) => RenderedSlide[]
  - type RenderedSlide
  - const INLINE_TAG_ALLOWLIST
- `src/generator/quality/detector.ts`
  - function detectFeatures: (tree) => MdFeatures
  - function isPresent: (features, id) => boolean
  - type MdFeatures
- `src/generator/quality/gates.ts`
  - function runGates: (generatedHtml, parsedSlides, features, expectedSlideCount) => GateReport
  - type GateId
  - type GateResult
  - type GateReport
  - const CATEGORY_GATES: Record<string, GateId[]>
- `src/generator/quality/rubric.ts`
  - function summarize: (items) => ScoreReport
  - type RubricId
  - type RubricItemScore
  - type ScoreReport
  - const RUBRIC_IDS: readonly RubricId[]
  - const POINTS_PER_ITEM
  - _...2 more_
- `src/generator/quality/scorer.ts` — function scoreHtml: (html, mdFeatures, gateReport?) => ScoreReport
- `src/generator/retry.ts` — function generateWithRetry: (input) => Promise<RetryResult>, type RetryResult
- `src/generator/sanitizeRawHtml.ts` — function sanitizeRawHtml: (tree) => void
- `src/generator/slidePlan.ts`
  - function validateSlidePlan: (raw) => ValidateResult
  - type Template
  - type SupportedLang
  - type CalloutTone
  - type BadgeTone
  - type MetaItem
  - _...6 more_
- `src/highlight/highlighter.ts`
  - function normalizeLang: (lang) => string
  - function highlightCode: (source, lang) => Promise<string>
  - const SUPPORTED_LANGS: ReadonlyArray<{ value: string; label: string }>
- `src/importer/detectResource.ts`
  - function detectResourceKind: (filename, content) => ResourceKind
  - function splitHtmlDocument: (html) => SplitDocument
  - function assembleHtmlDocument: (input) => void
  - type SplitDocument
- `src/importer/parsePresentation.ts`
  - function deriveSlideTitleFromHtml: (html, fallback) => string
  - function parsePresentationHTML: (source) => ParsedDeck
  - type SlideBackground
  - type ParsedSlide
  - type ParsedDeck
- `src/importer/upgradeCodeBlocks.ts` — function upgradeSlideCodeBlocks: (slides) => Promise<ParsedSlide[]>
- `src/library/deckRegistry.ts`
  - function getDeckById: (id) => DeckRegistryEntry | undefined
  - function countSlides: (html) => number
  - type DeckTemplate
  - type DeckSourceKind
  - type DeckRegistryEntry
  - type CourseLevel
  - _...4 more_
- `src/persistence/idb.ts`
  - function idbGetDeck: (deckId) => Promise<unknown>
  - function idbPutDeck: (deckId, value) => Promise<void>
  - function idbDeleteDeck: (deckId) => Promise<void>
  - function idbGetMeta: (key) => Promise<T | undefined>
  - function idbPutMeta: (key, value) => Promise<void>
  - function idbDeleteMeta: (key) => Promise<void>
- `src/persistence/localStore.ts`
  - function saveDeckToLocalStorage: (deckId, input, Overlay[]>;
    currentIndex) => Promise<SaveResult>
  - function loadDeckFromLocalStorage: (deckId) => Promise<PersistedDeck | null>
  - function clearDeckFromLocalStorage: (deckId) => Promise<void>
  - function getLastOpenedDeckId: () => string | null
  - function setLastOpenedDeckId: (deckId) => void
  - function safeReadStringArray: (key) => string[]
  - _...8 more_
- `src/persistence/recentResources.ts`
  - function listRecentResources: () => Promise<RecentResource[]>
  - function recordRecentResource: (entry, 'savedAt'>, raw, doc?) => Promise<void>
  - function getRecentResourceContent: (id) => Promise<StoredContent | null>
  - function updateRecentDoc: (id, doc) => Promise<void>
  - function removeRecentResource: (id) => Promise<void>
  - type RecentResource
  - _...1 more_
- `src/persistence/slideMigrations.ts` — function runSlideMigrations: (slides, deckId) => MigrationResult, type MigrationResult
- `src/persistence/useAutoSave.ts` — function useAutoSave: (deckId, enabled) => void
- `src/persistence/useResourceAutoSave.ts` — function useResourceAutoSave: (enabled) => void
- `src/scene/applySlideBackground.ts`
  - function applyBackgroundToElement: (el, bg) => void
  - function stripBackgroundFromElement: (el) => void
  - function applyBackgroundToHtml: (html, bg) => string
- `src/scene/blockId.ts`
  - function makeBlockId: () => string
  - function ensureBlockId: (el) => string
  - const DATA_BLOCK_ID
- `src/scene/pendingCommit.ts`
  - function registerPendingFlush: (fn) => void
  - function flushPendingCommit: () => void
  - function usePendingFlush: (timerRef, commit) => void
- `src/scene/store.ts` — function loadSlideClipboardFromSession: () => void, const useDeckStore
- `src/scene/stripEditorChrome.ts` — function stripEditorChrome: (el) => void
- `src/watermark/watermark.ts`
  - function watermarkSpansHtml: (lines) => string
  - function slideHasWatermark: (slideHtml) => boolean
  - function extractWatermarkLines: (slideHtml) => string[]
  - function setSlideWatermark: (slideHtml, enabled, lines) => string
  - function watermarkLayerHtml: (lines) => string
  - const WATERMARK_CLASS
  - _...2 more_

---

# Config

## Environment Variables

- `BUMP` **required** — docs/images/level5/_batch-bump.mjs
- `CI` **required** — playwright.config.ts
- `DEV` **required** — src/main.tsx

## Config Files

- `tailwind.config.js`
- `tsconfig.json`
- `vite.config.ts`

## Key Dependencies

- react: ^18.3.1

---

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

---

# Test Coverage

> **0%** of routes and models are covered by tests
> 24 test files found

---

# CI/CD Pipelines

## GitHub Actions (1 workflow)

| Workflow | Triggers | Jobs | Deploy | Environments |
|---|---|---|---|---|
| ci | push, pull_request | 1 | — | — |

---
_Source: .github/workflows/ci.yml_
_Generated by codesight-cicd-plugin_

---

# Claude Skills

Project-local slash commands available to Claude Code agents:

- `/card-news` — 카드뉴스 (Card News)
- `/carve-caveman` — carve — caveman 스킬 실행
- `/carve-codesight` — carve — codesight 스킬 실행
- `/carve-commit` — carve — commit 스킬 실행
- `/carve-handoff` — carve — handoff 스킬 실행
- `/carve-harness-architect` — carve — harness-architect 스킬 실행
- `/carve-harness-audit` — carve — harness-audit 스킬 실행
- `/carve-iterate` — carve — iterate 자율 수렴 루프 실행
- `/carve-lsp` — carve — lsp 스킬 실행
- `/carve-model-route` — carve — model-route 스킬 실행
- `/carve-parallel-agents` — carve — parallel-agents 스킬 실행
- `/carve-tdd` — carve — tdd 스킬 실행
- `/carve-test-gen` — carve — test-gen 스킬 실행
- `/carve-workflow` — carve — workflow 절차적 완수 규율 실행
- `/carve-write-a-skill` — carve — write-a-skill 스킬 실행
- `/carve-zoom-out` — carve — zoom-out 스킬 실행
- `/html-presentation` — HTML 프리젠테이션 (HTML Presentation / 16:9 슬라이드)
- `/html-report` — HTML 리포트 (HTML Report)
- `/SKILL` — >
- `/squad` — "Invoke a Squad Agent. Usage: /squad <member> [task]"
- `/squad-audit` — "Security audit. Usage: /squad-audit [scope]"
- `/squad-debug` — "Debug an issue. Usage: /squad-debug <error>"
- `/squad-docs` — "Generate docs. Usage: /squad-docs [type]"
- `/squad-evaluator` — "Squad Evaluator — 완료 기준·Sprint Contract 대비 독립 평가"
- `/squad-gitops` — "Git workflow. Usage: /squad-gitops [type]"
- `/squad-plan` — "Feature planning. Usage: /squad-plan <feature>"
- `/squad-qa` — "Run QA tests. Usage: /squad-qa [scope]"
- `/squad-refactor` — "Refactor code. Usage: /squad-refactor [scope]"
- `/squad-review` — "Code review. Usage: /squad-review [scope]"
- `/svg-image` — 이미지 / SVG (다이어그램 · 일러스트)
- `/ui-component` — 앱 UI 컴포넌트 (UI Component)

_Source: .claude/commands, .claude/skills_

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_