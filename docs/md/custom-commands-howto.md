---
marp: true
theme: default
paginate: true
title: "커스텀 슬래시 커맨드 — 작성법과 예제"
---

# 커스텀 슬래시 커맨드 만들기

## "반복하는 프롬프트"를 파일 하나로 저장해 `/이름`으로 호출

> **한 줄 개념:** 마크다운 파일 1개 = 재사용 프롬프트 1개. **파일명이 곧 커맨드 이름**이다.
> `optimize.md` → `/optimize`
>
> 검증 기준일 2026-07-01 · 공식 문서 [Slash commands](https://code.claude.com/docs/en/agent-sdk/slash-commands)

---

## 왜 쓰나 — Before / After

```
[Before] 매번 같은 프롬프트를 복붙
  "변경된 코드를 타입안전성·보안·성능 기준으로 리뷰해줘. any 금지, ..."
  → 50번 반복, 매번 조금씩 달라짐(일관성 깨짐)

[After] 한 번 파일로 저장 → /review 한 글자
  .claude/commands/review.md  ──▶  /review
  → 팀 전체가 동일 기준, git으로 공유
```

> 핵심: 커맨드는 **"내 프로세스를 코드로 박제"** 하는 것. 정의는 한 번, 호출은 평생.

---

## 3분 만에 첫 커맨드

```bash
# 1) 프로젝트에 commands 폴더 생성
mkdir -p .claude/commands

# 2) 파일 하나 만들기 (파일명 = 커맨드 이름)
echo "이 코드의 성능 이슈를 분석하고 최적화 방안을 제안해줘." \
  > .claude/commands/optimize.md
```

```
# 3) Claude Code 세션에서 호출
/optimize
```

> 끝. 본문(마크다운)이 그대로 Claude에게 전달되는 프롬프트가 된다. **frontmatter 없이도 동작**한다.

---

## 파일이 곧 커맨드 — 위치 규칙

| 종류 | 위치 | 범위 | git 공유 |
| --- | --- | --- | --- |
| **프로젝트 커맨드** | `.claude/commands/` | 그 프로젝트에서만 | ✅ 팀 공유 |
| **개인 커맨드** | `~/.claude/commands/` | 내 모든 프로젝트 | ❌ 개인용 |

- **파일명 = 커맨드명:** `review.md` → `/review`
- **하위 폴더 = 네임스페이스:** `.claude/commands/release/notes.md` → **`/release:notes`**
  - 관련 커맨드를 `release:`, `pr:`, `db:`, `test:`처럼 묶어 picker를 깔끔하게

> ⚠️ 번들 스킬과 같은 이름(`code-review`, `verify`)으로 만들면 **번들을 가린다(shadowing)**. 의도한 게 아니면 다른 이름을 쓰자.

---

## Frontmatter — 5개 필드 (전부 선택, `description`만 권장)

```yaml
---
description: 변경 코드를 버그·보안·테스트 누락 기준으로 리뷰   # picker에 보이는 한 줄
argument-hint: [focus 영역(선택)]                          # 입력창 placeholder(꾸밈용)
allowed-tools: Bash(git diff:*), Read, Grep                # 허용 도구(권한 프롬프트 스킵)
model: haiku                                               # 이 커맨드만 모델 지정(실행 후 원복)
disable-model-invocation: true                            # Claude 자동 호출 금지(수동 전용)
---
```

| 필드 | 의미 | 언제 |
| --- | --- | --- |
| `description` | picker 설명. 없으면 본문 첫 줄이 보임 | **항상 권장** |
| `argument-hint` | 인자 형태 힌트(자동완성) | 인자 받는 커맨드 |
| `allowed-tools` | 허용 도구. `Bash(git add:*)`처럼 세분화 가능 | bash/파일수정 커맨드 |
| `model` | 커맨드 단위 모델(haiku/sonnet/opus) | 단순 작업은 haiku로 비용↓ |
| `disable-model-invocation` | `true`면 사람이 `/`로만 실행 | 부작용 커맨드(/commit·/deploy) |

---

## 인자 받기 — `$ARGUMENTS` 와 `$1 $2`

**전체 인자 한 덩어리 → `$ARGUMENTS`**
```markdown
<!-- .claude/commands/fix-issue.md -->
GitHub 이슈 #$ARGUMENTS 를 분석하고 수정해줘.
1. gh issue view $ARGUMENTS 로 내용 확인
2. 관련 파일 찾기 → 3. 테스트 먼저 작성 → 4. 구현 → 5. PR 생성
```
```
/fix-issue 42        # $ARGUMENTS → "42"
```

**위치별로 따로 → `$1`, `$2`, … (1번부터)**
```markdown
<!-- .claude/commands/review-pr.md -->
PR #$1 을 리뷰해줘. 우선순위는 $2, 담당자는 $3.
```
```
/review-pr 17 high alice    # $1=17, $2=high, $3=alice
```

> 규칙: `$ARGUMENTS` = 입력 전체 / `$1 $2 $3` = 공백으로 나뉜 위치 인자.

---

## 동적 컨텍스트 ① — `!`로 bash 실행 결과 주입

줄 앞에 `` !`명령` ``을 쓰면 **커맨드가 Claude에 닿기 전에 셸이 실행**되고, 그 출력이 프롬프트에 끼워진다.

```markdown
<!-- .claude/commands/git-explain.md -->
---
description: 현재 변경사항을 설명
allowed-tools: Bash(git status:*), Bash(git diff:*)
---
## 맥락
- 상태: !`git status`
- 변경: !`git diff HEAD`

## 작업
위 변경 내용을 바탕으로 무엇이 어떻게 바뀌었는지 설명해줘.
```

> ⚠️ `!`로 실행하는 명령은 **반드시 `allowed-tools`에 미리 허용**해야 매번 권한 묻지 않는다. `Bash(git diff:*)`처럼 **필요한 것만** 좁게 허용(보안).

---

## 동적 컨텍스트 ② — `@`로 파일 내용 주입

`@경로`를 쓰면 그 파일 내용이 프롬프트에 그대로 들어간다(placeholder가 아니라 실제 내용).

```markdown
<!-- .claude/commands/compare.md -->
@src/old-version.ts 와 @src/new-version.ts 를 비교해서
차이점과 잠재적 회귀를 정리해줘.
```

```markdown
<!-- 컨벤션 문서를 주입해 기준을 강제 -->
## 우리 팀 컨벤션
@docs/CODING_STYLE.md

위 컨벤션에 맞춰 @src/utils/format.ts 를 리팩터링해줘.
```

> `!`(명령 실행)와 `@`(파일 주입)는 **"추측 코딩"을 막는 한 쌍** — Claude가 실제 상태/파일을 보고 작업한다.

---

## 모델 지정 · 부작용 방지

**단순 작업은 싼 모델로** (실행 후 세션 모델로 자동 복귀)
```yaml
---
description: 커밋 메시지 생성
model: haiku        # 기계적 작업 → Haiku로 즉답·저비용
---
```

**부작용 있는 커맨드는 수동 전용으로**
```yaml
---
description: 스테이징 후 커밋
disable-model-invocation: true   # Claude가 알아서 실행 못 하게 차단
allowed-tools: Bash(git add:*), Bash(git commit:*)
---
```

> `/commit`, `/deploy`, `/db:migrate`처럼 **되돌리기 어려운** 커맨드는 `disable-model-invocation: true`로 "사람이 `/`로 직접 칠 때만" 실행되게 한다.

---

# 완성 예제 모음 (복붙 가능)

> 아래는 모두 검증된 패턴. `.claude/commands/` 에 그대로 저장하면 동작한다.

---

## 예제 1 — `/commit` (변경 자동 점검 후 커밋)

```markdown
<!-- .claude/commands/commit.md -->
---
description: 변경을 점검하고 Conventional Commits 메시지로 커밋
disable-model-invocation: true
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*)
---
## 현재 상태
!`git status --short`
!`git diff HEAD`

## 작업
1. 변경에서 TODO·console.log·주석처리된 코드·켜둔 테스트 플래그를 먼저 점검.
2. 문제 없으면 관련 변경을 `git add` 후
   feat/fix/chore/docs 형식의 Conventional Commits 메시지로 커밋.
3. 문제가 있으면 목록만 보여주고 진행 여부를 물어봐.
```

---

## 예제 2 — `/review` (변경 코드 리뷰, focus 인자)

```markdown
<!-- .claude/commands/review.md -->
---
description: 현재 git diff를 버그·보안·테스트 누락 기준으로 리뷰
argument-hint: [focus 영역(선택)]
allowed-tools: Bash(git diff:*), Bash(git status:*), Read
model: sonnet
---
## 리뷰 대상
!`git diff HEAD`

## 작업
위 diff를 리뷰해줘. $ARGUMENTS 가 있으면 그 영역을 집중적으로.
보고 형식:
1. 정확성 버그
2. 보안 이슈(인젝션·인증·시크릿)
3. 누락/약한 테스트
- 파일과 라인을 구체적으로 인용. 심각도: Critical / Warning / Suggestion.
```

---

## 예제 3 — `/fix-issue` (위치 인자 + gh)

```markdown
<!-- .claude/commands/fix-issue.md -->
---
description: GitHub 이슈를 찾아 최소 범위로 수정
argument-hint: [issue-number] [priority]
allowed-tools: Read, Edit, Bash(gh issue:*), Bash(git diff:*)
---
이슈 #$1 (우선순위 $2)을 수정해줘.
1. `gh issue view $1` 로 내용 확인
2. 관련 소스를 읽고 근본 원인 파악
3. **무관한 코드는 건드리지 말고** 최소 범위로 수정
4. 관련 테스트 실행 → 통과 확인
```
```
/fix-issue 128 high
```

---

## 예제 4 — `/new-component` (스캐폴드 + 컨벤션 주입)

```markdown
<!-- .claude/commands/new-component.md -->
---
description: 팀 컨벤션에 맞춰 새 컴포넌트 생성
argument-hint: [ComponentName] [directory]
allowed-tools: Write, Read
---
`$2/` 에 `$1` 컴포넌트를 생성해줘.

## 컨벤션 (반드시 준수)
@docs/component-guidelines.md

산출물: 컴포넌트 파일 + index export + 기본 테스트.
기존 구조와 네이밍을 그대로 따를 것.
```
```
/new-component DocumentCard src/components/document
```

---

## 예제 5 — markflow 전용 `/mf:feature`

```markdown
<!-- .claude/commands/mf/feature.md  →  /mf:feature -->
---
description: markflow에 기능을 TDD로 구현
argument-hint: [기능 설명]
allowed-tools: Read, Edit, Write, Bash(npm run test:*), Bash(git diff:*)
model: sonnet
---
markflow에 다음 기능을 TDD로 구현해줘: $ARGUMENTS

## 프로젝트 제약 (markflow)
@docs/API_SPEC.md
- 마크다운 렌더링은 rehype-sanitize를 **파이프라인 마지막**에 둘 것
- dangerouslySetInnerHTML 직접 사용 금지
- Drizzle 쿼리 N+1 주의

## 순서
1. 실패하는 테스트 먼저 작성
2. 최소 구현으로 통과
3. 리팩터링 → `npm run test`로 검증
```
```
/mf:feature 문서 태그 필터링
```

---

# 호출하는 방법

```
# 1) 세션 안에서 직접 (자동완성: '/' 입력 후 이름)
/review
/fix-issue 42 high

# 2) 헤드리스(터미널에서 바로 실행 후 종료)
claude -p "/review"

# 3) 셸 alias로 한 글자화 (.zshrc / .bashrc)
alias creview='claude -p "/review"'
alias ccommit='claude -p "/commit"'
```

> 외부 MCP 서버가 노출하는 프롬프트도 커맨드로 보인다: `/mcp__서버명__프롬프트명`.

---

## 커맨드 vs 스킬 vs CLAUDE.md — 언제 무엇

| | 무엇 | 언제 |
| --- | --- | --- |
| **슬래시 커맨드** | 사람이 `/`로 **명시 실행**하는 절차 | 반복 워크플로우(리뷰·커밋·배포) |
| **Skill** | Claude가 상황 보고 **자동 호출**도 하는 지식/절차 | 재사용 지식, 자동 트리거 필요 |
| **CLAUDE.md** | 항상 적용되는 **규칙·컨벤션** | 모든 작업에 공통 적용 |

> 2026 참고: 커맨드와 스킬은 **같은 기능으로 통합**됐다. `.claude/commands/*.md`는 "legacy"로 표기되고 **스킬(`.claude/skills/<name>/SKILL.md`) 권장**이지만, 기존 커맨드 파일은 그대로 동작한다.
> **입문은 단일 파일 커맨드가 가장 쉽다.** 지원 파일이 여럿 필요하거나 자동 호출을 원하면 스킬로 승격.

---

## 디버깅 · 주의사항

- **권한 프롬프트가 매번 뜬다** → `!`로 쓴 명령을 `allowed-tools`에 추가했는지 확인.
- **`allowed-tools`는 좁게** → `Bash(git:*)`는 모든 git 허용, `Bash(git status:*)`는 그것만. 보안상 최소 허용.
- **부작용 커맨드는** `disable-model-invocation: true` → Claude가 자동으로 `/commit`·`/deploy`를 쏘는 사고 방지.
- **이름 충돌(shadowing)** → 번들 스킬(`code-review`, `verify`)과 같은 이름 피하기.
- **커맨드가 안 보임** → 파일 위치(`.claude/commands/`)·확장자(`.md`) 확인, `/help`로 목록 점검.
- **본문은 호출 시점에만 로드**(lazy) → 길어도 평소 컨텍스트를 먹지 않는다. 단 description은 상주하니 간결하게.

---

## 할루시네이션 / 출처 검증 표

| 항목 | 상태 | 출처 |
| --- | --- | --- |
| 위치 `.claude/commands/`(프로젝트)·`~/.claude/commands/`(개인), 파일명=커맨드명 | ✅ 공식 | code.claude.com/docs/en/agent-sdk/slash-commands |
| frontmatter: description·argument-hint·allowed-tools·model·disable-model-invocation | ✅ 공식+다중 확인 | 공식 SDK 문서, buildthisnow(2026-06) |
| `$ARGUMENTS`(전체) / `$1 $2`(위치) | ✅ 공식 | 공식 문서, prg.sh |
| `` !`cmd` `` bash 실행 주입(allowed-tools 필요) | ✅ 공식 | 공식 문서, bioerrorlog |
| `@path` 파일 내용 주입 | ✅ 공식 | 공식 문서, bioerrorlog |
| 하위폴더 네임스페이스 → `/release:notes` | ✅ 다중 확인 | claudedirectory(2026-05) |
| 번들 스킬 이름과 충돌 시 shadowing(code-review·verify) | ✅ 공식 | 공식 SDK 문서 |
| MCP 프롬프트 → `/mcp__server__prompt` | ✅ 다중 확인 | stevekinney |
| 2026: 커맨드=스킬 통합, 단일파일은 "legacy"·스킬 권장 | ✅ 공식 | 공식 문서, buildthisnow |
| 실제 ECC 커맨드가 위 형식을 사용(description·argument-hint·`!bash`) | ✅ 직접 확인 | ECC `commands/code-review.md` 등 원문 |
| model friendly name(haiku/sonnet/opus) | ⚠️ 표기 주의 | full 문자열도 가능, 녹화 시점 모델명 확인 |

> ✅ = 공식 문서/레포 원문 확인 · ⚠️ = 버전·표기 변동 주의
