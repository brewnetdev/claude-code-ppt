# 코드베이스 개선 계획 — Claude Code PPT 슬라이드 에디터

> 작성: lead architect (Fable 5) · 멀티에이전트 분석 종합 · 본 문서는 **분석/설계 전용**이며 소스를 수정하지 않는다.
> 모든 finding은 실제 `file:line` 증거로 검증되었고, 고심각도 항목은 별도 적대적 검증(adversarial verification)을 통과했다.

---

## 1. 개요 (Overview)

### 1.1 스코프

브라우저 기반 슬라이드 덱 에디터(영상 강의 자료 제작용)의 전 서브시스템을 대상으로 한 구조 리뷰와, 6개 수용 조건(C1~C6)을 충족하기 위한 단계별 개선 계획.

스택: `Vite + React 18 + TypeScript + Zustand + Moveable.js + SortableJS + shiki + html-to-image + window.print`. 덱은 1280×720 정적 `.slide` div(+ `data-slot` + 테마 CSS)이며, 에디터가 이를 scene 모델(Zustand store)로 파싱해 렌더한다. DOM은 모델의 투영(projection)이다. 편집 표면은 두 개 — 콘텐츠 블록(`.slide-inner` 내 flex flow, `contenteditable` + SortableJS)과 오버레이 아이템(Moveable 자유 배치). `src/generator` SlidePlan 파이프라인은 MD → 에디터 호환 덱 HTML을 3개 템플릿(presentation/portfolio/report)으로 결정론적으로 렌더한다.

### 1.2 방법 (Method — Fable 5 multi-agent)

8개 서브시스템 에이전트가 병렬로 리뷰했다: ① Importer & Parsing, ② Scene Store & Persistence, ③ Canvas & Editing, ④ Editor UI & Properties Panels, ⑤ Exporter(HTML/PNG/PDF), ⑥ SlidePlan Generator, ⑦ Themes & Anti-AI-Slop, ⑧ Test Suite & Quality Gates. 각 에이전트는 `.codesight/`(graph/components/coverage)로 의존 맵을 먼저 잡고, 대상 파일 전문 + 협력자 발췌를 직접 읽어 모든 주장에 `file:line`을 대조했다. 별도 anti-ai-slop 리서치 에이전트가 프로덕션 웹 템플릿 구조(GitHub Primer / Vercel Geist / FT Origami / Economist / Tufte / Swiss-grid / Carbon)를 조사해 3-템플릿 표준안을 도출했다.

### 1.3 6개 수용 조건 (The 6 Conditions)

| | 조건 | 핵심 요구 |
|---|---|---|
| **C1** | 웹 PPT 에디터 동작 | 덱 오픈 후 우측 properties 패널로 HTML 자유 편집 + 선택 요소 자유 이동(위치) |
| **C2** | Export = 라이브 덱 100% 동일 | 색·레이아웃·텍스트·이미지 구조가 완전히 일치 |
| **C3** | Anti-AI-Slop 적용(이미지·디자인·색·카피·HTML) | 현 단일 표준을 프로덕션 웹 템플릿 리서치 기반 **3개 템플릿 표준**으로 확장 |
| **C4** | 잠재 버그 유발 코드 수정 | 검증된 데이터 손실·정합성·크래시 결함 제거 |
| **C5** | 미완성·부실 기능 완성, 데드코드 제거, 전반 리팩터 | |
| **C6** | 전 기능 테스트 통과 + 엣지케이스 커버 | green만으로 불충분 |

### 1.4 검증 방식 (How findings were verified)

본 종합 단계에서 lead architect가 다음을 **직접 재확인**했다:

- `src/scene/applySlideBackground.ts:51-61` — `applyBackgroundToHtml`은 인라인 style만 굽고 `data-slide-bg`를 쓰지 않으며 `!bg`면 html을 그대로 반환(라운드트립 비대칭의 근원).
- `src/importer/parsePresentation.ts:83-87` — `data-slide-bg`는 색상 정규식 `/^(#[0-9a-fA-F]{3,8}|rgb|hsl)/`로만 파싱, `{kind:'color'}`만 생성(이미지 배경·named color 라운드트립 불가).
- `src/canvas/SlideRenderer.tsx:33-69` — `commitFromDom`이 `.block-drag-handle`·contenteditable·sortable·transform·background는 스트립하나 **`.col-resize-handle`은 미스트립**.
- `src/exporter/htmlBundle.ts:18` — 4개 테마 CSS를 `?raw`로 join(`stripEditorOverrides` 미적용 → 에디터 전용 `body{overflow:hidden!important}` 누출); `:99` wrapStyle은 left/top/w/h/bg만(padding 누락); `:94` 이미지 오버레이 `object-fit` 없음.
- `src/generator/inlineThemeCss.ts:29-33` — `css.slice(0, marker)`로 마커 이후 EOF까지 전부 삭제(curriculum CSS 95줄 소실).
- `src/generator/slidePlan.ts:286` — `const allBlocks = [...(raw.left as Block[]), ...]`가 `Array.isArray` 가드 이후 무조건 실행 → 크래시.
- `node .claude/skills/clean-html/scripts/check-slop.mjs` 실행 → 4개 테마 파일에서 **9 ERROR**(brewnet-dark gradient L98/L627·glow L727·big-shadow L38, portfolio gradient L37·shadow L32, report gradient L39·shadow L34, code-blocks shadow L24) 확인.

적대적 검증을 거친 고심각도 25건은 전부 `verdict.real=true`였다(드롭 0건). 단, 2건은 심각도 하향: `htmlbundle-background-baking-untested`(critical→medium, `applySlideBackground.test.ts`가 헬퍼를 독립 커버), `escape-inline-html-attribute-injection`(high→medium, 단일 사용자 로컬 툴이라 XSS보다 anti-slop 우회가 주 피해).

---

## 2. 현재 상태 평가 (Current State Assessment)

### 2.1 서브시스템 건강도

| 서브시스템 | 건강도 | 핵심 소견 |
|---|---|---|
| Importer & Parsing | 보통 | 코드는 견고하나 `src/importer/*` 테스트 0건. 신규 `data-slide-bg`는 읽기만 일관, 쓰기(라운드트립)가 비대칭. |
| Scene Store & Persistence | 주의 | `store.ts`(714줄) 잘 주석화되었으나 단위 테스트 사실상 0. IDB put이 tx 커밋 전 resolve, autosave 덱 전환 경합, unload flush 부재 등 검증된 race. |
| Canvas & Editing | 주의 | 편집 코어는 우수하나 2개 high 버그(col-resize 핸들 누출, 덱 전환 pending-commit 오염) + overlay undo flush 미배선. floatBlock·rotate 미완성. |
| Editor UI & Panels | 주의 | C2 export 충실도 구멍 4종 + Cmd+Z/Esc 입력 가로채기로 패널 초안 파괴. 회전·z-order·링크 편집 미구현(실패하는 e2e 존재). |
| Exporter | 주의 | 배경 라운드트립 손실, 에디터 body 오버라이드 누출(스크롤 사망), padding/object-fit/폰트 누락. pngExport 테스트 0건. |
| SlidePlan Generator | 주의 | 검증된 크래시·인젝션·콘텐츠 재정렬 버그. V2 게이트 파이프라인 전체가 도달 불가 데드코드. 스코어러가 카운트만 검사(콘텐츠 스왑 10/10 통과). MD 경로 테스트 0건. |
| Themes & Anti-AI-Slop | **불량** | 3개 테마가 자체 게이트 9 ERROR 위반. 마스터 SKILL.md 포크 분기, side-rail 규칙 소실, 게이트가 var()·named·8자리hex 색을 못 봄. Phase 1c(스코프) 미완. |
| Test Suite | **불량** | `.codesight/coverage.md` 0% routes/models. main에서 1건 RED, 유일한 export e2e가 제거된 버튼 클릭으로 영구 실패. e2e에 `waitForTimeout` 30+개 / CI retries 0. |

### 2.2 조건 커버리지 매트릭스

