# 개발 필수 세팅 — 나만의 커맨드·스킬·훅·MCP·플러그인 리스트업

> 대상: 클로드 코드로 실전 개발을 시작하는 입문 개발자
> 기준 버전: Claude Code v2.1.x (2026-07 기준). 명령·문법은 버전에 따라 바뀔 수 있으니 실행 전 `claude --version`과 `/help`로 확인.
> 검증: 설치 명령은 공식 문서/공식 레지스트리로 재검증함(하단 출처). 훅·스킬·커맨드 예제는 프로젝트 내부 문서(`level3-chapter3.md`, `claude-code-hooks-guide.md`, `claude_code_examples_guide.md`) 기준.

---

## 0. 핵심 요약 — "미리 만들어두면 두고두고 쓰는 것"

프로젝트를 새로 열 때 아래 세트를 `.claude/`에 미리 깔아두면, 매번 반복 지시할 필요 없이 품질·안전·속도가 확보된다.

| 구분 | 미리 만들어둘 것 | 파일 위치 | 효과 |
|------|-----------------|----------|------|
| 커맨드 | `/review`(코드리뷰), `/fix-issue`(이슈→PR), `/add-feature`(TDD 구현) | `.claude/commands/*.md` | 반복 워크플로우 1줄 실행 |
| 스킬 | 프로젝트 컨벤션(Reference), 배포 절차(Action) | `.claude/skills/<name>/SKILL.md` | 규칙을 컨텍스트에 자동 주입 |
| 훅 | 비밀키 차단(PreToolUse), 자동 포맷(PostToolUse), 타입체크(Stop) | `.claude/settings.json` | 사고 방지 + 자동 품질 게이트 |
| MCP | `context7`(최신 문서), `sequential-thinking`(단계 추론) | `.mcp.json` 또는 `claude mcp add` | 환각 감소 + 복잡한 설계 |
| 플러그인 | `commit-commands`, `security-guidance`, `pyright-lsp`/`typescript-lsp` | `/plugin install …` | 검증된 기능을 원클릭 설치 |

**devil's advocate (전문가 관점 3줄)**
- 훅·스킬·MCP를 한꺼번에 다 깔면 매 턴 컨텍스트 비용이 늘어 오히려 토큰만 낭비된다 — 실제로 쓰는 것만 남기고 `/plugin`의 "Not used recently"·Context cost를 주기적으로 점검하라.
- `PostToolUse` 자동 포맷/린트 훅은 파일 저장마다 도는데, 무거운 검사(전체 테스트·빌드)를 여기 넣으면 작업이 느려진다 — 무거운 건 `Stop`으로 미뤄라.
- MCP·플러그인은 임의 코드를 로컬 권한으로 실행한다 — 출처를 신뢰할 수 없으면 설치 금지, 특히 비밀키를 넘기는 MCP는 스코프를 `local`로 제한하라.

---

## 1. 커스텀 슬래시 커맨드 (`.claude/commands/*.md`)

### 활용 방법
`.claude/commands/`에 마크다운 파일을 하나 만들면 파일명이 곧 `/명령어`가 된다. 본문은 **Claude에게 주는 지시문**이고, `$ARGUMENTS`로 사용자가 넘긴 인자를 그대로 치환한다. 팀의 반복 작업(코드리뷰 기준, 이슈 처리 순서 등)을 캡슐화할 때 쓴다.

### 예제 A — 코드리뷰 표준 커맨드 `/kr`
```markdown
<!-- .claude/commands/kr.md -->
---
description: "Korean Review. 스테이징된 변경을 팀 기준으로 검토"
---
현재 스테이징된 변경사항을 아래 기준으로 검토해줘.

## P1 (블로킹)
- [ ] NPE/NullPointerException 가능성
- [ ] 트랜잭션 경계 오류
- [ ] 보안 취약점 (SQL Injection, XSS)
## P2 (권고)
- [ ] 단일 책임 원칙 위반
- [ ] 테스트 누락
## P3 (의견)
- [ ] 네이밍 개선 제안

출력: P1/P2/P3 분류, `파일명:라인수`, 구체적 수정 방법
```
```bash
/kr
```

