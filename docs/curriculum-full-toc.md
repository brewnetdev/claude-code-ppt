# Claude Code Master — 전체 커리큘럼 목차 & 학습 안내 (Level 1–7)

> 출처: `docs/html/report/claude-code-levelN-*.html` 슬라이드 덱 전량 분석.
> 레벨 순서·제목의 정본은 대시보드 레지스트리(`src/library/deckRegistry.ts`)를 따른다.
> **파일명 주의**: 재편성 이력으로 파일명과 표시 레벨이 어긋나 있다 — Level 6 = `level7-chapter7.html`, Level 7 = `level7-subagent.html`.
> "프론트엔드 고도화" 덱(`level6-chapter6.html`)은 레지스트리 밖 레거시이며, 내용은 **Level 5 §5.7에 통합**되어 있다. (구 §5.7 Plugin Marketplace 챕터는 2026-07-05 삭제 — 프론트엔드 고도화가 5.8→5.7로 승계)

---

## 0. 한눈에 보는 과정 지도

| 레벨 | 핵심 주제 | 무엇을 배우나 (한 줄) | 실습 미션 |
|---|---|---|---|
| **L1** | 환경 구축 · 기본 설정 | 터미널·Git 기초부터 Claude Code 설치·모델·설정 파일·세션 개념까지, 첫 대화에 도달하는 5단계 | 럭키드로우 웹페이지 |
| **L2** | AI 시대 개발 방법론 | AI와 일하는 협업 원칙 — 설계·쪼개기·명확한 지시·리뷰 + `/init`·CLAUDE.md 프로젝트 설정 | 32가지 UI 컴포넌트 포트폴리오 |
| **L3** | 프롬프트·컨텍스트 엔지니어링 / TDD / SDD | 컨텍스트 엔지니어링·증강코딩·TDD·SDD(SpecKit)로 AI 협업을 체계화 + 표준 프로젝트 구조 | 카페 메뉴판(엑셀 연동) · 마크다운 에디터 |
| **L4** | 스킬·커맨드·Hook·MCP | Claude Code를 나만의 도구로 확장 — 반복은 커맨드/스킬로, 안전은 훅으로, 외부 연결은 MCP로 | 나만의 커맨드·스킬·훅 만들기 |
| **L5** | 실전 워크플로우 (풀스택) | markflow(마크다운 KMS)로 기획→명세→구현→디버깅→리팩토링→프론트고도화 전 과정을 SDD로 관통 | markflow 프로젝트 (연속) |
| **L6** | 빌드 · 배포 · 서비스 운영 | 환경 분리·CI/CD·보안 게이트·클라우드 배포·셀프호스팅·인증·검색 등록까지 실 서비스 론칭 전 과정 | markflow 실배포 (연속) |
| **L7** | 멀티 에이전트 & 워크플로우 오케스트레이션 | 하나의 작업을 몇 개의 에이전트로 어떻게 나눠 돌릴지 — 병렬·위임·협업 메커니즘 자체 | 오케스트레이션 실습 |

**전체 흐름**: `기초 도구(L1)` → `일하는 방법(L2·L3)` → `도구 확장(L4)` → `하나의 실전 프로젝트로 구현·배포·운영(L5·L6)` → `여러 에이전트로 규모 확장(L7)`.

---

## 1. 다른 강의와의 차별점 (근거: 실제 슬라이드 내용)

대부분의 "AI 코딩 도구" 강의가 *기능 시연*에 머무는 반면, 이 과정은 다음이 다르다.

1. **하나의 연속 프로젝트로 관통** — L5~L6은 `markflow`(마크다운 지식관리 시스템) **단일 프로젝트**를 기획(PRD/TRD/SSOT)→데이터·API 명세→구현→디버깅→리팩토링→프론트엔드 고도화→CI/CD→클라우드 배포→인증→SEO까지 끊김 없이 밀고 간다. 조각난 예제 모음이 아니다.

2. **도구보다 방법론이 먼저** — L2·L3이 "버튼 사용법"이 아니라 *AI와 어떻게 일하는가*를 다룬다. `Taste(판단력)`·`비결정성`·`설계 없는 재작업 사이클`·`작은 단위 쪼개기`·`명확한 지시 5요소`·`부정형 제약` 같은 원칙을 앞에 배치한다.

