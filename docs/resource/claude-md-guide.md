# CLAUDE.md — 프로젝트 온보딩 문서의 모든 것

> **이 문서의 목적**
> Chapter 0(미리 알아두면 좋은 용어와 개념)에서 정의만 짚고 넘어간 **CLAUDE.md**를 실전 강의용으로 깊이 있게 정리한다. **왜** 온보딩 용도로 쓰이는지, **언제** Claude가 이걸 무시하는지, **어떻게** 좋은 CLAUDE.md를 만들고 진화시키는지를 다룬다. 카파시(Andrej Karpathy)의 공개 CLAUDE.md 분석과 시사점까지 포함한다.
>
> **분량**: Level 3.2 "프로젝트 메모리" 절의 보조 자료. 강의 시 50분 예상.

---

## 1. CLAUDE.md는 무엇인가 — 한 번 더 정리

Chapter 0에서 다음을 정의했다.

- 기술적으로는 **시스템 프롬프트가 아니라 "첫 user 메시지"로 주입되는 메모리 파일**
- 세션 시작 시 **자동 로드**되어 매 턴 모델의 시야에 들어옴
- 위치는 4단계(Enterprise / Project / User / Subfolder), 하위가 상위를 오버라이드

이 챕터에서는 그 위에 **실전 운용**을 얹는다. CLAUDE.md를 "정의된 파일" 정도로 알고 시작한 개발자가, **잘 작성된 CLAUDE.md를 만들고 시간이 지나도 죽지 않는 살아있는 문서로 유지**할 수 있게 되는 것이 목표다.

---

## 2. 왜 CLAUDE.md는 "온보딩 문서"인가

### 2.1 매 세션의 출발선 — Claude는 zero knowledge에서 시작한다

가장 자주 놓치는 사실: **새 세션마다 Claude는 코드베이스에 대해 아무것도 모른다**. 어제 세션에서 알아낸 디렉토리 구조, 컨벤션, 비즈니스 용어, 빌드 명령어, 모두 휘발됐다. 매 세션 처음부터 다시 탐색해야 한다.

CLAUDE.md가 없으면 Claude는 매번 다음을 반복한다.

- `Glob`으로 디렉토리 트리 스캔
- `Read`로 `package.json`, `tsconfig.json`, `README.md` 등 읽기
- 디렉토리 구조 보고 컨벤션 추측 (자주 틀림)
- 빌드/테스트 명령어 모름 → 사용자에게 묻거나 잘못된 명령어 시도

CLAUDE.md는 이 탐색 과정을 압축한 결과물을 모델 시야에 즉시 박아주는 장치다.

### 2.2 사람 온보딩과 똑같다 — WHY / WHAT / HOW

신규 개발자가 팀에 합류한 첫날을 생각해보자. 시니어가 알려주는 것:

| 신규 입사자에게 알려주는 것 | CLAUDE.md 섹션 |
|--------------------------|---------------|
| "우리 회사 뭐 하는 곳이에요?" | **WHY** — Project Overview |
| "이 리포는 뭐예요? 모노레포예요?" | **WHAT** — Architecture |
| "빌드는 어떻게 하고, 테스트는 어떻게 돌려요?" | **HOW** — Commands |
| "코딩 컨벤션 있어요?" | **HOW** — Conventions |
| "절대 하면 안 되는 것들?" | **HOW** — Safety |

CLAUDE.md를 작성할 때 **"신규 입사자에게 이 정보 없이 task를 줄 수 있는가?"**라는 질문이 가장 좋은 필터다.

### 2.3 "하네스의 최고 레버리지 포인트"

HumanLayer의 분석은 이 표현을 쓴다.

> *"CLAUDE.md is the highest leverage point of the harness."*

번역하면 — 하네스(모델 + 도구 + 컨텍스트 관리 메커니즘) 전체에서, **단일 파일의 내용 변경이 가장 큰 행동 변화**를 만드는 지점이 CLAUDE.md다. 한 줄 추가하면 모든 세션, 모든 task에 영향이 간다. 그래서 **자동 생성에 맡기면 안 되고**, 손으로 다듬어야 한다.

---

## 3. CLAUDE.md가 무시되는 5가지 경우 (실패 모드)

이걸 모르면 "CLAUDE.md를 정성껏 썼는데 왜 Claude가 무시하지?"라는 좌절을 반복한다. 공식 best-practice + 커뮤니티 검증으로 정리된 5가지 안티 패턴.

### 3.1 너무 길다 — "over-specified CLAUDE.md"

공식 Claude Code best practices가 명시적으로 경고한 함정.

