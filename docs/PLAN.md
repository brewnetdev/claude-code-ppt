# PLAN — 남은 작업 (2026-04-27 시작)

> 매일 아침 가장 먼저 읽는 행동 플랜. 진행 상황은 체크박스로 마킹하고, 끝난 항목은 `docs/handoff.md` §3에 옮긴다.
>
> 진입 컨텍스트: `feat/editor-phases-0-through-2b` 브랜치, 미커밋 M 12 + ?? 12, typecheck ✓ / vitest 17/17 PASS.

---

## P1 — 브라우저 검증 (40분, 내일 첫 행동) 🔴

portfolio 템플릿 + BUILTIN_DECKS 샘플 2개가 실제 동작하는지 눈으로 확인. 코드 변경은 발견될 때만.

### Tasks

- [ ] `npm run dev` → http://127.0.0.1:5173
- [ ] 라이브러리 화면에 카드 4개 보임 (brewnet / design-patterns / slideplan-presentation / slideplan-portfolio)
- [ ] **slideplan-sample-presentation 클릭**:
  - [ ] 9슬라이드 (cover / section / 7개 본문)
  - [ ] 코드블록에 shiki 토큰 색상(다크 BG + 컬러 syntax) 적용됨
  - [ ] `.code-block` / `.terminal` 좌상단에 빨/노/초 dots 3개
  - [ ] 텍스트 인라인 편집, 블록 reorder, 오버레이 드래그 동작
