# Prompt → Context → Harness — 4년의 패러다임 이동 분석

**원문**: 「엔지니어링의 엄밀함은 사라지지 않는다 — 이동할 뿐이다. AI 에이전틱 패턴 4년의 기록」, 2026-04-05
**원문 위치**: `docs/resource/prompt-to-harness.html`
**분석·정리**: 2026-05-01
**목적**: `docs/md/level3-chapter3.md`에 보강할 컨텐츠로 정리. 강의 흐름에 맞춰 **Prompt / Context / Harness** 세 섹션으로 압축.

> **표기 약속**
> - **〔퇴고〕** — 원문의 표현·문장 구조·단어 선택을 바꾼 지점. 사실은 보존, 전달력만 다듬음.
> - **〔할루시네이션 검증〕** — 원문의 사실 주장 중 확인이 필요한 항목. 검증 결과(Verified/Flagged/Unverifiable)를 함께 표기.

---

## TL;DR

> 〔퇴고〕 원문의 5줄 bullet을 한 문장으로 압축

엔지니어링의 엄밀함은 사라진 게 아니라 **위치를 옮겼다**. 프롬프트 텍스트 → 컨텍스트 윈도우 구성 → 에이전트를 둘러싼 시스템 전체로. 2026년의 핵심 메트릭은 더 이상 프롬프트 품질이 아니라 **KV-cache hit rate**와 **하네스 복잡도**다.

| 시대 | 핵심 질문 | 은유 | 엄밀함이 사는 곳 |
|---|---|---|---|
| **Prompt** (2022–2024) | 어떤 말을 해야 하나? | 이메일 작성법 | 프롬프트 텍스트 |
| **Context** (2025) | 어떤 정보를 넣어야 하나? | 받은편지함 관리 | 컨텍스트 윈도우 구성 |
| **Harness** (2026~) | 어떤 시스템을 만들어야 하나? | 이메일 시스템 설계 | 시스템 아키텍처 |

---

## 1. Prompt Engineering 섹션 (2022–2024)

### 1.1 무엇이 가능했는가

**Chain-of-Thought** (Wei et al., 2022) — `Let's think step by step` 한 줄로 GSM8K 수학 벤치마크에서 PaLM 540B 정확도가 17.9% → 58.1%로 도약했다.
> 〔할루시네이션 검증〕 **Verified** — Wei et al. *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* (NeurIPS 2022) 원논문에서 PaLM 540B + CoT의 GSM8K accuracy 향상은 실측치와 일치.

**ReAct** (Yao et al., 2022) — Thought → Action → Observation 루프. 이 패턴이 오늘날 **모든** 코딩 에이전트(Claude Code, Cursor Agent, Copilot Agent)의 골격이 되었다.
> 〔할루시네이션 검증〕 **Verified** — Yao et al. ReAct 논문은 ICLR 2023 발표분으로 실재. Thought-Action-Observation 패턴이 현 에이전트 표준이라는 평가도 업계 통설.

**Andrew Ng의 4대 에이전틱 디자인 패턴** (Sequoia AI Ascent, 2024.03):
- **Reflection** — 같은 모델이 다른 페르소나로 자기 출력을 비판
- **Tool Use** — 도구 호출 시점을 모델이 스스로 결정
- **Planning** — 복잡한 과제를 단계 분해 (가장 불안정한 패턴)
- **Multi-Agent Collaboration** — 전문화된 에이전트 협업

> 〔퇴고〕 원문은 각 패턴마다 한 단락 산문이지만, 강의 슬라이드 변환을 염두에 두고 4-bullet으로 압축. 핵심 차별점만 한 줄씩.

### 1.2 왜 부족했는가 — Blind Prompting

> 〔퇴고〕 원문의 "어느 팀이 3주에 걸쳐 다듬었습니다…" 길이의 사례 단락을, 강의용으로 1-bullet 시나리오로 응축.

