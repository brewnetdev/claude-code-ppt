# ③ 심화 개념

## 🟣 LEVEL 3 — 스킬·커맨드·Hook·프롬프트·컨텍스트

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

### 3.1.5 프롬프팅 기법 6선

같은 작업도 프롬프트 구조에 따라 결과 품질이 크게 달라진다. 실무에서 자주 쓰는 6가지 기법을 정리한다.

| 기법 | 정의 | 적합한 작업 |
|------|------|-----------|
| **Zero-shot** | 예시 없이 지시만 전달 | 단순·표준 작업 (포맷 변환, 일반 질의) |
| **Few-shot** | 입출력 예시 1~5개 동봉 | 도메인 포맷 학습, 톤·스타일 모방 |
| **Chain-of-Thought (CoT)** | "단계별로 생각해" 등 추론 과정 유도 | 다단계 추론, 디버깅, 설계 결정 |
| **Role Prompting** | 역할 부여 ("시니어 보안 리뷰어로서 …") | 특정 관점·기준이 필요한 검토 |
| **Constraint Prompting** | 제약 조건 명시 ("100자 이내", "TypeScript만") | 형식·길이·언어 강제 |
| **Step-by-Step Decomposition** | 작업을 명시적 단계로 쪼개기 | 복잡한 기능 구현, 리팩터링 |

**기법 선택 가이드**

- 단순 변환 → Zero-shot
- 결과 형식이 까다롭다 → Few-shot
- "왜 그렇게 결정했는지"가 필요 → CoT + Role
- 출력에 강한 제약(길이, 언어, 라이브러리) → Constraint
- 한 번에 다 못 풀 만큼 큰 작업 → Step-by-Step Decomposition

**조합 예시 — markflow 마크다운 sanitization 로직 작성**

```
당신은 시니어 프론트엔드 보안 리뷰어다. (Role)
markflow의 마크다운 렌더링 파이프라인에서 XSS를 차단하는 sanitize 단계를
작성해야 한다. (Task)

다음 단계로 진행한다. (Step-by-Step)
1) remark-rehype 파이프라인의 현재 순서를 확인
2) rehype-sanitize를 어디에 끼워야 안전한지 결정
3) 허용 태그·속성 화이트리스트 작성
4) 결정 근거를 한 문장씩 적어라 (CoT)

제약: TypeScript, rehype-sanitize 공식 API만 사용,
      외부 라이브러리 추가 금지. (Constraint)

예시 출력 형식: (Few-shot)
- 결정: <한 줄>
- 근거: <한 줄>
- 코드: <블록>
```

이 한 프롬프트에 Role + Task + Step-by-Step + CoT + Constraint + Few-shot이 모두 들어가 있다. 실무에서는 작업 난이도에 맞게 2~3개를 조합하면 충분하다.

**CoT의 정량 효과 — GSM8K 수학 벤치마크**

| 모델 (PaLM 540B) | 정확도 |
|------|------|
| Zero-shot | 17.9% |
| **Chain-of-Thought** ("Let's think step by step") | **58.1%** |

> 출처: Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* (NeurIPS 2022). 프롬프트 한 줄로 정확도가 3배 이상 도약한 대표 사례.

**Opus 4.7 행동 변화 — 강조어 사용 주의**

| Before (옛 모델) | After (4.6 / 4.7) |
|------|------|
| `CRITICAL: You MUST use this tool` | `Use this tool when…` (정상 톤으로) |
| 강조어를 많이 넣을수록 정확도↑ | **Literal instruction following** — 문자 그대로 해석, 과트리거 위험 |
| "If in doubt, use [tool]" | "Use [tool] when it would enhance understanding" |

> 출처: Anthropic, *Prompting best practices* — Opus 4.7은 지시를 일반화 없이 문자 그대로 따르므로, 적용 범위를 명시(예: "every section, not just the first")하고 강조어 남발은 줄인다.

---

### 3.1.6 적시 컨텍스트(Just-in-Time)와 `.claudeignore`

**적시 컨텍스트(JIT)** 는 "필요한 파일을 필요한 순간에만 로드한다"는 원칙이다. 전체 프로젝트를 미리 읽혀 컨텍스트를 채우는 대신, 모델이 도구(Glob·Grep·Read)로 그때그때 필요한 부분만 가져오게 한다.

**왜 JIT인가**

- 코드베이스가 커지면 전체 인덱싱은 비현실적 (n² 어텐션 비용)
- "지금 이 작업"과 무관한 파일은 노이즈가 됨 → Context Rot
- 모델이 스스로 "어디를 봐야 하는지" 결정하는 것이 더 정확

**경로만 남기는 패턴**

CLAUDE.md에는 파일 본문 대신 **경로 + 한 줄 설명**만 둔다. 모델은 필요할 때 그 경로를 직접 읽는다.

```markdown
## 핵심 파일

- `src/server/db/schema.ts` — Drizzle 스키마 정의
- `src/lib/markdown.ts` — remark-rehype 파이프라인
- `src/components/editor/CodeMirror.tsx` — 에디터 컴포넌트
- `drizzle/` — 마이그레이션 메타
```

이렇게 두면 CLAUDE.md 자체는 수십 줄로 유지되고, 작업에 필요한 파일만 컨텍스트로 끌어올라온다.

**`.claudeignore` — 노이즈 차단**

`.gitignore`와 같은 문법으로, Claude Code의 자동 검색·로드 대상에서 제외할 경로를 지정한다.

