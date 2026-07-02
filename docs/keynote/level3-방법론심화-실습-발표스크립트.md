# LEVEL 3 — TDD · SDD 워크플로우 · 발표(동영상) 스크립트

> 영상 타이틀: **방법론 심화 ② — 증강코딩 · TDD · SDD(SpecKit) · 프로젝트 구조**
> 대상: LEVEL 1·2 수료 (클로드 코드 기본기 + 협업 원칙 + CLAUDE.md 작성 가능자)
> 분량: 슬라이드 53장 / 예상 러닝타임 50~65분
> 작성 원칙: **간략·핵심 위주**. 처음 나오는 용어는 `**풀 용어(약어)** = 뜻` 으로 그 자리에서 풀이.
>
> **읽는 법** — `>` 인용 블록이 실제 내레이션, `(화면)` 은 연출 지시, `⏱` 는 목표 시간입니다.

---

## ⓿ 오프닝

### S1. 커버 — LEVEL 3: TDD ・ SDD 워크플로우 ⏱ ~30초
> 『클로드 코드 마스터』의 코드빌런입니다. 이번은 **Level 3, '방법론 심화와 실습'** 입니다. Level 2에서 협업의 원칙과 CLAUDE.md 작성을 배웠다면, 이번엔 그 위에서 **AI 출력을 매번 같은 품질로 재현 가능하게 만드는 방법론** — 컨텍스트 엔지니어링, 증강코딩, TDD, SDD를 차례로 배웁니다.

### S2. 인트로 — 무엇을·왜·어떻게 ⏱ ~60초
> **왜** 배우나. 원칙만으로는 AI가 매번 다르게 구현하고 **테스트를 건너뜁니다**. TDD·SDD 같은 방법론과 프로젝트 표준(CLAUDE.md · AGENTS.md · Git)이 있어야 AI 출력을 **검증·재현 가능**하게 만들 수 있습니다.
> **무엇을** 배우나. 여섯 갈래입니다. ①증강코딩(Make it work·right·fast) ②TDD — Red·Green·Refactor·Hook ③SDD·SpecKit — 명세 주도 개발 
> **체크포인트 한 줄**: "AI 협업을 **'운'**이 아니라 **'시스템'**으로 — 검증·재현 가능한 출력으로 만드는 것이 핵심."

### S3. 목차 ⏱ ~15초
> 차례입니다. 3.1 프롬프트·컨텍스트 엔지니어링 → 3.2 증강코딩 → 3.3 TDD → 3.4 SDD·SpecKit → 3.5 프로젝트 구조 → 3.7 실습. 지금 위치만 잡아 두세요.

### S4. 미리 설치할 플러그인 3종 ⏱ ~45초
> 실습 시작 전 사전 도구 셋입니다. ①**caveman** = 토큰을 아끼는 압축 모드. ②**statusline** = 현재 컨텍스트·작업 상태를 한눈에 보는 상태 표시. ③**LSP**(Language Server Protocol) = 코드를 정확히 탐색하는 언어 서버.
> 이 셋이 없으면 강의 후반의 비용·토큰 절약 효과가 잘 안 보입니다. 영상 멈추고 설치 권장합니다.

---

## PART 01 — 프롬프트 & 컨텍스트 엔지니어링

### S5. 섹션 표지 — 3.1 Prompt & Context Engineering ⏱ ~10초
> "프롬프트 엔지니어링"에서 **"컨텍스트 엔지니어링"** 으로 — 모델에 무엇을 주느냐가 결과물의 품질을 좌우합니다.
이 챕터에서는 "AI 협업을 **'운'**이 아니라 **'시스템'**으로 — 검증·재현 가능한 출력으로 만드는 것이 핵심." 이기 때문에 프롬프트 작성을 기본으로 컨텍스트를 어떤식으로  주입해줘야 하는가
이를 바탕으로 시스템화 할 수 있는 방안은 무었인가를 다룰거구요, 그 워크플로우에 TDD, SDD 방법론을 설명할 예정입니다.
그 전에 반드시 알아야 할 내용으로 프롬프트, 컨텍스트를 먼저 설명하고 넘어가도록 하겠습니다. 


### S6. 3.1.1 FOUNDATION — 프롬프트 vs 컨텍스트 ⏱ ~70초
> 두 기술은 던지는 질문이 다릅니다.
> `**프롬프트 엔지니어링(Prompt Engineering)** = 한 번의 요청 문장을 잘 다듬는 기술`. "어떻게 **물을까**?"
> `**컨텍스트 엔지니어링(Context Engineering)** = 매 추론마다 모델에 입력되는 토큰 상태 전체를 설계하는 기술`. "AI가 추론할 때 **무엇을 보게 할까**?"
> 전자는 단일 턴 메시지 1개, 후자는 시스템 프롬프트 + CLAUDE.md + 도구 + 파일 + 대화 이력 전체.
> Anthropic은 컨텍스트 엔지니어링을 **"프롬프트 엔지니어링의 자연스러운 다음 단계"** 라고 정의합니다. 대체가 아니라 **확장**입니다.

