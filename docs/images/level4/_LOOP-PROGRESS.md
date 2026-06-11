# LEVEL 4 이미지 — /loop 진행 상태 (단일 진실원천)

> `git status`로는 진행 추적 불가 — `docs/images/level4/`는 **untracked 디렉터리**(`?? docs/images/level4/`)라
> 개별 파일 변경이 git에 안 보인다. 진행은 **이 파일**로만 추적한다.

## 도구 (이 디렉터리, 언더스코어 = 개발 도구, 슬라이드 자산 아님)
- `render.mjs <html> <png> 1280 720` — 투명 PNG 렌더(기존)
- `_batch-bump.mjs [file.html...]` — 작은 폰트(15–19px)를 +2px, 재렌더, 크림 합성. 인자 없으면 전체.
  `BUMP=0` 환경변수 = 편집만 하고 재렌더+크림만(이미 수동 편집한 파일에 쓸 것).
- `_overflow-check.mjs [file.html...]` — **필수 게이트**. 프레임 720 초과 + **내부 박스 클리핑**
  (고정높이 코드/트리/페인 박스가 내용 잘림)을 객관 검출. 폰트 키운 뒤 반드시 `== 0 overflowing ==` 확인.
- `_verify-cream.mjs <png>...` — 슬라이드 크림 배경(#F0EDE8)에 합성 → `<png>.cream.png` (리뷰용, 검토 후 삭제)
- 슬롭 게이트: `node ../../../.claude/skills/clean-html/scripts/check-slop.mjs *.html` (0 error 필수)
- 검토 후 정리: `rm -f *.cream.png ._verify_wrap.html`

## ⚠️ 교훈 — 폰트 키우면 오버플로/클리핑 발생
콘택트시트 썸네일로는 **내부 박스 클리핑이 안 보인다**. 반드시 `_overflow-check.mjs`로 객관 검출.
수정은 **폰트를 줄이지 말고** 여백(gap/padding)·line-height에서 공간을 회수해 큰 폰트를 유지한다.
코드/트리 같은 참조 박스는 line-height·padding이 과해 회수 여지가 크다.

## 디자인 사실 (확정)
- 프레임 1280×720, padding 44px, `background:transparent`, 본문색 `#1A1A18`.
- 보고서 테마 슬라이드 배경 = 크림 `#F0EDE8`(카드) / `#FAFAF8`(페이지), 액센트 teal `#0F766E`.
- 표 표준 = `docs/images/settings_json_key_reference.svg` & `level2/commit-prefix.html`:
  좌측 정렬 헤더 · 얇은 1px `#D4D0C8` 행 구분 · teal 모노 키/예시 · 하단 크림 노트.
- 링크/출처 = **하단 독립 섹션**(`.linkbar`/`.callout`, 1px `#B45309` + `#FAF3E6`). 참고: `level2/augmented-coding.html`.
- 사이드 레일/블록쿼트/그라데이션/글로우 = 전부 금지. level4엔 **원래 없음**(확인 완료).

## ITERATION 1 — 작은 폰트 +2px 패스 ✅ 완료·검증 (25/25)
- 17/18/19px → +2 (내림차순 치환으로 이중 가산 방지). `_batch-bump.mjs` 전체 실행.
- 25장 전부 재렌더. `_overflow-check.mjs` → **최종 0 overflowing / 25** (프레임+내부박스 모두).
- check-slop: **0 error** (Inter `font-default` WARN만 — 덱 전체 공통 서체라 유지).
- 사이드 레일/블록쿼트: 없음(확인). 링크: 전부 하단 독립 섹션(확인, 사이드 쏠림 0).
- 표: SVG 레퍼런스 스타일과 일관(확인).

### 폰트 키운 뒤 발생한 회귀 6장 → 전부 수정 완료
- 프레임 오버플로 3: `debugging`(gap 26→14·step pad 20→15), `gsd-workflow`(frame pad 30→22),
  `user-stories`(frame pad 44→20 세로만, 가로 44 유지).
- 내부 박스 클리핑 3: `plugin-components`(.tree line-height 1.86→1.6·pad 26→18),
  `ssot`(.pane pad 16→11·gap 12→8), `api-design`(pre.json 20px→19·lh 1.15→1.0·pad↓ +
  하단 출처셀 grid 0.3fr→0.46fr로 "4.3.2 API 설계" 1줄 복원).
- 전부 큰 폰트 유지한 채 여백/line-height에서 공간 회수. 크림 합성 육안검수 통과.

### ⚠️ 루프 드리프트 가드
`_batch-bump.mjs`를 **맹목 재실행 금지**. 15–19px를 +2 하므로 재실행 시 또 오른다.
ITERATION 1은 끝났다. 재실행하지 말 것.

## ITERATION 2+ — 선택: 본문 20px → 22px 심화 (한 장씩 리핏)
지금은 작은 보조텍스트만 키웠다. 사용자가 본문도 더 크길 원하면:
- 한 번에 **1–3장**만: 20px 본문을 22px로 올리고, 고정 720px 프레임 오버플로를 막게
  padding/gap/line-height를 그 슬라이드에 맞게 줄여 리핏 → 재렌더 → 크림 검수 → check-slop.
- 밀집 슬라이드(`data-model`·`api-design`·`test-cases`·`nfr` 표/코드 다수)는 여백 없음 → 키우면 깨짐. 그대로 둔다.
- 완료한 슬라이드는 아래 체크리스트에 표시.

### 본문 심화 체크리스트(ITERATION 2 진행 시)
- [ ] api-design  - [ ] backend-options  - [ ] changelog-skill  - [ ] component-hierarchy
- [ ] data-model(밀집-보류)  - [ ] debugging  - [ ] functional-requirements  - [ ] gsd-workflow
- [ ] handoff-json  - [ ] level4-summary  - [ ] marketplace  - [ ] markflow-intro
- [ ] nfr  - [ ] plugin-components  - [ ] prd-trd  - [ ] refactoring-flow
- [ ] sdd-before-after  - [ ] spec-versioning  - [ ] ssot  - [ ] tech-stack-criteria
- [ ] test-automation  - [ ] test-cases  - [ ] tools-security  - [ ] usecases  - [ ] user-stories

## 루프 상태 — ⏹ 종료됨 (ITERATION 1 완료·검증, 잔여 자율작업 없음)
- 2차 fire에서 게이트 재확인: `_overflow-check.mjs` 0 overflowing / 25, check-slop 0 error → 회귀 없음.
- 추가 사용자 지시(본문 더 키우기 등)가 없어 침습적 변경 없음 → 10분 idle 재검증은 낭비라 cron 종료함.
- **재개 방법**: 사용자가 다시 작업을 원하면 `/loop`을 다시 걸거나, 본문 확대를 원하면 아래 ITERATION 2 절차를
  명시적으로 지시한다. (이 파일·도구·체크리스트는 그대로 보존돼 즉시 이어서 가능.)
