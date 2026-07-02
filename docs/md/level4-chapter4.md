# ③ 심화 개념

## 🟣 LEVEL 4 — 스킬·커맨드·Hook·프롬프트·컨텍스트

> **실습 프로젝트**: markflow — 마크다운 에디터 기반 지식 관리 시스템  
> 오픈소스 리포지토리: https://github.com/claude-code-expert/markflow  
> 기술 스택: Next.js · Drizzle ORM · PostgreSQL · Tailwind CSS · TypeScript

---

## 3.1 프롬프트와 컨텍스트 엔지니어링

### 3.1.1 프롬프트 vs 컨텍스트 엔지니어링 차이

"프롬프트 엔지니어링"과 "컨텍스트 엔지니어링"은 자주 혼동되지만 다른 개념이다.

| 구분 | 프롬프트 엔지니어링 | 컨텍스트 엔지니어링 |
|------|------------------|------------------|
| 초점 | 좋은 질문을 하는 기술 | AI가 추론하는 순간에 올바른 정보를 제공하는 환경 설계 |
| 대상 | 단일 요청의 문구·구조 | 세션 전반의 정보 배분·관리 |
| 결과물 | 더 나은 응답 | 더 효율적인 세션 |

프롬프트 엔지니어링이 "무엇을 물을까"를 다룬다면, 컨텍스트 엔지니어링은 "AI의 책상 위에 어떤 정보가 올려져 있어야 하는가"를 설계하는 것이다.

> "컨텍스트 엔지니어링은 AI가 최고의 성과를 낼 수 있는 환경을 설계하는 기술이다."  
> — Anthropic, Effective context engineering for AI agents (2025.09.29)  
> 출처: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

**Prompt → Context → Harness — 4년의 패러다임 이동**

| 시대 | 핵심 질문 | 엄밀함이 사는 곳 | 핵심 메트릭 |
|------|---------|---------------|-----------|
| **Prompt** (2022–2024) | 어떤 말을 해야 하나? | 프롬프트 텍스트 | 응답 품질 (주관적) |
| **Context** (2025) | 어떤 정보를 넣어야 하나? | 컨텍스트 윈도우 구성 | KV-cache hit rate |
| **Harness** (2026~) | 어떤 시스템을 만들어야 하나? | 시스템 아키텍처 | 태스크 완료율, $/태스크 |

각 시대는 이전을 **대체하지 않고 포함(subsume)** 한다. 좋은 하네스는 좋은 컨텍스트를, 좋은 컨텍스트는 좋은 프롬프트를 여전히 요구한다. **L3에서는 Prompt·Context까지** 다루고, **하네스 엔지니어링은 Level 7(7.1 Subagent / 7.2 하네스 엔지니어링 / 7.3 오픈소스 하네스 케이스 / 7.4 나만의 하네스 만들기)** 에서 자세히 다룬다.

---

### 3.1.2 Context Rot 현상과 대응

**Context Rot**은 대화가 길어질수록 Claude의 응답 품질이 저하되는 현상이다. 컨텍스트 윈도우가 관련 없는 정보로 오염될수록 주의 예산(Attention Budget)이 분산되어 발생한다.

> 출처: Chroma Research, "Context Rot" 연구 — https://www.trychroma.com/research/context-rot

**왜 발생하는가 — Self-Attention의 n² 비용**

LLM의 Transformer는 모든 토큰 쌍 사이의 어텐션 점수를 계산하므로 컨텍스트 길이 n에 대해 비용이 O(n²)로 증가한다. 토큰 100개의 어텐션은 1만 쌍, 10만 토큰은 100억 쌍이다. 단순 계산량 문제만이 아니라, 어텐션이 분산될수록 "지금 핵심이 무엇인지"를 식별하는 정확도가 떨어진다.

> "컨텍스트는 LLM의 가장 비싼 자원이다. 모든 토큰이 추론 비용을 곱한다."  
> — Tobi Lütke (Shopify CEO), 2025년 X(Twitter) 발언

이 때문에 단순히 "더 많이 넣어주자"는 전략은 비용·품질 양쪽에서 역효과를 낸다. 작업에 정말 필요한 토큰만 적시에 로드하는 **컨텍스트 엔지니어링**이 실무 핵심이 된다.

**Context Rot의 주요 원인**

- CLAUDE.md에 너무 많은 내용을 넣어 매 턴마다 수천 토큰이 낭비됨
- 전체 프로젝트를 미리 읽혀 관련 없는 파일까지 컨텍스트에 올라옴
- 긴 디버깅 세션에서 시행착오 대화가 누적됨
- 사용하지 않는 MCP 서버의 도구 정의가 수천 토큰을 차지함

**대응 전략 요약**

| 원칙 | 실천 방법 |
|------|---------|
| 컨텍스트는 유한한 자원 | `/context`로 사용량 모니터링 |
| 적을수록 좋다 | CLAUDE.md는 200줄 이하, 상세 문서는 별도 파일로 분리 |
| 적시에 로드한다 | 전체 프로젝트를 미리 읽히지 말고 필요한 파일만 |
| 정기적으로 정리한다 | 마일스톤마다 `/compact`, 작업 전환 시 `/clear` |
| 메모로 연결한다 | `/memory`로 핵심 결정사항을 세션 너머로 전달 |
| 도구를 최소화한다 | 불필요한 MCP 서버 비활성화, `.claudeignore` 설정 |

---

### 3.1.3 `/context` 시각화 + 200K/1M 컨텍스트 활용

`/context` 명령어는 현재 세션의 컨텍스트 윈도우 상태를 색상 그리드로 시각화한다.

```bash
/context
```

표시되는 정보:

- 현재 사용 중인 모델과 버전
- 현재 소비한 토큰 / 전체 가용 토큰
- 카테고리별 토큰 배분 (시스템 프롬프트, 도구 정의, 파일, 메시지 등)
- 자동 압축(auto-compact) 트리거까지 남은 여유
- MCP 호출로 소비된 토큰량

[스크린샷 영역: /context 명령어 실행 결과 화면 — markflow 프로젝트에서 실행 예시]

**200K vs 1M 컨텍스트 선택 기준**

markflow처럼 문서 파일이 수십~수백 개 쌓이는 프로젝트에서는 컨텍스트 선택이 중요하다.

| 컨텍스트 | 적합한 상황 |
|---------|-----------|
| 200K (기본) | 단일 문서 편집, 특정 API 구현, 단일 컴포넌트 작업 |
| 1M | 전체 마크다운 문서 인덱싱 분석, 대규모 리팩터링, 문서 간 연결 구조 파악 |

1M 컨텍스트는 Opus 4.7 / 4.6 및 Sonnet 4.6에서 지원한다. 모델·플랜별 활성 조건이 다르다.

| 모델 | 기본 | 1M 활성 조건 |
|------|------|-----------|
| Opus 4.7 / 4.6 | 200K | Max · Team · Enterprise 자동 포함 / **Pro는 Extra Usage 필요** |
| Sonnet 4.6 | 200K | **모든 플랜에서 Extra Usage 필요** (Pro 포함) |
| Haiku 4.5 | 200K | 1M 미지원 — 200K 고정 |

> 1M은 무제한이 아니다. 컨텍스트가 커질수록 Context Rot 위험도 같이 커지므로 "필요할 때" 쓰는 도구로 다룬다.

---

### 3.1.4 사용률별 전략 (50% / 70% / 90%+)

컨텍스트 사용률에 따라 대응 전략이 달라진다.

| 사용률 | 상태 | 권장 행동 |
|--------|------|---------|
| ~40% | 안전 구간 | 정상 작업 계속 |
| 40~70% | 주의 구간 | 압축 고려 시작. 마일스톤 완료 시 `/compact` |
| 70~90% | 위험 구간 | 즉시 `/compact` 실행. 핵심 결정사항 `/memory`에 기록 |
| 90%+ | 임박 | `/clear`로 완전 초기화 또는 자동 압축 발동 |

> **40% 룰 (HumanLayer 12-Factor Agents, 2025)** — 컨텍스트가 40%를 넘기면 모델의 지시 이행 능력이 급격히 떨어지는 경험칙(직관과 정반대). 정확한 임계값은 워크로드 의존이지만, "여유 있음"의 기준선을 50%가 아닌 40%로 잡는 편이 안전하다.

> **KV-cache hit rate — 진짜 비용 메트릭** — 이전 요청과 컨텍스트 접두어가 동일하면 그 부분이 재계산되지 않는다. Anthropic prompt caching 가격 기준 캐시 히트 시 비용이 약 **1/10**(write 1.25× → hit 0.1×). **접두어의 토큰 하나만 바뀌어도 캐시는 전부 무효화**되므로, Google ADK 패턴은 컨텍스트를 두 영역으로 나눈다 — **Stable Prefix**(시스템 프롬프트·도구 정의·장기 요약, 자주 변하지 않음)와 **Variable Suffix**(최신 입력·새 도구 출력, 자주 변함).

**수동 compact vs 자동 compact**

| 구분 | 수동 (`/compact`) | 자동 (~95% 도달) |
|------|------------------|----------------|
| 트리거 | 사용자 명시적 호출 | 컨텍스트 윈도우 임계 도달 |
| 보존 기준 | 사용자 지시문에 따라 선택적 | 일반화된 요약 — 세부 결정 누락 가능 |
| 권장 시점 | 마일스톤 완료, 작업 전환 직전 | 마지막 안전망 (피할 수 있으면 피하기) |

