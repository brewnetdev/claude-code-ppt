# LEVEL 4 부록 — 커맨드 · 스킬 · 훅 설정 요소 레퍼런스

> 2026-07-10 공식 문서(code.claude.com/docs) 검증 기준.
> 슬라이드 7(4.1.4) "frontmatter 차이" · 4.3 Hooks 파트의 팩트 근거.
>
> 출처: [skills](https://code.claude.com/docs/en/skills.md) · [hooks-guide](https://code.claude.com/docs/en/hooks-guide.md) · [hooks reference](https://code.claude.com/docs/en/hooks.md) · [sub-agents](https://code.claude.com/docs/en/sub-agents.md)

---

## 0. 큰 그림 — 세 가지의 관계

| | 정의 위치 | 형식 | frontmatter |
|---|---|---|---|
| **슬래시 커맨드** | `.claude/commands/*.md` | 단일 마크다운 파일 | 있음 (스킬과 **동일 스키마**) |
| **스킬** | `.claude/skills/<name>/SKILL.md` | 디렉토리 (보조 파일 동봉 가능) | 있음 |
| **훅** | `settings.json`의 `hooks` 키 | **JSON only — frontmatter 없음** | 없음 (예외: 스킬/에이전트 frontmatter 안 `hooks` 필드) |

**중요 — 커맨드·스킬 통합**: 현재 커맨드는 기술적으로 스킬로 통합됐다. `.claude/commands/`는 여전히 동작하지만 "대체 위치" 취급이고, 신규 작성 권장은 SKILL.md 형식. **두 위치의 frontmatter 필드는 동일**하다.

> 강의 녹취의 "커맨드 frontmatter와 스킬 frontmatter가 살짝 다르다"는 표현은 **전형적으로 쓰는 필드가 다르다**는 뜻으로 읽을 것 — 커맨드는 인자 처리(`argument-hint`), 스킬은 자동 호출(`description`) 중심. 스키마 자체는 공유.

---

## 1. 커맨드 · 스킬 공통 frontmatter 필드 (전체)

### 강의에서 다루는 핵심 5종

| 필드 | 타입 | 역할 |
|---|---|---|
| `name` | 문자열 | 표시명. 생략 시 디렉토리/파일명 사용 |
| `description` | 문자열 (1536자 제한) | **모델이 자동 호출 여부를 판단하는 유일한 근거** — 매뉴얼 표지. 생략 시 본문 첫 단락 |
| `argument-hint` | 문자열 | `/커맨드` 입력 시 자동완성에 표시되는 인자 힌트. 예: `[issue-number]` |
| `allowed-tools` | 리스트/문자열 | 활성 중 권한 프롬프트 없이 쓸 수 있는 도구. 예: `Bash(git:*), Read, Grep` |
| `disable-model-invocation` | 불린 (기본 false) | `true` = 모델 자동 호출 차단, 사용자 수동 입력만 허용. 배포 같은 위험 커맨드용 |

### 전체 필드 목록

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | 문자열 | 표시명 (디렉토리명이 기본) |
| `description` | 문자열 | 자동 호출 판단 근거. `when_to_use`와 합산 1536자 제한 |
| `when_to_use` | 문자열 | description 보강 — 트리거 구문 예시 |
| `argument-hint` | 문자열 | 자동완성 인자 힌트 |
| `arguments` | 리스트/문자열 | 위치 인자 명명 — `arguments: [issue, branch]` → 본문에서 `$issue` `$branch` 치환 |
| `disable-model-invocation` | 불린 | 모델 자동 호출 차단 (사용자 전용) |
| `user-invocable` | 불린 (기본 true) | `false` = `/` 메뉴에서 숨김, 모델만 호출 (백그라운드 지식용) |
| `allowed-tools` | 리스트/문자열 | 권한 프롬프트 없이 허용할 도구 |
| `disallowed-tools` | 리스트/문자열 | 활성 중 비활성화할 도구 |
| `model` | 문자열 | `sonnet`/`opus`/`haiku`/`fable`/전체 ID/`inherit`(기본) |
| `effort` | 문자열 | 추론 노력: `low`~`max` (기본 세션 상속) |
| `context` | 문자열 | `fork` = 포크된 서브에이전트 컨텍스트에서 실행 |
| `agent` | 문자열 | `context: fork` 시 사용할 서브에이전트 타입 |
| `hooks` | JSON 객체 | **스킬 라이프사이클에 스코프된 훅** — 이 스킬 활성 중에만 동작 |
| `paths` | 글롭 리스트 | 경로 패턴 기반 자동 활성화. 예: `src/**/*.ts` |
| `shell` | 문자열 | 본문 `` !`cmd` `` 블록의 셸: `bash`(기본)/`powershell` |

**비공식 (문서 미등재, 커뮤니티 관행)**: `metadata`, `version`, `license` — 강의에 싣지 말 것.

### 본문 치환 문법 (frontmatter 아님, 본문 요소)

| 문법 | 역할 |
|---|---|
| `$ARGUMENTS` | 커맨드 뒤 인자 전체 치환 |
| `$1` `$2` / `$이름` | 위치 인자 (`arguments` 필드로 명명 가능) |
| `` !`command` `` | 커맨드 실행 시점에 셸 명령 실행, 출력을 프롬프트에 주입 |
| `@경로` | 파일 내용 참조 |

---

## 2. 서브에이전트 frontmatter (`.claude/agents/*.md`)

스킬 필드 전부 + 에이전트 전용:

| 필드 | 설명 |
|---|---|
| `tools` | 에이전트가 쓸 도구 목록 |
| `permissionMode` | 권한 모드 |
| `maxTurns` | 최대 턴 수 |
| `skills` / `mcpServers` | 에이전트에 노출할 스킬·MCP 서버 |
| `memory` | 메모리 스코프: `user`/`project`/`local` |
| `isolation` | `worktree` = 격리 작업 트리 |
| `background` / `color` / `initialPrompt` | 실행·표시 옵션 |

---

## 3. 훅 — frontmatter 없음, settings.json JSON 스키마

정의 위치 4곳: `~/.claude/settings.json`(전역) · `.claude/settings.json`(프로젝트) · `.claude/settings.local.json`(개인) · 플러그인 `hooks/hooks.json`. 마크다운 훅 정의는 **존재하지 않는다**.

### 스키마 골격

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/guard.js", "timeout": 10 }
        ]
      }
    ]
  }
}
```

### 구성 요소

| 요소 | 설명 |
|---|---|
| 이벤트 키 | 어느 시점에 발화하나 (아래 표) |
| `matcher` | 이벤트별 필터 — PreToolUse는 도구명(`Bash`, `Edit`, `mcp__*`), SessionStart는 원인(`startup`/`resume`/`clear`/`compact`) 등. 미지원 이벤트는 항상 실행 |
| `if` | 도구명+인자 세밀 필터. 예: `Bash(git *)` |
| `type` | `command`(셸) · `http`(POST) · `prompt`(단일턴 LLM 판정) · `agent`(멀티턴 검증, 실험적) · `mcp_tool` |
| `command` | `type: command`일 때 실행할 명령 |
| `timeout` | 초 단위 (command 기본 600) |

### 주요 이벤트 (강의 범위)

| 이벤트 | 시점 | 강의 용도 |
|---|---|---|
| `PreToolUse` | 도구 실행 **직전** — 차단 가능 | 파괴적 명령·비밀 파일 가드레일 |
| `PostToolUse` | 도구 실행 성공 직후 | 자동 포맷·검증·로깅 |
| `UserPromptSubmit` | 프롬프트 제출 전 | 컨텍스트 주입·라우팅 |
| `SessionStart` / `SessionEnd` | 세션 시작/종료 | 모드 활성화·정리 |
| `Stop` | 응답 완료 | 알림 |
| `SubagentStop` | 서브에이전트 완료 | 자동 리뷰 트리거 |
| `PreCompact` | 컨텍스트 압축 전 | 핸드오프 스냅샷 |

전체 이벤트는 24종+ (Setup·PermissionRequest·PostToolUseFailure·Notification·TaskCompleted·TeammateIdle·FileChanged·ConfigChange 등) — 공식 hooks reference 참조.

### 입출력 계약

**입력**: stdin으로 이벤트 JSON 수신.

```json
{ "session_id": "...", "cwd": "...", "hook_event_name": "PreToolUse",
  "tool_name": "Bash", "tool_input": { "command": "npm test" } }
```

**출력**: exit code가 의미를 가진다.

| exit code | 동작 |
|---|---|
| `0` | 정상 진행 (stdout JSON 있으면 해석 — `permissionDecision: allow/deny/ask` 등) |
| `2` | **동작 차단** + stderr 내용이 모델에 피드백으로 전달 |
| 기타 | 진행하되 stderr 첫 줄만 사용자에게 표시 |

---

## 4. 한 장 요약 — 셋의 구분법

- **커맨드/스킬**: 마크다운 + YAML frontmatter. 스키마 동일 — 차이는 호출 주체(사용자 `/입력` vs 모델 자가 호출)와 구조(단일 파일 vs 디렉토리).
- **훅**: JSON 설정. 마크다운·frontmatter 없음. 프롬프트가 아니라 **결정론적 실행** — 모델이 무시할 수 없다.
- **경계가 겹치는 지점 하나**: 스킬 frontmatter의 `hooks` 필드 — 스킬이 활성인 동안만 도는 스코프 훅. "스킬 안에 훅을 심는" 유일한 통로.
