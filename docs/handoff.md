# Handoff — `feat/editor-phases-0-through-2b`

> 최종 갱신: 2026-04-25
> 대상 브랜치: `feat/editor-phases-0-through-2b` (main 대비 ahead 29, origin 대비 ahead 11)
> 다음 세션이 이 브랜치를 이어받을 때 가장 먼저 읽는 문서.

---

## TL;DR

- 이번 세션은 **사이드바 썸네일 → 코드 블록(shiki) → react-grab dev 통합 → 사이드바 focus ring 버그 → 슬라이드 미리보기 줌 컨트롤** 5건을 5개 커밋으로 마쳤다.
- `npm run typecheck` / `npm run build` 모두 통과 상태에서 끝났다.
- 환경 인프라로 **Claude Context MCP 로컬 배포** (Ollama + Milvus standalone)를 사용자 macOS에 구축했다 — 레포에는 변경 없음, 새 세션에서 바로 시맨틱 검색 사용 가능.
- 다음 우선순위: **(1) 슬라이드 배경 컨트롤** → (2) Phase 1c CSS scope 격리 → (3) Phase 2 추가 UX.

---

## 1. 현재 브랜치 상태

| 항목 | 값 |
|---|---|
| 브랜치 | `feat/editor-phases-0-through-2b` |
| main 대비 ahead | **29 commits** |
| origin/feat/editor-phases-0-through-2b 대비 | **ahead 11** (push 안 됨) |
| 작업 트리 | `docs/DEPLOY_VERCEL.md` 삭제됨, `docs/guide/{DEPLOY_VERCEL.md, claude-context-analysis.md}` 추가됨 — **둘 다 미커밋**, 한 번에 묶어 커밋 필요 |
| 빌드 상태 | typecheck ✓, build ✓ |

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

## 2. 이번 세션에서 완료한 작업 (커밋 단위)

### `ef1549d` — 사이드바 슬라이드 썸네일

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

---

## 3. 환경 인프라 (레포 외부, 사용자 macOS)

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

## 4. 남은 작업 (우선순위 순)

### 우선순위 1: 슬라이드 배경 컨트롤 (옵션 3)

- 슬라이드별 배경색 / 배경 이미지 설정.
- 작업량 소~중, 위험도 낮음.
- BlockFormatPanel과는 별도 섹션 (PropertiesPanel 또는 Toolbar에).
- 모델: `ParsedSlide`에 `background?: { kind: 'color'; value: string } | { kind: 'image'; url: string; fit: 'cover' | 'contain' }` 추가 검토.
- 렌더: `.slide` 요소에 inline style 또는 `data-bg-*` 속성 → CSS.
- export 회귀 검증 필요.

### 우선순위 2: Phase 1c — CSS scope 격리

- 현재 brewnet 샘플 CSS는 `.slide-canvas-host` 하위로 import되지만, **클래스 자체는 글로벌 네임스페이스**라 다른 샘플 family(예: portfolio, report) 도입 시 충돌 가능.
- PostCSS 플러그인으로 셀렉터를 `.slide-canvas-host > ...`로 자동 prefix.
- 다른 샘플을 도입하기 전까지는 보류 가능.

### 우선순위 3: Phase 2 추가 UX

- **텍스트 회전**: Moveable이 rotate를 지원하나 `TextOverlay` 모델에 `rotation: number` 필드 추가 필요. export 시 transform 보존 필수.
- **폰트 패밀리 확장**: 현재 JetBrains Mono / Pretendard 외 옵션 부재. Google Fonts 동적 로드 검토.
- **그라디언트 / 보더 / 그림자**: ColorPicker 확장 또는 별도 섹션.

### 그 외 (TaskList 미완료)

- `#4`. Phase 2: PPT-like editing UX (위 항목들로 분해됨)
- `#7`. Phase 1c: Sample CSS scope isolation via PostCSS prefix

---

## 5. 알려진 이슈 / 트레이드오프

| 이슈 | 영향 | 회피 |
|---|---|---|
| 줌 컨트롤 세션 휘발성 | 새로고침 시 100%로 복귀 | localStorage 저장 추가 시 `usePersistenceStore` 또는 별도 key |
| 줌 200% 시 일부 잘림 | wrapper `overflow-hidden`로 가려짐 | `overflow: auto`로 바꿀지 결정 필요 (스크롤바 노출) |
| Milvus는 Docker Desktop 필수 | Docker 꺼지면 멈춤 | Docker Desktop autostart |
| 코드베이스 < 5천 줄 | claude-context 효과 제한적 | 더 큰 프로젝트로 검증 |
| `docs/DEPLOY_VERCEL.md` 삭제 + `docs/guide/DEPLOY_VERCEL.md` 추가 미커밋 | 한 번에 묶어 commit 필요 | `git add docs/ && git commit -m "docs: relocate guides to docs/guide/"` |
| react-grab MCP 서버 | 별도 MCP — 이번 작업과 무관, 항상 connect 상태 | 무시 가능 |
| `docs/images/책-투명.png` 삭제됨 | 의도적인지 확인 필요 | `git status`로 확인 |

---

## 6. 빠른 시작 (다음 세션)

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

### 권장 첫 행동

1. `git status` — 미커밋 변경사항(docs 이동, 이미지 삭제) 확인 → 묶어 커밋할지 사용자에게 확인
2. `git push origin feat/editor-phases-0-through-2b` — 11개 미푸시 커밋 사용자에게 확인 후 푸시
3. 다음 작업이 "슬라이드 배경 컨트롤"이면 — 먼저 `src/scene/store.ts`의 `ParsedSlide` 타입과 `src/canvas/SlideRenderer.tsx`의 렌더 흐름 점검
4. claude-context MCP가 활성화되어 있다면 — 큰 변경 전에 "이 코드베이스를 인덱싱해줘"로 시맨틱 검색 베이스라인 확보

---

## 7. 핵심 아키텍처 메모 (잊기 쉬운 것들)

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

---

## 8. 이전 handoff 문서 (참고)

- `29ebd9e` — `docs: HANDOFF — Cmd+Z routing fix + block-reorder atomic commit` (이미 커밋됨, `docs/HANDOFF.md`로 추정)
- 본 문서가 그 이후 모든 작업을 덮어 씀

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
| HTML 임포터 | `src/importer/parsePresentation.ts` |
| HTML/PDF/PNG 익스포터 | `src/exporter/{htmlBundle,pngExport}.ts` |
| 자동저장/복원 | `src/persistence/{persistenceStore,useAutoSave,localStore}.ts` |
| brewnet 샘플 CSS | `src/canvas/themes/brewnet-dark.css` |
| 코드 블록 CSS | `src/canvas/themes/code-blocks.css` |
