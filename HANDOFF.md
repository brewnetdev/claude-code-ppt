# HANDOFF — Session Continuation Note

> 이 문서는 `/clear` 이후 다음 Claude Code 세션이 맥락을 잃지 않고 이어받기 위한 인계 노트다. CLAUDE.md(프로젝트 상시 규칙)와 달리 **지금 이 순간의 진행 상황**만 담는다. 작업이 한 단계 끝날 때마다 갱신한다.

- **Updated**: 2026-04-25 (Option E · localStorage auto-save 완료)
- **Branch**: `feat/editor-phases-0-through-2b` — push 필요 (ahead 3)
- **Last commit**: `7044b73 feat(persist): localStorage auto-save + auto-load with reset`

## 완료된 Phase

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
| 3 · Export 통일/수정 | `6a32096` | HTML 번들을 세로 스택 + scroll-snap 으로 변경(모든 슬라이드 즉시 노출). PNG → 전체 슬라이드 일괄 (오프스크린 호스트 + 250ms 간격). `.export-overlay { z-index:100; opacity:1 !important }` 로 `.slide-logo`(z=10) 등 슬라이드 내부 요소가 오버레이를 가리던 투명 버그 해결 |
| Undo/Redo | `0f16234` | store에 `past[]`/`future[]` 스냅샷 스택(50). `revision` 카운터가 undo/redo에서만 증가 → `SlideRenderer key={slideId:revision}` 으로 강제 재마운트(일반 편집은 카운터 미증가 → 커서 보존). 툴바 ↶/↷ + 키보드 Cmd/Ctrl+Shift+Z (undo) / Cmd/Ctrl+Y (redo). 단독 Cmd/Ctrl+Z 는 브라우저 contenteditable native undo 보존을 위해 의도적으로 가로채지 않음 |
| Text Props | `b86a6bc` | `src/editor/TextFormatPanel.tsx` 추가. 선택이 캔버스 내부일 때만 활성. B/I/U(execCommand) + 4색 highlight (`hl-amber/blue/green/cyan` — cyan은 신규 추가) 토큰 기반 wrap. Clear 버튼은 hl-* 클래스 strip. 모든 버튼은 `mousedown` preventDefault 로 캔버스 selection 보존 |
| (docs) | `cab83e5` | HANDOFF 인계 노트 갱신 (Phase 3 / Undo-Redo / Text-Props) |
| Option E · Persistence | `7044b73` | `src/persistence/{localStore,persistenceStore,useAutoSave}.ts` 추가. v1 스키마(`claude-code-ppt:deck:v1`) — slides/overlaysBySlide/currentIndex 직렬화, blob URL → base64 인라이닝. 800ms debounced auto-save (slides/overlays/index ref 변경 시에만). store에 `loadDeckFull` 추가. App boot: localStorage 우선 → 없으면 sample HTML. Toolbar에 `SaveIndicator` (Saved Xs ago / Saving… / Save failed)와 `Reset` 버튼(confirm 후 storage clear + 샘플 재로드) |

## 현재 동작하는 기능 (브라우저에서 검증 필요 — Phase 3 이후는 정적 빌드만 통과)

1. 좌측 사이드바 슬라이드 리스트 클릭으로 전환
2. 텍스트/불릿/테이블 셀/페이지 번호/footer 인라인 편집 (IME 한국어 정상)
3. 블록 왼쪽 ⋮⋮ 그립 드래그로 순서 변경
4. 이미지 파일 드롭 → 자유 위치 이미지(오버레이)로 배치
5. 오버레이 클릭 선택 → 드래그 이동 / 모서리 리사이즈 / Esc·빈영역 클릭 해제
6. 우측 프로퍼티 패널에서 선택 오버레이의 X/Y/W/H 숫자 입력 + Delete
7. 툴바 `+ New` / `Duplicate` / `Delete`로 슬라이드 CRUD
8. **Export HTML / Export PDF / PNG (all)** — 모두 1920×1080 결과
9. **↶ Undo / ↷ Redo** + 키보드 단축키 (Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y)
10. **텍스트 선택 시 B/I/U + 4색 highlight + Clear**
11. **localStorage auto-save** (변경 후 800ms) + 새로고침 시 자동 복원, **Reset** 버튼으로 초기화

## 알려진 한계 / 미처리 항목

