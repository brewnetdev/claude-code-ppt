# Handoff — `feat/editor-phases-0-through-2b`

> 최종 갱신: 2026-04-26
> 대상 브랜치: `feat/editor-phases-0-through-2b` (main 대비 ahead 1, 작업트리 미커밋 대량)
> 다음 세션이 이 브랜치를 이어받을 때 가장 먼저 읽는 문서.

---

## TL;DR

- **이번 세션(2026-04-26) 1차**: "어떤 MD가 들어와도 design-patterns.html 수준의 편집기 호환 PPT가 나온다"는 결정론 파이프라인 완성 — SlidePlan JSON 계약 + 결정론 렌더러 + Claude Code 스킬(`md-to-slidedeck`) 4중 잠금. 부수 작업: deck library 분리, runtime code-block upgrade, design-patterns 데크 추가, X/Y 드리프트 버그 fix.
- **이번 세션 2차 (compaction 이후)**: **portfolio 템플릿 추가** (마크업 그대로, `data-template` 한 어트리뷰트로 CSS 토큰 swap) + **테스트 가이드 §2.10** (`docs/guide/skills.md`에 4가지 검증 경로) + **BUILTIN_DECKS에 SlidePlan 샘플 2개 등록**(presentation/portfolio 카드, 에디터 부팅 경로로 shiki + macOS dots 풀 비주얼 확인).
- `npm run typecheck` ✓ / `npx vitest run` 17/17 PASS (planRenderer 14/14 + e2e 3/3) 통과 상태로 종료.
- **작업트리 미커밋 대량**(M 12 + ?? 12). 내일 첫 행동: 브라우저로 새 카드 2개 동작 확인 → 분할 커밋 → report 템플릿.
- 다음 우선순위: **(A)** 새 BUILTIN_DECKS 카드 2개 브라우저 동작 확인 → **(B)** report 템플릿 동일 패턴 추가(report.css 추출 + 추론 규칙) → **(C)** 분할 커밋 → **(D)** 테스트 갭 메우기(portfolio 전용 MD 픽스처, validateSlidePlan 단위 테스트) → **(E)** in-app LLM 호출 경로(`src/generator/llm/authorPlan.ts`).

---

## 1. 현재 브랜치 상태

