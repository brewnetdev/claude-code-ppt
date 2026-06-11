# 필수 스킬 · 커맨드 · 훅 — 모든 프로젝트가 갖춰야 할 자동화 패키지

> **이 문서의 목적**
> 어떤 프로젝트를 시작하든 처음 30분 안에 깔아두어야 하는 **Skill·Slash Command·Hook 자동화 패키지**를 정리한다. 각 항목마다 **개념을 먼저** 설명하고(이게 Skill인지 Command인지 Hook인지), **왜 필요한지**, **어떻게 작성하는지**, **markflow 기준 실전 예시**를 제공한다.
>
> **이 문서를 마치면 갖춰질 자동화**
> - `/handoff` · `/memory` · `/commit` · `/changelog` · `/review` · `/pr` (6개 커맨드/스킬)
> - 파괴적 명령 차단 · 비밀파일 보호 · 커밋 전 린트 · 푸시 전 테스트 · 자동 포맷 · Slack 알림 · PreCompact handoff (7개 훅)
>
> **분량**: 강의 90분 예상. Level 3.3~3.5의 통합 실습 자료.

---

## Part 0. 먼저 개념 정리 — Skill · Command · Hook 한 번에

세 가지가 다 비슷해 보이지만 **본질이 완전히 다르다**. 한 줄 비유로 머리에 박아두자.

| | 비유 | 한 줄 정의 |
|---|---|---|
| **Slash Command** | 🎹 **단축키** | 사용자가 `/name` 입력하면 **무조건 실행**되는 사전 정의 프롬프트 |
| **Skill** | 📖 **매뉴얼** | 필요한 순간에 **꺼내 펴서 읽는** 작업 지침서 (자동 또는 수동으로) |
| **Hook** | 🚨 **자동문 센서 · 알람** | 특정 이벤트가 발생하면 **사람 개입 없이 자동 발화**하는 외부 스크립트 |

이 셋의 **호출 메커니즘**과 **실행 보장**이 어떻게 다른지가 핵심이다.

---

### 0.1 Slash Command = 단축키

#### 비유
키보드 단축키와 같다. `Cmd+S` 누르면 **무조건 저장**이 실행된다. 누가 누르냐(나, 동료, 자동화 스크립트)와 무관하게 동일한 동작이 보장된다.

#### 호출 메커니즘
```
사용자 입력: /commit
   ↓
Claude Code가 .claude/commands/commit.md (또는 ~/.claude/commands/commit.md) 찾음
   ↓
파일 본문을 시스템 프롬프트로 주입 (`!`cmd``로 동적 컨텍스트 포함)
   ↓
Claude가 그 지시를 받아 작업 수행
```

#### 핵심 특성
- **호출 = 실행 보장**: `/commit` 입력하면 100% 실행됨. Claude가 "필요 없을 것 같다"고 판단해서 안 부르는 일 없음
- **본문 해석은 확률적**: 호출은 보장되지만, 본문에 적힌 지시(`git diff 보고 메시지 만들어`)를 Claude가 어떻게 수행하느냐는 모델 판단
- **자동 발동 없음**: 사용자가 명시적으로 `/name`을 입력해야만 작동. 대화 중 자연어로는 절대 안 불림

#### 언제 쓰나
- 반복 입력하기 귀찮은 표준 프롬프트 (`/commit`, `/review`, `/pr`)
- 명시적으로 시점을 통제하고 싶은 작업
- 팀 표준 워크플로

---

### 0.2 Skill = 매뉴얼

#### 비유
책장에 꽂힌 **업무 매뉴얼**. 표지(`description`)만 보이게 놓아두고, 필요한 상황이 오면 꺼내서 펴 본다. 매뉴얼 중간에 *"세부 절차는 부록 A 참조"*라고 적혀 있으면 그때 부록도 펴 본다.

#### 호출 메커니즘 — 3가지

Skill을 부르는 방법은 **세 가지**가 있다. 이걸 명확히 구분하는 게 가장 중요하다.

| 호출 방식 | 한 줄 | 어떻게 일어나는가 |
|----------|------|----------------|
| **① 자동 호출 (Auto-invocation)** | Claude가 description 보고 알아서 부름 | 대화 흐름이 `description` 키워드와 매칭되면 모델이 자율 판단 |
| **② 명시 호출 (Explicit invocation)** | 사용자가 `/skill-name` 직접 호출 | Command와 동일하게 슬래시로 |
| **③ 사전 로드 (Pre-load)** | 서브에이전트가 시작 시 미리 로드 | Subagent frontmatter의 `skills:` 필드로 지정 |

> ⚠️ **"자동 주입"이 아니다**. CLAUDE.md는 세션 시작 시 컨텍스트에 통째로 박히지만(자동 주입), Skill의 **본문은 호출되기 전까지 컨텍스트에 안 들어간다**. 처음엔 매뉴얼 표지(description)만 책장에 있다.

#### Skill 내부 동작 — Progressive Disclosure 3단계

이게 Skill의 핵심 메커니즘이다. **3단계로 정보가 점진 공개**된다.

```
[Level 1] 세션 시작 시 — 시스템 프롬프트에 description만 로드
   "git-commit-writer: Generate conventional commit messages from staged diff"
   ↑ 표지만 책장에 꽂힘. 본문은 안 읽음.
   (~50~150 토큰만 소비)

[Level 2] 트리거 발생 — Claude가 bash로 SKILL.md를 읽음
   `!`cat .claude/skills/git-commit-writer/SKILL.md`` 같은 식으로 파일 시스템 접근
   ↑ 매뉴얼을 책장에서 꺼내 펴기. 본문(보통 500~2000줄)이 컨텍스트로 들어옴

[Level 3] 필요 시 — SKILL.md가 가리킨 references/scripts를 추가 로드
   SKILL.md 안에 "복잡한 검증은 scripts/validate.py 실행" 또는
   "엣지케이스는 references/edge-cases.md 참고"라고 적혀 있을 때
   ↑ 매뉴얼의 부록만 필요한 것만 펴봄
```