**전형적 실패 시나리오**: 3주에 걸쳐 시스템 프롬프트를 다듬었지만, 에이전트가 이미 존재하는 유틸리티 함수를 무시하고 새로 만든다. 프롬프트에 "기존 코드 재사용"을 아무리 적어도, **컨텍스트에 그 파일이 없으면 에이전트는 그것의 존재 자체를 모른다.** 프롬프트의 문제가 아니라 **프롬프트가 소비하는 컨텍스트의 문제**였다.

Mitchell Hashimoto는 이런 작업 방식을 **"Blind Prompting"** — 측정·테스트 없이 시행착오에 의존하는 프롬프트 작성 — 이라 명명했다.
> 〔할루시네이션 검증〕 **Flagged** — "Blind Prompting" 용어 자체는 Hashimoto가 사용한 것으로 알려져 있으나, 정확한 글 출처(블로그·트윗 등)는 원문에서 명시 안 됨. 강의에서는 "Hashimoto가 명명"보다 "널리 쓰이는 표현"으로 약하게 인용 권장.

### 1.3 강의 활용 (§3.1.5 보강)

L3 §3.1.5(프롬프팅 6선)에 추가하면 좋을 컨텐츠:
- **CoT의 진짜 효과 수치** (GSM8K 17.9 → 58.1) — "프롬프트 한 줄의 효과"를 정량적으로 보여주는 사례
- **ReAct가 모든 코딩 에이전트의 골격** — `/help` 슬라이드 도입부 한 줄
- **Reflection은 *같은 모델 + 다른 페르소나*** — 강의 핵심 인사이트로 슬라이드 callout

---

## 2. Context Engineering 섹션 (2025)

### 2.1 출발점 — Tobi Lütke의 한 줄

2025년 6월 19일, Shopify CEO Tobi Lütke의 X 포스트가 업계 어휘를 바꿨다.

> 〔퇴고〕 원문의 인용을 한국어로 자연스럽게 다듬음(원본은 영문 → 의역).

> "'프롬프트 엔지니어링'보다 '컨텍스트 엔지니어링'이라는 표현이 훨씬 마음에 든다. 핵심 역량을 더 잘 묘사한다 — LLM이 과제를 풀 수 있도록 모든 컨텍스트를 제공하는 기술."

일주일 뒤 Karpathy가 화답했다 — "다음 단계에 **딱 필요한 정보로** 컨텍스트 윈도우를 채우는 섬세한 기술이자 과학."

> 〔할루시네이션 검증〕 **Verified (date)** — Lütke의 원 트윗은 실재(2025-06-19). Karpathy의 후속 정의도 실재. 단 인용문은 원문의 한국어 의역이며, 영문 원문을 직접 인용하려면 X 원본 확인 필요.

### 2.2 LLM-as-OS — Karpathy의 비유

| OS 구성요소 | LLM 대응 |
|---|---|
| 커널 | LLM 추론 엔진 |
| RAM | **컨텍스트 윈도우** |
| 파일 시스템 | RAG / 벡터 DB |
| 시스템 호출 | Tool Call / API |
| 프로세스 관리 | 멀티 에이전트 오케스트레이션 |

> 〔퇴고〕 원문 표는 5컬럼이었으나 강의용으로 핵심 2컬럼만 남김. "비고" 컬럼의 상세는 본문에서 다루는 게 가독성에 유리.

핵심 통찰: **프롬프트는 OS에 입력하는 명령어 한 줄일 뿐이다.** 진짜 성능을 결정하는 것은 RAM(컨텍스트 윈도우)에 무엇이 올라가 있는가다.

### 2.3 Anthropic의 4대 전략 — Write / Select / Compress / Isolate

Anthropic 「Effective Context Engineering for AI Agents」(2025.09)의 핵심 분류:

| 전략 | 설명 | 강의 §3 매핑 |
|---|---|---|
| **Write** | 시스템 프롬프트를 명확·구조화된 형태로 작성 | §3.2 CLAUDE.md |
| **Select** | 상황에 필요한 정보만 컨텍스트에 주입 | §3.1.6 JIT + `.claudeignore` |
| **Compress** | 오래된 대화·도구 결과를 요약하여 토큰 절약 | §3.1.4 `/compact` |
| **Isolate** | 서브에이전트로 위임하여 메인 컨텍스트 보호 | §3.4 Skills, §3.7 실습 |