| 항목 | 값 |
|---|---|
| 브랜치 | `feat/editor-phases-0-through-2b` |
| main 대비 ahead | **1 commit** (직전 커밋들은 PR #2 머지로 main에 흡수) |
| 작업 트리 | **대량 미커밋** (M 12 + ?? 12). MD→PPT 파이프라인 + deck library + code-block upgrade + portfolio 템플릿 + 가이드 문서가 단일 working state |
| 빌드 상태 | typecheck ✓ / vitest 17/17 PASS (planRenderer 14/14 + e2e 3/3) |
| 테스트 | `node_modules/.bin/vitest run` 17/17 PASS. `run-quality-loop.ts`(레거시 어댑터 회귀)는 이번 세션 미실행 |

### 미커밋 변경(요약)

수정(M):
- `src/App.tsx` — library/editor BootMode 분기, deck-scoped 로드 + 런타임 upgrade 호출
- `src/editor/{Toolbar,PropertiesPanel,BlockFormatPanel}.tsx` — Library 복귀 버튼 / X·Y 드리프트 버그 fix / 패널 컬랩스
- `src/persistence/{localStore,useAutoSave}.ts` — deck-id-scoped 키 + LAST_DECK_KEY
- `src/highlight/highlighter.ts` — `java` 추가
- `src/canvas/SlideRenderer.tsx` — `portfolio.css` 정적 import 추가 (2차 작업)
- `package.json`/`package-lock.json`/`.gitignore` — deps + .quality-runs/.tmp 무시

신규(??):
- `.claude/skills/md-to-slidedeck/SKILL.md` (1차) + 2차에서 Template selection 섹션 추가
- `docs/guide/AUTHORING_RULES.md` (1차) + 2차에서 §6.5 "템플릿별 작성 규약" 추가
- `docs/guide/skills.md` (2차 신규) — 스킬 사용법 + §2.10 "실제 테스트 방법" 4가지 경로
- `docs/html/presentation/design-patterns.html` (편집기 호환 GoF 데크)
- `docs/html/presentation/slideplan-sample.html` (2차 신규, BUILTIN_DECKS용 — fixture 렌더 결과)
- `docs/html/portfolio/slideplan-sample.html` (2차 신규, BUILTIN_DECKS용 — 동일 fixture가 portfolio 템플릿)
- `docs/sample/` — 변환 회귀용 원본 MD 3종(SEO_GUIDE, 디자인패턴, npm 배포)
- `scripts/{run-quality-loop,slideplan,render-plan-fixture}.ts` — `slideplan.ts`는 2차에서 portfolio.css 인라인 추가
- `src/canvas/themes/portfolio.css` (2차 신규) — `[data-template="portfolio"]` 스코프, 화이트 BG + 블루 액센트
- `src/editor/DeckLibraryView.tsx`
- `src/generator/` — 신규 디렉터리 전체(slidePlan/planRenderer/quality·gates·rubric/retry/blockify/...). `planRenderer.ts`는 2차에서 `wrapStandard`/`wrapCover`/`wrapSection`이 `data-template` 속성 emit
- `src/importer/upgradeCodeBlocks.ts` — 런타임 shiki+chrome stamping
- `src/library/deckRegistry.ts` — 2차에서 `slideplan-sample-presentation` / `slideplan-sample-portfolio` 2개 카드 추가
- `tests/generator/{planRenderer,e2e}.test.ts` + `fixtures/sample-plan.json` — `planRenderer.test.ts`는 2차에서 portfolio describe 블록 추가(11→14)
- `vitest.config.ts`

분할 커밋 후보 (목적별 묶음 추천):
1. **deck library 인프라**: `library/deckRegistry.ts`, `App.tsx` 모드 분기, `Toolbar` 백버튼, `persistence/*` deck-id-scoped 변경, `editor/DeckLibraryView.tsx`
2. **런타임 코드블럭 효과**: `importer/upgradeCodeBlocks.ts`, `highlight/highlighter.ts` (java 추가), `App.tsx`의 upgrade 호출
3. **design-patterns 데크 추가**: `docs/html/presentation/design-patterns.html`
4. **MD→PPT 파이프라인 + 스킬**: `docs/guide/AUTHORING_RULES.md`, `src/generator/**`, `tests/generator/**`, `scripts/*.ts`, `vitest.config.ts`, `.claude/skills/md-to-slidedeck/SKILL.md`, `docs/sample/`
5. **버그 fix**: `editor/BlockFormatPanel.tsx` X/Y 드리프트
6. **UI 개선**: `editor/PropertiesPanel.tsx` 컬랩스
7. **chore**: `package.json`/`package-lock.json`/`.gitignore`

### 최근 10개 커밋

```
f030df0 feat(editor): add slide preview zoom control (25-200%)
fd0672b fix(editor): blur sidebar slide button on click to prevent focus ring leak
7653b73 feat(editor): add code block + terminal templates with shiki highlighting
c70ad89 chore(dev): add react-grab for in-browser element-to-clipboard
ef1549d feat(editor): add scaled mini-canvas thumbnails to slide sidebar
250af8c chore: ignore Playwright test-results and report directories
16a5f8f feat(editor): add ArrowUp/ArrowDown slide navigation
e7e5cdb chore(tests): add Playwright config, smoke tests, deploy docs
e1f15d3 fix(editor): NumberField draft state, Esc clears selection, selected-block hygiene
9349e87 feat(editor): add text overlays, color/font pickers, padding controls
```

---

## 2. 완료된 Phase 누적 표

| Phase | Commit | 결과 |
|---|---|---|
| 0 · Scaffold | `d289416` | Vite + React + TS + Tailwind 셸 + Brewnet 샘플 슬라이드 1280×720 scale-to-fit 렌더 |
| 1a · Edit spike | `8fb2d6a` → `c737ce9` | contenteditable · ⋮⋮ grip 블록 순서 변경(SortableJS) · 이미지 드롭/드래그/리사이즈(Moveable) 동작 검증 |
| 1b · Importer + Store + Nav | `5b06e93` | DOMParser로 `docs/html/presentation/brewnet-presentation.html` 7슬라이드 파싱 → Zustand `useDeckStore` → 사이드바 클릭 전환 + 편집 내용·오버레이 슬라이드별 유지 |
| (refactor) | `7085d8e` | 미사용 `scene/types.ts` 제거, `scene/constants.ts`로 축소 |
| 2a · Slide CRUD | `94105c2` | 툴바 +New / Duplicate / Delete. 300ms debounced DOM→store commit |
| (hotfix) | `07ac377` | debounced commit이 `dangerouslySetInnerHTML` 재주입을 일으켜 타이핑이 끊기고 Backspace가 브라우저 뒤로가기를 트리거하던 버그 해결: `SlideRenderer`가 `initialHtml`을 `useDeckStore.getState()`로 단 한 번만 읽고, `SlideCanvas`는 `slide` 객체 대신 `slideId`만 구독. anchor click preventDefault도 추가 |
| 2b · 편집 범위 확장 + Props | `e112064` → `15308e1` | `.slide-inner`/`.slide-footer` 전체 contenteditable. `<td>/<th>` 편집. 한 줄 슬롯 Enter 차단(IME-safe). Overlay selection을 store로 이관. 프로퍼티 패널에 X/Y/W/H 입력 + Delete |
| (docs) | `88f54fb` | HANDOFF 인계 노트 추가 |
| 3a · HTML bundle | `d15192d` | `Export HTML` 버튼 + `src/exporter/htmlBundle.ts` |
| 3b/3c · PDF + PNG | `3e8759f` | `Export PDF` (`#print` 해시 자동 `window.print()`) / `PNG (current)` (html-to-image) |
| 3 · Export 통일/수정 | `6a32096` | HTML 번들을 세로 스택 + scroll-snap으로 변경(모든 슬라이드 즉시 노출). PNG → 전체 슬라이드 일괄 (오프스크린 호스트 + 250ms 간격). `.export-overlay { z-index:100; opacity:1 !important }`로 `.slide-logo`(z=10) 등 슬라이드 내부 요소가 오버레이를 가리던 투명 버그 해결 |
| Undo/Redo | `0f16234` | store에 `past[]`/`future[]` 스냅샷 스택(50). `revision` 카운터가 undo/redo에서만 증가 → `SlideRenderer key={slideId:revision}`으로 강제 재마운트(일반 편집은 카운터 미증가 → 커서 보존). 툴바 ↶/↷ + 키보드 Cmd/Ctrl+Shift+Z (undo) / Cmd/Ctrl+Y (redo). 단독 Cmd/Ctrl+Z는 브라우저 contenteditable native undo 보존을 위해 의도적으로 가로채지 않음 |
| Text Props | `b86a6bc` | `src/editor/TextFormatPanel.tsx` 추가. 선택이 캔버스 내부일 때만 활성. B/I/U(execCommand) + 4색 highlight (`hl-amber/blue/green/cyan` — cyan은 신규 추가) 토큰 기반 wrap. Clear 버튼은 hl-* 클래스 strip. 모든 버튼은 `mousedown` preventDefault로 캔버스 selection 보존 |
| (docs) | `cab83e5` | HANDOFF 인계 노트 갱신 (Phase 3 / Undo-Redo / Text-Props) |
| Option E · Persistence | `7044b73` | `src/persistence/{localStore,persistenceStore,useAutoSave}.ts` 추가. v1 스키마(`claude-code-ppt:deck:v1`) — slides/overlaysBySlide/currentIndex 직렬화, blob URL → base64 인라이닝. 800ms debounced auto-save (slides/overlays/index ref 변경 시에만). store에 `loadDeckFull` 추가. App boot: localStorage 우선 → 없으면 sample HTML. Toolbar에 `SaveIndicator` (Saved Xs ago / Saving… / Save failed)와 `Reset` 버튼(confirm 후 storage clear + 샘플 재로드) |
| (fix) | `36f2527` | `loadDeck`/`loadDeckFull`이 `revision`을 0으로 리셋 대신 **bump**. parsePresentationHTML이 결정적 ID(`slide-1..N`)를 반환하므로 SlideCanvas key가 안 바뀌어 Reset/auto-load 시 SlideRenderer가 stale HTML을 유지하던 문제 해결 |
| Option F · Slide drag-reorder | `33c566c` | store에 `reorderSlide(from,to)` 추가 — splice 기반 재배치 + `currentIndex` 추적으로 활성 슬라이드 유지. `SlideListSidebar`에 SortableJS 적용, 행 좌측 `⋮⋮` 그립만 핸들. onEnd에서 Sortable의 DOM mutation을 revert 후 store dispatch → React keyed reconciliation으로 깔끔히 재배치 |
| (fix) block reorder atomic | `4f6f972` | 블록 reorder가 debounced commit 경로를 타면 직후 타이핑과 한 스냅샷에 합쳐져 단독 undo 불가. `SlideRenderer.commitNow()` (pending timer 취소 + 동기 commit) + `useSlideEditing(onReorder)` 인자 추가로 Sortable `onEnd`가 즉시 commit하도록 분리 |
| (fix) Cmd+Z routing | `7a2dd37` | **근본 원인**: 브라우저 contenteditable native undo는 `input` 이벤트만 추적 → Sortable reorder, Moveable drag/resize, 사이드바 슬라이드 reorder는 native undo 히스토리에 없어 Cmd+Z 시 복원 불가. 단독 Cmd/Ctrl+Z를 store undo에 강제 매핑(Cmd/Ctrl+Shift+Z는 redo alias). `src/scene/pendingCommit.ts` 등록부 추가 — SlideRenderer가 sync flusher 등록, Toolbar가 undo/redo 직전 호출하여 pending 타이핑 debounce를 drain. 트레이드오프: 글자단위 native CE undo 상실 / 모든 편집 surface 일관 undo |
| Sidebar thumbnails | `ef1549d` | 사이드바 각 행에 196px 폭 미니 캔버스 썸네일. CSS `transform: scale(width/1280)` + `pointer-events: none`. `SlideThumbnail.tsx` 신규, `SlideListSidebar.tsx` 수정 |
| react-grab dev tool | `c70ad89` | DEV 모드 전용. `⌘C` + 요소 클릭으로 React 컴포넌트 소스 위치 클립보드 복사. prod 번들에서 tree-shake됨 |
| Code blocks + shiki | `7653b73` | "Code Block" / "Terminal" 템플릿. 언어 선택(12종) + textarea 편집 + 300ms 디바운스 재하이라이팅. `src/highlight/highlighter.ts` + `src/editor/CodeBlockTemplates.tsx` + `src/editor/CodeBlockEditPanel.tsx` + `src/canvas/themes/code-blocks.css` 신규 |
| (fix) focus ring | `fd0672b` | 사이드바 클릭 후 방향키 이동 시 이전 버튼에 파란 outline 잔상 버그. onClick에서 `e.currentTarget.blur()` + `focus-visible:ring-1` |
| Zoom control | `f030df0` | 캔버스 우측 하단 플로팅 `[− | NN % | + | Fit]`. 25–200%, 10% 단위, 직접 입력. `baseScale × zoomPercent/100`. `zoomDraft` 별도 상태로 백스페이스 버그 회피 |
| (merge) main 통합 | `5324677` | PR #2 머지로 직전 커밋들이 main에 흡수됨 |
| **Deck Library** | _미커밋_ | `src/library/deckRegistry.ts` 신규 — `BUILTIN_DECKS` 정적 등록부(brewnet-presentation + design-patterns). `App.tsx`에 `BootMode = 'library' \| 'editor'` 분기. `editor/DeckLibraryView.tsx`로 카드 그리드 홈 화면. `Toolbar`에 `← Library` 버튼 + activeDeck 표시. `persistence/localStore.ts`를 deck-id-scoped(`claude-code-ppt:deck:v1:<id>`)로 변경, `LAST_DECK_KEY` 추가. `useAutoSave(deckId, enabled)`도 deckId 인자 |
| **Runtime code-block upgrade** | _미커밋_ | `importer/upgradeCodeBlocks.ts` 신규 — DOMParser로 슬라이드 HTML 순회, 비-와이어 `.code-block` / `.terminal`에 shiki + macOS dots chrome + `data-code-source` 멱등 stamping. brewnet 수동 `<span class="green">` 패턴은 skip. 데크 로드 시 1회 적용. `highlight/highlighter.ts`에 `java` 추가 |
| **design-patterns 데크** | _미커밋_ | `docs/html/presentation/design-patterns.html` 신규 — GoF 디자인 패턴 23종 발표용. 모든 `.code-block`에 `data-code-lang="java"` stamping(2개 출력 전용은 plaintext) |
| **MD→PPT 결정론 파이프라인** | _미커밋_ | `docs/guide/AUTHORING_RULES.md` (4중 잠금 계약) + `src/generator/slidePlan.ts`(타입 + `validateSlidePlan` 핸드롤) + `src/generator/planRenderer.ts`(JSON→editor HTML 결정론 디스패치, 9개 슬라이드 타입 모두 지원) + `tests/generator/{planRenderer.test.ts, fixtures/sample-plan.json}` (11/11 PASS) + `scripts/slideplan.ts` (`validate` / `render` CLI) + `.claude/skills/md-to-slidedeck/SKILL.md` |
| (fix) X/Y position drift | _미커밋_ | `editor/BlockFormatPanel.tsx:153–183` — 코드블럭 X 또는 Y 입력 시 변경되지 않은 축이 1–2px 따라 움직이던 버그. `el.style.position === 'absolute'` 분기로 첫 전환에만 두 축 모두 시드, 이후엔 `override`에 들어온 축만 갱신 |
| Properties 패널 컬랩스 | _미커밋_ | `editor/PropertiesPanel.tsx` 토글 버튼 추가 |
| **portfolio 템플릿** | _미커밋_ (2차) | `src/canvas/themes/portfolio.css` 신규 — `[data-template="portfolio"]` 스코프로 brewnet-dark 토큰을 화이트 BG + 블루(#3D5AF1) 액센트로 재정의. 코드블록은 가독성 위해 다크 유지. `planRenderer.ts` 3개 wrapper(`wrapStandard`/`wrapCover`/`wrapSection`)가 `data-template={plan.template}` emit. `SlideRenderer.tsx`/`scripts/slideplan.ts`에 portfolio.css 정적 import + 인라인 주입. 회귀 테스트 11→14 PASS — `template` 스왑 시 마크업(슬라이드/cover/section/code-block 카운트) 동일성 강제 |
| **BUILTIN_DECKS 등록 (SlidePlan 샘플)** | _미커밋_ (2차) | `docs/html/{presentation,portfolio}/slideplan-sample.html` 신규(fixture 렌더 결과 복사). `src/library/deckRegistry.ts`에 `slideplan-sample-presentation` / `slideplan-sample-portfolio` 2개 카드 추가 — 에디터 부팅 경로로 진입하면 `upgradeSlideCodeBlocks`가 자동으로 shiki + macOS dots stamp |
| **테스트 가이드 + AUTHORING §6.5** | _미커밋_ (2차) | `docs/guide/skills.md` §2.10 "실제 테스트 방법" — CLI standalone / 자연어 스킬 호출 / 에디터 부팅 / 회귀 테스트 4가지 경로. `docs/guide/AUTHORING_RULES.md` §6.5 — 템플릿별 작성 규약(presentation 기본형, portfolio 권장/회피 패턴, report 미배포). `.claude/skills/md-to-slidedeck/SKILL.md`에 Template selection 표 + 추론 규칙 |

---

## 3. 이번 세션(2026-04-26)에서 완료한 작업

> 모두 미커밋. §1의 "분할 커밋 후보"를 따라 묶어서 커밋하면 깨끗하다.

### 3.1 Deck Library (멀티 데크 홈 화면)

- **무엇**: 첫 진입 시 카드 그리드, 데크 클릭 → 에디터 전환. 에디터 우상단 `← Library`로 복귀. 각 데크는 자기 슬롯에 자동저장.
- **왜**: 기존엔 `brewnet-presentation.html` 하드코딩 단일 데크. 책 강의는 데크가 여러 개 필요.
- **핵심 파일**:
  - `src/library/deckRegistry.ts` — `BUILTIN_DECKS = [brewnet-presentation, design-patterns]`. `?raw` 정적 import + `getDeckById` / `countSlides`.
  - `src/editor/DeckLibraryView.tsx` — 카드 그리드(제목·서브타이틀·템플릿 배지·슬라이드 수).
  - `src/App.tsx` — `BootMode = 'library' | 'editor'`. `openDeck(deck)`은 async — 영구화 데크면 `loadDeckFromLocalStorage(deck.id)` 후 `data-code-source` 마커로 첫 슬라이드만 검사 → 없으면 `upgradeSlideCodeBlocks` 1회. 새 데크면 `parsePresentationHTML(deck.html)` → upgrade. 둘 다 `loadDeck`/`loadDeckFull`로 store 시드.
  - `src/persistence/localStore.ts` — **deck-id-scoped 키**: `claude-code-ppt:deck:v1:<deckId>` + `LAST_DECK_KEY`. 레거시 단일 키는 `brewnet-presentation` 데크로 1회 마이그레이션.
  - `src/persistence/useAutoSave.ts` — `useAutoSave(deckId, enabled)`. `deckId === null`이면 short-circuit.
  - `src/editor/Toolbar.tsx` — `← Library` 버튼 + `activeDeck.title` 표시. Reset은 `activeDeck.html`에서 다시 로드(brewnet 하드코딩 제거).

### 3.2 Runtime code-block upgrade

- **무엇**: 데크 로드 시 슬라이드 HTML을 한 번 훑어 `.code-block` / `.terminal` 중 아직 와이어가 안 된 것에 shiki 출력 + macOS dots chrome + `data-code-source` 멱등 stamp.
- **왜**: `design-patterns.html`을 사람이 손으로 작성했더니 에디터의 시그니처 코드블럭 효과가 빠졌음. 모든 HTML을 새로 적기보단 로드 시점에 결정론적으로 끌어올린다.
- **어떻게**:
  - `src/importer/upgradeCodeBlocks.ts` — DOMParser → 각 노드 검사 → `data-code-source` 있으면 skip / `<pre>`에 manual `<span class="green">` 있으면 brewnet 패턴이라 skip. 그 외는 `<pre><code>`에서 source 추출 → `highlightCode` → `<code>${html}</code>` 교체 + `data-code-source` URL-encoded 저장 + `data-code-lang` + `data-block-id` + `data-slot=code` + `<div class="code-dots">` (또는 `terminal-header`) 헤더 prepend.
  - `src/highlight/highlighter.ts` — `'java'` 추가 (LANGS, SUPPORTED_LANGS 둘 다).
  - `App.tsx`의 `openDeck`에서 호출. 첫 영구화 데크는 `data-code-source` 마커 검사로 우회.

### 3.3 design-patterns 데크

- `docs/html/presentation/design-patterns.html` — 책 GoF 23패턴 발표용 데크(약 60+ 슬라이드 분량).
- `<div class="code-block">` 34개 모두에 `data-code-lang="java"`, 출력 전용 2개는 `plaintext`로 후처리. 나머지 와이어링은 런타임 upgrade가 채움.

### 3.4 MD → PPT 결정론 파이프라인

> "어떤 MD가 들어와도 design-patterns.html 수준의 PPT를 만든다"는 핵심 작업. **LLM은 HTML을 안 쓴다 — JSON Plan만 쓴다. 렌더러가 HTML을 쓴다.**

- `docs/guide/AUTHORING_RULES.md` — 4중 잠금 계약 (1: JSON 스키마, 2: 의미 게이트, 3: 결정론 렌더러, 4: 에디터 게이트). 작성자 LLM 시스템 프롬프트 템플릿 포함.
- `src/generator/slidePlan.ts` — 9개 SlideNode 타입 + 9개 Block kind. `validateSlidePlan(raw)`은 핸드롤 (Zod 회피). 모든 에러를 한 번에 반환. 엄격한 의미 게이트:
  - `slides[0].type === 'cover'`
  - `section.num` 유일
  - `references[].href`는 `^https?://`
  - `comparison-table.rows`의 컬럼 수가 `headers.length`와 일치
  - `two-col-code`는 left/right 어느 한쪽에 코드 블록 ≥ 1
- `src/generator/planRenderer.ts` — `renderPlan(plan): RenderedSlide[]`. 9개 슬라이드 타입을 각각 `wrapStandard` / `wrapCover` / `wrapSection`으로 감싼다. 외곽 chrome(`slide-topbar` / `slide-inner` / `slide-footer`), `data-template`, `data-slot`이 상수로 박혀있어 LLM이 어떻게 출력해도 흐트러지지 않음. 페이지 태그: `cover→COVER`, `section→SECTION`(또는 pageTag), 그 외→`01..NN`.
- `tests/generator/planRenderer.test.ts` — 9개 슬라이드 타입 모두 커버하는 픽스처(`fixtures/sample-plan.json`)로 11개 어서션 (validate / 슬라이드 수 / `data-template` / 커버·섹션 클래스 / `slide-inner`+`slide-footer`+`page-num` / 모든 비커버에 `data-slot=title` / 코드 블록 와이어링 / 표 컬럼 일치 / references https / 페이지 태그 시퀀스). **11/11 PASS**.
- `scripts/slideplan.ts` — CLI 도구.
  - `slideplan validate <plan.json>` — 위 validator 호출, 에러 출력 + exit code.
  - `slideplan render <plan.json> [out.html]` — `renderPlan` → standalone HTML(`brewnet-dark.css`+`code-blocks.css` 인라인, editor-iframe 오버라이드 strip). `.quality-runs/slideplan/<stem>.html`에 작성.
- `.claude/skills/md-to-slidedeck/SKILL.md` — Claude Code 스킬. 에이전트가 따라야 할 6단계 절차(계약 읽기 → MD 읽기 → SlidePlan 작성 → validate → render → 선택적 BUILTIN_DECKS 등록) + DOD + 실패 복구 정책. `AUTHORING_RULES.md`를 단일 원본으로 참조.
- `vitest.config.ts` — 노드 환경. `tests/**/*.test.ts` + `src/**/*.test.ts` 인클루드.

> **중요**: 표준 HTML 모양은 `planRenderer.ts`의 코드 상수에 박혀 있다. LLM이 어떻게 흔들려도 (1) validateSlidePlan에서 거르고 (2) 통과한 plan은 항상 같은 모양 HTML을 만든다. 이것이 "MD가 어떻게 바뀌어도 결과 PPT는 같은 구조"의 보장.

### 3.5 X/Y position drift 버그 fix

- **현상**: 코드블럭 선택 시 우측 패널 X(또는 Y) 입력만 바꿨는데 반대 축이 1–2px 따라 움직임.
- **원인**: `BlockFormatPanel.tsx:163-171` `handlePositionChange`가 `readBox()`로 DOM bounding rect를 매번 다시 읽고 `el.style.left` / `top` 두 축을 동시에 덮어썼음. `Math.round((r.left - hostRect.left) / scale)`의 라운딩 드리프트가 누적되며 변경 안 한 축의 값이 NumberField에 새로 쓰여 시각 버그가 됨.
- **fix**: `el.style.position === 'absolute'` 분기. **첫 전환**(flex→absolute)에만 양 축을 시드, **이후**엔 `override`에 들어온 축만 `el.style.left` 또는 `top`에 쓴다.
- 파일: `src/editor/BlockFormatPanel.tsx:153-183`

### 3.6 (이전 세션의 작업이지만 이 표에 누락됐던 것)

#### `ef1549d` — 사이드바 슬라이드 썸네일

- **무엇**: 사이드바의 각 슬라이드 행에 196px 폭 미니 캔버스 썸네일. 슬라이드 폭(240px)으로 확장, 행 레이아웃 [번호+제목 / 썸네일] 세로 스택.
- **왜**: 50장 이상 데크에서 텍스트 제목만으로는 탐색이 비효율. PowerPoint/Keynote 동등 UX.
- **어떻게**: `SlideThumbnail.tsx` 신규 — `slide.html`을 `dangerouslySetInnerHTML`로 1280×720 박스에 그리고 CSS `transform: scale(width/1280)` + `pointer-events: none`로 클릭 통과. `.slide-canvas-host` 래퍼로 brewnet CSS 그대로 재사용.
- **파일**: `src/editor/SlideThumbnail.tsx`(신규), `src/editor/SlideListSidebar.tsx`(수정)

### `c70ad89` — react-grab dev-only 디버깅 도구

- **무엇**: 브라우저에서 `⌘C` + 요소 클릭으로 React 컴포넌트 소스 위치를 클립보드에 복사 — AI 에이전트에 붙여넣기용.
- **왜**: UI 버그 리포트 시 정확한 컴포넌트/파일/라인 정보 전달.
- **어떻게**: `src/main.tsx`에 `if (import.meta.env.DEV) { import('react-grab'); }`. Vite의 정적 평가로 prod 번들에서 tree-shake됨 — build 사이즈 그대로(675KB).
- **파일**: `src/main.tsx`, `package.json`(devDep)

### `7653b73` — 코드 블록 + shiki 신택스 하이라이팅

- **무엇**: "Code Block" / "Terminal" 두 템플릿. Properties 패널에서 언어 선택(12종) + 원본 코드 textarea 편집. 300ms 디바운스 후 자동 재하이라이팅.
- **왜**: 책 콘텐츠 특성상 코드 샘플이 많음. Marp 같은 PPT 도구 수준의 코드 디스플레이 필요.
- **어떻게**:
  - `src/highlight/highlighter.ts` — shiki를 dynamic import로 lazy 로드. github-dark 단일 테마, 12개 언어. 빌드 시 grammar 청크로 분리되어 사용 시점에만 fetch.
  - `src/editor/CodeBlockTemplates.tsx` — 두 카드, 클릭 시 사전 하이라이팅 후 `insertBlock` → 새 `data-block-id` 부여 → `setTimeout(0)`로 다음 마이크로태스크에 selection.
  - `src/editor/CodeBlockEditPanel.tsx` — `data-code-source`(URI-encoded) + `data-code-lang` 속성으로 raw source 영구 보존. textarea 편집 시 stale-write guard로 비동기 paint 충돌 방지. 동기 `<input>` 이벤트 dispatch로 SlideRenderer commit-debounce 트리거.
  - `src/canvas/themes/code-blocks.css` — `.terminal`, `.code-block` 스타일 모두 `.slide-canvas-host` 하위에 scope.
  - `src/scene/store.ts` — `insertBlock(slideId, blockHtml)` 액션 신규 (DOMParser → `.slide-inner` append → revision bump으로 SlideRenderer remount).
  - `src/editor/PropertiesPanel.tsx` — `isCodeBlock(blockId)` 분기로 `CodeBlockEditPanel` 노출.

### `fd0672b` — 사이드바 focus ring 누수 fix

- **무엇**: 슬라이드 썸네일을 클릭한 뒤 방향키로 다른 슬라이드로 이동하면 처음 클릭한 버튼에 파란 outline이 남는 버그.
- **왜**: 클릭 시 버튼이 DOM focus를 받고, 방향키 핸들러는 store만 업데이트하고 focus를 옮기지 않아 `:focus` 잔상 발생.
- **어떻게**: `SlideListSidebar.tsx:95` onClick에서 `setCurrentIndex(idx)` 직후 `e.currentTarget.blur()`. `focus:outline-none focus-visible:ring-1`로 키보드 사용자만 ring 보임.

### `f030df0` — 슬라이드 미리보기 줌 컨트롤

- **무엇**: 캔버스 우측 하단 플로팅 컨트롤 `[− | NN % | + | Fit]`. 25–200% 범위, 10% 단위, 직접 입력 가능.
- **왜**: 1280×720 슬라이드를 작은 노트북 화면에서 더 작게 보거나(전체 흐름 파악), 디테일 작업 시 키울 수 있어야 함.
- **어떻게**: `SlideCanvas.tsx`에서 자동 fit `scale`을 `baseScale`로 분리, `zoomPercent` state 추가 → `scale = baseScale × zoomPercent/100`. 100%는 항상 "현재 패널에 fit"을 의미. `zoomDraft` 별도 상태로 백스페이스로 다 지웠을 때 0이 잔존하지 않도록(이전 padding 입력 버그 패턴 회피). `onMouseDown` stop-propagation으로 셀렉션 해제 핸들러와 분리.

### 3.7 portfolio 템플릿 (compaction 이후 2차 작업)

- **무엇**: SlidePlan 파이프라인이 `template: 'portfolio'`를 받으면 같은 마크업·같은 슬라이드 카운트로 화이트 BG + 블루 액센트 비주얼을 출력. presentation과의 차이는 단 하나 — `<div class="slide" data-template="portfolio">`.
- **왜**: 결정론 파이프라인의 핵심 원칙(JSON Plan은 그대로, 템플릿은 어트리뷰트 한 글자만 바뀜)을 깨지 않으면서 시각만 다른 데크를 뽑기 위함. portfolio.html의 per-slide-id absolute positioning은 결정론 렌더러와 호환 불가능하므로 *디자인 토큰 참고용*으로만 사용했고, 컴포넌트는 brewnet-dark 클래스 그대로 재사용.
- **핵심 파일**:
  - `src/canvas/themes/portfolio.css` — `[data-template="portfolio"]` 스코프로 brewnet-dark의 토큰(`--bg`/`--text`/`--amber`/...)을 화이트 BG·블루(#3D5AF1)로 재정의. `.code-block`/`.terminal`은 가독성 위해 다크 유지(흰 카드 위 다크 박스 — 의도된 디자인).
  - `src/generator/planRenderer.ts` — `wrapStandard`/`wrapCover`/`wrapSection` 모두 `data-template="${plan.template}"` emit. 마크업 분기 없음, 어트리뷰트 한 줄 차이.
  - `src/canvas/SlideRenderer.tsx` + `scripts/slideplan.ts` — portfolio.css를 에디터(정적 import)와 standalone HTML(인라인 CSS) 양쪽에 주입.
  - `tests/generator/planRenderer.test.ts` — 두 번째 describe 블록 추가. 동일 fixture를 in-memory로 `{ ...raw, template: 'portfolio' }`로 swap → 슬라이드/cover/section/code-block/table/anchor 카운트가 presentation 렌더와 정확히 일치 강제. **11 → 14 PASS**.

### 3.8 BUILTIN_DECKS에 SlidePlan 샘플 등록 (2차)

- **무엇**: 결정론 렌더러로 출력한 fixture HTML 2개를 `docs/html/{presentation,portfolio}/slideplan-sample.html`로 저장하고 `src/library/deckRegistry.ts`의 `BUILTIN_DECKS`에 카드로 등록.
- **왜**: `slideplan render` standalone HTML은 런타임 `upgradeSlideCodeBlocks`를 거치지 않아 shiki + macOS dots가 빠짐. 에디터 부팅 경로(`App.openDeck`)는 항상 upgrade pass를 도므로, 라이브러리 카드를 통해 진입하면 풀 비주얼이 자동 stamp됨.
- **결과**: 라이브러리 카드 4개(brewnet / design-patterns / slideplan-sample-presentation / slideplan-sample-portfolio). portfolio 카드는 화이트 BG에 코드블록은 다크로 — `[data-template="portfolio"]` CSS가 정상 매칭됨을 시각으로 확인 가능.
- **검증 방법**(`docs/guide/skills.md` §2.10에 4가지 경로 명시):
  1. `npm run dev` → 새 카드 클릭 → 9슬라이드 + shiki 토큰 + 빨/노/초 dot 3개 확인
  2. CLI standalone (`.quality-runs/slideplan/sample-plan*.html`)로 마크업 sanity-check
  3. 자연어 스킬 호출 (`docs/sample/SEO_GUIDE.md 슬라이드로 만들어줘`)
  4. `node_modules/.bin/vitest run` 17/17 PASS 확인

### 3.9 가이드 문서 (2차)

- `docs/guide/skills.md` 신규(~250줄) — 스킬 시스템 개요, `md-to-slidedeck` 사용법(호출 3가지·입력·산출물·절차·CLI·주의사항·특징·자주 발생하는 검증 실패 패턴·DOD), 새 스킬 추가하는 법, 관련 파일 표. 2차에서 §2.2.1 템플릿 선택 가이드 + §2.10 실제 테스트 방법 추가.
- `docs/guide/AUTHORING_RULES.md` — 1차에서 4중 잠금 계약 작성, 2차에서 §6.5 "템플릿별 작성 규약"(presentation 기본형, portfolio 권장/회피 패턴, report 미배포) 추가.
- `.claude/skills/md-to-slidedeck/SKILL.md` — 1차에서 작성, 2차에서 Template selection 표(presentation/portfolio/report) + 추론 규칙(코드 fence ≥ 3 → presentation; 산문 + references ≥ 3 → portfolio; report는 abort) 추가.

---

## 4. 환경 인프라 (레포 외부, 사용자 macOS)

이번 세션 후반에 **Claude Context MCP 로컬 배포**를 완료했습니다. 코드베이스 시맨틱 검색용이며, **코드가 외부로 전송되지 않습니다**.

### 구성 컴포넌트

| 컴포넌트 | 위치 | 상태 |
|---|---|---|
| Ollama | Homebrew, `brew services` autostart | `nomic-embed-text` (768d) 모델 보유 |
| Milvus standalone v2.6.14 | Docker container `milvus-standalone` | embedded etcd, `--restart on-failure`, healthy |
| Milvus 데이터/설정 | `~/milvus-local/{embedEtcd.yaml, user.yaml, volumes/milvus/}` | host-mount |
| claude-context MCP | `~/.claude.json` user scope | `claude mcp list` → ✓ Connected |

### 사용법 (다음 세션 또는 Claude Code 재시작 후)

```
이 코드베이스를 인덱싱해줘
```

Claude가 자동으로 `index_codebase` MCP 도구 호출. 진행률 확인은 `get_indexing_status`. 검색은 자연어로:

```
JWT 토큰 검증 로직이 있는 곳 보여줘
overlay drag/resize 처리하는 함수 찾아줘
```

### 관리 명령어

| 작업 | 명령 |
|---|---|
| Milvus 시작/중지 | `docker start/stop milvus-standalone` |
| Milvus 로그 | `docker logs -f milvus-standalone` |
| Ollama 시작/중지 | `brew services start/stop ollama` |
| 임베딩 모델 목록 | `ollama list` |
| MCP 등록 해제 | `claude mcp remove claude-context --scope user` |
| MCP 연결 상태 | `claude mcp list` |
| 데이터 완전 삭제 | `docker rm -f milvus-standalone && rm -rf ~/milvus-local/volumes` |

### 주의

- **Docker Desktop 의존**: macOS 로그인 시 자동 시작 권장(Settings → General). Docker가 꺼져 있으면 Milvus 컨테이너도 멈춤.
- **현재 코드베이스 규모(~5천 줄)는 임계점 미만**: claude-context의 진가는 대형 모노레포에서 발휘됨. 이 프로젝트에서는 학습/검증 목적이 큼.

---

## 5. 현재 동작하는 기능

1. **데크 라이브러리 홈 화면** — 부팅 시 `BUILTIN_DECKS` 카드 그리드. 클릭 → 에디터 진입. `← Library` 버튼으로 복귀. (이번 세션 신규)
2. **데크별 자동저장** — `claude-code-ppt:deck:v1:<deckId>` 키. 데크 사이를 오가도 각자의 편집 상태 유지. (이번 세션 신규)
3. **런타임 코드블럭 효과 stamp** — 데크 로드 시 모든 `.code-block`/`.terminal`에 shiki + macOS dots chrome + `data-code-source`를 멱등 주입. 손으로 쓴 HTML이라도 자동으로 편집 가능 상태가 됨. (이번 세션 신규)
4. 좌측 사이드바 슬라이드 리스트 클릭으로 전환 (썸네일 포함)
5. 텍스트/불릿/테이블 셀/페이지 번호/footer 인라인 편집 (IME 한국어 정상)
6. 블록 왼쪽 ⋮⋮ 그립 드래그로 순서 변경
7. 이미지 파일 드롭 → 자유 위치 이미지(오버레이)로 배치
8. 오버레이 클릭 선택 → 드래그 이동 / 모서리 리사이즈 / Esc·빈영역 클릭 해제
9. 우측 프로퍼티 패널에서 선택 오버레이/블록의 X/Y/W/H 숫자 입력 + Delete (이번 세션에서 X/Y 드리프트 fix)
10. 툴바 `+ New` / `Duplicate` / `Delete`로 슬라이드 CRUD
11. **Export HTML / Export PDF / PNG (all)** — 모두 1920×1080 결과
12. **↶ Undo / ↷ Redo** + 키보드 단축키 — `Cmd/Ctrl+Z` undo · `Cmd/Ctrl+Shift+Z` 또는 `Cmd/Ctrl+Y` redo
13. **텍스트 선택 시 B/I/U + 4색 highlight + Clear**
14. **사이드바 ⋮⋮ 드래그**로 슬라이드 순서 변경 (활성 슬라이드 자동 추적)
15. **코드 블록 / 터미널 템플릿** 삽입 + shiki 신택스 하이라이팅 + Properties 패널에서 언어 전환/코드 편집
16. **캔버스 줌 컨트롤** (25–200%, Fit 버튼)
17. **CLI: `slideplan validate / render`** — JSON 플랜을 검증 + standalone HTML 데크 출력. (이번 세션 신규)
18. **Claude Code 스킬 `md-to-slidedeck`** — 어떤 MD든 받아 SlidePlan JSON을 작성하고 결정론 렌더러로 데크 HTML 생성. (이번 세션 신규)
19. **portfolio 템플릿** — 동일 SlidePlan을 `template: 'portfolio'`로 swap하면 동일 마크업·동일 슬라이드 카운트로 화이트 BG + 블루 액센트 출력. CSS 토큰만 재정의(`[data-template="portfolio"]`). (2차 신규)
20. **BUILTIN_DECKS에 SlidePlan 샘플 2장** — 라이브러리에 presentation/portfolio 카드 직접 클릭으로 검증 가능. 에디터 부팅 경로로 진입하면 shiki + macOS dots 풀 비주얼 자동 stamp. (2차 신규)

---

## 6. 알려진 이슈 / 트레이드오프

| 이슈 | 영향 | 회피 |
|---|---|---|
| 줌 컨트롤 세션 휘발성 | 새로고침 시 100%로 복귀 | localStorage 저장 추가 시 `usePersistenceStore` 또는 별도 key |
| 줌 200% 시 일부 잘림 | wrapper `overflow-hidden`으로 가려짐 | `overflow: auto`로 바꿀지 결정 필요 (스크롤바 노출) |
| 샘플 CSS scope 격리(Phase 1c) 미완 | brewnet-dark + portfolio가 `[data-template]` 어트리뷰트로 스코프 분리됨(2차에 도입). report 추가 시 동일 패턴이면 무문제. manual/legacy 섞을 때만 위험 | PostCSS prefix 플러그인은 후순위 |
| 번들 크기 ~675KB | `brewnet-presentation.html`(138KB) `?raw` + html-to-image + Moveable + shiki grammar 청크 합산 | 동적 import / manualChunks 분리 고려 |
| `keyCode` deprecation 경고 | `useSlideEditing.ts` Enter 가드에서 IME 감지용 의도적 사용 | 빌드 차단 아님 |
| `document.execCommand` deprecation 경고 | `TextFormatPanel.tsx`에서 사용 | 모던 Range API 마이그레이션은 후순위 |
| localStorage 5MB 한도 | 큰 이미지 여러 장 드롭 시 QuotaExceededError; SaveIndicator "Save failed" 노출 | IndexedDB 마이그레이션 (향후 옵션) |
| Milvus는 Docker Desktop 필수 | Docker 꺼지면 멈춤 | Docker Desktop autostart |
| `docs/DEPLOY_VERCEL.md` 삭제 + `docs/guide/DEPLOY_VERCEL.md` 추가 미커밋 | 한 번에 묶어 commit 필요 | `git add docs/ && git commit -m "docs: relocate guides to docs/guide/"` |
| `docs/images/책-투명.png` 삭제됨 | 의도적인지 확인 필요 | `git status`로 확인 |
| `slideplan render` 산출 HTML은 shiki + macOS dots가 빠짐 | standalone 모드는 런타임 upgrade pass를 안 거침 | ✓ 해결: 결과 HTML을 `BUILTIN_DECKS`에 등록 → 에디터 부팅 경로로 자동 stamp. `slideplan-sample-{presentation,portfolio}` 카드 등록됨(2차) |
| `.tmp/` / `.quality-runs/` gitignore 등록 | 커밋이 깨끗하려면 필수 | 이미 `.gitignore`에 반영됨(미커밋) — 분할 커밋 #7에 포함 |
| 런타임 upgrade pass의 1회 비용 | 슬라이드 다수·코드블록 다수일 때 첫 로드가 수백ms 소요 (shiki grammar lazy load) | 멱등 — `data-code-source` 마커가 있으면 skip |

---

## 7. 남은 작업 (우선순위 순)

### 우선순위 1: 새 BUILTIN_DECKS 카드 2개 브라우저 동작 검증 🔴 (내일 첫 행동)

- 어제 끝나기 직전에 `slideplan-sample-presentation` / `slideplan-sample-portfolio` 카드 등록 + portfolio.css까지 다 들어갔지만 **브라우저로 직접 확인 미완**.
- 실행 절차:
  ```bash
  npm run dev   # http://127.0.0.1:5173
  ```
  1. 라이브러리에 카드 4개 보임(brewnet / design-patterns / slideplan presentation / slideplan portfolio)
  2. **slideplan-sample-presentation 카드 클릭** → 9슬라이드 → 코드블록에 shiki 토큰 색상 + 빨/노/초 dots ✓
  3. ← Library → **slideplan-sample-portfolio 카드 클릭** → 동일 9슬라이드인데 화이트 BG + 블루 액센트 + 코드블록은 다크(의도) ✓
  4. 인라인 텍스트 편집·오버레이 드래그·블록 reorder 정상 ✓
- 만약 portfolio 카드의 CSS가 안 먹는다면 `[data-template="portfolio"]` 어트리뷰트가 슬라이드 div에 실제로 박혀있는지 DevTools로 확인. `parsePresentation`은 `<div class="slide">`의 `outerHTML`만 추출하므로 어트리뷰트는 보존됨.

### 우선순위 2: report 템플릿 동일 패턴으로 추가

portfolio에서 검증된 패턴을 그대로 follow.

1. `docs/html/report/*` 분석 → 디자인 토큰(색·폰트·spacing) 추출
2. `src/canvas/themes/report.css` 신규 — `[data-template="report"]` 스코프
3. `SlideRenderer.tsx` + `scripts/slideplan.ts`에 import/inline 추가
4. `tests/generator/planRenderer.test.ts`에 세 번째 describe 블록 (in-memory swap, 14→17 PASS 예상)
5. `.claude/skills/md-to-slidedeck/SKILL.md`의 추론 규칙에서 "report는 abort" 제거 + 표 ≥ 2 / KPI 헤딩 시 report 추론
6. `docs/guide/AUTHORING_RULES.md` §6.5에 report 항목 추가

`renderer`는 이미 template-aware라 코드 변경 없음 — CSS + 회귀 + 문서만.

### 우선순위 3: 분할 커밋 — 미커밋 대량 정리

`git status` 기준 M 12 + ?? 12. 논리 단위로 7개 커밋 권장 (§1 분할 커밋 후보 표 참조). 추천 순서:

1. 인프라/샘플 — `docs/sample/`, `.tmp/`, `vitest.config.ts`, `.gitignore`
2. SlidePlan 파이프라인 본체 — `src/generator/`, `src/importer/upgradeCodeBlocks.ts`, `tests/generator/`
3. CLI — `scripts/slideplan.ts`(+ portfolio.css 인라인)
4. 라이브러리 UI — `src/library/`, `src/editor/DeckLibraryView.tsx`, `src/App.tsx`, `Toolbar.tsx`
5. **portfolio 템플릿** — `src/canvas/themes/portfolio.css`, `SlideRenderer.tsx`, `deckRegistry.ts` +2 entry, `docs/html/{presentation,portfolio}/slideplan-sample.html`
6. 문서 + 스킬 — `.claude/skills/`, `docs/guide/{AUTHORING_RULES,skills}.md`, `docs/handoff.md`
7. 기타 fix — `highlighter.ts`, `localStore.ts`/`useAutoSave.ts`, `BlockFormatPanel.tsx`(X/Y drift), `PropertiesPanel.tsx`(컬랩스)

push 전에 `npm run typecheck` + `node_modules/.bin/vitest run` 한 번 더.

### 우선순위 4: 테스트 갭 메우기

지금까지는 렌더러 회귀(14/14)와 레거시 어댑터 e2e(3/3)만 있음. 추가 권장:

- **portfolio 전용 *MD* 픽스처** — 현재는 fixture를 in-memory로 swap만 함. 진짜 portfolio용 산문 MD 1개를 `tests/generator/fixtures/`에 두고 e2e 회귀 추가
- **`validateSlidePlan` 직접 단위 테스트** — cover 강제, num padding, https href, comparison-table 행/열 일치 등을 깨뜨리는 negative case들
- **standalone HTML CSS 인라인 회귀** — `slideplan render` 결과에 portfolio.css 토큰이 실제로 박혀있는지 grep 회귀

### 우선순위 5: in-app LLM 호출 경로

- `src/generator/llm/authorPlan.ts` 신규 — Anthropic SDK로 LLM에 `AUTHORING_RULES.md` 시스템 프롬프트 + 사용자 MD 전달 → JSON 응답 → `validateSlidePlan` → 실패 시 errors[] 붙여 ≤ 3회 재호출.
- `pipeline.ts`의 `generateOnce`를 새 경로로 교체 → 브라우저 라이브러리 화면의 드래그-드롭 UI에서 동일 파이프라인 동작.
- 비용: 8–14 슬라이드 데크 1개당 ~$0.02–0.05(Sonnet 4.6 기준).

### 우선순위 6: 슬라이드 배경 컨트롤

- 슬라이드별 배경색 / 배경 이미지 설정.
- 모델: `ParsedSlide`에 `background?: { kind: 'color'; value: string } | { kind: 'image'; url: string; fit: 'cover' | 'contain' }`.
- 렌더: `.slide` 요소에 inline style 또는 `data-bg-*` 속성 → CSS. export 회귀 검증 필요.

### 우선순위 7: Phase 1c — CSS scope 격리

- portfolio가 들어왔어도 현재는 `[data-template]` 어트리뷰트 스코프로 충돌이 없음. report 도입 시 동일 토큰 이름이 충돌할 가능성에 대비해 PostCSS 플러그인으로 `.slide-canvas-host > ...` 자동 prefix는 여전히 후보.

### 우선순위 8: Phase 2 추가 UX

- 텍스트 회전 / 폰트 확장 / 폰트 사이즈·정렬 / 그라디언트·보더·그림자 — 우선순위 1–5가 끝난 후.

### 정리(retire) 후보

- **TaskList #9** "Run /loop quality cycle until PASSED" — 레거시 어댑터(`src/generator/retry.ts`) 경로. SlidePlan 결정론 파이프라인으로 사실상 대체됨. e2e.test.ts 3/3 PASS 상태 유지 시 작업 close 가능.

---

## 8. 빠른 시작 (다음 세션)

```bash
cd /Users/codevillain/Claude-Code-Expert/claude-code-ppt

# 개발 서버 (http://127.0.0.1:5173)
npm run dev

# 검증
npm run typecheck
npm run build

# E2E
npx playwright test
```

### 권장 첫 행동 (내일 — 2026-04-27)

1. **브라우저 검증부터** — `npm run dev` → 라이브러리에 카드 4개 → `slideplan-sample-presentation`/`slideplan-sample-portfolio` 두 카드 모두 클릭해서 §7 우선순위 1의 체크리스트 통과 확인. 실패 시 그 자리에서 fix.
2. 통과하면 §7 우선순위 2 — **report 템플릿** (portfolio와 동일 패턴)으로 진행. 또는 우선순위 3(분할 커밋)을 먼저 정리해서 working state를 깨끗이.
3. `git status` 확인 — M 12 + ?? 12 상태. §7 우선순위 3의 7-단계 분할 커밋 순서 따라가면 깨끗.
4. claude-context MCP가 활성화되어 있다면 — 큰 변경 전에 "이 코드베이스를 인덱싱해줘"로 시맨틱 검색 베이스라인 확보
4. claude-context MCP가 활성화되어 있다면 — 큰 변경 전에 "이 코드베이스를 인덱싱해줘"로 시맨틱 검색 베이스라인 확보

---

## 9. 핵심 아키텍처 메모 (잊기 쉬운 것들)

### 데이터 흐름

```
slide.html (string)               <-- 정규 데이터, store에 저장
   ↓ dangerouslySetInnerHTML
SlideRenderer DOM                  <-- 라이브 편집 surface (contenteditable)
   ↓ MutationObserver / input event
commitFromDom (300ms debounce)
   ↓
slide.html 갱신                    <-- 다시 정규 상태로
```

핵심: **DOM이 잠시 동안 진실의 원천**. store는 300ms 디바운스 후에야 따라잡음. 그래서:
- `flushPendingCommit()` — undo/redo/export/present 전에 in-flight commit drain
- revision bump — 외부 mutation 시 SlideRenderer 강제 remount (typing은 bump 안 함)

### 두 가지 편집 모델

| 레이어 | 좌표 | 라이브러리 | store 위치 |
|---|---|---|---|
| In-flow blocks | flex flow (`.slide-inner` 직속) | SortableJS + contenteditable | `slide.html` 내부 |
| Overlays | absolute (1280×720 좌표) | Moveable | `overlaysBySlide[slideId]` |

선택 상태도 분리: `selectedBlockId` ↔ `selectedOverlayId` (둘 중 하나만 활성).

### Coordinate System

- 저작: 1280×720
- 디스플레이: scale-to-fit + 줌 컨트롤
- export: 1.5배 → 1920×1080 (1080p 비디오 타겟)
- **Overlay x/y/w/h는 항상 1280×720 원본 기준** — post-scale 픽셀 저장 금지

### Deck-id-scoped 영속화

- 키 포맷: `claude-code-ppt:deck:v1:<deckId>` — 데크 하나당 하나의 슬롯
- `claude-code-ppt:deck:v1:last` — 마지막으로 연 데크 ID
- 레거시 단일 키(`claude-code-ppt:deck:v1`)는 부팅 시 1회 `brewnet-presentation` 데크 슬롯으로 마이그레이션
- `useAutoSave(deckId, enabled)`는 `deckId === null`이면 short-circuit — Library 화면에서는 저장 안 함

### MD → PPT 4중 포맷 잠금

LLM이 어떻게 흔들려도 같은 모양 HTML이 나오게 하는 4개의 검문소.

| 레이어 | 위치 | 잠그는 것 |
|---|---|---|
| 1. JSON 스키마 | `validateSlidePlan()` in `src/generator/slidePlan.ts` | 타입 일치 / 필수 필드 / enum 멤버 |
| 2. 의미 게이트 | 같은 함수 후반부 | `slides[0]==='cover'`, `section.num` 유일, `references.href` https, `comparison-table` 컬럼 수 일치, `two-col-code` 한쪽에 코드 ≥ 1 |
| 3. 결정론 렌더러 | `renderPlan()` in `src/generator/planRenderer.ts` | `wrapStandard`/`wrapCover`/`wrapSection` chrome, `data-template`/`data-slot` 상수, page tag 시퀀스 |
| 4. 에디터 게이트 | `runGates` 흐름 (런타임 import + upgrade) | `parsePresentationHTML`이 받아주는지 + `upgradeSlideCodeBlocks`가 stamp 가능한지 |

원칙: **LLM은 HTML을 안 쓴다. JSON Plan만 쓴다. 렌더러가 HTML을 쓴다.**

### 템플릿 분기는 어트리뷰트 한 줄

`plan.template`은 마크업을 분기시키지 않는다. 오직 wrapper 3개(`wrapStandard`/`wrapCover`/`wrapSection`)가 `<div class="slide ..." data-template="${plan.template}">`로 emit하고, CSS가 `[data-template="portfolio"] { --bg: #fff; --amber: #3D5AF1; ... }` 식으로 토큰을 재정의한다.

- 마크업 동일 → 회귀 테스트가 슬라이드/cover/section/code-block 카운트 동일성 강제 (`tests/generator/planRenderer.test.ts`의 두 번째 describe)
- presentation 컴포넌트 클래스(`.t-hero` `.callout-blue` `.code-block` `.section-num` 등)는 portfolio에서도 그대로 사용. brewnet-dark가 기본 색을 박고, portfolio.css가 `[data-template="portfolio"]` 스코프로 덮어씀
- `data-template` 어트리뷰트가 빠지면 portfolio.css의 셀렉터가 매칭되지 않아 *완전 무스타일* 됨 — `validateSlidePlan`의 `TEMPLATES` Set이 enum 검사로 방어
- report 추가도 동일: `report.css` 신규 + 추론 규칙 갱신만 — 렌더러 변경 없음

### 런타임 코드블럭 upgrade pass

- 진입점: `App.openDeck` → `upgradeSlideCodeBlocks(slideHtml)` 1회
- 동작: DOMParser → `.code-block` / `.terminal` 노드 순회
  - `data-code-source` 있으면 skip (이미 와이어됨)
  - `<pre>`에 manual `<span class="green">` 있으면 skip (brewnet 수동 패턴 보존)
  - 그 외: `<pre><code>` 텍스트 추출 → shiki 하이라이팅 → `data-code-source`(URI-encoded) + `data-code-lang` + `data-block-id` + `data-slot=code` stamping + `<div class="code-dots">` / `terminal-header` prepend
- 멱등성: 두 번째 호출은 모든 노드를 skip — 안전하게 여러 번 불려도 됨

---

## 부록: 스크린 위치 빠른 참조

| 영역 | 파일 |
|---|---|
| 헤더 툴바 | `src/editor/Toolbar.tsx` |
| 좌측 슬라이드 리스트 | `src/editor/SlideListSidebar.tsx` |
| 좌측 썸네일 | `src/editor/SlideThumbnail.tsx` |
| 중앙 캔버스 + 줌 컨트롤 | `src/canvas/SlideCanvas.tsx` |
| 캔버스 슬라이드 렌더 | `src/canvas/SlideRenderer.tsx` |
| 캔버스 contenteditable + Sortable | `src/canvas/useSlideEditing.ts` |
| 캔버스 오버레이 (Moveable) | `src/canvas/OverlayLayer.tsx` |
| 우측 Properties — 라우팅 | `src/editor/PropertiesPanel.tsx` |
| 우측 — 텍스트 포맷(색/폰트/하이라이트) | `src/editor/TextFormatPanel.tsx` |
| 우측 — 블록 포맷(사이즈/정렬/배경/패딩) | `src/editor/BlockFormatPanel.tsx` |
| 우측 — 텍스트 오버레이 | `src/editor/TextOverlayPropertiesSection.tsx` |
| 우측 — 코드 블록 편집 | `src/editor/CodeBlockEditPanel.tsx` |
| 우측 — 템플릿 (텍스트/코드) | `src/editor/{TextBlockTemplates,CodeBlockTemplates}.tsx` |
| 신택스 하이라이팅 | `src/highlight/highlighter.ts` |
| Zustand store | `src/scene/store.ts` |
| Pending commit flush 등록부 | `src/scene/pendingCommit.ts` |
| HTML 임포터 | `src/importer/parsePresentation.ts` |
| HTML/PDF/PNG 익스포터 | `src/exporter/{htmlBundle,pngExport}.ts` |
| 자동저장/복원 | `src/persistence/{persistenceStore,useAutoSave,localStore}.ts` |
| brewnet 샘플 CSS | `src/canvas/themes/brewnet-dark.css` |
| 코드 블록 CSS | `src/canvas/themes/code-blocks.css` |
| **portfolio 템플릿 CSS** | `src/canvas/themes/portfolio.css` |
| 샘플 HTML | `docs/html/presentation/brewnet-presentation.html` |
| **SlidePlan 샘플 (presentation)** | `docs/html/presentation/slideplan-sample.html` |
| **SlidePlan 샘플 (portfolio)** | `docs/html/portfolio/slideplan-sample.html` |
| **데크 라이브러리 등록부** | `src/library/deckRegistry.ts` |
| **데크 라이브러리 홈 화면** | `src/editor/DeckLibraryView.tsx` |
| **런타임 코드블럭 upgrade** | `src/importer/upgradeCodeBlocks.ts` |
| **GoF 디자인 패턴 데크** | `docs/html/presentation/design-patterns.html` |
| **MD→PPT 계약 문서** | `docs/guide/AUTHORING_RULES.md` |
| **SlidePlan 타입 + validator** | `src/generator/slidePlan.ts` |
| **결정론 렌더러** | `src/generator/planRenderer.ts` |
| **MD→PPT 보조 모듈** | `src/generator/{parseMarkdown,blockify,detectTerminal,sanitizeRawHtml,retry,pipeline}.ts` |
| **품질 채점** | `src/generator/quality/{rubric,detector,scorer,gates}.ts` |
| **MD→PPT 어댑터(legacy)** | `src/generator/adapters/{presentationAdapter,shared}.ts` |
| **CLI: validate / render** | `scripts/slideplan.ts` |
| **CLI: 픽스처 렌더(보존)** | `scripts/render-plan-fixture.ts` |
| **품질 회귀 루프** | `scripts/run-quality-loop.ts` |
| **Claude Code 스킬** | `.claude/skills/md-to-slidedeck/SKILL.md` |
| **렌더러 회귀 테스트** | `tests/generator/planRenderer.test.ts` |
| **9-타입 픽스처** | `tests/generator/fixtures/sample-plan.json` |
| **변환 회귀 원본 MD** | `docs/sample/{SEO_GUIDE,디자인패턴,npm 배포 셋업 가이드}.md` |
| **vitest 설정** | `vitest.config.ts` |
| **스킬 사용법 문서** | `docs/guide/skills.md` |
