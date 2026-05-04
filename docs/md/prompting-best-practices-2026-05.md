# Claude Prompting Best Practices — 공식 문서 분석

**원문**: Anthropic, *Prompting best practices* (Claude API Docs)
**스냅샷 일자**: 2026-05-01
**대상 모델**: Claude Opus 4.7 / Opus 4.6 / Sonnet 4.6 / Haiku 4.5
**분석 대상**: `docs/resource/Prompting best practices - Claude API Docs (2026. 5. 1. ...).html`

---

## TL;DR — 한 줄 요약

> "프롬프트 엔지니어링은 더 이상 '잘 시키는 법'이 아니라, **모델의 자율성·노력 수준·출력 형식을 보정(calibration)** 하는 일이다."

핵심 변화는 세 가지다:
1. **`effort` 파라미터**가 verbosity·thinking·tool 사용량을 통합 제어한다 (`max`/`xhigh`/`high`/`medium`/`low`)
2. **Adaptive Thinking** 이 `extended thinking + budget_tokens` 를 대체한다 (`thinking: {type: "adaptive"}`)
3. **Prefilled response**(마지막 assistant 턴 prefill)는 **deprecated** — Mythos Preview에서 400 에러
4. Opus 4.7은 **literal instruction following**(문자 그대로 해석)이 강해져, 과거의 "CRITICAL/MUST" 강조 프롬프트가 오히려 역효과

---

## 1. 주요 변경사항 (Migration-Critical)

### 1.1 Effort 파라미터 — 새 통합 다이얼

| 레벨 | 용도 | 비고 |
|---|---|---|
| `max` | 인텔리전스 극한 — 어려운 작업에서만 | **새로 추가**, overthinking 위험 |
| `xhigh` | **코딩·에이전틱 기본값** | **새로 추가** (4.7) |
| `high` | 인텔리전스 민감 작업 최소 권장값 | |
| `medium` | 비용 민감 워크로드 | |
| `low` | 짧고 범위 좁은 작업, 레이턴시 우선 | 4.7는 엄격하게 준수 — under-thinking 주의 |

- Opus 4.7은 `low`/`medium`에서 **요청 범위만 처리**(이전처럼 "above and beyond"하지 않음)
- 얕은 추론이 보이면 프롬프트 우회보다 **effort 상향**이 우선
- `max`/`xhigh` 사용 시 `max_tokens` **64k 이상** 권장 (서브에이전트·툴 호출 공간 확보)

### 1.2 Adaptive Thinking → 표준

```python
# Before (deprecated on 4.6+)
thinking={"type": "enabled", "budget_tokens": 32000}

# After
thinking={"type": "adaptive"}
output_config={"effort": "high"}  # max/xhigh/high/medium/low
```

- 모델이 **쿼리 복잡도 + effort**를 기반으로 thinking 양을 동적 조정
- 내부 평가에서 extended thinking 대비 일관되게 우수
- `budget_tokens`는 4.6에서 여전히 동작하지만 deprecated, 향후 제거 예정

### 1.3 Prefilled Response 폐기

- 4.6+ 모델에서 **마지막 assistant 턴 prefill 미지원**, Mythos Preview는 400 에러
- 대안: 시스템 프롬프트로 출력 형식 제어, XML 태그, "preamble 제거" 명시 지시

### 1.4 Sampling Parameters 제거

- 4.6에서 일부 샘플링 파라미터(`temperature`로 디자인 다양성 만드는 패턴 등) 제거
- 다양성이 필요하면 **"Propose 4 distinct directions before building"** 패턴 사용

### 1.5 Opus 4.7 행동 변화 요약

| 변화 | 영향 | 대응 |
|---|---|---|
| 응답 길이 자동 보정 | 고정 verbosity 가정 깨짐 | "concise·focused" 명시 |
| **Literal instruction following** | 일반화 안 함, 추론 안 함 | 적용 범위를 명시 ("every section, not just the first") |
| Tool 사용 감소, reasoning 증가 | 검색·도구 부족 | effort↑, "use tool when…" 명시 |
| User-facing 진척 보고 자동화 | 강제 status 메시지 스캐폴딩 불필요 | "After every 3 tool calls, summarize" 같은 지시 제거 |
| 톤 — 더 직설적, validation-forward 감소 | 따뜻한 보이스 필요 시 어긋남 | "warm, collaborative tone" 명시 |
| 서브에이전트 spawn 감소 | 병렬 처리 누락 | "fanning out across items" 시 명시 |
| Design house style — 크림/세리프/테라코타 | 대시보드·핀테크에 안 맞음 | **구체적 대안 spec** 또는 **"Propose options"** 패턴 |
| 코드 리뷰 harness recall 저하 | 옛 프롬프트의 "only high severity" 충실 준수 | "Report every issue including uncertain" 명시 |