```gitignore
# .claudeignore
node_modules/
dist/
.next/
coverage/

# 빌드 산출물
*.min.js
*.bundle.js

# 대용량 데이터
public/uploads/
public/sample-data/
*.csv
*.parquet

# 자동 생성 파일
drizzle/meta/_journal.json
src/generated/

# 로그·캐시
*.log
.cache/
```

**효과 측정 예시 (markflow)**

| 항목 | `.claudeignore` 없음 | 적용 후 |
|------|--------------------|--------|
| 초기 인덱싱 토큰 | ~85,000 | ~22,000 |
| Glob/Grep 응답 노이즈 | 빌드 산출물·캐시 다수 | 소스 코드만 |
| 첫 응답까지 지연 | 길게 느껴짐 | 즉시 |

> 원칙은 단순하다 — **모델이 봐도 의미 없는 파일은 처음부터 안 보이게 한다.** `.claudeignore`는 컨텍스트 엔지니어링의 가장 저렴한 첫 단추다.

---

### 3.1.7 Anthropic 4대 컨텍스트 전략과 모델 설정 (effort · Adaptive Thinking)

**Anthropic 4대 전략 — Write / Select / Compress / Isolate**

Anthropic 「Effective Context Engineering for AI Agents」(2025.09)의 분류를 L3 강의 매핑과 함께 정리한다.

| 전략 | 설명 | L3 매핑 |
|------|------|---------|
| **Write** | 시스템 프롬프트·CLAUDE.md를 명확·구조화된 형태로 작성 | §3.2 CLAUDE.md |
| **Select** | 상황에 필요한 정보만 컨텍스트에 주입 | §3.1.6 JIT + `.claudeignore` |
| **Compress** | 오래된 대화·도구 결과를 요약하여 토큰 절약 | §3.1.4 `/compact` |
| **Isolate** | 서브에이전트로 위임하여 메인 컨텍스트 보호 | §3.4 Skills, §3.7 실습 |

**`effort` 파라미터 — 새 통합 다이얼 (Opus 4.7 / Sonnet 4.6)**

verbosity·thinking·tool 사용량을 **하나의 다이얼**로 통합 제어한다.

| 레벨 | 용도 | 비고 |
|------|------|------|
| `max` | 인텔리전스 극한 — 어려운 작업에서만 | **신규** (overthinking 위험) |
| `xhigh` | **코딩·에이전틱 기본값** | **4.7 신규** |
| `high` | 인텔리전스 민감 작업 최소 권장값 | 4.6 기본값 |
| `medium` | 비용 민감 워크로드 | |
| `low` | 짧고 범위 좁은 작업, 레이턴시 우선 | 4.7는 엄격 준수 — under-thinking 주의 |

- Opus 4.7은 `low`/`medium`에서 **요청 범위만 처리**(이전처럼 "above and beyond" 안 함)
- 얕은 추론이 보이면 프롬프트 우회보다 **effort 상향**이 우선
- `max`/`xhigh` 사용 시 `max_tokens` **64k 이상** 권장 (서브에이전트·툴 호출 공간 확보)

**Adaptive Thinking — `extended thinking + budget_tokens` 대체 (4.6+ 표준)**

```python
# Before — 4.6+ 에서 deprecated
thinking={"type": "enabled", "budget_tokens": 32000}

# After — 표준
thinking={"type": "adaptive"}
output_config={"effort": "high"}  # max/xhigh/high/medium/low
```

- 모델이 **쿼리 복잡도 + effort**를 기반으로 thinking 양을 동적 조정
- `budget_tokens`는 4.6에서 동작하지만 deprecated, 향후 제거 예정
- **Prefilled response**(마지막 assistant 턴 prefill)는 4.6+에서 **deprecated** — Mythos Preview는 400 에러. 대안: 시스템 프롬프트 + XML 태그로 출력 형식 제어

**장문 컨텍스트(20k+ tokens) 배치 원칙**

- 장문 데이터는 **위에**, 쿼리·지시·예제는 **아래**에 배치 → 응답 품질 최대 30% 향상
- 답변 전 인용문 추출 요청 (`Quote relevant parts first, then answer`)
- XML 태그(`<documents>`, `<document index="1">`)로 구조화

> 출처: Anthropic, *Prompting best practices* (Claude API Docs, 2026-05 스냅샷).

---

## 3.2 CLAUDE.md & AGENTS.md

### 3.2.1 로딩 순서와 우선순위 — 두 개념을 분리해 이해하기

CLAUDE.md는 4단계로 로드되어 **컨텍스트에 concat된다** (override 아님). 충돌 시 우선순위는 로딩 순서의 **역방향**이다.

**(1) 로딩 순서** — 누가 먼저 읽히는가 (filesystem root → 작업 디렉터리)

