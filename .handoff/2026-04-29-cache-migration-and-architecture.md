# Handoff: Cache Migration & Architecture Discussion
**Session date**: 2026-04-29
**Branch**: `develop`
**Author**: Claude (claude-sonnet-4-6)

---

## 1. 이번 세션에서 한 일

### 1-1. TextFormatPanel — 현재 폰트 사이즈/색 자동 검출
**파일**: `src/editor/TextFormatPanel.tsx`

- `selectionchange` 이벤트에서 `getComputedStyle(anchorNode)` 로 현재 포커스된 텍스트의 폰트 사이즈와 배경색을 검출.
- `rgb(r, g, b)` → `#RRGGBB` 변환 헬퍼 추가 (브라우저가 `getComputedStyle`로 항상 `rgb()` 형식을 반환하기 때문).
- **버그 수정**: 폰트 사이즈 input 이 controlled 상태인데 `selectionchange` 가 사용자의 타이핑 도중 값을 덮어쓰는 문제 발생. `lastDetectedFontSize` ref로 idempotency 가드 추가 (값이 실제로 달라질 때만 setState 호출).

### 1-2. 터미널/코드 블록 텍스트 밝기 향상
**파일**: `src/canvas/themes/code-blocks.css`

- 기본 코드 텍스트 색을 `#cbd5e1` → `#f1f5f9` 로 밝게 변경.
- shiki `github-dark` 테마가 렌더하는 주석 토큰은 두 가지 hex 를 쓴다는 걸 직접 probe 로 확인:
  - 레거시 버전: `#6A737D`
  - 신버전: `#8b949e`
  - 두 형태 모두 `[style*="#6A737D" i]` 패턴의 attribute 셀렉터 + `!important` 로 `#b0b1b2` 톤으로 override.
- `.code-block pre code`, `.terminal pre code` 에 `filter: brightness(1.18) saturate(1.05)` 추가 — shiki 인라인 스타일(attribute)은 선택자로 개별 override 불가능한 게 많아서, filter 로 통째로 들어올리는 전략 채택.

### 1-3. 터미널/코드블록 위 드래그 핸들 재배치
**파일**: `src/canvas/spike.css`

- **문제**: `.terminal`, `.code-block` 요소는 `overflow: hidden` 이 걸려 있어서, 기존 핸들 위치인 `left: -44px` 가 잘려 렌더되지 않음 → reorder 불가.
- **해결**: 터미널/코드블록 슬롯을 감싸는 데이터 속성 조합 (`[data-slot="terminal"] .terminal`, `[data-slot="code"] .code-block`) 을 셀렉터로 타겟해, 해당 블록 안에서만 핸들을 우상단 내부 (`right: 8px; top: 8px; left: auto`) 로 재배치하는 override 추가.

### 1-4. `<th>` 셀에서 `<strong>` 등이 literal 텍스트로 출력되던 버그 수정
**파일**: `src/generator/planRenderer.ts`

- **원인**: `renderComparisonTable`(line 222) 과 `renderTable`(line 292) 의 `<th>` 생성 경로가 `escapeHtml`(완전 escape) 을 사용 중 — `<strong>`, `<em>` 등 인라인 마크업이 그대로 `&lt;strong&gt;` 으로 출력됨.
- **해결**: `<th>` 경로를 `<td>` 와 동일하게 `escapeInlineHtml`(allowlist: `strong | em | span | br | code`) 로 교체. 두 군데 모두 수정.

### 1-5. 캐시(localStorage) 내 깨진 HTML 자동 보정 — 마이그레이션 시스템
**신규 파일**: `src/persistence/slideMigrations.ts`

Migration 인프라 설계:
```
Migration = {
  name: string,          // 식별자 (중복 적용 방지 키)
  description: string,
  apply: (slides) => ParsedSlide[]
}

ALL_MIGRATIONS: Migration[]  // 순서 보장 배열
```

첫 마이그레이션 `unescape-th-inline-tags-2026-04-29`:
- `<th>...</th>` 셀 내부에서만 `&lt;(strong|em|span|br|code)[^&]*&gt;` 패턴을 실제 태그로 복구.
- 닫는 태그 `&lt;/strong&gt;` 패턴도 동일하게 복구.
- 슬라이드 HTML 전체를 string replace 하는 게 아니라 `<th>` 블록만 정규식으로 추출 후 그 내부에만 적용 (오탐 방지).

적용 이력 관리:
- `localStorage` 키: `claude-code-ppt:deck-migrations:<deckId>`
- 값: 이미 적용된 migration name 배열 (JSON).
- 새 세션에서 로드할 때, 아직 적용 안 된 migration 만 순서대로 실행.