> **공식 인용**: *"When a Skill is triggered, Claude uses bash to read SKILL.md from the filesystem, bringing its instructions into the context window. If those instructions reference other files (like FORMS.md or a database schema), Claude reads those files too using additional bash commands. When instructions mention executable scripts, Claude runs them via bash and receives only the output."*
> 
> 출처: [Agent Skills 공식](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

#### 핵심 특성
- **호출 자체가 확률적** (자동 호출의 경우): 자동 발동은 `description`이 얼마나 명확하냐에 달림. "코드 리뷰" 같은 모호한 description은 매번 발동 안 될 수 있음
- **본문이 매우 클 수 있음**: scripts/와 references/는 컨텍스트에 들어가지 않으므로 사실상 분량 제한이 없음
- **여러 Skill 협업 가능**: Claude가 한 task에 여러 Skill을 자율적으로 조합

#### 자동 발동을 통제하는 frontmatter 필드

| 필드 | 효과 |
|------|------|
| (기본) | 사용자와 Claude 둘 다 호출 가능 |
| `disable-model-invocation: true` | **사용자만** 호출 가능 — Claude의 자동 발동 차단. 사이드이펙트 있는 Skill(`/deploy`, `/send-slack`)에 필수 |
| `user-invocable: false` | **Claude만** 호출 가능 — 사용자 슬래시 메뉴에서 숨김. 백그라운드 지식(legacy-api-context 같은) 용도 |

#### 언제 쓰나
- 자연어 트리거로 자동 발동되면 좋은 워크플로 (`/changelog`, `/handoff`)
- 본문이 길거나 scripts/references가 필요한 작업
- 도메인 지식 패키지 (`drizzle-conventions`, `markdown-security`)
- 여러 프로젝트에서 재사용할 작업 (`~/.claude/skills/` 전역)

---

### 0.3 Hook = 자동문 센서 · 알람

#### 비유
**사무실 자동문**: 사람이 가까이 가면 자동으로 열린다. 누가 통제하지 않아도 항상 동일하게 동작.
**공장 컨베이어 벨트의 자동 검수기**: 제품이 지날 때마다 자동 검사. 불량이면 라인 정지.
**건물 화재 경보기**: 특정 조건(연기 감지)이 충족되면 사람 의지와 무관하게 발화.

#### 호출 메커니즘
```
Claude가 도구를 호출하려 함 (예: Bash("git push --force"))
   ↓
Claude Code가 settings.json의 PreToolUse Hook 매칭 확인
   ↓ (matcher: "Bash", if: "Bash(git push *)" 일치)
별도 셸 프로세스로 hook 스크립트 실행
   ↓
스크립트는 stdin으로 JSON 페이로드 받음:
   { "tool_name": "Bash", "tool_input": {"command": "git push --force"} }
   ↓
스크립트가 검증 후 exit code로 응답:
   - exit 0 → 통과, 도구 실행됨
   - exit 2 → 차단, stderr가 Claude에게 전달되어 재시도 유도
```

#### 핵심 특성 (다른 둘과 완전히 다른 점)
- **외부 프로세스**: Hook 스크립트는 Claude의 컨텍스트와 완전히 분리된 셸에서 실행. 코드 자체는 토큰 0개 소비
- **결정론적**: 모델 판단 개입 없음. `if` 조건 매칭되면 100% 실행, 매칭 안 되면 0% 실행
- **유일한 차단 능력**: PreToolUse Hook의 `exit 2`만이 Claude의 도구 호출을 **하드 차단**할 수 있다. Command/Skill로는 차단 불가
- **사용자/Claude 호출 불가**: 사용자도 Claude도 Hook을 직접 부를 수 없음. 시스템 이벤트만이 트리거

#### 12개 이벤트 종류 (간략)

| 이벤트 | 의미 | 비유 |
|------|------|------|
| `PreToolUse` | 도구 실행 직전 | 자동문 센서 (사람 다가옴) |
| `PostToolUse` | 도구 실행 직후 (성공) | 컨베이어 검수기 (제품 통과 후) |
| `PostToolUseFailure` | 도구 실행 실패 시 | 라인 정지 알람 |
| `UserPromptSubmit` | 사용자 메시지 제출 시 | 출입 카드 리더 (입장 시) |
| `Stop` | 응답 1턴 완료 시 | 작업 종료 종 |
| `PreCompact` | `/compact` 직전 | 시험 종료 5분 전 알림 |
| `SessionStart` / `SessionEnd` | 세션 시작/종료 | 출근/퇴근 카드 |
| 기타 (TaskCreated, PermissionRequest 등) | | |

#### 언제 쓰나
- **절대 안 되는 행동을 막을 때** (`rm -rf`, force push)
- **반드시 일어나야 하는 사이드 이펙트** (커밋 전 린트, 푸시 전 테스트)
- **외부 시스템 알림** (Slack, 데스크탑 알림)
- **자동 백업, 자동 로깅**
- **세션 간 상태 이전** (PreCompact + SessionStart로 handoff)

---

### 0.4 셋을 한 표로 비교

| | Slash Command 🎹 | Skill 📖 | Hook 🚨 |
|------|---|---|---|
| **본질** | 단축키 | 매뉴얼 | 자동 트리거 |
| **호출 주체** | 사용자만 (`/name`) | Claude 자율 / 사용자 (`/name`) / 사전로드 | 시스템 이벤트 (사용자·Claude 호출 불가) |
| **호출 보장** | ✅ 100% | ⚠️ 자동발동은 확률적, 명시호출은 100% | ✅ 100% (조건 매칭 시) |
| **실행 보장** | 모델 해석 거침 | 모델 해석 거침 | ✅ 셸 스크립트 결정론적 |
| **차단 능력** | ❌ | ❌ | ✅ `exit 2`로 도구 호출 차단 |
| **컨텍스트 비용** | 호출 시 본문 로드 | 평소 description(~100토큰), 호출 시 본문 추가 | 0 토큰 (외부 프로세스) |
| **본문 분량 한계** | 한 화면 (~500줄) 권장 | 사실상 무제한 (scripts/references는 외부) | N/A (셸 스크립트) |
| **자동 발동** | ❌ | ✅ description 매칭 시 | ✅ 이벤트 매칭 시 |
| **주 용도** | 반복 프롬프트 단축 | 도메인 지식·자동 발동 워크플로 | 가드레일·강제 사이드이펙트 |

### 0.5 "Advisory" vs "Enforcement" — 가장 중요한 한 줄

```
CLAUDE.md · Skill · Command  →  advisory (권고, 모델 해석 거침, 확률적)
Hook                         →  enforcement (강제, 셸 직접 실행, 결정론적)
```

**둘 다 써야 한다**. Skill로 방향과 매뉴얼 제공하고, Hook으로 절대 안 되는 건 결정론적으로 막는다.

> 공식 문구: *"Unlike CLAUDE.md instructions which are advisory, hooks run scripts automatically at specific points in Claude's workflow."* — [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)

### 0.6 2026년 통합 추세 — Skill과 Command가 합쳐지고 있다

> **공식 문서 발췌**: *"Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way. Your existing `.claude/commands/` files keep working. Skills add optional features: a directory for supporting files, frontmatter to control whether you or Claude invokes them, and the ability for Claude to load them automatically when relevant."*
>
> 출처: [Claude Code Skills 공식](https://code.claude.com/docs/en/skills)

즉, **2026년 현재 Skill이 Command의 상위 호환**이다. 단일 파일이면 commands/에, 폴더 구조가 필요하면 skills/에 두면 된다. 신규 작성은 Skill 권장.

---

## Part 0.5. 디렉터리 구조와 파일별 역할

세 자동화 각각의 **표준 디렉터리 구조**와 **파일별 역할**을 정리한다. 강의 실습 시 학생들이 가장 헷갈리는 부분.

### 0.5.1 Slash Command — 단일 파일 (가장 단순)

```
.claude/commands/                     # 프로젝트 전용 (git 커밋)
├── commit.md                         # /commit
├── review.md                         # /review
└── pr.md                             # /pr

~/.claude/commands/                   # 사용자 전역 (모든 프로젝트)
├── memory.md                         # /memory
└── explain.md                        # /explain
```

#### 파일 단위 — 한 줄 정리

| 파일 | 역할 |
|------|------|
| `<name>.md` | **파일명 = 슬래시 커맨드 이름** (`commit.md` → `/commit`) |

#### `.md` 파일 내부 구조

```markdown
---
description: Stage and commit changes with Conventional Commits message
allowed-tools: Bash(git add:*), Bash(git commit:*), Bash(git diff:*)
---

## Context
- Staged diff: !`git diff --staged`         ← 동적 컨텍스트 (호출 시 명령 실행)
- Recent commits: !`git log --oneline -10`

## Your Task
[Claude에게 줄 지시 본문]

$ARGUMENTS                                   ← 사용자가 /commit "feat: X" 처럼 인자 전달 시 치환
```

**Command가 단일 파일인 이유**: 단축키는 본질적으로 단순한 매크로다. 보조 파일이 필요할 만큼 복잡해지면 Skill로 옮기는 게 맞다.

---

### 0.5.2 Skill — 디렉터리 구조 (Progressive Disclosure를 직접 구현)

```
.claude/skills/                       # 프로젝트 전용
└── <skill-name>/                     ← 디렉터리명 = 스킬 이름 (`/skill-name`)
    ├── SKILL.md                      ← ★ 필수. 진입점.
    ├── scripts/                      ← 선택. 실행 코드
    │   ├── validate.py
    │   └── generate.sh
    ├── references/                   ← 선택. 추가 문서 (필요 시 로드)
    │   ├── edge-cases.md
    │   ├── api-spec.md
    │   └── style-guide.md
    ├── assets/                       ← 선택. 출력에 쓸 정적 파일
    │   ├── template.html
    │   ├── logo.svg
    │   └── config.json
    └── LICENSE.txt                   ← 선택

~/.claude/skills/<skill-name>/        # 사용자 전역도 동일 구조
```

#### 파일·디렉터리별 역할 — 한 줄 정리

| 경로 | 역할 | 컨텍스트 로드 시점 |
|------|------|---------------|
| `<skill-name>/` | **디렉터리명이 스킬 이름** (`/<skill-name>`으로 호출) | — |
| `SKILL.md` ★ | **필수 진입점**. frontmatter(`name`, `description`) + 본문 지시 | Level 2: 자동/수동 호출 시 bash로 읽힘 |
| `scripts/` | 실행 코드 (Python, Bash, Node 등). Claude가 bash로 실행 | **본문 토큰 0** — stdout만 컨텍스트에 들어감 |
| `references/` | 추가 마크다운 문서. 엣지케이스, 상세 명세, 예시 모음 | Level 3: SKILL.md가 지시할 때만 bash `cat`으로 읽힘 |
| `assets/` | 출력 생성에 쓸 템플릿·아이콘·이미지 등 정적 파일 | 필요 시 Claude가 bash `cp` 또는 `cat`으로 사용 |
| `LICENSE.txt` | 라이선스 (재배포 시) | 컨텍스트 로드 안 함 |

> ⚠️ **자주 하는 실수**: `~/.claude/skills/code-reviewer/scripts/SKILL.md` 처럼 한 단계 더 깊이 넣음. 반드시 `<skill-name>/SKILL.md`가 1단계 깊이여야 함.
>
> 출처: [Where Are Claude Skills Stored?](https://www.agensi.io/learn/where-are-claude-skills-stored)

#### SKILL.md 본문 구조 (권장)

```markdown
---
name: <skill-name>                                       ← 디렉터리명과 일치 권장
description: >                                           ← Claude가 자동 발동 판단 시 보는 핵심
  Use this skill when the user asks to ...,
  wants to ..., or types /<skill-name>.
  Include exact phrases users would say.
allowed-tools: Read, Write, Bash(git:*)                  ← 화이트리스트로 권한 제한
disable-model-invocation: false                          ← 선택. true면 사용자만 호출 가능
---

# <스킬 제목>

## Overview
짧은 소개 (1~2 단락)

## Context (동적)
- Current state: !`git status --short`                   ← 호출 시점 명령 실행 결과
- Recent: !`git log --oneline -5`

## Instructions
이 스킬이 해야 할 일의 핵심 단계 (5~10단계 권장)

## When to use references/
- 엣지 케이스 만나면 → references/edge-cases.md 참고     ← Level 3 로드 신호
- API 명세 확인 필요 시 → references/api-spec.md
- 스타일 일관성 → references/style-guide.md

## When to run scripts/
- 입력 검증 필요 시 → bash scripts/validate.py "$file"   ← 스크립트 호출 명시
- 보고서 생성 시 → bash scripts/generate.sh

$ARGUMENTS                                                ← 사용자 인자
```

> **권장 분량**: SKILL.md 본문은 **1,500~2,000 단어 (500줄 이하)**. 길어지면 references/로 분리.

#### markflow 예시 — `markdown-security` Skill 전체 구조

```
.claude/skills/markdown-security/
├── SKILL.md                          # 메인 - rehype-sanitize 순서 등 핵심 규칙
├── references/
│   ├── xss-vectors.md                # 알려진 XSS 공격 패턴 모음 (Claude가 의심 시 참고)
│   ├── rehype-plugin-order.md        # 파이프라인 순서 상세 명세
│   └── sanitize-config.md            # rehype-sanitize 허용 태그/속성 표
├── scripts/
│   ├── check-pipeline.sh             # 파이프라인 순서 검증 (bash)
│   └── scan-dangerous.py             # 코드에서 위험 패턴 검색 (Python)
└── assets/
    └── allowed-tags.json             # 표준 허용 태그 목록 (참조용)
```

SKILL.md 안에서 이 보조 파일들을 어떻게 가리키는지:

```markdown
## XSS 의심 패턴 발견 시
다음 명령으로 빠른 스캔:
\`\`\`bash
bash ${CLAUDE_SKILL_DIR}/scripts/scan-dangerous.py <file>
\`\`\`

상세 XSS 벡터는 references/xss-vectors.md 참고.
```

> `${CLAUDE_SKILL_DIR}`는 스킬 본인의 디렉토리 경로 변수. 사용자/프로젝트/플러그인 어디에 설치돼도 정확히 해결됨.

---

### 0.5.3 Hook — settings.json + 셸 스크립트 분리

```
.claude/
├── settings.json                     # Hook 등록 (이벤트 → 스크립트 매핑)
└── hooks/                            # 실행될 스크립트들 (관례적 위치, 강제 아님)
    ├── block-dangerous.sh            # PreToolUse — 파괴적 명령 차단
    ├── protect-paths.sh              # PreToolUse — 비밀파일 보호
    ├── pre-commit-check.sh           # PreToolUse — 커밋 전 린트·타입체크
    ├── pre-push-test.sh              # PreToolUse — 푸시 전 테스트
    ├── post-edit-format.sh           # PostToolUse — 자동 포맷
    ├── notify-slack.sh               # Stop — 슬랙 알림
    ├── pre-compact-handoff.sh        # PreCompact — handoff 저장
    └── restore-handoff.sh            # SessionStart — handoff 복원

~/.claude/
├── settings.json                     # 사용자 전역 Hook 등록
└── hooks/                            # 사용자 전역 스크립트
```

#### 파일별 역할 — 한 줄 정리

| 파일 | 역할 |
|------|------|
| `.claude/settings.json` | **이벤트 → 스크립트 매핑 등록**. matcher, if 조건, 실행 명령 정의 |
| `.claude/hooks/*.sh` | **실제 실행될 셸/Python 스크립트**. 위치는 관례, 어디든 가능 |

#### `settings.json` 구조

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "PreToolUse": [                            ← 이벤트 이름
      {
        "matcher": "Bash",                     ← 어떤 도구인지
        "if": "Bash(git push *)",              ← 추가 조건 (2026 신규)
        "hooks": [                             ← ⚠️ 반드시 복수 배열
          {
            "type": "command",                 ← command 또는 http
            "command": "bash .claude/hooks/pre-push-test.sh"
          }
        ]
      }
    ],
    "PostToolUse": [ ... ],
    "Stop": [ ... ],
    "PreCompact": [ ... ],
    "SessionStart": [ ... ]
  }
}
```

#### 스크립트 파일(`*.sh`) 표준 구조

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. stdin JSON 페이로드 받기
payload=$(cat)

# 2. jq로 필요한 필드 추출
cmd=$(echo "$payload" | jq -r '.tool_input.command // ""')
file=$(echo "$payload" | jq -r '.tool_input.file_path // ""')

# 3. 로직 (검증, 변환, 외부 호출 등)
if echo "$cmd" | grep -Eq 'git\s+push\s+.*--force'; then
  echo "⛔ BLOCKED: force push is not allowed" >&2    # stderr → Claude에게 전달
  exit 2                                              # 도구 호출 차단
fi

# 4. 통과
exit 0
```

#### Hook과 디렉터리 — Skill/Command와 다른 점

- Hook **자체엔 디렉터리 표준이 없음**. settings.json에서 명령어 경로만 맞으면 어디든 OK
- 관례적으로 `.claude/hooks/`에 둠 (git에 같이 커밋되어 팀과 공유)
- 사용자 전역 Hook은 `~/.claude/hooks/`에
- **secret(슬랙 webhook URL 등)은 절대 스크립트에 하드코딩 금지** — 환경변수로

---

### 0.5.4 세 자동화의 디렉터리 구조 비교 — 한눈에

```
.claude/
├── settings.json                     ← Hook 등록 (🚨)
│
├── commands/                         ← Slash Command (🎹)
│   ├── commit.md                     ← 단일 파일 = 단축키 1개
│   ├── review.md
│   └── pr.md
│
├── skills/                           ← Skill (📖)
│   ├── handoff/                      ← 디렉터리 = 매뉴얼 1권
│   │   ├── SKILL.md                  ← 표지 + 본문
│   │   ├── scripts/                  ← 부록: 실행 도구
│   │   └── references/               ← 부록: 상세 자료
│   └── changelog/
│       ├── SKILL.md
│       └── references/
│
├── hooks/                            ← Hook 스크립트 (🚨)
│   ├── block-dangerous.sh
│   ├── pre-push-test.sh
│   └── ...
│
└── rules/                            ← (Part 3에서 다룬) 경로별 자동 컨텍스트
    ├── api-routes.md
    └── ...
```

> **`rules/`** 는 본 가이드 범위가 아니지만 같은 `.claude/` 하위라 함께 표기. Level 3.2의 CLAUDE.md 챕터 참고.

---

## Part 1. 필수 Skill / Slash Command 6선

### 1.1 `/handoff` — 세션 인계 (Skill)

#### 개념 — Skill이 뭔가

Skill은 **YAML frontmatter + 마크다운 본문**으로 구성된 SKILL.md 파일이다. Claude가 대화 맥락을 보고 **언제 사용할지 자율 판단**하거나, 사용자가 `/skill-name`으로 직접 호출한다. `.claude/skills/<name>/SKILL.md` 경로에 둔다.

핵심 메커니즘은 **Progressive Disclosure**:
- 세션 시작 시 컨텍스트엔 **각 Skill의 frontmatter(name + description)만** 로드된다
- Claude가 description을 보고 "지금 task에 맞다"고 판단할 때만 본문이 로드됨
- → 토큰 효율 + 자동 발동 가능

#### 왜 필요한가

세션이 `/compact`되거나 `/clear`되면 그동안의 작업 맥락이 사라진다. 다음 세션에서 "어디서 멈췄지?"를 재구성하는 데 시간이 든다. `/handoff`는 **현재 작업 상태를 구조화된 문서로 저장**해 다음 세션이 즉시 이어받게 한다.

> 자동화는 [Part 2의 PreCompact Hook](#27-precompact-handoff-hook)으로. Skill은 **수동 호출 + Hook 자동 실행** 둘 다 가능하게 만든다.

#### 작성법

```yaml
# .claude/skills/handoff/SKILL.md
---
name: handoff
description: >
  Save current work state to HANDOFF.md so the next session can resume.
  Use when the user types /handoff, says "wrap up", "save context",
  or when context usage exceeds 70%.
allowed-tools: Read, Write, Bash(git status:*), Bash(git log:*), Bash(git diff:*)
---

# Session Handoff

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Recent commits: !`git log --oneline -5`
- Modified files: !`git diff --name-only`

## Instructions

Write `HANDOFF.md` at the project root with the following structure:

```markdown
# HANDOFF — {ISO date} (session: {short id})

## 이번 세션에서 한 일
- (위 git status / diff에서 추론)

## 다음에 이어서 할 일
- [ ] (현재 대화에서 미완료된 task)

## 결정된 사항
- (이번 세션에서 합의된 컨벤션·아키텍처 결정)

## 미해결 이슈 / 막힌 곳
- (디버깅 중인 문제, 미정 사양)

## 관련 파일
- (수정된 파일 경로 리스트)
```

If HANDOFF.md exists, archive it to `.claude/handoff/archive/{timestamp}.md` first.
$ARGUMENTS
```

#### 핵심 포인트

- **`!`git ...`` 동적 컨텍스트 주입**: Claude Code가 명령을 실행해 출력을 본문에 치환한 뒤 모델에게 전달. *모델이 직접 도구를 호출하지 않아도* 최신 git 상태가 자동으로 들어감
- **`allowed-tools`**: 이 Skill 실행 중 허용되는 도구를 화이트리스트로 제한. Read·Write·git status/log/diff만 허용 (다른 git 명령은 차단)
- **`$ARGUMENTS`**: 사용자가 `/handoff "DB 마이그레이션 작업 중"` 처럼 인자를 주면 그대로 치환됨

#### 사용

```bash
# 명시적 호출
> /handoff

# 또는 Claude가 자동 판단해 호출 (description 보고)
> 오늘 작업 마무리하고 싶은데 정리 좀
```

---

### 1.2 `/memory` — CLAUDE.md 갱신 (Command)

#### 개념 — Slash Command가 뭔가

Slash Command는 사용자가 `/name`으로 **명시적으로 호출**하는 재사용 프롬프트다. `.claude/commands/*.md` (프로젝트) 또는 `~/.claude/commands/` (전역)에 둔다.

> Claude Code 빌트인 `/memory`는 **CLAUDE.md 편집기를 여는** 명령. 여기서는 그것과 다른, **"이번 세션의 교훈을 CLAUDE.md에 자동 추가"** 하는 커스텀 커맨드를 만든다.

#### 왜 필요한가

Claude가 같은 실수를 반복할 때(잘못된 import 경로, `any` 사용, 컨벤션 위반 등) 그 자리에서 수정만 하고 끝내면 **다음 세션에서 또 같은 실수**가 난다. `/memory`는 그 교훈을 **CLAUDE.md에 영구 추가**해 살아있는 문서로 진화시키는 패턴이다.

#### 작성법

```yaml
# .claude/commands/memory.md
---
description: Add a lesson learned to CLAUDE.md so it persists across sessions
allowed-tools: Read, Edit
---

Add the following lesson to `CLAUDE.md`:

**Lesson**: $ARGUMENTS

## Instructions

1. Read the current `CLAUDE.md`
2. Identify the most appropriate section to add this lesson:
   - "Safety" if it's a "never do X" rule
   - "Conventions" if it's a style/pattern rule
   - "Architecture" if it's a structural rule
   - Create a new section if none fits
3. Append the lesson as a single-line bullet, prefixed with date if helpful
4. Re-read the modified CLAUDE.md and confirm it's still under 150 lines
5. If it's over 150 lines, suggest moving content to `.claude/rules/` or `docs/`
```

#### 사용 예시

```bash
> /memory 패키지 간 import는 항상 @markflow/* alias 사용. 상대 경로 금지.
> /memory rehype-sanitize는 markdown 파이프라인 마지막에 위치해야 함.
> /memory main 브랜치 직접 push 금지. 항상 PR 경유.
```

→ CLAUDE.md가 점점 살아있는 학습 기록이 된다.

---

### 1.3 `/commit` — 커밋 메시지 자동 생성 (Command)

이건 거의 모든 프로젝트에서 필요한 커맨드. **Conventional Commits 포맷**으로 staged diff를 분석해 메시지를 만든다.

#### 작성법

```yaml
# .claude/commands/commit.md
---
description: Stage and commit changes with a Conventional Commits message
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git log:*), Bash(git branch:*)
---

## Context

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Staged diff: !`git diff --staged`
- Unstaged diff: !`git diff`
- Recent commits (style reference): !`git log --oneline -10`

## Your Task

1. **Stage**: If nothing is staged, ask the user if they want to stage all changes (`git add -A`). Otherwise commit only what's staged.

2. **Analyze the diff** to understand:
   - Which files changed and what kind of change
   - Primary intent (new feature, bug fix, refactor, docs, ...)

3. **Generate 2~3 commit message candidates** in Conventional Commits format:
   ```
   <type>(<scope>): <subject>

   <body — optional, only if non-trivial>
   ```
   - Allowed types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`, `perf`, `build`, `ci`
   - Subject ≤ 72 characters, imperative mood, no trailing period
   - Scope is optional but encouraged (e.g., `feat(editor): ...`)

4. **Pick the best one** and explain why in 1 sentence.

5. **Commit** with the chosen message. Do NOT add the "Generated with Claude Code" footer.

6. Show `git log -1 --stat` so the user can verify.
```

#### 사용

```bash
> /commit
```

#### 핵심 포인트

- **`allowed-tools`로 권한 한정**: 이 커맨드는 git 관련 명령만 실행 가능. `rm`, 파일 편집 등은 차단됨
- **동적 컨텍스트 (`!`git ...``)**: 명령 호출 시점에 git 상태가 자동으로 본문에 박혀서 모델 전달
- **푸터 제거 지시**: 기본적으로 Claude는 "Generated with Claude Code" 푸터를 붙이려는 경향이 있음. 명시적으로 끄기

---

### 1.4 `/changelog` — Keep a Changelog 포맷 자동 생성 (Skill)

#### 왜 Skill로 만드나

`/changelog`는 "지난 릴리스부터 어떤 변경이 있었는지 정리해줘" 같은 자연어로도 자동 발동되면 좋다. 그래서 Skill로 만든다(Claude가 description 보고 자동 판단).

#### 작성법

```yaml
# .claude/skills/changelog/SKILL.md
---
name: changelog
description: >
  Generate a Keep a Changelog formatted entry from recent git commits.
  Use when the user asks to write release notes, update the changelog,
  summarize recent changes for a release, or types /changelog.
allowed-tools: Read, Write, Edit, Bash(git log:*), Bash(git tag:*), Bash(git describe:*)
---

## Context

- Latest tag: !`git describe --tags --abbrev=0 2>/dev/null || echo "none"`
- Commits since latest tag: !`git log $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --oneline 2>/dev/null || git log --oneline -20`
- Current date: !`date -I`

## Your Task

Generate a changelog entry in **Keep a Changelog** format (https://keepachangelog.com).

### Steps

1. **Parse commits** since the latest tag (or last 20 if no tag)
2. **Categorize** each commit by Conventional Commits prefix:
   - `feat:` → **Added**
   - `fix:` → **Fixed**
   - `refactor:` / `perf:` → **Changed**
   - `docs:` → **Documentation**
   - `BREAKING CHANGE:` or `!:` → **⚠️ Breaking**
   - `chore:` / `test:` / `ci:` / `build:` → skip
3. **Write a human-readable description** for each entry (not just the commit subject)
4. **Group related changes** into a single bullet when they belong together
5. **Determine version** by `$ARGUMENTS` or ask the user (semver bump suggestion: major/minor/patch)

### Output Format

```markdown
## [{version}] - {YYYY-MM-DD}

### Added
- 사용자 친화적 설명 (commit subject 그대로 X)

### Changed
- ...

### Fixed
- ...

### ⚠️ Breaking
- (있을 때만)
```

### Actions

1. If `CHANGELOG.md` exists, prepend the new entry under `## [Unreleased]` or directly above the most recent version block
2. If it doesn't exist, create it with Keep a Changelog header
3. Show the final diff before saving
```

#### 사용

```bash
> /changelog v1.3.0
# 또는 자연어
> 지난 릴리스부터 뭐 바뀌었는지 정리해서 changelog 업데이트해줘
```

---

### 1.5 `/review` — 프로젝트 컨벤션 기반 코드 리뷰 (Command)

빌트인 `/review`가 있지만, **프로젝트 특화 체크리스트**가 필요할 때 커스텀으로 덮어쓴다.

```yaml
# .claude/commands/review.md
---
description: Review staged/unstaged changes against project conventions
allowed-tools: Read, Bash(git diff:*), Bash(git status:*), Glob, Grep
---

## Context

- Status: !`git status --short`
- Staged diff: !`git diff --staged`
- Unstaged diff: !`git diff`

## Review Checklist (markflow 기준)

### 🔴 Critical (반드시 통과)
- TypeScript `any` 사용 여부
- `dangerouslySetInnerHTML` / `innerHTML` 직접 사용 여부
- 마크다운 렌더링 파이프라인에서 `rehype-sanitize`가 마지막인지
- DB 쿼리에 raw SQL 문자열 보간 (Drizzle 쿼리 빌더 미사용)
- 환경변수 하드코딩, secret 노출

### 🟡 Warning
- API 응답 형식: `Result<T, E>` 패턴 준수
- Zod 스키마 검증 누락된 입력 경로
- N+1 쿼리 패턴
- 누락된 에러 핸들링

### 🟢 Suggestion
- 변수/함수 네이밍 일관성
- 주석 / JSDoc 누락
- 테스트 누락 (구현 추가됐는데 테스트 없음)

## Output

각 발견 사항을 다음 형식으로 출력:

- **[심각도]** `파일:라인` — 문제 요약
  - 현재: (코드 인용)
  - 제안: (수정안)

마지막에 한 줄 요약:
- 🔴 N건 / 🟡 N건 / 🟢 N건 — Critical이 0건이어야 commit 가능
```

---

### 1.6 `/pr` — Pull Request 디스크립션 자동 생성 (Command)

```yaml
# .claude/commands/pr.md
---
description: Open a Pull Request with auto-generated title and body
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git branch:*), Bash(git push:*), Bash(gh pr:*)
---

## Context

- Current branch: !`git branch --show-current`
- Base branch: main
- Commits in this branch: !`git log main..HEAD --oneline`
- Diff vs main: !`git diff main..HEAD --stat`

## Your Task

1. **Verify branch state**:
   - Not on `main` (refuse if yes)
   - Has at least 1 commit ahead of main
   - All changes committed (no uncommitted changes)

2. **Push branch** if not pushed: `git push -u origin $(git branch --show-current)`

3. **Generate PR title**:
   - Use the most significant commit's subject
   - If multiple commit types, pick the one with widest scope

4. **Generate PR body** in this format:

```markdown
## Summary
- 무엇을 했는지 2~3줄

## Changes
- 주요 변경사항 bullet (커밋 별이 아니라 의미 단위)

## Test Plan
- [ ] 단위 테스트 통과
- [ ] (해당 시) E2E 시나리오 N건 추가/수정
- [ ] (해당 시) 로컬에서 수동 검증한 케이스

## Notes
- 리뷰어가 알아야 할 컨텍스트 (있을 때만)
```

5. **Create PR**:
   ```bash
   gh pr create --base main --title "<title>" --body "<body>" --draft
   ```
   Always use `--draft` first. User upgrades to "Ready for review" manually.

6. Show PR URL.
```

#### 사용

```bash
> /pr
```

> **⚠️ Hook과 조합**: `mcp__github__create_pull_request` (또는 `gh pr create`)는 Part 2의 [PR 전 테스트 강제 Hook](#25-pr--push-전-테스트-강제-hook-pretooluse)으로 보호해야 한다. 테스트 실패 시 PR 생성 자체가 차단됨.

---

## Part 2. 필수 Hook 8선

### 2.0 Hook 개념 한 번 더

Hook은 **Claude Code의 특정 이벤트 시점에 외부 셸 스크립트를 실행**하는 결정론적 메커니즘이다. `.claude/settings.json` (프로젝트) 또는 `~/.claude/settings.json` (전역)에 등록한다.

#### 12개 이벤트 (2026.05 기준)

| 이벤트 | 발화 시점 | 주 용도 |
|--------|---------|---------|
| `PreToolUse` | 도구 실행 **전** | 차단, 사전 검증, 백업 |
| `PostToolUse` | 도구 실행 **후 (성공)** | 포맷, 린트, 자동 수정 |
| `PostToolUseFailure` | 도구 실행 **후 (실패)** | 에러 로깅 |
| `PermissionRequest` | 권한 요청 시 | 자동 승인 룰 |
| `PermissionDenied` | 권한 거부 시 | 대안 안내 |
| `UserPromptSubmit` | 사용자 프롬프트 제출 시 | 자동 라우팅, 컨텍스트 주입 |
| `Stop` | 응답 1턴 완료 시 | 검증, 알림 |
| `StopFailure` | 응답 실패로 종료 시 | 에러 알림 |
| `PreCompact` | `/compact` 직전 | handoff 저장 |
| `SessionStart` | 세션 시작 시 | handoff 복원, 컨텍스트 주입 |
| `SessionEnd` | 세션 종료 시 | 정리 |
| `TaskCreated` / `TaskCompleted` | 백그라운드 task 이벤트 | 추적 |

> 출처: [Claude Code Hooks 공식 reference](https://code.claude.com/docs/en/hooks)

#### Exit code 규약

| Exit code | 동작 | stderr 처리 |
|-----------|------|-----------|
| `0` | 성공, 정상 진행 | stdout만 사용자에게 표시 |
| `1` | **비차단 오류** — 실행 계속 | stderr는 사용자에게만, Claude엔 전달 X |
| `2` | **차단** — 도구 호출 거부 | **stderr가 Claude에게 전달** → 재시도 유도 |
| 기타 | 비차단 오류 | `1`과 동일 |

> ⚠️ **핵심**: 정책 강제는 항상 `exit 2`. `exit 1`은 경고만 띄우고 작업은 그대로 진행된다.

#### stdin JSON 페이로드

Hook은 **stdin으로 JSON 페이로드**를 받는다 (환경변수 아님). 표준 파싱은 `jq`.

```json
{
  "session_id": "abc123",
  "cwd": "/home/user/markflow",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "git push origin main"
  },
  "transcript_path": "/tmp/transcript.jsonl"
}
```

#### matcher와 `if` 조건

```json
"matcher": "Bash"                       // Bash 도구 전체
"matcher": "Write|Edit"                 // 파일 쓰기·편집
"matcher": "mcp__github__.*"            // GitHub MCP의 모든 도구
"matcher": ""                           // 모든 도구
```

추가로 **`if` 필드**는 permission rule 문법으로 더 좁게 매칭한다 (2026 신규):

```json
"if": "Bash(git push *)"               // git push 서브커맨드만
"if": "Edit(*.ts)"                     // TypeScript 파일만
```

> 출처: [Hooks reference 공식](https://code.claude.com/docs/en/hooks)

#### **⚠️ 포맷 주의 — `hook` (단수) ❌  `hooks` (복수 배열) ✅**

```jsonc
// ❌ 잘못된 포맷 (구버전 — Settings Error)
{ "matcher": "Bash", "hook": { "type": "command", "command": "..." } }

// ✅ 올바른 포맷
{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "..." }] }
```

잘못 쓰면 `claude config list` 실행 시 `Settings Error`가 발생하고 **파일 전체가 무시**된다.

---

이제 8개 필수 훅을 차례로 본다.

### 2.1 파괴적 명령 차단 Hook (PreToolUse)

#### 목적

`rm -rf /`, `git push --force origin main`, `git reset --hard`, `chmod 777` 같은 **돌이킬 수 없는 명령**을 Claude가 실행하기 전에 차단한다.

#### 작성

`.claude/hooks/block-dangerous.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# stdin JSON에서 명령 추출
cmd=$(jq -r '.tool_input.command // ""')