- **샘플 CSS scope 격리(Phase 1c) 안 됨** — 현재 `brewnet-dark.css`만 로드 중이라 문제 없지만, manual/report/portfolio 등 다른 샘플 패밀리를 섞을 땐 CSS 선택자 충돌 가능. PostCSS prefix 플러그인 필요.
- **번들 크기 ~625KB** — `brewnet-presentation.html`(138KB) `?raw` import + html-to-image + Moveable 등 합산. 향후 동적 import 또는 manualChunks 분리 고려.
- **`keyCode` deprecation 경고** — `useSlideEditing.ts` Enter 가드에서 의도적 사용 (IME 감지 방어책). 빌드 차단 아님.
- **`document.execCommand` deprecation 경고** — `TextFormatPanel.tsx`에서 사용. 모던 대안(Range API + Selection 직접 조작)으로 마이그레이션은 후순위.
- **localStorage 5MB 한도** — 이미지 base64 인라이닝으로 인해 큰 이미지를 여러 장 드롭하면 QuotaExceededError. SaveIndicator에 "Save failed"가 뜨면 IndexedDB로 마이그레이션 필요(향후 옵션).

## 다음 단계 선택지

### 옵션 F — Slide 사이드바 정렬(드래그) · 추천
사이드바에서 슬라이드 순서를 드래그로 바꾸기. SortableJS 또는 react-dnd. store에 `reorderSlide(from, to)` 추가.

### 옵션 G — Slide Templates 갤러리
`+ New` 누르면 빈 슬라이드 대신 템플릿 선택 (cover / section / body / table / quote / TOC ...). `docs/html/presentation/brewnet-presentation.html`의 7슬라이드를 분해해 템플릿화.

### 옵션 H — Phase 1c CSS Scope
다른 샘플 패밀리(manual/report 등)를 추가 임포트할 계획이 있으면 먼저 해결. 단일 프레젠테이션이면 후순위.

### 옵션 I — 폰트 사이즈 / 정렬 조작
TextFormatPanel 확장: A+/A−, left/center/right align. inline `style="font-size:Npx"` 또는 텍스트 wrapper 클래스.

## 바로 실행용 체크리스트 (새 세션 시작 시)

```bash
# 1. 상태 훑기
git log --oneline -8
git status

# 2. 개발 서버
npm run dev        # http://127.0.0.1:5173

# 3. 빌드 검증
npm run build
```

새 세션에서 해야 할 것:
1. `HANDOFF.md` 와 `CLAUDE.md` 읽어 컨텍스트 복원
2. 사용자에게 옵션 F/G/H/I 중 어느 것을 진행할지 확인 (auto 모드면 F 부터)
3. 선택된 옵션을 하위 Phase로 쪼개 순차 커밋
4. 이 문서의 "완료된 Phase" 표 갱신

## 참고 경로

- `src/canvas/SlideCanvas.tsx` — 캔버스 / 스케일 / 오버레이 drop 진입점. SlideRenderer key는 `slideId:revision`
- `src/canvas/SlideRenderer.tsx` — `initialHtml`을 store에서 **한 번만** 읽고 DOM을 소유. 재렌더로 DOM 파괴 금지가 원칙
- `src/canvas/useSlideEditing.ts` — 편집 가능 영역 설정 / SortableJS / IME-safe Enter / anchor click 차단
- `src/canvas/OverlayLayer.tsx` — Moveable 컨테이너는 `document.body` (pointer-events 이슈 회피)
- `src/scene/store.ts` — Zustand deck store, CRUD + overlay + selection + undo/redo + revision
- `src/editor/PropertiesPanel.tsx` — TextFormatPanel + 오버레이 X/Y/W/H 입력
- `src/editor/TextFormatPanel.tsx` — 선택 기반 B/I/U + hl-* highlight
- `src/editor/Toolbar.tsx` — 슬라이드 CRUD + Undo/Redo + Export 3종 (accent tone)
- `src/exporter/htmlBundle.ts` — 세로 스택 HTML 번들 + 자동 print + scroll-snap
- `src/exporter/pngExport.ts` — `exportAllSlidesPng()` (offscreen 1280×720 → 1920×1080)
- `src/persistence/localStore.ts` — `claude-code-ppt:deck:v1` save/load/clear, blob→base64 인라이닝
- `src/persistence/useAutoSave.ts` — 800ms debounced subscriber, slides/overlays/index ref 변경시에만 save
- `src/persistence/persistenceStore.ts` — `lastSavedAt` / `lastError` / `saving` zustand
- `docs/html/presentation/brewnet-presentation.html` — 현재 로드되는 샘플 (7슬라이드)
