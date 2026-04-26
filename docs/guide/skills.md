# skills — claude-code-ppt 프로젝트 스킬 사용 가이드

> 이 문서는 **레포에 박혀있는 Claude Code 스킬**을 다음 세션 / 다른 협력자가 빠르게 이해하고 호출할 수 있도록 정리한다. 현재는 `md-to-slidedeck` 단일 스킬이며, 모든 신규 스킬은 같은 디렉터리 규약(`.claude/skills/<name>/SKILL.md`)을 따른다.

---

## 1. 프로젝트 스킬 시스템 개요

Claude Code 스킬은 **에이전트가 특정 상황에서 따라야 할 절차서**다. 자유 응답으로 매 세션마다 다르게 답하는 대신, 스킬을 호출하면 검증된 단계 / 체크리스트 / 실패 복구 정책이 그대로 실행된다.

이 레포의 스킬은 모두 다음 형식을 따른다:

```
.claude/skills/<skill-name>/SKILL.md
```

YAML frontmatter:

```yaml
---
name: <skill-name>
description: <에이전트가 자동 매칭할 트리거 문구 (한국어 + 영어)>
---
```

본문은 "Why this skill exists / Inputs / Procedure (단계별) / Definition of Done / What this skill does NOT do / Failure recovery"로 구성한다.

**스킬 vs 일반 가이드 문서의 차이**:
- 가이드 문서(예: `AUTHORING_RULES.md`)는 **계약** — 무엇이 옳은지를 정의.
- 스킬은 **절차** — 그 계약을 따라가기 위한 손과 발의 동작 순서.

---

## 2. `md-to-slidedeck` 스킬

> Markdown 파일 한 장을 받아 `claude-code-ppt` 에디터에서 그대로 편집 가능한 슬라이드 덱(`design-patterns.html` 수준)을 생성한다.

### 2.1 호출 방식

세 가지 경로 모두 동일하게 동작한다.

#### (a) 명시 호출

```
/md-to-slidedeck
```

또는 사용자 프롬프트에 직접 명시:

```
md-to-slidedeck 스킬로 docs/sample/SEO_GUIDE.md를 presentation 템플릿으로 변환해줘
```

#### (b) 자연어 트리거 (한국어)

스킬 description이 다음 패턴을 매칭한다 — 별도 명령 없이도 자동 활성화된다:

- "이 MD 슬라이드로 만들어줘"
- "PPT로 변환해줘"
- "<파일> 슬라이드 덱 만들어줘"

#### (c) 자연어 트리거 (영어)

- "make slides from this MD"
- "convert markdown to slide deck"
- "turn this README into a presentation"

### 2.2 입력

사용자가 다음을 함께 전달해야 한다 (없으면 에이전트가 묻거나 기본값을 사용):

| 입력 | 필수 | 기본값 | 비고 |
|---|---|---|---|
| Markdown 파일 경로 또는 본문 | ✅ | — | 절대경로 권장. 본문 직접 붙여넣어도 됨 |
| 템플릿 | 권장 | 추론 또는 `presentation` | `presentation` / `portfolio` / `report` (§2.2.1 참조). 부재 시 콘텐츠 기반 추론 후 사용자에게 알림 |
| 데크 제목 | 선택 | MD의 첫 H1 | 명시 시 `meta.title`로 우선 사용 |

#### 2.2.1 템플릿 선택 가이드

같은 SlidePlan JSON이 **마크업은 동일**하지만 `data-template` 어트리뷰트만 다르게 emit되며, CSS가 그 어트리뷰트로 디자인 토큰(색·폰트·테두리)을 스왑한다. **콘텐츠 모양이 아니라 의도**로 선택하라.

| 템플릿 | 어떤 발표에 | 비주얼 정체성 | 강점 슬라이드 타입 |
|---|---|---|---|
| `presentation` (기본) | 코드 위주 강의, 튜토리얼, 디자인 패턴 walkthrough | 다크 BG `#0F172A`, 앰버 포인트 `#F59E0B`, 모노스페이스 푸터 | `title-code`, `two-col-code`, `comparison-table`, `callout-summary` |
| `portfolio` | 자기소개·팀 소개, 프로젝트 쇼케이스, 사례 발표, 내러티브 피치 | 화이트 BG `#FFFFFF`, 블루 포인트 `#3D5AF1`, 라이트 테이블/콜아웃 | `cover` (블루 BG), `title-body`, `title-bullets`, `references` |
| `report` *(아직 미배포)* | 비즈니스 리포트, KPI 대시보드, 데이터 슬라이드 | 미정 (portfolio와 형제 — 표/데이터 강조) | (사용자가 명시 요청하면 abort + 안내) |

**자동 추론 규칙** (사용자가 템플릿을 명시 안 한 경우):