3. **컨텍스트 엔지니어링 + 하네스 엔지니어링을 정면으로 다룸** — `Context Rot`(Chroma Research 인용)·`Prompt→Context→Harness` 패러다임·서브에이전트 격리·Anthropic 공식 「Effective Context Engineering」 4대 전략·"에이전트 = 모델 + 하네스"(Böckeler/ThoughtWorks 인용). 단순 프롬프트 팁 수준이 아니다.

4. **확장·자동화를 실제로 만든다** — Slash Command / 자가호출 Skill / Hook 8개 이벤트 / MCP / 가드레일 훅(보호 파일·lint·타입체크·포맷)까지 *직접 제작*(L4).

5. **배포·운영을 통째로** — CI/CD(`claude -p` + GitHub Actions), Vercel·Railway·Cloudflare 셀프호스팅(Tunnel/Workers/R2), OAuth(Google·GitHub), Resend 트랜잭셔널 메일, 보안(프롬프트 인젝션·OWASP), SEO까지(L6). **실전 디버깅 결과**(예: R2 S3호환 5가지 필수 설정)를 그대로 담았다.

6. **멀티에이전트 오케스트레이션 선택 기준까지** — 서브에이전트·Dynamic Workflows·Agent Teams·Worktree/`/batch`를 *언제 무엇을 고를지* 의사결정 트리로 정리(L7). 최신 기능 반영.

7. **최신성** — Opus 4.8 / Sonnet 4.6 / Haiku 4.5, Next.js 16 · React 19 · Tailwind 4, 공식 문서·블로그를 날짜와 함께 인용(2025.09·2025.10).

8. **한국 실무 현지화** — 네이버 서치어드바이저 등록, WSL2 한국 사용자 동선, 전 강의 한국어. 비개발자도 첫 대화까지 막힘 없이 도달하도록 L1을 설계.

9. **안전·거버넌스 강조** — 권한 모드 6종, `git checkpoint`, 가드레일 훅, 부정형 제약을 반복 강조. "빠르고 위험한 코드"를 처음부터 명세로 막는 패턴을 여러 레벨에서 관통.

10. **레벨마다 손으로 만드는 미션** — 럭키드로우 → 32 UI 컴포넌트 → 카페 메뉴판/마크다운 에디터 → 커맨드·스킬·훅 → markflow 풀스택. 이론과 실습이 1:1로 붙어 있다.

---

## 2. 레벨별 상세 목차

각 레벨: **[배우는 것] → [상세 목차] → [이 레벨의 포인트]** 순. (덱의 PART/섹션 구조를 그대로 반영, 반복 슬라이드는 병합.)

---

### LEVEL 1 — 환경 구축 · 개발 환경 설정
> **배우는 것**: 한 번도 터미널을 안 써본 사람도 5단계(터미널·Git 기본 → 설치 → 환경 구축 → 설정 파일 → 첫 세션)를 따라오면 막힘 없이 첫 대화에 도달한다. **대상: 실무를 준비하는 비개발자.**

**PART 01 — 1.1 Terminal 과 Git 명령어의 이해**
- 1.1.1 Windows 터미널 설정 — WSL2 + Ubuntu 한 줄 설치 (macOS와 동일 명령어)
- 1.1.2 Mac 터미널 설정 — iTerm2 설치 + 권장 설정
- 1.1.3 분류별 명령어 — 어원(영단어 약어)으로 외우기 / 옵션 플래그 `-r`·`-f`·`-a`
- 1.1.4 터미널 키보드 단축키 — 약어로 외우기 / 실전: 포트 점유로 서버 기동 실패(Node·Java) 해결
- 1.1.5 Github 가입 · Repository 개설 · PAT 발급
- 1.1.6 Git 기본 사이클 (clone·checkout·fetch·pull·commit·merge·push) — init/remote/branch/switch · add/commit/status/diff · fetch/pull/push · merge/tag

**PART 02 — 1.2 Claude Code 개요 & 설치**
- 1.2 개요 — 터미널 네이티브 AI 코딩 에이전트
- 1.2.1 macOS — Homebrew·Git·설치 스크립트·PATH 강제 설정(zsh/bash)
- 1.2.2 Windows — PowerShell 공식 스크립트·환경변수 Path / WSL2 전 과정 설치·PATH·검증

**PART 03 — 1.3 모델 선택 & Thinking 모드**
- 1.3.1 Opus 4.8 · Sonnet 4.6 · Haiku 4.5 비교 / 1.3.2 출시 타임라인 / 1.3.3 요금제 5종
- 1.3.4 로그인(구독 vs API 콘솔) / 1.3.5 용도별 모델 선택 가이드 / 1.3.6 하이브리드 전략 + 전환 3방법
- 1.3.7 Extended Thinking / 1.3.8 모델별 Effort 레벨 / 1.3.9 Thinking 활성화 4방법 / 1.3.10 컨텍스트 윈도우(`/context`·`/status`)