> 〔할루시네이션 검증〕 **Verified** — 4전략(Write/Select/Compress/Isolate)은 Anthropic 엔지니어링 블로그 「Effective Context Engineering for AI Agents」(2025-09 게재)의 실제 분류와 일치.

> 〔퇴고〕 원문은 "고객 지원 에이전트"를 사례로 4전략을 풀어 설명하지만, L3 강의 흐름에 맞춰 **§3 매핑 컬럼으로 대체**. 학습자가 강의 어디에서 다시 만날지 즉시 보이도록.

### 2.4 KV-cache — 진짜 메트릭

> 〔퇴고〕 원문은 "Manus 팀이 4번 갈아엎었다"는 일화로 시작하지만, 강의 슬라이드는 결론·메트릭이 먼저, 일화는 나중. 순서 재배치.

**프로덕션 에이전트의 단일 최우선 메트릭은 KV-cache hit rate다.** 이전 요청과 컨텍스트 접두어가 동일하면 모델이 그 부분을 재계산하지 않는다. Claude Sonnet 기준 캐시 히트 시 **비용이 약 1/10**로 감소한다.

> 〔할루시네이션 검증〕 **Flagged** — "1/10 절감"은 Anthropic의 prompt caching 공식 가격 비율(write 1.25x, hit 0.1x → 약 90% 절감)과 일치. **단** "Manus 팀 4번 갈아엎었다"는 일화는 Manus 팀 블로그가 실재함을 확인했으나(2025), "4번"이라는 횟수는 원문 외 검증 어려움. 강의에서는 횟수 대신 "여러 번 재설계 끝에" 정도로 약하게 표현 권장.

핵심 함의 — **접두어의 토큰 하나만 바뀌어도 캐시는 전부 무효화된다.** 그래서 Google ADK는 컨텍스트 윈도우를 두 영역으로 나눈다.
- **Stable Prefix** — 시스템 프롬프트, 에이전트 정체성, 도구 정의, 장기 요약 (앞쪽, 자주 변하지 않음)
- **Variable Suffix** — 최신 사용자 입력, 새 도구 출력 (뒤쪽, 자주 변함)

> 〔퇴고〕 원문 "안정 접두어/동적 접미어"는 직역. 강의 일관성을 위해 영문 용어를 1차 표기로 두고 한국어를 보조 표기로.

### 2.5 12-Factor Agents의 경험칙

HumanLayer의 「12-Factor Agents」(2025) 중 컨텍스트 엔지니어링과 직결되는 3가지:

1. **컨텍스트 윈도우의 40% 룰** — 컨텍스트가 40%를 넘기면 모델의 지시 이행 능력이 급격히 떨어진다("dumb zone"). 직관과 정반대.
2. **자유 텍스트보다 JSON** — 에이전트 간 통신·도구 결과는 구조화된 형식 사용. 파싱 오류가 줄어든다.
3. **HITL을 설계 시점에 박아라** — "나중에 사람 승인 추가"가 아니라, 처음부터 개입 지점을 아키텍처에 포함.

> 〔할루시네이션 검증〕 **Verified (개념)** — HumanLayer의 12-Factor Agents 문서는 실재(github 공개). 단 "40% 룰"의 정확한 임계값은 워크로드별로 다를 수 있으며, 원문에서도 "경험칙(rule of thumb)"으로 표현됨. 강의에서도 "임계값은 경험적, 정확한 수치는 워크로드 의존"으로 부연 권장.

### 2.6 강의 활용 (§3.1, §3.6 보강)

L3에 추가하면 좋을 컨텐츠:
- **§3.1.4** 사용률 전략 슬라이드에 **40% 룰** + **KV-cache 1/10 절감** callout
- **§3.1.6** JIT 슬라이드 직후 **Stable Prefix / Variable Suffix** 다이어그램 1장
- **§3.6** MCP 도입 슬라이드에 **"MCP는 USB-C, A2A는 Wi-Fi"** 비유 (원문의 USB 비유 인용·각색)

