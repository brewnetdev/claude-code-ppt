---
marp: true
theme: default
paginate: true
title: "개발 필수 Skill & 커스텀 Command 큐레이션"
---

# 개발 필수 Skill & 커스텀 Command

## 초급(changelog · anti-ai-slop · handoff) 다음 단계

> **이미 배운 것:** `changelog`, `anti-ai-slop`, `handoff` — "출력 위생·인수인계" 기초
> **이제 배울 것:** 실제 개발 사이클(계획→테스트→리뷰→배포)을 끌고 가는 **워크플로우 스킬**과 **커스텀 커맨드**
>
> 참고 레포 2종 · 조회 기준일 2026-07-01
> - **MP** = [mattpocock/skills](https://github.com/mattpocock/skills) — 실전 엔지니어링 크래프트 스킬
> - **ECC** = [affaan-m/ECC](https://github.com/affaan-m/ECC) — Everything Claude Code, 종합 하네스 패키지

---

## 두 레포 비교

| | MP — mattpocock/skills | ECC — affaan-m/ECC |
| --- | --- | --- |
| 성격 | "vibe coding 아닌 진짜 엔지니어링" 워크플로우 | 스킬·에이전트·커맨드·훅 **종합 패키지** |
| 수량 | 스킬 ~30개(카테고리 폴더) | 스킬 **277** / 커맨드 92(전역 59) / 에이전트 67 (v2.0.0) |
| 강점 | 계획·리뷰·디버깅·글쓰기 **사고 절차** | 언어/프레임워크 패턴 + 학습·오케스트레이션 |
| 라이선스 | MIT | MIT |
| 설치 | `npx skills@latest add mattpocock/skills` | `/plugin marketplace add https://github.com/affaan-m/ECC` → `/plugin install ecc@ecc` |

> ⚠️ **ECC는 277개 전부 설치하지 말 것.** 의료·물류·크립토·홈랩 등 도메인 특화가 다수다. **자기 스택에 맞는 것만 선별**(아래 큐레이션 기준)하는 게 핵심.
> ⚠️ ECC 설치는 **방법을 섞지 말 것** — `/plugin install` 후 `install.sh`를 또 돌리면 깨진다(README 경고).

---

# PART A — 필수 Skill (카테고리별)

> 표기: **MP** = mattpocock, **ECC** = affaan-m/ECC
> "언제 쓰나"는 학습자가 실무에서 트리거하는 상황 기준

---

## A-1. 계획 · 명세 (Planning & Spec)

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `to-prd` | MP | 지금 대화를 PRD로 정리해 이슈 트래커에 발행 | 요구사항이 대화로 흩어졌을 때 한 문서로 |
| `to-issues` | MP | 계획·PRD를 독립적으로 집을 수 있는 이슈로 분해 | 큰 작업을 착수 가능한 단위로 쪼갤 때 |
| `intent-driven-development` | ECC | 모호한 변경을 **검증 가능한 수용 기준**으로 먼저 정의 | 영향 큰 기능을 코드 전에 명확히 |
| `blueprint` | ECC | 한 줄 목표 → 단계별 구축 계획 | "이거 만들어줘"가 막연할 때 |
| `grilling` / `grill-with-docs` | MP | 계획·설계를 **집요한 인터뷰**로 날카롭게(+ADR·용어집 생성) | 착수 전 설계 구멍을 미리 메울 때 |
| `deep-research` | ECC | firecrawl·exa로 멀티소스 리서치 → cited 리포트 | 낯선 기술/라이브러리 사전 조사 |

> 학습 포인트: **"코드보다 명세가 먼저"** — to-prd → grilling → to-issues 순서가 한 흐름.

---

## A-2. 테스트 · TDD

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `tdd` | MP | red-green-refactor 테스트 우선 개발 | 기능/버그를 테스트부터 시작할 때 |
| `tdd-workflow` | ECC | 언어 무관 TDD, 80%+ 커버리지 강제 | 프로젝트 전반 TDD 표준화 |
| `e2e-testing` | ECC | Playwright E2E, Page Object Model, CI 연동, flaky 대응 | 사용자 시나리오 자동 검증 |
| `verification-loop` | ECC | build → lint → test → type-check 종합 검증 | 커밋/PR 전 "다 통과하나" 확인 |
| `ai-regression-testing` | ECC | AI 변경의 회귀를 잡는 테스트 | 대량 AI 수정 후 회귀 방지 |

> 초보 함정: 커버리지 숫자만 쫓다 **무의미한 tautological 테스트**가 생김 → MP `tdd`가 이를 경계.

---

## A-3. 코드 리뷰 · 보안 · 품질

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `review` | MP | 기준점(커밋/브랜치) 이후 변경을 **Standards·Design 2축**으로 리뷰 | PR 올리기 전 자체 점검 |
| `coding-standards` | ECC | 네이밍·가독성·불변성 베이스라인 컨벤션 | 프로젝트 공통 규칙 적용 |
| `security-review` | ECC | 인증·입력·시크릿·API·결제 다룰 때 보안 검토 | 민감 코드 변경 직전 |
| `security-scan` | ECC | `.claude/` 설정의 취약점·인젝션 리스크 스캔 | 하네스 설정 자체를 점검 |
| `error-handling` | ECC | TS·Python·Go 견고한 에러 처리(타입드 에러·재시도·서킷브레이커) | 외부 호출/장애 대비 설계 |

---

## A-4. 디버깅 · 코드베이스 이해

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `diagnosing-bugs` | MP | 어려운 버그·성능 회귀를 위한 **진단 루프** | "왜 안 되지"를 체계적으로 추적 |
| `resolving-merge-conflicts` | MP | 진행 중인 git 머지/리베이스 충돌 해결 | 충돌로 막혔을 때 |
| `codebase-onboarding` | ECC | 낯선 코드베이스 → 아키텍처 맵·진입점·컨벤션 가이드 생성 | 새 프로젝트/레포에 합류 |
| `code-tour` | ECC | CodeTour `.tour` 파일(파일·라인 앵커) 워크스루 | 팀원/미래의 나를 위한 안내 |
| `repo-scan` | ECC | 전체 파일 분류 + 서드파티 라이브러리 감지 감사 | 레거시 자산 파악 |

---

## A-5. 설계 · 아키텍처

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `codebase-design` | MP | **deep module** 인터페이스 설계 공통 어휘 | 모듈 경계를 다듬을 때 |
| `domain-modeling` | MP | 도메인 모델·유비쿼터스 언어 정립 | 용어/개념이 흔들릴 때 |
| `improve-codebase-architecture` | MP | 심화 기회 스캔 → HTML 리포트 → 선택 개선 | 구조 부채를 시각적으로 점검 |
| `api-design` | ECC | REST 설계(리소스 네이밍·상태코드·페이징·버저닝) | 새 API 엔드포인트 설계 |
| `architecture-decision-records` | ECC | 세션 중 결정을 ADR로 자동 기록 | "왜 이렇게 정했나" 보존 |
| `hexagonal-architecture` | ECC | 포트&어댑터, 의존성 역전, 테스트 가능한 유스케이스 | 도메인/인프라 분리 설계 |
| `design-system` | ECC | 디자인 시스템 생성·감사, 스타일 PR 리뷰 | UI 일관성 점검 |

---

## A-6. 인프라 · 배포 · DB

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `backend-patterns` | ECC | Node·Express·Next 백엔드 아키텍처·DB 최적화 | 서버 로직 설계 |
| `frontend-patterns` | ECC | React·Next 상태관리·성능·UI 패턴 | 프론트 구조 잡을 때 |
| `database-migrations` | ECC | 스키마 변경·롤백·무중단 마이그레이션 | DB 변경 배포 |
| `docker-patterns` | ECC | Docker/Compose 로컬개발·보안·네트워킹·볼륨 | 컨테이너 환경 구성 |
| `deployment-patterns` | ECC | CI/CD·헬스체크·롤백·프로덕션 준비도 | 실서비스 배포 직전 |

> LEVEL 8(배포)과 직접 연결되는 묶음. 배포 실습 전에 이 스킬을 깔아두면 Claude가 표준을 따른다.

---

## A-7. Git · 협업

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `git-workflow` | ECC | 브랜치 전략·커밋 컨벤션·merge vs rebase·충돌 해결 | 팀 git 규칙 표준화 |
| `github-ops` | ECC | 이슈 트리아지·PR·릴리스·CI/CD 운영 | GitHub 작업 자동화 |
| `git-guardrails-claude-code` | MP | 위험 git 명령(push·reset --hard·clean·branch -D) **차단 훅** 설치 | 사고 방지(초보 필수) |
| `setup-pre-commit` | MP | Husky + lint-staged(Prettier)·타입체크·테스트 pre-commit | 커밋 품질 자동 게이트 |

> `git-guardrails`는 초급→중급 전환기에 **가장 먼저** 깔길 권장(되돌릴 수 없는 사고 예방).

---

## A-8. 컨텍스트 · 세션 관리

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `handoff` | MP | (학습 완료) 대화를 인수인계 문서로 압축 | 세션 종료/교대 시 |
| `context-budget` | ECC | 에이전트·스킬·MCP·룰의 컨텍스트 소비 감사 | "왜 이렇게 무겁지" 점검 |
| `strategic-compact` | ECC | 자동 압축 대신 **논리적 지점에서 수동 압축** 제안 | 작업 페이즈 경계 보존 |
| `token-budget-advisor` | ECC | 응답 깊이(=토큰)를 사용자가 선택하게 안내 | 비용·상세도 균형 |

> LEVEL 6(토큰 절약)·LEVEL 7(멀티 에이전트)와 연결. `handoff`에서 이어지는 "컨텍스트 위생" 심화.

---

## A-9. 학습 · 자기개선 (스킬을 만드는 스킬)

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `writing-great-skills` | MP | 스킬을 잘 쓰는 어휘·원칙 레퍼런스 | 직접 스킬 만들 때 먼저 읽기 |
| `skill-scout` | ECC | 새 스킬 만들기 전 로컬·마켓·GitHub·웹에서 기존 검색 | 바퀴 재발명 방지 |
| `continuous-learning-v2` | ECC | 훅으로 세션 관찰 → instinct 생성·진화 → 스킬/커맨드化 | 반복 패턴 자동 자산화 |
| `prompt-optimizer` | ECC | 프롬프트 의도·결함 분석 후 최적화 버전 출력 | 프롬프트가 잘 안 먹힐 때 |
| `teach` | MP | 워크스페이스 안에서 새 개념을 가르침 | 모르는 기술을 학습 모드로 |

> 메타 원칙(슬라이드 자료와 일치): **같은 작업 3번 반복 → 스킬화, 같은 실수 3번 → 룰/CLAUDE.md化.**

---

## A-10. 문서 · 리서치

| 스킬 | 출처 | 한 줄 | 언제 쓰나 |
| --- | --- | --- | --- |
| `documentation-lookup` | ECC | Context7 MCP로 **최신** 라이브러리/프레임워크 docs 조회 | 버전·API 헷갈릴 때(할루시네이션 방지) |
| `search-first` | ECC | 코딩 전 기존 도구·라이브러리·패턴부터 탐색 | 커스텀 코드 짜기 전 |
| `edit-article` | MP | 글 구조 재배치·명료화·문장 다듬기 | 블로그/문서 퇴고 |

> `documentation-lookup` + `search-first`는 **"추측 코딩"을 막는 한 쌍** — 초보가 가장 자주 틀리는 지점을 잡아준다.

---

## A-11. 언어/프레임워크별 패턴 (자기 스택만 선별 설치)

ECC는 스택별 `*-patterns` / `*-testing` / `*-tdd` / `*-review`를 제공한다. **본인 스택만** 골라라.

| 스택 | 대표 스킬(ECC) |
| --- | --- |
| Python | `python-patterns`, `python-testing`, `fastapi-patterns`, `django-patterns`·`django-tdd` |
| JS/TS·React | `react-patterns`, `react-testing`, `react-performance`, `nextjs-turbopack`, `vite-patterns` |
| Vue | `vue-patterns`, `nuxt4-patterns`, `ui-to-vue` |
| Node 백엔드 | `nestjs-patterns`, `prisma-patterns`, `redis-patterns`, `postgres-patterns`, `mysql-patterns` |
| Java/Spring | `springboot-patterns`, `springboot-tdd`, `springboot-security`, `springboot-verification`, `jpa-patterns` |
| Go | `golang-patterns`, `golang-testing` |
| Rust | `rust-patterns`, `rust-testing` |
| Kotlin | `kotlin-patterns`, `kotlin-coroutines-flows`, `kotlin-testing` |
| 모바일 | `swiftui-patterns`, `swift-concurrency-6-2`, `react-native-patterns`, `compose-multiplatform-patterns` |
| 인프라 | `kubernetes-patterns`, `docker-patterns` |

> 강의 메인 스택(markflow: Next.js)이라면 **react/next/prisma/postgres 계열**만 깔면 충분.

---

# PART B — 필수 커스텀 Command (ECC 중심)

> ECC 전역 설치 시 `/` 입력으로 호출. 분류는 ECC `COMMANDS-QUICK-REF.md` 기준 + 큐레이션.

---

## B-1. 핵심 워크플로우 (Core)

| 커맨드 | 한 줄 | 언제 |
| --- | --- | --- |
| `/plan` | 요구사항 재정리·리스크 평가·단계별 구현 계획 — **확인 전 코드 안 건드림** | 새 기능 착수 시 첫 호출 |
| `/tdd` | 인터페이스 스캐폴드 → 실패 테스트 → 구현 → 80%+ 검증 | 테스트 우선 개발 |
| `/code-review` | 변경 파일의 품질·보안·유지보수성 리뷰 | 코드 작성 직후 |
| `/build-fix` | 빌드 에러 감지·수정(언어 맞는 resolver 자동 위임) | 빌드 깨졌을 때 |
| `/verify` | build → lint → test → type-check 전체 검증 루프 | 커밋/PR 직전 |

---

## B-2. 테스트 · 리뷰 · 빌드 (언어별)

| 그룹 | 커맨드 |
| --- | --- |
| 테스트 | `/tdd`(범용), `/e2e`(Playwright), `/test-coverage`, `/go-test`·`/rust-test`·`/kotlin-test`·`/cpp-test` |
| 리뷰 | `/code-review`(범용), `/python-review`·`/go-review`·`/rust-review`·`/kotlin-review`·`/cpp-review`·`/fastapi-review` |
| 빌드 수정 | `/build-fix`(자동), `/go-build`·`/rust-build`·`/kotlin-build`·`/gradle-build`·`/cpp-build` |

> 자기 스택 변형만 기억하면 된다. 범용(`/tdd`,`/code-review`,`/build-fix`)이 자동으로 언어를 감지하는 경우가 많다.

---

## B-3. 계획 · 아키텍처 · 오케스트레이션

| 커맨드 | 한 줄 |
| --- | --- |
| `/plan` | 리스크 평가 포함 구현 계획 |
| `/multi-plan` · `/multi-workflow` | 멀티 모델 협업 계획/개발 |
| `/orchestrate` | tmux/worktree 멀티 에이전트 오케스트레이션 가이드 |
| `/devfleet` | DevFleet로 병렬 Claude Code 에이전트 운용 |
| `/harness-audit` | 하네스 설정의 신뢰성·비용 감사 |
| `/model-route` | 작업을 Haiku/Sonnet/Opus로 라우팅 |

> LEVEL 7(멀티 에이전트)와 직결. 초·중급에선 `/plan`만으로 충분, 나머지는 고급에서.

---

## B-4. 세션 · 컨텍스트 관리

| 커맨드 | 한 줄 |
| --- | --- |
| `/save-session` · `/resume-session` · `/sessions` | 세션 저장·복원·이력 관리 |
| `/checkpoint` | 현재 세션에 체크포인트 표시 |
| `/aside` | 현재 작업 맥락 안 잃고 곁가지 질문 |
| `/context-budget` | 컨텍스트 사용량 분석·최적화 |

---

## B-5. 학습 · 개선

| 커맨드 | 한 줄 |
| --- | --- |
| `/learn` · `/learn-eval` | 세션에서 재사용 패턴 추출(+품질 자체평가) |
| `/skill-create` | 로컬 git 히스토리 분석 → 재사용 스킬 생성 |
| `/evolve` · `/promote` | 학습된 instinct를 진화·전역 승격 |
| `/instinct-status` | 학습된 instinct를 신뢰도 점수와 함께 표시 |
| `/skill-health` | 스킬 포트폴리오 건강 대시보드 |

---

## B-6. 리팩토링 · 문서 · 자동화

| 커맨드 | 한 줄 |
| --- | --- |
| `/refactor-clean` | 데드코드 제거·중복 통합·구조 정리 |
| `/prompt-optimize` | 초안 프롬프트를 ECC 강화 버전으로 최적화 |
| `/docs <library>` | Context7로 최신 라이브러리/API 문서 조회 |
| `/update-docs` · `/update-codemaps` | 프로젝트 문서·코드맵 갱신 |
| `/loop-start` · `/loop-status` | 인터벌 반복 에이전트 루프 |

---

## B-7. 빠른 의사결정 가이드 (ECC 원문 기준)

```
새 기능 시작?            → /plan 먼저, 그다음 /tdd
코드 막 작성함?          → /code-review
빌드 깨짐?               → /build-fix
최신 문서 필요?          → /docs <library>
세션 끝나감?             → /save-session 또는 /learn-eval
다음날 이어서?           → /resume-session
컨텍스트 무거움?         → /context-budget 후 /checkpoint
배운 것 추출?            → /learn-eval 후 /evolve
반복 작업?               → /loop-start
```

> 출처: ECC `COMMANDS-QUICK-REF.md` (Quick Decision Guide)

---

# 추천 학습 경로 (난이도 순)

```
1단계 안전망     git-guardrails-claude-code(MP) · setup-pre-commit(MP) · /plan
2단계 핵심 사이클 to-prd→to-issues(MP) · tdd(MP)/ /tdd · /code-review · /verify
3단계 이해·디버깅 codebase-onboarding(ECC) · diagnosing-bugs(MP) · /docs · search-first(ECC)
4단계 설계·품질   codebase-design(MP) · api-design(ECC) · security-review(ECC) · ADR(ECC)
5단계 배포·운영   docker-patterns · deployment-patterns · database-migrations(ECC)  [LEVEL 8 연계]
6단계 자기개선   writing-great-skills(MP) · /skill-create · continuous-learning-v2(ECC)
```

> 비전공·직장인 학습자 기준: **1~2단계가 "필수", 3~4단계가 "중급 핵심", 5~6단계는 LEVEL 7~8과 함께.**

---

# 설치 가이드 (검증됨)

**MP — mattpocock/skills**
```bash
npx skills@latest add mattpocock/skills
# 설치 시 원하는 스킬 + 대상 에이전트 선택
# 반드시 /setup-matt-pocock-skills 함께 선택(이슈 트래커·라벨·도메인 설정)
```

**ECC — affaan-m/ECC** (Claude Code 플러그인 마켓플레이스)
```bash
/plugin marketplace add https://github.com/affaan-m/ECC
/plugin install ecc@ecc
# 또는 셸 설치(프로파일 선택). 두 방법을 섞지 말 것!
#   ./install.sh --profile minimal --target claude
```

> ⚠️ 두 레포 모두 MIT. 재배포·강의 자료 인용은 가능하나 **출처 표기** 권장. 설치는 **선별적으로**.

---

## 할루시네이션 / 출처 검증 표

| 항목 | 상태 | 출처/확인 방법 |
| --- | --- | --- |
| MP 스킬명·카테고리(engineering/productivity/misc/personal) | ✅ 직접 확인 | `git clone` 후 `skills/*/SKILL.md` frontmatter 추출 |
| MP 설치 `npx skills@latest add mattpocock/skills` | ✅ 직접 확인 | README.md 27~31행 |
| ECC v2.0.0 = skills 277 / commands 92 / agents 67 | ✅ 직접 확인 | clone 후 `find` 카운트 + `VERSION` |
| ECC 커맨드 분류·설명 | ✅ 직접 확인 | `COMMANDS-QUICK-REF.md` 원문 |
| ECC 스킬 설명(각 항목) | ✅ 직접 확인 | 각 `skills/<name>/SKILL.md` `description` 추출 |
| ECC 설치 `/plugin marketplace add … → install ecc@ecc` | ✅ 직접 확인 | README.md install 섹션 |
| 양 레포 MIT 라이선스 | ✅ 직접 확인 | 각 `LICENSE` 첫 줄 |
| `continuous-learning`은 DEPRECATED → `continuous-learning-v2` 사용 | ✅ 직접 확인 | skills/continuous-learning/SKILL.md |
| 레포 링크 유효성(2개) | ✅ 직접 확인 | 둘 다 clone 성공 |
| 수량·구성은 버전에 따라 변동 | ⚠️ 주의 | ECC는 활발히 갱신 — 녹화 시 `VERSION`·`find` 재확인 |

> ✅ = 레포 원문 직접 확인(웹 추측 아님) · ⚠️ = 버전 변동 주의