| 순서 | 범위 | 위치 | 공유 |
|------|------|------|------|
| **1. System** (Managed Policy) | 조직 전체 | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`<br>Linux/WSL: `/etc/claude-code/CLAUDE.md`<br>Windows: `C:\Program Files\ClaudeCode\CLAUDE.md` | 조직 IT가 MDM으로 배포 |
| **2. User** | 본인의 모든 프로젝트 | `~/.claude/CLAUDE.md` | 개인 환경 |
| **3. Project** | 팀 (Git 커밋) | `./CLAUDE.md` 또는 `./.claude/CLAUDE.md` | 둘 다 동등한 Project 위치 |
| **4. Local** | 본인, 현재 프로젝트 한정 | `./CLAUDE.local.md` | `.gitignore` |

**(2) 우선순위 (precedence)** — 충돌 시 누가 이기는가

> 공식 원문: *"More specific locations take precedence over broader ones."* — Anthropic, Claude Code memory docs

specificity로 보면 **Local(나·이 프로젝트만) > Project(팀·이 프로젝트) > User(나·모든 프로젝트) > Managed Policy(전 사용자·전 프로젝트)** 순. 즉 **로딩 순서의 역방향**이 우선순위다.

> 단, **Managed Policy는 우선순위는 가장 낮지만 `claudeMdExcludes`로도 제외 불가** — 조직 IT 정책 강제 보장.

**서브폴더 CLAUDE.md는 lazy-load**. 위 4단계는 launch 시 모두 로드되지만, 작업 중인 폴더 아래쪽 서브폴더의 CLAUDE.md는 **그 폴더의 파일을 읽는 시점에만 로드**된다 (모노레포 패키지별 컨벤션 분리에 유용).

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

### 3.2.7 메모리 시스템 확장

Claude Code의 메모리 시스템은 세션을 넘어 정보를 유지하는 여러 방법을 제공한다.

**`#` 단축키로 빠르게 기록**

```
# remark-gfm을 별도 플러그인으로 분리 — 테이블·체크박스 파싱 담당
# slug는 title에서 한글 포함 slugify 처리, URL 인코딩 불필요
# 자동 저장은 debounce 300ms, localStorage fallback 없음
```

**`/memory` 커맨드**

대화 중 중요한 결정사항을 CLAUDE.md에 구조화하여 저장한다.

**markflow 마일스톤별 메모 전략**

```
[1단계: Drizzle 스키마 확정]
→ /memory로 결정사항 기록:
   "documents 테이블: id(CUID2), slug(unique), title, content, parentId(nullable),
    position(int, 1024 간격), createdAt, updatedAt"
→ git commit -m "feat: Drizzle 스키마 정의"
→ /compact

[2단계: 마크다운 파싱 파이프라인 구현]
→ /memory로 기록:
   "remark → remark-gfm → remark-rehype → rehype-highlight → rehype-sanitize → rehype-stringify
    순서 고정. sanitize는 반드시 마지막."
→ git commit -m "feat: remark-rehype 파이프라인"
→ /compact

[3단계: 실시간 미리보기 구현]
→ 이전 단계 결정사항은 CLAUDE.md에 있으므로
  /compact 후에도 파이프라인 순서 기억
```

---

## 3.3 슬래시 커맨드

### 3.3.1 빌트인 커맨드 살펴보기 — `/help`로 보는 지도

```bash
/help
```

사용 가능한 모든 슬래시 커맨드 목록이 표시된다. `/` 입력 후 글자를 이어 입력하면 필터링된다.

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

### 3.4.6 커스텀 Skill 만들기와 배포

**기본 구조**

```
.claude/skills/
├── drizzle-conventions/
│   └── SKILL.md
├── markdown-security/
│   └── SKILL.md
├── deploy-staging/
│   └── SKILL.md
└── markflow-review/
    ├── SKILL.md
    └── checklist.md   # 상세 리뷰 체크리스트 별도 파일
```

**팀 배포**

```bash
git add .claude/skills/
git commit -m "feat: add markflow project skills"
```

---

## 3.5 Hook 시스템

### 3.5.0 도입 — 에이전트 = 모델 + 하네스 (개관)

**Hook이 왜 필요한가**를 한 줄로 답하기 위한 개관이다. 자세한 내용은 Level 7에서 다룬다.

> **에이전트 = 모델 + 하네스** *(하네스 = 에이전트에서 모델을 뺀 나머지 전부 — 컨텍스트 큐레이션, 도구 관리, 권한 제어, 에러 복구)*
> — Martin Fowler / Birgitta Böckeler (ThoughtWorks), *Harness Engineering*

**하네스 4사분면(개관)**

|  | 결정론적 (Deterministic) | 비결정론적 (Non-deterministic) |
|---|---|---|
| **피드포워드** (사전 유도) | **Guides** — `AGENTS.md`, `CLAUDE.md`, 코딩 컨벤션 | **System Prompt** — 역할 정의, 행동 제약, few-shot |
| **피드백** (사후 교정) | **Computational** — 컴파일러, 타입 체커, 린터, **Hook** | **Inferential** — LLM-as-judge, 의미 코드 리뷰 |

Hook은 4사분면 중 **Computational(결정론적 사후 교정)** 계층의 핵심 도구다. 가이드를 무시해도 기계가 잡는다.

**보안 — Lethal Trifecta + Rule of Two (가드레일이 왜 필요한가의 학문적 근거)**

Simon Willison의 **Lethal Trifecta** (2025-06): 다음 셋이 동시에 있으면 보안 사고는 필연이다.
1. 신뢰 불가 입력 처리 (외부 웹·이메일·사용자 입력)
2. 민감 데이터 접근 (개인정보·내부 API·DB)
3. 상태 변경 능력 (이메일 발송·파일 삭제·API 호출)

Meta AI의 **Rule of Two** (2025): 에이전트는 셋 중 **최대 둘만** 동시에 가질 수 있다. 셋 다 필요하면 **HITL(사람 승인)** 필수.

