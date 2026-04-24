# HANDOFF — Session Continuation Note

> 이 문서는 `/clear` 이후 다음 Claude Code 세션이 맥락을 잃지 않고 이어받기 위한 인계 노트다. CLAUDE.md(프로젝트 상시 규칙)와 달리 **지금 이 순간의 진행 상황**만 담는다. 작업이 한 단계 끝날 때마다 갱신한다.

- **Updated**: 2026-04-25
- **Branch**: `main` (로컬이 `origin/main`보다 9 커밋 앞섬 — push 보류 중)
- **Last commit**: `15308e1 chore(ui): rename 'Delete overlay' to 'Delete' in properties panel`

## 완료된 Phase

| Phase | Commit | 결과 |
|---|---|---|
| 0 · Scaffold | `d289416` | Vite + React + TS + Tailwind 셸 + Brewnet 샘플 슬라이드 1280×720 scale-to-fit 렌더 |
| 1a · Edit spike | `8fb2d6a` → `c737ce9` | contenteditable · ⋮⋮ grip 블록 순서 변경(SortableJS) · 이미지 드롭/드래그/리사이즈(Moveable) 동작 검증 |
| 1b · Importer + Store + Nav | `5b06e93` | DOMParser로 `docs/html/presentation/brewnet-presentation.html` 7슬라이드 파싱 → Zustand `useDeckStore` → 사이드바 클릭 전환 + 편집 내용·오버레이 슬라이드별 유지 |
| (refactor) | `7085d8e` | 미사용 `scene/types.ts` 제거, `scene/constants.ts`로 축소 |
| 2a · Slide CRUD | `94105c2` | 툴바 +New / Duplicate / Delete. 300ms debounced DOM→store commit |
| (hotfix) | `07ac377` | debounced commit이 `dangerouslySetInnerHTML` 재주입을 일으켜 타이핑이 끊기고 Backspace가 브라우저 뒤로가기를 트리거하던 버그 해결: `SlideRenderer`가 `initialHtml`을 `useDeckStore.getState()`로 단 한 번만 읽고, `SlideCanvas`는 `slide` 객체 대신 `slideId`만 구독. anchor click preventDefault도 추가 |
| 2b · 편집 범위 확장 + Props | `e112064` → `15308e1` | `.slide-inner`/`.slide-footer` 전체 contenteditable(data-slot 없는 본문도 편집 가능). `<td>/<th>` 편집. 한 줄 슬롯 Enter 차단(IME-safe). BLANK 슬라이드에 body slot 추가. Overlay selection을 store로 이관. 프로퍼티 패널에 선택 이미지의 X/Y/W/H 입력 + Delete 버튼 |

## 현재 동작하는 기능 (브라우저에서 검증됨)

1. 좌측 사이드바 슬라이드 리스트 클릭으로 전환
2. 텍스트/불릿/테이블 셀/페이지 번호/footer 인라인 편집 (IME 한국어 정상)
3. 블록 왼쪽 ⋮⋮ 그립 드래그로 순서 변경
4. 이미지 파일 드롭 → 자유 위치 이미지(오버레이)로 배치
5. 오버레이 클릭 선택 → 드래그 이동 / 모서리 리사이즈 / Esc·빈영역 클릭 해제
6. 우측 프로퍼티 패널에서 선택 오버레이의 X/Y/W/H 숫자 입력 + Delete
7. 툴바 `+ New` / `Duplicate` / `Delete`로 슬라이드 추가/복제/삭제 (편집 내용·오버레이 반영)

## 알려진 한계 / 미처리 항목