### 예제 B — 이슈 → 코드 → PR 커맨드 `/fix-issue`
```markdown
<!-- .claude/commands/fix-issue.md -->
---
description: "GitHub 이슈를 TDD로 처리. Usage: /fix-issue <번호>"
---
이슈 $ARGUMENTS 를 처리해줘.
1. `gh issue view $ARGUMENTS`로 이슈 내용 확인
2. 관련 파일 검색
3. 실패하는 테스트 먼저 작성 (TDD)
4. 최소 구현으로 통과 → 테스트 실행: `npm run test`
5. 커밋 후 PR 생성 (본문에 `Closes #$ARGUMENTS` 포함)
```
```bash
/fix-issue 42        # $ARGUMENTS → "42"
```

### 예제 C — 기능 개발 TDD 커맨드 `/add-feature`
```markdown
<!-- .claude/commands/add-feature.md -->
다음 기능을 TDD로 구현해줘: $ARGUMENTS
순서: 스펙 검토 → 실패 테스트 → 최소 구현 → 리팩터 → /review → /security-review
```
```bash
/add-feature 문서 태그 필터링 기능
```

### 실전 조합 패턴
```bash
/plan 트리 구조 사이드바 구현     # 계획
/add-feature 트리 구조 사이드바   # TDD 구현
/review                           # 리뷰
/security-review                  # 보안 점검
/compact                          # 컨텍스트 정리
```

**devil's advocate**
- 커맨드가 많아지면 `/help` 목록이 지저분해지고 이름 충돌이 난다 — 접두어(`/kr`, `/tdd-*`)로 네임스페이스를 정하라.
- 본문이 길수록 호출 시 토큰이 늘어난다 — 재사용 "지식"은 커맨드보다 Skill이 lazy-load라 유리하다.
- `$ARGUMENTS`를 셸에 그대로 넘기는 커맨드는 인젝션 위험이 있으니 `gh`·`git` 같은 안전한 도구 경유로 설계하라.

---

## 2. Agent Skills (`.claude/skills/<name>/SKILL.md`)

### 활용 방법
Skill은 YAML frontmatter + 마크다운 본문으로 된 `SKILL.md`다. Claude가 상황을 보고 **자동으로** 불러오거나(`description`이 트리거), 사용자가 `/skill-name`으로 직접 부른다. 설명(description)만 상시 상주하고 본문은 필요할 때만 로드되므로, 커맨드보다 "재사용 지식·규칙"에 적합하다.

### 예제 A — Reference Skill (프로젝트 컨벤션 자동 주입)
```yaml
# .claude/skills/db-conventions/SKILL.md
---
name: db-conventions
description: >
  프로젝트 DB(ORM) 패턴과 컨벤션. 스키마·쿼리·마이그레이션 작성 시 사용.