| 조건 | 현재 상태 | 목표 | 갭 |
|---|---|---|---|
| **C1** 에디터 동작 | 콘텐츠 편집·오버레이 드래그/리사이즈는 동작. 그러나 **회전 미구현**(문서화된 계약 위반), **z-order 없음**, **링크 href 편집 없음**(존재하지 않는 'Links' e2e가 실패), **블록 자유 배치(floatBlock) 데드코드**, 재import 텍스트 오버레이 promotion 불가, Enter 중간분할 안 됨. | 우측 패널로 HTML 자유 편집 + 모든 선택 요소 자유 이동(위치/회전/z) | 회전·z·링크·float 배선, 텍스트 오버레이 promotion, SortableJS 재정렬 테스트. |
| **C2** Export 동일 | 신규 `data-slide-bg` 배경이 editor/htmlBundle/pngExport 3면은 일관. **그러나** 발표모드·썸네일 미적용, export→재import 라운드트립 손실, text-overlay padding·object-fit·picked 폰트 누락, 에디터 body 오버라이드가 export 스크롤 죽임, CLI 발행 덱은 code chrome/shiki 없음. | 색·레이아웃·텍스트·이미지 구조 100% 일치 | 배경 양방향 직렬화, 5개 오버레이 렌더 경로 통합, 폰트 번들, body 오버라이드 스트립, 발행 덱 upgrade. |
| **C3** Anti-Slop | 단일 amber 중심 표준 1개. 3개 테마는 그 표준을 위반(9 ERROR). 게이트 자체가 포크·소실·색맹 상태. | 프로덕션 리서치 기반 **3개 템플릿 표준** + 템플릿-aware 게이트 | 3 표준 저작(§4), 테마 de-slop, check-slop 템플릿 인식화, 마스터 SKILL 단일화. |
| **C4** 버그 수정 | 다수의 검증된 데이터 손실/크래시 결함 잔존. | 전부 수정 + 회귀 테스트 | M1~M4에서 처리. |
| **C5** 완성·데드코드·리팩터 | V2 게이트·floatBlock·exportAllSlidesPng·openPrintablePreview·ResourceOrigin'builtin'·OverlayImage alias 등 데드/미완. NumberField 3중복, PRESET_CLASS 4~5중복, blobUrlToDataUrl 2중복, Template 타입 3중복. | 완성 또는 제거 + 중복 통합 | M8(완성)·M10(제거/통합). |
| **C6** 테스트 | 17개 테스트 파일 존재하나 핵심 서브시스템(store·persistence·migrations·gate·MD 경로·importer·pngExport·watermark) 0 커버. main RED 1건. | 전 기능 통과 + 엣지케이스 | M0(안전망)·M11(완성 스윕). |

---

## 3. 검증된 핵심 발견 (Confirmed Findings)

여러 에이전트가 동일 버그를 독립 발견한 경우 단일 canonical id로 통합하고 교차 확증(corroboration) 수를 표기한다. **드롭/반박된 finding은 없다**(적대적 검증 25/25 real=true). 의도적으로 제외된 후보는 §3.3.

### 3.1 High-severity (우선)