- MD에 fenced code 블록 ≥ 3 → `presentation`
- MD가 산문 위주 + references ≥ 3 → `portfolio`
- MD에 표 ≥ 2 + "Q1/Q2", "KPI", "ROI" 같은 헤딩 → `report`(현재는 abort + 사용자 확인)
- 그 외 → `presentation` (안전한 기본값)

**주의**: enum(`'presentation' | 'portfolio' | 'report'`) 외 값을 만들지 말 것. validator의 `TEMPLATES` Set이 거부하고, 렌더러는 그 값을 그대로 `data-template` attribute로 박는다 — 오타 한 글자면 CSS 매칭이 안 되어 **스타일이 전혀 안 입혀진 흰 화면**이 된다.

### 2.3 산출물

| 산출물 | 위치 | 용도 |
|---|---|---|
| SlidePlan JSON | `.tmp/slideplan-<sourceStem>.json` | 검증/재시도용 진단 아티팩트. **삭제하지 않음** |
| Standalone HTML 데크 | `.quality-runs/slideplan/<sourceStem>.html` | 브라우저 즉시 오픈용 — `open <path>` |
| (선택) BUILTIN_DECKS 등록 | `docs/html/presentation/<deck-id>.html` + `src/library/deckRegistry.ts` | 에디터 라이브러리에 데크로 노출 + 런타임 shiki/macOS dots 자동 stamp |

### 2.4 절차 요약

스킬 본문에 6단계로 적혀 있다 (자세한 내용은 `.claude/skills/md-to-slidedeck/SKILL.md` 참조):

1. **계약 읽기** — `docs/guide/AUTHORING_RULES.md` + `src/generator/slidePlan.ts` + `tests/generator/fixtures/sample-plan.json`. 셋 중 하나라도 없으면 abort.
2. **MD 읽기** — heading / 코드 fence(언어 태그) / 표 / 링크 추적. `bash`/`sh`/`$ ` 프리픽스는 `kind: 'terminal'`로 분류.
3. **SlidePlan JSON 작성** — `.tmp/slideplan-<stem>.json`. 9 슬라이드 타입(`SlideNode`) 중 적합한 조합 선택. 8–14 슬라이드(2,000–4,000 단어) / 18–30 슬라이드(코드 헤비) 가이드.
4. **검증** — `node_modules/.bin/tsx scripts/slideplan.ts validate <plan>`. 실패 시 errors 전체를 한 번에 수정 후 재시도. 최대 3회.
5. **렌더** — `node_modules/.bin/tsx scripts/slideplan.ts render <plan>`. `.quality-runs/slideplan/<stem>.html` 생성. 경로를 사용자에게 알림.
6. **(선택) 에디터 통합** — 사용자가 "에디터에서 열어줘"라고 요청하면, 결과 HTML을 `docs/html/presentation/<deck-id>.html`로 복사하고 `BUILTIN_DECKS`에 항목 추가.

### 2.5 CLI 도구

스킬이 내부적으로 사용하는 두 명령:

```bash
# JSON 플랜 검증 (스키마 + 의미 게이트)
node_modules/.bin/tsx scripts/slideplan.ts validate .tmp/slideplan-<stem>.json

# 검증 통과한 플랜 → standalone HTML
node_modules/.bin/tsx scripts/slideplan.ts render .tmp/slideplan-<stem>.json
```

`tsx`는 `npx tsx`가 아니라 **로컬 설치된 바이너리**(`node_modules/.bin/tsx`)를 직접 호출. 글로벌 `tsx`가 없는 환경 호환을 위해.

`render` 산출 HTML은 `brewnet-dark.css` + `code-blocks.css`를 인라인으로 포함하고, 에디터 iframe 전용 오버라이드(`body { margin: 0 !important; }` 이후 블록)는 strip된다.

### 2.6 주의사항 / 트레이드오프

| 항목 | 설명 |
|---|---|
| **HTML 직접 작성 금지** | LLM이 `<div class="...">`를 쓰는 순간 스킬 위반. 모든 HTML은 `planRenderer.ts`가 결정론적으로 생성한다. |
| **SlideNode/Block 임의 추가 금지** | `slidePlan.ts`의 enum 외 값은 validator가 거부. 새 타입이 필요하면 코드(렌더러+검증자) 먼저 확장. |
| **이미지 미배치** | 스킬은 텍스트/코드만 emit. 이미지 오버레이는 에디터에서 사용자가 추가 (Phase 2). |
| **Frontmatter 미파싱** | MD 상단의 `---\n…\n---`는 첫 paragraph의 raw text로 흡수. 명시 요청 전엔 별도 처리 안 함. |
| **shiki/macOS dots는 standalone HTML에 없음** | `slideplan render` 산출물은 런타임 `upgradeSlideCodeBlocks` 패스를 거치지 않음. 효과를 보려면 BUILTIN_DECKS 등록 후 에디터에서 열기. |
| **재시도 상한 3회** | 3회 안에 검증 통과 못 하면 에이전트가 사용자에게 에스컬레이션 (last error list + 슬라이드 인덱스 + 1줄 진단). `.tmp/` 진단 파일은 그대로 보존. |
| **render 실패 시 plan 재작성 금지** | validate가 통과한 뒤 render가 깨진다면 그건 렌더러 버그. `planRenderer.ts`를 읽고 어느 슬라이드 타입이 깨졌는지 보고 — 플랜을 우회하지 않음. |
| **한국어 텍스트** | 모든 텍스트 필드는 plain string. 마크다운/HTML 태그를 넣지 마라 — 렌더러가 escape한다. |