allowed-tools: Read, Grep, Glob
---
## 테이블 컨벤션
- ID: CUID2 사용
- 타임스탬프: createdAt, updatedAt 항상 포함
## 쿼리 패턴
- N+1 금지: 관계 데이터는 한 번에 조회
- 페이지네이션: cursor 기반 (offset 금지)
```

### 예제 B — Action Skill (배포 절차, 수동 호출 전용)
```yaml
# .claude/skills/deploy-staging/SKILL.md
---
name: deploy-staging
description: Deploy to staging environment.
disable-model-invocation: true   # /deploy-staging 으로만 실행 (자동 발동 금지)
---
1. `npm run build` 후 에러 확인
2. `npm run test` 전체 통과 확인
3. `git tag staging-$(date +%Y%m%d-%H%M)`
4. Vercel CLI로 staging 배포
5. 배포 URL 출력
```

### 예제 C — 보안 규칙 Skill (읽기 전용 제한)
```yaml
# .claude/skills/xss-guard/SKILL.md
---
name: xss-guard
description: 마크다운/HTML 렌더링 코드 작성·리뷰 시 XSS 방지 규칙 적용.
allowed-tools: Read, Grep, Glob
---
## 절대 금지
- dangerouslySetInnerHTML 직접 사용
- sanitize 없이 raw HTML 삽입
## 체크리스트
- sanitize가 렌더 파이프라인 마지막에 위치하는지
- href의 `javascript:` 프로토콜 차단 여부
```

### 확인 명령
```bash
/skills                          # 로드된 스킬 목록
ls .claude/skills/*/SKILL.md     # 프로젝트 스킬
ls ~/.claude/skills/*/SKILL.md   # 개인 전역 스킬
```

**devil's advocate**
- `description`이 모호하면 엉뚱한 타이밍에 자동 발동해 컨텍스트를 오염시킨다 — "언제 쓰는지(Use when …)"를 명확히 써라.
- 읽기+쓰기 권한을 다 주면 규칙 Skill이 코드를 멋대로 고칠 수 있다 — 참조용은 `allowed-tools: Read, Grep, Glob`로 제한.
- 자동 발동을 원치 않는 실행형(배포 등)은 반드시 `disable-model-invocation: true`.

---

## 3. Hooks (`.claude/settings.json`)

### 활용 방법
특정 이벤트 시점에 셸 명령을 자동 실행한다. 실무 80%는 **4가지 타이밍**으로 충분하다.

| 타이밍 | 시점 | 용도 | 차단 |
|--------|------|------|:----:|
| `PreToolUse` | 도구 실행 **전** | 위험 명령 차단·사전 검증·백업 | ✅ (exit 2) |
| `PostToolUse` | 도구 실행 **후** | 린트·포맷·자동수정 | ❌ |
| `UserPromptSubmit` | 프롬프트 제출 시 | Git 상태·날짜 등 컨텍스트 주입 | — |
| `Stop` | 응답 완료 시 | 타입체크·빌드·테스트 | ✅ (재계속) |

> ⚠️ **포맷 주의**: 각 항목은 `hook`(단수) 아님 → `hooks`(복수 배열). 틀리면 `claude config list`에서 Settings Error가 나며 파일 전체가 무시된다.
> 도구 인자는 **환경변수가 아니라 stdin JSON**으로 온다. 셸에서는 `jq`로 파싱한다. (실제 환경변수는 `CLAUDE_PROJECT_DIR`·`CLAUDE_PLUGIN_ROOT`·`CLAUDE_PLUGIN_DATA` 3개뿐)

### 예제 A — 비밀키·보호파일 차단 (가드레일, PreToolUse)
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in *.env|*.env.*) echo \"⛔ 보호된 파일: $f\" >&2; exit 2;; esac"
          }
        ]
      }
    ]
  }
}
```

### 예제 B — 저장 직후 자동 포맷·린트 (PostToolUse) + 타입체크 (Stop)
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "f=$(jq -r '.tool_input.file_path // empty'); [ -n \"$f\" ] && npx prettier --write \"$f\" 2>/dev/null || true" },
          { "type": "command", "command": "f=$(jq -r '.tool_input.file_path // empty'); [ -n \"$f\" ] && npx eslint --fix \"$f\" 2>/dev/null || true" }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "npx tsc --noEmit 2>&1 | tail -20" }
        ]
      }
    ]
  }
}
```

### 예제 C — 세션 인수인계 (PreCompact + SessionStart)
```json
{
  "hooks": {
    "PreCompact": [
      { "matcher": "", "hooks": [ { "type": "command", "command": "python3 ~/.claude/hooks/pre-compact-handoff.py" } ] }
    ],
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "cat HANDOFF.md 2>/dev/null || true" } ] }
    ]
  }
}
```
> `SessionStart` 훅의 stdout은 세션 초기 컨텍스트에 자동 추가된다.

### exit 코드 규칙
| 코드 | 동작 |
|------|------|
| `0` | 성공, 정상 진행 |
| `1` | 오류 출력이 Claude에게 전달됨(수정 유도) |
| `2` | **도구 실행 자체를 차단**(PreToolUse 전용) |

### 디버깅
```bash
claude config list   # 설정 유효성 확인
echo '{"tool_input":{"file_path":"src/index.ts"}}' | jq -r '.tool_input.file_path' | xargs npx eslint --fix
```

**devil's advocate**
- `PostToolUse`는 매 파일 수정마다 도니 무거운 검사를 넣으면 체감 속도가 급락한다 — 항상 `|| true`·`2>/dev/null`·`tail -N`으로 실패 흡수와 출력 제한.
- `exit 2` 차단 훅은 정규식이 넓으면 정상 작업까지 막는다 — matcher와 case 패턴을 좁게.
- `$CLAUDE_FILE_PATH` 같은 옛 환경변수에 의존한 예제가 인터넷에 많다 — 현재는 stdin JSON+`jq`가 표준이니 그대로 복붙하지 말 것.

---

## 4. MCP 서버 설치 (`context7` · `sequential-thinking` 외)

### 활용 방법
MCP(Model Context Protocol)는 Claude Code를 외부 서비스·도구와 표준 방식으로 연결한다. Transport는 로컬 실행용 `stdio`와 원격 서비스용 `http`(Streamable HTTP) 2종. Scope는 `-s local`(기본, 나만/이 프로젝트), `-s project`(팀 공유 `.mcp.json`), `-s user`(내 모든 프로젝트).

### 4.1 context7 — 라이브러리 최신 공식 문서 주입 (환각 감소)
프레임워크/라이브러리 API를 물어볼 때 학습 시점 이후 변경분까지 실시간 문서로 보강한다.
```bash
# stdio (npx) — 가장 무난, 검증됨
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```
또는 `.mcp.json` 직접 작성:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```
> 원격 HTTP 엔드포인트(`--transport http`) 방식도 있으나, 현재 엔드포인트/키 정책은 버전마다 달라질 수 있으니 설치 후 `/mcp`로 상태를 확인하고 공식 안내를 따를 것. 위 npx 방식은 별도 키 없이 동작.