| id | 제목 | cat | cond | 핵심 파일 | 수정 요지 | 규모 |
|---|---|---|---|---|---|---|
| `bg-roundtrip-loss` (×5) | export가 `data-slide-bg`를 안 써 재import 시 배경 소실/부활/역전, 이미지·named color 라운드트립 불가 | fidelity | C2 | `applySlideBackground.ts:51-61`, `parsePresentation.ts:83-87`, `htmlBundle.ts:124`, `SlideRenderer.tsx:67,111-115`, `store.ts:323-343` | `applyBackgroundToHtml`이 color→`data-slide-bg`, image→`data-slide-bg-image`+`-fit` 스탬프(null이면 제거), parser가 양 형식 복원, `commitFromDom`이 attr 동기화 | M |
| `col-resize-handle-baked` (×2) | 테이블 col-resize 핸들이 commit HTML에 구워져 IDB·export로 누출, 리마운트마다 누적 | bug | C2 | `useSlideEditing.ts:287-302`, `SlideRenderer.tsx:37-61`, `store.ts:549` | commitFromDom·copyBlock 클론 정리에 `.col-resize-handle` 제거 + 공용 `stripEditorChrome` 헬퍼, slideMigration 1건으로 기존 캐시 세척 | S |
| `present-thumbnail-ignore-bg` (×3) | 발표모드·썸네일이 `slide.background` 미적용 → 테마 기본 배경 | fidelity | C2 | `PresentationView.tsx:132-136`, `SlideThumbnail.tsx:29-45` | 주입 전 `applyBackgroundToHtml(slide.html, slide.background)` 통과(각 1줄) | S |
| `text-overlay-undo-flush` (×2) | TextOverlayBox 디바운스가 pendingCommit 미등록 → undo 직후 pre-undo 상태 재push, redo 파괴 | bug | C4 | `OverlayLayer.tsx:169,282-293`, `pendingCommit.ts:8-19`, `Toolbar.tsx:90-105` | `registerPendingFlush`를 `Set`으로, TextOverlayBox가 자신의 flush 등록 → undo 전 드레인 | M |
| `deck-switch-pending-commit` | loadDeck/loadDeckFull이 flush 안 함 → 타이핑 후 300ms 내 덱 전환 시 덱 A DOM이 덱 B에 커밋(크로스 덱 오염) | bug | C4 | `SlideRenderer.tsx:125-132`, `store.ts:247-274`, `App.tsx:68-115` | loadDeck/loadDeckFull 첫 줄에서 `flushPendingCommit()` + mount 시 deck-gen 토큰으로 unmount commit 가드 | S |
| `toolbar-undo-hijack` (×2) | 전역 Cmd+Z/Y가 INPUT/TEXTAREA의 네이티브 undo 가로채 패널 코드 초안 파괴 | bug | C4 | `Toolbar.tsx:106-133`, `SlideCanvas.tsx:54-66`, `store.ts:691-694` | `isEditableTarget`(INPUT/TEXTAREA/SELECT) 가드 추가(공용 util 추출), contenteditable은 의도적 유지 | S |
| `text-overlay-padding-dropped` (×3) | TextOverlay.padding이 html/png export·발표모드에서 누락 → 텍스트 위치/래핑 어긋남 | fidelity | C2 | `htmlBundle.ts:96-101`, `pngExport.ts:152-174`, `PresentationView.tsx:203-228`, `OverlayLayer.tsx:306-311` | 공용 `overlayWrapperStyle`/`overlayInnerStyle` 헬퍼로 5면 통합(padding+box-sizing 포함) | S |
| `slide-bg-dropped-on-copy` (×3) | duplicateSlide·insertSlideAfter·클립보드·Import가 `background`(+overlays) 전파 안 함 | bug | C4 | `store.ts:345-390,657-678`, `ImportFromDeckModal.tsx:69-75` | duplicate `...src` 스프레드, insertSlideAfter/ClipboardEntry에 `background?`·`overlays?` 추가 | S |
| `export-misses-google-fonts` | 폰트 피커로 적용한 Google Fonts가 standalone HTML에 미번들 → 폴백 렌더 | fidelity | C2 | `fontList.ts:37-72`, `htmlBundle.ts:157-158`, `BlockFormatPanel.tsx:246-258` | buildHtmlBundle이 slide+overlay html을 스캔해 사용 패밀리만 `css2` link 주입(fontList를 단일 매니페스트로) | M |
| `bundle-body-override` (×2) | 에디터 전용 `body{overflow:hidden!important}`+`var(--v-bg)`가 export에 누출 → 휠/스크롤바 스크롤 사망 | bug | C4 | `htmlBundle.ts:18,162-168`, `brewnet-dark.css:668-680` | `stripEditorOverrides`를 브라우저-safe 순수문자열 모듈로 추출해 htmlBundle에 적용, 또는 `/* editor-only:start|end */` 펜스 | S |
| `strip-editor-overrides-truncates` (×2) | `css.slice(0, marker)`가 마커→EOF 삭제 → curriculum CSS 95줄을 CLI 발행 덱에서 소실, 마커 공백 변경 시 silent no-op | bug | C4 | `inlineThemeCss.ts:29-33`, `brewnet-dark.css:668-779` | 펜스 코멘트로 블록 범위만 절단(start만 있고 end 없으면 throw), curriculum 블록을 펜스 앞/별도 파일로 | S |
| `two-col-code-validator-crash` | `validateSlidePlan`이 left/right 누락 시 에러 리스트 대신 TypeError 던짐(braceless case const) | bug | C4 | `slidePlan.ts:277-289` | `if (Array.isArray(left)&&Array.isArray(right)) {…}`로 가드 + case 중괄호 | S |
| `escape-inline-html-injection` | escapeInlineHtml 허용목록이 태그명만 검사 → onclick/style(gradient) 통과 | bug | C4(med) | `planRenderer.ts:386-396,227-229,294-297` | 속성 화이트리스트(class만) 2단계 매칭, 나머지 `&lt;`-escape, 엔티티 이중이스케이프 수정 | M |
| `dead-retry-pipeline-gates` | generateWithRetry/generateOnce/runGates 호출자 0 → V2 게이트 전체 도달 불가 + 잠복 버그(expectedSlideCount 항등, C-list 스텁) | dead-code | C5 | `retry.ts:37-56`, `pipeline.ts:40-71`, `gates.ts:40-170` | 배선(앱 MD import/CLI score-md에 연결) 또는 삭제 — 둘 중 결정 후 일관화 | M |
| `scorer-counts-only` | 스코어러가 element 카운트만 검사, 수집한 codeBlockSamples/tableSamples 미사용 → 콘텐츠 스왑·절단이 10/10 | incomplete | C5 | `scorer.ts:113-173`, `detector.ts:84-99` | data-code-source 해시 매칭 비율, 테이블 셀 합, H2 텍스트 매칭으로 채점 | M |
| `published-deck-no-code-chrome` | renderPlan이 dots/terminal-header/shiki 없이 출력 → CLI 발행 덱이 에디터와 시각 불일치 | fidelity | C2 | `planRenderer.ts:320-338`, `scripts/slideplan.ts:12-13,123-145,267-278` | cmdRender/cmdPublish에 Node-side shiki upgrade 패스(`highlightCode`)+chrome 주입(정적 굽기 금지) | M |
| `md-adapter-unstyled-list-table` | presentationAdapter가 어느 테마도 모르는 `t-bullets`/`t-table` 출력 → 브라우저 기본 렌더 + 에디터 리스트 엔진 우회 | bug | C4 | `presentationAdapter.ts:53-87`, `useSlideEditing.ts:98,890-891`, `planRenderer.ts:303-318` | planRenderer 정본(`bullet-list`/`num-list`+`<li><div>`, `tbl`)에 정합, gates C-list 셀렉터 갱신 | M |
| `check-slop-missing-side-rail` | check-slop이 border-top만 검사 → 금지된 border-left 액센트 통과 | bug | C3 | `check-slop.mjs:161`, `brewnet-dark.css:307` | `border-(left\|right\|bottom): ≥2px 유채색` ERROR 재추가(transparent·1px 중성 예외) | S |
| `no-per-template-anti-slop-standards` | 단일 amber 표준이 portfolio(blue)/report(teal) 검증 불가, SVG_PALETTE에 두 액센트 없음 | incomplete | C3 | `SKILL.md:43`, `check-slop.mjs:88`, `portfolio.css:19`, `report.css:21` | §4의 3 템플릿 표준 저작 + check-slop 템플릿-aware화 | M |
| `theme-css-fails-own-gate` | 3 테마가 자체 게이트 9 ERROR(gradient topbar 3종·glow·shadow·emoji) | anti-slop | C3 | `brewnet-dark.css:38,98,627,727`, `portfolio.css:32,37`, `report.css:34,39`, `code-blocks.css:24` | topbar 단색 4px, glow→1px border, emoji 마크업 이동, shadow 예외 명시 후 check-slop 0 ERROR | M |
| `forked-master-skill` | 두 갈래로 분기된 SKILL.md, 린터가 stale 쪽 가리킴 | anti-slop | C3 | `.claude/skills/SKILL.md:38`, `anti-ai-slop/SKILL.md:38`, `clean-html/SKILL.md:6` | `.claude/skills/SKILL.md`를 포인터로 축소, 린터/문서 참조 단일화, carve-update 재머지 체크리스트 | S |
| `store-persistence-zero-tests` (×2) | store.ts(714줄, 20 importer)·persistence 전체 단위 테스트 0 | test-gap | C6 | `store.ts`, `localStore.ts`, `slideMigrations.ts`, `useAutoSave.ts`, `idb.ts` | undo/redo·history limit·clipboard·migration·IDB abort(fake-indexeddb) 테스트 신설 | L |
| `quality-gate-pipeline-zero-tests` | detector/gates/scorer 테스트 0 | test-gap | C6 | `quality/detector.ts`, `gates.ts`, `scorer.ts` | feature 카운트·gate pass/fail·score 경계 테스트 | M |
| `md-pipeline-zero-test-coverage` | 앱이 실제 쓰는 MD 경로(blockify/adapter/mdToSlides/detectTerminal) 테스트 0 | test-gap | C6 | `blockify.ts`, `presentationAdapter.ts`, `mdToSlides.ts` | 작은 MD fixture로 경계 컷·분할 순서·slot/class 테스트 | M |
| `sortablejs-reorder-skipped` | C1 핵심(블록 재정렬) e2e 영구 skip + store reorderSlide 단위 테스트 없음 | test-gap | C1/C6 | `editor.spec.ts:201` | store reorderSlide 단위 테스트 + page.evaluate 우회 e2e | M |
| `e2e-png-all-test-broken` | 유일한 export e2e가 제거된 'PNG (all)' 버튼 클릭 → 영구 RED | test-gap | C6 | `editor.spec.ts:417-455` | 기능 복원 또는 '현재 슬라이드 PNG'로 재작성 + Export HTML e2e 신설 | M |
| `e2e-waittimeout-flakiness` | `waitForTimeout` 30+개, CI retries:0 → 구조적 flaky | risk | C6 | `editor.spec.ts`, `playwright.config.ts:13` | dev 전용 `window.__storeRevision` 신호로 polling 대체, retries:1 | M |

### 3.2 Medium / Low (마일스톤별 처리)

다음은 마일스톤에 배정된 검증된 medium/low finding이다(전부 `file:line` 증거 보유).