### S7. 3.1.1 EXAMPLE A — 프롬프트만 ⏱ ~50초
> (화면) 빈 세션에서 회원가입 API 요청.
> CLAUDE.md 없고 관련 파일 미로드 상태입니다. 잘 쓴 프롬프트지만 — **스택 · 규칙 · 검증 · 에러 형식을 메시지에 다 욱여넣어야** 합니다. 다음 작업("로그인 만들어줘")에서도 **또 처음부터** 붙여야 해요. **요청 1개 = 프롬프트 1개의 품질**이 전부입니다.

### S8. 3.1.1 EXAMPLE B — 환경 설계 ⏱ ~50초
> (화면) 좌측: CLAUDE.md + @멘션, 우측 하단: 한 줄 프롬프트.
> 환경을 미리 깔아두면 — Tech Stack·Rules는 CLAUDE.md에 한 번, 참조 파일은 `@app/api/auth/login/route.ts` 로 적시 로드. 그러면 사용자 발화는 **한 줄로 끝**: "로그인이랑 같은 패턴으로 회원가입 만들어줘". 환경이 정보를 대신 들고 있고, **다음 작업에도 그대로 재사용**됩니다.

### S9. 3.1.1 PARADIGM — Prompt → Context → Harness ⏱ ~60초
> 시대별 패러다임 이동입니다.
> ① **Prompt (2022–2024)** — "어떤 말을 해야 하나?" 응답 품질은 주관적, 측정 어려움.
> ② **Context (2025)** — "어떤 정보를 넣어야 하나?" 측정값은 `**KV-cache hit rate** = Key-Value 캐시 적중률` 같은 기술 메트릭.
> ③ **Harness (2026~)** — "어떤 시스템을 만들어야 하나?" 측정값은 **태스크 완료율** + **$/태스크**. 예: 30일간 PR 자동 생성 100건 → 78건 사람 개입 없이 머지, 평균 비용 $0.42/PR. 이게 비즈니스 의미가 곧 메트릭입니다.
> 각 시대는 이전을 **대체하지 않고 포함**합니다. Level 5 프로젝트에서 하네스를 직접 적용해봅니다.

### S10. 3.1.2 CONTEXT ROT — 컨텍스트 부패 ⏱ ~50초
> 핵심 현상. `**Context Rot** = 컨텍스트(입력)가 길어질수록 LLM의 응답 품질이 점진적으로 떨어지는 현상`. Chroma Research가 측정한 결과예요.
> 원인은 Transformer의 `**Self-Attention** = 입력 토큰 모두가 서로 관계를 계산하는 메커니즘 · O(n²) 비용`. 토큰 2배 → 처리 관계 4배. "더 많이 넣으면 더 좋다"는 틀렸고, **"필요한 것만, 적시에"** 가 정답입니다.

### S11. 3.1.2 COUNTERMEASURES — 6원칙 BAD vs GOOD ⏱ ~70초
> Context Rot 회피 6원칙을 BAD/GOOD으로 나란히 보여드립니다.
> ① **필요한 것만 넣기** — "혹시 모르니" 다 첨부 ✗ / 지금 결정에 필요한 것만 ○.
> ② **룰은 한 번 적어두고 재사용** — 매 요청 반복 ✗ / CLAUDE.md에 한 번 ○.
> ③ **파일 통째 X, 부분만 ○** — 200줄 복붙 ✗ / "src/auth/ 봐줘" → 모델이 핵심 25줄만 자동 적재 ○.
> ④ **옛 작업 흔적은 압축** — 100턴 그대로 안고 진행 ✗ / **/compact**로 핵심 5줄만 ○.
> ⑤ **새 작업 = 새 세션** — 한 세션에 백엔드·프론트·디자인 섞기 ✗ / 작업 바뀌면 **/clear** ○.
> ⑥ **마음 바꾸면 옛 걸 폐기** — "A→B→C" 결정 누적 ✗ / "이전 X는 잊고 Y로 진행" 명시 ○.

### S12. 3.1.2 SUBAGENT — Context Rot 회피 도구 ⏱ ~60초
> 6원칙 중 가장 강력한 도구입니다.
> `**서브에이전트(Subagent)** = 메인 세션과 별개의 컨텍스트 윈도우를 가지고 작업하는 격리된 작업자`. 탐색·분석으로 토큰을 아무리 써도 메인에는 **결과 한 덩어리만** 돌아옵니다.
> 직접 탐색하면 파일 30개 Read → 메인 컨텍스트 60%+ 점유. 서브에이전트에 외주하면 결과 한 단락만 반환 → **≤5% 점유**. 호출 방법 3가지: ①**Task tool** + subagent_type 지정 ②**`/agents`** 명령으로 등록한 커스텀 서브에이전트 ③한 메시지에 여러 Task tool 병렬 호출.

### S13. 3.1.5 PROMPTING — 기법 6선 정의 ⏱ ~50초
> 프롬프팅 기법 6선을 한 장에 모았습니다.
> ① **Zero-shot** = 예시 없이 바로 요청. ② **Few-shot** = 예시 1~몇 개 동봉. ③ **CoT(Chain-of-Thought)** = "단계별로 생각해줘" — 사고 과정을 유도. ④ **Role Prompting** = 역할 부여("시니어 보안 리뷰어로서"). ⑤ **Constraint** = 제약 명시("이 파일만 수정"). ⑥ **Step-by-Step** = 작업 분해 요청.
> 이 6개의 조합으로 거의 모든 프롬프트 패턴이 만들어집니다.