# 위험 패턴
DANGEROUS=(
  'rm\s+(-[a-z]*r[a-z]*f|--recursive\s+--force)\s+/'  # rm -rf /
  'rm\s+(-[a-z]*r[a-z]*f|--recursive\s+--force)\s+\.\s*$'  # rm -rf .
  'rm\s+(-[a-z]*r[a-z]*f|--recursive\s+--force)\s+\$HOME'
  'sudo\s+rm'
  'chmod\s+-?R?\s*777'
  'git\s+push\s+.*--force.*\s+(main|master|production)'
  'git\s+push\s+.*-f\s+.*(main|master|production)'
  'git\s+reset\s+--hard'
  'git\s+clean\s+-fdx'
  'git\s+branch\s+-D\s+(main|master)'
  '>\s*/etc/'
  ':\s*\(\)\s*\{.*:\s*\|\s*:'  # fork bomb
  'dd\s+if=.*of=/dev/'
  'mkfs\.'
)

for pattern in "${DANGEROUS[@]}"; do
  if echo "$cmd" | grep -Eiq "$pattern"; then
    echo "⛔ BLOCKED: '$cmd' matches dangerous pattern '$pattern'" >&2
    echo "Suggest a safer alternative or ask the user to run this manually." >&2
    exit 2
  fi