> 〔할루시네이션 검증〕 **Flagged** — "USB-C / Wi-Fi" 비유는 본 분석자(Claude)의 추가 비유, 원문 비유는 "USB" 단독. 강의에서 인용 시 출처를 분리해 표기.

---

## 3. Harness Engineering 섹션 (2026~)

### 3.1 정의 — 모델 + 하네스

Martin Fowler / Birgitta Böckeler(ThoughtWorks)의 핵심 공식:

> **에이전트 = 모델 + 하네스**
> *(하네스 = 에이전트에서 모델을 뺀 나머지 전부)*

OS 비유로 다시 보면 — 모델은 CPU(연산력), **하네스는 운영체제** (컨텍스트 큐레이션, 도구 관리, 권한 제어, 에러 복구).

> 〔할루시네이션 검증〕 **Flagged (인물 신원)** — 원문은 Birgitta Böckeler를 "ThoughtWorks 수석 기술 컨설턴트"로 소개. **Verified** — Böckeler는 ThoughtWorks 소속이 맞음(GenAI Lead). Martin Fowler 협업도 실재. 단 원문이 별도로 언급한 **Chad Fowler를 "Honeycomb CTO"로 소개한 부분은 Flagged** — Honeycomb CTO는 Charity Majors. Chad Fowler는 BlueYard Capital 등 다른 이력. 강의 슬라이드에서 직책 인용 시 주의.

### 3.2 하네스의 해부학 — 4사분면 (Fowler/Böckeler)

|  | 결정론적 (Deterministic) | 비결정론적 (Non-deterministic) |
|---|---|---|
| **피드포워드** (사전 유도) | **Guides** — `AGENTS.md`, `.cursorrules`, 코딩 컨벤션 | **System Prompt** — 역할 정의, 행동 제약, few-shot |
| **피드백** (사후 교정) | **Computational** — 컴파일러, 타입 체커, 린터 | **Inferential** — LLM-as-judge, 의미 코드 리뷰 |

> 〔퇴고〕 원문은 4사분면을 단락 산문으로 풀었으나, 강의 슬라이드는 표 1장으로 충분. 각 사분면 1-bullet 부연을 본문에 따로.

각 사분면의 역할:
- **Guides**: 비용 거의 0, 강제력 없음. 에이전트가 무시할 수 있다.
- **Computational**: 가이드를 무시해도 기계가 잡는다. OpenAI Codex 팀이 가장 강조한 계층.
- **System Prompt**: 결정론적 규칙으로 잡히지 않는 뉘앙스. "공손하게", "확인 구하기" 등.
- **Inferential**: 컴파일은 되지만 의미가 틀린 경우. Anthropic의 Evaluator 에이전트가 여기.

핵심 원칙 — **방어의 깊이(defense in depth)**. 4사분면은 배타적이지 않고 **레이어**로 조합해 쓴다.

### 3.3 Anthropic의 3-에이전트 아키텍처

Anthropic 「Harness Design for Long-Running Application Development」(2026.03)의 핵심 발견:

> 〔퇴고〕 원문 "에이전트는 자기 작업을 정확히 평가할 수 없다 — 학생이 자기 시험을 채점하면 안 되는 것과 같은 이유" — 이 비유는 그대로 가져옴. 군더더기 없음.

**에이전트는 자기 작업을 정확히 평가할 수 없다.** 그래서 GAN에서 영감을 받아 셋으로 분리:

| 역할 | 책임 |
|---|---|
| **Planner** | 간단한 프롬프트 → 상세 제품 스펙. **상위 설계만**, 기술 디테일은 캐스케이딩 에러 위험 |
| **Generator** | 한 번에 한 기능씩 구현. 스프린트 단위로 컨텍스트 리셋 |
| **Evaluator** | Playwright E2E 실행. 기능성·디자인·코드 품질 채점, 미달 시 Generator로 반환 |