`/compact`는 **자유 프롬프트**로 보존 기준을 줄 수 있다. 자동 압축은 균질하게 요약하지만, 수동 압축은 "무엇을 살리고 무엇을 버릴지" 명시할 수 있다.

```bash
# focused compaction — 핵심만 살리고 시행착오 제거
/compact 아키텍처 결정사항만 보존, 시행착오 대화 제거

/compact remark-rehype 파이프라인 결정과 sanitize 위치만 유지하고
         중간 디버깅 과정은 모두 버려라
```

**markflow 세션 워크플로우 패턴**

```bash
# 세션 시작 시
/context          # 현재 상태 확인
/cost             # 비용 기준점 확인

# 문서 에디터 기능 구현 중
/context          # 주기적으로 모니터링

# 마일스톤 완료 시 (예: 실시간 미리보기 구현 완료)
/memory           # "remark-rehype 파이프라인, remark-gfm으로 GFM 파싱" 등 기록
git commit -m "feat: 실시간 마크다운 미리보기 구현"
/compact          # 탐색 과정 제거, 구현 결과만 보존

# 완전히 다른 기능으로 전환 시 (예: 에디터 → 검색 기능)
/clear            # 컨텍스트 완전 초기화
```

---

## 3.2 CLAUDE.md & AGENTS.md

### 3.2.1 4단계 계층 (전역 · 프로젝트 · 서브폴더 · 조직)

CLAUDE.md는 **4단계 계층**으로 로드되어 **컨텍스트에 concat된다** (override 아님). 충돌 시 우선순위는 로딩 순서의 **역방향** (구체적인 쪽이 이긴다).

#### 4단계 계층 개요

| 계층 | 범위 | 위치 | 공유 |
|------|------|------|------|
| **① 조직 (System Managed Policy)** | 회사 전체 | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`<br>Linux/WSL: `/etc/claude-code/CLAUDE.md`<br>Windows: `C:\Program Files\ClaudeCode\CLAUDE.md` | 조직 IT가 MDM으로 배포 |
| **② 전역 (User)** | 본인의 모든 프로젝트 | `~/.claude/CLAUDE.md` | 개인 환경 |
| **③ 프로젝트 (Project)** | 팀 (Git 커밋) | `./CLAUDE.md` 또는 `./.claude/CLAUDE.md` | 둘 다 동등한 Project 위치 |
| **④ 서브폴더 (Lazy-load)** | 모노레포 패키지·서브폴더 | `apps/web/CLAUDE.md` 등 | 해당 폴더 파일 읽을 때만 로드 |

추가로 본인 한정 임시 메모리는 `./CLAUDE.local.md` (`.gitignore` 등록 필수).

#### 로딩 순서 vs 우선순위

> 공식 원문: *"More specific locations take precedence over broader ones."* — Anthropic, Claude Code memory docs

**로딩 순서** (filesystem root → 작업 디렉터리):  
조직 → 전역 → 프로젝트 → (서브폴더는 lazy-load)

**우선순위 (precedence)** — 충돌 시 이기는 쪽:  
**Local > 서브폴더 > 프로젝트 > 전역 > 조직**

즉 **로딩 순서의 역방향**이 우선순위다. 단, **조직(Managed Policy)은 우선순위가 가장 낮지만 `claudeMdExcludes`로도 제외 불가** — 조직 IT 정책 강제 보장.

#### 서브폴더 lazy-load의 실용 가치

서브폴더 CLAUDE.md는 launch 시 로드되지 **않고**, **그 폴더의 파일을 읽는 시점에만 로드**된다. 모노레포 패키지별 컨벤션 분리에 유용하다.

```
markflow/
├── CLAUDE.md                          # 프로젝트 공통 (Next.js + Fastify 5)
├── apps/
│   ├── web/CLAUDE.md                  # apps/web 파일 읽을 때만 로드 (Next.js 15 규칙)
│   └── api/CLAUDE.md                  # apps/api 파일 읽을 때만 로드 (Fastify 5 규칙)
└── packages/
    ├── editor/CLAUDE.md               # packages/editor 작업 시만 로드 (CodeMirror 6 규칙)
    └── db/CLAUDE.md                   # packages/db 작업 시만 로드 (Drizzle ORM 규칙)
```

이 구조의 효과:
- 전체 컨텍스트에 모든 규칙이 늘 떠 있지 않아 **토큰 절약**
- 패키지별 책임이 분리돼 **유지보수 용이**
- 신규 팀원이 특정 패키지만 만져도 **그 패키지 규칙만 자동 주입**

---

### 3.2.2 효과적인 CLAUDE.md 작성법

**나쁜 예 — 모든 것을 담은 CLAUDE.md**

```markdown
## 프로젝트 소개
markflow는 마크다운 지식 관리 시스템으로, Next.js 15를 사용하며...
(200줄의 프로젝트 설명)

## 기술 스택 상세
Next.js 15의 App Router는 기존 Pages Router와 달리...
(150줄의 기술 설명)

## 모든 API 엔드포인트 목록
GET /api/documents - 전체 문서 조회
POST /api/documents - 문서 생성
(100줄의 API 문서)
```

이 파일이 500줄이면 매 턴마다 수천 토큰이 "프로젝트 소개"를 읽는 데 소비된다.

**좋은 예 — 핵심만 담은 CLAUDE.md (200줄 이하 권장)**

```markdown
# markflow — 마크다운 지식 관리 시스템

## 기술 스택
- Framework: Next.js 15 App Router + TypeScript
- ORM: Drizzle (스키마: src/server/db/schema.ts)
- 검증: Zod (프론트/백엔드 공유)
- 스타일: Tailwind CSS 4
- 에디터: CodeMirror 6
- 마크다운: remark + rehype 파이프라인
- DB: PostgreSQL (Neon)
- 테스트: Vitest + Testing Library

## 핵심 명령어
npm run dev        # 개발 서버 (포트 3000)
npm run test       # Vitest 전체 실행
npm run lint       # ESLint 검사
npm run db:push    # Drizzle 스키마 반영

## 필수 규칙
- TDD: 테스트 먼저 작성 → 구현 → 리팩터링
- 요청한 파일만 수정. 다른 파일 수정 금지
- any 타입 사용 금지
- 테스트를 삭제하거나 비활성화하지 마
- API 응답: 성공 { data: ... }, 실패 { error: '메시지' }
- XSS 방지: 사용자 입력 마크다운은 반드시 sanitize 처리

## 상세 문서 위치
- API 설계: docs/API_SPEC.md
- 데이터 모델: docs/DATA_MODEL.md
- 컴포넌트 설계: docs/COMPONENT_SPEC.md
```

상세 문서는 CLAUDE.md에 직접 쓰지 않고 **경로(참조)만 기록**한다. 모델이 해당 주제를 만났을 때 그 파일을 직접 읽도록 — 평소엔 토큰을 차지하지 않다가 필요할 때만 컨텍스트에 들어오는 패턴이다.

---

### 3.2.3 코딩 컨벤션과 프로젝트 규칙 전달

markflow 프로젝트 기준 CLAUDE.md 컨벤션 섹션 예시:

```markdown
## 코딩 컨벤션

### 네이밍 규칙
- 컴포넌트: PascalCase (MarkdownEditor.tsx)
- 함수/변수: camelCase (parseDocument)
- 상수: UPPER_SNAKE_CASE (MAX_DOCUMENT_SIZE)
- 파일: kebab-case (markdown-editor.ts)

### 마크다운 처리 규칙
- 파싱: remark-parse → remark-gfm → rehype-stringify 파이프라인 준수
- XSS 방지: rehype-sanitize 항상 마지막에 적용
- 코드 블록: rehype-highlight로 신택스 하이라이팅

### 금지 사항
- `any` 타입 사용 금지
- console.log 프로덕션 코드에 남기지 않음
- innerHTML 직접 사용 금지 (dangerouslySetInnerHTML도 허용 안 함)

### API 응답 형식 (반드시 준수)
성공: { "data": ... }
실패: { "error": "에러 메시지" }
```

> **핵심**: CLAUDE.md는 'context, not enforcement'다. 규칙이 반드시 지켜져야 한다면 Hook으로 강제하는 것이 더 안전하다.

---

### 3.2.4 `.claude/rules/*.md` + `paths:` frontmatter

CLAUDE.md가 프로젝트 전체에 적용되는 설정이라면, `.claude/rules/` 파일들은 **특정 경로에서 작업할 때만** 자동으로 활성화된다.

```yaml
# .claude/rules/api-routes.md
---
paths:
  - "src/app/api/**/*.ts"
---

# API 개발 규칙

## 응답 형식
모든 API 엔드포인트는 다음 형식을 준수한다:
{ "success": boolean, "data": any | null, "error": string | null }

## 문서 API 특이사항
- GET /api/documents: 페이지네이션 필수 (cursor 기반)
- POST /api/documents: slug 자동 생성 (title 기반 slugify)
- PATCH /api/documents: 낙관적 업데이트 지원

## 유효성 검사
- 모든 입력은 Zod 스키마로 검증
- 스키마 파일은 src/lib/schemas/에 위치
```

```yaml
# .claude/rules/editor-components.md
---
paths:
  - "src/components/editor/**/*.tsx"