done

exit 0
```

#### 등록

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/block-dangerous.sh"
          }
        ]
      }
    ]
  }
}
```

#### 동작

```
Claude: git push --force origin main
  → PreToolUse Hook 실행
  → 패턴 매칭됨
  → stderr 출력 + exit 2
  → 도구 호출 차단됨
  → stderr가 Claude에게 전달 → Claude가 안전한 대안 시도
```

> **공식 인용**: *"PreToolUse hook ... If the hook exits with code 2, the action is blocked and the error message is fed back to Claude so it can adjust."*

---

### 2.2 비밀파일 보호 Hook (PreToolUse)

#### 목적

`.env`, `credentials`, `*.pem`, `package-lock.json` 같은 **수동으로만 만져야 하는 파일**을 Claude가 편집하지 못하게 막는다.

#### 작성

`.claude/hooks/protect-paths.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# stdin JSON에서 파일 경로 추출 (Write/Edit는 file_path, MultiEdit도 동일)
file=$(jq -r '.tool_input.file_path // .tool_input.path // ""')

if [ -z "$file" ]; then exit 0; fi

# 보호 패턴
PROTECTED=(
  '\.env(\..+)?$'           # .env, .env.local, .env.production
  '\.envrc$'
  '/credentials$'
  '\.pem$'
  '\.key$'
  '/\.ssh/'
  '/\.aws/'
  '/\.gnupg/'
  '/\.kube/config'
  'package-lock\.json$'
  'pnpm-lock\.yaml$'
  'yarn\.lock$'
  '/drizzle/meta/'          # markflow Drizzle 마이그레이션 메타
  '/\.git/'
)

for pattern in "${PROTECTED[@]}"; do
  if echo "$file" | grep -Eq "$pattern"; then
    echo "⛔ BLOCKED: '$file' is a protected path." >&2
    echo "Ask the user to modify this file manually, or explain why this change is necessary." >&2
    exit 2
  fi
done

exit 0
```