| 조합 | 처리 |
|------|------|
| 외부 입력 + 민감 정보 + 상태 변경 | **금지** — 사람 승인 필수 |
| 외부 입력 + 민감 정보 (상태 변경 X) | OK — 읽기 전용 |
| 외부 입력 + 상태 변경 (민감 정보 X) | OK — 샌드박스 |
| 민감 정보 + 상태 변경 (외부 입력 X) | OK — 내부 데이터만 |

> **※ 하네스 엔지니어링은 Level 7(7.1 Subagent의 이해와 구현 / 7.2 하네스 엔지니어링 / 7.3 오픈소스 하네스와 ECC 케이스 분석 / 7.4 나만의 하네스 만들기 / 7.5 멀티 에이전트, 하네스 확장 / 7.6 자율 운용과 베스트 프랙티스)** 에서 자세히 다룬다. L3에서는 Hook이 4사분면 중 어디에 위치하는지, 가드레일이 왜 필요한지만 짚고 넘어간다.

---

### 3.5.1 Hook이란 무엇인가 — 주요 타이밍

Hook은 Claude Code의 특정 이벤트 시점에 자동으로 셸 명령을 실행하는 기능이다. `.claude/settings.json`에 설정하며 프로젝트 단위로 관리된다.

> 공식 문서 기준 hook 이벤트는 총 **33개** (PreToolUse·PostToolUse·UserPromptSubmit·Notification·Stop·SubagentStop·PreCompact·SessionStart·SessionEnd·PermissionDenied 등). 이 절에서는 실무에서 가장 자주 쓰는 **8개**만 정리한다.

| 타이밍 | 설명 | 주요 용도 |
|--------|------|---------|
| `PreToolUse` | 도구 실행 **전** | 실행 차단, 사전 검증, 자동 백업 |
| `PostToolUse` | 도구 실행 **후** | 린트·포맷팅·자동 수정 |
| `Notification` | Claude가 알림을 보낼 때 | 데스크탑 알림, Slack 연동 |
| `Stop` | 전체 응답 완료 시 | 타입 체크, 빌드 검증, 테스트 |

**추가 타이밍 (신규)**

| 타이밍 | 설명 |
|--------|------|
| `PreCompact` | `/compact` 또는 auto-compact **전** |
| `SessionStart` | 세션 시작 시 |
| `SessionEnd` | 세션 종료 시 |
| `PermissionDenied` | auto 모드에서 권한이 거부될 때 |

> **⚠️ 포맷 주의**: `hook` (단수 객체)가 아니라 `hooks` **(복수 배열)**을 사용해야 한다. 잘못된 포맷은 `claude config list` 실행 시 `Settings Error`가 발생하며 파일 전체가 무시된다.

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

### 3.5.3 stdin JSON 페이로드 · matcher · exit code

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

### 3.5.6 PreCompact Hook으로 작업 흐름 이어가기

긴 세션에서 컨텍스트 윈도우가 가득 차면 `/compact`가 실행된다. markflow처럼 문서 구조·스키마 결정사항이 많은 프로젝트에서는 PreCompact Hook으로 작업 맥락을 보존하는 것이 중요하다.

**PreCompact matcher 종류**

| matcher 값 | 트리거 조건 |
|-----------|-----------|
| `"auto"` | 컨텍스트 윈도우 ~95% 도달 시 자동 compact |
| `"manual"` | 사용자가 `/compact` 직접 실행 |
| `""` 또는 `"*"` | auto + manual 모두 (완전 자동에 필요) |

**자동 설치 도구**

```bash
git clone https://github.com/who96/claude-code-context-handoff.git
cd claude-code-context-handoff
./install.sh
```

> ⚠️ 이 도구는 Claude Code 플러그인이 아니라, 셸 스크립트가 `~/.claude/settings.json`에 직접 Hook을 등록하는 방식이다.

---

### 3.5.7 Hook 사용 시 주의사항

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

### 3.6.1 MCP 개념과 Transport 3종 (HTTP · stdio · SSE)

MCP(Model Context Protocol)는 Claude Code가 외부 서비스와 표준화된 방식으로 통신할 수 있게 해주는 오픈 표준 규격이다.

**Transport 3종 비교**

| Transport | 방식 | 용도 |
|-----------|------|------|
| `http` (권장) | 원격 HTTPS 엔드포인트 | Slack, GitHub, Neon 등 클라우드 서비스 |
| `stdio` | 로컬 프로세스 stdin/stdout | 로컬에서 직접 실행하는 MCP 서버 |
| `sse` | Server-Sent Events (원격) | 스트리밍 기반 원격 서비스 |

**markflow MCP 설정 예시**

```json
// ~/.claude.json (local·user scope MCP 서버) 또는 .mcp.json (project scope)
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "neon": {
      "type": "http",
      "url": "https://mcp.neon.tech/sse"
    }
  }
}
```

> `.mcp.json` 스키마는 `"type": "http"` (또는 stdio·sse)이다. 과거 문서에서 보이는 `"type": "url"`은 무효이며, `"type": "sse"`는 deprecated 상태로 표기는 가능하나 신규 설정에는 `http`를 권장한다.

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

### 3.6.2 Scope 3종 (Local · Project · User) 와 `.mcp.json`

| 스코프 | 위치 | 공유 범위 |
|--------|------|---------|
| **Local** (기본) | `~/.claude.json` (프로젝트 경로 키 아래) | 현재 프로젝트 한정 — 본인만 |
| **Project** | `.mcp.json` (프로젝트 루트) | 팀 공유 (Git 커밋) |
| **User** | `~/.claude.json` | 본인의 모든 프로젝트 |