---

## 2. 핵심 특징 (Conceptual Pillars)

### 2.1 General Principles — 6대 원칙

1. **Be clear and direct** — "신입 직원에게 설명하듯". Golden rule: 동료에게 보여줬을 때 모호하면 Claude도 모호함.
2. **Add context** — *왜* 이렇게 해야 하는지를 알려주면 일반화가 향상
3. **Use examples (few-shot)** — 3~5개, **Relevant·Diverse·Structured** (`<example>`/`<examples>`)
4. **XML tags 구조화** — `<instructions>`/`<context>`/`<input>` 등 일관·서술적 태그명, 자연 계층 시 중첩
5. **Give Claude a role** — 시스템 프롬프트의 한 줄 역할 정의도 효과 큼
6. **Long context (20k+ tokens)** — **장문 데이터를 위에**, 쿼리·지시·예제는 아래. 응답 품질 최대 30% 향상. 답변 전 인용문 추출 요청.

### 2.2 Output 제어 — 4 레버

- **Tell what to do, not what not to do** — 부정 지시 → 긍정 지시
- **XML format indicators** — `<smoothly_flowing_prose_paragraphs>` 같은 태그로 출력 영역 명시
- **Match prompt style to desired output** — 프롬프트에서 마크다운 빼면 출력에서도 마크다운 줄어듦
- **Detailed prompts for explicit formatting** — `<avoid_excessive_markdown_and_bullet_points>` 같이 상세 가이드

### 2.3 Tool Use

- 옛 모델용 "CRITICAL: You MUST" → 4.6+에서는 **과트리거**. "Use this tool when…"로 톤 다운
- **Parallel tool calling 기본 우수** — 의존성 없으면 병렬, 의존성 있으면 순차. ~100% 부스트 가능
- **Default to action vs Conservative** — 시스템 프롬프트로 명시적 토글
  - Action: `<default_to_action>...infer most useful action and proceed...</default_to_action>`
  - Conservative: `<do_not_act_before_instructions>...default to information, not action...</do_not_act_before_instructions>`

### 2.4 Thinking & Reasoning

- **General > Prescriptive** — "think thoroughly"가 손수 만든 step 리스트보다 자주 우수
- **Multishot examples with `<thinking>` tags** — few-shot에 thinking 패턴 보여주면 일반화됨
- **Self-check 추가** — "Before you finish, verify against [test criteria]" — 코딩·수학에서 효과적
- **Manual CoT as fallback** — thinking off일 때 `<thinking>`/`<answer>` 태그로 구조화
- **"think" 단어 민감성** — Opus 4.5는 thinking off일 때 "think"에 특히 민감. 대안: "consider", "evaluate", "reason through"

### 2.5 Agentic Systems — Long-Horizon

| 패턴 | 설명 |
|---|---|
| **Context awareness** | 4.5+ 모델은 남은 토큰 예산 추적 → 마무리 전조 행동. compact·외부 저장 prompt로 보정 |
| **First-context vs Future-contexts** | 첫 윈도우는 셋업(테스트·스크립트), 이후는 todo 이터레이션 |
| **Tests in structured format** | `tests.json` 등으로 tracking. "테스트 삭제·수정은 unacceptable" 명시 |
| **Setup scripts (`init.sh`)** | 재시작 시 반복 작업 방지 |
| **Fresh start vs Compaction** | 컨텍스트 비울 때 새 윈도우가 종종 더 효과적. `pwd` → `progress.txt`/`tests.json`/`git log` 검토 → 통합 테스트 |
| **Verification tools** | Playwright MCP, computer use로 자가 검증 |
| **Git for state** | 4.6 모델은 git 활용에 특히 능숙 |