#### 등록

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/protect-paths.sh" }
        ]
      }
    ]
  }
}
```

---

### 2.3 커밋 전 린트 · 타입체크 강제 Hook (PreToolUse)

#### 목적

Claude가 `git commit`을 실행하기 전에 **린트·타입체크를 자동으로 돌리고, 실패 시 커밋 차단**.

> **왜 git pre-commit hook이 아니라 Claude Code hook?**
> 둘 다 써야 한다. git pre-commit hook은 휴먼이 직접 commit할 때 동작, Claude Code hook은 Claude가 commit할 때 동작. 두 경로 모두 막혀야 안전.

#### 작성

`.claude/hooks/pre-commit-check.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cmd=$(jq -r '.tool_input.command // ""')

# git commit이 아니면 통과
if ! echo "$cmd" | grep -Eq '^git\s+commit'; then
  exit 0
fi

# 린트 (Biome 또는 ESLint)
if [ -f biome.json ] || [ -f biome.jsonc ]; then
  if ! pnpm -s biome check . 2>&1 | tail -20 >&2; then
    echo "" >&2
    echo "❌ Lint failed. Fix lint errors before committing." >&2
    echo "Run: pnpm biome check --write ." >&2
    exit 2
  fi
elif [ -f .eslintrc.json ] || [ -f eslint.config.js ]; then
  if ! pnpm -s lint 2>&1 | tail -20 >&2; then
    echo "❌ ESLint failed. Run: pnpm lint --fix" >&2
    exit 2
  fi