- **Undo/Redo 없음** — `.slide-inner` 전체 editable이라 실수로 블록을 통째 지울 수 있음. Ctrl+Z가 contenteditable 내부 텍스트 수준에서만 부분 작동.
- **텍스트 스타일 편집 UI 없음** — 색/굵기/정렬은 원본 CSS의 기존 span 구조(`<span class="hl-amber">` 등)에 의존. 프로퍼티 패널은 현재 이미지 오버레이만 대상.
- **우클릭 컨텍스트 메뉴 없음** — 대신 프로퍼티 패널로 크기/삭제 처리.
- **샘플 CSS scope 격리(Phase 1c) 안 됨** — 현재 `brewnet-dark.css`만 로드 중이라 문제 없지만, manual/report/portfolio 등 다른 샘플 패밀리를 섞을 땐 CSS 선택자 충돌 가능. PostCSS prefix 플러그인 필요.
- **번들 크기 585KB** — `docs/html/presentation/brewnet-presentation.html`(138KB)을 `?raw`로 번들에 포함. Phase 3에서 `public/`로 이관 또는 `fetch` 로딩으로 전환 예정.
- **`keyCode` deprecation 경고** — `useSlideEditing.ts` Enter 가드에서 의도적 사용 (IME 감지 방어책). 빌드 차단 아님.
- **Push 차단** — `main`으로 직접 push는 "PR 리뷰 우회" 정책으로 거부됨. 사용자가 허용하거나 feature 브랜치로 옮겨 PR 생성해야 함.

## 다음 단계 선택지

진행 우선순위는 **사용자 녹화 시점에 임박한 가치**를 기준으로 정리한다.

### 옵션 A — Phase 3 Export (HTML 번들 / PDF / PNG) · 추천
녹화 자료 완성 후 실제로 **결과물을 꺼내 쓰려면 필수**. 다음 세션에서 가장 먼저 착수할 것을 권장.

- HTML 번들: `{ slides, css, overlays }` → 단일 HTML 파일 생성 (overlay 이미지는 base64 embed 또는 별도 asset)
- PDF: 브라우저 `window.print()` + `@page { size: 1920px 1080px; margin: 0; }` + `@media print` 슬라이드 한 장당 한 페이지
- PNG: `html-to-image`로 per-slide 캡처 (1.5배 스케일 → 1920×1080)
- 입구: Toolbar에 "Export ▼" 드롭다운

### 옵션 B — Undo/Redo
편집 중 실수 방어. 구현은 store snapshot 스택(`slides` + `overlaysBySlide`) + Ctrl+Z / Ctrl+Shift+Z 바인딩. DOM 편집은 debounced commit 이후 스냅샷 포인트로.

### 옵션 C — Phase 1c CSS Scope
다른 샘플 패밀리(manual/report 등)를 추가 임포트할 계획이 있으면 먼저 해결. 단일 프레젠테이션이면 후순위.

### 옵션 D — 텍스트 블록 프로퍼티 확장
선택한 텍스트(또는 data-slot)에 대해 색/굵기/폰트 크기를 프로퍼티 패널에서 제어. 원본 CSS custom property 일부를 editable로.

## 바로 실행용 체크리스트 (새 세션 시작 시)

```bash
# 1. 상태 훑기
git log --oneline -5
git status

# 2. 개발 서버
npm run dev        # http://127.0.0.1:5173

# 3. 빌드 검증
npm run build
```

다음 세션에서 해야 할 것:
1. `HANDOFF.md`와 `CLAUDE.md`를 읽어 컨텍스트 복원
2. 사용자에게 옵션 A/B/C/D 중 어느 것을 진행할지 확인
3. 선택된 옵션을 하위 Phase로 쪼개 순차 커밋
4. 이 문서의 "완료된 Phase" 표에 결과 추가, 현재 Phase 표 갱신

## 참고 경로

- `src/canvas/SlideCanvas.tsx` — 캔버스 / 스케일 / 오버레이 drop 진입점
- `src/canvas/SlideRenderer.tsx` — `initialHtml`을 store에서 **한 번만** 읽고 DOM을 소유. 재렌더로 DOM 파괴 금지가 원칙
- `src/canvas/useSlideEditing.ts` — 편집 가능 영역 설정 / SortableJS / IME-safe Enter / anchor click 차단
- `src/canvas/OverlayLayer.tsx` — Moveable 컨테이너는 `document.body` (pointer-events 이슈 회피)
- `src/scene/store.ts` — Zustand deck store, CRUD + overlay + selection
- `src/editor/PropertiesPanel.tsx` — 선택된 오버레이 X/Y/W/H 입력
- `src/editor/Toolbar.tsx` — 슬라이드 CRUD 버튼
- `docs/html/presentation/brewnet-presentation.html` — 현재 로드되는 샘플 (7슬라이드)