**수정 파일**: `src/App.tsx` (`openDeck` 함수)
- `loadDeckFromLocalStorage` 직후 `runSlideMigrations(slides, deckId)` 호출.
- `changed === true` 인 경우 `saveDeckToLocalStorage` 로 즉시 재기록 → 다음 로드부터는 이미 정상 HTML.
- 이후 `upgradeSlideCodeBlocks` / `loadDeckFull` 흐름은 그대로 유지.

`npm run typecheck` 통과 확인.

---

## 2. 미해결 / 다음 세션에서 결정해야 할 것

### 핵심 결정 사항: localStorage 전략 아키텍처

사용자가 세션 말미에 현재 구조의 근본적 문제를 제기했다:

> "코드가 수정될 때마다 캐시를 reset 해야 하는 구조는 잘못됐다. 사용자 편집을 보존하면서도 소스 코드 변경이 자동 반영되는 구조를 고민해봐."

제시한 세 가지 안:

#### Option A — Edit Layer (Patch-based) [추천]
캐시에 렌더된 HTML 전체 대신, 사용자 편집 op 리스트만 저장.

```typescript
type EditOp =
  | { blockId: string; op: 'set-text'; value: string }
  | { blockId: string; op: 'set-html'; value: string }
  | { blockId: string; op: 'reorder'; newIndex: number }
  | { blockId: string; op: 'delete' }
```

로드 흐름:
1. 소스 HTML 파싱 (항상 최신 planRenderer 결과)
2. block-id 로 op 매핑 → 사용자 편집만 적용
3. 렌더러 버그 수정/테마 변경이 자동 반영, 사용자 편집은 그대로

장점: 가장 깔끔. 구조적으로 코드 변경과 사용자 데이터 분리.
단점: block-id 체계 도입 필요 (현재 `data-slot` 에 일부 있음), op 타입을 점진적으로 확장해야 함.

#### Option B — Scene-as-Truth
타입드 `SlideScene` 모델이 진실의 원천. HTML은 model→HTML 렌더의 결과물.

장점: 가장 올바른 설계.
단점: 현재 코드베이스에서 큰 리팩토링 필요. Phase 2 수준 작업.

#### Option C — sourceHash + 자동 migration chain (현재 방식 + α)
현재 migration 시스템을 유지하면서, 소스 hash 변경 시 관련 migration 을 자동으로 실행.

장점: 현재 인프라 재활용.
단점: migration 작성 부담, 언제까지나 누적. 근본 해결 아님.

**사용자 결정 대기 중.** 다음 세션 시작 시 이 결정을 먼저 해야 함.

---

## 3. 다음 세션 결정 및 작업 우선순위

1. **아키텍처 결정** (Option A / B / C 중 선택)
2. 선택에 따라:
   - **A 선택 시**: `block-id` 체계 확립 → `EditOpStore` 구현 → `openDeck` 흐름 교체
   - **B 선택 시**: `SlideScene` 타입 정의 → importer 리팩토링 → HTML 렌더러 분리
   - **C 선택 시**: migration 체인 확장 (sourceHash 연동)
3. (독립적) Phase 2 편집 UX: 불릿 아이템 단위 편집, 테이블 셀 편집, undo/redo

---

## 4. 관련 파일 목록

| 파일 | 상태 | 역할 |
|------|------|------|
| `src/editor/TextFormatPanel.tsx` | 수정 | 폰트 사이즈/색 자동 검출 |
| `src/canvas/themes/code-blocks.css` | 수정 | 터미널 텍스트 밝기 override |
| `src/canvas/spike.css` | 수정 | 드래그 핸들 재배치 (터미널/코드블록) |
| `src/generator/planRenderer.ts` | 수정 | `<th>` inline HTML escape 버그 수정 |
| `src/persistence/slideMigrations.ts` | 신규 | 캐시 자동 보정 migration 시스템 |
| `src/App.tsx` | 수정 | `openDeck` 에 migration 훅 추가 |

---

## 5. 현재 Phase 상태

```
Phase 0 — Scaffold               ✓
Phase 1a — Edit spike            ✓
Phase 1b — Importer + store + nav ✓
Phase 1c — CSS scope isolation   ✓
Phase 2 — Editing UX             진행 중 (불릿 granular edit 완료, 테이블/undo 미완)
Phase 3 — Persistence + Export   일부 완료 (HTML/PDF export, JSON save/load)
아키텍처 결정                     다음 세션 필수
```