### S14. 3.1.5 PROMPTING — 선택 가이드 ⏱ ~40초
> 상황별 빠른 선택. 표준 CRUD면 Zero-shot. 프로젝트 톤·포맷 학습이 필요하면 Few-shot. 복잡한 설계 결정이면 CoT. 특정 관점이 필요하면 Role. AI 과잉 행동 막으려면 Constraint. 다층 작업이면 Step.

### S15. 3.1.5 PER-TECHNIQUE 1/2 — Zero · Few · CoT ⏱ ~70초
> (화면) 상단 풀 폭: Zero-shot. 하단 좌우: Few-shot · CoT.
> Zero-shot은 "대상·조건·기술을 다 명시" → AI가 추측할 부분 없음. 예: "documents 테이블에서 deletedAt IS NULL인 문서를 Drizzle ORM 쿼리로, 정렬 updatedAt DESC, 20개". `**ORM(Object-Relational Mapping)** = DB 테이블을 코드 객체처럼 다루는 추상화 계층`.
> Few-shot은 예시 2~3개 동봉 — "API 응답이 다 `{ data, total }` 형식이야, 새 endpoint도 동일하게". 글로벌 패턴은 CLAUDE.md로 옮기면 매 프롬프트에 안 넣어도 자동 적용.
> CoT는 "단계별로:" 라고 명시하고 1)·2)·3) 결정 분기를 적어주는 패턴. 복잡한 비즈니스 로직에 적합.

### S16. 3.1.5 PER-TECHNIQUE 2/2 — Role · Constraint · Step ⏱ ~65초
> (화면) 상단 풀 폭: Role Prompting. 하단 좌우: Constraint · Step.
> Role은 "시니어 백엔드로서, 동시성 문제를 검토해줘" 같이 관점을 박는 패턴. **주의** — 역할이 너무 좁으면 UX·DX 같은 다른 관점을 놓침. 한 작업에 2~3 역할로 교차 검토 권장.
> Constraint는 "title·body·tags만 수정, route.ts만 변경" 같이 범위 잠금. 전역 제약(any 금지·라이브러리 동결)은 CLAUDE.md로.
> Step은 "1) Zod 스키마 2) POST 라우트 3) position 자동계산 ..." 6단계 분해. 단계마다 git commit + `/rewind` 결합 → 안전한 되돌림.

### S17. 3.1.5 COMBINATION — 웹앱 보안 리뷰 프롬프트 ⏱ ~70초
> 6기법을 한 프롬프트에 다 박은 실전 예시입니다.
> "시니어 백엔드 보안 리뷰어로서(**Role**), 새 REST API에 **CSRF·CORS·Injection·시크릿 노출 차단** 적용(**Task**). 다음 5단계로(**Step+CoT**): ①CSRF 토큰 강제 ②CORS origin 화이트리스트 ③Injection parameterized query ④시크릿 .env 노출 차단 ⑤근거 한 문장씩. 제약(**Constraint**): Node.js+Express + helmet·cors·express-rate-limit만. 출력 형식(**Few-shot**): - 결정: <한 줄> - 근거: <한 줄> - 코드: <블록>".
> 용어 풀이: `**CSRF(Cross-Site Request Forgery)** = 사용자 인증을 도용해 의도하지 않은 요청을 보내는 공격`. `**CORS(Cross-Origin Resource Sharing)** = 다른 출처 도메인 간 API 호출 허용·차단 정책`.

### S18. 3.1.5 COMBINATION 2 — 검색 endpoint 추가 ⏱ ~40초
> 또 하나의 조합 예시. Few-shot으로 기존 endpoint 패턴 동봉 + Constraint로 수정 범위 잠금 + Step으로 단계 분해. **반복 원칙** — 한 번 작동한 조합은 비슷한 작업에 재사용. CLAUDE.md에 패턴으로 등록하면 매번 다시 안 짜도 됨.

### S19. 3.1.6 CONTEXT WINDOW — 200K 토큰 배분 ⏱ ~55초
> Claude 4.x의 컨텍스트 윈도우는 200,000 토큰. 어디에 얼마나 들어가는가를 봐야 합니다.
> 일반 배분: 시스템 프롬프트 + CLAUDE.md ≈ 5K, 도구 정의 ≈ 10K, 대화 이력 누적 ≈ 100K+, 첨부 파일·검색 결과 ≈ 50K+. **Self-Attention O(n²) 비용** — 100K 토큰 처리는 50K의 4배 비용. 50K가 정상 신호, 100K 이상은 비정상 신호. `/context` 명령으로 현재 점유율 시각화.