**PART 04 — 1.4 개발환경 설정**
- 1.4.1 VS Code 화면 5요소·필수 단축키·Extension 7종·Claude Code 인터페이스 5요소 / IntelliJ 플러그인 + `/init`
- 1.4.3 iTerm2 실행 / 1.4.4 셸(.zshrc) 최적화 — 개행 처리·기본 모델·effort·alias
- 실습 Hello World — Python · TypeScript + 에러 대처 패턴

**PART 05 — 1.5 핵심 설정 파일**
- 1.5.1 `~/.claude/` 구조(전역 vs 프로젝트) / 1.5.2 `settings.json`(팀 공유) / 1.5.3 주요 키
- 1.5.4 환경 변수 3방법 / 1.5.5 전역 개인 가드 / 1.5.6 **권한 모드 6종** 비교(default·acceptEdits·plan·auto·dontAsk·bypassPermissions) / 1.5.7 작은 커밋·`git checkpoint`

**PART 06 — 1.6 Accept Mode·턴·세션·컨텍스트**
- 1.6.1 Accept mode 팝업 3선택지 / 1.6.2 턴·세션·컨텍스트(구조·휘발성) / 1.6.3 특수 문법 `@`·`!`
- **미션**: 럭키드로우 당첨자 선정 웹페이지

> **포인트**: 비개발자 진입장벽(터미널·Git·PATH·모델·권한)을 한 번에 제거. 세션/컨텍스트 휘발성을 초반에 못 박아 "어제 작업이 왜 사라졌어"를 예방.

---

### LEVEL 2 — AI 시대 개발 방법론
> **배우는 것**: AI와 함께 일하는 협업 원칙(설계·분해·지시·리뷰)과 `/init`·CLAUDE.md 프로젝트 설정으로 AI 협업의 기본기를 다진다.

**PART 01 — 2.1 AI와 함께하는 개발의 원칙**
- 2.1.1 왜 설계가 더 중요해졌는가 / 설계 없는 개발의 재작업 사이클(TODO 앱 사례) / 명세 없는 요청 vs 있는 요청
- 2.1.2 AI에게 없는 것 — **판단력(Taste)** / 기술 스택 트레이드오프의 최종 결정 주체는 개발자
- 2.1.3 AI 출력의 **비결정적(Non-deterministic)** 특성

**PART 02 — 2.2 작은 단위로 쪼개기**
- 2.2.1 한 번에 하나의 작업만 / 나쁜 예(한꺼번에) vs 좋은 예(단계별 분해)
- 2.2.2 작업 분해의 기준과 단위 / 다중 AI 에이전트 워크플로

**PART 03 — 2.3 명확한 지시의 기술**
- 2.3.1 컨텍스트 제한 원칙 — 명확한 지시 5요소 / 프롬프트 템플릿(목표·맥락·제약·완료·예시)
- 2.3.2 검증 가능한 완료 조건(구체·측정·검증) / 나쁜 vs 좋은 완료 조건
- 2.3.3 부정형 제약 — CLAUDE.md·프롬프트에 명시적으로 금지

**PART 04 — 2.4 매 단계 리뷰하기**
- 2.4.1 리뷰 대상 / 리뷰용 슬래시 커맨드 / 2.4.2 단계별 리뷰 습관 / 2.4.3 되돌리기 전략(작업 단위 커밋) · 커밋 prefix 규칙

**PART 05 — 2.5 CLAUDE.md 작성 가이드**
- 2.5.1 `/init` 자동 생성 / 섹션별 분석 / 실전 예시(**Karpathy · Kent Beck**) / 위치별 공유 범위
- `.claude/rules/` 경로 기반 규칙 분리 / 코딩 컨벤션 코드화(검증 가능한 규칙) / Glob 패턴 문법 / `/memory`
- **미션**: 32가지 UI 컴포넌트 포트폴리오

> **포인트**: "작동하는 코드"와 "맥락에 맞는 좋은 코드"를 구분하는 눈을 길러줌. CLAUDE.md를 팀 자산·검증 가능한 규칙으로 다루는 실전 관점.

---

### LEVEL 3 — 프롬프트·컨텍스트 엔지니어링 / TDD / SDD
> **배우는 것**: 증강코딩·TDD·SDD(SpecKit)로 AI 협업을 체계화하고, 표준 프로젝트 구조·Git 위에서 실전 워크플로를 실습한다.

