# ② 기초 개념

## 🔵 LEVEL 2 — AI 시대 개발 방법론 (32가지 UI 컴포넌트 시스템 제작하기)

> **강의 대상**: 실무 개발자 (입문 ~ 시니어)  
> **학습 목표**: AI와 함께 일하는 5대 원칙을 익히고, 이를 적용해 32가지 UI 컴포넌트로 구성된 HTML·CSS 학습 사이트를 직접 만든다.  
> **참고 리포지토리**: [github.com/claude-code-expert/inflearn-docs](https://github.com/claude-code-expert/inflearn-docs)

---

## 2.1 AI와 함께하는 개발의 원칙

### 2.1.1 왜 설계가 더 중요해졌는가

"코드는 AI가 작성하니까, 일단 만들어보고 고치면 되지 않을까?" AI 코딩 도구를 처음 접한 개발자들이 흔히 하는 생각이다. 실제로 Claude Code에게 "TODO 앱 만들어줘"라고 요청하면 몇 분 안에 동작하는 코드가 나온다. 이 놀라운 속도에 매료되어 설계 없이 바로 구현에 뛰어드는 유혹에 빠지기 쉽다. 하지만 이것이 바로 **AI 시대의 역설 — 바이브 코딩 숙취**다. 코드 생성이 쉬워졌기 때문에 오히려 유지보수와 기능 완성도를 위한 설계가 더 중요해졌다.

> 출처: [hackernoon.com/the-vibe-coding-hangover](https://hackernoon.com/the-vibe-coding-hangover-what-happens-when-ai-writes-95percent-of-your-code)

**설계 없는 개발의 위험성**

이 책에서 만들려는 TODO 앱을 기준으로, 설계 없이 진행하면 다음과 같은 재작업 사이클이 발생한다.

```
1일차: "TODO 웹 애플리케이션 만들어줘" → 개인용 CRUD 생성
3일차: "팀 공유 기능 추가해줘" → 인증/권한 시스템 급조
7일차: "SaaS로 서비스하고 싶어" → 멀티테넌시 구조 전면 재작성
14일차: "온프레미스 설치 옵션도 필요해" → 환경 설정 시스템 재설계
```

AI는 '어떻게(How)' 구현할지는 잘 알지만, '무엇을(What)' 만들어야 하는지는 모른다. 따라서 다음 세 가지가 구현 전에 선행되어야 한다.

- **요구사항 분석**: 무엇을 만들 것인가? 핵심 기능과 비기능적 요구사항을 수립한다.
- **아키텍처 결정**: 어떤 기술과 구조로 만들 것인가? 빌드/배포까지 영향을 미치므로 신중히 결정한다.
- **인터페이스 정의**: API 규격, 데이터 흐름을 사전에 정의한다.

**입력의 품질 = 출력의 품질 (Garbage In, Garbage Out)**

```
# 명세 없는 요청 → AI가 임의로 결정
> TODO 앱 백엔드 만들어줘

# 명세 있는 요청 → AI의 모든 결정이 요구사항과 일치
> 다음 요구사항에 맞는 TODO 앱 백엔드를 만들어줘.
> - 온프레미스 설치형, Docker 단일 컨테이너
> - 50-100명 동시 사용자
> - PostgreSQL
> - 자체 인증 + Google OAuth
> - 프로젝트 기반 팀 협업 지원
```

---

### 2.1.2 AI에게 없는 것 — 판단력(Taste)

소프트웨어 개발에서 **Taste**는 기술적 판단력과 미적 감각을 아우르는 개념이다. 문법적으로 '올바른' 코드와 '좋은' 코드를 구분하는 능력, 여러 선택지 중에서 현재 상황에 가장 적합한 것을 고르는 안목이 Taste다.

**AI가 만드는 '작동하는 코드'와 '좋은 코드'의 차이**

```typescript
// AI가 생성한 코드 — 작동하지만 확장성이 낮다
function filterTodos(todos: Todo[], filter: string) {
  if (filter === 'all') {
    return todos;
  } else if (filter === 'active') {
    return todos.filter(todo => !todo.completed);
  } else if (filter === 'completed') {
    return todos.filter(todo => todo.completed);
  } else {
    return todos;
  }
}

// 개선된 코드 — 타입 안전, 새 필터 추가 용이
type FilterType = 'all' | 'active' | 'completed';

const filterStrategies: Record<FilterType, (todo: Todo) => boolean> = {
  all: () => true,
  active: (todo) => !todo.completed,
  completed: (todo) => todo.completed,
};

function filterTodos(todos: Todo[], filter: FilterType): Todo[] {
  return todos.filter(filterStrategies[filter]);
}
```

AI는 패턴을 인식하지만 왜 그 패턴이 중요한지는 이해하지 못한다. **성능, 비용, 보안, 확장성 사이에서 균형을 잡는 것은 맥락을 아는 개발자만이 할 수 있다.**

**YAGNI 원칙 — AI가 스스로 적용하기 어려운 것**

AI는 '더 완전한' 코드를 만들려는 경향이 있다. 개인용 TODO 앱에 페이지네이션·태그·첨부파일·댓글까지 포함한 API를 만들어주는 식이다. "You Aren't Gonna Need It" — 지금 당장 필요하지 않은 것은 만들지 않는다는 원칙을 AI가 스스로 적용하기는 어렵다. 이 판단은 개발자의 몫이다.

**트레이드오프 결정의 주체**

- 오프라인 우선 경험이 중요한가? → 로컬 스토리지 + 동기화
- 여러 기기에서 접근해야 하는가? → 서버 API 필수
- 빠른 출시가 우선인가? → 가장 단순한 방법
- 향후 협업 기능을 추가할 예정인가? → 처음부터 서버 연동

이런 결정은 비즈니스 목표, 사용자 요구, 기술적 제약을 종합적으로 고려해야 한다. AI는 정보를 제공할 수 있지만, 최종 결정은 맥락을 아는 개발자의 몫이다.

---

### 2.1.3 AI 출력의 비결정적 특성 이해

전통적인 프로그래밍은 결정적(Deterministic)이다. 같은 입력에는 항상 같은 출력이 나온다. 반면 AI 코딩 도구는 비결정적(Non-deterministic)이다. 같은 요청에도 다른 결과를 낼 수 있다.

**비결정적 특성이 나타나는 패턴**

- **미묘하게 다른 구현**: "사용자 입력을 검증하는 함수를 만들어줘"라고 요청하면 어떤 때는 정규식, 어떤 때는 조건문, 또 어떤 때는 외부 라이브러리를 활용한다.
- **예상치 못한 변경**: 기존 코드 수정을 요청했는데 관련 없는 부분까지 변경한다. 빌드와 테스트가 성공했다고 주장하며 다음 단계로 넘어가는데, 실제로는 그렇지 않은 경우도 있다.
- **치팅 징후**: 켄트 벡이 경고한 가장 위험한 신호. AI가 테스트를 통과시키기 위해 테스트 자체를 비활성화하거나 삭제한다.

**비결정성에 대응하는 방법**

비결정적 시스템을 다룰 때는 '결과가 올바른가?'를 판단할 객관적 기준이 필요하다. **테스트**는 AI의 비결정성에 대응하는 결정적 검문소 역할을 한다. AI가 어떤 방식으로 구현하든, 테스트를 통과하면 요구사항을 충족한 것이고 통과하지 못하면 충족하지 못한 것이다.

결과물의 '동일함'이 아니라 **'동작함'이 성공의 기준**이다.

---

## 2.2 작은 단위로 쪼개기의 힘 — 컴포넌트 단위 설계와 기능 정의

### 2.2.1 한 번에 하나의 작업만 요청하기

AI에게 작업을 요청할 때 가장 흔히 저지르는 실수는 여러 가지를 한꺼번에 요청하는 것이다. 프롬프트에 **"그리고", "또한", "추가로"** 같은 단어가 들어가면 작업을 분리해야 한다는 신호다.

```
# 나쁜 예 — 한 번에 너무 많이
"사용자 인증 시스템 만들어줘. 회원가입, 로그인, 로그아웃,
 비밀번호 변경, 그리고 이메일 인증까지 포함해서."
```

```
# 좋은 예 — 단계별 분해
요청 1: "User 모델 스키마 정의해줘.
         이메일, 비밀번호 해시, 생성일시, 수정일시 필드 포함."
→ 검증 후 다음 단계로

요청 2: "회원가입 API 엔드포인트 만들어줘.
         POST /api/auth/register, 이메일과 비밀번호만 받음."
→ Postman으로 테스트 후 다음 단계로

요청 3: "비밀번호 해싱 로직 추가해줘. bcrypt 사용."
→ 저장된 비밀번호가 해시되어 있는지 확인 후 다음 단계로

요청 4: "로그인 API 만들어줘. POST /api/auth/login, 이메일/비밀번호 검증."
→ 검증 후 다음 단계로
```

여러 작업을 한 번에 요청하면 다음 문제가 발생한다.

- 기능·코드 품질 저하
- 복합적 에러 발생으로 인한 디버깅 어려움
- 서로 다른 기능 간(클래스·함수·파일 단위) 침범으로 인한 컨텍스트 혼란

---

### 2.2.2 작업 분해의 기준과 단위

**적절한 작업 크기의 기준**

- **단일 책임 원칙**: 하나의 요청은 하나의 책임만 다룬다. "사용자 생성"과 "이메일 발송"은 별개의 요청이어야 한다.
- **테스트 가능한 단위**: 결과물을 독립적으로 테스트할 수 있어야 한다. "이 기능이 동작하는가?"라는 질문에 예/아니오로 답할 수 있는 크기가 적절하다.
- **10분 내 검증 가능한 크기**: AI 출력을 받고, 코드를 훑어보고, 테스트를 돌려보는 시간이 10분을 넘으면 더 쪼개야 한다.
- **파일 또는 기능 단위의 경계**: 회원가입·수정과 로그인·로그아웃은 경계도 다르고 역할도 다르므로 별도 파일로 분리한다.

**점진적 설계 — 처음부터 완벽할 필요 없다**

```markdown
## 1차 설계 (프로젝트 시작 전 — 필수)
- 배포 형태: 온프레미스
- 기술 스택: Node.js + PostgreSQL
- 인증 방식: Google OAuth + 자체 인증

## 2차 설계 (1주차 — 구현 중)
- API 엔드포인트 상세 정의
- 데이터베이스 스키마 확정
- 에러 코드 체계 정의

## 3차 설계 (2주차 — 통합 전)
- 프런트엔드 컴포넌트 구조
- 상태 관리 전략
- API 응답 형식 표준화
```

1차 설계에서 결정하는 것들(배포 형태, 기술 스택)은 나중에 바꾸기 어렵다. 반면 2차·3차 설계 내용은 구현하면서 조정해도 큰 문제가 없다.

**다중 AI 에이전트 활용 워크플로**

설계 단계에서 비용을 줄이는 실용적인 방법이다.

```
1단계: 아이디어 정리 (Gemini — 무료)
"온프레미스 TODO 앱을 만들려고 해. 어떤 요소들을 고려해야 할까?"

2단계: 설계 문서 초안 (Gemini — 무료)
"위 요구사항으로 REQUIREMENTS.md 초안 만들어줘"

3단계: 설계 검토 및 확정 (Claude — 최소 토큰)
"이 설계 문서 검토해서 누락된 부분 알려줘"

4단계: 구현 (Claude Code — 주 비용)
"REQUIREMENTS.md에 따라 백엔드 구현해줘"
```

하나의 에이전트에만 의존하면 학습 데이터 편향이나 맥락 고착(Context Lock-in)에 갇히게 되므로, 설계 단계에서는 교차 검증이 여러모로 안전하다.

---

## 2.3 명확한 지시의 기술

### 2.3.1 컨텍스트 제한의 원칙

AI에게 모든 정보를 주는 것이 능사가 아니다. **필요한 정보만 정확하게** 전달하는 것이 중요하다. 너무 많은 정보는 AI를 혼란스럽게 하고, 너무 적은 정보는 AI가 임의로 판단하게 만든다.

| 요소 | 질문 | 역할 |
|------|------|------|
| **목표 (What)** | 무엇을 달성해야 하는가? | 작업의 방향 설정 |
| **맥락 (Context)** | 현재 상황과 배경은? | AI가 올바른 가정을 하도록 유도 |
| **제약 조건 (Constraints)** | 지켜야 할 규칙은? | 범위를 제한하여 일탈 방지 |
| **완료 조건 (Done Criteria)** | 성공을 어떻게 판단하는가? | 명확한 종료 지점 제시 |
| **예시 (Examples)** | 기대하는 결과의 구체적 모습은? | 모호함을 제거 |

**실제 명확한 지시 예시**

```
# 프롬프트

[목표]
@profile.html 파일의 레이아웃을 참고해서 사용자 프로필 페이지를 만들어줘.
수정 버튼을 통해 이메일과 비밀번호를 제외한 나머지 항목을 수정할 수 있어야 해.
비밀번호 필드는 프로필 화면에서 노출할 수 없고,
수정 API도 이메일/비밀번호 필드를 제외하여 update가 되어야 해.

[맥락]
- 현재 User 모델에는 name, email, avatar_url 필드가 있음
- PATCH /api/users/:id 엔드포인트로 구현
- 프런트엔드는 React + TypeScript 사용 중

[제약 조건]
- 본인의 프로필만 수정 가능 (인증 미들웨어 사용)
- email 및 비밀번호는 수정 불가
- avatar_url은 URL 형식 검증 필요

[완료 조건]
- 유효한 요청 시 수정된 사용자 정보 반환
- 권한 없는 요청 시 403 응답
- 잘못된 URL 형식 시 400 응답과 에러 메시지

[예시]
요청: PATCH /api/users/123 { "name": "새이름" }
응답: { "id": 123, "name": "새이름", "email": "user@example.com" } 200 OK
```

---

### 2.3.2 완료 조건을 명시하는 방법

명시적인 완료 조건이 없으면 AI가 자신의 판단으로 완료 여부를 결정하고 개발자의 기대와 다를 수 있다. 완료 조건은 **구체적이고, 측정 가능하고, 검증 가능**해야 한다.

```
# 검증 가능한 완료 조건 예시
다음 조건을 모두 만족하면 완료
1. 올바른 이메일/비밀번호로 로그인 시 JWT 토큰 반환
2. 잘못된 비밀번호로 5회 실패 시 계정 잠금 (30분)
3. 잠긴 계정으로 로그인 시도 시 423 응답과 남은 시간 표시
4. 모든 케이스에 대한 단위 테스트 통과
5. TypeScript 컴파일 에러 없음
```

| 나쁜 조건 | 문제점 | 좋은 조건 |
|---------|------|---------|
| "빠르게 동작해야 함" | "빠르게"의 기준 불명확 | "API 응답 300ms 이내" |
| "에러 처리가 잘 되어야 함" | "잘"의 기준 불명확 | "에러 시 재시도 3회 후 에러 메시지 표시" |
| "코드가 깔끔해야 함" | "깔끔"은 주관적 | "함수당 30줄 이내, 중복 코드 없음" |
| "테스트가 필요함" | 어떤 테스트? | "정상/실패/경계 케이스 각 1개 이상" |
| "잘 동작해야 함" | 완전히 모호함 | "명세의 모든 시나리오 통과" |

---

### 2.3.3 부정형 제약(Constraints) 활용

Claude가 특정 패턴을 사용하지 않게 하려면 명시적으로 금지한다. CLAUDE.md 또는 프롬프트에 다음과 같이 작성한다.

```markdown
## 금지 사항

### 절대 사용 금지
- `any` 타입 사용 금지 (unknown 또는 구체적 타입 사용)
- console.log 프로덕션 코드에 남기지 않음
- 인라인 스타일 사용 금지 (Tailwind 클래스 사용)

### 피해야 할 패턴
- 중첩 삼항 연산자 (if-else나 early return 사용)
- 매직 넘버 (상수로 정의)
- God 컴포넌트 (500줄 이상이면 분리)

### Import 규칙
- require() 금지, ES modules만 사용
- 상대 경로 `../../../` 3단계 이상 금지 (경로 별칭 사용)
```

---

## 2.4 매 단계 리뷰하기

### 2.4.1 리뷰해야 할 것들 (타입·성능·보안·가독성·테스트)

AI가 생성한 코드는 표면적으로는 완벽해 보이지만, 맥락을 완전히 이해하지 못한 채 작성된 경우가 많다. 코드 리뷰 없이 그대로 수용하면 미묘한 버그, 보안 취약점, 아키텍처 일관성 문제가 코드베이스에 쌓인다.

> 2025년 CodeRabbit 연구에 따르면, AI가 작성한 코드가 포함된 PR은 인간이 작성한 코드보다 **1.4~1.7배 더 많은 심각한 문제**를 포함했다. 비즈니스 로직 오류, 잘못된 의존성, 제어 흐름 결함, 설정 오류 등이 대표적이다.

**① 요구사항 충족 여부**

- 요청한 기능이 모두 포함되어 있는가?
- 요청하지 않은 기능이 추가되지는 않았는가?
- 엣지케이스나 예외 상황이 적절히 처리되는가?

**② 코드 품질**

- **가독성**: 변수명과 함수명이 의미를 명확하게 전달하는가?
- **일관성**: 기존 코드베이스의 컨벤션을 따르는가?
- **효율성**: 불필요한 연산이나 메모리 할당이 있는가?
- **보안**: SQL 인젝션, XSS, 불충분한 인증 처리 등 취약점은 없는가?

AI는 특히 보안 측면에서 취약한 코드를 생성하는 경향이 있다. 이 부분은 특히 주의 깊게 봐야 한다.

**③ 의도치 않은 변경**

- 요청하지 않은 파일의 수정
- **기존 테스트의 삭제나 비활성화** — 특히 경계해야 한다. AI가 새로운 기능을 구현하면서 기존 테스트가 실패하면, 테스트를 수정하는 대신 삭제하거나 비활성화하는 경우가 있다.
- 설정 파일이나 환경 변수의 변경
- 의존성(dependency)의 추가나 삭제

**리뷰에 유용한 슬래시 커맨드**

| 명령어 | 설명 | 언제 쓰는가? |
|--------|------|------------|
| `/review` | 최근 변경 코드를 PR 리뷰 수준으로 점검 | 커밋, PR 전 |
| `/simplify` | 코드 재사용, 품질 측면 검토 | 기능 구현 및 버그 수정 후 |
| `/security-review` | 변경사항 대상 보안 취약점 분석 | 보안 민감 코드 작업 후, PR 전 |

---

### 2.4.2 단계별 리뷰 습관 만들기

- **작은 작업 = 작은 리뷰**: 한 번에 500줄의 변경을 리뷰하는 것과 50줄씩 10번 리뷰하는 것은 총량은 같지만 후자가 훨씬 효과적이다. 작은 변경은 맥락을 파악하기 쉽고 문제를 발견하기도 쉽다.
- **승인 전 실행**: 코드를 승인하기 전에 반드시 실행해본다. AI가 생성한 코드는 문법적으로 올바르더라도 논리적으로 틀릴 수 있다.
- **테스트 먼저**: 기존 테스트가 모두 통과하는지 확인하고, 새로운 기능에 대한 테스트가 제대로 동작하는지 확인한다. 테스트가 통과해야 다음 작업으로 넘어간다.
- **질문하기**: 이해가 안 되는 부분이 있으면 AI에게 설명을 요청한다. "이 함수에서 왜 이 방식을 선택했어?", "더 간단한 방법은 없을까?"

---

### 2.4.3 리뷰 워크플로와 되돌리기 (`/diff` · `/rewind`)

**리뷰 워크플로**

```
요청 작성 → AI 코드 생성 → 코드 리뷰 → 테스트 실행
     ↑                                        |
     |            문제 발생 시                 |
     └── 수정 요청 or 되돌리기 ←──────────────┘
                                     문제 없으면 커밋
```

**되돌리기 전략**

AI와 작업할 때 '되돌리기'는 패배가 아니라 전략적 선택이다.

```bash
# ① 작업 단위로 자주 커밋
git add .
git commit -m "feat: 사용자 입력 검증 함수 추가"

# ② 문제 발생 시 직전 커밋으로 되돌리기
git reset --hard HEAD~1

# ③ 실험적 작업은 별도 브랜치에서
git checkout -b feature/try-new-approach
```

**`/rewind` — 컨텍스트·코드 동시 롤백 (v2.0+, 4가지 모드)**

`/rewind`는 Claude Code v2.0에 도입된 핵심 기능이다. **Esc 키를 두 번 빠르게** 누르거나 `/rewind` 슬래시 커맨드로 진입한다. 2026년 업데이트로 다음 4가지 모드를 선택할 수 있다.

| 모드 | 설명 | 사용 시점 |
|------|------|---------|
| Restore code and conversation | 코드와 대화를 모두 직전 지점으로 되돌림 | 방향 자체가 잘못된 경우 |
| Restore conversation only | 코드는 유지, 대화 히스토리만 되돌림 | 코드는 좋은데 다시 묻고 싶을 때 |
| Restore code only | 코드만 직전 상태로, 대화는 유지 | 실험적 리팩터링 시도 |
| Summarize from here | 이 지점부터 이후 내용을 요약 압축 | 컨텍스트가 너무 길어진 경우 |

> **주의**: `/rewind`는 Claude Code가 내부 도구로 변경한 파일만 추적한다. `!bash` 등으로 직접 실행한 외부 명령(`mv`, `rm` 등) 변경분이나 IDE에서 수동 편집한 변경분은 복원되지 않는다. 중요한 변경은 반드시 Git 커밋으로 백업한다.  
> 출처: [docs.claude.com — Claude Code v2 release notes](https://docs.claude.com/en/docs/claude-code), [claudelog.com/mechanics/rewind](https://claudelog.com/mechanics/rewind/)

**커밋 메시지 prefix 규칙 (Conventional Commits 변형)**

| 타입 | 용도 |
|------|------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없이 코드 개선 |
| `db` | 스키마, 마이그레이션, 쿼리 변경 |
| `api` | API 엔드포인트 추가/수정 |
| `ui` | 프런트엔드 UI 변경 |
| `test` | 테스트 코드 추가/수정 |
| `docs` | 문서, 주석 추가/수정 |

> **Tip**: 깃 커밋 전 명령어와 프로세스를 본인에게 맞게 조정하고 커밋 전 리뷰 습관을 들여야 AI가 작성한 코드 오류를 줄일 수 있다. Claude Code에게 커밋 메시지 생성 스크립트를 작성하게 하면 반자동화도 가능하다(검토 단계는 반드시 거쳐야 하므로 반자동화 권장).

---

## 2.5 개발 방법론 비교와 프로젝트 구조 설정

### 2.5.1 `/init`으로 CLAUDE.md 자동 생성

새 프로젝트를 시작할 때 가장 먼저 실행해야 하는 명령어다.

```bash
> /init
```

Claude가 프로젝트를 분석해 **CLAUDE.md** 파일을 자동 생성한다. 매 세션 시작 시 이 파일이 자동으로 로드되어 Claude가 프로젝트의 맥락을 이해하고 응답하게 된다.

**CLAUDE.md의 역할**

새로운 동료가 팀에 합류했을 때를 생각해보자. 프로젝트 구조, 코딩 컨벤션, 배포 방법 등을 하나하나 설명해야 한다. CLAUDE.md는 Claude에게 이 역할을 하는 온보딩 문서다.

```markdown
# TaskFlow API
사용자 태스크 관리를 위한 REST API 백엔드. Express + TypeScript + PostgreSQL 기반.

## 핵심 명령어
npm run dev          # 개발 서버 (포트 3000)
npm run test         # Jest 테스트 전체 실행
npm run lint         # ESLint 검사
npm run typecheck    # TypeScript 타입 검사

## 디렉터리 구조
- `src/routes/` - Express 라우터
- `src/services/` - 비즈니스 로직
- `src/models/` - Prisma 모델

## 코딩 규칙
- 모든 함수에 TypeScript 타입 명시
- 새 기능은 반드시 테스트 작성
- API 응답은 표준 형식: `{ success, data, error }`

## 금지
- any 타입 사용 금지
- console.log 커밋 금지 (logger 사용)
- 동기 파일 I/O 금지
```

**CLAUDE.md 파일 위치별 공유 범위**

| 유형 | 위치 | 공유 범위 |
|------|------|---------|
| 프로젝트 메모리 | `[프로젝트]/CLAUDE.md` | 팀 (Git 커밋) |
| 사용자 메모리 | `~/.claude/CLAUDE.md` | 본인만 |
| 프로젝트 로컬 | `[프로젝트]/CLAUDE.local.md` | 본인만 (.gitignore) |

**로드 순서 (우선순위)**

```
[세션 시작 시 자동 로드]
1. ~/.claude/CLAUDE.md                   ← 사용자 전역 설정
2. /home/user/myproject/CLAUDE.md        ← 프로젝트 설정
3. /home/user/myproject/CLAUDE.local.md  ← 개인 프로젝트 설정

[파일 작업 시 조건부 로드]
4. .claude/rules/*.md  ← paths 패턴과 일치하는 파일 작업 시
```

나중에 로드된 설정이 이전 설정을 덮어쓴다. 숫자가 클수록 우선순위가 높다.

> **주의**: CLAUDE.md는 'context, not enforcement'다. Anthropic 공식 문서도 이렇게 명시한다. 중요한 규칙은 CLAUDE.md에만 의존하지 말고 Hook으로 강제하는 것이 실무적으로 권장된다.  
> 참고 연구 (지시 준수 신뢰성): [arxiv.org/abs/2505.06120](https://arxiv.org/abs/2505.06120)

**`.claude/rules/` 디렉터리 — 경로 기반 자동 컨텍스트 주입**

CLAUDE.md가 프로젝트 전체에 적용되는 설정이라면, rules 파일들은 특정 파일이나 디렉터리에서 작업할 때만 자동으로 활성화된다.

```yaml
# .claude/rules/api-routes.md
---
paths:
  - "src/api/**/*.ts"
---

# API 개발 규칙

## 응답 형식
모든 API는 다음 형식으로 응답한다:
{ "success": boolean, "data": any | null, "error": string | null }

## 에러 처리
- 비즈니스 로직 에러: 400번대
- 서버 에러: 500번대

## 유효성 검사
- 모든 입력은 zod 스키마로 검증
- 스키마 파일은 src/schemas/에 위치
```

이렇게 설정하면 `src/api/` 하위 TypeScript 파일 작업 시에만 이 규칙이 적용된다. 컨텍스트 효율성이 좋아져 토큰을 절약하고, 영역별 규칙을 독립적으로 관리할 수 있다.

권장 분량은 **50~200 라인**. 길어지면 `@import`로 분리하거나 `.claude/rules/` 디렉터리를 활용한다.

**Glob 패턴 기본 문법**

| 패턴 | 설명 | 예시 |
|------|------|------|
| `*` | 파일명의 모든 문자 | `*.ts` → 모든 .ts 파일 |
| `**` | 모든 디렉터리 (재귀) | `src/**/*.ts` → src 하위 모든 .ts |
| `{a,b}` | OR 패턴 | `*.{ts,tsx}` → .ts 또는 .tsx |
| `!` | 제외 | `!*.test.ts` → 테스트 파일 제외 |

**참고 템플릿**: [github.com/claude-code-expert/example/tree/main/template](https://github.com/claude-code-expert/example/tree/main/template)

---

### 2.5.2 Kent Beck의 증강코딩 (Augmented Coding)

테스트 주도 개발(TDD)의 창시자 켄트 벡이 2025년 AI 코딩 도구의 급속한 발전을 지켜보며 제시한 개념이다. BPlusTree3 프로젝트(B+ Tree 라이브러리를 Rust·Python으로 구현)를 통해 이 방법론을 실제로 탐구하고 문서화했다.

> "증강코딩에서는 코드의 품질, 복잡도, 테스트, 커버리지까지 신경 쓴다. 손으로 직접 코드를 작성할 때와 동일한 가치 체계를 유지하면서, 타이핑을 AI가 대신해줄 뿐이다."  
> — Kent Beck, 2025년 6월 25일  
> 출처: [tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes) ✅

**바이브 코딩 vs 증강코딩**

| 항목 | 바이브 코딩 | 증강코딩 |
|------|-----------|---------|
| 코드 관심 | 동작에만 집중 | 품질·복잡도·테스트까지 |
| 에러 대응 | 에러 메시지를 AI에게 그냥 던짐 | 원인 분석 후 명확하게 지시 |
| 기준 | 어떻게든 동작하면 그만 | 손으로 쓸 때와 동일한 가치 체계 |

**AI가 궤도를 이탈하고 있다는 3가지 경고 신호**

켄트 벡이 BPlusTree3 프로젝트를 통해 발견한 패턴이다.

1. **루프(Loops)**: AI가 비슷한 작업을 반복하면서 실질적인 진전이 없는 현상. "지니가 몇 시간 동안 빙빙 돌면서 다음 기능을 올바르게 구현하지 못하는" 상태.
2. **요청하지 않은 기능 추가**: 지시하지 않은 영역까지 과도하게 코드 추가. 통제되지 않으면 복잡성이 급격히 증가한다.
3. **치팅 징후**: 가장 위험한 신호. AI가 테스트를 통과시키기 위해 테스트 자체를 비활성화하거나 삭제한다.

**Make it work, Make it right, Make it fast**

켄트 벡의 원칙은 AI 시대에도 여전히 유효하다.

- **Make it work**: 작은 범위에서 일단 동작하게 만든다
- **Make it right**: 리뷰를 통해 제대로 정리한다 (리팩터링)
- **Make it fast**: 필요시 최적화한다

**Small, Safe Steps — 작고 안전한 단계**

```
# 좋은 예: 작고 안전한 단계
1단계: "사용자 입력을 받는 함수를 작성해줘. 테스트 먼저."
       → 테스트 작성 → 구현 → 검증

2단계: "입력값을 검증하는 로직을 추가해줘. 테스트 먼저."
       → 테스트 작성 → 구현 → 검증

# 나쁜 예: 크고 위험한 단계
"사용자 입력을 받아서 검증하고, DB에 저장하고,
 성공하면 이메일을 보내고, 실패하면 로그를 남기는 기능을 만들어줘."
→ 어디서 문제가 생겼는지 파악하기 어려움
→ 되돌리기 어려움
→ 복잡성이 한 번에 폭발
```

---

### 2.5.3 증강 코딩을 이용한 개발 과정 워크플로우와 TDD — Red · Green · Refactor 사이클

**AI는 왜 TDD를 무시하는가**

AI 코딩 도구들은 TDD 사이클(Red → Green → Refactor)을 지키도록 훈련되어 있지 않다. 벤치마크 최적화를 위해 '완성된 코드'를 한 번에 생성하는 방향으로 학습되어 있기 때문이다.

AI가 TDD를 무시하는 대표적인 패턴:

```
# 패턴 1: 테스트 없이 구현 먼저
개발자: "사용자 인증 기능을 구현해줘"
AI 반응: 바로 AuthService.ts, UserRepository.ts, 각종 미들웨어 생성
        → "테스트는 나중에 추가할 수 있습니다"로 마무리

# 패턴 2: 테스트와 구현 동시 생성
개발자: "TDD로 진행해줘"
AI 반응: 테스트 파일과 구현 파일을 동시에 생성
        → "Red" 단계 없으므로 테스트의 유효성 검증 불가
```

**명시적으로 TDD 사이클 요청하기**

```
# 1단계: Red — 실패하는 테스트만 작성
"createUser 함수에 대한 실패하는 테스트를 먼저 작성해줘.
 구현은 하지 마. 테스트만 작성해."

# 2단계: Green — 최소 구현
"방금 작성한 테스트를 통과시키는 최소한의 코드를 작성해줘.
 추가 기능은 넣지 마."

# 3단계: Refactor — 정리
"테스트가 통과하는 상태를 유지하면서 코드를 리팩터링 해줘.
 새로운 기능은 추가하지 마."
```

**TDD 강제하는 CLAUDE.md 규칙**

```markdown
## TDD 필수 규칙

### Red-Green-Refactor 사이클
1. **Red**: 먼저 실패하는 테스트를 작성한다
   - 테스트가 실제로 실패하는지 확인
2. **Green**: 테스트를 통과시키는 최소한의 코드 작성
   - 하드코딩도 허용 (다음 테스트가 일반화를 강제)
3. **Refactor**: 테스트가 통과하는 상태에서 코드 개선
   - 중복 제거, 명확한 이름 사용

### 금지 사항
- ❌ 테스트 없이 구현 코드 작성
- ❌ 테스트와 구현을 동시에 작성
- ❌ 테스트 skip 또는 주석 처리
- ❌ 실패 원인 분석 없이 테스트 수정
```

**슬래시 커맨드로 TDD 워크플로 자동화**

```markdown
<!-- .claude/commands/tdd-red.md -->
# TDD Red Phase

다음 기능에 대한 **실패하는 테스트만** 작성해주세요: $ARGUMENTS

## 규칙
1. 구현 코드는 절대 작성하지 않음
2. 테스트 파일만 생성 또는 수정
3. 테스트가 실패하는 이유를 설명
4. 테스트 실행하여 실패 확인
```

```markdown
<!-- .claude/commands/tdd-green.md -->
# TDD Green Phase

가장 최근에 작성한 실패하는 테스트를 **최소한의 코드로** 통과시켜주세요.

## 규칙
1. 테스트를 통과시키는 최소한의 코드만 작성
2. 하드코딩도 허용 (다음 테스트가 일반화를 강제)
3. 추가 기능이나 "미래를 위한" 코드 금지
```

```bash
# 사용 예
/tdd-red 이메일 검증 함수
/tdd-green
/tdd-refactor
```

**Hook을 활용한 자동 테스트 실행**

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm test -- --findRelatedTests $CLAUDE_FILE_PATH --passWithNoTests",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

Claude가 TypeScript 파일을 수정할 때마다 관련 테스트를 자동으로 실행해 회귀를 즉시 감지한다. 이는 AI의 비결정적 특성에 대응하는 실질적인 안전망이다.

**명세 역할을 하는 테스트**

TDD에서 테스트는 단순히 코드를 검증하는 도구가 아니다. 테스트는 동작을 확인하고 요구사항을 검증하는 **명세(Specification)**다. AI에게 작업을 요청할 때 테스트 코드를 함께 제공하면 요구사항이 훨씬 명확해진다.

```
# 나쁜 요청 (모호함)
"TODO 앱의 할 일 목록 기능을 구현해줘"

# 좋은 요청 (테스트가 명세 역할)
"다음 테스트를 통과하는 TodoList 클래스를 구현해줘:

describe('TodoList', () => {
  it('새로운 할 일을 추가하면 목록에 나타난다', () => {
    const todoList = new TodoList();
    todoList.addTodo({ title: '우유 사기', priority: 'high' });

    expect(todoList.items).toHaveLength(1);
    expect(todoList.items[0].title).toBe('우유 사기');
    expect(todoList.items[0].completed).toBe(false);
  });
});"
```

---

### 2.5.4 SDD: Spec-Driven Development (SpecKit을 통한 제어)

**SDD란 무엇인가**

Spec-Driven Development(SDD)는 설계를 구현과 분리하는 워크플로다. 코드를 바로 생성하는 대신, 명세(Specification) 문서를 먼저 작성하고 검토·승인한 후 구현 단계로 넘어간다.

```
Specify → Plan → Implement → Validate
(명세)   (계획)  (구현)      (검증)
```

**SpecKit — GitHub의 공식 SDD 도구**

GitHub이 2025년 9월 2일 공식 오픈소스로 공개한 SDD 툴킷이다.

- GitHub 저장소: [github.com/github/spec-kit](https://github.com/github/spec-kit) ✅
- GitHub Blog 발표: [github.blog — spec-driven-development](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) ✅
- Martin Fowler 분석: [martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) ✅

> **주의**: PyPI에 비공식 동명 패키지가 있을 수 있으므로 반드시 GitHub에서 직접 설치한다.

```bash
# SpecKit 설치 (GitHub 공식 설치 방법, 2026-05 기준)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# 또는 특정 버전 고정 (재현성이 필요한 경우)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.8.1

# 프로젝트 초기화
specify init my-app --ai claude
```

**SpecKit 슬래시 커맨드 체인**

각 문서는 이전 문서를 참조한다. plan은 spec을, tasks는 spec과 plan을 모두 참조한다.

```bash
/speckit.constitution    # 프로젝트 원칙 수립 (불변 원칙)
/speckit.specify         # 요구사항 명세 (spec.md)
/speckit.clarify         # 모호한 요구사항 명확화 (선택, plan 전 권장)
/speckit.checklist       # 명세 품질 검증 (선택, "영어로 쓴 단위 테스트")
/speckit.plan            # 기술 구현 계획 (plan.md)
/speckit.tasks           # 태스크 분해 (tasks.md)
/speckit.analyze         # 산출물 간 일관성 검증 (선택, implement 전)
/speckit.implement       # 태스크별 구현
```

> 출처: [marktechpost — Meet GitHub Spec-Kit (2026-05-08)](https://www.marktechpost.com/2026/05/08/meet-github-spec-kit-an-open-source-toolkit-for-spec-driven-development-with-ai-coding-agents/)

**SpecKit 디렉터리 구조**

```
project-name/
├── .specify/
│   ├── memory/
│   │   └── constitution.md       # 프로젝트 원칙 (불변)
│   └── specs/
│       └── 001-feature-name/
│           ├── spec.md           # 요구사항
│           ├── plan.md           # 기술 계획
│           ├── tasks.md          # 태스크 분해
│           ├── data-model.md     # 데이터 모델
│           ├── research.md       # 사전 조사
│           └── quickstart.md     # 빠른 시작
└── [application code]
```

> 출처: [github.com/github/spec-kit README](https://github.com/github/spec-kit) (2026-05 확인, v0.8.1 기준)

**CLAUDE.md와 SpecKit 연동 — 자동 연결이 아니므로 직접 설정 필요**

SpecKit과 Claude Code는 자동으로 연결되지 않는다. CLAUDE.md에 SpecKit의 어휘와 구조를 명시해야 Claude가 세션 간에 일관되게 동작한다.

```markdown
<!-- CLAUDE.md -->
## SpecKit 워크플로
이 프로젝트는 SpecKit SDD 방법론을 따른다.
- constitution: `.specify/memory/constitution.md` — 모든 구현에 적용할 원칙
- 기능 명세: `.specify/specs/[번호]-[기능명]/`
- 구현 전 반드시 spec.md → plan.md → tasks.md 순서로 검토

## 완료 조건
- 모든 acceptance criteria 충족
- 관련 테스트 통과
- constitution.md 원칙 위반 없음
```

**SDD를 사용하면 좋은 상황**

- 여러 파일에 걸친 멀티세션 기능 개발
- 팀 전원이 동일한 AI 행동 기준이 필요할 때
- 범위를 코드 작성 전에 확정해야 할 때
- 레거시 시스템 현대화 (원래 의도를 spec으로 포착 후 재구현)

**SDD를 건너뛰어도 되는 상황**

- 단일 파일 버그 수정
- 포맷팅 변경
- 한 번의 프롬프트로 처리 가능한 CRUD 작업

> **참고**: SDD는 단기적으로 개발 속도를 높이지 않는다. 단, **예측 가능성**을 높인다. 범위가 코드 작성 전에 정의되고, 엣지케이스가 버그가 되기 전에 명세에 포함된다.

---

### 2.5.5 프로젝트 구조 설계 및 살펴보기

이 책의 실습 프로젝트인 brewnet(Next.js + Drizzle ORM 기반)을 기준으로 한 전체 디렉터리 구조 예시다.

```
my-project/
├── CLAUDE.md                          # 프로젝트 개요 (기술스택, API 명세)
├── AGENTS.md                          # 에이전트 공용 지침 (선택 — 아래 참조)
├── CLAUDE.local.md                    # 개인 설정 (.gitignore에 추가)
│
├── .claude/
│   ├── CLAUDE.md                      # 상세 코딩 컨벤션
│   ├── settings.json                  # 팀 공유 설정 ✅ Git 커밋
│   ├── settings.local.json            # 개인 설정 ❌ Git 제외
│   │
│   ├── commands/
│   │   ├── deploy.md                  # /deploy 커맨드
│   │   └── migrate.md                 # /migrate 커맨드
│   │
│   ├── agents/
│   │   └── todo-crud.md               # TODO CRUD 서브에이전트
│   │
│   ├── skills/
│   │   ├── react-component/
│   │   │   ├── SKILL.md
│   │   │   └── templates/
│   │   └── express-api/
│   │       ├── SKILL.md
│   │       └── templates/
│   │
│   └── rules/
│       ├── api-routes.md              # src/api/**/*.ts 작업 시 자동 적용
│       └── component-rules.md         # src/components/**/*.tsx 작업 시 자동 적용
│
├── frontend/
│   └── src/
│       └── components/
│           └── TodoItem/
│               ├── index.tsx
│               ├── TodoItem.styles.ts
│               ├── TodoItem.types.ts
│               └── __tests__/
│
├── backend/
│   └── src/
│       ├── controllers/
│       ├── routes/
│       └── models/
│
└── package.json
```

**파일별 역할 요약**

| 파일 | Git | 용도 |
|------|-----|------|
| `CLAUDE.md` (루트) | ✅ | 프로젝트 개요, 도메인 모델, API 명세 |
| `.claude/CLAUDE.md` | ✅ | 코딩 컨벤션, 네이밍 규칙, 금지 사항 |
| `settings.json` | ✅ | TS 설정, 린트 규칙, 공유 Hook |
| `settings.local.json` | ❌ | 로컬 DB URL, 개인 환경설정 |
| `rules/api-routes.md` | ✅ | `src/api/**` 작업 시 자동 적용 |
| `CLAUDE.local.md` | ❌ | 개인 테스트 URL, 샌드박스 설정 |

**AGENTS.md — 모든 에이전트를 위한 표준 문서**

CLAUDE.md는 Claude Code 전용이다. 팀이 여러 AI 도구(Cursor, GitHub Copilot, Gemini CLI 등)를 함께 사용한다면 AGENTS.md 표준을 활용하면 좋다.

AGENTS.md는 2025년 8월 OpenAI 주도로 Google·Factory·Sourcegraph·Cursor 등의 협업으로 등장한 오픈 표준이다. 현재 **60,000개 이상**의 오픈소스 프로젝트에서 사용 중이며, Agentic AI Foundation(Linux Foundation 산하)이 관리한다.

- 공식 사이트: [agents.md](https://agents.md) ✅
- GitHub 저장소: [github.com/agentsmd/agents.md](https://github.com/agentsmd/agents.md) ✅

```markdown
<!-- CLAUDE.md — AGENTS.md 참조 방식 (권장) -->
# CLAUDE.md

## 프로젝트 지침
@AGENTS.md 를 반드시 읽고 지침을 따를 것.

## Claude Code 전용 설정
- 코드 수정 전 반드시 관련 테스트를 먼저 실행할 것
- 대규모 변경은 서브에이전트를 활용할 것
```

혼자 하거나 소규모 프로젝트라면 CLAUDE.md로 충분하다. 모노레포나 여러 AI 도구를 혼용한다면 AGENTS.md를 먼저 작성하고 CLAUDE.md에서 참조하는 방식을 권장한다. 도구가 바뀌더라도 AGENTS.md 기반이라면 마이그레이션에 문제가 없다.

---

### 2.5.6 Git · 린트 · 포맷터 표준화

**Git 설정**

```bash
# 브랜치 전략
git checkout -b feature/기능명   # 기능 개발
git checkout -b fix/버그명       # 버그 수정

# PR 전 필수 통과
npm run lint && npm run test
```

**린트 · 포맷터 설정 (TypeScript + React 기준)**

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": "warn"
  }
}
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100
}
```

**Claude Code settings.json에 포맷·린트 자동화 추가**

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $CLAUDE_FILE_PATH 2>/dev/null || true",
            "timeout": 30
          },
          {
            "type": "command",
            "command": "npx eslint --fix $CLAUDE_FILE_PATH 2>/dev/null || true",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

---

### 2.5.7 [실습] HTML · CSS 학습 사이트 — 32가지 UI 컴포넌트 고도화

지금까지 배운 **5대 원칙(설계 우선 · 작은 단위 분해 · 명확한 지시 · 매 단계 리뷰 · 개발 방법론 적용)** 을 모두 한 번에 실습하는 프로젝트다. 결과물은 **32가지 UI 컴포넌트를 모은 HTML·CSS 학습 사이트**다.

이 사이트는 본 강의의 LEVEL 3 이후에도 계속 확장된다.

- **LEVEL 2 (이번 절)**: Vanilla HTML + CSS로 32개 컴포넌트 기본 구현
- **LEVEL 4**: Tailwind CSS v4 + shadcn/ui로 마이그레이션
- **LEVEL 5**: TanStack Query + CodeMirror 6로 인터랙티브 학습 환경 추가

#### 🎯 학습 목표

1. CLAUDE.md 한 장으로 **AI가 일관된 결과물**을 만들도록 통제하는 방법을 체득한다.
2. **컴포넌트 단위 분해(2.2)** 와 **명확한 지시(2.3)** 를 실전에서 적용한다.
3. **/review · /rewind(2.4)** 로 리뷰·되돌리기 사이클을 손에 익힌다.
4. **TDD(2.5.3)** 또는 **SDD(2.5.4)** 중 적합한 방법론을 선택해 컴포넌트를 만든다.

#### 📋 만들 32가지 컴포넌트 카탈로그

본 강의에서 만들 32가지 컴포넌트다. **카테고리별로 묶어 동일 카테고리는 한 세션에서 일괄 작업**하면 컨텍스트 효율이 좋다.

| 카테고리 | 컴포넌트 (개수) |
|---------|---------------|
| **버튼 (4)** | Primary Button · Secondary Button · Icon Button · Loading Button |
| **입력 (5)** | Text Input · Textarea · Select · Checkbox · Radio Group |
| **표시 (5)** | Badge · Tag · Avatar · Tooltip · Progress Bar |
| **레이아웃 (4)** | Card · Modal · Accordion · Tabs |
| **피드백 (3)** | Alert · Toast · Skeleton Loader |
| **네비게이션 (4)** | Navbar · Breadcrumb · Pagination · Sidebar |
| **데이터 (4)** | Table · List · Empty State · Stat Card |
| **고급 (3)** | Dropdown Menu · Date Picker · File Upload |

> **왜 32개인가**: 실무에서 자주 쓰이는 가장 작은 단위들이다. 더 적으면 학습 효과가 부족하고, 더 많으면 관리 부담이 커진다. shadcn/ui와 같은 메이저 라이브러리의 핵심 컴포넌트 수와 비슷하다.

#### 🏗️ 1단계 — 프로젝트 초기화

```bash
# 디렉터리 생성
mkdir ui-components-lab && cd ui-components-lab

# Git 초기화
git init && echo "node_modules\n.env\ndist" > .gitignore

# Claude Code 실행 (acceptEdits로 시작 — 1.3.3 참고)
claude --permission-mode acceptEdits
```

```
> /init
```

`/init`이 만들어준 `CLAUDE.md` 초안을 다음과 같이 보완한다.

```markdown
<!-- CLAUDE.md -->
# UI Components Lab — HTML·CSS 학습 사이트

32가지 UI 컴포넌트를 직접 만들면서 HTML과 CSS의 기본기를 다지는
학습용 정적 사이트.

## 기술 스택
- HTML5 (시맨틱 마크업)
- CSS3 (커스텀 프로퍼티, Flexbox, Grid)
- Vanilla JavaScript (ES2024) — 인터랙션이 필요한 컴포넌트에만 사용
- **빌드 도구 없음** (live-server만 사용)

## 디렉터리 구조
- `index.html` - 컴포넌트 갤러리 홈
- `components/<카테고리>/<컴포넌트명>/index.html` - 각 컴포넌트 데모
- `components/<카테고리>/<컴포넌트명>/style.css` - 컴포넌트 전용 스타일
- `assets/tokens.css` - 디자인 토큰 (색상·간격·타이포)

## 코딩 규칙
- 모든 색상은 `--color-*` 커스텀 프로퍼티로만 사용한다 (하드코딩 금지)
- 모든 간격은 `--space-*` 토큰을 따른다 (4·8·12·16·24·32·48px)
- 컴포넌트는 BEM 명명 규칙을 따른다 (`block__element--modifier`)
- 접근성: 모든 인터랙티브 요소는 키보드로 조작 가능해야 한다
- 다크모드: `prefers-color-scheme: dark` 미디어 쿼리로 자동 전환

## 금지 사항
- 인라인 스타일 (`style="..."`) 절대 금지
- `!important` 사용 금지 (재정의가 필요하면 BEM modifier로)
- jQuery·Bootstrap 등 외부 라이브러리 도입 금지
- 한 컴포넌트 CSS 파일 200줄 초과 시 분리

## 완료 조건 (모든 컴포넌트 공통)
1. `<카테고리>/<컴포넌트명>/index.html`에 데모 페이지가 있다
2. 다크/라이트 모드 모두에서 정상 표시된다
3. 키보드 Tab으로 포커스 이동 가능 (인터랙티브한 경우)
4. 모바일(375px)·데스크톱(1280px)에서 깨짐 없이 표시된다
```

#### 🎨 2단계 — 디자인 토큰 먼저 정의

개별 컴포넌트보다 디자인 토큰을 **먼저** 만든다. 토큰이 있으면 32개 컴포넌트가 일관된 외관을 갖는다.

```
> 다음 요구사항으로 assets/tokens.css 파일을 만들어줘.
>
> [목표]
> 32개 컴포넌트가 공유할 디자인 토큰을 CSS 커스텀 프로퍼티로 정의
>
> [필수 토큰]
> - 색상: primary, secondary, success, warning, danger, neutral (각 50~900 단계)
> - 간격: --space-1 (4px) ~ --space-12 (48px)
> - 타이포: --text-xs, --text-sm, --text-base, --text-lg, --text-xl, --text-2xl
> - 그림자: --shadow-sm, --shadow-md, --shadow-lg
> - 둥근 모서리: --radius-sm (4px) ~ --radius-full (9999px)
>
> [제약]
> - 다크모드 대응: prefers-color-scheme: dark에서 색상 토큰 재정의
> - 토큰 외 하드코딩된 색상 절대 금지
>
> [완료 조건]
> - tokens.css 단독으로 import 가능
> - 라이트/다크 모드 자동 전환 동작 확인
```

`/review`로 즉시 점검한다.

```
> /review

# 또는 명시적으로
> 방금 만든 tokens.css에 다음을 확인해줘:
> 1. 색상 단계가 50~900까지 모두 있는가
> 2. 다크모드 미디어 쿼리가 모든 의미 토큰을 재정의하는가
> 3. 누락된 토큰이 있는가
```

#### 🧩 3단계 — 컴포넌트 1개씩, 카테고리 단위로

**한 번에 하나의 컴포넌트만(2.2.1)**, 단 **같은 카테고리는 묶어서**(컨텍스트 절약).

```
> components/buttons/ 디렉터리를 만들고
> 다음 4가지 버튼 컴포넌트의 각 데모 페이지를 만들어줘.
>
> [목표]
> 1. primary-button: 기본 강조 버튼 (호버·포커스·비활성화 상태 포함)
> 2. secondary-button: 보조 버튼 (테두리 있음, 배경 투명)
> 3. icon-button: 아이콘만 있는 정사각형 버튼 (SVG 아이콘 인라인)
> 4. loading-button: 로딩 스피너가 포함된 버튼 (CSS 애니메이션)
>
> [공통 제약]
> - tokens.css의 디자인 토큰만 사용
> - 각 컴포넌트는 별도 폴더로 분리: buttons/primary-button/{index.html, style.css}
> - 데모 페이지는 모든 상태(default/hover/focus/disabled)를 시각화
> - 키보드 접근성: tabindex 사용 시 의도 명시, focus-visible 스타일 필수
>
> [완료 조건]
> - 4개 모두 라이트·다크 모드에서 정상 표시
> - 키보드 Tab으로 포커스 이동 가능
> - 색상·간격·둥근 모서리가 모두 토큰을 통해 정의됨
```

생성이 끝나면 **반드시** 다음을 수행한다.

```
# 보안·접근성 리뷰
> /security-review

# 코드 단순화 점검
> /simplify

# 결과 확인 (브라우저 또는 live-server)
> !npx live-server components/buttons/primary-button
```

문제가 발견되면 `/rewind`로 직전 단계까지 되돌리고 명세를 조정한다.

#### 🔁 4단계 — TDD 또는 SDD 적용 (선택)

**TDD 적용 — 인터랙티브 컴포넌트에 적합**

JavaScript 동작이 있는 컴포넌트(Modal, Tabs, Dropdown 등)는 TDD가 효과적이다.

```
> /tdd-red Modal 컴포넌트의 open() · close() 함수에 대한 실패하는 테스트

> /tdd-green

> /tdd-refactor
```

**SDD 적용 — 컴포넌트 묶음을 한 번에 만들 때**

```bash
specify init ui-lab --ai claude

> /speckit.constitution

> /speckit.specify
> "32개 UI 컴포넌트를 카테고리 단위로 분리한 정적 학습 사이트.
>  각 컴포넌트는 독립 폴더, 디자인 토큰 단일 출처, 다크모드 대응."

> /speckit.plan
> "기술 스택: Vanilla HTML/CSS/JS, 빌드 도구 없음, live-server만 사용"

> /speckit.tasks
> /speckit.checklist
> /speckit.implement
```

#### 📊 5단계 — 갤러리 홈 페이지

32개 컴포넌트가 한 화면에 모이는 홈을 마지막에 만든다.

```
> index.html을 만들어줘.
>
> [목표]
> 32개 컴포넌트 데모 페이지로 이동할 수 있는 인덱스 페이지
>
> [요구사항]
> - 카테고리별로 섹션 분리 (버튼/입력/표시/레이아웃/피드백/네비게이션/데이터/고급)
> - 각 카테고리는 카드 그리드로 컴포넌트 미리보기 표시
> - 카드 클릭 시 해당 컴포넌트 데모 페이지로 이동
> - 검색창: 컴포넌트 이름으로 필터링 (Vanilla JS)
>
> [제약]
> - tokens.css만 import (외부 라이브러리 금지)
> - 모바일·데스크톱 반응형
> - 다크모드 토글 버튼 (localStorage 저장)
```

#### ✅ 6단계 — 최종 검증 체크리스트

| 항목 | 확인 방법 |
|------|---------|
| 32개 컴포넌트 모두 존재 | `ls components/*/` |
| 다크/라이트 모드 모두 정상 | 브라우저 DevTools에서 prefers-color-scheme 토글 |
| 키보드 접근성 | Tab 키만으로 모든 인터랙션 가능 |
| 모바일 반응형 | DevTools 디바이스 모드 375px·768px·1280px 확인 |
| 코드 리뷰 통과 | `/review` 결과 critical 이슈 0건 |
| 보안 리뷰 통과 | `/security-review` 결과 high 이슈 0건 |
| CLAUDE.md 금지 사항 위반 0건 | 인라인 스타일·`!important`·jQuery 검색해서 없는지 확인 |

#### 🎓 회고 — 5대 원칙이 어떻게 작동했는가

| 원칙 (절) | 이 실습에서 어떻게 적용됐는가 |
|----------|---------------------------|
| 설계 우선 (2.1) | tokens.css 먼저 만들고 컴포넌트 시작. 잘못 시작하면 32개를 모두 다시 만들 뻔했다 |
| 작은 단위 분해 (2.2) | 32개를 4~5개씩 카테고리로 묶어 진행. 한 번에 전부 만들기 절대 금지 |
| 명확한 지시 (2.3) | 매 요청에 [목표]·[제약]·[완료 조건] 5요소 포함 |
| 매 단계 리뷰 (2.4) | 카테고리 단위로 `/review` → `/security-review` → 문제 시 `/rewind` |
| 방법론 (2.5) | 인터랙티브 컴포넌트는 TDD, 카테고리 묶음은 SDD |

> **다음 단계 예고**: LEVEL 3에서는 Skills · Commands · Hooks · Prompts · Context의 5가지 Claude Code 시스템을 본격적으로 다룬다. 이번에 만든 32개 컴포넌트는 LEVEL 4에서 **Tailwind CSS v4 + shadcn/ui**로 마이그레이션하면서 **TanStack Query·CodeMirror 6**까지 결합해 진짜 학습 사이트로 발전한다.

[스크린샷 영역: 완성된 32개 컴포넌트 갤러리 홈 — 카테고리별 카드 그리드 + 다크모드 토글]

---

## 📋 LEVEL 2 핵심 요약

| 항목 | 핵심 내용 |
|------|---------|
| 설계의 중요성 | AI가 빠를수록 방향 수정 비용이 커진다. 요구사항→아키텍처→인터페이스를 먼저 정의한다 |
| Taste | AI는 '작동하는 코드'를 만들고, 개발자는 '좋은 코드'를 판단한다 |
| 비결정성 대응 | 테스트가 AI 비결정성의 결정적 검문소다 |
| 작업 단위 | 10분 내 검증 가능한 크기. 단일 책임 원칙 |
| 명확한 지시 | 목표·맥락·제약조건·완료조건·예시 5요소를 명시한다 |
| 매 단계 리뷰 | `/review`, `/security-review`, `/rewind` 활용 |
| `/rewind` 4모드 | 코드+대화 / 대화만 / 코드만 / 이후 요약 (Esc 두 번 또는 슬래시) |
| CLAUDE.md | `/init` 자동 생성 후 점진적 발전. `.claude/rules/`로 경로 기반 분리 |
| 증강코딩 | 켄트 벡의 원칙: Small Safe Steps + TDD + Tidy First + Constrain Context + Preserve Optionality |
| SDD / SpecKit | constitution → specify → clarify → plan → tasks → analyze → implement |
| TDD 슬래시 커맨드 | `/tdd-red`, `/tdd-green`, `/tdd-refactor`로 사이클 강제 |
| **실습 (2.5.7)** | **32가지 UI 컴포넌트 사이트** — 5대 원칙을 모두 한 번에 적용하는 통합 실습 |

---

## 📚 참고 자료

| 자료 | URL |
|------|-----|
| Kent Beck 증강코딩 원문 | https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes |
| Kent Beck 공식 사이트 (Augmented Coding 4원칙) | https://kentbeck.com |
| BPlusTree3 (Kent Beck의 실험 프로젝트) | https://github.com/KentBeck/BPlusTree3 |
| SpecKit 공식 GitHub | https://github.com/github/spec-kit |
| SpecKit 공식 문서 | https://github.github.com/spec-kit/ |
| GitHub Blog — SpecKit 발표 (2025-09) | https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/ |
| Martin Fowler — SDD 3 Tools | https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html |
| AGENTS.md 공식 사이트 | https://agents.md |
| AGENTS.md GitHub | https://github.com/agentsmd/agents.md |
| Agentic AI Foundation (Linux Foundation) | https://openai.com/index/agentic-ai-foundation/ |
| Anthropic — MCP 기증 발표 (2025-12) | https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation |
| Claude Code `/rewind` 가이드 | https://claudelog.com/mechanics/rewind/ |
| 지시 준수 연구 (arxiv) | https://arxiv.org/abs/2505.06120 |
| 바이브 코딩 숙취 (HackerNoon) | https://hackernoon.com/the-vibe-coding-hangover-what-happens-when-ai-writes-95percent-of-your-code |
| 강의 템플릿 저장소 | https://github.com/claude-code-expert/inflearn-docs |

---

> **할루시네이션 검증 노트 (2026-05-16 갱신)**  
> - ✅ Kent Beck Augmented Coding 4원칙 (Constrain Context · Preserve Optionality · Balance Expansion & Contraction · Maintain Human Judgment): kentbeck.com 공식 사이트 확인  
> - ✅ Kent Beck 2026-03 "Still Burning" 팟캐스트 시작: Wikipedia 항목 확인  
> - ✅ SpecKit v0.8.1까지 발전, 디렉터리 구조는 `.specify/` (이전 초안의 `.speckit/`은 잘못된 표기 — 수정 완료)  
> - ✅ SpecKit 슬래시 커맨드: `/speckit.constitution`, `/speckit.specify`, `/speckit.clarify`, `/speckit.checklist`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze`, `/speckit.implement` (marktechpost 2026-05-08 확인)  
> - ✅ AGENTS.md 60,000+ 프로젝트 채택, Agentic AI Foundation (Linux Foundation 산하)에서 관리: agents.md 공식 사이트 확인  
> - ✅ MCP는 2025-12 Anthropic이 AAIF로 기증: anthropic.com 공식 발표 확인  
> - ✅ `/rewind` 4가지 모드 (코드+대화 / 대화만 / 코드만 / 이후 요약): claudelog.com, blog.vincentqiao.com 확인. Esc 두 번 또는 `/rewind` 슬래시 커맨드  
> - ✅ `/rewind`는 Claude Code v2.0+ 도입, 외부 명령(`!bash`)으로 만든 파일은 추적 안 됨  
> - ✅ Claude Code 슬래시 커맨드 `/review`, `/security-review`, `/simplify`: 공식 명령 (Claude Code 2.1.x cheatsheet 기준 확인)  
> - ⚠️ 32가지 UI 컴포넌트 카탈로그 구성은 본 강의의 교육적 설계물 (shadcn/ui 등 메이저 라이브러리 핵심 컴포넌트를 참고했으나, 강의 진행 중 일부 조정 가능)  
> - ⚠️ `/tdd-red`, `/tdd-green`, `/tdd-refactor`는 본 강의에서 정의하는 **사용자 정의 슬래시 커맨드**다. Claude Code 기본 명령이 아님 — `.claude/commands/` 디렉터리에 별도 파일 작성 필요 (본문에 예시 포함)  
> - ⚠️ 강의 템플릿 저장소(`github.com/claude-code-expert/example`) 일부 경로는 강의 제작 시점에 재확인 필요  
> - ℹ️ 본 챕터에는 PlantUML 코드 블록을 의도적으로 포함하지 않았다 (codevillain의 표준 워크플로 — PlantUML은 명시 요청 시만 포함)