### S20. 3.1.6 WORKFLOW — 명령어 시퀀스 ⏱ ~70초
> 컨텍스트 엔지니어링 일상 워크플로 — 명령어 시퀀스입니다.
> `**/memory** = 핵심 결정 기록 (영속 메모리)` → `**/compact** = 시행착오 제거 + 핵심 결정만 보존` → `**/cost** = 현재 세션 비용 확인` → `**/clear** = 완전 초기화` → 새 세션에서 `/compact 아키텍처 결정과 완료 작업 목록만 보존` 같이 압축 키워드 지정.
> ⚠️ Anthropic 경고 — **MCP 도구가 너무 많으면 토큰 낭비**. 5개 서버 × 도구 10개 = 수천 토큰. 세션 목적에 맞는 MCP만 활성화. `**MCP(Model Context Protocol)** = AI가 외부 도구·데이터에 접근하는 표준 프로토콜 (LEVEL 4에서 자세히)`.

### S21. 3.1.7 4 STRATEGIES — 4대 컨텍스트 전략 ⏱ ~50초
> Anthropic이 정리한 4대 전략입니다.
> ① **Write** — 외부에 기록(CLAUDE.md·메모리). ② **Select** — 필요한 것만 골라서 적재. ③ **Compress** — 압축(/compact). ④ **Isolate** — 격리(서브에이전트).
> 이 네 단어는 터미널에 치는 명령어가 아니라, "이 상황에서 어떤 방향으로 컨텍스트를 다룰지"를 정하는 사고의 분류입니다.
> 6원칙을 4범주로 묶은 메타 분류. 이 네 단어만 외우면 어떤 상황에서도 "지금 어떤 전략 쓸지" 즉시 결정.

### S22. 3.1.7 LONG CONTEXT — 장문 컨텍스트 배치 원칙 ⏱ ~50초
> 4대 전략에서 한 걸음 더 — 긴 자료(20k 토큰+)를 붙여 넣고 시킬 때의 **순서**입니다. 실무에서 매일 하는 그 동작이에요.
> 화면을 보시면 — 위에는 **첨부 자료**(기획서·코드·로그·검색결과), 아래에는 **질문·지시·출력 형식**. 즉 ① 긴 자료는 **맨 위에 모아 두고** ② "이걸로 ○○ 해줘"라는 지시는 **맨 아래**에 둡니다.
> 왜 이 순서냐 — 모델은 **끝부분을 가장 강하게 주목**하기 때문입니다. 자료를 위에 깔고 질문을 끝에 두면 응답 품질이 **최대 30%** 올라갑니다(Anthropic 측정, 여러 문서를 한꺼번에 줄 때 특히).
> 근본 이유는 **Context Rot** — 토큰이 늘수록 핵심을 골라내는 정확도가 떨어집니다(모든 모델 공통). 컨텍스트는 한정 자원이라 **무엇을 어디에 두느냐가 곧 품질**. 출처: Anthropic 「Prompting best practices」·「Effective Context Engineering for AI Agents」.

---

## PART 02 — Kent Beck의 증강코딩

### S23. 섹션 표지 — 3.2 Kent Beck의 증강코딩 ⏱ ~10초
> TDD 창시자 Kent Beck이 2025년 제시한 AI 시대 코딩 방법론입니다.

### S24. 3.2 AUGMENTED CODING — 증강코딩 개념 ⏱ ~60초
> `**Augmented Coding(증강코딩)** = AI가 타이핑을 대신해주되 사람이 손으로 직접 쓸 때와 동일한 가치 체계(품질·복잡도·테스트·커버리지)를 유지하는 방법론`. Kent Beck이 BPlusTree3 프로젝트(B+ Tree 라이브러리)에서 탐구·문서화했어요.
> 핵심 원칙: **"손으로 직접 코드를 작성할 때와 동일한 가치 체계를 유지하면서, 타이핑을 AI가 대신해줄 뿐이다."**
> AI 궤도 이탈 3가지 경고 신호 — ①**루프**(같은 작업 반복 진전 없음) ②**요청 안 한 기능 추가**(복잡성 폭발) ③**치팅**(테스트 자체를 비활성화·삭제 — **가장 위험**).

### S25. 3.2 PRINCIPLE — Make it work · right · fast ⏱ ~55초
> 점진적 개발 3단계입니다.
> ① **Make it work** — 일단 돌아가게. 못생긴 코드라도 OK.
> ② **Make it right** — 가독성·구조 정리. 테스트 통과 유지.
> ③ **Make it fast** — 성능 최적화. **이 단계 전엔 성능 걱정 ✗**.
> 순서가 핵심. AI가 1단계도 안 됐는데 "최적화해줘" 하면 망가집니다. 먼저 작동 → 리팩토링 → 그 다음 빠르게.

### S26. 3.2 STEPS — Small Safe Steps ⏱ ~50초
> `**Small Safe Steps** = 작고 안전한 단계로만 진행하는 원칙`. 한 번에 큰 변경 ✗, 매번 검증 가능한 작은 변경 ○. 좋은 예 vs 나쁜 예 코드로 보여드립니다. 한 줄 요약 — **"되돌릴 수 있는 변경"** 만 한다. git commit이 한 줄 변경 단위 OK.

---

## PART 03 — TDD: Red · Green · Refactor