fi

# 타입체크
if [ -f tsconfig.json ]; then
  if ! pnpm -s typecheck 2>&1 | tail -20 >&2; then
    echo "" >&2
    echo "❌ Type check failed. Fix type errors before committing." >&2
    exit 2
  fi
fi

exit 0
```

#### 등록

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "if": "Bash(git commit*)",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-commit-check.sh" }
        ]
      }
    ]
  }
}
```

> **`if` 필드**로 `git commit` 서브커맨드만 매칭. 다른 git 명령은 통과시켜 성능 영향 최소화.

---

### 2.4 자동 포맷 · 린트 수정 Hook (PostToolUse)

#### 목적

Claude가 파일을 수정한 **직후 자동으로 prettier/biome으로 포맷**하고 ESLint auto-fix를 적용. 모델이 코드 스타일을 100% 지키지 못해도 결과물은 항상 깔끔.

#### 작성

`.claude/hooks/post-edit-format.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

file=$(jq -r '.tool_input.file_path // .tool_input.path // ""')
[ -z "$file" ] && exit 0
[ ! -f "$file" ] && exit 0

# TypeScript / JavaScript / JSON / Markdown만 대상
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.mdx|*.css|*.scss)
    ;;
  *)
    exit 0
    ;;
esac

# Biome 우선 (markflow 기본), 없으면 prettier + eslint
if command -v biome &>/dev/null || [ -f biome.json ]; then
  pnpm exec biome check --write "$file" 2>/dev/null || true
else
  pnpm exec prettier --write "$file" 2>/dev/null || true
  pnpm exec eslint --fix "$file" 2>/dev/null || true
fi

exit 0
```

#### 등록

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/post-edit-format.sh" }
        ]
      }
    ]
  }
}
```

> **`exit 0` always**: PostToolUse는 도구가 이미 실행된 뒤라 차단할 수 없다. 포맷 실패해도 작업 흐름을 끊지 말 것.

---

### 2.5 PR · Push 전 테스트 강제 Hook (PreToolUse)

#### 목적

`git push` 또는 `gh pr create` (또는 `mcp__github__create_pull_request`) 실행 전에 **테스트를 강제로 돌리고 실패 시 차단**.

#### 작성

`.claude/hooks/pre-push-test.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 매칭은 settings.json의 if 필드에서 처리. 여기선 실행만.

echo "🧪 Running tests before push/PR..." >&2

if ! pnpm -s test --run 2>&1 | tail -40 >&2; then
  echo "" >&2
  echo "❌ Tests failed. Fix tests before pushing." >&2
  echo "Run locally: pnpm test --run" >&2
  exit 2
fi

echo "✅ Tests passed." >&2
exit 0
```

#### 등록

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "if": "Bash(git push*)",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-push-test.sh" }
        ]
      },
      {
        "matcher": "Bash",
        "if": "Bash(gh pr create*)",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-push-test.sh" }
        ]
      },
      {
        "matcher": "mcp__github__create_pull_request",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-push-test.sh" }
        ]
      }
    ]
  }
}
```

#### 동작

```
Claude: gh pr create --title "feat: add tag filter"
  → PreToolUse Hook 실행 → 테스트 실행
  → 실패 → exit 2 → PR 생성 차단
  → Claude가 stderr 보고 "테스트 먼저 고쳐야 함" 인식
```

---

### 2.6 작업 완료 Slack 알림 Hook (Stop)

#### 목적

긴 작업이 끝났을 때 **Slack 채널로 알림**. 다른 화면 보고 있어도 즉시 알 수 있게.

#### 작성

`.claude/hooks/notify-slack.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 환경변수에서 webhook URL 읽기 (settings.json에 노출하지 말 것)
WEBHOOK="${SLACK_WEBHOOK_URL:-}"
if [ -z "$WEBHOOK" ]; then exit 0; fi

# 세션 정보
session_id=$(jq -r '.session_id // "unknown"')
cwd=$(jq -r '.cwd // ""')
project=$(basename "$cwd")

message="✅ Claude Code 작업 완료 — \`$project\` (session: ${session_id:0:8})"

curl -s -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$message\"}" \
  "$WEBHOOK" >/dev/null 2>&1 || true

exit 0
```

#### 등록

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/notify-slack.sh" }
        ]
      }
    ]
  }
}
```

#### 보안 주의

- **webhook URL은 절대 settings.json에 하드코딩하지 말 것**. git에 노출됨
- 환경변수 또는 `.env.local`(gitignore) 에 두고 셸 init 파일에서 export

```bash
# ~/.zshrc 또는 ~/.bashrc
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

---

### 2.7 PreCompact Handoff Hook (PreCompact + SessionStart)

#### 목적

`/compact`나 auto-compact (컨텍스트 ~95%) 직전에 **HANDOFF.md를 자동으로 작성**하고, 새 세션 시작 시 자동으로 복원.

§1.1의 `/handoff` Skill을 **자동 발동**으로 만드는 단계.

#### 작성

`.claude/hooks/pre-compact-handoff.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cwd=$(jq -r '.cwd // "."')
session_id=$(jq -r '.session_id // "unknown"')
session_short="${session_id:0:8}"

cd "$cwd"

# git 정보 수집
branch=$(git branch --show-current 2>/dev/null || echo "?")
status=$(git status --short 2>/dev/null | head -30)
recent=$(git log --oneline -5 2>/dev/null)

# HANDOFF.md 작성
cat > HANDOFF.md <<EOF
# HANDOFF — $(date -Iseconds) (session: $session_short)

> 자동 생성됨 (PreCompact Hook). compact 직후 다음 세션이 복원합니다.

## Branch
$branch

## Modified files (git status)
\`\`\`
$status
\`\`\`

## Recent commits
\`\`\`
$recent
\`\`\`

## TODO (다음 세션에서 이어서)
- [ ] (사람이 채워 넣거나 Claude에게 정리 요청)
EOF

echo "📌 HANDOFF.md 작성됨 — 다음 세션이 자동으로 복원합니다." >&2
exit 0
```

`.claude/hooks/restore-handoff.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# SessionStart Hook의 stdout은 새 세션의 초기 컨텍스트에 자동 주입됨
if [ -f HANDOFF.md ]; then
  echo "📥 Previous session handoff:"
  echo ""
  cat HANDOFF.md
fi

exit 0
```

#### 등록

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-compact-handoff.sh" }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/restore-handoff.sh" }
        ]
      }
    ]
  }
}
```

> **`matcher: ""`**: auto-compact와 수동 `/compact` 모두 매칭. `"auto"`만 쓰면 수동은 안 잡힘. `"manual"`만 쓰면 자동은 안 잡힘.
>
> 출처: [Hooks reference — PreCompact matcher](https://code.claude.com/docs/en/hooks)

---

### 2.8 자동 커밋 메시지 작성 Hook (PostToolUse) — 선택 사항

#### 목적

Claude가 코드 수정을 끝낼 때마다 자동으로 staged 변경을 커밋. **YOLO 모드** 또는 **장시간 자율 실행** 시 유용.

> ⚠️ 권장하지 않는 기본값. **본인 작업 중에는 끄고**, Docker sandbox 같은 격리 환경에서만 활성화.

`.claude/hooks/auto-commit.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 활성화 플래그 — 환경변수로 명시적으로 켜야 동작
[ "${CLAUDE_AUTO_COMMIT:-0}" != "1" ] && exit 0

cd "$(jq -r '.cwd // "."')"

# staged 변경이 없으면 자동 stage
git add -A 2>/dev/null

# 변경 없으면 종료
if git diff --cached --quiet; then exit 0; fi

# 단순 커밋 메시지 (실제 메시지는 /commit 커맨드로 별도 생성 권장)
git commit -m "chore(auto): Claude Code edit at $(date +%H:%M)" 2>&1 | tail -3 >&2 || true
exit 0
```

#### 등록 (선택적)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/auto-commit.sh" }
        ]
      }
    ]
  }
}
```

---

## Part 3. 통합 — markflow 표준 `.claude/settings.json`