- **C2 충실도(추가)**: `inline-slide-bg-stripped-divergence`(`SlideRenderer.tsx:111-115`), `image-overlay-object-fit-stretch`(`htmlBundle.ts:94`,`pngExport.ts:135-148`), `overlay-theme-token-scope-differs`(`SlideCanvas.tsx:250` vs `htmlBundle.ts:113-132`), `export-reads-store-with-pending-debounced`(`Toolbar.tsx:251-283`), `webfont-loading-diverges`(`index.html` vs `htmlBundle.ts:157`), `save-to-source-overwrites-deck`(`Toolbar.tsx:173-199`,`fileSystemAccess.ts:228`), `escape-inline-html-double-escapes-entities`(`planRenderer.ts:394`), `blockify-split-reorders-content`(`blockify.ts:156-195`), `zwsp-placeholder-baked`(`useSlideEditing.ts:906-914`), `export-overlay-affordance-leaks-present`(`spike.css:243-255`), `linkify-case-sensitive`(`linkify.ts:12`), `html-export-errors-swallowed`(`Toolbar.tsx:147-155`).
- **C4 버그(추가)**: `idb-put-resolves-before-tx-commit`(`idb.ts:42-59`), `autosave-deck-switch-race`(`useAutoSave.ts:20-67`), `no-unload-flush`(grep 0건), `blob-url-poisons-autosaves`(`localStore.ts:36-65`), `legacy-migration-flag-on-failure`(`localStore.ts:106-122`), `slide-migrations-applied-before-writeback`(`slideMigrations.ts:103-106`), `remove-slide-shifts-selection`(`store.ts:392-410`), `merge-list-drops-sublists`(`useSlideEditing.ts:167-207`), `code-block-backspace-text-node-caret`(`useSlideEditing.ts:467-505`), `global-escape-discards-drafts`(`OverlayLayer.tsx:79-96`), `overlay-numberfield-empty→0`(`PropertiesPanel.tsx:261-279`), `overlay-numeric-edits-spam-undo`(`store.ts:449-468`), `block-xy-wrong-containing-block`(`BlockFormatPanel.tsx:147-191`), `detect-terminal-false-positives`(`detectTerminal.ts:4-24`), `th-unescape-migration-misses-attributed`(`slideMigrations.ts:22-42`), `watermark-3line-overlap`(`watermark.ts:17,34`), `slide-bg-named-color-rejected`(`parsePresentation.ts:85`), `empty-title-no-fallback`(`parsePresentation.ts:60-61`), `hasshiki-first-slide-heuristic`(`App.tsx:87`), `uploaded-html-template-hardcoded-report`(`App.tsx:166-173`), `deck-registry-id-collision`(`deckRegistry.ts:98-119`), `undefined-v-bg`(`brewnet-dark.css:674`), `reset-skips-shiki-upgrade`(`Toolbar.tsx:430-431`).
- **C1 완성(추가)**: `text-overlay-reimport-promotion-missing`(`useSlideEditing.ts:573-587`), `export-overlay-promotion-not-atomic`(`useSlideEditing.ts:573-613`), `floatblock-dead-action`(`store.ts:191-194,508-534`), `moveable-rotation-not-implemented`(`OverlayLayer.tsx:108-117`), `overlay-props-incomplete-rotation-zorder`(`PropertiesPanel.tsx:145-233`), `deck-link-editing-missing`(`editor.spec.ts:252-295`), `list-enter-no-split`(`useSlideEditing.ts:921-939`).
- **C3(추가)**: `anti-slop-standards-internal-contradictions`(`SKILL.md:24` vs `html-report.md:14`), `check-slop-color-parsing-blind-spots`(`check-slop.mjs:40,70`), `anti-slop-hook-advisory-blanket-exempt`(`carve-anti-slop.sh:3,17,30`), `renderer-hardcoded-inline-styles-emoji`(`planRenderer.ts:154-359`), `iconpicker-emoji-conflicts`(`IconPicker.tsx:8-33,131`).
- **C5 리팩터/데드코드(추가)**: `png-all-pdf-orphaned`(`pngExport.ts:41`,`htmlBundle.ts:242`), `resource-origin-builtin-dead`(`resourceRegistry.ts:10`), `overlayimage-dead-alias`(`OverlayLayer.tsx:42`), `numberfield-triplication`(4파일), `exporter-duplication`(PRESET_CLASS×5, blobUrl×2, EXPORT_SCALE), `duplicated-template-type-hash`(slidePlan/pipeline/mdToSlides), `presentation-adapter-dead-branch`(`presentationAdapter.ts:144-192`), `plan-renderer-block-id-incompatible`(`planRenderer.ts:327,335`), `cli-pass-threshold-diverges`(0.85 vs 0.9), `upgrade-chrome-gate-comment-mismatch`(`upgradeCodeBlocks.ts:9-43`), `curriculum-css-in-base-theme`(`brewnet-dark.css:685-779`), `accent-token-aliasing-amber-is-blue`(`portfolio.css:19`,`report.css:21`), `theme-css-unscoped-phase1c`(`postcss.config.js`), `check-slop-js-stale-duplicate`, `overlay-selector-fresh-array`(`SlideCanvas.tsx:44`), `resource-deck-stale-detection-not-wired`(`App.tsx:120-153`), `persisted-currentindex-never-restored`(`App.tsx:89-93`).
- **C6 테스트(추가)**: `importer-zero-test-coverage`, `png-export-zero-unit-tests`, `html-bundle-overlay-bg-untested`, `parsepresentation-data-slide-bg-no-test`, `slide-migrations-zero-coverage`, `idb-round-trip-no-test`, `blockify-detectterminal-no-tests`, `watermark-module-no-tests`, `zero-tests-for-slop-gate`, `appendix-deck-hardcoded-slide-count`, `html-export-e2e-missing`, `test-gap-table-keyboard`, `test-gap-commit-serialization`, `test-gap-overlay-render-parity`, `properties-store-test-gaps`, `htmlbundle-background-baking-untested`, `imported-slides-keep-foreign-data-template`.

### 3.3 드롭/제외된 후보 (Dropped / deliberately excluded)

적대적 검증에서 `verdict.real=false`로 **드롭된 finding은 없다**(25/25 통과). 다만 서브시스템 에이전트가 검토 후 **의도적으로 제외**한 후보는 다음과 같다(현 코드 기준 무해/설계 의도):

- `countSlides`/`extractMeta` 정규식의 작은따옴표·속성순서 민감성 — 현재 모든 생성기가 일치 형식 출력.
- parsePresentation orphan-overlay `</div>$` replace 자체 — `outerHTML` 보장으로 안전.
- gates.ts의 `code-`/`term-` prefix 기대 — 파이프라인 경로 presentationAdapter와 일치(planRenderer는 gates 미경유).
- `sanitizeRawHtml`의 인라인 html 스트립 — 문서화된 설계 선택(텍스트는 별도 노드로 보존).
- `makeBlockId` Date.now()+counter 충돌 — 프로세스 스코프, 안전.
- `escapeAttr`가 작은따옴표 미이스케이프 — 모든 속성이 큰따옴표.
- shiki Java 지원 stale 주석(`detectTerminal.ts:37`) — 실제 번들됨, 중복 finding에 흡수.
- `applySlideBackground.ts:38` `#000` letterbox 하드코드 — 3면 일관이라 C2 미위반(라이트 테마 미관 nit).
- `code-blocks.css:89-106` shiki 토큰색 결합 — 기능적이나 업그레이드에 취약(custom shiki 테마 권고, 별도 finding 아님).
- `useAutoSave` deckId 클로저 race(좁은 창), vitest node-env JSDOM 보일러플레이트 — risk/tech-debt로만 기록.

---

## 4. 안티-AI-슬롭 3-템플릿 설계 (C3)

### 4.1 배경과 전략

현 단일 표준(`.claude/skills/anti-ai-slop/SKILL.md`, amber 중심)은 에디터의 3개 덱 템플릿을 검증할 수 없다. 리서치 결과 각 템플릿의 프로덕션 분석군(analog)이 명확하므로, **토큰 rename 없이** 기존 테마(`brewnet-dark.css`/`portfolio.css`/`report.css`)를 in-place로 확장하고, 표준 문서 3개 + 템플릿-aware 게이트를 추가한다. planRenderer는 `data-template`만 바꾸므로 3 표준 전부 기존 테마 추가분으로 출하 가능하다.

### 4.2 세 표준

#### (A) Console Dark — `presentation` 매핑

- **inspiration**: GitHub Primer dark(canvas/fg/border 토큰 티어링) + Vercel Geist(Swiss 축약, near-monochrome + 단일 액센트 + mono 숫자) + 터미널 IDE 문서 관례. 코딩 강의 산출물이라 shiki/terminal이 1급 콘텐츠 → 프로덕션 분석군은 '다크 개발자 문서'.
- **palette**: canvas `#0F172A`, raised surface `#1E293B`(코드블록·th·callout fill, 제3 surface 금지), border `#1E293B` 1px, text `#F1F5F9`(다크에 pure white 금지), muted `#94A3B8`, 페이지 bg `#020617`(에디터 한정). 단일 액센트 amber `#F59E0B`(+pressed `#D97706`). semantic-only: link `#60A5FA`(하이퍼링크), success `#34D399`·terminal cyan `#22D3EE`(터미널/상태 라벨 전용 — heading·border·장식 금지). 코드 외 amber 요소군 ≤2/슬라이드.
- **type**: body `Noto Sans KR`(PNG 래스터 폰트와 CJK 패리티), label/eyebrow/code `JetBrains Mono`. hero 52/900, title 40/700(-0.02em), body 18–22/1.6, eyebrow 11–13/700/0.15em uppercase amber. 강조 `<em>`는 amber·normal style(gradient text·glow 금지).
- **layout**: 1280×720, master padding `56px 72px 48px`, 8px mini-unit(8/16/24/32/48/64). eyebrow→title→1px rule→content, 1 idea/slide, ≤5 bullets. 좌측 정렬(cover/divider 제외), 단색 4px amber topbar.
- **components**: code block surface `#1E293B`+1px border+radius 6, JetBrains Mono 15–16, terminal chrome 허용(기능 표시). table th `#1E293B`+1px bottom, 다크 zebra 금지. callout 1px border+≤8% tint+bold label(좌측 rail 금지). bullet 6px square amber ::before.
- **template rules**: gradient 전면 금지(topbar 단색 4px), cover 외 배경아트 금지(cover `opacity≤0.04`), pure `#FFFFFF` 텍스트 금지, cyan/green을 터미널-semantic 외 사용 금지, 캔버스 내 box-shadow 금지(슬라이드 카드 그림자는 에디터 chrome, export 미반영), surface 2톤만, 숫자/경로/명령 전부 mono.