### S27. 섹션 표지 — 3.3 TDD ⏱ ~10초
> 테스트 주도 개발 — Red · Green · Refactor 사이클. AI는 왜 이걸 무시하는지부터.

### S28. 3.3 AI는 왜 TDD를 무시하는가 ⏱ ~50초
> `**TDD(Test-Driven Development)** = 테스트를 먼저 작성하고 → 그걸 통과하는 최소 구현 → 리팩토링하는 개발 방법론`.
> AI는 학습 데이터에서 본 **"구현 먼저"** 패턴이 압도적으로 많아 별 말 없으면 테스트를 건너뜁니다. 그래서 명시적으로 TDD 사이클을 요청해야 합니다.

### S29. 3.3 RED-GREEN-REFACTOR — 명시적 사이클 요청 ⏱ ~50초
> 매번 "TDD로 해줘" 한 줄로 시작합니다. **Red** = 실패하는 테스트 먼저. **Green** = 그걸 통과하는 최소 구현. **Refactor** = 중복·이름 정리, 테스트는 그대로 통과. 한 사이클이 너무 크면 작게 분해.

### S30. 3.3 CLAUDE.md TDD 규칙 ⏱ ~45초
> 매번 "TDD로 해줘" 반복은 비효율. CLAUDE.md에 한 줄 룰 박으면 자동 적용:
> > "모든 신규 함수는 테스트 먼저 작성. Red → Green → Refactor 순서 강제. 테스트 없는 구현은 즉시 거부."
> 이 한 룰이 전체 프로젝트의 AI 출력 품질을 좌우합니다.

### S31. 3.3 /tdd-red — Red 단계 자동화 ⏱ ~40초
> 슬래시 커맨드로 Red 단계만 자동화합니다. `**slash command(슬래시 커맨드)** = 자주 쓰는 프롬프트를 / 명령어로 등록해 한 단어로 호출하는 기능`. `/tdd-red 이메일 검증 함수` → 실패하는 테스트 3종(정상·비정상·경계값) 자동 생성.

### S32. 3.3 /tdd-green — Green 단계 자동화 ⏱ ~30초
> `/tdd-green` → 테스트를 통과시키는 **최소 구현**만 작성. 과한 추상화·옵션 추가 금지가 룰.

### S33. 3.3 /tdd-refactor — Refactor 단계 자동화 ⏱ ~30초
> `/tdd-refactor` → 중복 제거·이름 개선·정규식 상수 추출. **테스트는 그대로 통과** 유지가 조건.

### S34. 3.3 HOOKS — 자동 테스트 실행 ⏱ ~50초
> `**Hook** = 도구 호출 시점·세션 종료 시점에 사용자 정의 명령을 자동 실행하는 메커니즘`. 파일 수정(Write·Edit) 직후 자동으로 `npm test` 실행 같은 룰을 박을 수 있어요. AI가 코드 고치자마자 테스트가 돌고, 실패하면 즉시 알림. **수동 확인 단계 ✗**.

### S35. 3.3 USAGE — TDD 슬래시 사용 예 ⏱ ~50초
> 실전 시나리오 — 이메일 검증 함수 만들기. ① `/tdd-red 이메일 검증 함수` → test 3종 자동, FAIL 3건. ② `/tdd-green` → validate_email.py 작성, PASS 3건. ③ `/tdd-refactor` → EMAIL_RE 상수 추출, PASS 3건 유지. 세 명령으로 한 사이클 완성.

### S36. 3.3 TEST AS SPEC — 명세 역할을 하는 테스트 ⏱ ~40초
> 테스트가 단순 검증을 넘어 **"이 함수는 어떻게 동작해야 한다"는 명세** 역할을 합니다. 잘 쓴 테스트는 코드 주석보다 정확. AI에게 "이 테스트를 통과하도록 함수 작성"이라 명령하면 출력 품질이 명세 수준만큼 보장됩니다.

### S36~S38. Practice — 실습 ⏱ ~30초/each
> (화면) 실습 안내. 강의 예제 repo에서 Markdown Editor & 프리뷰 만들기 — TDD 사이클 직접 돌려보기.

---

## PART 04 — SDD · SpecKit

> **표기 안내 (커맨드 형식)** — 본 교재는 Claude Code 기준 슬래시 커맨드를 **하이픈** 표기 `/speckit-constitution` 으로 통일합니다. spec-kit 공식 README에는 슬래시 커맨드가 점 표기 `/speckit.*` 로, Agent Skill(skills 모드) 이름이 하이픈 `speckit-*` 로 **병기**되어 있으니, 수강생은 본인 환경에서 자동완성(`/speckit-`)으로 한 번 확인하세요.

### S40. 섹션 표지 — 3.4 SDD · SpecKit ⏱ ~10초
> Spec → Plan → Tasks → Implement. 명세 주도 개발로 AI 출력의 재현 가능성을 확보합니다.

### S41. 3.4 SDD — Spec-Driven Development ⏱ ~55초
> `**SDD(Spec-Driven Development)** = 코드를 짜기 전에 명세(Spec)를 먼저 정의하고, 그로부터 계획·작업·구현을 순차적으로 도출하는 개발 방법론`. TDD가 "테스트 먼저"라면 SDD는 **"명세 먼저"**. 한 단계 더 위에서 시작합니다.
> 효과: 같은 명세에서 출발하면 AI가 매번 비슷한 구현을 만듭니다. 재현 가능성↑.