**PART 01 — 3.1 Prompt & Context Engineering**
- 3.1.1 프롬프트 vs 컨텍스트 엔지니어링 / 같은 요청 A(프롬프트만) vs B(환경 설계 후 주입) / **Prompt → Context → Harness** 패러다임 이동
- 3.1.2 **Context Rot**(입력 길수록 품질 저하, Chroma Research) / 회피 6원칙 / 서브에이전트로 격리
- 3.1.5 프롬프팅 기법 6선(Zero/Few-shot·CoT·Role·Constraint·Step-by-Step) · 선택 가이드 · 조합 패턴(보안 리뷰)
- 3.1.6 200K 토큰 배분 + Self-Attention 비용 / 워크플로 명령어 시퀀스
- 3.1.7 **4대 컨텍스트 실행 전략**(Anthropic 공식 문서) / 장문 컨텍스트(20k+) 배치 원칙

**PART 02 — 3.2 Kent Beck의 증강코딩**
- Make it work → Make it right → Make it fast / Small Safe Steps(좋은 예 vs 나쁜 예)

**PART 03 — 3.3 TDD (Red·Green·Refactor)**
- AI가 왜 TDD를 무시하는가(벤치마크 최적화) / 명시적 TDD 사이클 요청·회귀 대응
- TDD 강제 CLAUDE.md 규칙 / `/tdd-red`·`/tdd-green`·`/tdd-refactor` 슬래시 커맨드 / Hook 자동 테스트 + Rewind / 명세 역할의 테스트

**PART 04 — 3.4 SDD · SpecKit**
- SDD: Spec-Driven Development(설계와 구현 분리) / SpecKit 설치·프로젝트 구조(`.specify`/`specs`/`templates`)
- 슬래시 커맨드 체인·프로세스 / 좋은 vs 나쁜 요청 / CLAUDE.md 연결 / **9단계 사이클**(constitution→specify→clarify→plan→tasks→taskstoissues→analyze→checklist→implement)

**PART 05 — 3.5 프로젝트 구조 설계 (Next.js App Router 표준)**
- (1/4) 루트 문서·`.claude/` / (2/4) `app/`(프론트+백 통합) / (3/4) `components`·`lib/server` / (4/4) `db`(Drizzle)·설정·Git 포함/제외
- **실습**: 카페 메뉴판(엑셀 데이터 연동, TDD 검증) · 마크다운 에디터(마일스톤 M1–M7, 각 마일스톤 = SpecKit 사이클 1바퀴)

> **포인트**: "한 번 잘 묻기"에서 "모델이 매 턴 보는 전체 상태 설계"로 사고를 전환. AI의 약점(TDD 무시·컨텍스트 저하)을 도구·규칙으로 구조적으로 보정.

---

### LEVEL 4 — 스킬 · 커맨드 · Hook · MCP
> **배우는 것**: 기본 사용을 넘어 Claude Code를 나만의 도구로 확장 — 반복은 커맨드/스킬로 캡슐화, 안전은 훅으로 강제, 외부 연결은 MCP로.

**PART 01 — 4.1 Slash Commands**
- 커스텀 커맨드(`.claude/commands/`, YAML frontmatter·description·allowed-tools) / `$ARGUMENTS` 인자 / 실전 조합 패턴

**PART 02 — 4.2 Agent Skills 시스템**
- Skill = 모델이 **자가 호출**하는 절차 묶음(Slash Command=사용자 호출과 대비) / 기본 구조(SKILL.md) / 작업 유형
- 사용 가능 Skill 확인 3방법 / **Reference Skill**(지식·컨벤션 인용형) vs **Action Skill**(절차·실행형)
- 공식 카탈로그(anthropics/skills) / 번들 스킬 마켓플레이스 설치 / 커스텀 제작·팀 배포
- ⚠️ 핵심: 모델은 **description만 보고 호출 여부를 결정** — "언제 쓰는지" 안 적으면 절대 안 불림

**PART 03 — 4.3 Hooks**
- 하네스 프라이머 — **"에이전트 = 모델 + 하네스"**(컨텍스트 큐레이션·도구 관리·권한 제어·에러 복구, Böckeler 인용)
- Hook 8개 이벤트 / Lifecycle(PreCompact + SessionStart = 핸드오프 자동화) / stdin JSON 페이로드(jq 파싱)
- 알림 훅(mac·Slack·settings.json) / 가드레일(보호 파일·lint·타입체크·자동 포맷) / 주의·디버깅