> 같은 이름의 서버가 여러 scope에 정의되면 **local > project > user > plugin > claude.ai connector** 순으로 단일 정의만 사용된다.

markflow 팀은 Neon DB MCP를 `.mcp.json`에 설정하고 커밋한다. 개인 API 키가 필요한 서버는 `~/.claude.json` (local 또는 user scope)에 설정한다.

```bash
claude mcp add --transport http neon https://mcp.neon.tech/sse
claude mcp list
```

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

### 3.6.4 Claude Context (Zilliz) MCP — 코드베이스 의미 검색

**Claude Context**는 Zilliz가 공개한 MCP 서버로, 대규모 코드베이스를 벡터 인덱스로 만들어 Claude Code가 의미 단위로 검색할 수 있게 한다. 단순 grep과 달리 "비슷한 의도의 코드"까지 찾는다.

**핵심 메커니즘 4가지**

| 요소 | 역할 |
|------|------|
| **AST 청킹** | 토큰 단위가 아니라 함수·클래스 경계로 분할 → 검색 단위가 의미 단위 |
| **하이브리드 검색** | BM25(키워드) + dense vector(의미)를 결합 — 정확한 식별자도, 모호한 의도도 둘 다 잡힘 |
| **Merkle Tree 증분 인덱싱** | 변경된 파일만 다시 임베딩 → 매번 풀 인덱싱 X |
| **MCP 노출** | Claude Code에서 `search_code` 같은 도구로 직접 호출 |

**효과 (Zilliz 자체 벤치마크 기준)**

- 기존 grep+Read 반복 패턴 대비 약 **40% 토큰 절감**
- 모놀리식 리팩터링·legacy 탐색에서 특히 큰 차이
- markflow처럼 문서·렌더 파이프라인이 다층인 프로젝트에 적합

**언제 쓰나**

| 작업 | grep으로 충분 | Claude Context가 유리 |
|------|-------------|--------------------|
| 정확한 식별자(함수명·상수) 찾기 | ✓ | — |
| "이거랑 비슷한 패턴 어디 있지?" | — | ✓ |
| "인증 흐름 전체를 보여줘" | — | ✓ |
| 단일 파일 편집 | ✓ | — |

---

### 3.6.5 Claude Context 로컬 배포 (Ollama + Milvus)

원격 임베딩 API를 쓰지 않고 **로컬에서 닫힌 환경**으로 운영할 수도 있다. 사내 코드를 외부에 보내고 싶지 않을 때 유효한 구성이다.

**구성 요소**

- **Ollama** — 임베딩 모델(예: `nomic-embed-text`)을 로컬에서 서빙
- **Milvus** — 벡터 저장소 (Zilliz가 만든 오픈소스, Docker 단일 컨테이너로 시작 가능)
- **Claude Context MCP** — 두 컴포넌트와 Claude Code 사이의 어댑터

**Docker Compose 예시**

```yaml
# docker-compose.yml
services:
  milvus:
    image: milvusdb/milvus:latest
    ports: ["19530:19530"]
    volumes: ["./milvus_data:/var/lib/milvus"]

  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["./ollama:/root/.ollama"]
```

```bash
docker compose up -d
docker exec -it $(docker ps -qf name=ollama) ollama pull nomic-embed-text
```

**Claude Code 등록**

```bash
claude mcp add --transport http claude-context http://localhost:8080/mcp
```

```json
// .mcp.json
{
  "mcpServers": {
    "claude-context": {
      "type": "http",
      "url": "http://localhost:8080/mcp",
      "env": {
        "EMBEDDING_PROVIDER": "ollama",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "VECTOR_STORE": "milvus",
        "MILVUS_URI": "http://localhost:19530"
      }
    }
  }
}
```

**markflow 활용 시나리오**

- 새 기능을 작업할 때 `search_code "마크다운 렌더 파이프라인"` 한 번으로 관련 모듈 후보를 모두 받음
- legacy import 정리 시 "비슷한 패턴" 검색으로 grep이 놓치는 변형 케이스까지 잡음
- CI에서 인덱싱을 스케줄링하면, 다음 세션이 시작될 때 이미 최신 인덱스가 준비됨

> 보안 — 사내 코드는 로컬 Ollama+Milvus 권장. 외부 임베딩 API를 쓸 경우 코드 단편이 그쪽으로 전송된다는 점을 팀 정책으로 명시한다.

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

### 3.7.3 가드레일 훅 패키지 만들기

markflow 프로젝트에 맞는 가드레일 훅 패키지를 `.claude/settings.json`에 구성한다.