#### (B) Swiss Folio — `portfolio` 매핑

- **inspiration**: International Typographic Style(Müller-Brockmann 모듈 그리드·중성 grotesque·비대칭·여백=구조·단일 액센트) + Swiss-grid 포트폴리오 템플릿군 + Geist 흑백 축약.
- **palette**: paper `#FFFFFF`(유일 배경, 코드 제외), ink `#111111`(텍스트+구조 hairline), muted `#767676`(현 `#888888`는 3.5:1 WCAG 미달 → 4.54:1로 교정), hairline `#DDDDDD` 1px. 단일 액센트 blue `#3D5AF1`(토큰 rename 금지) — eyebrow·`<em>`·번호 마커·active page·link 한정, 배경 8% tint 초과 금지, 본문 텍스트 금지. semantic cyan/green은 code-scope.
- **type**: display+body `Pretendard`(한국 사실상 표준 neo-grotesque, check-slop FONT_DEFAULTS 회피 + CJK). 800 display/600 heading/400 body. cover 64–88(-0.03em), section 40/700, body 18–20/1.65. figure number·date·meta·caption `JetBrains Mono` 12–13.
- **layout**: 6-column 모듈 그리드(≈164px col, 24px gutter), 비대칭 기본(title 1–4열·meta 5–6열, 중앙정렬 본문 금지), 여백이 1차 구분자, 필요 시 1px `#111111` hairline. 8/16/24/40/64. 이미지 셀 flush.
- **components**: card border-radius **0**(템플릿 시그니처)+1px `#DDDDDD`, table th 투명/`#F0F2F5`+1px `#111111` bottom(현 2px blue underline 교체), code plate 다크 `#1E293B`+1px border(monograph plate로 정당화). pagination mono 12.
- **template rules**: gradient topbar→단색 4px 또는 1px hairline, 캔버스 내 radius>0 금지(code plate ≤6 예외), box-shadow 금지·회색 패널 구분 금지, 중앙정렬 본문 금지(cover 제외), muted<`#767676` 금지, 액센트 요소군 ≤1/슬라이드, 모든 블록 6-column 정렬, display Pretendard 700–800·인접 위계 비 ≥1.5×.

#### (C) Analyst Paper — `report` 매핑

- **inspiration**: FT Origami(paper 토큰) + Economist 차트(off-white ground·단일 데이터 액센트·'one chart one message') + Tufte CSS(cream·serif·sidenote·텍스트-그래픽 통합) + Carbon(데이터 테이블 mechanics·tabular-nums).
- **palette**: paper `#FAFAF8`, 보조 warm surface `#F0EDE8`(th·stat fill, 유일 제2 surface), ink `#1A1A18`, muted `#6B6560`(4.9:1 통과), warm border `#D4D0C8` 1px. 단일 액센트 teal `#0F766E`(+`#115E59`). Economist 규칙: teal=주 데이터(한 컬럼/행/시리즈/핵심 숫자 1개), 나머지 회색/ink. link `#1E40AF`(인용/하이퍼링크), zebra ≤4% teal, green `#059669`(양수 델타 semantic, red와 동시 사용은 gain/loss 쌍만).
- **type**: display heading+key number `Noto Serif KR`(editorial serif 보이스, 타 템플릿과 구분), body `Noto Sans KR` 17–19/1.7, 숫자/축/source `JetBrains Mono`·`IBM Plex Mono` `font-variant-numeric: tabular-nums`. cover 56–64 serif, section 36–40 serif, table 15–16, source 12–13 mono.
- **layout**: Tufte 2-zone(주 exhibit ≈65% + 우측 주석 ≈30%), 모든 exhibit에 caption 위 + mono `Source/기준:` 아래(provenance=anti-slop 속성). KPI 3–4 serif 숫자+mono caption. 8/16/24/32/48.
- **components**: table th `#F0EDE8`+2px `#0F766E` bottom(액센트=의미), 숫자열 우측정렬 mono tabular, table당 teal 하이라이트 ≤1. 'Key finding' callout 1px border+≤6% teal+serif title. 차트 flat SVG gray-first 단일 teal series·black axes(3D/glow/round bar 금지). quote 1px border serif(좌측 rail 금지).
- **template rules**: gradient topbar→단색 4px teal, exhibit당 teal 데이터 ≤1, red/green 동시는 부호쌍만, table 내 icon/emoji/pill 금지, chart junk 금지, 모든 table/chart에 caption+source(없으면 fail), 데이터 숫자 tabular mono·우측정렬, heading Noto Serif KR(`[data-template=report]` heading이 serif 아니면 warn), zebra ≤8%.

### 4.3 게이트·스킬 확장 방법

