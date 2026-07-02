---
marp: true
theme: default
paginate: true
title: "LEVEL 7 — 멀티 에이전트 & 워크플로우 오케스트레이션"
---

# LEVEL 7 — 멀티 에이전트 & 워크플로우 오케스트레이션

## 하나의 작업을 "몇 개의 에이전트로, 어떻게 나눠 돌릴 것인가"

> **메인 질문:** 작업을 직접 끌고 갈 것인가 / 던져놓고 나중에 확인할 것인가 / Claude가 한 무리의 작업자를 알아서 지휘하게 할 것인가
>
> **하네스 엔지니어링은 별도 레벨**에서 다룬다. 이 레벨은 "병렬·위임·협업 메커니즘 자체"에 집중한다.
>
> 출처 기준일: 2026-07-01 · 공식 문서 [code.claude.com/docs](https://code.claude.com/docs/en/agents)

---

## 학습 목표

1. **서브에이전트** — 한 세션 안에서 곁가지 작업을 격리·위임하는 기본 단위
2. **Dynamic Workflows** — 조율 로직을 컨텍스트가 아니라 "코드(스크립트)"로 옮기는 대규모 병렬
3. **Agent Teams** — 작업자끼리 직접 메시지를 주고받는 멀티 세션 협업
4. **Agent View · Worktree · /batch** — 직접 돌리는 병렬 세션의 관리·격리
5. **선택 기준** — 4가지 방식을 비용·통신·파일 충돌 관점에서 고르는 법

---

## 4가지 병렬 방식 — 한눈에 비교

| 방식 | 누가 조율? | 작업자끼리 통신? | 파일 격리 | 출시 상태 |
| --- | --- | --- | --- | --- |
| **서브에이전트** | 메인 세션(나+Claude) | ❌ 메인에만 보고 | 옵션(`isolation: worktree`) | 정식(GA) |
| **Agent View / 백그라운드** | 내가 던지고 확인 | ❌ 나에게만 보고 | 자동(worktree) | research preview |
| **Agent Teams** | Claude(팀 리드)가 지휘 | ✅ 메일박스로 직접 | ❌ 수동 분할 필요 | experimental(기본 비활성) |
| **Dynamic Workflows** | 스크립트(코드)가 보유 | 단계 간 전달 | acceptEdits 자동 승인 | research preview |

> 출처: [Run agents in parallel — Claude Code Docs](https://code.claude.com/docs/en/agents)

---

# PART 1 — 서브에이전트(Subagent)

## 단일 세션 안의 격리된 작업자

---

## 1-1. 서브에이전트란?

서브에이전트는 메인 세션이 띄우는 **독립 컨텍스트 윈도우를 가진 전문 작업자**다. 무거운 곁가지 작업(테스트 실행·코드베이스 탐색·로그 처리)을 자기 컨텍스트에서 처리하고, **메인에는 요약만 반환**한다.

```
[인라인]   사용자 → Claude(메인) : git diff 30k + 파일 16k + 분석 15k 전부 메인에 누적
[서브에이전트] 사용자 → Claude(메인) → Agent 위임
                          └ 새 컨텍스트에서 작업 → 요약 2k만 메인 반환 → 컨텍스트 폐기
```

> 핵심 가치: ① 컨텍스트 격리 ② 도구 제한(하드 제약) ③ 병렬 실행 ④ 모델 라우팅
> 출처: [Create custom subagents](https://code.claude.com/docs/en/sub-agents)

---

## 1-2. 정의 파일 형식

`.claude/agents/<name>.md` (프로젝트) 또는 `~/.claude/agents/<name>.md` (사용자 전역)

```markdown
---
name: security-reviewer
description: >
  코드 변경의 보안 취약점·인젝션·인증 문제를 검토한다.
  인증/결제/사용자 데이터를 건드리는 커밋 직전 PROACTIVELY 사용.
tools: Read, Grep, Glob        # 이 목록에 없는 도구는 호출 자체가 차단됨
model: sonnet                  # haiku / sonnet / opus / inherit
---

당신은 시니어 보안 리뷰어다.
1. git diff로 변경 파일을 식별한다.
2. 인증·입력검증·민감정보 노출을 중심으로 본다.
3. Critical / High / Medium / Low로 분류해 보고한다.
- 절대 파일을 수정하지 않는다(Read-only).
```

> `description`이 **자동 위임의 트리거**다. "보안 전문가"보다 "커밋 직전 인증 코드 검토 시"처럼 **언제 부를지**를 구체적으로 쓴다. 출처: [subagents 공식 블로그](https://claude.com/blog/subagents-in-claude-code)

---

## 1-3. 빌트인 서브에이전트와 `/agents`

- **빌트인:** `Explore`(읽기 중심 코드베이스 탐색), `Plan`(계획 수립), general-purpose 작업자
  - 커스텀을 만들기 전에 빌트인부터 익히는 것을 권장
- **`/agents` 커맨드:** 대화형으로 생성·편집. `Running` 탭(실행 중 목록) + `Library` 탭(생성·편집)
  - 설명만 적으면 초안을 자동 생성해 준다
- **중복 이름 점검:** v2.1.196부터 `/doctor`가 같은 스코프 내 이름 중복을 보고

> ⚠️ `/agents`(현재 세션 서브에이전트)와 `claude agents`(백그라운드 세션 대시보드)는 **이름만 비슷한 별개 기능**이다.
> 출처: [Create custom subagents](https://code.claude.com/docs/en/sub-agents), [Run agents in parallel](https://code.claude.com/docs/en/agents)

---

## 1-4. 언제 쓰나 / 언제 쓰지 말까

| 쓴다 (✅) | 쓰지 않는다 (❌) |
| --- | --- |
| 출력이 많은 작업(테스트·문서 fetch·로그) 격리 | 일회성 단일 도구 호출, 사소한 계산 |
| 같은 종류의 작업자를 반복 호출(코드리뷰·테스트작성) | 토큰 예산이 빠듯하거나 레이트리밋 근처 |
| 독립적인 영역의 병렬 탐색(인증·DB·API 동시 조사) | 단계가 **서로 의존**하는 순차 작업 |
| 구현 후 "맥락 모르는" 신선한 눈으로 검증 | 같은 파일을 동시에 수정해야 하는 작업 |

> 비용 직관: 서브에이전트 중심 워크플로우는 단일 스레드 대비 **대략 7배** 토큰을 쓸 수 있다(웹 자료·일반치). 동시 **3~5개가 스위트 스폿**, 그 이상은 요약 병합 비용이 이득을 잠식.

---

## 1-5. 예제 프롬프트 — 상황별

**① 무거운 탐색 격리 (컨텍스트 위생)**
```
서브에이전트를 써서 테스트 스위트를 실행하고,
실패한 테스트와 에러 메시지만 요약해서 보고해줘.
```

**② 독립 영역 병렬 조사**
```
인증, 데이터베이스, API 모듈을 각각 별도 서브에이전트로 동시에 조사해줘.
각자 독립적으로 탐색하고, 끝나면 종합해줘.
```

**③ 구현 전 사전 리서치 → 계획**
```
사용자 알림 기능을 구현하기 전에 서브에이전트로 먼저 조사해줘:
- 현재 이메일은 어디서 어떻게 발송되나
- 기존 알림 패턴이 있나
- 새 로직은 아키텍처상 어디에 둬야 하나
요약 후 같이 구현 계획을 세우자.
```

---

## 1-6. 예제 프롬프트 — 검증/파이프라인

**④ 편향 없는 코드 리뷰 (구현 맥락 차단)**
```
읽기 전용 서브에이전트로 내 결제 플로우 구현을 리뷰해줘.
이전 대화 맥락은 보지 말고, 보안 취약점·미처리 엣지케이스·에러 핸들링 누락을
비판적으로 봐줘.
```

**⑤ 단계별 핸드오프 파이프라인**
```
이 기능을 파이프라인으로 만들자.
1) 첫 서브에이전트: API 계약을 설계해 docs/api-spec.md에 작성
2) 둘째: 그 명세대로 구현
3) 셋째: 읽기 전용으로 구현을 리뷰
각 단계는 앞 단계 산출물만 입력으로 받는다.
```

> 실무 포인트: 출력 형식을 명시할수록(예: "JSON으로", "표로") 메인의 종합이 안정적이다.

---

## 1-7. 안티패턴

- **만능 에이전트 금지:** "developer-agent"가 리뷰·수정·테스트·계획·배포를 다 하면 그냥 "두 번째 generalist 대화"일 뿐이다. **결과(outcome) 단위로 분리**하라.
- **페르소나 이름 금지:** "보안 전문가"는 트리거가 약하다. "커밋 직전 인증 코드 검토 시"처럼 조건을 적어라.
- **서브에이전트는 자기 서브에이전트를 못 띄운다.** `tools`에 `Agent`(Task)를 넣지 마라. (중첩 위임 불가)
- **검토 없는 대량 실행 금지:** 띄운 백그라운드보다 더 많이 검토할 수 없다. 완료 요약도 사람/메인 검토가 필요.

> 출처: [Subagents in the SDK](https://platform.claude.com/docs/en/agent-sdk/subagents), [Create custom subagents](https://code.claude.com/docs/en/sub-agents)

---

# PART 2 — 워크플로우 오케스트레이션 (Dynamic Workflows)

## 조율 로직을 "컨텍스트"가 아니라 "코드"로

> research preview · 2026-05-28 출시 · 공식 문서 2026-06-02 공개 · v2.1.154+

---

## 2-1. Dynamic Workflows란?

Claude가 작업을 받아 **즉석에서 JavaScript 오케스트레이션 스크립트**를 작성하고, 그 스크립트가 서브에이전트들을 띄워 병렬 실행·결과 수집·검증·종합한다.

```
[일반 서브에이전트]  Claude가 턴마다 무엇을 띄울지 판단 → 모든 결과가 메인 컨텍스트로 복귀
                     → 3~5개까지는 OK, 그 이상이면 컨텍스트가 꽉 차 길을 잃음

[Dynamic Workflow]   Claude는 "계획자(planner)", 스크립트가 "조율자(dispatcher)"
                     → 조율 로직이 컨텍스트 밖(디스크의 .js 파일)으로 이동
                     → 조율 코드는 모델 토큰 0, 에이전트들만 토큰 소비
```

> 핵심 통찰: **"모델은 판단을, 코드는 조율을 한다."** 조율이 컨텍스트를 안 먹기 때문에 수백 에이전트가 가능.
> 출처: [Introducing dynamic workflows](https://claude.com/blog/introducing-dynamic-workflows-in-claude-code), [Orchestrate subagents at scale](https://code.claude.com/docs/en/workflows)

---

## 2-2. 실행 흐름과 형태(shape)

```
1. 분해(plan)     : 요청을 독립 서브태스크로 쪼갬, 병렬/의존 관계 판별
2. 스크립트 작성   : 서브에이전트 생성·수명관리·결과수집·에러처리 담은 .js 작성
3. 백그라운드 실행 : 세션은 계속 응답 가능(다른 작업 가능)
4. 교차 검증      : 일부는 문제를 풀고, 일부는 그 결과를 반박 → 수렴할 때까지 반복
```

**일반화되는 형태:** `fan out → reduce → synthesize`
**재사용 품질 패턴:** adversarial verify(반박 검증) · diverse lenses(다른 관점) · judge panel(심사단) · loop-until-dry(반박이 마를 때까지)

> 한계: **동시 최대 16개, 1회 실행 누적 최대 1,000개** 에이전트. 출처: [code.claude.com/docs/en/workflows](https://code.claude.com/docs/en/workflows)

---

## 2-3. 트리거 방법 (4가지)

| 방법 | 동작 | 비고 |
| --- | --- | --- |
| 프롬프트에 `workflow` 키워드 | 그 작업 1건만 워크플로우로 실행 | v2.1.160 이전의 리터럴 트리거 |
| 프롬프트에 `ultracode` 키워드 | 그 작업 1건만 워크플로우로 실행 | 세션 effort는 안 바뀜 |
| 자연어 "use a workflow / run a workflow" | 직접 요청으로 처리 | 두 버전 모두 동작 |
| `/effort ultracode` (세션 설정) | xhigh + **모든 substantive 작업 자동 오케스트레이션** | 세션 한정, 새 세션이면 리셋 |

```bash
# 한 작업만 워크플로우로
ultracode: src/routes/ 아래 모든 API 엔드포인트의 인증 누락을 감사해줘

# 세션 전체를 자동 오케스트레이션 모드로
/effort ultracode
# 루틴 작업으로 돌아갈 때
/effort high
```

> ⚠️ **한국어 학습자 주의:** 트리거 키워드는 **영문 토큰 `workflow`/`ultracode`** 가 강조(highlight)된다. "워크플로우로 해줘" 같은 한글만으로는 키워드 강조가 안 될 수 있으니, 한 건 실행은 영문 키워드 또는 `/effort ultracode`를 권장. 잘못 트리거되면 macOS `Option+W` / Win·Linux `Alt+W`로 해제.

---

## 2-4. ultracode vs ultrathink vs xhigh (혼동 주의)

| 용어 | 정체 | 범위 | 워크플로우 발동? |
| --- | --- | --- | --- |
| **ultracode** | Claude Code **세션 설정** | 세션 전체(리셋됨) | ✅ 자동 오케스트레이션 |
| **xhigh** | 모델 추론 강도 레벨 | 지속(low~xhigh) | ❌ |
| **ultrathink** | **1턴** 프롬프트 키워드 | 그 한 응답만 | ❌ 추론만 강화 |

> "think / think hard / think more"는 특수 동작이 없다(그냥 텍스트). 한 턴만 더 깊게 생각시키려면 `ultrathink`.
> 출처: [Ultracode 설명](https://claudefa.st/blog/guide/development/ultracode)

---

## 2-5. 플랜·권한·관리·끄기

- **플랜:** Max·Team 기본 ON / Pro는 `/config`에서 활성화 / Enterprise는 관리자 승인. API·Bedrock·Vertex·Foundry 지원.
- **번들 워크플로우:** `/deep-research` (웹 검색 fan-out → 교차검증 → 주장 투표 → 검증 통과한 주장만 cited 리포트)
- **관리:** `/workflows` (실행/완료 목록, 각 단계(phase), 완료 에이전트 수)
- **저장:** `.claude/workflows/` 또는 `~/.claude/workflows/` (재사용 가치 있는 것만 커맨드로 저장)
- **권한 특이점:** 워크플로우 서브에이전트는 세션 권한모드와 무관하게 **acceptEdits 모드**로 동작 → **파일 편집이 자동 승인**됨(첫 대규모 실행 전 인지 필수)
- **끄기:** `CLAUDE_CODE_DISABLE_WORKFLOWS=1` 또는 managed settings `"disableWorkflows": true`

---

## 2-6. 언제 쓰나 / 언제 쓰지 말까

| 쓴다 (✅) — 한 컨텍스트가 못 담는 규모/검증 | 쓰지 않는다 (❌) |
| --- | --- |
| 코드베이스 전체 버그 헌트·보안 감사 | 단일 파일·소규모 작업(오버헤드 손해) |
| 대규모 마이그레이션(프레임워크/언어 포팅, 수천 파일) | 단계가 강하게 의존하는 순차 추론 |
| "틀리면 손해 큰" 작업 — 독립 시도 + 반박 검증 | 토큰 예산이 빠듯할 때 |
| 같은 변환을 수백 파일·레코드에 반복(batch) | 범위가 작은데 ultracode 무분별 사용(요금 폭증 1순위) |

> 판단 기준 한 줄: **"이 작업이 정말 더 많은 연산을 필요로 하나?"** 대부분의 일상 코딩은 5명 리뷰어 패널이 필요 없다.

---

## 2-7. 예제 프롬프트 — 상황별

**① 전 코드베이스 보안 감사 (fan-out + 검증)**
```
workflow: 이 코드베이스의 모든 인증 경로를 BOLA(객체 수준 인가 누락)
관점에서 감사해줘. 파일별로 에이전트를 띄우고, 발견 사항은 독립 검증 후
심각도순으로 정리해줘.
```

**② 대규모 마이그레이션**
```
ultracode: 1,200개 파일을 CommonJS에서 ESM으로 마이그레이션해줘.
각 파일 변환 후 해당 테스트를 돌리고, 실패는 보고만 하고 임의 수정은 하지 마.
```

**③ 안전 캘리브레이션 먼저 (강력 권장)**
```
workflow: src/api/ 디렉터리에 한정해서 인증 경로만 감사해줘.
# 첫 실행은 좁게 → /workflows로 단계·에이전트 수·토큰을 확인 → 범위 확대
```

---

## 2-8. 예제 — 번들 워크플로우 체험

```
/deep-research Node.js 권한 모델은 v20과 v22 사이에 무엇이 바뀌었나?
```

- 여러 각도로 검색을 분산 → 출처 교차 검증 → 각 주장에 투표 → **검증 통과 못 한 주장은 제거**한 cited 리포트 반환
- 내 코드에 워크플로우를 쓰기 전, **verify-then-converge(검증 후 수렴) 루프를 안전하게 체감**하는 용도로 적합

> 실무 팁: 첫 실행은 항상 `/deep-research`나 좁은 범위로 "감"을 잡은 뒤, 사용량 대시보드를 확인하고 본 작업에 투입.

---

## 2-9. 비용 안전장치 (Anthropic이 3번 반복 경고)

1. **좁게 시작**하라 — 전 모노레포에 바로 돌리지 말고 한 디렉터리부터
2. **승인 카드의 Once로 단계 계획을 검토** — 작업 대비 단계가 과하면 Deny 후 범위를 좁혀 재요청
3. **첫 몇 회 실행 후 사용량 대시보드 확인** — 작업 유형별 비용 감 잡기
4. **타이트한 예산이면 ultracode 대신 좁은 타깃 프롬프트**

> 흔한 실패: "too clever" — 3-서브에이전트면 될 일을 7단계 파이프라인으로 만든다. 이때 중단하고 `"use at most 10 agents"`처럼 명시.
> Bun 포팅 사례(공개 보도): Jarred Sumner이 Zig→Rust로 약 75만 줄을 약 11일 만에, 기존 테스트 99.8% 통과로 이전 — Dynamic Workflows의 상한을 보여주는 사례로 회자. (수치는 공개 발표 기준, 강의 인용 시 "보도된 사례"로 표기)

---

# PART 3 — 멀티 세션 협업 (Agent Teams · Agent View · Worktree)

## 작업자끼리 직접 대화하거나, 내가 여러 세션을 동시에 돌릴 때

---

## 3-1. Agent Teams란? (vs 서브에이전트)

여러 Claude Code **세션**이 한 프로젝트에서 협업한다. 한 세션이 **팀 리드**로 작업을 분해·할당·종합하고, **팀원**들은 각자 독립 컨텍스트에서 일하며 **서로 직접 메시지**를 주고받는다.

| | 서브에이전트 | Agent Teams |
| --- | --- | --- |
| 통신 | 메인에만 보고 | **팀원끼리 직접(메일박스)** |
| 조율 | 메인이 중개 | 공유 작업목록 + 자율 협업 |
| 컨텍스트 | 격리 | 격리(각 1M), 메시지로 연결 |
| 비용 | 보통 | **가장 비쌈**(메시지마다 왕복) |

> 한 줄 구분: **서로 발견을 공유하고 서로의 가정을 반박해야 하면 Teams, 빠른 위임 후 보고면 서브에이전트.**
> 출처: [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams)

---

## 3-2. 활성화와 운용

```jsonc
// settings.json (또는 환경변수)
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
}
```

- **experimental · 기본 비활성**. 이 변수 없으면 팀이 구성되지 않는다.
- 자연어로 팀 생성: `이 모듈들을 병렬로 리팩터링할 팀원 3명으로 팀을 만들어줘`
- **팀원 개별 대화:** `Shift+Down`으로 팀원 순환. tmux/iTerm2에서는 split pane로 각 팀원 표시.
- **서브에이전트 정의 재사용:** `security-reviewer 타입으로 팀원을 띄워 auth 모듈을 감사해줘` — 역할을 한 번 정의해 위임·팀원 양쪽에서 사용.
- ⚠️ 팀원은 **worktree로 격리되지 않는다** → 파일을 겹치지 않게 **수동 분할**해야 한다. 서브에이전트 정의의 `skills`·`mcpServers` frontmatter는 팀원으로 실행될 때 **적용되지 않음**.

> 도입: Opus 4.6 릴리스와 함께 research preview. 알려진 제약: 세션 재개·작업 조율·종료 동작.

---

## 3-3. 언제 쓰나 / 언제 쓰지 말까 (Agent Teams)

| 쓴다 (✅) | 쓰지 않는다 (❌) |
| --- | --- |
| 프론트·백엔드·테스트가 **서로 의존**하며 교차 변경 | 순차 작업 |
| 한 팀원이 다른 팀원의 접근을 **반박**하길 원할 때 | 여러 작업자가 **같은 파일** 수정 |
| 리서치+아키텍처+구현이 한 작업에 섞일 때 | 단순 버그 픽스 |
| 높은 토큰 비용을 감수 가능 | 산출을 감독할 시간이 없을 때 |

**예제 프롬프트**
```
프론트엔드 리팩터, 그에 필요한 API 변경, 테스트 업데이트, 통합 PR 작성을
팀으로 진행하자. 각 팀원은 서로 다른 파일 집합을 소유하고,
계약(인터페이스/스키마)은 먼저 합의한 뒤 작업해.
```

> 통합 리스크 대비: 각 산출이 개별로는 맞아도 서로 안 맞을 수 있다 → **검증 팀원(validator)** 또는 통합 테스트를 마지막에 둬라(builder-validator 체인).

---

## 3-4. Agent View / 백그라운드 세션

서로 **무관한 작업 여러 개를 동시에** 돌리고 필요할 때만 확인하는 "멀티플렉싱"(조율 아님).

- `claude agents` — 모든 백그라운드 세션 대시보드(`Needs input` / `Working` / `Completed`)
- 던지기: 뷰 입력창 / 세션 안에서 `/bg` / 셸에서 `claude --bg`
- 백그라운드 세션은 **별도 supervisor 프로세스** → 터미널을 닫아도 살아있고 `claude --resume`로 재개
- 파일 편집 전 자동으로 `.claude/worktrees/` 아래 worktree로 이동 → 병렬 세션이 따로 씀
- ⚠️ 각 백그라운드 세션이 **독립적으로 쿼터 소비** → 많이 던지기 전 한도 확인

**예제 상황**
```
버그 수정 / PR 리뷰 / 플래키 테스트 조사를 각각 백그라운드로 던져두고,
입력이 필요할 때만 들어가서 처리한다.
```

> 출처: [Run agents in parallel](https://code.claude.com/docs/en/agents)

---

## 3-5. Worktree와 `/batch`

이 둘은 "에이전트를 돌리는 방식"이 아니라 **병렬 작업을 받쳐주는 도구**다.

- **Git Worktree:** 세션마다 별도 git 체크아웃 → 병렬 세션이 같은 파일을 안 건드림. *내가 직접 돌리는* 세션용. 서브에이전트 frontmatter에 `isolation: worktree`로 자동 격리 가능.
- **`/batch`:** 하나의 큰 변경을 **5~30개의 worktree 격리 서브에이전트**로 쪼개 각자 PR을 연다. **기계적 마이그레이션**(API 이름 변경·프레임워크 마이그레이션·repo 전체 타입 정리)에 적합. 모호한 제품 기능/아키텍처 작업에는 부적합.

```markdown
---
name: backend-builder
description: 백엔드 변경을 격리된 worktree에서 구현
tools: Read, Glob, Grep, Bash, Edit, Write
model: sonnet
isolation: worktree
---
오케스트레이터가 할당한 백엔드 디렉터리에서만 작업한다.
공유 스키마·마이그레이션·lockfile·루트 설정은 명시 할당이 없으면 수정 금지.
완료 전 대상 테스트를 돌리고, 변경 파일·테스트 결과·미해결 리스크를 보고한다.
```

> 운용 원칙: 가장 복잡한 메커니즘부터 시작하지 마라. **worktree 2개 또는 서브에이전트 2개**로 시작하고, **내 리뷰 속도가 따라올 때만** 동시성을 늘려라.

---

# 종합 — 무엇을 언제 고를까

---

## 4-1. 의사결정 3단 질문

```
Q1. 누가 조율하나?
    - 내가 각 대화에 머문다           → 직접 병렬 세션(+worktree)
    - 던져놓고 나중에 확인            → Agent View / 백그라운드
    - Claude가 한 무리를 지휘         → Agent Teams
    - 계획을 코드(스크립트)가 보유     → Dynamic Workflows

Q2. 작업자끼리 대화해야 하나?
    - 아니오, 보고만 받으면 됨        → 서브에이전트
    - 예, 서로 발견 공유·반박 필요     → Agent Teams

Q3. 같은 파일을 건드리나?
    - 예                            → worktree로 격리(또는 파일 분할)
```

> 출처: [Run agents in parallel](https://code.claude.com/docs/en/agents)

---

## 4-2. 역할별 빠른 처방

| 상황 | 권장 | 이유 |
| --- | --- | --- |
| 구독제 솔로 개발자, 대부분의 위임 | **서브에이전트** | 가장 싼 기본 단위, 대부분 커버 |
| 500~수천 파일 마이그레이션 | **Dynamic Workflows** | 1,000 에이전트 상한이 비용 천장, 저장해 재사용 |
| 서로 무관한 작업 여러 개 동시 | **Agent View + 백그라운드** | 조율이 아니라 멀티플렉싱 |
| 의존성 있는 교차 도메인 변경 | **Agent Teams** | 팀원 간 직접 통신·합의 필요 |
| 기계적·규칙 명확한 대량 변경 | **`/batch`** | worktree 격리 + 자동 PR |

> **단일 세션이 정답인 경우가 생각보다 많다.** 순차 작업·같은 파일 수정·의존성 많은 작업은 단일 세션/서브에이전트가 더 효과적. 병렬은 작업이 **독립 조각으로 쪼개질 때만** 이득.

---

## 4-3. 비용·토큰 가이드 (공통)

- 병렬 = 토큰 병렬 소비. 3-에이전트 팀은 레이트리밋을 **약 3배** 빨리 소진(웹 자료).
- **모델 티어링:** 오케스트레이터 Opus / 워커 Sonnet / 포매팅 Haiku → 전부 Opus 대비 **약 40% 절감**(웹 자료, 대략치).
- 별도 과금은 없지만 **모든 실행이 플랜 사용량·레이트리밋에 합산**된다.
- 끝난 세션은 정지: 세션 `/stop`, Agent View `Ctrl+X`. 유휴 Opus 세션도 쿼터를 먹는다.
- 서브에이전트 모델 상한을 **repo에 커밋**(frontmatter `model:`)해 팀원이 비싼 모델로 기본값 두는 것을 방지.

> 상세 비용 기법은 LEVEL 6(토큰 절약)과 연계. 이 레벨은 "멀티 에이전트의 비용 구조"만 다룬다.

---

## 4-4. 안티패턴 종합

- **기본값으로 무거운 옵션 선택** — 모든 게 Agent Teams일 필요 없다. 작업에 모드를 맞춰라.
- **범위 미설정 ultracode** — 요금 폭증 1순위. 좁게 시작.
- **공유 계약을 각자 발명** — 여러 에이전트가 API/인터페이스/스키마를 따로 만들면 통합 실패. **계약 먼저 합의.**
- **리뷰 못 따라가는 동시성** — 띄운 만큼 검토 못 하면 품질이 무너진다.
- **의존 작업의 병렬화** — 동기화 복잡성만 늘고 속도 이득 없음.

---

## 핵심 참고 자료 (검증 링크)

### Anthropic 공식 문서
- 병렬 실행 비교: https://code.claude.com/docs/en/agents
- 서브에이전트: https://code.claude.com/docs/en/sub-agents
- Dynamic Workflows: https://code.claude.com/docs/en/workflows
- Agent Teams: https://code.claude.com/docs/en/agent-teams
- Agent SDK 서브에이전트: https://platform.claude.com/docs/en/agent-sdk/subagents

### Anthropic 공식 블로그
- Dynamic Workflows 발표: https://claude.com/blog/introducing-dynamic-workflows-in-claude-code
- 서브에이전트 사용법: https://claude.com/blog/subagents-in-claude-code

> ⚠️ 녹화 전 재확인 항목: Dynamic Workflows·Agent View·Agent Teams는 **research preview/experimental**로 사양(상한·트리거·플랜 범위·버전)이 바뀔 수 있다. 강의 녹화 시점에 위 공식 문서를 다시 확인할 것.

---

## 할루시네이션 / 출처 검증 표

| 사실 | 상태 | 출처 |
| --- | --- | --- |
| 서브에이전트 = `.claude/agents/*.md`, `/agents`, 빌트인 Explore·Plan | ✅ 공식 | code.claude.com/docs/en/sub-agents |
| 서브에이전트는 자기 서브에이전트 못 띄움(`Agent` 미부여) | ✅ 공식 | platform.claude.com/.../agent-sdk/subagents |
| Dynamic Workflows: research preview, 2026-05-28, v2.1.154+ | ✅ 공식 | code.claude.com/docs/en/workflows · claude.com/blog |
| 동시 16 / 누적 1,000 에이전트 상한 | ✅ 공식 | code.claude.com/docs/en/workflows |
| 트리거 `workflow`/`ultracode`/자연어, v2.1.160 이전 키워드는 `workflow` | ✅ 공식 | code.claude.com/docs/en/workflows |
| 워크플로우 서브에이전트는 acceptEdits로 자동 편집 승인 | ✅ 공식(문서 기반 2차 정리) | developersdigest(문서 인용) |
| ultracode = 세션 설정(xhigh+자동 오케스트레이션), 세션 한정 | ✅ 공식 | code.claude.com/docs/en/workflows |
| Agent Teams = `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, experimental | ✅ 공식 | code.claude.com/docs/en/agent-teams |
| Agent Teams는 worktree 격리 안 함(수동 분할) | ✅ 공식 | code.claude.com/docs/en/agent-teams |
| Agent View `claude agents`, `/bg`, `claude --bg`, `.claude/worktrees/` | ✅ 공식 | code.claude.com/docs/en/agents |
| `/batch` = 5~30개 worktree 서브에이전트, 각 PR | ✅ 공식 | code.claude.com/docs/en/agents |
| 멀티 에이전트 ≈ 단일 대비 ~7x 토큰 | ⚠️ 2차/일반치 | nimbalyst (강의 시 "대략치" 표기) |
| 모델 티어링 ~40% 절감 | ⚠️ 2차/대략치 | cloudzero |
| Agent Teams Opus 4.6 도입 / v2.1.32 | ⚠️ 2차(공식 발표 기반) | FlorianBruniaux 가이드 — 공식 재확인 권장 |
| Agent View v2.1.139+ | ⚠️ 2차 | cloudzero — 공식 재확인 권장 |
| Bun 포팅(Zig→Rust, ~75만 줄, ~11일, 99.8% 테스트) | ⚠️ 공개 보도 사례 | claude.com/blog 외 다수 — "보도된 사례"로 인용 |

> ✅ = Anthropic 공식 문서/블로그 직접 확인 · ⚠️ = 2차 출처 또는 대략치(녹화 전 재검증 권장)