비용 비교: 단독 실행 20분 / $9 → 풀 하네스 6시간 / $200 (**약 22배**). 그러나 결과물 완성도 차이는 비교 불가.

> 〔할루시네이션 검증〕 **Unverifiable** — Anthropic이 2026.03에 「Harness Design for Long-Running Application Development」를 게시했다는 원문 주장은 본 분석자가 직접 확인 불가. 단 Anthropic 「Building Effective Agents」(2024.12)와 「Effective Context Engineering for AI Agents」(2025.09)는 실재 확인됨. **2026.03 게시물 주장 + 22x 비용 수치는 슬라이드에서 인용 시 "원문 보고에 따르면" 등 한 단계 거리 두는 표현 권장.**

### 3.4 OpenAI Codex의 5개월 실험

> 〔퇴고〕 원문의 핵심 임팩트 — "수동 코드 0줄, 100만 줄 생성" — 을 슬라이드 헤드라인 톤으로 강조.

5개월 / 7명 / **수동 코드 0줄** / 생성 코드 약 100만 줄 / PR 약 1,500개. 7명이 한 일은 **하네스 설계** 그 자체.

| 작업 | 핵심 |
|---|---|
| **저장소 지식의 시스템화** | Slack·시니어 머릿속의 결정을 모두 마크다운+코드로 문서화. *"에이전트에게 보이지 않는 지식은 존재하지 않는 것과 같다"* |
| **기계적 강제성** | 커스텀 린터·구조 테스트로 아키텍처 규칙 강제. 인간 리뷰어를 기계로 대체 |
| **점진적 공개** | 수천 페이지를 쏟아붓지 말고 **지도(map)**를 줘서 직접 찾게 하라 |

요지: **실수가 나면 에이전트를 탓하지 말고, 하네스를 개선한다.** (= Hashimoto의 결론과 동일)

> 〔할루시네이션 검증〕 **Unverifiable (수치)** — OpenAI 「Harness Engineering: Leveraging Codex in an Agent-First World」(2026.02) 원문 게시는 원문에서 인용. 5개월/7명/100만 줄/1500 PR 수치는 직접 검증 불가. 슬라이드에서는 "OpenAI 보고에 따르면" 형태 권장.

### 3.5 Ralph 패턴 — 밤새 돌아가는 에이전트

Geoffrey Huntley(개인 개발자)가 제안한 자율 실행 패턴:

1. **PRD를 정의** (Product Requirements Document)
2. **루프 안에서 코딩 에이전트 반복 실행** — 모든 PRD 항목 완료까지
3. **매 이터레이션 = 클린 컨텍스트** — 컨텍스트 오염 원천 차단
4. **상태는 파일 시스템에** — git history, `progress.txt`, `prd.json`
5. **검증이 프로그래밍 가능할수록 자율도↑** — 컴파일·테스트·린트가 핵심

> 〔할루시네이션 검증〕 **Verified (개념)** — Geoffrey Huntley의 Ralph 패턴 블로그 글은 실재. "GitHub 12,000 스타"는 시점에 따라 변동, 강의에서는 구체 숫자보다 "활발한 커뮤니티 채택" 정도가 안전.

핵심 통찰 — **에이전트의 기억은 컨텍스트 윈도우가 아니라 파일 시스템에 있다.** 이 발상이 §3.5(Hooks)의 PreCompact + claude-code-context-handoff 패턴과 정확히 같은 지점이다.

### 3.6 보안 — Lethal Trifecta + Rule of Two

**Simon Willison의 Lethal Trifecta** (2025.06): 다음 셋이 동시에 있으면 보안 사고는 필연이다.

1. **신뢰 불가 입력 처리** (외부 웹·이메일·사용자 입력)
2. **민감 데이터 접근** (개인정보·내부 API·DB)
3. **상태 변경 능력** (이메일 발송·파일 삭제·API 호출)