### 4.2 sequential-thinking — 단계적 사고(복잡한 설계·디버깅)
문제를 여러 단계로 쪼개 추론하도록 돕는 공식 MCP.
```bash
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```
`.mcp.json`:
```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```
> Windows에서 npx 실행이 안 되면 `"command": "cmd", "args": ["/c","npx","-y","@modelcontextprotocol/server-sequential-thinking"]` 로 감싼다.

### 4.3 개발에 자주 쓰는 MCP (선택)
| MCP | 용도 | 설치(예) |
|-----|------|---------|
| GitHub | 이슈→코드→PR 자동화 | 플러그인 `github@claude-plugins-official` 권장(4.x 참고) |
| Playwright | 브라우저 E2E 자동화 | `claude mcp add playwright -- npx -y @playwright/mcp@latest` |
| PostgreSQL | 스키마 분석·ERD·쿼리 | 서버별 공식 패키지 확인 후 `claude mcp add …` |

### 설치 확인
```bash
claude mcp list      # 등록된 MCP 목록/상태
/mcp                 # 세션 내에서 연결 상태 확인
```

**devil's advocate**
- MCP는 임의 코드를 로컬 권한으로 실행한다 — 사내/기밀 코드가 외부(임베딩·클라우드)로 나가는 MCP는 스코프·데이터 흐름을 반드시 확인.
- `npx -y …@latest`는 매번 최신을 당겨와 재현성이 깨질 수 있다 — 팀 공유(`-s project`)에서는 버전 고정을 고려.
- MCP를 많이 붙일수록 툴 스키마가 컨텍스트를 잡아먹는다 — Tool Search(툴 지연 로딩)를 지원하는지 확인하고 안 쓰는 건 제거.

---

## 5. 플러그인 마켓플레이스 설치

### 활용 방법
플러그인은 커맨드·스킬·훅·MCP·LSP를 묶은 패키지다. 마켓플레이스를 **추가**한 뒤 개별 플러그인을 **설치**하는 2단계. 공식 마켓플레이스(`claude-plugins-official`)는 시작 시 자동 등록되어 있다.

### 5.1 공식 마켓플레이스에서 설치
```bash
/plugin                                        # 플러그인 관리 UI (Discover/Installed/Marketplaces/Errors)
/plugin install github@claude-plugins-official # 예: GitHub 연동
/reload-plugins                                # 재시작 없이 즉시 적용
```

### 5.2 커뮤니티/데모 마켓플레이스 추가 후 설치
```bash
# 커뮤니티(자동검증 통과 서드파티)
/plugin marketplace add anthropics/claude-plugins-community
/plugin install <plugin-name>@claude-community

# 데모(예제 모음)
/plugin marketplace add anthropics/claude-code
/plugin install commit-commands@claude-code-plugins
/reload-plugins
/commit-commands:commit   # 플러그인 스킬은 플러그인명으로 네임스페이스
```