**PART 04 — 4.4 MCP (Model Context Protocol)**
- Transport 2종(http·stdio) / Scope / 개발 필수 MCP 서버 / 설치(`claude mcp add` 한 줄·`.mcp.json` 팀 공유 구문)

**PART 05 — 4.5 실습** — 나만의 커맨드·스킬·훅 만들어 쓰기

> **포인트**: Claude Code를 "쓰는 법"이 아니라 "확장하는 법". 하네스 개념을 명시적으로 도입해 이후 L7·고급 자동화의 토대를 놓음.

---

### LEVEL 5 — 실전 워크플로우 (기획부터 배포까지 풀스택)
> **배우는 것**: markflow(마크다운 KMS) 프로젝트로 기획→명세→구현→디버깅→리팩토링→프론트고도화 전 과정을 SDD로 묶어 실습한다.

**PART 01 — 5.1 기획과 요구사항 정의**
- markflow 소개 / 기술 스택 3대 기준·결정표 / 백엔드 옵션 비교 / 기능 요구(FR-001~010)·비기능 요구(NFR) / 사용자 스토리(Connextra)

**PART 02 — 5.2 개발 문서 작성**
- PRD / TRD / REQUIREMENTS.md(단일 진실 공급원) / 명세 버전 추적

**PART 03 — 5.3 명세서 설계**
- 데이터 모델(14테이블 Drizzle) / API 설계(REST 계약)·요청·응답 예시 / 컴포넌트 계층 / 유스케이스 / 테스트 케이스(TDD 명세 우선)

**PART 04 — 5.4 SDD 워크플로 — GSD**
- 왜 AI와 SDD가 맞는가 / 적용 전후 비교 / **GSD(Get Shit Done)** — 메타프롬프팅+컨텍스트+SDD 통합 / Phase 단위 컨텍스트 분리

**PART 05 — 5.5 Handoff & Changelog**
- CHANGELOG.md 자동화 Skill / GSD HANDOFF.json — SessionStart 훅 자동 재개

**PART 06 — 5.6 디버깅 & 리팩토링**
- 에러 메시지 첨부→근본 원인 분석 / File Checkpointing·회귀 방지 / 안전한 리팩토링(단위·순차) / 테스트 안전망(Vitest) / E2E 자동화(Playwright+CI)

**PART 07 — 5.7 프론트엔드 고도화** *(구 "Level 7 프론트엔드 고도화" 덱이 여기 통합 · 구 5.7 Plugin Marketplace 챕터는 삭제됨)*
- 컴포넌트 단위 구축(Vitest+Testing Library·TDD·3분할 레이아웃) / TDD Red-Green(Button)
- 마크다운 에디터(CodeMirror 6·remark/rehype·**XSS 방어**·신택스 하이라이팅)
- 지식관리 UI 5패턴(트리·검색·자동저장·단축키·명령 팔레트 — 키보드 우선·흐름 보존)
- 디자인 시스템(일관성 원칙·colors.json 토큰·frontend-design Skill·theme-factory·DESIGN.md 9섹션)

> **포인트**: 실무 문서(PRD/TRD/SSOT)와 명세→테스트→구현의 정석 흐름을 한 프로젝트로 체득. "AI는 보안·UX를 명시 안 하면 빠르고 위험하게 짠다 — 처음부터 명세로 박아라"를 반복 강조.

9---

### LEVEL 6 — 빌드 · 배포 · 서비스 운영
> **배우는 것**: 환경 분리부터 CI/CD·보안 게이트·클라우드 배포·셀프호스팅·인증·검색 등록까지 실 서비스 론칭 전 과정을 실습한다. *(파일: `level7-chapter7.html`)*