### 2.7 특징

- **결정론적 포맷 잠금**: 4중 검문소(JSON 스키마 → 의미 게이트 → 결정론 렌더러 → 에디터 게이트). 동일 plan은 항상 동일 HTML을 만든다.
- **하나의 진실(`AUTHORING_RULES.md`)**: 스킬 본문은 절차만 담고, 계약은 가이드 문서를 single source of truth로 참조. 계약 변경 시 한 곳만 수정.
- **프로젝트 로컬 스코프**: 글로벌 스킬(`~/.claude/skills/`)이 아닌 프로젝트(`<repo>/.claude/skills/`) 위치 — `slidePlan` 스키마가 이 레포에 묶여 있어 다른 프로젝트에서 호출해도 의미 없음.
- **9개 슬라이드 타입 / 9개 블록 종류 커버**: cover / section / title-body / title-bullets / title-code / two-col-code / comparison-table / callout-summary / references. 블록 종류는 paragraph / heading / bullets / code / quote / callout / table / image / divider.
- **brewnet-dark 디자인 시스템과 호환**: `data-template="presentation"`을 박아 둠. 향후 portfolio/report 어댑터가 추가되면 같은 SlidePlan으로 다른 비주얼 출력 가능.
- **에디터 호환 보장**: `runGates`가 `parsePresentationHTML`이 받아들이는 모양인지 검사 — 에디터로 열었을 때 깨질 일 없음.

### 2.8 자주 발생하는 검증 실패 패턴

| 에러 메시지 패턴 | 원인 | 수정 |
|---|---|---|
| `slides[0].type must be 'cover'` | 첫 슬라이드를 title-body로 시작 | `cover` 슬라이드를 인덱스 0에 삽입 |
| `section.num duplicates 'NN'` | 두 섹션이 같은 번호 사용 | `"01"`, `"02"`, … 순차로 부여 |
| `references[N].href must match ^https?://` | 상대경로 / `mailto:` / `www.…` | 풀 URL로 수정 |
| `comparison-table column count mismatch` | rows의 셀 수가 headers와 다름 | 표를 손으로 다시 그어서 정확히 맞춤 |
| `two-col-code requires at least one code block` | left/right 양쪽에 paragraph만 있음 | 한 쪽에 `kind: 'code'` 블록 추가 |
| `bullet items > 6` | 한 슬라이드에 7개 이상 불릿 | 슬라이드 분할(`title-bullets` 두 장으로 쪼갬) |

### 2.9 Definition of Done (스킬 종료 조건)

스킬이 끝났다고 보고하기 전에 모두 ✓:

- [ ] `validate` exit 0
- [ ] `render` exit 0 + HTML 파일 존재
- [ ] 슬라이드 수가 소스 분량 대비 합리적(8–14 / 2,000–4,000 단어)
- [ ] 코드 블록의 `lang`이 정확 (Java 코드인데 `plaintext` 금지)
- [ ] `$ ` 프리픽스 셸 세션은 `kind: 'terminal'`로 분류
- [ ] 렌더된 HTML 경로를 사용자에게 알림

### 2.10 실제 테스트 방법

스킬·렌더러·템플릿이 정상인지 4가지 경로로 검증한다. 코드 변경의 성격에 따라 골라서 사용한다.

#### (1) CLI standalone 렌더 — 비주얼 sanity-check (1분)

가장 빠른 시각 확인. fixture를 그대로 렌더해 브라우저로 연다.

```bash
# presentation 비교용 (다크 + 앰버)
node_modules/.bin/tsx scripts/slideplan.ts render tests/generator/fixtures/sample-plan.json
open .quality-runs/slideplan/sample-plan.html

# portfolio (in-memory swap 후 렌더)
# .tmp/sample-plan-portfolio.json — fixture 카피 + "template": "portfolio"
node_modules/.bin/tsx scripts/slideplan.ts render .tmp/sample-plan-portfolio.json
open .quality-runs/slideplan/sample-plan-portfolio.html
```