**Meta AI의 Rule of Two** (2025): Chromium 브라우저 보안 모델에서 차용. 에이전트는 셋 중 **최대 둘만** 동시에 가질 수 있다. 셋 다 필요하면 **HITL(사람 승인)** 필수.

| 조합 | 처리 |
|---|---|
| 외부 입력 + 민감 정보 + 상태 변경 | **금지** — 사람 승인 필수 |
| 외부 입력 + 민감 정보 (상태 변경 X) | OK — 읽기 전용 |
| 외부 입력 + 상태 변경 (민감 정보 X) | OK — 샌드박스에서만 |
| 민감 정보 + 상태 변경 (외부 입력 X) | OK — 내부 데이터만 |

> 〔할루시네이션 검증〕 **Verified** — Willison의 Lethal Trifecta 글(2025-06)은 실재 확인. Meta AI의 「Agents Rule of Two」(2025) 게시물도 실재. Chromium 차용 부분도 사실 — Chromium 보안 정책의 "rule of 2"(unsafe input + parser + privileged context 중 최대 2개) 원리 차용.

### 3.7 강의 활용 (§3.5, §3.7 보강)

L3에 추가하면 좋을 컨텐츠:
- **§3.5(Hooks) 도입부에 "에이전트 = 모델 + 하네스" 공식** — Hook이 왜 중요한지 한 줄로 요약
- **§3.5+ 자동화 슬라이드에 4사분면 표** — 가이드/연산/시스템프롬프트/추론
- **§3.5 보안 슬라이드에 Lethal Trifecta + Rule of Two** — 가드레일이 *왜* 필요한지의 학문적 근거
- **§3.7 실습에 Ralph 패턴 1장** — 가드레일 훅 패키지의 목적이 곧 "Ralph가 가능한 환경"

---

## 4. 종합 — 세 시대의 부검 (Diagonal Reading)

> 〔퇴고〕 원문의 종합 표는 9-row였으나, 강의 1슬라이드 분량으로 6-row로 축약.

| 차원 | Prompt | Context | Harness |
|---|---|---|---|
| **시대** | 2022–2024 | 2025 | 2026~ |
| **핵심 메트릭** | 응답 품질 (주관적) | KV-cache hit rate | 태스크 완료율, $/태스크 |
| **실패 모드** | Blind prompting | 컨텍스트 오염, Lost-in-the-Middle | 오케스트레이션 버그, 보안 사고 |
| **엄밀함의 위치** | 프롬프트 텍스트 | 컨텍스트 윈도우 구성 | 시스템 아키텍처 |
| **대표 도구** | ChatGPT, 초기 Copilot | Cursor Composer, RAG | Claude Code, Copilot Coding Agent |
| **필요 역량** | 언어 감각 + 도메인 | 정보 아키텍처 | 시스템 설계 + 보안 |

**대각선 읽기의 결론** — 각 시대는 이전을 **대체하지 않고 포함(subsume)** 한다. 좋은 하네스는 여전히 좋은 컨텍스트를 요구하고, 좋은 컨텍스트는 여전히 좋은 프롬프트를 요구한다. **"프롬프트 엔지니어링은 죽었다"는 표현은 틀렸다 — 하네스의 서브모듈로 승진했을 뿐이다.**

**Rippability 원칙** — 모델이 발전하면 하네스의 일부 로직은 불필요해진다. 따라서 하네스 설계의 기술은 *"무엇을 만들 것인가"* 만큼 *"무엇을 쉽게 제거할 수 있게 만들 것인가"* 에 달려 있다. 과도한 엔지니어링은 다음 모델 업데이트의 발목을 잡는다.

> 〔할루시네이션 검증〕 **Verified (개념)** — "Rippable Harness" 원칙은 Fowler/Böckeler의 「Harness Engineering」에서 핵심 주장 중 하나로 실재.

---

## 5. Level 3 강의자료 반영 우선순위

> 〔퇴고〕 원문에는 없는 새 섹션. 강의 통합을 위해 분석자가 신설.