### 5.3 입문자 추천 플러그인 (공식)
| 플러그인 | 무엇을 주나 |
|----------|------------|
| `commit-commands` | 커밋·푸시·PR 생성 Git 워크플로우 |
| `security-guidance` | 변경마다 취약점 자동 리뷰·수정 유도 |
| `pr-review-toolkit` | PR 리뷰 전문 에이전트 |
| `typescript-lsp` / `pyright-lsp` | 편집 직후 타입 에러 자동 진단(LSP) |
| `plugin-dev` | 나만의 플러그인 제작 툴킷 |

> LSP 플러그인은 언어서버 바이너리가 로컬에 있어야 한다(예: `typescript-language-server`, `pyright-langserver`). 없으면 Errors 탭에 `Executable not found in $PATH` 표시.

### 관리·CLI
```bash
/plugin list                          # 설치 목록 (--enabled/--disabled)
/plugin disable <name>@<marketplace>  # 비활성화
/plugin uninstall <name>@<marketplace>
claude plugin install formatter@your-org --scope project   # CLI, 스코프 지정
/plugin marketplace update claude-plugins-official          # 목록 갱신
```

**devil's advocate**
- 플러그인/마켓플레이스는 사용자 권한으로 임의 코드를 실행한다 — 신뢰하는 출처만, 커뮤니티는 커밋 SHA 고정 여부 확인.
- 안 쓰는 플러그인도 시작·컨텍스트 비용을 계속 먹는다 — `/plugin`의 "Not used recently"·Context cost로 정리.
- `@latest`/auto-update로 팀 전체가 갑자기 다른 버전을 쓰면 디버깅이 꼬인다 — 팀 공유는 `extraKnownMarketplaces` + 버전 관리로.

---

## 6. 통합 `.claude/` 디렉토리 구조 (권장 초기 세팅)

```
.claude/
├── settings.json            # 훅·권한(팀 공유)
├── settings.local.json      # 개인 로컬 오버라이드(gitignore)
├── commands/
│   ├── kr.md                # 코드리뷰
│   ├── fix-issue.md         # 이슈→PR
│   └── add-feature.md       # TDD 구현
├── skills/
│   ├── db-conventions/SKILL.md
│   ├── xss-guard/SKILL.md
│   └── deploy-staging/SKILL.md
└── hooks/
    └── pre-compact-handoff.py
.mcp.json                    # context7 · sequential-thinking (팀 공유 시)
CLAUDE.md                    # 프로젝트 규칙(/init 으로 초안 생성)
HANDOFF.md                   # 세션 인수인계 메모
```

---

## 7. 작성 후 검증 체크리스트 (필수)

- [ ] `claude config list` — settings.json/훅 문법 오류 없는지
- [ ] 새 세션 1회 열어 훅이 실제로 발동하는지
- [ ] `claude mcp list` / `/mcp` — MCP 연결 상태 정상인지
- [ ] `/skills` / `/plugin list` — 스킬·플러그인 로드 확인
- [ ] 커맨드는 `$ARGUMENTS`가 안전한 도구 경유로 쓰이는지
- [ ] 비밀키·`.env`가 차단 훅으로 실제로 막히는지 테스트

---

## 8. 참고 출처 (검증 링크)

- Claude Code 공식 문서(개요): https://code.claude.com/docs/en/overview
- 플러그인 설치·마켓플레이스(공식): https://code.claude.com/docs/en/discover-plugins
- 공식 플러그인 마켓플레이스(레포): https://github.com/anthropics/claude-plugins-official
- Hooks(공식): https://code.claude.com/docs/en/hooks
- MCP(공식): https://code.claude.com/docs/en/mcp
- Context7 MCP(패키지): https://www.npmjs.com/package/@upstash/context7-mcp
- Sequential Thinking MCP(공식 서버 레포): https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking
- (내부) `level3-chapter3.md`, `claude-code-hooks-guide.md`, `claude_code_examples_guide.md`, `claude-context-analysis.md`