- [ ] ← Library → **slideplan-sample-portfolio 클릭**:
  - [ ] 동일 9슬라이드 (마크업 같음)
  - [ ] 화이트 BG + 블루(#3D5AF1) 액센트
  - [ ] cover는 블루 배경에 흰 텍스트
  - [ ] 코드블록은 의도적으로 다크 박스 유지(흰 카드 대비 가독성)
  - [ ] DevTools에서 `<div class="slide" data-template="portfolio">` 어트리뷰트 박힘 확인

### 실패 시 디버그 순서

1. 카드가 안 보임 → `src/library/deckRegistry.ts`의 import 경로 확인 (`docs/html/portfolio/slideplan-sample.html`)
2. 카드는 있는데 portfolio CSS 안 먹힘 → DevTools Elements에서 `data-template="portfolio"` 어트리뷰트 박혔는지
3. 어트리뷰트는 있는데 CSS 안 먹힘 → `src/canvas/SlideRenderer.tsx`에 `import './themes/portfolio.css'` 라인 있는지
4. shiki/dots 안 붙음 → `App.openDeck`에서 `upgradeSlideCodeBlocks` 호출되는지 console.log
5. 슬라이드 카운트가 9 미만 → `parsePresentation`이 `<div class="slide">`만 추출하는데 cover/section은 `class="slide slide-cover"` — 이건 정상(class 시작이 "slide" 이므로 매칭)

### 결과물

- [ ] §3.8의 검증 체크리스트 4개 모두 통과 → handoff.md §3.7/3.8을 _미커밋_ → _완료_로 갱신

---

## P2 — report 템플릿 (3시간)

portfolio에서 검증된 패턴을 그대로 따라간다. 코드는 이미 template-aware라 CSS + 회귀 + 문서만.

### Step 1 — 디자인 토큰 추출 (30분)

- [ ] `docs/html/report/*.html` 3종 검토 (모두 inline `<style>` 들어있음)
- [ ] 공통 토큰 추출:
  - 배경/텍스트/액센트 색
  - 표 스타일 (report는 표/데이터 위주)
  - heading 스케일
  - 차트 placeholder 영역 처리

### Step 2 — `src/canvas/themes/report.css` 작성 (45분)

- [ ] portfolio.css 구조 그대로 복사
- [ ] selector를 `[data-template="report"]`로 일괄 치환
- [ ] 토큰 재정의:
  - `--bg`, `--text`, `--amber`, `--blue` 등 brewnet-dark 토큰을 report 톤(아마 화이트 + 진한 차분한 블루/그린)으로
  - `.tbl` 강조 (report는 표 중심 — header bold, zebra row 등)
  - `.code-block`/`.terminal`은 portfolio와 동일하게 다크 유지 (가독성)
- [ ] cover/section 슬라이드용 분기 토큰

### Step 3 — 파이프라인 연결 (15분)

- [ ] `src/canvas/SlideRenderer.tsx`에 `import './themes/report.css'` 추가
- [ ] `scripts/slideplan.ts`의 `THEME_CSS_PATHS` 배열에 `'src/canvas/themes/report.css'` 추가

### Step 4 — 회귀 테스트 (30분)

- [ ] `tests/generator/planRenderer.test.ts`에 세 번째 describe 블록 추가
  ```ts
  describe('renderPlan — report template (same plan, different data-template)', () => {
    const reportRaw = { ...raw, template: 'report' };
    // 동일 어서션: data-template="report" 매칭, 마크업 카운트 동일
  });
  ```
- [ ] `npm run test` → 17/17 → 20/20 PASS 확인 (e2e 3 + planRenderer 14 + portfolio 3)

### Step 5 — 스킬/가이드 갱신 (45분)

- [ ] `.claude/skills/md-to-slidedeck/SKILL.md`:
  - "Template selection" 표에서 report 행의 *(not yet shipped)* 제거
  - 추론 규칙: "표 ≥ 2 + KPI/ROI/Q1/Q2/매출/지표 헤딩 → report" 활성
  - "report theme not shipped" abort 코드 제거
- [ ] `docs/guide/skills.md` §2.2.1 동일 갱신
- [ ] `docs/guide/AUTHORING_RULES.md` §6.5에 report 항목 추가 (권장: comparison-table 다수, callout-summary로 KPI 박스, references 끝맺음 / 회피: 코드블록 다수, two-col-code)

### Step 6 — BUILTIN_DECKS 샘플 추가 (15분)

- [ ] `.tmp/sample-plan-report.json`을 fixture에서 swap으로 생성
- [ ] `node_modules/.bin/tsx scripts/slideplan.ts render .tmp/sample-plan-report.json`
- [ ] `docs/html/report/slideplan-sample.html`로 복사
- [ ] `src/library/deckRegistry.ts`에 `slideplan-sample-report` 카드 추가 — 라이브러리 카드 5장 됨
- [ ] `npm run dev`로 카드 클릭 검증

### 완료 조건

- [ ] vitest 20/20 PASS
- [ ] typecheck ✓
- [ ] 라이브러리 카드 5장, report 카드 클릭 시 정상 렌더 + 코드블록 효과

---

## P3 — 분할 커밋 (1시간)

미커밋 working state를 논리 단위로 7개 커밋으로 쪼개기. push 전에 typecheck + vitest 한 번씩.

### Commit 순서

1. **`chore(infra)`**: `.gitignore`(`.tmp/`, `.quality-runs/` 추가), `vitest.config.ts`, `package.json`/`package-lock.json`(deps), `docs/sample/` 3개 MD
2. **`feat(generator)`**: SlidePlan 파이프라인 본체
   - `src/generator/**` (디렉터리 전체 신규)
   - `src/importer/upgradeCodeBlocks.ts`
   - `src/highlight/highlighter.ts`(java 추가)
   - `tests/generator/**`
3. **`feat(cli)`**: `scripts/slideplan.ts`, `scripts/run-quality-loop.ts`, `scripts/render-plan-fixture.ts`
4. **`feat(library)`**: 라이브러리 UI
   - `src/library/**`
   - `src/editor/DeckLibraryView.tsx`
   - `src/App.tsx` (모드 분기)
   - `src/editor/Toolbar.tsx` (← Library 버튼)
   - `src/persistence/{localStore,useAutoSave}.ts` (deck-id-scoped)
   - `docs/html/presentation/design-patterns.html`
5. **`feat(theme): portfolio template`**: portfolio 템플릿
   - `src/canvas/themes/portfolio.css`
   - `src/canvas/SlideRenderer.tsx` (import 추가)
   - `src/library/deckRegistry.ts` (+2 entry)
   - `docs/html/{presentation,portfolio}/slideplan-sample.html`
6. **`docs(skill)`**: 스킬 + 가이드 문서
   - `.claude/skills/md-to-slidedeck/SKILL.md`
   - `docs/guide/AUTHORING_RULES.md`
   - `docs/guide/skills.md`
   - `docs/handoff.md`
   - `docs/PLAN.md` (이 파일)
7. **`fix(editor)`**: 잡종 버그/UX
   - `src/editor/BlockFormatPanel.tsx` (X/Y drift fix)
   - `src/editor/PropertiesPanel.tsx` (컬랩스)

### 검증

- [ ] 각 커밋 후 `git status` 깨끗
- [ ] `npm run typecheck` 성공
- [ ] `node_modules/.bin/vitest run` 20/20(P2 끝) 또는 17/17(P2 미수행) PASS
- [ ] `git log --oneline main..HEAD` 7개 새 커밋
- [ ] 사용자 확인 후 `git push origin feat/editor-phases-0-through-2b`

---

## P4 — 테스트 갭 메우기 (2시간, 시간되면)

### portfolio 전용 *MD* 픽스처

현재는 fixture를 in-memory로 swap만 함. 진짜 portfolio용 산문 MD를 만들어 e2e 회귀 추가.

- [ ] `tests/generator/fixtures/sample-portfolio.md` 신규 — heading + 산문 위주 + references ≥ 3 + 표 ≤ 1 + 코드 fence 0
- [ ] `tests/generator/fixtures/sample-portfolio-plan.json` 신규 — 위 MD에 대한 hand-authored plan
- [ ] `planRenderer.test.ts`에 네 번째 describe — 위 fixture 검증

### `validateSlidePlan` 단위 테스트

negative case 회귀. 깨뜨려야 깨끗함이 보장됨.

- [ ] `tests/generator/validateSlidePlan.test.ts` 신규
- [ ] 깨뜨리는 케이스:
  - cover 없는 plan → `slides[0].type !== 'cover'` 에러
  - section.num 중복 → unique 에러
  - reference href = `mailto:foo` → https 에러
  - comparison-table.headers.length=3, rows[0].length=2 → column count mismatch
  - two-col-code의 left/right 모두 paragraph만 → 에러

### standalone HTML CSS 인라인 회귀

`slideplan render` 결과에 portfolio.css 토큰이 실제로 박혀있는지.

- [ ] `tests/generator/standaloneHtml.test.ts` 신규
- [ ] portfolio plan을 render → 결과 HTML에 `--amber: #3D5AF1` 또는 `[data-template="portfolio"] {` 문자열 grep

---

## P5 — in-app LLM 호출 경로 (1일)

브라우저 드래그-드롭 UI에서 MD 업로드 → SlidePlan 자동 작성 → 라이브러리에 데크 추가.

### Tasks

- [ ] `src/generator/llm/authorPlan.ts` 신규
  - Anthropic SDK
  - 시스템 프롬프트: `docs/guide/AUTHORING_RULES.md` 본문 + Template selection 규칙
  - 사용자 프롬프트: MD 본문 + "template=X로 작성하라"
  - response_format: JSON
  - `validateSlidePlan` 실패 시 errors 배열을 다음 호출에 첨부 → 최대 3회
- [ ] `src/library/deckLibrary.ts` 수정 — 사용자 데크를 `data/decks/<id>.json`에 저장 (handoff §3 #10에 데이터 모델 정의)
- [ ] `src/editor/DeckLibraryView.tsx` 수정 — 우측 1/3에 MD upload 영역, 템플릿 라디오 3개, Generate 버튼
- [ ] API 키: localStorage 또는 Vite env (`VITE_ANTHROPIC_API_KEY`)

### 비용

- 8–14 슬라이드 데크 1개당 Sonnet 4.6 기준 $0.02–0.05
- typecheck, validate retries는 모두 LLM 호출 — 3회 retry 시 최악 $0.15

---

## P6 — 슬라이드 배경 컨트롤 (반나절)

- [ ] `src/scene/store.ts`의 `ParsedSlide`에 `background?: { kind: 'color'; value: string } \| { kind: 'image'; url: string; fit: 'cover' \| 'contain' }` 추가
- [ ] `SlideRenderer`가 background 적용 — `.slide` 인라인 style 또는 `data-bg-*` 어트리뷰트
- [ ] `BlockFormatPanel` 또는 새 `SlidePropertiesPanel`에 배경 컨트롤 (color picker + 이미지 드롭)
- [ ] export 회귀 — html-bundle / PDF / PNG 모두 배경 살아있는지

---

## P7 — Phase 1c CSS scope 격리 (deferred)

portfolio + report가 `[data-template]` 어트리뷰트로 잘 격리되고 있어 당장은 필요 없음. manual 템플릿 도입 또는 user-supplied CSS 허용 시점에 다시 고려.

---

## P8 — Phase 2 추가 UX (P1–P5 후)

- 텍스트 회전
- 폰트 패밀리 확장
- 폰트 사이즈/정렬
- 그라디언트 / 보더 / 그림자 컨트롤

---

## 정리(retire) 후보

- **TaskList #9** "Run /loop quality cycle until PASSED" — 레거시 어댑터(`src/generator/retry.ts`) 경로. SlidePlan 결정론 파이프라인으로 사실상 대체. e2e.test.ts 3/3 PASS 상태 유지하면서 task만 close.
- `scripts/run-quality-loop.ts` — 동일 이유로 retire 가능. 단, 레거시 어댑터의 채점 게이트는 새 경로에서 미구현이므로 *문서화된 폐기 예정*으로 두는 것도 선택.

---

## 추천 진행 순서

```
오늘(P1, 40분) → P2(report, 3시간) → P3(분할 커밋, 1시간)
   = 한 영업일 분량
```

P1이 깨지면 → P2 시작 전에 fix (portfolio 회귀가 의심됨)
P1 통과 → P2 진행 → P3 정리 → 다음 날 P4(테스트)/P5(LLM) 중 선택

P5는 무게가 크고 외부 의존(API 키, 비용)이라 별도 PR로 분리 권장.