### S42. 3.4 INSTALL — SpecKit 설치 ⏱ ~40초
> `**SpecKit** = SDD 워크플로를 슬래시 커맨드로 구현한 오픈 도구`. `npx speckit init` 한 줄로 설치. .specify/ 디렉터리 생성됨.

### S43. 3.4 INSTALL · 계속 — 디렉터리 구조 ⏱ ~30초
> .specify/ 안에 constitution.md / spec.md / plan.md / tasks.md 가 자동 생성됨. 각 파일이 한 단계의 산출물.

### S44. 3.4 COMMANDS — SpecKit 슬래시 커맨드 체인 ⏱ ~50초
> 6개의 핵심 슬래시 커맨드입니다.
> `/speckit-constitution` → 프로젝트 원칙 → constitution.md
> `/speckit-specify` → 요구사항 명세 → spec.md
> `/speckit-clarify` → 모호한 부분 명확화 → spec.md 보완
> `/speckit-plan` → 기술 구현 계획 → plan.md
> `/speckit-tasks` → 태스크 분해 → tasks.md
> `/speckit-implement` → 태스크별 구현 → 실제 코드.

### S45. 3.4 PROCESS — 프로세스 + 보조 명령 ⏱ ~40초
> 메인 6단계 + 보조 3개. 보조는 `/speckit-taskstoissues` (tasks → GitHub 이슈) · `/speckit-analyze` (spec·plan·tasks 정합성) · `/speckit-checklist` (완전성·일관성 게이트). 보조는 tasks와 implement 사이에 끼워넣어 품질 게이트로 활용.

### S46. 3.4 SDD CONTRAST — 좋은 요청 vs 나쁜 요청 ⏱ ~45초
> 나쁜 요청: "회원가입 만들어줘" — 너무 모호, AI가 빈칸을 임의로 채움. 좋은 요청: `/speckit-specify` 로 먼저 명세 작성 → spec.md에 "이메일 검증·비밀번호 정책·중복 확인·세션 발급" 4 항목 → `/speckit-implement` 호출. 같은 결과를 매번 재현.

### S47. 3.4 CONNECT — CLAUDE.md 연결 ⏱ ~35초
> CLAUDE.md에 SpecKit 섹션 추가: `## SDD 워크플로 - 모든 기능은 /speckit-specify 로 시작 - implement 전 /speckit-analyze 강제`. 한 번 박으면 매 세션 자동 적용.

### S48. 3.4 SDD CYCLE — 카페 메뉴판 실습 사이클 ⏱ ~80초
> 9단계 사이클을 메뉴판 프로젝트로 인용해봅니다.
> ① `/speckit-constitution` "카페 메뉴판 구현 원칙 — 데이터(Excel)와 표현(CSS 테마) 분리"
> ② `/speckit-specify` "요구사항 — Excel 시트 1개 = 페이지 1개, _설정 시트로 매장명·테마·자동전환초"
> ③ `/speckit-clarify` "OneDrive vs Ctrl+S 차이 명확화"
> ④ `/speckit-plan` "Express + chokidar(파일 감시) + SheetJS + SSE 푸시"
> ⑤ `/speckit-tasks` "server.mjs · 파일 감시 · Excel 파서 · SSE · public 템플릿 2종"
> ⑥ `/speckit-taskstoissues` "tasks → GitHub 이슈"
> ⑦ `/speckit-analyze` "spec·plan·tasks 정합성"
> ⑧ `/speckit-checklist` "구현 전 품질 게이트"
> ⑨ `/speckit-implement` "tasks 순서대로 실제 구현".
> 용어 풀이: `**SSE(Server-Sent Events)** = 서버→클라이언트 단방향 푸시 채널, WebSocket보다 가벼움`. `**chokidar** = Node.js 파일 시스템 변경 감시 라이브러리`.

---

## PART 05 — 프로젝트 구조 설계