### 2.6 균형 가이드 — Overengineering 방지

- **Reversibility-aware** — 파괴적 작업(`rm -rf`, `git push --force`, DB drop) 전 확인 요청
- **Anti-laziness 프롬프트 다이얼 다운** — 옛 모델용 "thorough" 강조는 4.6에서 과트리거
- **Test-passing 집착 방지** — "Tests verify, not define. No hard-coding for test inputs"
- **Hallucination 최소화** — `<investigate_before_answering>`: "Never speculate about code you haven't opened"
- **File creation 줄이기** — temp 파일 정리 명시

### 2.7 Subagent Orchestration

- 4.6+는 명시 없이도 자연스럽게 위임. **단 4.6은 과사용 경향** (단순 grep도 서브에이전트로 위임)
- 가이드:
  - **Use**: 병렬·독립 컨텍스트·shared state 불필요한 작업
  - **Don't**: 단일 파일 편집, 순차 작업, 컨텍스트 공유 필요

---

## 3. 활용 방법 — 시나리오별 레시피

### 3.1 코딩 에이전트 (markflow급 자율 코딩)

```
- effort: xhigh (또는 high)
- thinking: adaptive
- max_tokens: 64k
- 시스템 프롬프트 포함:
  * <use_parallel_tool_calls>...</use_parallel_tool_calls>
  * <investigate_before_answering>...</investigate_before_answering>
  * Reversibility 가이드 (push·rm·drop 전 확인)
  * Overengineering 방지 (Scope·Documentation·Defensive·Abstraction)
- 사용자 첫 턴에 task·intent·constraints 충실히 명세 → 이후 인터랙션 최소화
```

### 3.2 인터랙티브 코딩 IDE

- 사용자 턴 사이에 추가 reasoning 발생 → 토큰 더 씀
- **`auto mode`** 같은 기능으로 user prompt 횟수 줄이는 게 비용·성능 모두 유리
- 첫 턴 specification 강조

### 3.3 코드 리뷰 harness

- **finding 단계는 coverage 우선**, filtering 별도 단계로 분리

```
Report every issue you find, including ones you are uncertain about
or consider low-severity. Do not filter for importance or confidence
at this stage — a separate verification step will do that.
For each finding, include confidence level and estimated severity.
```

- 단일 패스로 self-filter할 거면 **정량 기준** 사용 ("could cause incorrect behavior, test failure, misleading result")

### 3.4 장문 분석·검색 (20k+ context)

```xml
<documents>
  <document index="1">
    <source>...</source>
    <document_content>... long doc ...</document_content>
  </document>
</documents>

<instructions>
  Quote relevant parts first, then answer.
</instructions>

<question>...</question>
```

### 3.5 디자인·프론트엔드 — house style 회피

**A) 구체적 spec 제시**

```
Color palette: #E9ECEC, #C9D2D4, #8C9A9E, #44545B, #11171B
Typography: square angular sans-serif, wider letter spacing
Corners: 4px radius across cards/buttons/inputs
Layout: horizontal sections, centered max-width container
Motion: transition: all 160ms ease out (subtle)
```

**B) 옵션 제안 패턴**

```
Before building, propose 4 distinct visual directions
(each as: bg hex / accent hex / typeface — one-line rationale).
Ask user to pick one, then implement only that direction.
```

**C) Anti-slop 시스템 프롬프트**

```xml
<frontend_aesthetics>
NEVER use generic AI-generated aesthetics like overused fonts (Inter, Roboto),
cliched color schemes (purple gradients on white), predictable layouts,
cookie-cutter design. Use unique fonts, cohesive colors, animations.
</frontend_aesthetics>
```

### 3.6 Long-horizon 에이전트 (멀티 컨텍스트 윈도우)

```
1. 첫 컨텍스트: tests.json + init.sh + progress.txt 셋업
2. 워크플로우 프롬프트:
   "Your context will be compacted automatically. Save progress to memory
    before refresh. Do not stop early. Continue working systematically."
3. 후속 컨텍스트:
   "Call pwd. Read progress.txt, tests.json, git log.
    Run integration test before new features."
```

### 3.7 Verbosity·Tone 보정 (Opus 4.7)