위 6개 커맨드 + 1개 Skill + 7개 Hook (선택사항인 자동 커밋 제외)을 한 번에 깔아두는 통합 예시.

```jsonc
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",

  // ── 권한 사전 허가/차단 (Hook 외 1차 방어막) ──
  "permissions": {
    "allow": [
      "Bash(pnpm dev)",
      "Bash(pnpm test*)",
      "Bash(pnpm typecheck)",
      "Bash(pnpm lint*)",
      "Bash(pnpm biome*)",
      "Bash(pnpm db:*)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git branch*)",
      "Bash(git add*)",
      "Bash(git commit*)",
      "Bash(git push)",
      "Bash(git push origin*)",
      "Bash(gh pr*)",
      "Bash(cat *)",
      "Bash(find *)",
      "Bash(grep *)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -fd*)",
      "Bash(git commit --no-verify*)",
      "Bash(rm -rf*)",
      "Bash(sudo*)",
      "Read(.env*)",
      "Read(*.pem)",
      "Read(.ssh/*)",
      "Read(.aws/*)"
    ]
  },

  // ── Hook 등록 ──
  "hooks": {
    "PreToolUse": [
      // 파괴적 명령 차단
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/block-dangerous.sh" }
        ]
      },
      // 비밀파일 보호
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/protect-paths.sh" }
        ]
      },
      // 커밋 전 린트 · 타입체크
      {
        "matcher": "Bash",
        "if": "Bash(git commit*)",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-commit-check.sh" }
        ]
      },
      // 푸시 전 테스트
      {
        "matcher": "Bash",
        "if": "Bash(git push*)",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-push-test.sh" }
        ]
      },
      // PR 생성 전 테스트
      {
        "matcher": "Bash",
        "if": "Bash(gh pr create*)",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-push-test.sh" }
        ]
      },
      {
        "matcher": "mcp__github__create_pull_request",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-push-test.sh" }
        ]
      }
    ],
    "PostToolUse": [
      // 수정 후 자동 포맷
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/post-edit-format.sh" }
        ]
      }
    ],
    "Stop": [
      // Slack 알림
      {
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/notify-slack.sh" }
        ]
      }
    ],
    "PreCompact": [
      // handoff 자동 작성
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/pre-compact-handoff.sh" }
        ]
      }
    ],
    "SessionStart": [
      // handoff 자동 복원
      {
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/restore-handoff.sh" }
        ]
      }
    ]
  }
}
```

### 디렉터리 구조 (전체)

```
markflow/
├── CLAUDE.md                              # 프로젝트 룰북 (Level 3.2)
├── HANDOFF.md                             # PreCompact Hook이 자동 작성/복원
│
├── .claude/
│   ├── settings.json                      # 권한 + Hook 등록
│   │
│   ├── commands/                          # 🎹 단축키 (단일 파일)
│   │   ├── memory.md                      # /memory  — CLAUDE.md 갱신
│   │   ├── commit.md                      # /commit  — 커밋 메시지 자동
│   │   ├── review.md                      # /review  — 프로젝트 컨벤션 리뷰
│   │   └── pr.md                          # /pr      — PR 생성
│   │
│   ├── skills/                            # 📖 매뉴얼 (디렉터리 구조)
│   │   ├── handoff/
│   │   │   └── SKILL.md                   # 단순 스킬 — SKILL.md만
│   │   │
│   │   ├── changelog/
│   │   │   ├── SKILL.md                   # 진입점
│   │   │   └── references/                # ← 추가 자료 (필요 시 로드)
│   │   │       ├── conventional-commits.md
│   │   │       └── keep-a-changelog.md
│   │   │
│   │   └── markdown-security/             # 복잡한 스킬 — 풀 구조
│   │       ├── SKILL.md                   # 진입점 (~300줄)
│   │       ├── scripts/                   # ← 실행 코드 (토큰 0)
│   │       │   ├── scan-dangerous.py
│   │       │   └── check-pipeline.sh
│   │       ├── references/                # ← 추가 문서 (필요 시 로드)
│   │       │   ├── xss-vectors.md
│   │       │   ├── rehype-plugin-order.md
│   │       │   └── sanitize-config.md
│   │       └── assets/                    # ← 출력용 정적 파일
│   │           └── allowed-tags.json
│   │
│   ├── hooks/                             # 🚨 이벤트 트리거 (셸 스크립트)
│   │   ├── block-dangerous.sh             # PreToolUse
│   │   ├── protect-paths.sh               # PreToolUse
│   │   ├── pre-commit-check.sh            # PreToolUse — git commit*
│   │   ├── pre-push-test.sh               # PreToolUse — git push* / gh pr*
│   │   ├── post-edit-format.sh            # PostToolUse
│   │   ├── notify-slack.sh                # Stop
│   │   ├── pre-compact-handoff.sh         # PreCompact
│   │   └── restore-handoff.sh             # SessionStart
│   │
│   └── rules/                             # (Level 3.2) 경로별 자동 컨텍스트
│       ├── api-routes.md                  # paths: apps/web/app/api/**
│       ├── editor.md                      # paths: packages/editor/**
│       └── security.md                    # paths: **/auth/**, **/api/**
│
└── apps/ packages/ ...                    # 실제 코드
```

### 파일별 역할 한눈에