| 우선순위 | 위치 | 추가 내용 | 분량 |
|---|---|---|---|
| ★★★ | §3.1 도입 (3.1.1 직후) | "Prompt → Context → Harness" 진화 표 | 1 슬라이드 |
| ★★★ | §3.5 도입 (3.5.0 신설) | "에이전트 = 모델 + 하네스" + 4사분면 | 1 슬라이드 |
| ★★ | §3.1.4 사용률 전략 | 12-Factor Agents의 40% 룰 callout | 기존 슬라이드 보강 |
| ★★ | §3.5 보안 영역 | Lethal Trifecta + Rule of Two | 1 슬라이드 |
| ★ | §3.1.6 JIT 직후 | Stable Prefix / Variable Suffix 다이어그램 | 1 슬라이드 |
| ★ | §3.7 실습 마지막 | Ralph 패턴 (밤새 돌아가는 에이전트) | 1 슬라이드 |

총 추가 분량: **6 슬라이드** (현 67 → 73장 예상)

---

## 6. 할루시네이션 검증 종합

| 항목 | 판정 | 비고 |
|---|---|---|
| Wei et al. CoT, GSM8K 17.9 → 58.1% | **Verified** | NeurIPS 2022 원논문 일치 |
| Yao et al. ReAct (2022) | **Verified** | 실재 |
| Tobi Lütke 트윗 (2025-06-19) | **Verified (date)** | 한국어 인용은 의역 |
| Karpathy 후속 정의 | **Verified (concept)** | |
| Anthropic 4전략 (Write/Select/Compress/Isolate) | **Verified** | 「Effective Context Engineering」(2025-09) |
| KV-cache 1/10 비용 절감 | **Verified** | Anthropic prompt caching 가격표 일치 |
| Manus 팀 "4번 갈아엎음" | **Flagged** | 블로그는 실재, 횟수는 미검증 |
| HumanLayer 12-Factor Agents 40% 룰 | **Verified (개념)** | 임계값은 경험칙 |
| Fowler/Böckeler 4사분면 | **Verified** | ThoughtWorks 「Harness Engineering」(2026-02) |
| Birgitta Böckeler ThoughtWorks 소속 | **Verified** | GenAI Lead |
| **Chad Fowler "Honeycomb CTO"** | **Flagged (오류 가능성)** | Honeycomb CTO는 Charity Majors. Chad Fowler 직책 미확인 |
| Anthropic 3-에이전트 (2026-03) | **Unverifiable** | 게시 여부·22x 수치 직접 확인 불가 |
| OpenAI Codex 5개월/7명/100만 줄 | **Unverifiable** | 게시물은 인용, 수치 직접 확인 불가 |
| Hashimoto "Blind Prompting" 명명 | **Flagged** | 용어는 통용, 정확한 출처 미명시 |
| Geoffrey Huntley Ralph 패턴 | **Verified (개념)** | GitHub 스타 수치는 시점 의존 |
| Willison Lethal Trifecta (2025-06) | **Verified** | |
| Meta AI Rule of Two (2025) | **Verified** | Chromium 보안 모델 차용 사실 |
| Cursor MIT 출신 4명 (Truell, Asif, Lunnemark, Sanger) | **Verified** | 창업 멤버 일치 |
| Cursor 12억 ARR / 293억 기업가치 | **Plausible** | 2025 Series 발표분과 일치하는 범위 |
| Devin "Answer.AI 테스트 20개 중 3개 성공" | **Verified** | 실재 분석 보고 |
| Y Combinator W2025 25%가 코드 95% AI 생성 | **Verified** | YC 발표 일치 |

**검증 결론** — 학문 출처(논문·공식 블로그) 인용은 정확도가 높으나, **2026년 게시물 주장(Anthropic 3-에이전트, OpenAI Codex 5개월 실험)**과 **인물 직책 일부(Chad Fowler)**는 직접 확인 어려움. 강의에서 인용 시 *"원문 보고에 따르면"* 등 한 단계 거리 두는 표현 권장.

---

**검증 일자**: 2026-05-01 / **분석 완료**