**한계**: standalone HTML은 런타임 `upgradeSlideCodeBlocks`를 거치지 않으므로 코드블록의 shiki 토큰 색상과 macOS dots(빨/노/초)가 빠진다. 이건 의도된 한계 — 풀 비주얼은 (3)번 경로.

#### (2) 새 MD로 스킬 호출 — 실사용 시뮬레이션

대화창에 한 줄.

```
docs/sample/SEO_GUIDE.md 슬라이드로 만들어줘
```

→ `md-to-slidedeck` 스킬 자동 트리거 → SlidePlan JSON 작성 → validate → render → 산출 HTML 경로가 출력됨. 추론 규칙으로 SEO_GUIDE는 portfolio가 권장됨(코드 fence 0개 + 산문 위주).

#### (3) 에디터에서 풀 비주얼 확인 (shiki + macOS dots 포함)

`BUILTIN_DECKS`에 등록해서 라이브러리 카드로 띄운다. 30초 작업.

```bash
# 1) standalone HTML을 빌트인 위치로 복사
mkdir -p docs/html/portfolio
cp .quality-runs/slideplan/sample-plan-portfolio.html docs/html/portfolio/sample-portfolio.html

# 2) src/library/deckRegistry.ts의 BUILTIN_DECKS에 1줄 추가
#    예: { id: 'sample-portfolio', title: 'Sample Portfolio',
#          html: () => import('../../docs/html/portfolio/sample-portfolio.html?raw') }

# 3) dev 서버 부팅
npm run dev   # http://127.0.0.1:5173
```

→ 라이브러리 화면 → 카드 클릭 → 에디터 진입 → `upgradeSlideCodeBlocks`가 코드블록을 shiki 토큰으로 변환 + macOS dots를 stamp → 인라인 편집·오버레이 드래그·블록 reorder 모두 정상 동작하는지 확인.

#### (4) 회귀 테스트 — 코드 변경 시

```bash
node_modules/.bin/vitest run                    # 전체 (현재 17/17)
node_modules/.bin/vitest run tests/generator/planRenderer.test.ts   # 렌더러만 (14/14)
npm run typecheck                               # tsc strict
```

`planRenderer.test.ts`는 마크업 invariant(슬라이드 수, slide-cover/section-num/page-num 패턴, code-block의 `data-slot`/`data-code-lang`, comparison-table 헤더·행 일치, references `^https?://`)와 **template 스왑 시 마크업 동일성**(presentation ↔ portfolio가 슬라이드/cover/section/code-block 카운트 동일, `data-template`만 다름)을 강제한다. CSS 토큰 재정의로만 시각이 바뀌도록 잠금된 형태.

#### 추천 순서

비주얼 회귀 의심 → (1)부터.
새 MD 도입 → (2).
에디터 호환성 검증(편집·오버레이) → (3).
코드 손댐 → (4) 항상 마지막에.

---

## 3. 새 스킬 추가하는 법

1. `.claude/skills/<new-skill-name>/SKILL.md` 생성
2. YAML frontmatter — `name` + 트리거 description (한국어 + 영어 모두)
3. 본문 6섹션 — Why / Core principle / Inputs / Procedure / DOD / Failure recovery
4. 가능하면 **계약은 별도 가이드 문서**(`docs/guide/<topic>.md`)로 분리하고 SKILL은 절차만 담는다 — 변경 영향 범위가 작아짐
5. 이 문서(`docs/guide/skills.md`)에 새 섹션 추가

---

## 4. 관련 파일

| 파일 | 역할 |
|---|---|
| `.claude/skills/md-to-slidedeck/SKILL.md` | 스킬 정의 + 절차서 |
| `docs/guide/AUTHORING_RULES.md` | SlidePlan 계약 single source of truth |
| `src/generator/slidePlan.ts` | TypeScript 타입 + `validateSlidePlan` |
| `src/generator/planRenderer.ts` | 결정론 HTML 디스패처 (9개 슬라이드 타입) |
| `scripts/slideplan.ts` | `validate` / `render` CLI |
| `tests/generator/planRenderer.test.ts` | 14/14 PASS 회귀 테스트 (presentation 11 + portfolio 3) |
| `tests/generator/e2e.test.ts` | 3/3 PASS 레거시 어댑터 채점 게이트 |
| `.quality-runs/slideplan/` | CLI `render` 산출 standalone HTML |
| `.tmp/` | SlidePlan JSON 작업 디렉터리 (gitignored) |
| `tests/generator/fixtures/sample-plan.json` | 9-타입 커버 픽스처 |
| `src/library/deckRegistry.ts` | (선택) BUILTIN_DECKS 등록부 |
| `src/importer/upgradeCodeBlocks.ts` | 에디터 진입 시 shiki/macOS dots stamp |