1. **마스터 단일화** (`forked-master-skill`): `.claude/skills/SKILL.md`를 `anti-ai-slop/SKILL.md` 포인터로 축소, `clean-html/SKILL.md`·`check-slop.mjs` 헤더 참조 갱신. carve-update 후 재머지 체크리스트에 등록(memory: carve-update-clobbers-customizations).
2. **표준 문서 3종** 신설: `.claude/skills/anti-ai-slop/templates/{presentation-dark,portfolio-white,report-cream}.md` — 각각 토큰 표/타이포 스케일/shadow 예산/table·cover·code 처리/**명명된 예외**(slide-card shadow, cc-watermark, t-h2 marker, blockquote citation) 정의.
3. **check-slop 템플릿-aware화**: `[data-template=...]` 또는 `--template=` 인식 → 액센트/SVG_PALETTE 전환. 추가 규칙 — side-rail 재추가(`check-slop-missing-side-rail`), color parsing 보강(var() 인라인 해석·named color 테이블·8자리 hex·다줄 선언, `check-slop-color-parsing-blind-spots`), accent-count-per-slide, muted-contrast, portfolio radius-0, report serif-heading+source-line.
4. **훅 강제화** (`anti-slop-hook-advisory`): `carve-anti-slop.sh`를 baseline-delta 차단(exit 2)으로, presentation/slides 일괄 면제 제거하고 명명 예외 allowlist로 교체.
5. **테마 de-slop** (`theme-css-fails-own-gate`, `accent-token-aliasing`, `curriculum-css-in-base-theme`, `renderer-hardcoded-inline-styles-emoji`): gradient topbar 3종 단색화, glow→1px border, emoji 마크업 이동, `--amber` 별칭을 `--accent`로 정규화(별칭 deprecate 유지), curriculum CSS 분리·스코프, planRenderer 인라인 스타일을 테마 클래스로 이동·기본 이모지 아이콘 제거, IconPicker 글리프화. 완료 게이트: 4개 테마 check-slop **0 ERROR**.

---

## 5. 단계별 마일스톤 (M0 ~ M11)

의존성 + 리스크 감소 순서: **안전망(C6) → 데이터손실 버그(C4) → 영속성(C4) → 입력/패널(C4) → 제너레이터(C4) → 배경 라운드트립(C2) → export 충실도(C2) → 발행덱(C2) → 에디터 완성(C1) → 안티슬롭(C3) → 리팩터(C5) → 테스트 스윕(C6)**.

원칙: 모든 버그 수정은 **red-first**(M0이 깔아둔 라운드트립/패리티 테스트가 먼저 실패 → 수정 → green). 완료 기준은 반드시 테스트 + 엣지케이스를 포함한다(C6).

---

### M0 — 회귀 안전망 & CI 안정화

- **목표**: 코드 손대기 전 green 베이스라인 회복 + 후속 수정을 red-first로 잠글 라운드트립/패리티 테스트 스캐폴드 구축.
- **포함 findings**: `imported-slides-keep-foreign-data-template`(appendix 덱 데이터 교정으로 RED 해소), `e2e-png-all-test-broken`, `e2e-waittimeout-flakiness`, `appendix-deck-hardcoded-slide-count`, (스캐폴드) `importer-zero-test-coverage`·`htmlbundle-background-baking-untested`·`html-bundle-overlay-bg-untested`·`parsepresentation-data-slide-bg-no-test`·`test-gap-overlay-render-parity`·`test-gap-commit-serialization`.
- **산출물**: 공용 `tests/_utils/jsdom.ts`(JSDOM globals setup/teardown), dev 전용 `window.__storeRevision` 신호, `playwright.config.ts` retries:1, RED으로 작성된 round-trip(`buildHtmlBundle→parsePresentationHTML` 배경/오버레이/code-source 보존) + 5면 오버레이 패리티 + commit 직렬화(에디터 chrome 부재) 테스트.
- **완료 기준**: `npx vitest run` 전부 green(스캐폴드 RED는 `.todo`/`.fails`로 명시 표기), e2e suite가 제거된 버튼 미참조, appendix 슬라이드 카운트 `toBeGreaterThanOrEqual`로 둔감화. 엣지: 빈 덱·단일 슬라이드·오버레이 없는 슬라이드.
- **의존성**: 없음. **리스크**: 낮음(테스트만). **규모**: M.

---

### M1 — 편집 파이프라인 & Undo 데이터 손실 버그 (C4)

- **목표**: silent 데이터 손상 4종 제거 — 신규 UX 불필요, 가장 높은 위험.
- **포함 findings**: `deck-switch-pending-commit`, `col-resize-handle-baked`, `text-overlay-undo-flush`, `remove-slide-shifts-selection`, `merge-list-drops-sublists`, `code-block-backspace-text-node-caret`, `zwsp-placeholder-baked`.
- **산출물**: loadDeck/loadDeckFull `flushPendingCommit()` + deck-gen 토큰 가드, commitFromDom/copyBlock 공용 `stripEditorChrome` 헬퍼(+`strip-col-resize-handles` 마이그레이션), `pendingCommit`를 `Set` 멀티등록 + TextOverlayBox flush 등록, removeSlide 인덱스 보정, mergeListItems 중첩 sublist 이관, code-block 가드 text-node caret 확장, commit 직렬화 ZWSP 제거.
- **완료 기준**: M0의 commit-직렬화 테스트 green(col-resize 핸들·ZWSP 부재 단언). store 단위 테스트: 덱 전환 중 pending flush 순서, removeSlide 3케이스(앞/자신/뒤), undo-after-typing이 텍스트 제거 + redo 보존. jsdom: backspace-merge가 sublist 보존, code-block 앞 Backspace가 블록 미삭제(양방향).
- **의존성**: M0. **리스크**: 중(공유 commit 경로 변경 — 회귀 테스트로 방어). **규모**: M.

---

### M2 — 영속성 견고화 (C4)

- **목표**: 저장 race·가짜 '저장됨'·이탈 손실 제거.
- **포함 findings**: `idb-put-resolves-before-tx-commit`, `autosave-deck-switch-race`, `no-unload-flush`, `blob-url-poisons-autosaves`, `legacy-migration-flag-on-failure`, `slide-migrations-applied-before-writeback`, `persisted-currentindex-never-restored`.
- **산출물**: idb 쓰기를 `tx.oncomplete` 기준으로 변경(abort/quota reject), `onblocked` 완화, persistNow에 `cancelled` 가드 + store `deckId` 원자성, pagehide/visibilitychange flush(+localStorage dirty 안전망), blob 변환 오버레이 단위 try/catch(부분 성공), 마이그레이션 플래그를 실패 0건일 때만 기록·writeback 성공 후 commit, openDeck이 `persisted.currentIndex` 복원.
- **완료 기준**: fake-indexeddb로 tx abort 시 `ok:false`, 덱 전환 경합 시 구 deckId 미오염, blob 1개 실패+N개 정상 시 저장 성공, 마이그레이션 실패→다음 부팅 재시도(멱등), currentIndex 라운드트립.
- **의존성**: M0(fake-indexeddb 셋업). **리스크**: 중. **규모**: M.

---

### M3 — 에디터 입력 가로채기 & 패널 정확성 (C4, C1 인접)

- **목표**: 전역 단축키가 패널 초안을 파괴하지 않게 하고 숫자 입력 정확화.
- **포함 findings**: `toolbar-undo-hijack`, `global-escape-discards-drafts`, `overlay-numberfield-empty→0`, `overlay-numeric-edits-spam-undo`, `block-xy-wrong-containing-block`.
- **산출물**: 공용 `isFormFieldTarget` util — Toolbar Cmd+Z/Y와 OverlayLayer Escape에 가드(contenteditable은 의도적 통과), draft형 NumberField 공용화(empty 가드+min/max clamp+commit-on-blur), updateOverlay `commit?` 옵션(타이핑 중 history push 억제) + x/y/w/h clamp, handlePositionChange가 `offsetParent` 좌표계로 환산(또는 절대화 시 `.slide-inner` reparent).
- **완료 기준**: keydown 단위 테스트(input focus 시 deck undo 미발생, Escape가 선택 유지), NumberField empty→이전값 유지·범위 clamp, updateOverlay 타이핑이 history 1엔트리, 중첩 코드블록 X/Y가 시각 좌표와 일치.
- **의존성**: M0. **리스크**: 낮음. **규모**: M.

---

### M4 — SlidePlan 제너레이터 정확성 & 안전 (C4)

- **목표**: 크래시·인젝션·콘텐츠 재정렬·오분류 제거.
- **포함 findings**: `two-col-code-validator-crash`, `escape-inline-html-injection`, `escape-inline-html-double-escapes-entities`, `blockify-split-reorders-content`, `detect-terminal-false-positives`, `th-unescape-migration-misses-attributed`.
- **산출물**: validateSlidePlan left/right 가드 + case 중괄호, escapeInlineHtml 속성 화이트리스트(class만)·엔티티 보존, blockify를 document 순서 분할(heading 비relocate), detectTerminal에서 bare `#` 제외·명령 뒤 인자 토큰 요구·앞 3줄만 검사, th-unescape v2 마이그레이션(`&quot;` 속성 디코드).
- **완료 기준**: validateSlidePlan이 left:undefined/string에 `{ok:false}` 반환(크래시 X), escapeInlineHtml이 onclick/style/gradient 페이로드 차단 + `&rarr;` 보존, blockify가 para-before-heading 순서 보존, detectTerminal table-driven(python-with-comments, `node.value`, 실제 `$ npm i`).
- **의존성**: M0. **리스크**: 중(escape 변경이 정상 inline 태그 보존 필요 — 테스트로 고정). **규모**: M.

---

### M5 — 슬라이드 배경 라운드트립 & 표면 정합 (C2)

- **목표**: 신규 `data-slide-bg` 기능을 양방향·전 표면 일관화.
- **포함 findings**: `bg-roundtrip-loss`, `present-thumbnail-ignore-bg`, `slide-bg-dropped-on-copy`, `inline-slide-bg-stripped-divergence`, `slide-bg-named-color-rejected`.
- **산출물**: `applyBackgroundToHtml`이 color→`data-slide-bg`/image→`data-slide-bg-image`+`-fit` 스탬프(null이면 제거), parsePresentation이 양 형식 복원 + 인라인 bg lift, setSlideBackground/commitFromDom이 html attr 동기화, PresentationView·SlideThumbnail이 `applyBackgroundToHtml` 통과, duplicate/insert/clipboard/import가 background(+overlays) 전파, 색 검증을 `CSS.supports` 기반으로(named color 허용 + warn).
- **완료 기준**: M0 round-trip 테스트 green — color·image·cleared 3케이스 deep-equal. 5면(editor/present/thumbnail/htmlBundle/pngExport) 배경 패리티 테스트. duplicate/import가 배경 보존, 제거한 배경 부활 안 함, named color 수용.
- **의존성**: M0(round-trip 스캐폴드), M1(commit 경로 안정). **리스크**: 중(attr↔필드 동기화 양방향). **규모**: M.

---

### M6 — Export = 라이브 덱 충실도 (C2)

- **목표**: standalone HTML/PNG/발표모드를 라이브 캔버스와 픽셀-동등화.
- **포함 findings**: `bundle-body-override`, `undefined-v-bg`, `text-overlay-padding-dropped`, `image-overlay-object-fit-stretch`, `overlay-theme-token-scope-differs`, `export-reads-store-with-pending-debounced`, `webfont-loading-diverges`, `export-misses-google-fonts`, `save-to-source-overwrites-deck`, `html-export-errors-swallowed`, `linkify-case-sensitive`, `export-overlay-affordance-leaks-present`, `exporter-duplication`.
- **산출물**: `stripEditorOverrides` 브라우저-safe 추출 후 htmlBundle 적용(또는 editor-only 펜스) + `--v-bg` 제거, 공용 `src/exporter/overlayRender.ts`(PRESET_CLASS·wrap/inner style·padding·object-fit·box-sizing) 5면 공유, 에디터/PNG 호스트에 `data-template` 스탬프(토큰 스코프 통일), Save/Export 핸들러에 `flushPendingCommit()`, buildHtmlBundle 폰트 스캔→사용 패밀리 link + index.html에 테마 폰트 로드, deck save-back을 viewer 번들과 분리(source-hash/subtitle meta 보존), export try/catch+toast, linkify `/i` + import-time 적용, spike.css `.export-overlay` 인터랙션 규칙을 `[data-canvas-role="main"]`로 스코프.
- **완료 기준**: 번들 출력에 `overflow:hidden !important`·`var(--v-bg)` 부재 단언, 5면 오버레이 패리티(padding/object-fit/preset/bg/rotation) green, 폰트 deck(`Fira Code`)이 link 생성, Export HTML e2e(다운로드→goto→슬라이드 수·known text·`.slide` computed bg·휠/ArrowDown 스크롤 동작), blob 죽은 src에 부분 성공.
- **의존성**: M0, M5(배경 직렬화), M1(flush). **리스크**: 중(공유 헬퍼로 5면 동시 변경). **규모**: L.

---

### M7 — 발행 standalone 덱 충실도 (C2)

- **목표**: CLI `render`/`publish` 산출물을 에디터 렌더와 일치.
- **포함 findings**: `published-deck-no-code-chrome`, `md-adapter-unstyled-list-table`, `strip-editor-overrides-truncates`, `plan-renderer-block-id-incompatible`.
- **산출물**: cmdRender/cmdPublish에 Node-side shiki upgrade + chrome 주입(정적 굽기 금지, deck-source-hash는 upgrade 전 마크업 기준 유지), presentationAdapter를 정본 `bullet-list`/`num-list`+`<li><div>`/`tbl`에 정합 + gates C-list 셀렉터 갱신, inlineThemeCss 펜스 절단(curriculum 보존), planRenderer block-id를 `makeBlockId('code'|'term')` + text slot에 `data-block-id` 스탬프.
- **완료 기준**: 발행 덱 fixture가 `.code-dots`/`.terminal-header`/shiki span 포함, loadInlineCss 출력에 `.curr-head` 잔존 + `margin:0 !important` 부재, adapter 출력이 테마·listInvariant가 타겟하는 클래스와 일치(generator 테스트).
- **의존성**: M0, M4(adapter 안정). **리스크**: 중. **규모**: M.

---

### M8 — 웹 PPT 에디터 완성도 (C1)

- **목표**: '선택 요소 자유 이동(위치/회전/z) + HTML 자유 편집' 계약 완성.
- **포함 findings**: `text-overlay-reimport-promotion-missing`, `export-overlay-promotion-not-atomic`, `floatblock-dead-action`, `moveable-rotation-not-implemented`, `overlay-props-incomplete-rotation-zorder`, `deck-link-editing-missing`, `list-enter-no-split`, `uploaded-html-template-hardcoded-report`, `reset-skips-shiki-upgrade`, `hasshiki-first-slide-heuristic`, `sortablejs-reorder-skipped`.
- **산출물**: parsePresentation/openDeck가 `.export-overlay*`를 import 시점에 `overlaysBySlide`로 시드(이미지+텍스트 둘 다, 원자), 원자 `promoteInlineOverlay` 액션, floatBlock을 BlockFormatPanel '자유 배치'에 배선, Overlay에 `rotation?`·`z?` 추가 + Moveable `rotatable` + 5면 `transform:rotate()`·z-index + 패널 회전 NumberField·앞/뒤 4버튼, BlockFormatPanel Links 섹션(a[href] 열거 + text/url input), Enter 중간분할(`extractContents`), 공용 `parseAndUpgradeDeck` 헬퍼로 3개 re-parse 진입점 통일(Reset 포함) + hasShiki 게이트 제거, 업로드 덱 template을 `data-template`에서 도출.
- **완료 기준**: 재import 덱의 텍스트 오버레이가 선택·이동·편집 가능, promotion이 단일 undo 엔트리, 회전·z가 5면 일관(패리티 테스트), Links e2e green, Enter 중간분할 e2e, store reorderSlide 단위 테스트 + page.evaluate 우회 e2e, Reset 후 code chrome 보존.
- **의존성**: M5/M6(오버레이 렌더 통합·배경), M1(undo). **리스크**: 중–상(신규 UX 다수). **규모**: L.

---

### M9 — 안티-슬롭 게이트 복구 & 3-템플릿 표준 (C3)

- **목표**: §4 설계 구현 — 게이트 신뢰 회복 + 3 표준 저작 + 테마 0 ERROR.
- **포함 findings**: `forked-master-skill`, `check-slop-missing-side-rail`, `check-slop-color-parsing-blind-spots`, `anti-slop-hook-advisory`, `check-slop-js-stale-duplicate`, `anti-slop-standards-internal-contradictions`, `no-per-template-anti-slop-standards`, `theme-css-fails-own-gate`, `accent-token-aliasing-amber-is-blue`, `theme-css-unscoped-phase1c`, `curriculum-css-in-base-theme`, `renderer-hardcoded-inline-styles-emoji`, `iconpicker-emoji-conflicts`, `zero-tests-for-slop-gate`.
- **산출물**: §4.3 1~5 전부 — 마스터 단일화, 3 표준 문서, check-slop 템플릿-aware+side-rail+color-parsing 보강, 훅 baseline-delta 차단, check-slop.js 삭제, 테마 de-slop(gradient/glow/emoji/shadow), `--amber`→`--accent` 정규화, Phase 1c PostCSS 스코프(`postcss-prefix-selector`)로 `body` 오버라이드 hack·`--v-bg` 제거, curriculum CSS 분리, planRenderer 인라인→클래스·이모지 아이콘 글리프화, IconPicker 글리프화.
- **완료 기준**: 4개 테마 `check-slop.mjs` **0 ERROR**, check-slop fixture suite(side-rail·var()-token accent-bar·8자리hex shadow·다줄 선언·muted-contrast·radius-0·serif-heading·source-line) green, watermark 테스트 포함, 3 표준 문서 존재 + 명명 예외 allowlist.
- **의존성**: M6(body 오버라이드는 export와 공유 — Phase 1c가 두 곳 동시 해결), M7(planRenderer). **리스크**: 상(테마 전면 변경 — PNG export 스크린샷 diff로 시각 회귀 방어). **규모**: L.

---

### M10 — 데드코드 제거 & 코드베이스 리팩터 (C5)

- **목표**: 미완 기능 완성 또는 제거, 중복 통합.
- **포함 findings**: `dead-retry-pipeline-gates`(결정 후 배선 또는 삭제), `scorer-counts-only`(identity 채점 완성), `png-all-pdf-orphaned`(ExportDropdown 재배선 권장), `resource-origin-builtin-dead`, `overlayimage-dead-alias`, `numberfield-triplication`, `exporter-duplication`(M6에서 일부 흡수 후 잔여), `duplicated-template-type-hash`, `presentation-adapter-dead-branch`, `cli-pass-threshold-diverges`, `upgrade-chrome-gate-comment-mismatch`, `deck-registry-id-collision`, `overlay-selector-fresh-array`, `resource-deck-stale-detection-not-wired`, `empty-title-no-fallback`.
- **산출물**: V2 게이트 배선/삭제 결정 + expectedSlideCount·C-list 수정(배선 시), 스코어러 identity-aware 채점, PNG-전체/PDF-인쇄 ExportDropdown 복원, dead union/alias 제거, 공용 `NumberField`·`src/generator/types.ts`(Template)·`shortHash`/`escape` util·`src/lib/blob.ts`, CLI threshold를 rubric에서 export, upgrade-chrome 게이트 `hasChrome && hasAttr` 정밀화, deck id 중복 가드, `EMPTY_OVERLAYS` 상수, resource 덱 sourceHash 배선, 빈 title fallback 공유 헬퍼.
- **완료 기준**: 데드 심볼 grep 0건(또는 배선되어 호출자 존재), 통합 NumberField가 4 사용처 동작 동일, scorer가 콘텐츠 스왑/절단에 fail, deck id 중복 단언 테스트, threshold 단일화.
- **의존성**: M4·M6·M7(중복 통합 대상이 안정화된 후). **리스크**: 중. **규모**: L.

---

### M11 — 테스트 완성도 스윕 (C6)

- **목표**: 남은 무커버 서브시스템에 엣지케이스 테스트 보강.
- **포함 findings**: `store-persistence-zero-tests`, `quality-gate-pipeline-zero-tests`, `md-pipeline-zero-test-coverage`, `slide-migrations-zero-coverage`, `idb-round-trip-no-test`, `blockify-detectterminal-no-tests`, `watermark-module-no-tests`, `importer-zero-test-coverage`, `png-export-zero-unit-tests`, `properties-store-test-gaps`, `test-gap-table-keyboard`, `html-export-e2e-missing`(M6에서 일부), `parsepresentation-data-slide-bg-no-test`(M5에서 일부).
- **산출물**: `tests/scene/store.test.ts`(history limit 50·redo invalidation·clipboard·slide ops 엣지), `tests/persistence/{localStore,slideMigrations,useAutoSave,idb}.test.ts`, `tests/generator/{blockify,presentationAdapter,detectTerminal,quality}.test.ts`, `tests/importer/{parsePresentation,upgradeCodeBlocks,detectResource}.test.ts`, `tests/exporter/pngExport.test.ts`(buildOffscreenHost), `tests/watermark/watermark.test.ts`, 테이블 키보드 jsdom 테스트.
- **완료 기준**: `.codesight/coverage.md` route/model 커버리지 유의미 상승, 각 M1~M10 수정에 회귀 테스트 짝지음, e2e green + retries 하에 안정.
- **의존성**: 전 마일스톤(수정과 짝). **리스크**: 낮음. **규모**: L.

---

## 6. 테스트 전략 (per-condition C6)

### C1 — 에디터 동작
- store: undo/redo, reorderSlide 인덱스, floatBlock 원자성, removeSlide 3케이스.
- overlay: 회전·z-order 5면 패리티, 재import 텍스트 오버레이 promotion(단일 undo).
- editing: Enter 중간분할, Backspace-merge sublist 보존, code-block 가드 caret.
- e2e: SortableJS 재정렬(page.evaluate 우회), Links text/url 편집, 회전 핸들.

### C2 — Export 동일
- round-trip: `buildHtmlBundle→parsePresentationHTML` 배경(color/image/cleared)·오버레이 geometry·`data-code-source` 보존.
- 5면 패리티: editor/present/thumbnail/htmlBundle/pngExport가 동일 left/top/w/h/padding/bg/rotation/preset.
- 번들 불변식: `overflow:hidden!important`·`var(--v-bg)` 부재, 사용 폰트 link 존재, `@page`·`scale(1.5)`.
- e2e: Export HTML 다운로드→goto→슬라이드 수·텍스트·computed bg·휠/키보드 스크롤.

### C3 — Anti-Slop
- check-slop fixture: side-rail(border-left ≥2px 유채색), var()-token accent-bar, 8자리 hex shadow, 다줄 선언, muted-contrast, portfolio radius-0, report serif-heading+source-line.
- 게이트: 4개 테마 0 ERROR, 3 표준 문서 존재, 훅 baseline-delta 차단.

### C4 — 버그
- 덱 전환 중 pending flush 순서, col-resize/ZWSP 직렬화 부재, overlay undo flush, IDB tx abort, autosave 경합, validateSlidePlan 크래시-free, escape 인젝션 차단, blockify 순서, detectTerminal 오분류.

### C5 — 완성·데드코드
- scorer 콘텐츠 스왑/절단 fail, 통합 NumberField 동작, deck id 중복 가드, V2 게이트 배선/삭제 일관성, threshold 단일.

### C6 — 무커버 메우기
- store(714)·persistence·migrations·quality gate·MD 경로·importer·pngExport·watermark 단위 테스트 신설. e2e flaky 제거(store-revision polling, retries:1).

### 닫아야 할 핵심 갭
- `src/importer/*`, `src/scene/store.ts`, `src/persistence/*`, `src/generator/quality/*`, `src/generator/blockify.ts`, `src/exporter/pngExport.ts`, `src/watermark/*` — 전부 단위 테스트 0 → 신설.
- e2e: Export HTML 부재, SortableJS skip, PNG-all RED → 재작성/신설.

---

## 7. 리스크 · 오픈 이슈

### 리스크
- **공유 경로 변경(M1·M6·M9)**: commit 직렬화, 오버레이 렌더 헬퍼, 테마 CSS는 다수 표면이 의존 — M0의 패리티/직렬화 테스트가 선행 방어선. M9 테마 변경은 PNG export 스크린샷 diff로 시각 회귀를 잡는다.
- **Phase 1c 스코프(M9)**: `postcss-prefix-selector` 도입이 `:root` 토큰·`body` 오버라이드·`--v-bg`를 동시에 건드린다. export body 오버라이드(M6)와 근원이 같으므로 두 마일스톤을 인접 배치해 한 번에 해소.
- **V2 게이트 결정(M10)**: 배선 시 expectedSlideCount 항등·C-list 스텁·MdFeatures list 추적을 함께 고쳐야 함. 삭제가 더 저렴하나 C5 '미완성 완성'과 충돌 — 제품 방향(자동 품질 게이트 필요성)으로 결정 필요.
- **carve-update 덮어쓰기**: CLAUDE.md·check-slop.mjs·SKILL.md 커스터마이즈가 carve update로 클로버될 수 있음(memory: carve-update-clobbers-customizations) — M9 산출물에 재머지 체크리스트 포함 필수.

### 오픈 이슈 (제품 결정 필요)
1. **V2 게이트**: 배선 vs 삭제 (`dead-retry-pipeline-gates`).
2. **PNG-전체/PDF-인쇄**: 재배선 vs 제거 (`png-all-pdf-orphaned`) — CLAUDE.md Phase 3는 PDF를 명시 산출물로 둠 → 재배선 권장.
3. **deck id 네임스페이스**: `${template}--${stem}` 마이그레이션 vs 중복 가드만 (`deck-registry-id-collision`) — localStorage 키 마이그레이션 비용 트레이드오프.
4. **링크/회전/z-order 스코프**: C1 계약(`.claude/CLAUDE.md` 편집 모델 표)이 rotate를 명시하므로 구현이 정석이나, 영상 강의 워크플로에서 회전 빈도가 낮다면 계약 문서 수정으로 descoping도 가능.
5. **save-to-source vs export-viewer 분리**: 캐노니컬 덱 문서 직렬화 경로 신설 vs FSA 쓰기를 레지스트리 경로에서 거부(`save-to-source-overwrites-deck`).

### 권장 즉시 착수
M0(안전망) → M1(데이터 손실 4종) → M5(배경 라운드트립) → M6(export 충실도)가 사용자 가시 손상(데이터 유실 + export ≠ 라이브)을 가장 빠르게 제거한다. C3(M9)는 설계 분량이 크므로 병렬 트랙으로 표준 저작을 선행할 수 있다.