---

# 에디터 컴포넌트 규칙

## CodeMirror 6 컨벤션
- Extension 조합은 useMemo로 메모이제이션
- EditorView는 useRef로 관리, 직접 DOM 조작 금지
- onChange 디바운스: 300ms 기본

## 마크다운 미리보기
- 항상 rehype-sanitize 마지막에 적용
- 코드 블록 신택스 하이라이팅: highlight.js 사용
```

**Glob 패턴 기본 문법**

| 패턴 | 설명 | 예시 |
|------|------|------|
| `*` | 파일명의 모든 문자 | `*.ts` → 모든 .ts 파일 |
| `**` | 모든 디렉터리 (재귀) | `src/**/*.ts` → src 하위 모든 .ts |
| `{a,b}` | OR 패턴 | `*.{ts,tsx}` → .ts 또는 .tsx |
| `!` | 제외 | `!*.test.ts` → 테스트 파일 제외 |

---

### 3.2.5 `@path/to/file` 임포트 패턴

CLAUDE.md에서 다른 문서를 참조할 때 `@` 패턴을 사용한다.

```markdown
# CLAUDE.md

## 상세 문서
@docs/API_SPEC.md 를 참고해서 API를 구현한다.
@docs/DATA_MODEL.md 에 정의된 Drizzle 스키마를 따른다.
@AGENTS.md 의 지침을 반드시 준수한다.
```

markflow의 문서 API는 복잡한 스키마를 가지므로 CLAUDE.md에 전체를 넣지 않고 `@docs/API_SPEC.md`로 참조만 해두는 것이 효율적이다.

---

### 3.2.6 AGENTS.md — 모든 에이전트를 위한 표준 문서

CLAUDE.md는 Claude Code 전용이다. Cursor, GitHub Copilot, Gemini CLI 등 여러 AI 도구를 함께 사용하는 팀이라면 **AGENTS.md 표준**을 활용한다.

AGENTS.md는 OpenAI Codex · Amp · Google Jules · Cursor · Factory 등이 공동으로 만든 도구 중립 오픈 표준이다. README가 사람용이라면 AGENTS.md는 코딩 에이전트용 지시 파일 — 여러 에이전트가 한 리포에서 함께 동작할 때 단일 출처 역할을 한다.

- 공식 사이트: https://agents.md

**CLAUDE.md에서 AGENTS.md 참조하는 방법 (권장)**

```markdown
<!-- CLAUDE.md -->
@AGENTS.md 를 반드시 읽고 모든 지침을 따를 것.

## Claude Code 전용 설정
- 코드 수정 전 반드시 관련 테스트를 먼저 실행할 것
- 마크다운 파싱 관련 변경은 항상 XSS 검토 포함
- 대규모 변경은 서브에이전트를 활용할 것
```

---

## 3.3 슬래시 커맨드

### 3.3.1 빌트인 커맨드 살펴보기 — `/help`로 보는 60개의 지도

```bash
/help
```

Claude Code 2.1.x 기준 빌트인 슬래시 커맨드는 **약 60개**다 (50+개 네이티브 + 5~6개 번들 스킬). `/` 입력 후 글자를 이어 입력하면 자동완성된다. 분류해 보면 다음과 같다.

| 카테고리 | 주요 명령어 (예시) | 용도 |
|---------|-----------------|------|
| **세션 관리** | `/clear`, `/compact`, `/context`, `/resume`, `/branch`, `/fork`, `/rewind` | 컨텍스트·체크포인트·세션 분기 |
| **설정·환경** | `/config`, `/keybindings`, `/login`, `/logout`, `/doctor` | 인증·키바인딩·진단 |
| **확장 시스템** | `/init`, `/memory`, `/agents`, `/skills`, `/hooks`, `/mcp` | 5대 확장 포인트 관리 |
| **모델·추론** | `/model`, `/effort`, `/cost`, `/status` | 모델 전환·추론 깊이·비용 |
| **권한·모드** | `/plan`, `/permissions` | 권한 모드 전환 |
| **리뷰·검증** | `/review`, `/security-review`, `/diff` | 코드·보안 리뷰, 변경 비교 |
| **번들 스킬** | `/batch`, `/simplify`, `/loop`, `/debug`, `/claude-api` | 자동 활성화도 가능한 빌트인 스킬 |
| **원격·이동** | `/remote-control`, `/teleport`, `/mobile` | 클라우드↔로컬 세션 연결 |
| **메타** | `/help`, `/feedback`, `/btw`, `/quit` | 도움말·피드백·종료 |

> **참고**: 정확한 명령어 수는 버전마다 다르다. 본 강의 제작 시점(2026-05)에 `/help`를 실행하면 60개 안팎의 명령이 표시된다. 강의 촬영 시점에는 본인 환경에서 한 번 더 확인하자.  
> 출처: [code.claude.com/docs/en/commands](https://code.claude.com/docs/en/commands), [gradually.ai — Claude Code Commands](https://www.gradually.ai/en/claude-code-commands/)

---

### 3.3.2 셋업·관리 명령어

| 명령어 | 설명 |
|--------|------|
| `/init` | 프로젝트 분석 후 CLAUDE.md 자동 생성. 새 프로젝트 시작 시 가장 먼저 실행 |
| `/agents` | 서브에이전트 목록 확인 및 관리 |
| `/skills` | 사용 가능한 스킬 목록 확인 |
| `/hooks` | 등록된 Hook 목록 확인 |
| `/mcp` | 연결된 MCP 서버 목록 확인 및 대화형 관리 UI |
| `/memory` | CLAUDE.md 메모리 파일 편집 |
| `/config` | 설정 편집 (Vim 모드, 테마, Editor 등) |

---

### 3.3.3 일일 워크플로우 명령어

| 명령어 | 설명 | 주요 사용 시점 |
|--------|------|-------------|
| `/plan` | 현재 요청에 한해 plan 모드로 계획 수립 | 구현 전 영향 범위 파악 |
| `/model` | 모델 전환 (picker UI 또는 alias 직접 지정) | 작업 유형에 맞게 전환 |
| `/effort` | 추론 깊이 조절 (low/medium/high/xhigh) — `xhigh`는 **Opus 4.7 전용**, 다른 모델은 `high`로 폴백 / 세션 한정 `max` 별도 존재 | 비용·속도 균형 조정 |
| `/cost` | 현재 세션의 토큰 비용 확인 | 예산 초과 전 확인 |
| `/compact` | 컨텍스트 압축. 포커스 키워드 지정 가능 | 70% 이상 사용 시 |
| `/clear` | 대화 완전 초기화 (CLAUDE.md는 유지) | 작업 주제 전환 시 |
| `/diff` | 대화형 변경사항 비교기 | 수정 내용 검토 시 |
| `/rewind` | 대화 및 코드 변경 되돌리기 | 결과가 마음에 안 들 때 |
| `/review` | PR 리뷰 수준으로 변경사항 점검 | 커밋·PR 전 |
| `/security-review` | 보안 취약점 분석 | XSS 관련 마크다운 처리 후 |
| `/context` | 컨텍스트 사용량 시각화 | 주기적 모니터링 |
| `/resume` | 이전 세션 재개 | 중단된 작업 이어가기 |

**markflow 실전 조합 예시**

```bash
# [예시 1] markflow 프로젝트 시작
/init            # CLAUDE.md 생성
/model sonnet    # 기본 모델 설정
이 프로젝트 구조를 분석하고 Drizzle 스키마 설계 제안해줘

# [예시 2] 마크다운 에디터 컴포넌트 작업
/context                                      # 사용량 확인
@src/components/editor/ 이 디렉터리 구조 분석해줘
/compact 에디터 컴포넌트 구조와 CodeMirror 6 설정만 보존

# [예시 3] XSS 취약점 점검
/security-review @src/lib/markdown.ts         # 마크다운 파싱 파일 점검
/diff                                          # 변경사항 확인