### S49. 섹션 표지 — 3.5 프로젝트 구조 설계 ⏱ ~10초
> 파일별 역할 명확화 + AGENTS.md 표준 — 도구가 바뀌어도 유지되는 구조.

  Next.js App Router 단일 배포 — 기술스택 & 배포 가이드
  
  ▎ 핵심 전제: 하나의 코드베이스 = 하나의 Vercel 배포. app/ 페이지와 app/api/**/route.ts가 같은 빌드에서 함께 나갑니다.

  1) 기술스택

  프레임워크 / 런타임

  ┌────────────┬──────────────────────┬─────────────────────────────────────────────────────────────────────────┐
  │    항목    │         선택         │                                   왜                                    │
  ├────────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ 프레임워크 │ Next.js (App Router) │ 프론트(페이지)와 백엔드(Route Handlers)를 한 앱에 통합, Vercel 1급 지원 │
  ├────────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ UI         │ React 19             │ Server Components / Server Actions / use 훅                             │
  ├────────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ 언어       │ TypeScript           │ 타입 안정성 + path alias                                                │
  ├────────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ 런타임     │ Node (기본) vs Edge  │ DB 접근=Node, 가벼운 가드/리다이렉트=Edge. middleware.ts는 항상 Edge    │
  └────────────┴──────────────────────┴─────────────────────────────────────────────────────────────────────────┘

  프론트엔드

  - 라우팅: App Router 파일 기반. (auth)·(app) 라우트 그룹은 URL에 안 드러나는 논리적 묶음으로 레이아웃/가드 격리, [slug] 동적 라우트.
  - 컴포넌트 경계: 기본 Server Component, 'use client'는 상호작용 잎(leaf)에만 — 트리 상단에 두지 말고 아래로 밀어내리기.
  - 상태관리: Zustand는 UI/세션성 상태에 한정. 서버 상태는 서버에서 해결.
  - 스타일링: Tailwind CSS 권장.
  - 데이터 페칭 3모델: 읽기=Server Component fetch, 뮤테이션=Server Actions, 외부/웹훅=Route Handler.

  백엔드 (Route Handlers as API)

  route.ts (HTTP I/O + zod 검증)   ← 얇게
    → lib/server/services/*.ts (비즈니스 규칙)   ← 두껍게
      → lib/server/db.ts (Drizzle 쿼리)
  - v1/ 경로 prefix로 API 버저닝, 서버 전용 코드는 lib/server/에 격리(server-only).

  데이터베이스 

  - Postgres (Vercel Postgres / Neon / Supabase) + Drizzle ORM + drizzle-kit 마이그레이션, db/schema/에 단일 소스화.
  - 서버리스 커넥션 주의: 함수 폭증 시 max_connections 소진 → Neon serverless driver 또는 pooled URL 사용.

  기타

  - 테스트: Playwright(e2e) + Vitest/Testing Library(유닛)
  - 인증: Auth.js(NextAuth) 권장, 판정 로직은 server-only
  - 도구체인: ESLint + Prettier + tsconfig path alias

  2) 배포 (Vercel 단일 배포) 

  ┌────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │      주제      │                                                             핵심                                                             │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 단일 배포 모델 │ page.tsx=SSG/SSR, route.ts=서버리스 Function 자동 배포 → git push 한 번에 프론트+API 원자적 배포, 버전 스큐 원천 차단        │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 환경변수       │ .env.local(❌Git) / .env.example(✅키만) / Vercel 대시보드 Production·Preview·Development 스코프. 시크릿엔 NEXT_PUBLIC_ 금지 │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ DB 연결        │ 런타임=pooled URL, 마이그레이션=direct URL 분리                                                                              │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 마이그레이션   │ generate→커밋→적용. 빌드 통합(간단) vs 별도 CI 스텝(안전·권장, Production은 승인된 것만)                                     │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Cron           │ vercel.json crons로 /api/cron/cleanup 스케줄 + CRON_SECRET 헤더 검증                                                         │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 리전/런타임    │ regions를 DB와 동일 리전(예 icn1), functions.maxDuration 상향                                                                │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ CI/CD          │ feature push→Preview URL, main merge→Production. PR마다 Preview에 E2E 가능                                                   │
  └────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  // vercel.json 종합 예시
  {
    "regions": ["icn1"],
    "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }],
    "functions": { "app/api/**/route.ts": { "maxDuration": 30 } }
  }

  핵심 원칙 (요약)

  1. 단일 앱 = 단일 배포 — 프론트/백 버전 불일치 구조적 차단
  2. route는 얇게, services는 두껍게
  3. server-only 코드 격리 (lib/server/, NEXT_PUBLIC_ 미사용)
  4. 환경별 시크릿 분리 (Vercel Production/Preview/Development)
  5. DB 커넥션은 pooled, 마이그레이션은 direct

### S50. 3.5 PROJECT LAYOUT — 구조 살펴보기 ⏱ ~70초
> 표준 프로젝트 구조. `src/server/` (백엔드) · `src/components/` (프론트) · `migrations/` (DB) · `tests/` (테스트) · `docs/` (문서) · `.claude/` (Claude Code 설정 — agents·hooks·skills) · `CLAUDE.md` (메인 룰) · `AGENTS.md` (도구 중립 룰).
> `**AGENTS.md** = 모든 AI 코딩 에이전트(Claude·Cursor·Copilot·Gemini)가 읽는 표준 README — 2025.7 공식화된 오픈 표준`. 도구 분열 해결책. CLAUDE.md에서 `@AGENTS.md` 참조하면 클로드 코드도 자동 적용. 모노레포에선 패키지별 AGENTS.md 계층 가능.

---

## PART 06 — 실습

### S50~S52. Practice — Markdown Editor & 프리뷰 ⏱ ~30초/each
> (화면) 실습 안내.
> SDD 9단계 사이클을 그대로 적용해 Markdown Editor 만들기. ① `/speckit-constitution`부터 ⑨ `/speckit-implement`까지. 강의 예제 repo: github.com/claude-code-expert/inflearn-docs/tree/main/example.
> 완성 산출물: 좌측 입력 → 우측 실시간 프리뷰. XSS 차단 sanitize 단계 필수. 만든 후 Hook으로 자동 테스트 + git commit까지 연결해보세요.