**6.1 환경 관리 전략** — dev/staging/prod / Vercel 환경 체계 / 환경 변수 분리 / 시크릿 누출 4규칙 / 다중 환경 도메인
**6.2 CI/CD 통합** — `claude -p` + GitHub Actions(비대화형 print) / CLI 핵심 옵션 / PR 자동 코드 리뷰 / 테스트 실패 시 자동 수정→재푸시 / 결과 알림
**6.3 보안 위협과 방어** — 프롬프트 인젝션(직접 vs 간접, OWASP LLM01) / 4단계 Defense-in-Depth
**6.4 Vercel 배포** — 배포 전 체크리스트 / 빌드·라우트(정적○/동적ƒ) / 계정·프로젝트 연결 / Neon 자동 환경변수 / DB 지연 초기화(lazy-init Proxy) / force-dynamic / 마이그레이션·Preview / Functions·Edge·Background
**6.5 Railway 백엔드** — Docker 배포 / CLI 배포 / DB 프로비저닝 자동 변수 / 헬스체크·`/health`(DB 핑) / CORS / Vercel vs Railway 비용
**6.6 Cloudflare 셀프호스팅** — 도메인 연결(2방식) / **Tunnel**(공인 IP 없이 노출·설치·설정·자동 시작) / Pages·Workers·R2 무료 3종 / Worker 업로드 엔드포인트 / R2 배포 / **Spring Boot R2 연동 5필수 설정**(실전 디버깅) / Content-Disposition으로 XSS 차단
**6.7 인증 & 메일** — Google OAuth(Cloud Console·통합·콜백 매핑) / GitHub OAuth(비공개 이메일 처리) / **Resend**(REST 트랜잭셔널 메일·RestClient·AFTER_COMMIT+@Async 분리·React Email·SDK) / 도메인 인증(SPF/DKIM/DMARC) / Webhooks(bounce·complaint) / 발송 KPI
**6.8 비용 최적화** — Subagent별 모델 분리(architect/linter) / Prompt Caching(자동 적용) / 캐시 적중률 측정(세션·일월·API)
**6.9 SEO** — 3축(시맨틱·메타데이터·JSON-LD) / Next.js 16 Metadata API / **네이버 서치어드바이저 6단계** / Google Search Console 3단계

> **포인트**: "빌드된다"에서 끝나지 않고 **실제로 인터넷에 사는 서비스**까지. 셀프호스팅·트랜잭셔널 메일·한국 검색 등록 등 다른 강의가 잘 안 다루는 운영 현실을 실전 디버깅 결과와 함께 다룸.

---

### LEVEL 7 — 멀티 에이전트 & 워크플로우 오케스트레이션
> **배우는 것**: 하나의 작업을 몇 개의 에이전트로, 어떻게 나눠 돌릴지 — 병렬·위임·협업 메커니즘 자체를 다룬다. *(파일: `level7-subagent.html`)*
> **4가지 병렬 방식**(서브에이전트 · Dynamic Workflows · Agent Teams · Headless CI)을 한눈에 비교하며 시작.

**7.1 서브에이전트(Subagent)** — 정의 / 파일 형식(`.claude/agents/<name>.md`) / 빌트인 + `/agents` / 언제 쓰나·말까 / 예제(탐색·병렬·리서치·검증·파이프라인) / 안티패턴
**7.2 Dynamic Workflows** — 개념 / 실행 흐름·shape / 트리거 4방법 / **ultracode vs xhigh vs ultrathink**(혼동 주의) / 플랜·권한·관리·끄기 / 언제 쓰나 / 예제 / `/deep-research` 번들 체험 / **비용 안전장치**(Anthropic 3회 반복 경고)
**7.3 멀티 세션 협업** — Agent Teams란(vs 서브에이전트) / 활성화·운용 / 언제·예제 / Agent View·백그라운드 세션 / Worktree와 `/batch`
**7.4 종합 — 무엇을 언제 고를까** — 의사결정 3단 질문 / 역할별 빠른 처방 / 비용·토큰 가이드 / 안티패턴 종합
**7.5 CI/CD 자동화** — Headless 모드(`claude -p`) / GitHub Actions 자동 리뷰(PR 코멘트 게시)

> **포인트**: 개인 생산성을 넘어 **여러 에이전트로 작업을 분해·병렬화**하는 상위 기술. 무엇을 언제 고를지 선택 기준과 비용 안전장치를 함께 제공해, 최신 기능을 무분별하게 쓰다 토큰을 태우는 함정을 예방.

---

## 3. 학습 순서 제안

- **비개발자·입문**: L1 → L2 → L3 (도구 + 방법론 기본기)
- **실전 프로젝트 지향**: L3 → L5 → L6 (하나의 프로젝트를 배포까지)
- **생산성·자동화 심화**: L4 → L7 (확장 + 오케스트레이션)
- **완주 권장 경로**: L1 → L2 → L3 → L4 → L5 → L6 → L7 (도구 → 방법 → 확장 → 구현·배포 → 규모 확장)

> 참고: 이 문서는 슬라이드 덱의 제목·부제(작성자 원문) 기준으로 정리했다. 세부 슬라이드 문구가 갱신되면 이 목차도 재생성이 필요하다.