# [예시 4] PR 준비
!npm run test                                  # 테스트 직접 실행
/review                                        # 코드 리뷰
/security-review                               # 보안 점검
```

---

### 3.3.4 커스텀 커맨드 작성 (`.claude/commands/*.md`)

반복적으로 사용하는 프롬프트는 커스텀 커맨드로 저장한다. **마크다운 파일명이 커맨드 이름**이 된다.

```bash
mkdir -p .claude/commands
```

**markflow 코드리뷰 커맨드**

```markdown
<!-- .claude/commands/review.md -->
현재 변경된 파일들을 다음 기준으로 코드 리뷰해줘.

## 검토 항목

### 1. 타입 안전성
- TypeScript `any` 사용 여부
- 반환 타입 명시 여부

### 2. 보안 (markflow 특이사항)
- 마크다운 렌더링 시 rehype-sanitize 적용 여부
- innerHTML 또는 dangerouslySetInnerHTML 직접 사용 여부
- 사용자 입력 slug/title 검증 여부

### 3. 성능
- CodeMirror Extension 메모이제이션 여부
- Drizzle 쿼리 N+1 패턴
- 에디터 onChange 디바운스 적용 여부

### 4. 프로젝트 컨벤션 준수
- remark-rehype 파이프라인 순서 (sanitize 마지막)
- API 응답 형식 준수
- 테스트 작성 여부

심각도: 🔴 Critical | 🟡 Warning | 🟢 Suggestion
```

```bash
/review  # 이제 이 명령어로 사용 가능
```

---

### 3.3.5 `$ARGUMENTS` 변수와 동적 커맨드

```markdown
<!-- .claude/commands/fix-issue.md -->
GitHub 이슈 #$ARGUMENTS를 분석하고 수정해줘.

1. gh issue view $ARGUMENTS로 이슈 내용 확인
2. markflow 관련 파일 검색
3. 수정 구현 (TDD: 테스트 먼저)
4. 테스트 실행: npm run test
5. 커밋 후 PR 생성
```

```bash
/fix-issue 42   # $ARGUMENTS → "42"
```

**markflow 전용 커맨드 예시**

```markdown
<!-- .claude/commands/add-feature.md -->
markflow에 다음 기능을 TDD로 구현해줘: $ARGUMENTS

순서:
1. docs/COMPONENT_SPEC.md 검토
2. 실패하는 테스트 먼저 작성 (/tdd-red)
3. 최소 구현으로 테스트 통과 (/tdd-green)
4. 리팩터링 (/tdd-refactor)
5. /review로 코드 품질 점검
6. /security-review로 XSS 등 보안 점검
```

```bash
/add-feature 문서 태그 필터링 기능
```

---

### 3.3.6 실전 명령어 조합 패턴

**패턴 1 — TDD 사이클 강제**

```bash
/tdd-red 마크다운 파싱 함수   # 실패하는 테스트만 작성
/tdd-green                    # 최소 구현으로 통과
/tdd-refactor                 # 리팩터링
```

**패턴 2 — 기능 개발 완전 자동화**

```bash
/plan 트리 구조 사이드바 구현          # 계획 수립
/add-feature 트리 구조 사이드바        # 커스텀 커맨드로 TDD 구현
/review                                # 리뷰
/security-review                       # 보안 점검
git commit -m "feat: 트리 구조 사이드바"
/compact
```

**패턴 3 — 컨텍스트 오염 방지**

```bash
/context              # 사용률 확인
/cost                 # 비용 확인
/model haiku          # 간단한 작업으로 전환 시 모델도 전환
/compact              # 중간 정리
```

---

### 3.3.7 번들 스킬 사용하기 — `/batch` · `/simplify` · `/debug`

| 커맨드 | 설명 |
|--------|------|
| `/simplify` | 코드 복잡도 분석, 중복 제거, 단순화 제안 |
| `/debug` | 에러 원인 분석 및 수정 가이드 |
| `/batch` | 여러 파일에 걸친 반복 작업을 일괄 처리 |

```bash
# markflow 예시
/simplify @src/lib/markdown.ts      # 마크다운 파싱 유틸 단순화
/debug @src/app/api/documents/route.ts  # API 라우트 디버깅
```

---

## 3.4 Agent Skills 시스템

### 3.4.1 Agent Skill이란 무엇인가

Agent Skill은 YAML frontmatter와 마크다운 콘텐츠로 구성된 SKILL.md 파일로 정의된다. Claude가 대화 컨텍스트를 기반으로 언제 사용할지 자율적으로 판단하거나, 사용자가 슬래시 커맨드로 직접 호출할 수 있다.

**Skills vs 슬래시 커맨드 차이**

| 항목 | Skill | 슬래시 커맨드 |
|------|-------|------------|
| 호출 방법 | Claude가 자동으로 또는 `/skill-name`으로 | 사용자가 `/command`로 직접 |
| 컨텍스트 비용 | 설명(description)만 상주, 본문은 트리거 시 로드 | 설명만 상주, 본문은 호출 시 로드 (현재 동일 메커니즘) |
| 적합한 용도 | 재사용 지식·자동화 워크플로우 | 명시적으로 실행할 반복 작업 |

> 현재 Claude Code의 슬래시 커맨드와 Skill은 동일한 lazy-load 메커니즘으로 통합되어 있다. `.claude/commands/` 의 기존 커맨드도 본문은 호출 시점에만 로드된다. 신규 작성 시에는 SKILL.md 형식이 권장되며, 기존 커맨드는 마이그레이션 없이 그대로 사용해도 된다.

---

### 3.4.2 Skill이 수행할 수 있는 작업 유형

두 가지 유형으로 나뉜다.

**① Reference Skill — 참조 지식**

Claude가 현재 작업에 적용할 지식을 제공한다.

```yaml
# .claude/skills/drizzle-conventions/SKILL.md
---
name: drizzle-conventions
description: >
  Drizzle ORM patterns and conventions for markflow.
  Use when writing database schemas, queries, or migrations for this project.
allowed-tools: Read, Grep, Glob
---

When working with markflow's database layer:

## 스키마 위치
- 스키마: src/server/db/schema.ts
- 마이그레이션: drizzle/ 디렉터리

## 테이블 컨벤션
- ID: CUID2 사용 (`createId()` from `@paralleldrive/cuid2`)
- 타임스탬프: createdAt, updatedAt (항상 포함)
- documents 테이블: position은 1024 간격 정수 (삽입 최적화)

## 쿼리 패턴
- N+1 금지: with 절로 관계 데이터 한 번에 조회
- 트랜잭션: db.transaction(async (tx) => { ... })
- 페이지네이션: cursor 기반 (offset 금지)
```

**② Action Skill — 실행 워크플로우**

```yaml
# .claude/skills/deploy-staging/SKILL.md
---
name: deploy-staging
description: Deploy markflow to staging environment.
disable-model-invocation: true  # 사용자가 /deploy-staging으로 직접 호출해야만 실행
---

1. npm run build 실행 후 에러 확인
2. npm run test 전체 통과 확인
3. git tag staging-$(date +%Y%m%d-%H%M)
4. Vercel CLI로 staging 배포: vercel --env staging
5. 배포 URL 출력
```

---

### 3.4.3 사용 가능한 Skill 확인하기

```bash
/skills           # 로드된 스킬 목록 확인

# 파일 시스템에서 직접 확인
ls .claude/skills/*/SKILL.md          # markflow 프로젝트 스킬
ls ~/.claude/skills/*/SKILL.md        # 개인 전역 스킬
```

---

### 3.4.4 공식 Skill 카탈로그

Claude Code 공식 마켓플레이스에서 설치 가능한 주요 스킬들이다.

| 스킬 | 설명 | markflow 활용 예 |
|------|------|--------------|
| `frontend-design` | 고품질 UI 컴포넌트·페이지 생성 | 에디터 UI, 사이드바 컴포넌트 |
| `docx` | Word 문서 파일 생성·편집 | 마크다운 → Word 내보내기 기능 |
| `pdf` | PDF 생성·병합·분할 | 마크다운 → PDF 내보내기 기능 |
| `data-analysis` | CSV/Excel 데이터 분석 | 문서 통계 분석 |

---

### 3.4.5 Skill 활성화·비활성화, 유용한 사용 사례

```yaml
---
name: markdown-security
description: >
  Security rules for markdown processing in markflow.
  Use when writing or reviewing markdown parsing, rendering, or sanitization code.
allowed-tools: Read, Grep, Glob  # 읽기 전용으로 제한
---

# markflow 마크다운 보안 규칙

## XSS 방지 체크리스트
1. rehype-sanitize가 파이프라인 **마지막**에 위치하는지 확인
2. 허용된 태그 목록 이외 태그 필터링 확인
3. href 속성 javascript: 프로토콜 차단 확인
4. 사용자 입력 raw HTML 삽입 금지

## 절대 하면 안 되는 것
- dangerouslySetInnerHTML 직접 사용
- innerHTML에 sanitize 없이 마크다운 HTML 삽입
- 서버에서 클라이언트로 raw HTML 전달
```

---

## 3.5 Hook 시스템

### 3.5.1 Hook이란 무엇인가 — 4가지 타이밍

Hook은 Claude Code의 특정 이벤트 시점에 자동으로 셸 명령을 실행하는 기능이다. `.claude/settings.json`에 설정하며 프로젝트 단위로 관리된다.

> Claude Code v2.1.116(2026-04) 기준 hook 이벤트는 **26종**까지 늘었다 (PreToolUse·PostToolUse·UserPromptSubmit·Notification·Stop·SubagentStop·PreCompact·SessionStart·SessionEnd·PermissionRequest·PermissionDenied·PostToolUseFailure·StopFailure·SubagentStart·FileChanged·CwdChanged·ConfigChange·TaskCreated 등). 다만 실무에서 80%를 차지하는 **핵심 4가지 타이밍**부터 익히는 게 효율적이다.  
> 출처: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)

#### 핵심 4가지 타이밍

| 타이밍 | 발생 시점 | 주요 용도 | block 가능? |
|--------|---------|---------|:---------:|
| `PreToolUse` | 도구 실행 **전** | 실행 차단, 사전 검증, 자동 백업 | ✅ |
| `PostToolUse` | 도구 실행 **후** (성공) | 린트·포맷팅·자동 수정·로깅 | ❌ |
| `UserPromptSubmit` | 사용자 프롬프트 제출 시 | 컨텍스트 자동 주입 (Git 상태·날짜 등) | — |
| `Stop` | Claude 응답 완료 시 | 타입 체크, 빌드 검증, "더 작업하라" 강제 | ✅ (재계속) |

> **block 가능?**: hook가 `exit code 2` 또는 JSON `{"decision":"block"}`을 반환할 때 실제로 동작을 막을 수 있는지 여부. `PostToolUse`는 이미 실행된 액션을 되돌리지는 못하지만, Claude에게 추가 컨텍스트를 줘서 보정을 유도할 수 있다.

**추가 타이밍 (신규)**

> **⚠️ 포맷 주의**: `hook` (단수 객체)가 아니라 `hooks` **(복수 배열)**을 사용해야 한다. 잘못된 포맷은 `claude config list` 실행 시 `Settings Error`가 발생하며 파일 전체가 무시된다.

핵심 4가지 외에 **세션 단위** 타이밍(`SessionStart`, `SessionEnd`), **컨텍스트 압축** 타이밍(`PreCompact`), **권한 거부** 타이밍(`PermissionDenied`)이 자주 쓰인다. 3.5.2에서 자세히 다룬다.

---

### 3.5.2 신규 Hook (PreCompact · SessionStart · SessionEnd · PermissionDenied)

**PreCompact + SessionStart 조합 — markflow 작업 흐름 보존**

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/pre-compact-handoff.py"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat HANDOFF.md 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

SessionStart Hook의 stdout은 자동으로 Claude의 초기 컨텍스트에 추가된다.

---

### 3.5.3 환경 변수와 matcher 규칙

**Hook은 stdin으로 JSON 페이로드를 받는다** — 환경변수가 아니라 stdin이다. 셸 훅에서는 `jq`로 파싱하는 것이 표준.

| 필드 | 의미 |
|------|------|
| `session_id` | 현재 세션 ID |
| `cwd` | Claude Code 실행 디렉터리 |
| `hook_event_name` | 이벤트 이름 (PreToolUse 등) |
| `tool_name` | 호출되려는/된 도구 이름 (`Edit`·`Bash` 등) |
| `tool_input` | 도구 인자 객체 — 예: `tool_input.file_path` |
| `tool_response` | PostToolUse에서 도구 결과 |

```bash
# stdin JSON에서 파일 경로 추출
payload=$(cat)
file=$(echo "$payload" | jq -r '.tool_input.file_path // empty')
```

**실제 환경변수는 3개뿐**: `CLAUDE_PROJECT_DIR` · `CLAUDE_PLUGIN_ROOT` · `CLAUDE_PLUGIN_DATA`. 도구 인자·이벤트 메타는 모두 stdin JSON에서 읽는다.

**matcher 패턴 — 두 가지 형식**

문자열(정규식) 형식과 객체 형식을 혼용할 수 있다.

```json
// ① 문자열 (정규식) — 기존 형식
"matcher": "Write|Edit"              // 파일 쓰기·편집 도구
"matcher": "Bash"                    // Bash 도구
"matcher": "mcp__github__.*"         // GitHub MCP 서버의 모든 도구
"matcher": ""                        // 모든 도구 (항상 실행)

// ② 객체 — 명시적 도구 목록
"matcher": { "tools": ["BashTool"] }
"matcher": { "tools": ["Write", "Edit", "MultiEdit"] }
```

> 객체 형식은 정규식 실수를 줄이고 IDE 자동완성·검증에 유리하다. 단순 케이스는 문자열, 화이트리스트가 명확한 경우는 객체를 권장한다.

**exit 코드 규칙**

| exit 코드 | 동작 | stderr 처리 |
|-----------|------|-----------|
| `0` | 성공, 정상 진행 | stdout은 transcript 모드에서 사용자에게 표시 |
| `1` | **비차단 오류** — 실행 계속 | stderr는 사용자에게만 표시, 도구 호출 차단 안 함 |
| `2` | **차단** — 도구 호출 거부 | stderr가 모델에게 전달되어 다시 시도하게 만듦 |
| 기타 | 비차단 오류로 처리 | `1`과 동일 |

> **정책 강제는 `exit 2`**. "이 파일은 수정 금지" 같은 가드는 `exit 2` + stderr에 사유를 적어야 차단되고 모델이 재시도한다. `exit 1`은 경고만 띄우고 작업은 그대로 진행된다.

> **JSON output 고급**: stdout으로 `{"decision": "block", "reason": "..."}` 형태 JSON을 내보내면 exit code보다 세밀한 제어가 가능 (PreToolUse 한정).

---

### 3.5.4 작업 완료 시 소리 알림 설정 (Slack 알림 설정)

**macOS 소리 알림**

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

**Slack 알림 (작업 완료 시)**

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST -H 'Content-type: application/json' --data '{\"text\":\"markflow Claude Code 작업 완료!\"}' $SLACK_WEBHOOK_URL 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

---

### 3.5.5 가드레일 훅 — 비밀키 차단·자동 백업·실시간 린트

**① 보호 파일 수정 차단 (PreToolUse)**

markflow의 `.env`(DB 연결 정보), `drizzle/meta/`(마이그레이션 메타)를 보호한다.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in *.env|*.env.*|drizzle/meta/*) echo \"⛔ 보호된 파일: $f\" >&2; exit 2;; esac"
          }
        ]
      }
    ]
  }
}
```

**② 파일 수정 전 자동 백업 (PreToolUse)**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); if [ -n \"$f\" ] && [ -f \"$f\" ]; then cp \"$f\" \"$f.bak\" 2>/dev/null; fi || true"
          }
        ]
      }
    ]
  }
}
```

**③ 실시간 린트·포맷·타입체크 (PostToolUse + Stop)**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); [ -n \"$f\" ] && npx prettier --write \"$f\" 2>/dev/null || true"
          },
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); [ -n \"$f\" ] && npx eslint --fix \"$f\" 2>/dev/null || true"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "npx tsc --noEmit 2>&1 | tail -20"
          }
        ]
      }
    ]
  }
}
```

> 셸 훅은 `jq`로 stdin JSON에서 `tool_input.file_path`를 파싱한다 — `$CLAUDE_FILE_PATH` 같은 환경변수는 존재하지 않는다.

**④ Tailwind 클래스 자동 정렬 (PostToolUse)**

markflow는 Tailwind 기반 UI 코드가 많다. `prettier-plugin-tailwindcss`가 깔려 있다면 `.tsx`·`.jsx` 저장 직후 자동으로 클래스 순서를 표준화한다.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in *.tsx|*.jsx) npx prettier --write \"$f\" 2>/dev/null;; esac || true"
          }
        ]
      }
    ]
  }
}
```

**⑤ Git 자동 스테이징 (PostToolUse)**

작업 단위로 변경된 파일을 즉시 스테이징해두면 마일스톤 커밋 시 누락이 줄어든다. 자동 커밋은 위험하므로 `git add`만 한다.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); [ -n \"$f\" ] && [ -f \"$f\" ] && git add \"$f\" 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

> 주의 — `.env`·`drizzle/meta/` 같은 보호 파일은 ① 가드(`exit 2`)에서 이미 차단되므로 스테이징 단계까지 도달하지 않는다.

---

### 3.5.6 Hook 사용 시 주의사항

- `PostToolUse`는 **매 파일 수정마다** 실행되므로 가볍게 유지
- 무거운 검증(빌드, 전체 테스트)은 `Stop`에 배치
- 항상 `|| true`나 `2>/dev/null`로 실패 시 흐름이 끊기지 않도록 처리
- `tail -N`으로 출력량을 제한하여 컨텍스트 낭비를 방지

**디버깅**

```bash
claude config list   # 설정 유효성 확인

# 특정 Hook 명령어 직접 테스트 (stdin JSON 페이로드 시뮬레이션)
echo '{"tool_input":{"file_path":"src/lib/markdown.ts"}}' | \
  jq -r '.tool_input.file_path' | xargs npx eslint --fix
```

**흔한 실수 — Settings Error 분류**

settings.json에서 자주 막히는 패턴이다. `claude config list`가 invalid를 띄우면 대개 아래 셋 중 하나다.

| 증상 | 원인 | 수정 |
|------|------|------|
| `hook` (단수) 키로 작성 → 무시됨 | 키는 항상 `hooks` (배열) | `"hooks": [ { "type": "command", "command": "…" } ]` |
| `$schema` 값을 임의 URL로 지정 → invalid | 공식 스키마 URL만 유효 | `$schema` 항목을 제거하거나 공식 URL 사용 |
| 한 hook 내 명령이 실패하면 파일 전체 무시 | settings.json 파싱이 strict | `|| true` 또는 `2>/dev/null`로 실패 흡수 |
| matcher 정규식에 `/` 누락 | matcher는 정규식 본문, 슬래시 안 붙임 | `"matcher": "Write|Edit"` (`/Write|Edit/` 아님) |
| stdin 안 읽고 `$1`·`$@` 사용 | hook 인자는 stdin JSON | `payload=$(cat)` 후 `jq` 파싱 |

> 설정을 수정한 직후엔 항상 `claude config list`로 검증하고, 새 세션을 한 번 열어 hook이 실제로 발동하는지 확인한다.

---

## 3.6 MCP 입문

### 3.6.1 MCP 개념과 Transport 2종 (HTTP · stdio)

MCP(Model Context Protocol)는 Claude Code가 외부 서비스와 표준화된 방식으로 통신할 수 있게 해주는 오픈 표준 규격이다. 2024년 11월 Anthropic이 발표했고, 2025년 12월 **Linux Foundation 산하 Agentic AI Foundation(AAIF)** 으로 이관되었다. 2026년 5월 기준 **공개 MCP 서버가 2,300개 이상**, 월 1억 회 이상의 SDK 다운로드를 기록 중이다.

> 출처: [anthropic.com — MCP 기증 발표](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation), [buildfastwithai.com — Claude MCP Setup 2026](https://www.buildfastwithai.com/blogs/claude-mcp-setup-guide-2026)

#### Transport 2종 비교

새 프로젝트에서 실질적으로 선택할 수 있는 것은 다음 2가지다.

| Transport | 방식 | 용도 |
|-----------|------|------|
| `http` (원격 권장, **Streamable HTTP**) | 원격 HTTPS 엔드포인트 (단일 `/mcp` 엔드포인트, 청크 전송) | Slack, GitHub, Notion 등 클라우드 서비스 |
| `stdio` | 로컬 프로세스의 stdin/stdout 파이프 | 로컬에서 직접 실행하는 MCP 서버, 개인 머신 한정 |

> **SSE는 deprecated**: MCP 스펙 2025-03-26 개정으로 `HTTP+SSE` transport가 deprecated되고 **Streamable HTTP**로 대체됐다. Atlassian Rovo는 2026-06-30, Keboola는 2026-04-01부터 SSE 엔드포인트가 종료된다. 본 강의에서는 신규 설정 시 **`http` (Streamable HTTP)만 사용**하기를 권장한다. 기존 SSE 서버를 만나면 같은 URL에서 `http`로 호환되는 경우가 대부분이다.  
> 출처: [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp), [toolradar.com — Streamable HTTP vs SSE](https://toolradar.com/blog/streamable-http-vs-sse)

**markflow MCP 설정 예시**

```json
// .mcp.json (project scope, Git 커밋해서 팀과 공유)
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "neon": {
      "type": "http",
      "url": "https://mcp.neon.tech/mcp"
    }
  }
}
```

> `.mcp.json` 스키마는 `"type": "http"` 또는 `"type": "stdio"` 두 값을 사용한다. 과거 문서에서 보이는 `"type": "url"`은 무효이며, `"type": "sse"`는 deprecated 상태다.

```json
// .mcp.json (팀 공유용)
{
  "mcpServers": {
    "neon": {
      "type": "http",
      "url": "https://mcp.neon.tech/sse"
    }
  }
}
```

> MCP 도구 정의는 컨텍스트 윈도우에 상주한다. markflow 작업 중 불필요한 MCP 서버는 반드시 비활성화한다.

---

### 3.6.2 Scope 2종 (Local · Project) 와 `.mcp.json`

실무에서 쓰는 핵심 scope는 **Local**과 **Project** 두 가지다. 본인 모든 프로젝트에 적용하고 싶은 경우만 보조적으로 User scope를 사용한다.

| 스코프 | 위치 | 공유 범위 | 우선순위 |
|--------|------|---------|:------:|
| **Local** (기본값) | `~/.claude.json` (프로젝트 경로 키 아래) | 현재 프로젝트 한정 — 본인만 | 가장 높음 |
| **Project** | `.mcp.json` (프로젝트 루트) | 팀 전체 (Git 커밋) | 중간 |
| User (보조) | `~/.claude.json` (전역 키) | 본인의 모든 프로젝트 | 낮음 |

> 같은 이름의 서버가 여러 scope에 정의되면 **local > project > user > plugin > claude.ai connector** 순으로 단일 정의만 사용된다.

#### 어떻게 선택하는가

| 상황 | 권장 scope |
|------|----------|
| 팀 모두가 같은 DB·API에 접근해야 함 | **Project** (`.mcp.json` 커밋) |
| 본인 계정 API 키가 필요한 개인 도구 | **Local** |
| 본인이 어느 프로젝트에서 작업하든 늘 쓰는 도구 (예: 개인 Notion) | User |

#### markflow 사용 사례

markflow 팀은 Neon DB MCP를 `.mcp.json`에 설정하고 커밋한다. 개인 API 키가 필요한 서버는 `~/.claude.json` (local scope)에 설정한다.

```bash
# Project scope로 추가 (.mcp.json에 기록 → Git 커밋해서 팀 공유)
claude mcp add --scope project --transport http neon https://mcp.neon.tech/mcp

# Local scope로 추가 (본인만)
claude mcp add --transport http my-notion https://mcp.notion.com/mcp

# 현재 등록된 MCP 서버 목록 확인
claude mcp list
```

> **주의**: `claude mcp add` 명령에서 `--scope`를 생략하면 기본값은 **local**이다. Project scope로 팀과 공유하려면 반드시 `--scope project`를 명시해야 한다.

---

### 3.6.3 개발에 필수적인 MCP 서버

markflow 개발에 유용한 MCP 서버 목록이다.

| MCP 서버 | 용도 | markflow 활용 |
|---------|------|-------------|
| **GitHub** | 이슈·PR 관리 | 이슈 기반 기능 구현, PR 자동 생성 |
| **Neon** | PostgreSQL 브랜치 DB | 기능 브랜치별 DB 분리, 마이그레이션 |
| **Slack** | 팀 커뮤니케이션 | 배포 알림, 버그 리포트 처리 |

**markflow Neon MCP 실전 예시**

```bash
# feature/search 브랜치 작업 시 DB 분리
"feature/search 브랜치를 위한 Neon DB 브랜치를 생성하고
 현재 마이그레이션을 실행해줘."

# 스키마 변경 후 검증
"documents 테이블에 tags 컬럼을 추가하는 마이그레이션을
 작성하고 Neon staging DB에 적용해줘."
```

---

## 3.7 [실습] 나만의 스킬·커맨드 제작

### 3.7.1 프로젝트 컨벤션을 Skill로 캡슐화

markflow의 Drizzle ORM 컨벤션을 Skill로 만드는 실습이다.

```bash
mkdir -p .claude/skills/drizzle-conventions
```

```yaml
# .claude/skills/drizzle-conventions/SKILL.md
---
name: drizzle-conventions
description: >
  Drizzle ORM patterns and conventions for markflow project.
  Use when writing database schemas, queries, or migrations.
  Trigger on: schema changes, new queries, migrations, database design questions.
allowed-tools: Read, Grep, Glob
---

# markflow Drizzle ORM 컨벤션

## 스키마 정의 위치
- 스키마: `src/server/db/schema.ts`
- 마이그레이션: `drizzle/` 디렉터리
- DB 클라이언트: `src/server/db/index.ts`

## 테이블 네이밍
- snake_case 복수형: `documents`, `document_tags`, `users`
- 조인 테이블: `document_tags` (알파벳 순)

## 컬럼 규칙
- ID: CUID2 (`import { createId } from '@paralleldrive/cuid2'`)
- slug: 문서 URL 식별자, unique constraint
- position: 정수형 1024 간격 (삽입 최적화)
- 타임스탬프: `createdAt`, `updatedAt` 항상 포함

## 쿼리 패턴

### 단순 조회
```typescript
const doc = await db.select()
  .from(documents)
  .where(eq(documents.slug, slug))
  .limit(1);
```

### 관계 조회 (N+1 방지)
```typescript
const docs = await db.query.documents.findMany({
  where: eq(documents.parentId, parentId),
  with: {
    tags: true,
    children: true
  },
  orderBy: asc(documents.position)
});
```

### 페이지네이션 (cursor 기반)
```typescript
const docs = await db.select()
  .from(documents)
  .where(cursor ? gt(documents.id, cursor) : undefined)
  .limit(20)
  .orderBy(asc(documents.id));
```

## 금지사항
- offset 기반 페이지네이션 금지 (documents가 많아지면 성능 급락)
- 직접 SQL 사용 금지 (Drizzle 쿼리 빌더만 사용)
- N+1 쿼리 패턴 금지
```

```bash
git add .claude/skills/drizzle-conventions/
git commit -m "feat: add drizzle-conventions skill for markflow"
```

---

### 3.7.2 팀 코드리뷰 룰을 슬래시 커맨드로

```bash
mkdir -p .claude/commands
```

```markdown
<!-- .claude/commands/review.md -->
현재 변경된 파일들을 markflow 프로젝트 기준으로 코드 리뷰해줘.

## 1. 타입 안전성
- TypeScript `any` 사용 여부
- Drizzle 쿼리 반환 타입 추론 여부

## 2. 보안 (markflow 필수 항목)
- 마크다운 렌더링 시 `rehype-sanitize` 파이프라인 마지막 적용 여부
- `innerHTML` 또는 `dangerouslySetInnerHTML` 직접 사용 여부
- 사용자 입력 slug/title Zod 검증 여부
- SQL 파라미터 바인딩 여부 (Drizzle 사용 시 자동이지만 raw SQL 체크)

## 3. 성능
- CodeMirror Extension `useMemo` 메모이제이션 여부
- `onChange` 디바운스 300ms 적용 여부
- Drizzle N+1 쿼리 패턴 여부
- 문서 목록 cursor 기반 페이지네이션 여부

## 4. markflow 컨벤션
- remark-rehype 파이프라인 순서 (sanitize 반드시 마지막)
- API 응답 형식 `{ data: ... }` / `{ error: '...' }` 준수
- Drizzle 컨벤션 (position 1024 간격, CUID2 사용)
- 테스트 (Vitest + Testing Library) 작성 여부

심각도: 🔴 Critical | 🟡 Warning | 🟢 Suggestion
```

```bash
git add .claude/commands/review.md
git commit -m "feat: add markflow code review command"

/review   # 사용
```

---

### 3.7.3 커스텀 Skill · Hook 만들기 (Handoff와 Changelog 적용, Compact 연동)

이 절은 본 챕터의 종합 실습이다. 세 가지 부품을 **하나의 워크플로로 결합**한다.

| 부품 | 역할 | 형태 |
|------|------|------|
| **Handoff 파일** | 세션 사이 작업 맥락을 전달하는 인계 노트 | `HANDOFF.md` (.gitignore) |
| **Changelog 파일** | 사람이 읽을 만한 작업 이력 누적 기록 | `CHANGELOG.md` (Git 커밋) |
| **PreCompact + SessionStart Hook** | 컨텍스트 압축 직전에 자동으로 핸드오프를 작성하고 세션 시작 시 자동 복원 | `.claude/hooks/*` |

> **왜 이게 필요한가**: Claude Code 세션은 컨텍스트가 압축되거나 종료되면 휘발한다. `/compact`는 요약을 남기지만, 작업의 **다음 단계·미해결 이슈·중요 결정**은 압축 과정에서 손실되기 쉽다. PreCompact Hook은 압축 *직전*에 우리가 직접 정의한 형식으로 핸드오프를 작성하고, SessionStart Hook이 다음 세션 시작 시 자동으로 그 핸드오프를 읽어들이게 만든다. 결과: **세션이 끊겨도 다음 세션이 정확히 거기서부터 시작**된다.

#### 1단계 — Skill로 Handoff 작성 규약을 캡슐화

```bash
mkdir -p .claude/skills/markflow-handoff
```

```markdown
<!-- .claude/skills/markflow-handoff/SKILL.md -->
---
name: markflow-handoff
description: 컨텍스트 압축 전 또는 세션 종료 전 작업 인계 노트를 생성하거나 갱신한다. 다음 세션이 동일 작업을 이어가도록 만든다.
allowed-tools: Read, Write, Edit, Bash(git status:*), Bash(git log:*), Bash(git diff:*)
---

# markflow Handoff 작성 규약

세션이 끊겨도 다음 세션이 같은 자리에서 출발할 수 있도록 `HANDOFF.md`를 작성·갱신한다.

## 절차

1. `git status --short`로 미커밋 변경사항 확인
2. `git log -n 5 --oneline`로 최근 커밋 5개 확인
3. 현재 진행 중인 작업의 핵심을 파악 (사용자 메시지·도구 호출 흐름)
4. 아래 템플릿으로 `HANDOFF.md`를 **덮어쓴다** (누적 X, 항상 최신만)

## HANDOFF.md 템플릿

```markdown
# HANDOFF — <YYYY-MM-DD HH:MM>

## 🎯 지금 하던 일
<1~2문장 요약. 무엇을 만들고 있었는가>

## ✅ 완료한 것
- 항목 1
- 항목 2

## 🚧 다음에 할 일
- [ ] 가장 우선순위 높은 다음 단계 1개
- [ ] 그 다음 단계
- [ ] 그 다음 단계

## 💡 중요 결정 사항
- 결정 1 (이유)
- 결정 2 (이유)

## ⚠️ 막혔던 부분 / 주의할 점
<있다면 기록, 없으면 생략>

## 📂 작업 중인 파일
- apps/web/src/...
- packages/db/src/...

## 🌿 Git 상태
- 브랜치: <현재 브랜치>
- 미커밋 변경: <파일 수>
- 최근 커밋: <마지막 커밋 메시지>
```

## 작성 원칙

- **간결하게**: 200줄 이하. 핸드오프는 압축된 컨텍스트지 일기가 아니다
- **다음 행동을 분명히**: "다음에 할 일"은 반드시 1개 이상 명시
- **결정은 이유와 함께**: "왜 그렇게 정했는지"가 결정 자체보다 중요
- **민감 정보 제외**: 비밀 키·토큰·내부 URL은 절대 기록 금지
```

> **포인트**: 이 Skill의 `description` 필드가 핵심이다. Claude가 자동으로 "지금이 핸드오프를 써야 할 시점"이라고 판단해 호출하려면 description이 명확해야 한다.

#### 2단계 — PreCompact Hook으로 자동 호출

`.claude/hooks/pre-compact-handoff.sh`를 만든다.

```bash
mkdir -p .claude/hooks
```

```bash
#!/usr/bin/env bash
# .claude/hooks/pre-compact-handoff.sh
# PreCompact 이벤트 시 markflow-handoff Skill을 호출해 HANDOFF.md를 갱신한다.

set -euo pipefail

# stdin으로 들어오는 hook payload는 그대로 무시 (이 hook은 항상 실행)
cat > /dev/null || true

# 워킹 디렉터리 안전 확인
cd "${CLAUDE_PROJECT_DIR:-$PWD}"

# 압축 전 현재 시점의 git 상태를 HANDOFF.md에 dump (Claude가 Skill로 정리하기 전 백업본)
{
  echo "# HANDOFF (auto-snapshot before compact) — $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "## Git Status"
  echo '```'
  git status --short 2>/dev/null || echo "(not a git repo)"
  echo '```'
  echo ""
  echo "## Recent Commits"
  echo '```'
  git log -n 5 --oneline 2>/dev/null || echo "(no commits)"
  echo '```'
  echo ""
  echo "> ⚠️ Claude는 이 스냅샷을 markflow-handoff Skill로 다듬어 다음 세션에 인계합니다."
} > HANDOFF.md

# Claude에게 "이 시점에 HANDOFF를 정식 포맷으로 다듬어라"라고 추가 컨텍스트 주입
echo '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":"컨텍스트 압축 직전입니다. markflow-handoff Skill을 호출해 HANDOFF.md를 정식 템플릿으로 정리하세요."}}'
```

```bash
chmod +x .claude/hooks/pre-compact-handoff.sh
```

> **주의**: 위 hook은 `additionalContext` JSON 출력으로 Claude를 가이드한다. Claude가 자체적으로 Skill을 호출하도록 *유도*하는 것이지 *강제*는 아니다. 결정론적 강제가 필요하다면 Hook 내부에서 `claude-mem` 같은 도구를 직접 호출해 파일을 완성한 뒤 압축에 들어가도록 설계한다.

#### 3단계 — SessionStart Hook으로 자동 복원

```bash
#!/usr/bin/env bash
# .claude/hooks/session-start-restore.sh
# 세션 시작 시 HANDOFF.md 내용을 컨텍스트에 자동 주입한다.

set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$PWD}"

if [[ -f HANDOFF.md ]]; then
  # SessionStart hook의 stdout은 Claude의 초기 컨텍스트로 들어간다
  echo "📋 이전 세션 인계 노트가 발견되었습니다. 아래 내용을 바탕으로 이어서 작업하세요."
  echo ""
  echo "----- HANDOFF.md -----"
  cat HANDOFF.md
  echo "----- END HANDOFF -----"
else
  echo "(이전 세션 인계 노트 없음 — 처음부터 시작합니다)"
fi
```

```bash
chmod +x .claude/hooks/session-start-restore.sh
```

#### 4단계 — settings.json에 등록

```json
// .claude/settings.json (프로젝트 공유) 또는 .claude/settings.local.json (개인)
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "./.claude/hooks/pre-compact-handoff.sh",
            "timeout": 30
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./.claude/hooks/session-start-restore.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

#### 5단계 — Changelog 자동 누적 (사람이 읽는 작업 이력)

`HANDOFF.md`는 **휘발성** — 다음 세션이 시작되면 새 버전으로 덮어쓰인다. 반면 `CHANGELOG.md`는 **누적형** — 의미 있는 작업이 끝날 때마다 한 줄씩 쌓는다. 두 파일은 역할이 다르다.

PostToolUse hook으로 Git 커밋이 일어날 때마다 CHANGELOG에 한 줄 추가하는 방법:

```bash
#!/usr/bin/env bash
# .claude/hooks/post-commit-changelog.sh
# Bash 도구로 'git commit'이 성공한 직후 CHANGELOG.md에 항목 추가

set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$PWD}"

# stdin에서 PostToolUse payload 읽기
payload=$(cat)
cmd=$(echo "$payload" | jq -r '.tool_input.command // empty')

# git commit 명령일 때만 동작
if [[ "$cmd" =~ git[[:space:]]+commit ]]; then
  last_msg=$(git log -1 --pretty=%s 2>/dev/null || echo "")
  date_str=$(date '+%Y-%m-%d')
  
  # CHANGELOG.md가 없으면 헤더와 함께 생성
  if [[ ! -f CHANGELOG.md ]]; then
    {
      echo "# Changelog"
      echo ""
      echo "이 파일은 Claude Code 세션 중의 의미 있는 커밋이 자동 기록됩니다."
      echo ""
    } > CHANGELOG.md
  fi
  
  # 새 항목 추가 (가장 최근이 위로)
  tmp=$(mktemp)
  {
    head -n 4 CHANGELOG.md
    echo "- ${date_str}: ${last_msg}"
    tail -n +5 CHANGELOG.md
  } > "$tmp"
  mv "$tmp" CHANGELOG.md
fi
```

settings.json에 추가:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./.claude/hooks/post-commit-changelog.sh",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

#### 6단계 — `.gitignore` 정리

```
# .gitignore
HANDOFF.md           # 휘발성 핸드오프는 커밋하지 않음 (개인 작업 상태)
.claude/settings.local.json   # 개인 hook 설정
```

CHANGELOG.md는 Git에 커밋한다 (팀이 공유하는 작업 이력).

#### ✅ 검증 — 워크플로가 동작하는지 확인

| 단계 | 확인 방법 |
|------|---------|
| Skill 인식 | `/skills`에 `markflow-handoff` 표시 |
| PreCompact 발화 | `/compact` 실행 → HANDOFF.md가 생성/갱신되는지 |
| SessionStart 복원 | Claude Code 재실행 → 초기 응답에 HANDOFF 내용이 인용되는지 |
| CHANGELOG 누적 | Claude가 `git commit` 실행 → CHANGELOG.md 최상단에 한 줄 추가되는지 |

#### 🎓 회고 — 이 실습이 가르치는 것

| 부품 | LEVEL 3에서 배운 어떤 개념인가 |
|------|------------------------------|
| Skill (`markflow-handoff`) | 3.4 — Skill은 **자동 활성화 가능한 워크플로 캡슐** |
| PreCompact Hook | 3.5.2 — 컨텍스트 압축 직전에 결정론적으로 끼어들 수 있는 신규 hook |
| SessionStart Hook | 3.5.2 — 세션 시작 시 stdout이 초기 컨텍스트로 자동 주입 |
| PostToolUse Hook | 3.5.1 — 도구 실행 후 부수 효과 처리 (CHANGELOG 누적) |
| settings.json 구조 | 3.5.3 — `hooks` (복수) 배열, matcher, timeout |
| `.gitignore` 분리 | 3.2.1 — Local vs Project 공유 범위 구분 |

> **다음 단계 예고**: LEVEL 7에서는 이 핸드오프 메커니즘이 **다중 에이전트 하네스(Multi-agent Harness)** 의 핵심 부품으로 확장된다. 한 세션의 HANDOFF.md는 다른 서브에이전트에게 전달되는 **인계 페이로드**가 되며, 여러 에이전트가 같은 작업을 협력해 처리하는 기반이 된다.

---

## 📋 LEVEL 3 핵심 요약

| 항목 | 핵심 내용 |
|------|---------|
| 프롬프트 vs 컨텍스트 | 프롬프트 = 사용자 1턴, 컨텍스트 = 매 추론에서 모델이 보는 모든 토큰 |
| Context Rot 대응 | CLAUDE.md 200줄 이하, 주기적 `/compact`, `.claudeignore` 설정 |
| `/context` | 컨텍스트 사용률 시각화. **40% 룰**(12-Factor)·70%+ 압축 고려 |
| CLAUDE.md 4단계 | **조직(Managed) → 전역(`~/.claude`) → 프로젝트(`./` 또는 `./.claude/`) → 서브폴더(lazy-load)**. 모두 concat (override 아님), 구체적인 쪽이 우선 |
| AGENTS.md | 60,000+ 프로젝트가 채택한 벤더 중립 오픈 표준 (Linux Foundation AAIF) |
| rules + paths | 특정 경로 작업 시에만 규칙 자동 활성화 |
| 슬래시 커맨드 | 빌트인 약 60개 (50+ 네이티브 + 5~6 번들 스킬). `/help`로 확인 |
| 번들 스킬 | `/batch` (대규모 병렬 변경) · `/simplify` (코드 정리) · `/debug` (진단) · `/loop` · `/claude-api` |
| 커스텀 커맨드 | `.claude/commands/*.md`로 정의. `$ARGUMENTS`로 인자 전달 |
| Skill 시스템 | `.claude/skills/<name>/SKILL.md`. Claude 자동 발동 또는 명시 호출 가능 |
| Hook 핵심 4타이밍 | **PreToolUse**(차단) · **PostToolUse**(린트·로깅) · **UserPromptSubmit**(컨텍스트 주입) · **Stop**(검증·재계속) |
| 신규 Hook | PreCompact · SessionStart · SessionEnd · PermissionDenied |
| Hook 포맷 | `hooks` 복수 배열. `exit 2` 또는 JSON `decision:block`으로 차단 |
| MCP Transport | **HTTP (Streamable HTTP, 권장) · stdio (로컬)**. SSE는 deprecated (2026 mid 종료) |
| MCP Scope | **Local(개인) · Project(`.mcp.json`)**. User scope는 보조 |
| 실습 3.7.1 | drizzle-conventions Skill — 프로젝트 컨벤션 캡슐화 |
| 실습 3.7.2 | markflow 코드리뷰 커맨드 — `.claude/commands/review.md` |
| 실습 3.7.3 | **Handoff + Changelog + PreCompact/SessionStart Hook 통합 패키지** |

---

## 📚 참고 자료

| 자료 | URL |
|------|-----|
| Claude Code Skills 공식 문서 | https://code.claude.com/docs/en/skills |
| Claude Code Hooks 공식 문서 | https://code.claude.com/docs/en/hooks |
| Claude Code Commands 공식 문서 | https://code.claude.com/docs/en/commands |
| Claude Code MCP 공식 문서 | https://code.claude.com/docs/en/mcp |
| Claude Code Memory (CLAUDE.md) | https://code.claude.com/docs/en/memory |
| AGENTS.md 공식 사이트 | https://agents.md |
| AGENTS.md GitHub | https://github.com/agentsmd/agents.md |
| Anthropic — MCP 기증 발표 (2025-12) | https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation |
| Anthropic Context Engineering | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
| Context Rot 연구 (Chroma) | https://research.trychroma.com/context-rot |
| Streamable HTTP vs SSE (toolradar) | https://toolradar.com/blog/streamable-http-vs-sse |
| Claude Code 60+ commands cheatsheet | https://www.gradually.ai/en/claude-code-commands/ |
| Claude Code Hooks Mastery (참고 저장소) | https://github.com/disler/claude-code-hooks-mastery |
| HumanLayer 12-Factor Agents | https://github.com/humanlayer/12-factor-agents |
| Simon Willison, Lethal Trifecta | https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ |
| Meta AI, Agents Rule of Two | https://ai.meta.com/blog/practical-ai-agent-security/ |
| markflow 오픈소스 | https://github.com/claude-code-expert/markflow |

---

> **할루시네이션 검증 노트 (2026-05-16 갱신)**
>
> - ✅ **CLAUDE.md 4단계 계층** (조직/전역/프로젝트/서브폴더): code.claude.com/docs/en/memory 일치. specificity 역방향 우선순위 확인
> - ✅ **AGENTS.md** 60,000+ 프로젝트 채택, Linux Foundation AAIF에서 관리: agents.md 및 openai.com 공식 발표 확인
> - ✅ **Claude Code 슬래시 커맨드 약 60개**: 공식 docs와 wmedia.es/gradually.ai 등 2026-04/05 cheatsheet 일치 ("nearly 80" 주장도 있음 → 본문에서는 "60개 안팎"으로 표기, 강의 촬영 시점 재확인 권장)
> - ✅ **번들 스킬 (/batch, /simplify, /debug)**: code.claude.com/docs/en/commands 공식 명시 확인. `/loop`, `/claude-api`, `/fewer-permission-prompts`도 동일 카테고리
> - ✅ **Hook 핵심 4타이밍**: 공식 docs 기준 PreToolUse·PostToolUse·UserPromptSubmit·Stop이 가장 빈번하게 사용됨. v2.1.116(2026-04) 기준 hook 이벤트 26종까지 확장 확인
> - ✅ **PreCompact·SessionStart·SessionEnd·PermissionDenied 신규 hook**: code.claude.com/docs/en/hooks에서 확인. PermissionDenied는 Auto mode에서 분류기가 거부할 때 발화 (`retry:true` 반환 가능)
> - ✅ **hooks 복수 배열 포맷**: 공식 settings.json 스키마 확인. 단수 `hook`은 무효
> - ✅ **MCP Transport HTTP·stdio (Streamable HTTP 권장, SSE deprecated)**: MCP 스펙 2025-03-26 개정으로 deprecation 확인. Atlassian Rovo 2026-06-30 종료
> - ✅ **MCP Scope Local·Project (+ User 보조)**: code.claude.com/docs/en/mcp 확인. `--scope project`가 `.mcp.json` 생성, 미명시 시 기본은 local
> - ✅ **MCP 2025-12 Anthropic→AAIF 기증, 공개 서버 2,300+, 월 1억+ SDK 다운로드**: anthropic.com 발표 + buildfastwithai.com 2026-05 확인
> - ⚠️ **markflow 소스 직접 분석 미완료**: 강의 목차·README 기반 작성. 실제 소스 공개 후 세부 API·스키마·컴포넌트 구조 업데이트 필요
> - ⚠️ **3.7.3 실습 코드 (bash hook 스크립트, settings.json 스키마)**: 셸 문법·JSON 스키마 검증 완료. 단, `additionalContext` JSON 출력 방식은 Claude Code 버전에 따라 동작이 일부 다를 수 있어 강의 촬영 시점에 실제 동작 재확인 권장
> - ⚠️ Hook 매처(`""`, `"Bash"`, `"Edit|Write|MultiEdit"`)는 공식 정규식 형식. 정확한 매칭 동작은 hook 종류와 도구 이름에 따라 차이가 있음 → 본문 예시는 가장 안전한 패턴 사용

---