| 원하는 결과 | 추가 지시 |
|---|---|
| 더 짧게 | `Provide concise, focused responses. Skip non-essential context.` |
| 더 따뜻하게 | `Use a warm, collaborative tone. Acknowledge user's framing first.` |
| 진척 보고 | `After tool use, provide a quick summary.` |
| 더 적게 thinking | `Thinking adds latency, only use when meaningfully improves quality.` |
| 더 자주 tool 사용 | effort↑ + 도구별 사용 시점 명시 |
| 평문 수식 (LaTeX 회피) | `Format in plain text only. Use "/" for division, "*" for multiplication, "^" for exponents.` |

### 3.8 Computer Use

- 해상도: **1080p가 성능·비용 균형** (최대 2576px / 3.75MP까지 지원)
- 비용 민감: 720p / 1366×768
- **Crop tool/skill** 추가 시 이미지 평가에서 일관된 uplift

---

## 4. 마이그레이션 체크리스트

### 4.1 기존 코드 → 4.6/4.7

- [ ] `temperature`로 다양성 만들던 패턴 → "Propose options" 프롬프트로 교체
- [ ] `extended thinking + budget_tokens` → `adaptive` + `effort`로 교체
- [ ] 마지막 assistant 턴 prefill → system prompt + XML 태그로 교체
- [ ] "CRITICAL/MUST" 강조 → 일반 "Use this when…"로 톤 다운
- [ ] "If in doubt, use [tool]" → "Use [tool] when it would enhance understanding…"
- [ ] "After every N tool calls, summarize" 강제 status 스캐폴딩 → 제거 (자동 처리됨)
- [ ] 코드 리뷰 harness — "only high-severity" → "Report every issue including uncertain"
- [ ] 디자인 프롬프트 — "clean and minimal" → 구체적 색·폰트·여백 spec

### 4.2 Sonnet 4.5 → 4.6 특이사항

- 4.6은 `effort: high`가 **기본값** (4.5엔 effort 없음). 명시 안 하면 레이턴시 증가
- 권장: 일반 `medium`, 대량/저레이턴시 `low`, 코딩 에이전트 `high`/`xhigh`
- **`max_tokens: 64k`** 권장 (medium/high effort에서 thinking 공간)
- 가장 어려운·긴 호라이즌 작업은 **여전히 Opus 4.7** 선택

---

## 5. 우리 자료 (Level 3) 반영 포인트

이 가이드와 `docs/md/level3-chapter3.md`·`docs/html/report/claude-code-level3-chapter3.html` 비교 시 보강 후보:

1. **`effort` 5단계 표** — 현재 §3.3에 `/effort xhigh` 1줄만 있음. 위 1.1 표를 §3.3에 추가하면 강의 가치↑
2. **Adaptive vs Extended Thinking 마이그레이션 코드** — §3.1 또는 §3.6 부근에 Python 비교 예시 추가
3. **Literal instruction following** — Opus 4.7 행동 변화는 §3.1.1(프롬프트 vs 컨텍스트) 직후 callout으로 적합
4. **Prefilled response deprecation** — 추가 가치 적음, 패스
5. **Anti-AI-slop frontend 가이드** — 강의 범위 외, 패스
6. **Reversibility / 균형 가이드** — §3.5(Hooks)와 자연 연결. 가드레일 훅 + 시스템 프롬프트 reversibility callout 짝
7. **Long context 30% 향상** — §3.1.2(Context Rot) 또는 §3.1.6(JIT)에 1줄 callout 가치 큼
8. **`<investigate_before_answering>`** — §3.7 실습(코드 리뷰 커맨드) 보강에 직접 활용

---

## 6. 출처 — 원문 섹션 매핑

| 섹션 | 원문 헤딩 |
|---|---|
| 1.1, 1.5 | *Prompting Claude Opus 4.7* (Response length, Effort, Tool triggering, Literal instruction, Tone, Subagent, Design, Coding, Code review, Computer use) |
| 2.1 | *General principles* |
| 2.2 | *Output and formatting* |
| 2.3 | *Tool use* |
| 2.4 | *Thinking and reasoning* |
| 2.5, 2.6, 2.7 | *Agentic systems* |
| 4.1, 4.2 | *Migration considerations* |

---

**검증 일자**: 2026-05-01 / **모델 버전 기준**: Claude Opus 4.7 출시 시점
