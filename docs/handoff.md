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

---

## 3. 이번 세션에서 완료한 작업 (커밋 단위)

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

1. 좌측 사이드바 슬라이드 리스트 클릭으로 전환 (썸네일 포함)
2. 텍스트/불릿/테이블 셀/페이지 번호/footer 인라인 편집 (IME 한국어 정상)
3. 블록 왼쪽 ⋮⋮ 그립 드래그로 순서 변경
4. 이미지 파일 드롭 → 자유 위치 이미지(오버레이)로 배치
5. 오버레이 클릭 선택 → 드래그 이동 / 모서리 리사이즈 / Esc·빈영역 클릭 해제
6. 우측 프로퍼티 패널에서 선택 오버레이의 X/Y/W/H 숫자 입력 + Delete
7. 툴바 `+ New` / `Duplicate` / `Delete`로 슬라이드 CRUD
8. **Export HTML / Export PDF / PNG (all)** — 모두 1920×1080 결과
9. **↶ Undo / ↷ Redo** + 키보드 단축키 — `Cmd/Ctrl+Z` undo · `Cmd/Ctrl+Shift+Z` 또는 `Cmd/Ctrl+Y` redo (텍스트 / 블록 reorder / 오버레이 drag·resize / 슬라이드 reorder 모두)
10. **텍스트 선택 시 B/I/U + 4색 highlight + Clear**
11. **localStorage auto-save** (변경 후 800ms) + 새로고침 시 자동 복원, **Reset** 버튼으로 초기화
12. **사이드바 ⋮⋮ 드래그**로 슬라이드 순서 변경 (활성 슬라이드 자동 추적)
13. **코드 블록 / 터미널 템플릿** 삽입 + shiki 신택스 하이라이팅 + Properties 패널에서 언어 전환/코드 편집
14. **캔버스 줌 컨트롤** (25–200%, Fit 버튼)

---

## 6. 알려진 이슈 / 트레이드오프

| 이슈 | 영향 | 회피 |
|---|---|---|
| 줌 컨트롤 세션 휘발성 | 새로고침 시 100%로 복귀 | localStorage 저장 추가 시 `usePersistenceStore` 또는 별도 key |
| 줌 200% 시 일부 잘림 | wrapper `overflow-hidden`으로 가려짐 | `overflow: auto`로 바꿀지 결정 필요 (스크롤바 노출) |
| 샘플 CSS scope 격리(Phase 1c) 미완 | `brewnet-dark.css`만 로드 중이라 지금은 문제 없음; manual/report/portfolio 섞으면 CSS 선택자 충돌 가능 | PostCSS prefix 플러그인 필요 |
| 번들 크기 ~675KB | `brewnet-presentation.html`(138KB) `?raw` + html-to-image + Moveable + shiki grammar 청크 합산 | 동적 import / manualChunks 분리 고려 |
| `keyCode` deprecation 경고 | `useSlideEditing.ts` Enter 가드에서 IME 감지용 의도적 사용 | 빌드 차단 아님 |
| `document.execCommand` deprecation 경고 | `TextFormatPanel.tsx`에서 사용 | 모던 Range API 마이그레이션은 후순위 |
| localStorage 5MB 한도 | 큰 이미지 여러 장 드롭 시 QuotaExceededError; SaveIndicator "Save failed" 노출 | IndexedDB 마이그레이션 (향후 옵션) |
| Milvus는 Docker Desktop 필수 | Docker 꺼지면 멈춤 | Docker Desktop autostart |
| `docs/DEPLOY_VERCEL.md` 삭제 + `docs/guide/DEPLOY_VERCEL.md` 추가 미커밋 | 한 번에 묶어 commit 필요 | `git add docs/ && git commit -m "docs: relocate guides to docs/guide/"` |
| `docs/images/책-투명.png` 삭제됨 | 의도적인지 확인 필요 | `git status`로 확인 |

---

## 7. 남은 작업 (우선순위 순)

### 우선순위 1: 슬라이드 배경 컨트롤

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
- **폰트 사이즈 / 정렬**: TextFormatPanel 확장 — A+/A−, left/center/right align. inline `style="font-size:Npx"` 또는 텍스트 wrapper 클래스.
- **그라디언트 / 보더 / 그림자**: ColorPicker 확장 또는 별도 섹션.

### 우선순위 4: Slide Templates 갤러리

- `+ New` 누르면 빈 슬라이드 대신 템플릿 선택 (cover / section / body / table / quote / TOC 등).
- `docs/html/presentation/brewnet-presentation.html`의 7슬라이드를 분해해 템플릿화.

### 그 외 (TaskList 미완료)

- `#4`. Phase 2: PPT-like editing UX (위 항목들로 분해됨)
- `#7`. Phase 1c: Sample CSS scope isolation via PostCSS prefix

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

### 권장 첫 행동

1. `git status` — 미커밋 변경사항(docs 이동, 이미지 삭제) 확인 → 묶어 커밋할지 사용자에게 확인
2. `git push origin feat/editor-phases-0-through-2b` — 11개 미푸시 커밋 사용자에게 확인 후 푸시
3. 다음 작업이 "슬라이드 배경 컨트롤"이면 — 먼저 `src/scene/store.ts`의 `ParsedSlide` 타입과 `src/canvas/SlideRenderer.tsx`의 렌더 흐름 점검
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
| 샘플 HTML | `docs/html/presentation/brewnet-presentation.html` |