---

## SUMMARY · REF

### S54. LEVEL 3 핵심 요약 ⏱ ~90초
> 오늘 배운 것을 묶어드리면 —
> ① **프롬프트·컨텍스트 엔지니어링** — 프롬프트(한 번 잘 묻기)에서 컨텍스트(매 추론마다 보는 정보 전체 설계)로. 프롬프팅 기법 6선 + Context Rot 회피 6원칙 + 서브에이전트 + 4대 전략(Write·Select·Compress·Isolate) + 장문 배치.
> ② **증강코딩** — Kent Beck의 Make it work · right · fast. Small Safe Steps. 궤도 이탈 3 경고 신호 식별.
> ③ **TDD 자동화** — `/tdd-red·green·refactor` 슬래시 커맨드 + Hook으로 매번 검증 강제.
> ④ **SDD·SpecKit** — `constitution → specify → clarify → plan → tasks → implement` 6단계 + 보조 3개. 명세 먼저 작성하면 같은 결과를 매번 재현.
> ⑤ **프로젝트 구조 설계** — CLAUDE.md · AGENTS.md · `.claude/`(settings·commands·agents·skills·rules). 경로별 자동 적용 규칙 + Git 공유/개인 분리.
> ⑥ **실습** — 카페 메뉴판(엑셀 데이터 연동) · Markdown Editor & 프리뷰로 배운 것을 실제 산출물로 만들어 봤습니다.
이밖에 클로드 디자인 요소 적용하는것과 공통 UI 컴포넌트 프로젝트를 현재 프로젝트에 연동해서 각 엘리먼트들을 재사용하고 프론트를 통일감 있게 
배치하는것을 적용했구요 
다음 Level 4에서 Skills · Hooks · MCP를 본격적으로 다루고 나서 Level5단계에서 지금 작성한 마크다운 에디터 프로젝트를 파일 시스템이 아니라 디비와 연동하는 방법, 마크다운 문서를 html이나 md, pdf로 export 하는 법 등을 만들어보고 완성되면 배포해서 웹 사이트 형태로 서비스 하는 방법 등을 고도화 해볼 예정입니다.
마크다운 에디터 파일은 로컬 경로에 저장이 되는데 이걸 잘 활용하면 나만의 지식 마크 다운 시스템 안드레 카파시가 주장한 지식관리 LLM Wiki 같은 을 만들수 있고 원본 문서와 클로드를 연결해서 AI가 분석하고 업데이트 해서 계속 발전하는 LLM Wiki 같은 시스템 처럼 발전시킬 수 있겠죠?



> **한 줄로 — "AI 협업을 '운'이 아니라 '시스템'으로."** 



### S55. 참고 자료 ⏱ ~30초
> 참고 링크는 슬라이드에 정리해뒀습니다. Anthropic 공식 블로그(Effective Context Engineering) · Chroma Research(Context Rot) · Kent Beck(Augmented Coding) · SpecKit 공식 repo · AGENTS.md 표준 사이트(agents.md). 영상 멈추고 캡처하셔도 좋고, 강의 예제 repo에 다 정리돼 있습니다.

---

## 용어집 (영상 상단 자막용 빠른 참조)

| 약어 / 용어 | 풀 네임 / 뜻 |
|---|---|
| **TDD** | Test-Driven Development — 테스트 먼저 작성·통과·리팩토링 |
| **SDD** | Spec-Driven Development — 명세 먼저 작성·계획·구현 |
| **Context Rot** | 입력 길이 증가 시 LLM 응답 품질 저하 현상 |
| **Subagent** | 메인 세션과 별개 컨텍스트 윈도우를 가진 격리된 작업자 |
| **CoT** | Chain-of-Thought — 단계별 사고 유도 프롬프트 |
| **ORM** | Object-Relational Mapping — DB를 코드 객체처럼 다룸 |
| **MCP** | Model Context Protocol — AI가 외부 도구·데이터에 접근하는 표준 |
| **SSE** | Server-Sent Events — 서버→클라이언트 단방향 푸시 |
| **CSRF** | Cross-Site Request Forgery — 인증 도용 공격 |
| **CORS** | Cross-Origin Resource Sharing — 출처 간 API 호출 정책 |
| **KV-cache** | Key-Value 캐시 — LLM 추론 가속 메커니즘 |
| **AGENTS.md** | 모든 AI 코딩 에이전트가 읽는 도구 중립 README 표준 |
| **SpecKit** | SDD 워크플로를 슬래시 커맨드로 구현한 오픈 도구 |
| **Hook** | 도구 호출·세션 종료 시 자동 실행되는 사용자 정의 명령 |
| **slash command** | / 로 시작하는 프롬프트 단축 명령어 |
| **Augmented Coding** | Kent Beck의 AI 시대 코딩 방법론 — 가치 체계는 유지, 타이핑만 AI |

---

> 작성: 코드빌런 · 본 스크립트는 슬라이드 53장 기준 (LEVEL 3 — `claude-code-level3-chapter3.html`)