```json
// .claude/settings.json
{
  "permissions": {
    "deny": [
      "Bash(git push --force*)",
      "Bash(rm -rf /*)",
      "Bash(DROP TABLE*)",
      "Bash(TRUNCATE*)",
      "Bash(drizzle-kit drop*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in *.env|*.env.*|drizzle/meta/*|*secret*) echo \"⛔ 보호된 파일: $f\" >&2; exit 2;; esac"
          },
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); if [ -n \"$f\" ] && [ -f \"$f\" ]; then cp \"$f\" \"$f.bak\" 2>/dev/null; fi || true"
          }
        ]
      }
    ],
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
          },
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); if echo \"$f\" | grep -q 'schema.ts'; then npm run db:generate 2>/dev/null || true; fi"
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

Drizzle 스키마(`schema.ts`) 파일이 수정될 때마다 자동으로 `db:generate`를 실행하는 Hook이 포함되어 있다.

```bash
git add .claude/settings.json
git commit -m "feat: add markflow guardrail hooks"
```

---

## 📋 LEVEL 3 핵심 요약

| 항목 | 핵심 내용 |
|------|---------|
| 패러다임 이동 | Prompt(2022–24) → Context(2025) → Harness(2026~). 각 시대는 이전을 포함(subsume). 하네스는 Level 7에서 다룸 |
| 컨텍스트 엔지니어링 | AI가 추론하는 순간에 올바른 환경을 설계하는 기술 (Anthropic 4전략: Write/Select/Compress/Isolate) |
| Context Rot 대응 | CLAUDE.md 200줄 이하, 주기적 `/compact`, `.claudeignore` 설정 |
| `/context` | 컨텍스트 사용률 시각화. **40% 룰**(12-Factor)·70%+ 압축 고려 |
| KV-cache | 캐시 히트 시 비용 1/10. **Stable Prefix / Variable Suffix** 분리 |
| CLAUDE.md 계층 | 로드 순서 ① System(Managed) → ② User(`~/.claude/CLAUDE.md`) → ③ Project(`./CLAUDE.md` 또는 `./.claude/CLAUDE.md`) → ④ Local(`./CLAUDE.local.md`). 모두 concat (override 아님), 마지막 Local이 가장 강함. 서브폴더 CLAUDE.md는 lazy-load |
| rules + paths | 특정 경로 작업 시에만 규칙 자동 활성화 |
| 모델 설정 (4.6/4.7) | `effort` 5단계(max/xhigh/high/medium/low) + `thinking: adaptive` (extended thinking + budget_tokens 대체) |
| Opus 4.7 행동 | Literal instruction following — "CRITICAL/MUST" 강조 자제, 적용 범위 명시 |
| 프롬프팅 효과 (CoT) | GSM8K 17.9% → 58.1% (Wei et al. 2022). 장문 컨텍스트는 위, 지시는 아래(최대 30% 향상) |
| Skill 시스템 | SKILL.md로 정의. Claude 자동 발동 또는 `/skill-name`으로 호출 |
| Hook 타이밍 | PreToolUse(차단) → PostToolUse(린트) → Stop(검증) |
| Hook 포맷 | `hooks` 복수 배열. `exit 2`로 차단 |
| Hook의 위치 | 하네스 4사분면 중 **Computational(결정론적 사후 교정)** 계층 |
| 보안 가드레일 | **Lethal Trifecta**(외부입력+민감정보+상태변경) + **Rule of Two**(셋 중 둘만 허용) |
| MCP scope | Local(`~/.claude`) vs Project(`.mcp.json`) |
| 실습 3종 | drizzle-conventions Skill, markflow 코드리뷰 커맨드, 가드레일 훅 패키지 |

---

## 📚 참고 자료

| 자료 | URL |
|------|-----|
| markflow 오픈소스 | https://github.com/claude-code-expert/markflow |
| Claude Code Skills 공식 문서 | https://code.claude.com/docs/en/skills |
| Claude Code Hooks 공식 문서 | https://code.claude.com/docs/en/hooks |
| Claude Code Commands 공식 문서 | https://code.claude.com/docs/en/commands |
| Extend Claude Code | https://code.claude.com/docs/en/features-overview |
| AGENTS.md 공식 사이트 | https://agents.md |
| Anthropic Context Engineering | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
| Anthropic Prompting Best Practices | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview |
| Wei et al., Chain-of-Thought (NeurIPS 2022) | https://arxiv.org/abs/2201.11903 |
| Context Rot 연구 | https://www.trychroma.com/research/context-rot |
| HumanLayer 12-Factor Agents | https://github.com/humanlayer/12-factor-agents |
| Simon Willison, Lethal Trifecta | https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ |
| Meta AI, Agents Rule of Two | https://ai.meta.com/blog/practical-ai-agent-security/ |
| who96/claude-code-context-handoff | https://github.com/who96/claude-code-context-handoff |

---

> **할루시네이션 검증 노트 (2026-04-29)**
>
> - **Skills 시스템**: 공식 문서 확인 완료. `.claude/skills/` 디렉터리 구조, SKILL.md frontmatter 문법, `disable-model-invocation` / `user-invocable` / `allowed-tools` 필드 모두 확인
> - **Hook 타이밍**: PreToolUse·PostToolUse·Notification·Stop 4가지 기본 + PreCompact·SessionStart·SessionEnd·PermissionDenied 신규 확인
> - **hook vs hooks**: 복수 배열(`hooks`) 사용이 현재 버전 공식 포맷. 단수 `hook`은 에러 발생 확인
> - **PreCompact matcher 값**: `"auto"` / `"manual"` / `""` 세 가지 공식 문서에서 확인
> - **markflow 기술 스택**: 강의 목차(`01-강의_목차_v.1.0.md`) 기준 — Next.js + Drizzle ORM + PostgreSQL + Tailwind CSS. GitHub rate limit으로 소스 직접 분석 불가, 목차 기반 작성
> - **AGENTS.md 60,000개 수치**: 공식 사이트 기준 확인 완료
> - **who96/claude-code-context-handoff**: GitHub 저장소 존재 확인. 플러그인이 아닌 셸 스크립트 설치 방식 확인
> - **⚠️ markflow 소스 직접 분석 미완료**: GitHub 도메인이 네트워크 허용 목록에 없어 소스 분석 불가. 강의 목차 기반으로 추정 작성. 실제 소스 공개 후 세부 API·스키마·컴포넌트 구조 업데이트 필요

<!--
======================================================================
용어 사전 (Glossary) — PPT 변환 시 제외 (HTML 주석 블록)
약어의 풀이름과 본문에서 쓰인 용어의 의미를 강사 참고용으로 정리한다.
이 블록은 강의 슬라이드 변환 시 렌더링되지 않는다.
======================================================================

## 1. 약어 풀이름 (Acronym Expansions)

### 모델·런타임
- **LLM** — Large Language Model. 거대 언어 모델.
- **CoT** — Chain-of-Thought. 사고 사슬. 추론 과정을 단계별로 출력하도록 유도하는 프롬프팅 기법.
- **ReAct** — Reasoning + Acting. 사고(Thought) → 행동(Action) → 관찰(Observation)을 반복하는 에이전트 루프.
- **GSM8K** — Grade School Math 8K. 초등 수준 수학 문장제 8,000문제 벤치마크 (OpenAI, 2021).
- **PaLM** — Pathways Language Model. Google의 540B 파라미터 언어 모델 (2022).
- **NeurIPS** — Conference on Neural Information Processing Systems. 머신러닝 분야 최상위 학회.
- **GAN** — Generative Adversarial Network. 생성·판별 두 모델을 적대적으로 학습시키는 구조. 본문 §3 Anthropic 3-에이전트 아키텍처가 GAN에서 영감을 받음.
- **ADK** — Agent Development Kit. Google의 에이전트 개발 프레임워크.

### 컨텍스트·캐시
- **JIT** — Just-in-Time. 적시 로드. 필요한 시점에만 파일을 컨텍스트로 가져오는 패턴.
- **KV-cache** — Key-Value cache. Transformer 추론 시 이전 토큰의 어텐션 키·값 텐서를 재사용하기 위한 캐시. 동일 접두어 재계산을 피해 비용을 1/10 수준으로 줄임.
- **RAG** — Retrieval-Augmented Generation. 검색 보강 생성. 외부 지식 베이스에서 관련 문서를 가져와 프롬프트에 주입하는 패턴.
- **TTL** — Time-To-Live. 캐시 유효 시간.

### 인프라·프로토콜
- **MCP** — Model Context Protocol. Anthropic이 제안한 모델·도구 연결 표준.
- **HTTP / SSE / stdio** — MCP transport 종류. HyperText Transfer Protocol / Server-Sent Events / Standard Input·Output.
- **API** — Application Programming Interface. 응용 프로그램 인터페이스.
- **CLI** — Command Line Interface. 명령행 인터페이스.
- **IDE** — Integrated Development Environment. 통합 개발 환경.
- **DB** — Database. 데이터베이스.
- **MDM** — Mobile Device Management. 조직이 단말 정책을 원격 배포·관리하는 시스템. CLAUDE.md Managed Policy가 MDM으로 배포됨.

### 보안·운영
- **HITL** — Human-in-the-Loop. 사람 개입. 자동화 흐름 중 특정 지점에 사람의 승인·검토를 의무화하는 패턴.
- **XSS** — Cross-Site Scripting. 웹 보안 취약점. 마크다운 렌더링 시 sanitize로 차단.
- **PRD** — Product Requirements Document. 제품 요구사항 문서. Ralph 패턴의 출발점.
- **TDD** — Test-Driven Development. 테스트 주도 개발.
- **HMR** — Hot Module Replacement. 개발 서버의 모듈 교체. (참고: 본 프로젝트 빌드)

### 데이터 포맷
- **JSON** — JavaScript Object Notation. 키-값 데이터 직렬화 포맷.
- **YAML** — YAML Ain't Markup Language. 들여쓰기 기반 직렬화 포맷. CLAUDE.md frontmatter에 사용.
- **XML** — Extensible Markup Language. 태그 기반 직렬화 포맷. Anthropic 권장 프롬프트 구조 태그.

---

## 2. 본문 용어 의미 (Term Definitions)

### Prompt 시대
- **Blind Prompting** — 측정·테스트 없이 시행착오에 의존해 프롬프트를 다듬는 작업 방식. Mitchell Hashimoto가 명명한 표현으로 통용.
- **Few-shot / Zero-shot** — 프롬프트에 예시를 1~5개 동봉(Few-shot) 또는 예시 없이 지시만 전달(Zero-shot)하는 방식.
- **Role Prompting** — "시니어 보안 리뷰어로서…" 같은 역할 부여로 특정 관점을 유도하는 기법.
- **Reflection** — 같은 모델이 *다른 페르소나* 로 자기 출력을 비판·개선하는 패턴 (Andrew Ng, 2024).

### Context 시대
- **Context Rot** — 대화가 길어지며 무관한 정보가 컨텍스트 윈도우를 오염시켜 응답 품질이 저하되는 현상 (Chroma Research).
- **Attention Budget** — 어텐션 예산. 모델이 한정된 어텐션을 어디에 분배하는지의 자원 개념.
- **Self-Attention의 n² 비용** — Transformer가 모든 토큰 쌍 사이의 어텐션 점수를 계산하므로 컨텍스트 길이 n에 대해 비용이 O(n²)로 증가하는 현상.
- **Stable Prefix** — 컨텍스트 윈도우 앞쪽의 자주 변하지 않는 영역(시스템 프롬프트, 도구 정의, 장기 요약). KV-cache 히트율을 높이기 위해 분리.
- **Variable Suffix** — 컨텍스트 윈도우 뒤쪽의 자주 변하는 영역(최신 사용자 입력, 새 도구 출력).
- **40% 룰 (dumb zone)** — 컨텍스트 사용률이 40%를 넘으면 모델의 지시 이행 능력이 급격히 떨어진다는 12-Factor Agents의 경험칙. 정확한 임계는 워크로드 의존.
- **Lost-in-the-Middle** — 장문 컨텍스트에서 중간 위치의 정보를 모델이 놓치는 현상.
- **Subsume(포함)** — 상위 개념이 하위를 흡수하는 관계. "각 시대는 이전을 대체하지 않고 포함한다"의 의미.

### 모델 설정 (4.6/4.7)
- **`effort`** — Opus 4.7 / Sonnet 4.6의 통합 인텔리전스 다이얼. verbosity·thinking·tool 사용량을 max/xhigh/high/medium/low 5단계로 일괄 제어.
- **Adaptive Thinking** — `thinking: {type: "adaptive"}` 설정. 모델이 쿼리 복잡도와 effort에 따라 thinking 양을 동적 조정. `extended thinking + budget_tokens`를 대체.
- **Literal Instruction Following** — Opus 4.7의 행동 변화. 지시를 일반화·추론하지 않고 문자 그대로 해석. "every section"이라 적지 않으면 첫 섹션만 처리할 수 있음.
- **Prefilled Response** — 마지막 assistant 턴을 미리 채워 출력 형식을 강제하는 기법. 4.6+에서 deprecated.

### Harness 시대 (Level 7에서 자세히)
- **하네스(Harness)** — 에이전트에서 모델을 뺀 나머지 전부. 컨텍스트 큐레이션, 도구 관리, 권한 제어, 에러 복구 등 모델을 둘러싼 시스템 일체. 공식: 에이전트 = 모델 + 하네스.
- **하네스 4사분면** — Fowler/Böckeler 분류. (피드포워드·결정론) Guides / (피드포워드·비결정론) System Prompt / (피드백·결정론) Computational / (피드백·비결정론) Inferential.
- **Defense in Depth(다층 방어)** — 4사분면을 배타적이지 않고 레이어로 조합해 쓰는 원칙.
- **Rippability(제거 용이성)** — 모델이 발전하면 하네스의 일부 로직은 불필요해지므로, 처음부터 *쉽게 제거할 수 있게* 설계해야 한다는 원칙.
- **Lethal Trifecta** — Simon Willison(2025-06)의 보안 개념. ① 신뢰 불가 입력 처리 + ② 민감 데이터 접근 + ③ 상태 변경 능력 — 셋 동시 보유 시 보안 사고는 필연.
- **Rule of Two** — Meta AI(2025)의 보안 원칙. 에이전트는 Lethal Trifecta 셋 중 *최대 둘만* 동시에 가질 수 있음. Chromium 브라우저 보안 모델에서 차용.
- **Ralph Pattern** — Geoffrey Huntley가 제안한 자율 실행 루프. PRD → 클린 컨텍스트로 매 이터레이션 반복 → 상태는 파일 시스템에 저장.
- **Planner / Generator / Evaluator** — Anthropic 3-에이전트 아키텍처(GAN 영감). 설계·구현·평가를 분리해 자기 평가 한계를 극복.

### 시스템·플랫폼 비유
- **LLM-as-OS** — Karpathy의 비유. RAM=컨텍스트 윈도우, CPU=LLM 추론 엔진, 파일시스템=RAG/벡터 DB, 시스템 호출=Tool Call.

### 코드·도구
- **frontmatter** — 마크다운 파일 상단의 `---`로 둘러싼 YAML 메타데이터 블록. SKILL.md / `.claude/rules/*.md` 등에 사용.
- **Glob 패턴** — `*` `**` `{a,b}` `!` 등 와일드카드 파일 매칭 문법.
- **slug** — URL용 단축 식별자. 한글 제목을 URL 안전 문자열로 변환한 값.
- **debounce** — 일정 시간 내 반복 호출을 묶어 마지막 한 번만 처리하는 패턴.
- **memoization** — 동일 입력의 결과를 캐싱해 재계산을 피하는 기법.
- **lazy load** — 필요한 시점까지 리소스 로드를 미루는 전략. 서브폴더 CLAUDE.md가 이 방식으로 동작.
- **sanitize** — 사용자 입력에서 위험 요소를 제거·중화하는 처리. 마크다운에서는 rehype-sanitize로 XSS 차단.

### Hook·Skill·Command
- **matcher** — Hook 설정에서 어떤 도구 호출에 매칭할지 지정하는 필드. 빈 문자열·정규식·도구명 사용.
- **stdin JSON 페이로드** — Hook이 stdin으로 받는 JSON. `tool_name`, `tool_input.file_path`, `session_id`, `cwd`, `hook_event_name`, `tool_response` 필드 포함.
- **exit code** — Hook 종료 코드. exit 0=정상, exit 1=비차단 오류(stderr 표시, 실행은 계속), exit 2=차단(정책 강제).
- **Managed Policy** — 조직 IT가 MDM·관리 도구로 배포한 CLAUDE.md (macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`). 사용자가 `claudeMdExcludes`로도 제외할 수 없는 강제 정책 파일.
- **lazy-load CLAUDE.md** — 작업 중인 파일이 위치한 디렉터리의 CLAUDE.md를 필요 시점에만 로드하는 메커니즘.

======================================================================
용어 사전 끝
======================================================================
-->