| 카테고리 | 경로 | 비유 | 역할 |
|---|---|---|---|
| **Command** 🎹 | `.claude/commands/<name>.md` | 단축키 | 사용자가 `/name`으로 호출하는 사전 정의 프롬프트 |
| **Skill 진입점** 📖 | `.claude/skills/<name>/SKILL.md` | 매뉴얼 표지·본문 | 자동/수동 호출 시 컨텍스트에 로드되는 메인 지시 |
| **Skill scripts/** | `.../skills/<name>/scripts/*` | 매뉴얼 부록: 도구 | Claude가 bash로 실행, **코드 토큰 0** |
| **Skill references/** | `.../skills/<name>/references/*` | 매뉴얼 부록: 자료 | SKILL.md가 가리킬 때만 추가 로드 |
| **Skill assets/** | `.../skills/<name>/assets/*` | 매뉴얼 부록: 양식 | 출력 생성에 쓸 템플릿·이미지 |
| **Hook 설정** 🚨 | `.claude/settings.json` | 알람 설치 도면 | 이벤트 → 스크립트 매핑 등록 |
| **Hook 스크립트** | `.claude/hooks/*.sh` | 알람 본체 | 실제 발화되는 셸/Python 스크립트 |
| **컨텍스트 룰북** | `CLAUDE.md` | 사무실 벽보 | 세션 시작 시 자동 주입 (Level 3.2) |
| **세션 인계** | `HANDOFF.md` | 인수인계서 | Hook이 자동 작성/복원 |

### 설치 한 줄

```bash
# 모든 hook 스크립트에 실행 권한 부여
chmod +x .claude/hooks/*.sh
chmod +x .claude/skills/*/scripts/*       # Skill 스크립트도 동일

# Slack 알림용 webhook URL (옵션) — secret이라 환경변수로
echo 'export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."' >> ~/.zshrc

# 검증
claude config list   # 에러 없이 표시되면 OK
/hooks               # 등록된 Hook 목록
/skills              # 로드된 Skill 목록
```

---

## Part 4. Skill · Command · Hook 언제 무엇을 쓰나 — 의사결정 트리

```
[자동화하고 싶은 작업]
    │
    ├─ 사이드이펙트 발생? (deploy/push/send)
    │   YES → 사용자만 호출 가능해야 함
    │         → Command 또는 Skill with `disable-model-invocation: true`
    │
    ├─ "절대 안 됨"인가? (force push / rm -rf)
    │   YES → 결정론적 강제 필요
    │         → Hook (PreToolUse with exit 2)
    │
    ├─ 자동으로 발동되어야 하나? (자연어로 트리거)
    │   YES → Skill (description으로 자동 매칭)
    │
    ├─ 매 도구 호출마다 자동 실행? (포맷·린트)
    │   YES → Hook (PostToolUse)
    │
    ├─ 세션 시작/종료/compact 시 자동?
    │   YES → Hook (SessionStart / SessionEnd / PreCompact)
    │
    └─ 단순히 반복 프롬프트를 한 줄로?
        YES → Command (.claude/commands/*.md)
```

### 조합 예시 — `/commit`은 Command + Hook 콤보

| 단계 | 도구 | 동작 |
|------|------|------|
| 1 | 사용자가 `/commit` 입력 | Command 발동 |
| 2 | Command이 `git diff --staged` 분석 | Skill 본문 실행 |
| 3 | Conventional Commits 메시지 생성 | Claude 출력 |
| 4 | `git commit -m "..."` 실행 | Bash 도구 호출 |
| 5 | **PreToolUse Hook 발동 (`if: Bash(git commit*)`)** | 린트·타입체크 실행 |
| 6 | 통과 시 → 커밋 완료, 실패 시 → `exit 2`로 차단 | |
| 7 | (Stop 시점) Slack 알림 | Stop Hook |

Skill + Hook 둘 다 있어야 안전한 자동화가 완성된다.

---

## Part 5. 디버깅 · 흔한 실수

### 5.1 검증 명령

```bash
# Hook 설정 유효성 확인
claude config list

# 등록된 Hook 목록 보기
/hooks

# 등록된 Skill / Command 목록 보기
/skills
/help        # 빌트인 + 커스텀 다 보임

# 디버그 모드
claude --debug
```

### 5.2 자주 발생하는 실수

| 실수 | 증상 | 해결 |
|------|------|------|
| `hook` (단수) 사용 | Settings Error, 파일 전체 무시 | `hooks` (복수 배열)로 변경 |
| stdout vs stderr 헷갈림 | 차단되지 않음 | 에러 메시지를 stderr로 (`echo "..." >&2`) |
| `exit 1` 으로 차단 시도 | 비차단 경고만 됨 | 차단은 반드시 `exit 2` |
| webhook URL 노출 | settings.json git 커밋 시 노출 | 환경변수 사용 |
| Hook 스크립트 실행 권한 누락 | `Permission denied` | `chmod +x .claude/hooks/*.sh` |
| `jq` 미설치 환경 | stdin 파싱 실패 | `apt install jq` / `brew install jq` |
| matcher 패턴 잘못 | Hook 안 실행됨 | `/hooks`로 확인, debug 로그 |
| PostToolUse에서 차단 시도 | 이미 실행됨 | PreToolUse로 옮기기 |

### 5.3 Hook이 실행되는지 확인하는 가장 빠른 방법

```bash
# 임시 디버그 hook 추가
{
  "PreToolUse": [{
    "matcher": "Bash",
    "hooks": [{
      "type": "command",
      "command": "echo \"$(date) $(jq -r '.tool_input.command')\" >> /tmp/claude-hook-debug.log"
    }]
  }]
}

# 실행 후
tail -f /tmp/claude-hook-debug.log
```

---

## Part 6. 출처

### 공식
- [Claude Code Skills 공식](https://code.claude.com/docs/en/skills) — Skill 구조, frontmatter, lazy load
- [Claude Code Hooks reference 공식](https://code.claude.com/docs/en/hooks) — 12 이벤트, matcher, if, exit code
- [Claude Code Commands 공식](https://code.claude.com/docs/en/commands)
- [Claude Code Best Practices 공식](https://code.claude.com/docs/en/best-practices) — Hooks vs CLAUDE.md
- [Agent Skills 공식 (API)](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — Progressive Disclosure 3단계 메커니즘
- [How to create custom Skills (Claude Help Center)](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)
- [Skill Authoring Best Practices (Claude API Docs)](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Anthropic Skill Development Plugin (skill-development/SKILL.md)](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/skill-development/SKILL.md)
- [Settings 공식](https://docs.claude.com/en/docs/claude-code/settings)

### 디렉터리 구조 참고
- [Where Are Claude Skills Stored?](https://www.agensi.io/learn/where-are-claude-skills-stored) — 표준 경로 + 흔한 실수
- [Skill File Structure (skillsdirectory.com)](https://www.skillsdirectory.com/docs/skill-file-structure) — scripts/references/assets/templates 4종 폴더
- [Claude Skills Documentation (Verdent)](https://www.verdent.ai/guides/claude-skills-documentation) — 3-level progressive disclosure

### 커뮤니티 검증 자료
- [Steve Kinney — Claude Code Hook Examples](https://stevekinney.com/courses/ai-development/claude-code-hook-examples)
- [Steve Kinney — Hook Control Flow](https://stevekinney.com/courses/ai-development/claude-code-hook-control-flow)
- [Adam Bailey — Lint and Tests Before Pushing](https://adambailey.io/blog/claude-hooks-lint-tests)
- [AI Hero — Stop Dangerous Git Commands](https://www.aihero.dev/this-hook-stops-claude-code-running-dangerous-git-commands)
- [AI Hero — Enforce the Right CLI with Hooks](https://www.aihero.dev/how-to-use-claude-code-hooks-to-enforce-the-right-cli)
- [ClaudeFast — 12 Lifecycle Events Guide](https://claudefa.st/blog/tools/hooks/hooks-guide)
- [Supalaunch — Skills Tutorial](https://supalaunch.com/blog/claude-code-skills-tutorial-custom-slash-commands-and-automations-guide)
- [The Prompt Shelf — Custom Slash Commands](https://thepromptshelf.dev/blog/claude-code-custom-slash-commands/)
- [BioErrorLog — Auto-Commit Slash Command](https://en.bioerrorlog.work/entry/git-commit-with-claude-code-custom-slash-command)
- [Toolradar — Best Claude Code Skills 2026](https://toolradar.com/blog/best-claude-code-skills-2026)
- [Claude Directory — Git Commit Skill](https://www.claudedirectory.org/skills/commit)
- [Claude Directory — Changelog Skill](https://www.claudedirectory.org/skills/changelog)
- [who96/claude-code-context-handoff (handoff 자동화)](https://github.com/who96/claude-code-context-handoff)
- [mattpocock/skills — Git Guardrails](https://github.com/mattpocock/skills)

---

## Part 7. 할루시네이션 검증 노트 (2026-05-13)

### ✅ 공식 문서로 검증된 사항

| 주장 | 출처 |
|------|------|
| Hook의 12개 이벤트 (PreToolUse, PostToolUse, PreCompact, SessionStart 등) | 공식 [Hooks reference](https://code.claude.com/docs/en/hooks) |
| Exit code 2 = 차단, stderr가 Claude에게 전달 | 공식 Hooks reference + Best Practices |
| `hooks` 복수 배열 포맷 (단수 `hook`은 에러) | 공식 reference + 다수 커뮤니티 확인 |
| Skill의 `description`이 자동 발동 트리거 | 공식 Skills 문서 |
| `disable-model-invocation: true` / `user-invocable: false` 필드 | 공식 Skills 문서 |
| `!`cmd`` 동적 컨텍스트 주입 문법 | 공식 Skills 문서에 명시 |
| `$ARGUMENTS` 치환 | 공식 Commands/Skills 문서 |
| `if` 필드로 permission rule 매칭 (`Bash(git push *)`) | 공식 Hooks reference (2026 신규) |
| `allowed-tools` frontmatter | 공식 Skills/Commands 문서 |
| PreCompact matcher = `"auto"` / `"manual"` / `""` | 공식 Hooks reference |
| `SessionStart` hook stdout이 새 세션 컨텍스트에 자동 주입 | 공식 Hooks reference |
| `Unlike CLAUDE.md instructions which are advisory` | 공식 Best Practices |

### ✅ 커뮤니티 다수 출처로 검증된 사항

| 주장 | 검증 |
|------|------|
| pre-push 테스트 강제 패턴 | Steve Kinney + Adam Bailey 동일 패턴 |
| 위험 명령 차단 패턴(rm -rf, force push 등) | aihero.dev + mattpocock/skills + ClaudeFast 일치 |
| 자동 커밋 메시지 생성 `/commit` 패턴 | BioErrorLog + Toolradar + 공식 Skills 예제 |
| Keep a Changelog 포맷 `/changelog` | Claude Directory + Supalaunch + 공식 예제 |
| Slack webhook + `Stop` hook | 프로젝트 자료 + 다수 블로그 |

### ⚠️ 강사가 검증해야 할 부분

| 항목 | 이유 |
|------|------|
| **markflow 실제 `package.json` 스크립트** | 본 문서의 `pnpm test --run` / `pnpm biome check` 등은 markflow 표준 스택 가정. 실제 리포의 스크립트와 다를 수 있음 |
| **PreToolUse `exit 2` 차단 동작** | [GitHub Issue #23284](https://github.com/anthropics/claude-code/issues/23284) — 일부 버전에서 차단이 안 되는 케이스 보고됨. 공식 동작은 차단이지만 강의 시연 시 현재 버전 확인 필요 |
| **`if: Bash(git push *)` 문법** | 2026 신규 기능. 일부 구버전에서 동작 안 할 수 있음. 호환성 확보하려면 hook 스크립트 내부에서 `jq`로 명령 파싱하는 fallback 필요 |
| **`disable-model-invocation` 의 정확한 효과** | 공식 문서엔 명시되어 있으나, `/skill-name` 호출은 허용하고 자동 발동만 막는다는 의미. "사용자만 호출 가능"으로 단순화한 부분 검증 필요 |

### ⚠️ 보안 권고

- **`webhook URL` · `API key` 등 secret은 절대 `.claude/settings.json`에 하드코딩 금지** — 환경변수 사용
- **Hook 스크립트도 git에 커밋되므로** secret을 하드코딩하지 말 것
- **`--dangerously-skip-permissions` (YOLO 모드)는 Docker sandbox 같은 격리 환경에서만**
- **`auto-commit` Hook은 기본 비활성화 권장** — `CLAUDE_AUTO_COMMIT=1` 환경변수로 명시적 켜기

### ✅ 최종 결론

본 문서의 모든 핵심 패턴은 공식 또는 다수 커뮤니티 자료로 검증됨. 실제 강의 시연 전에 **(a) 현재 Claude Code 버전에서 hook 차단 동작 확인**, **(b) markflow `package.json` 의 실제 스크립트명 확인**, **(c) Slack webhook 환경변수 설정** 세 가지를 점검할 것.
