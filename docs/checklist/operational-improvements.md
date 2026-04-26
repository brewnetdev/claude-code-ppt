# 운영성 개선 체크리스트

본 문서는 SKILL ↔ 코드베이스 결합 개선 라운드의 운영성 작업을 추적합니다.
구현 순서: **registry 자동 발견 → 빌트인 덱 회귀 가드 → CI 헬스체크**.

## 작업 1 — Registry 자동 발견 (Vite glob 기반)

- [x] `src/library/deckRegistry.ts`를 `import.meta.glob`로 교체
  - 경로 패턴: `../../docs/html/{presentation,portfolio,report}/**/*.html`
  - `query: '?raw', import: 'default', eager: true`
- [x] 5개 원본 데크의 안정 ID/타이틀/서브타이틀을 override 맵으로 보존
  - `ID_OVERRIDES`, `TITLE_OVERRIDES`, `SUBTITLE_OVERRIDES`, `PRIORITY`
- [x] 신규 데크는 `<title>` regex + `<meta name="subtitle">`로 메타데이터 자동 추출
- [x] `countSlides()` 정규식 버그 수정 — `class="slide slide-cover"` 같은 다중 클래스 변형 지원 (classlist 토큰 매칭)
- [x] `scripts/slideplan.ts`에 `publish` 서브커맨드 추가
  - `<deck-id>` 검증 (`^[a-z0-9][a-z0-9-]*$`, 길이 ≤ 64)
  - `<meta name="subtitle">` 자동 주입
  - `--force` 플래그로 덮어쓰기 옵션
- [x] `.claude/skills/md-to-slidedeck/SKILL.md` Step 6 업데이트 — 수동 registry 편집 → `slideplan publish` CLI

## 작업 2 — 빌트인 덱 파싱 회귀 가드

- [x] `tests/library/builtinDecks.test.ts` 신규 작성
- [x] 11개 빌트인 데크 전부 검증
  - `parsePresentationHTML(deck.html)` 미실패
  - `countSlides(deck.html)` 결과와 파서 슬라이드 수 일치
  - 각 슬라이드 `html`이 `<div class="slide` 포함
  - 슬라이드에 `data-template`이 있으면 `deck.template`와 일치
- [x] 코드 헤비 데크 회귀 가드 (`design-patterns`, `slideplan-sample-presentation`)
  - 최소 1개의 `<div class="code-block">` 보존 검증 — shiki 업그레이드 경로의 카나리
- [x] vitest Node 환경에서 동작하도록 JSDOM `DOMParser` 와이어업 (`beforeAll`)
- [x] 14/14 케이스 PASS — `npx vitest run tests/library/builtinDecks.test.ts`

## 작업 3 — GitHub Actions CI 헬스체크

- [x] `.github/workflows/ci.yml` 신규 작성
- [x] 트리거: `push` (main, develop) + `pull_request`
- [x] 단일 ubuntu-latest + Node 20 잡
- [x] 게이트 4단계: `npm ci` → `npm run typecheck` → `npx vitest run` → `npm run build`
- [x] 로컬 직렬 실행으로 동일 명령 PASS 사전 확인

## 매 단계 회귀 게이트

각 작업 완료 후 다음 시퀀스로 검증:

- [x] 작업 1 후: typecheck + vitest 70/70 + build PASS
- [x] 작업 2 후: typecheck + vitest 70/70 (회귀 테스트 14건 추가) + build PASS
- [x] 작업 3 후: 로컬 CI 시퀀스 전체 PASS

## 범위 외 (의도적으로 제외)

- ~~라이브러리 카드 reset 버튼~~ — 시도 후 제거. `src/editor/Toolbar.tsx`에 이미 reset 버튼이 존재하며 (localStorage clear + persistence store reset + canonical HTML 재파싱 → `loadDeck`), 라이브러리 카드 사본은 `clearDeckFromLocalStorage` 한 줄만 수행해 zustand 인메모리 상태/autosave와 race condition을 발생시켰음. 토스트로는 같은 초기화처럼 보이나 다시 열면 편집본이 그대로 노출됨.
- 에디터 toolbar reset의 race condition 자체 점검 (반복 가능 여부) — 별도 이슈
- 데크 백업/복원 기능 (편집본 JSON export → import)
- "모든 데크 편집 일괄 초기화" 메뉴
- CI 매트릭스(여러 Node 버전), 빌드 artifact 업로드, 캐시 최적화
- 번들 크기 경고 해결 — `dist/assets/index-*.js` 1.97MB, shiki 언어 dynamic import / manualChunks 분할 필요

## 후속 후보 (사용자 결정 필요)

- Vercel 배포 전략 — 로컬 생성 + 결과물만 배포 모델 (대화 미결)
- Phase B 수동 UX 검증 (라이브러리 카드 reset 제거 후 적용 안 됨)