> *"If your CLAUDE.md is too long, Claude ignores half of it because important rules get lost in the noise."* — [Claude Code 공식 best practices](https://code.claude.com/docs/en/best-practices)

길어질수록 모델이 **선별적으로 무시**한다. 공식 문서는 정확한 줄 수를 제시하지 않고 *"keep it short and human-readable"*만 명시하지만, 커뮤니티 베스트 프랙티스는 **150~200줄 이하**를 권장 (Frontier LLM이 안정적으로 따르는 지시 수가 약 150~200개라는 분석에 근거 — 정확한 수치는 공식 출처 미확인).

해결: 무자비하게 가지치기 + Progressive Disclosure(§7)로 분리.

### 3.2 작업과 무관한 정보가 잔뜩

API 작업 중인데 CSS 스타일 가이드, 디플로이 절차, DB 스키마, 모든 도메인 용어가 root CLAUDE.md에 들어있다. 모델은 "지금 task와 관련 없는 정보"를 노이즈로 인식해 전체 지시 순위를 낮춘다.

해결: `.claude/rules/*.md` + `paths:` frontmatter로 **경로 기반 조건부 로드**(§6.3).

### 3.3 코드가 이미 보여주는 패턴을 중복 명시

> *"LLMs are in-context learners. If your codebase consistently follows a style, Claude will pick it up by reading your code. Embedding detailed style rules wastes instruction budget."* — [Buildcamp 가이드](https://www.buildcamp.io/guides/the-ultimate-guide-to-claudemd)

`함수는 camelCase 사용` 같은 규칙은 코드 5개만 읽으면 자동으로 학습된다. CLAUDE.md에 적는 건 **토큰 낭비 + 다른 중요한 지시의 가중치 희석**.

해결: "사소하지 않은 것만(non-obvious patterns)" 적는다.

### 3.4 일반론 — "clean code", "best practices"

Claude는 이미 깨끗한 코드 쓰는 법을 안다. "Write clean code", "Handle edge cases", "Follow best practices" 같은 문장은 **0개의 정보**를 전달하면서 instruction budget만 갉아먹는다.

해결: 이 프로젝트에서만 유효한 구체적 규칙만 적는다.

### 3.5 Linter가 할 일을 LLM에게 시킴

> *"Claude is not a linter. Use linters and code formatters, and use other features like Hooks and Slash Commands as necessary."* — [HumanLayer 분석](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

들여쓰기, 따옴표, import 정렬 같은 결정론적 규칙은 **Prettier/ESLint/Biome**의 영역이다. LLM은 확률적이라 80%만 지킨다. 그리고 "지키게 시키기" 위해 들어간 지시문이 다른 중요한 지시를 밀어낸다.

해결: PostToolUse Hook에서 `npm run lint:fix` 자동 실행. CLAUDE.md에서는 이걸 빼버린다.

### 3.6 무시되는 5가지 실패 모드 한눈에

| # | 실패 모드 | 증상 | 해결 |
|---|---------|------|------|
| 1 | 너무 김 | 중요 규칙이 노이즈에 묻힘 | 150줄 이하로 가지치기 |
| 2 | 무관 정보 잔뜩 | 현재 task와 무관한 컨텍스트 | `.claude/rules/` + paths |
| 3 | 코드가 보여주는 패턴 중복 | budget만 소모 | 비자명한 것만 |
| 4 | 일반론 ("clean code") | 0개의 정보 | 구체적 규칙만 |
| 5 | Linter 영역 침범 | 확률적 준수 | Hook + 결정론적 도구 |

---

## 4. `/init`으로 시작하기 vs 직접 작성

### 4.1 `/init` 작동 원리

`/init`은 **별도의 Subagent**(Piebald-AI 리포지토리의 "Agent Prompt: CLAUDE.md creation" 분석에 따르면 약 384토큰 크기의 전용 프롬프트)를 띄워 codebase를 분석한 뒤 CLAUDE.md 초안을 생성하는 명령이다.

분석하는 항목:

- 디렉토리 구조 탐색 (project type 추정: Next.js? FastAPI? 모노레포?)
- `package.json` / `tsconfig.json` / `pyproject.toml` / `Cargo.toml` 등 설정 파일 읽기
- ESLint / Prettier / lint-staged 설정에서 코딩 컨벤션 추출
- README.md 요약
- 빌드/테스트/린트 명령어 도출

생성되는 초안의 표준 구조:

```markdown
# Project Name
One-line description.

## Commands
npm run dev / npm run test / npm run build / npm run lint

## Architecture
src/ - source
  routes/ - API routes
  ...

## Code Style
- 명시적으로 추출 가능한 컨벤션만

## Development Workflow
- Git 브랜칭 / CI 등 추정 가능한 항목만
```

### 4.2 `/init`이 잘 하는 것 vs 못 하는 것

| 항목 | `/init` 강점 | `/init` 약점 |
|------|----------|----------|
| Tech stack 파악 | ✅ package.json에서 정확히 추출 | — |
| Commands 추출 | ✅ scripts 섹션에서 정확 | 팀 컨벤션 플래그는 모름 |
| 디렉토리 구조 | ✅ 그대로 옮김 | "왜" 그렇게 나뉘었는지는 모름 |
| Code style | ⚠️ Lint 설정에서 추출 | 자동 추출 가능한 것만 |
| **비즈니스 도메인 용어** | ❌ 모름 | 사람이 직접 추가해야 함 |
| **금지사항 / Safety** | ❌ 모름 | 사람이 직접 추가해야 함 |
| **Spec drift 경계** | ❌ 모름 | 사람이 직접 추가해야 함 |
| **반복 실수 패턴** | ❌ 모름 (경험치 필요) | 시간이 지나며 사람이 추가 |

> *"Hand-craft it. Auto-generation produces mediocre results for the highest-leverage file in your setup."* — [Buildcamp](https://www.buildcamp.io/guides/the-ultimate-guide-to-claudemd)

### 4.3 권장 워크플로

```
1. /init 으로 초안 생성 (30초)
2. 생성된 CLAUDE.md를 사람이 읽고 다음 추가:
   - 도메인 용어 (markflow 예: "Workspace", "Document Revision", "Slug")
   - 비자명한 컨벤션 (예: "API 응답은 Result<T,E> 패턴")
   - 금지사항 (예: "main 브랜치 직접 push 금지")
   - 참조 문서 포인터 (@docs/API_SPEC.md 등)
3. 사소한 코드 스타일은 삭제 (linter에게 맡김)
4. 결과를 git commit
5. 시간이 지나며 Claude가 같은 실수 3번 반복 → CLAUDE.md에 추가 (§8)
```

### 4.4 CLAUDE.md가 있을 때 vs 없을 때 — 실측 차이

같은 프롬프트(`사용자 인증 모듈에 OAuth 추가해줘`)를 두 상태에서 실행한 비교:

| | CLAUDE.md 없음 | CLAUDE.md 있음 |
|--|--------------|--------------|
| 첫 turn까지의 도구 호출 수 | 8~15회 (디렉토리 탐색·설정파일 읽기) | 1~3회 (관련 파일만) |
| 잘못된 import 경로 사용 | 자주 발생 | 거의 없음 |
| API 응답 형식 위반 | 자주 발생 | 거의 없음 |
| "어디에 코드 쓰면 되나요?" 질문 | 자주 발생 | 드물게 발생 |
| 컨텍스트 사용량 (첫 turn) | 15~25% | 5~10% |

수치는 단일 측정이 아닌 커뮤니티 리포트 종합 + 본인 markflow 작업 경험 기반이다. 정확한 값은 프로젝트 크기에 따라 다르지만 **차이의 방향**은 일관된다.

---

## 5. 좋은 CLAUDE.md의 표준 구조 (TypeScript 프로젝트 기준)

### 5.1 7개 섹션 골격

```markdown
# 1. Project Overview (3~5줄)
한 줄로 무엇이고 왜 존재하는지

# 2. Tech Stack
한 줄로 핵심 스택 (버전 명시는 메이저만)

# 3. Commands
가장 자주 쓰는 5~8개 명령어 (한 줄씩)

# 4. Architecture
디렉토리 구조 + 데이터 흐름 + 계층 간 경계 규칙

# 5. Conventions (비자명한 것만)
- 네이밍 규칙 중 코드만 봐선 모르는 것
- API 응답 형식
- 에러 처리 패턴
- 테스트 구조

# 6. Safety (금지사항)
NEVER로 시작하는 명시적 금지 패턴

# 7. References (Progressive Disclosure)
@docs/API_SPEC.md  - 자세한 API 명세는 여기
@docs/DATA_MODEL.md - DB 스키마는 여기
```

### 5.2 markflow 표준 CLAUDE.md 예시 (~80줄)

```markdown
# markflow — 마크다운 기반 팀 KMS

마크다운 문서로 팀 지식을 관리하는 KMS. SaaS + 온프레미스 동시 제공.

## Tech Stack
Next.js 16 (App Router) · Drizzle ORM · PostgreSQL 16 · pnpm workspaces · Vitest · Playwright

## Commands
- `pnpm dev` - 개발 서버 (apps/web, 포트 3000)
- `pnpm test` - Vitest 단위 테스트
- `pnpm test:e2e` - Playwright E2E
- `pnpm typecheck` - TypeScript 타입 검사
- `pnpm lint` - Biome 린트
- `pnpm db:migrate` - Drizzle 마이그레이션 적용
- `pnpm db:studio` - Drizzle Studio (DB GUI)

## Architecture
모노레포 구조:
- `apps/web` - Next.js (App Router + Route Handlers, 통합 배포)
- `packages/editor` - CodeMirror 6 기반 마크다운 에디터
- `packages/db` - Drizzle ORM 스키마 + 클라이언트

### 데이터 흐름
- 읽기: Client Component → fetch → Route Handler → DocumentService → DB
- 쓰기: Editor → Zod 검증 → Route Handler → DocumentService → DB + 버전 기록

### 계층 간 경계 (중요)
- Client Component는 Route Handler와 fetch 통신만 — 서버 모듈 직접 import 금지
- `apps/web/lib/server/**`는 Route Handler · Server Component에서만 import
- `packages/db`는 `apps/web`에서만 직접 참조

## Conventions
- API 응답: `{ success: boolean, data: T | null, error: string | null }`
- 에러 처리: `Result<T, E>` 패턴 (throw 금지)
- 입력 검증: 모든 외부 입력은 Zod 스키마로 (스키마는 `src/lib/schemas/`)
- ID: CUID2 (`createId()` 사용, UUID 금지)
- 시간: Day.js + `Asia/Seoul` 기본
- 컴포넌트 위치: `apps/web/components/` (도메인별 폴더), `packages/editor`는 에디터 전용

## Safety (절대 금지)
- TypeScript `any` 사용 금지 — 명시적 타입 또는 `unknown`
- `innerHTML` / `dangerouslySetInnerHTML` 사용 금지
- 마크다운 렌더링은 반드시 `rehype-sanitize`를 파이프라인 **마지막**에 적용
- DB 쿼리에 raw SQL 문자열 보간 금지 — Drizzle 쿼리 빌더 또는 parameterized only
- main 브랜치 직접 push 금지
- `.env*` 파일 git 커밋 금지

## Domain Terms
- **Workspace** - 팀 단위 격리 컨테이너 (멤버, 권한, 문서가 워크스페이스에 속함)
- **Document** - 마크다운 콘텐츠. soft delete (deleted_at), 버전 히스토리 보유
- **Revision** - Document의 시점별 스냅샷 (최대 50개 보존)
- **Slug** - 한글 포함 가능, slugify로 생성

## References (필요 시 읽기)
- @docs/PRD.md - 제품 요구사항
- @docs/TRD.md - 기술 요구사항
- @docs/API_SPEC.md - REST API 명세
- @docs/DATA_MODEL.md - Drizzle 스키마 + ERD
- @AGENTS.md - 모든 AI 에이전트 공통 지시

## Working Style
- 코드 수정 전 관련 테스트 실행
- 큰 변경은 plan mode로 먼저
- 마크다운 파싱 변경 시 XSS 검증 포함
```

위 예시는 **80줄 안에서 7개 섹션을 모두 커버**한다. 이 정도가 실전에서 안정적으로 동작하는 상한선이다.

---

## 6. 파일 분리 전략 — 4단계 접근

프로젝트가 커지면 단일 CLAUDE.md로는 부족하다. 4단계로 분리한다.

### 6.1 단일 파일 (~80줄) — 초기 단계

작은 프로젝트, 첫 6개월. 모든 정보가 root CLAUDE.md 하나에 들어감.

**적합한 상황**: 모놀리스, 단일 개발자/소규모 팀, 새 프로젝트 초기.

### 6.2 `@import`로 외부 문서 참조 — 중간 단계

CLAUDE.md는 80줄 유지하되, 상세 문서는 외부 파일로 분리하고 **`@경로` 문법**으로 포인터만 둔다.

```markdown
# CLAUDE.md

## References
@docs/API_SPEC.md - REST API 명세 (필요 시 읽기)
@docs/DATA_MODEL.md - DB 스키마 (필요 시 읽기)
@README.md - 사용자용 문서
```

> **공식 문서 인용**: CLAUDE.md files can import additional files using `@path/to/import` syntax. Both relative and absolute paths are allowed.
>
> 출처: [Claude Code Memory 공식 문서](https://docs.claude.com/en/docs/claude-code/memory)

**주의**: `@import`는 평소엔 import만 시도하고 내용을 다 로드하진 않는다. 작업 중 관련 주제가 나오면 Claude가 해당 파일을 읽도록 모델이 판단한다. 그래서 **항상 적용되는 규칙은 root에, 상황별 정보는 import 대상에** 두는 게 원칙.

### 6.3 `.claude/rules/*.md` + `paths:` frontmatter — 대규모 단계

도메인이 여럿일 때 root CLAUDE.md가 비대해지는 문제를 해결하는 가장 강력한 패턴.

#### 6.3.1 작동 방식

`.claude/rules/` 디렉토리 안의 모든 `.md` 파일은 **CLAUDE.md와 같은 우선순위로 자동 로드**된다. 별도 import 불필요. 단, **frontmatter에 `paths:` 패턴을 명시하면 해당 경로 작업 시에만 활성화**된다.

#### 6.3.2 markflow 예시

```
.claude/rules/
├── code-style.md      # paths 없음 → 항상 로드
├── testing.md         # paths 없음 → 항상 로드
├── api-routes.md      # paths: ["apps/web/app/api/**/*.ts"] → API 작업 시만
├── editor.md          # paths: ["packages/editor/**/*.ts"] → 에디터 작업 시만
├── db-migrations.md   # paths: ["packages/db/migrations/**"] → 마이그레이션 시만
└── security.md        # paths: ["**/auth/**", "**/api/**"] → 보안 영역 작업 시만
```

각 파일 예시:

```yaml
# .claude/rules/api-routes.md
---
paths:
  - "apps/web/app/api/**/*.ts"
---

# API 라우트 규칙

## 응답 형식
모든 라우트는 `Result<T, E>` 패턴:
- 성공: `{ success: true, data: T, error: null }`
- 실패: `{ success: false, data: null, error: string }`

## 검증
모든 요청 본문 / 쿼리는 Zod 스키마 검증 (`src/lib/schemas/api/`)

## 인증
보호된 라우트는 `withAuth` 미들웨어 사용
```

```yaml
# .claude/rules/security.md
---
paths:
  - "**/auth/**"
  - "**/api/**"
  - "**/middleware.ts"
---

# 보안 규칙

## 인증
- JWT 토큰 검증 후 처리
- secret은 환경변수에서만 (코드 하드코딩 금지)

## XSS
- 사용자 입력 마크다운 → rehype-sanitize 필수

## SQL Injection
- raw SQL 문자열 보간 금지 → Drizzle 쿼리 빌더 only
```

#### 6.3.3 효과

- **컨텍스트 효율**: 무관한 영역 작업 시 해당 rule 토큰 미소비
- **소유권 분리**: 프론트팀이 `editor.md`, 백엔드팀이 `api-routes.md`, 보안팀이 `security.md` 각자 관리 → 머지 충돌 ↓
- **우선순위 동일**: rules 파일도 CLAUDE.md와 같은 가중치로 모델에게 전달됨

### 6.4 서브폴더 CLAUDE.md (lazy load) — 보조 단계

특정 폴더에 들어가는 순간에만 적용되는 규칙은 그 폴더 안에 별도 CLAUDE.md를 두는 게 가장 자연스럽다.

```
apps/web/CLAUDE.md           # Next.js 앱 작업 시 추가 로드
packages/editor/CLAUDE.md    # 에디터 패키지 작업 시 추가 로드
packages/db/CLAUDE.md        # DB 패키지 작업 시 추가 로드
```

`paths` 패턴 없이도 폴더 단위로 자동 처리되므로 **모노레포 패키지별 룰**에 가장 어울린다.

### 6.5 4단계 비교

| 단계 | 방식 | 적합한 시점 |
|------|------|----------|
| 1 | 단일 파일 | 새 프로젝트, < 80줄 |
| 2 | `@import`로 외부 문서 참조 | 상세 문서가 필요해진 시점 |
| 3 | `.claude/rules/` + paths | 도메인 분리가 필요한 시점 (팀 규모 증가) |
| 4 | 서브폴더 CLAUDE.md | 모노레포, 패키지별 규칙 |

대부분의 실무 프로젝트는 **1+2 또는 1+2+3 조합**이 적절하다. 4는 모노레포에서만.

---

## 7. 점진적 정보 공개 (Progressive Disclosure)

### 7.1 핵심 원칙

> *"Don't tell Claude all the information you could possibly want it to know. Rather, tell it how to find important information so that it can find and use it, but only when it needs to."* — [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

CLAUDE.md에 **모든 정보를 다 넣지 말고**, "어디에 있는지" 만 알려준다. Claude가 task와 관련 있다고 판단할 때만 해당 문서를 읽는다.

### 7.2 안티 패턴 vs 좋은 패턴

#### ❌ 안티 패턴 — root에 모든 걸 우겨넣음

```markdown
# CLAUDE.md (1200줄)

## API 명세
### POST /api/documents
요청: ...
응답: ...
에러 코드: ...
[400줄 더]

## DB 스키마
### documents 테이블
- id: CUID2
- title: VARCHAR(500)
[300줄 더]

## 컴포넌트 구조
### Editor
props: ...
[500줄 더]
```

→ 모든 task가 1200줄을 컨텍스트에 끌고 들어옴 + 본문 규칙 묻힘.

#### ✅ 좋은 패턴 — 포인터만

```markdown
# CLAUDE.md (60줄)

## References
필요할 때 읽어라:
- @docs/API_SPEC.md - API 명세 (요청/응답/에러)
- @docs/DATA_MODEL.md - DB 스키마, ERD
- @docs/COMPONENT_SPEC.md - 컴포넌트 props/이벤트
- @docs/SECURITY.md - 보안 가이드라인
```

→ 평소엔 60줄만 컨텍스트 소비. API 작업 시 Claude가 API_SPEC.md만 추가로 읽음.

### 7.3 강의용 비유 — "도서관 vs 보따리"

| 방식 | 비유 | 결과 |
|------|------|------|
| 우겨넣기 | 책 200권을 매번 보따리에 짊어지고 다님 | 무거움. 필요한 책 찾기 어려움. 다 못 봄. |
| Progressive Disclosure | 도서관 위치만 외우고 다님. 필요할 때 가서 빌림. | 가벼움. 필요한 책만 정확히. |

### 7.4 Skills 시스템도 같은 원리

여담이지만, Claude의 Skills 시스템(`.claude/skills/SKILL.md`)이 정확히 progressive disclosure를 구현한다. SKILL.md의 frontmatter(`name` + `description`)만 컨텍스트에 자동 로드되고, **Claude가 해당 skill이 task에 맞다고 판단할 때만 본문이 로드**된다.

CLAUDE.md에서 같은 패턴을 흉내내려면 다음과 같이 적는다.

```markdown
## References

다음 문서들은 필요 시에만 읽어라:

- **API 작업 시**: @docs/API_SPEC.md
- **DB 스키마 변경 시**: @docs/DATA_MODEL.md
- **마크다운 파싱 작업 시**: @docs/MARKDOWN_PIPELINE.md
- **보안 검토 시**: @docs/SECURITY.md
```

조건을 명시하면 Claude가 더 정확히 판단한다.

---

## 8. 반복 문제를 CLAUDE.md에 추가하는 법 — 피드백 루프

이게 실전에서 CLAUDE.md를 **살아있는 문서**로 만드는 핵심 방법이다.

### 8.1 기본 패턴 — "고치는 김에 CLAUDE.md에도 추가해줘"

Claude가 같은 실수를 반복할 때, 그 자리에서 수정만 하고 끝내지 말고 **CLAUDE.md에 그 교훈을 박아넣는다**.

> *"Tell Claude to add the correction to CLAUDE.md itself. Over time, your CLAUDE.md becomes a living record of your codebase's quirks and preferences, written by the same tool that consumes it."* — [TurboDocx](https://www.turbodocx.com/blog/how-to-write-claude-md-best-practices)

### 8.2 실전 예시 — markflow에서 자주 발생하는 반복 실수와 CLAUDE.md 패치

#### 사례 1 — import 경로를 자꾸 틀림

**문제**: Claude가 `import { db } from '../../../packages/db'`처럼 상대 경로를 자꾸 쓰는데, 프로젝트는 `@markflow/db` alias를 쓴다.

**프롬프트**:
```
import 경로를 또 상대 경로로 썼네. tsconfig에 @markflow/* alias가 있으니 그걸 써야 해.
이번 파일 수정하고, CLAUDE.md에도 다음 규칙 추가해줘:
"패키지 간 import는 항상 @markflow/* alias 사용. 상대 경로 금지."
```

**결과 (CLAUDE.md에 추가됨)**:
```markdown
## Conventions
- 패키지 간 import: 항상 `@markflow/*` alias 사용 (예: `@markflow/db`, `@markflow/editor`)
- 같은 패키지 내부: 상대 경로 허용
```

#### 사례 2 — `any` 타입을 자꾸 씀

**문제**: 시간 압박 받으면 Claude가 `any`로 도망감.

**프롬프트**:
```
또 any 썼네. 이번엔 명시적 타입으로 고치고, Safety 섹션에 다음 추가해줘:
"any 타입 사용 시 PR 차단. unknown + 타입 가드 또는 명시 타입 사용."
```

**결과**:
```markdown
## Safety
- TypeScript `any` 사용 금지. `unknown` + 타입 가드 또는 명시 타입.
- (예외) 외부 라이브러리 타입 누락 시 `@ts-expect-error` 코멘트와 함께 한정 범위에서만.
```

#### 사례 3 — 마크다운 파이프라인 순서를 자꾸 바꿈

**문제**: rehype-sanitize를 중간에 넣음. XSS 취약점 발생 가능.

**프롬프트**:
```
sanitize 위치를 또 잘못 잡았네. 항상 파이프라인 마지막에 와야 해.
이번 코드 고치고, CLAUDE.md에 그림 그려서 박아둬:
"remark → remark-gfm → remark-rehype → rehype-highlight → rehype-sanitize → rehype-stringify (순서 고정)"
```

**결과**:
```markdown
## Markdown Pipeline (순서 고정)

remark → remark-gfm → remark-rehype → rehype-highlight → rehype-sanitize → rehype-stringify

⚠️ rehype-sanitize는 반드시 마지막. 변경 금지.
```

### 8.3 피드백 루프의 효과

- CLAUDE.md가 **codebase의 quirks를 기록한 살아있는 문서**가 됨
- 같은 실수의 재발률이 시간이 지나며 단조 감소
- 신규 입사자도 CLAUDE.md만 읽으면 "왜 이 규칙이 있는지" 추정 가능

### 8.4 자동화 — `#` 단축키와 `/memory`

피드백 루프를 더 빠르게 하려면 Claude Code 빌트인 메커니즘을 활용한다.

```
# 작업 도중 단축키로 빠르게 메모
> # remark-gfm은 항상 remark-rehype 이전에 실행 (테이블/체크박스 파싱)

# Claude가 어떤 파일에 추가할지 묻고 추가함
```

```
# /memory로 CLAUDE.md 편집기 열기
> /memory
```

---

## 9. CLAUDE.md vs 시스템 프롬프트 vs 컨텍스트 vs 하네스

### 9.1 4가지 개념의 관계

| 개념 | 작성 주체 | 위치 | 변경 가능성 | 영향 범위 |
|------|---------|------|----------|---------|
| **내장 시스템 프롬프트** | Anthropic | npm 패키지 내부 (비공개) | ❌ 직접 수정 불가 | 모든 Claude Code 세션 |
| **CLAUDE.md** | 사용자 | `~/.claude/`, `<repo>/` | ✅ 자유롭게 | 해당 위치 스코프 |
| **사용자 프롬프트** | 사용자 | 매 턴 입력 | ✅ 매번 새로 | 해당 턴 |
| **컨텍스트 (전체)** | 위 모두의 합 | 모델 입력 | 위 요소들의 결과 | 매 추론 시점 |
| **하네스** | Claude Code | 코드 자체 | ❌ Anthropic 영역 | 도구·압축·세션 관리 |

### 9.2 시각화 (계층 구조)

```
┌────────────────────────────────────────────────┐
│              하네스 (Harness)                    │
│   = Claude Code 자체 (모델 + 도구 + 세션 관리)    │
│  ┌──────────────────────────────────────────┐  │
│  │            컨텍스트 (Context)              │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │     내장 시스템 프롬프트              │  │  │
│  │  │     (Anthropic, 비공개)             │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │     도구 정의 (24개 + MCP)           │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  ★ CLAUDE.md ★                    │  │  │
│  │  │  (사용자가 자유롭게 작성)             │  │  │
│  │  │  (첫 user message로 주입)           │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │   사용자 프롬프트 + 누적된 턴들       │  │  │
│  │  └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### 9.3 핵심 인사이트 — "CLAUDE.md는 하네스의 최고 레버리지 포인트"

위 그림에서 보면, **사용자가 직접 손댈 수 있는 가장 영향력 큰 지점은 CLAUDE.md**다. 시스템 프롬프트는 못 만지고, 도구 정의도 못 만지고, 매 턴 프롬프트는 너무 일시적이다. CLAUDE.md만이 **"한 번 작성하고 영구히 모든 세션에 영향"**을 줄 수 있다.

### 9.4 "Advisory, not enforcement" — CLAUDE.md의 본질

마지막으로 가장 중요한 한 가지.

> Claude Code 공식 best practices의 표현:
>
> *"Unlike CLAUDE.md instructions which are **advisory**..."* — [Claude Code Best Practices 공식](https://code.claude.com/docs/en/best-practices)

즉, CLAUDE.md의 지시는 본질적으로 **권고(advisory)** 다. 모델이 따를 확률을 높이지만, 100% 보장하진 않는다. 커뮤니티에서는 이를 *"context, not enforcement"* 라고 부르기도 한다(공식 표현 아님). 반드시 지켜져야 하는 규칙이라면 **Hook으로 결정론적으로 강제**한다.

```
[CLAUDE.md] "main 브랜치 직접 push 금지"
     ↓ (advisory, 확률적 준수)
[Hook] PreToolUse → bash 명령에 "git push origin main" 감지 시 exit 2 (차단)
     ↓ (결정론적, 100% 차단)
```

공식 문서도 같은 맥락에서 이렇게 권한다:

> *"Use hooks for actions that must happen every time with zero exceptions. Hooks run scripts automatically at specific points in Claude's workflow. Unlike CLAUDE.md instructions which are advisory..."* — [Claude Code Best Practices 공식](https://code.claude.com/docs/en/best-practices)

CLAUDE.md는 **방향 제시(advisory)**, Hook은 **강제 집행(enforcement)**. 두 메커니즘을 같이 써야 안전망이 완성된다.

---

## 10. 카파시(Andrej Karpathy)의 CLAUDE.md — 분석과 시사점

### 10.1 원문 핵심

[github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md](https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md)에서 공개한 카파시의 CLAUDE.md는 단 4개 원칙으로 구성된다. 전체 분량 **약 50줄**.

#### 원칙 1 — Think Before Coding (코딩 전에 생각해라)

> *Don't assume. Don't hide confusion. Surface tradeoffs.*

요약:
- 가정은 명시적으로 말해라. 확신 없으면 묻기.
- 해석이 여럿이면 제시. 혼자 결정 X.
- 더 간단한 방법이 있으면 제안. 필요하면 push back.
- 불분명한 게 있으면 멈춰서 질문.

#### 원칙 2 — Simplicity First (단순함이 먼저)

> *Minimum code that solves the problem. Nothing speculative.*

요약:
- 요청한 것 외에는 기능 추가 X.
- 한 번만 쓸 코드에 추상화 X.
- 요청 안 한 "유연성", "configurability" X.
- 일어날 수 없는 시나리오의 에러 핸들링 X.
- 200줄 짜리를 50줄로 가능하면 다시 써라.

자가 점검 질문: "시니어 엔지니어가 보면 over-engineered라고 할까?"

#### 원칙 3 — Surgical Changes (외과적 변경)

> *Touch only what you must. Clean up only your own mess.*

요약:
- 인접 코드 "개선" 금지.
- 안 깨진 거 리팩토링 금지.
- 기존 스타일 따라가기 (다르게 하고 싶어도).
- 변경한 line은 모두 사용자 요청에 직접 trace 가능해야 함.

#### 원칙 4 — Goal-Driven Execution (목표 기반 실행)

> *Define success criteria. Loop until verified.*

요약: task를 검증 가능한 목표로 변환.
- "검증 추가해줘" → "잘못된 입력에 대한 테스트 작성 후 통과시켜라"
- "버그 고쳐줘" → "버그를 재현하는 테스트 작성 후 통과시켜라"
- "X 리팩토링" → "테스트가 전후 모두 통과하는지 확인"

### 10.2 카파시 CLAUDE.md의 6가지 시사점

#### 시사점 1 — **짧다 (50줄)**

200줄 권장 한도의 1/4. 그러나 거의 모든 LLM 코딩 안티 패턴을 커버. **"짧을수록 안 무시된다"**는 §3.1의 교훈을 극단적으로 적용.

#### 시사점 2 — **기술 스택 명세가 아니라 행동 가이드라인**

Tech Stack, Commands, Architecture가 **전혀 없다**. 카파시 CLAUDE.md는 "이 프로젝트는 X 스택입니다" 정보가 0%다. 대신 **"LLM이 코딩할 때 자주 망치는 행동 패턴"**을 명시적으로 막는 데 100% 집중.

→ 시사점: 이건 **User-level CLAUDE.md (`~/.claude/CLAUDE.md`)**에 적합한 스타일. 모든 프로젝트에 공통 적용되는 base behavior.

#### 시사점 3 — **트레이드오프 명시**

```
**Tradeoff:** These guidelines bias toward caution over speed.
For trivial tasks, use judgment.
```

규칙을 무조건 강요하지 않는다. **"이건 신중함 vs 속도 사이의 선택이고, 우리는 신중함 쪽을 택한다. 단, trivial한 task에선 판단해라"**를 명시. 모델에게 컨텍스트와 재량권을 동시에 준다.

#### 시사점 4 — **실패 모드를 명확히 지목**

"좋은 코드 작성해라"가 아니라 **"LLM이 자주 망치는 것"**을 콕 집어 지목.

- "Don't hide confusion" — LLM이 모를 때 모른다고 안 하고 그럴듯하게 추측하는 패턴
- "Don't pick silently" — 해석이 여럿일 때 묻지 않고 하나 고르는 패턴
- "If you write 200 lines and it could be 50, rewrite it" — 과잉 추상화 패턴
- "Don't improve adjacent code" — scope creep 패턴

이게 §3에서 다룬 "안티 패턴 직접 지목"의 모범 사례.

#### 시사점 5 — **측정 가능한 성공 기준**

CLAUDE.md 맨 마지막 줄:

> **These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

**"이 가이드가 잘 작동하면 이런 신호가 보일 것"**을 명시. 자체 검증 가능한 KPI.

이건 매우 드문 패턴이다. 대부분 CLAUDE.md는 "지시"만 적고 "잘 됐는지 확인하는 방법"은 안 적는다. 카파시는 자기 가이드의 효용성을 측정할 수 있게 만들었다.

#### 시사점 6 — **"Merge with project-specific instructions as needed"**

맨 첫 줄에 명시.

> *Merge with project-specific instructions as needed.*

이건 base layer로 의도된 문서. **User-level에 두고, 프로젝트별 CLAUDE.md와 결합해 쓰라**는 신호. §0.3에서 다룬 4단계 hierarchy(User → Project → Local → Subfolder)의 User 레이어 활용 모델.

### 10.3 권장 활용 — 카파시 스타일을 User 레이어에 적용

```bash
# 1. 카파시 스타일 base behavior를 User-level에 두기
mkdir -p ~/.claude
cp <somewhere>/karpathy-claude.md ~/.claude/CLAUDE.md

# 2. 각 프로젝트는 자기 컨텍스트만 적기 (markflow 예시)
cd ~/code/markflow
# <repo>/CLAUDE.md 에는 Tech Stack, Architecture, Conventions만
```

결과: 모든 프로젝트에서 카파시의 4원칙이 base로 깔리고, 그 위에 프로젝트별 컨텍스트가 얹힘. **중복 없이 행동 + 컨텍스트 양쪽 모두 커버**.

### 10.4 추가 응용 — `.claude/rules/`에서도 동일 패턴

카파시의 4원칙 중 **프로젝트 특수성이 강한 것**(예: "Don't improve adjacent code")은 `.claude/rules/code-style.md`에 두고 항상 로드. **task별 특수성**(예: TDD 적용)은 `.claude/rules/testing.md`에 두고 paths로 조건부 로드.

---

## 11. 강의 정리 — 좋은 CLAUDE.md 7원칙

1. **짧게 — 150줄 이하**. 길수록 무시된다.
2. **WHY / WHAT / HOW 구조**. 신규 입사자 온보딩 관점.
3. **자명한 것은 적지 마라**. 코드가 보여주는 것은 코드에 맡긴다.
4. **Linter가 할 일은 Linter에게**. CLAUDE.md는 의미론적 규칙만.
5. **Progressive Disclosure**. 모든 정보를 우겨넣지 말고, 포인터만 두기.
6. **피드백 루프**. Claude가 같은 실수 3번 → CLAUDE.md에 추가.
7. **Context, not enforcement**. 반드시 지켜야 하는 건 Hook으로 결정론적 강제.

---
