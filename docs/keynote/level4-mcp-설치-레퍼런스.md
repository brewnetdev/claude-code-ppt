# LEVEL 4 — 개발 필수 MCP 서버 설치 레퍼런스

> 덱 슬라이드 46 (4.4.2 ESSENTIAL SERVERS) 8개 서버의 설치 주소·`.mcp.json` 설정 모음.
> 2026-07-05 기준 npm/공식 저장소 리서치로 현행 버전 검증 완료.
> `.mcp.json`은 **프로젝트 루트 직속**(project scope, git 커밋 가능). API 키는 `${ENV_VAR}` 확장으로 넣고 실제 값은 커밋하지 않는다.

---

## 1. GitHub — PR · 이슈 · 코드 리뷰

- 정본: https://github.com/github/github-mcp-server (GitHub 공식)
- ⚠️ 구 `@modelcontextprotocol/server-github` npm 패키지는 2025-04 지원 종료. 현재는 GitHub이 호스팅하는 **원격 HTTP 서버**가 표준.

```bash
# CLI 한 줄 설치 (fine-grained PAT 필요)
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"
```

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PAT}"
      }
    }
  }
}
```

- 토큰 발급: GitHub Settings → Developer settings → Fine-grained personal access token
- 도구 수 줄이기(토큰 비용 절감): `"X-MCP-Toolsets": "repos,issues"` 헤더 추가
- GitHub Enterprise Server는 원격 미지원 → Docker 로컬(`ghcr.io/github/github-mcp-server`) 사용

## 2. Filesystem — 파일 권한 분리 접근

- 정본: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
- 패키지: `@modelcontextprotocol/server-filesystem` (v2026.7.4, MCP 스티어링 그룹이 유지하는 레퍼런스 서버)

```bash
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ~/allowed/dir1 ~/allowed/dir2
```

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/me/projects/allowed-dir"
      ]
    }
  }
}
```

- 인자로 넘긴 디렉토리 **밖은 접근 거부**(심링크 우회도 차단) — 이 경로 분리가 이 서버의 존재 이유

## 3. PostgreSQL — 스키마 · 쿼리 · 디버깅

- ⚠️ 구 레퍼런스 `@modelcontextprotocol/server-postgres`는 **2025-07 아카이브**(read-only 모드에 SQL injection 취약점, 미패치). 절대 사용 금지.
- 현행 대표: **Postgres MCP Pro** https://github.com/crystaldba/postgres-mcp (PyPI `postgres-mcp`)

```bash
claude mcp add postgres --env DATABASE_URI=postgresql://user:pass@localhost:5432/mydb \
  -- uvx postgres-mcp --access-mode=restricted
```

```json
{
  "mcpServers": {
    "postgres": {
      "command": "uvx",
      "args": ["postgres-mcp", "--access-mode=restricted"],
      "env": {
        "DATABASE_URI": "${DATABASE_URI}"
      }
    }
  }
}
```

- `--access-mode=restricted` 필수 — 기본값(unrestricted)은 쓰기 전권
- 스키마 조회 + 쿼리 + `EXPLAIN` 기반 인덱스 튜닝까지 제공
- Supabase 사용자는 공식 Supabase MCP(https://github.com/supabase/mcp)가 더 적합
- 어느 서버든 원칙: read-only는 프롬프트가 아니라 **DB 계정 권한으로** 강제

## 4. Brave Search — 실시간 웹 검색

- 정본: https://github.com/brave/brave-search-mcp-server (Brave 공식)
- 패키지: `@brave/brave-search-mcp-server` (v2.0.85)
- ⚠️ 구 `@modelcontextprotocol/server-brave-search`는 deprecated

```bash
claude mcp add brave-search --env BRAVE_API_KEY=YOUR_API_KEY \
  -- npx -y @brave/brave-search-mcp-server --transport stdio
```

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@brave/brave-search-mcp-server", "--transport", "stdio"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

- API 키 발급: https://brave.com/search/api/ (무료 티어 있음)
- v2.x부터 이미지 base64 미반환 — 컨텍스트 낭비 제거됨

## 5. Context7 — 라이브러리 최신 문서 주입

- 정본: https://github.com/upstash/context7
- 패키지: `@upstash/context7-mcp` (v3.2.2) 또는 원격 `https://mcp.context7.com/mcp`

```bash
# 원격 (권장 — 로컬 프로세스 없음)
claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp \
  --header "CONTEXT7_API_KEY: YOUR_API_KEY"

# 로컬 npx
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp --api-key YOUR_API_KEY
```

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

- API 키 없이도 동작하나 익명 rate limit — 키 발급: https://context7.com/dashboard

## 6. Playwright — 브라우저 자동화 · E2E 테스트

- 정본: https://github.com/microsoft/playwright-mcp (Microsoft 공식)
- 패키지: `@playwright/mcp` (v0.0.77)

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

- 스크린샷 픽셀이 아닌 **접근성 트리 스냅샷**으로 동작 — vision 모델 불필요, 토큰 효율적

## 7. Sequential Thinking — 단계별 구조화 추론

- 정본: https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking
- 패키지: `@modelcontextprotocol/server-sequential-thinking` (v2026.7.4, 레퍼런스 서버)

```bash
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```

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

## 8. Memory — 세션 간 영속 메모리 (지식 그래프)

- 정본: https://github.com/modelcontextprotocol/servers/tree/main/src/memory
- 패키지: `@modelcontextprotocol/server-memory` (v2026.7.4, 레퍼런스 서버 — 지식 그래프 기반)
- ⚠️ **Claude Code 내장 memory와 별개 기능 — 별도 설치 필요.**
  - 내장 memory = CLAUDE.md + **auto memory**(v2.1.59+ 기본 활성, `~/.claude/projects/<프로젝트>/memory/`에 마크다운 노트 자동 축적, `MEMORY.md` 첫 200줄이 매 세션 로드). 설치 없이 동작하며 `/memory`로 열람·토글. 공식 문서: https://code.claude.com/docs/en/memory
  - MCP server-memory = **entity–relation–observation 지식 그래프**를 도구 호출(create_entities·search_nodes 등)로 조회·저장. 구조화 관계 질의가 필요하거나 Claude Desktop 등 다른 MCP 클라이언트와 메모리를 공유할 때만 별도 설치.
  - 단순 "작업 노트 기억"이 목적이면 내장 auto memory로 충분 — 이 서버는 굳이 설치할 필요 없음.

```bash
claude mcp add memory -- npx -y @modelcontextprotocol/server-memory
```

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

- 저장 위치 지정: `"env": { "MEMORY_FILE_PATH": "/path/to/memory.json" }`

---

## 통합 `.mcp.json` — 8개 전부 (프로젝트 루트에 저장)

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_PAT}" }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects/allowed-dir"]
    },
    "postgres": {
      "command": "uvx",
      "args": ["postgres-mcp", "--access-mode=restricted"],
      "env": { "DATABASE_URI": "${DATABASE_URI}" }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@brave/brave-search-mcp-server", "--transport", "stdio"],
      "env": { "BRAVE_API_KEY": "${BRAVE_API_KEY}" }
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}" }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

설치 확인:

```bash
claude mcp list        # 등록 상태 + 연결 체크
/mcp                   # 세션 안에서 서버·도구 확인
```

---

## API 키 저장 위치 — `${ENV}` 확장이 읽는 곳

`.mcp.json`의 `${GITHUB_PAT}`는 **`claude`를 실행한 프로세스(터미널 셸)의 환경변수**에서 치환된다.
따라서 키는 그 셸이 시작할 때 로드하는 파일/저장소에 넣는다. `${VAR:-기본값}` 문법도 지원.

### macOS / Linux (zsh · bash)

```bash
# ~/.zshrc (macOS 기본 zsh) 또는 ~/.bashrc — export 필수
export GITHUB_PAT="ghp_xxxx"
export CONTEXT7_API_KEY="ctx7_xxxx"
export DATABASE_URI="postgresql://user:pass@localhost:5432/mydb"
export BRAVE_API_KEY="BSA_xxxx"
```

- 적용: `source ~/.zshrc` 또는 새 터미널. 확인: `echo $GITHUB_PAT`
- **dotfiles를 git으로 관리한다면** rc에 키를 직접 넣지 말 것 — 분리 파일 패턴:

```bash
# ~/.zshrc에는 이 한 줄만
[ -f ~/.env.secrets ] && source ~/.env.secrets
# 키들은 ~/.env.secrets에 (chmod 600, git 밖)
```

- 한 단계 더 안전 (macOS Keychain — 디스크에 평문 없음):

```bash
# 1회 등록
security add-generic-password -a "$USER" -s github-pat -w "ghp_xxxx"
# ~/.zshrc — 셸 시작 시 Keychain에서 꺼내옴
export GITHUB_PAT=$(security find-generic-password -s github-pat -w)
```

### Windows

```powershell
# PowerShell — 사용자 범위 영구 저장 (레지스트리 HKCU\Environment)
[Environment]::SetEnvironmentVariable("GITHUB_PAT", "ghp_xxxx", "User")
```

```cmd
:: 또는 cmd
setx GITHUB_PAT "ghp_xxxx"
```

- 둘 다 **새로 연 터미널부터** 적용된다 (현재 창엔 반영 안 됨). 확인: `echo $env:GITHUB_PAT`
- GUI 경로: 설정 → 시스템 → 정보 → 고급 시스템 설정 → 환경 변수 → "사용자 변수"
- **WSL에서 claude를 쓴다면** Windows 환경변수가 아니라 **WSL 안의 `~/.bashrc`**에 넣는다 (Linux 방식과 동일 — 두 세계는 환경변수를 공유하지 않음)

### 공통 함정

- `claude mcp add --env KEY=실제값`으로 등록하면 그 값이 **설정 파일에 리터럴로 저장**된다 — 개인 스코프(`~/.claude.json`)면 괜찮지만, git에 커밋되는 project 스코프 `.mcp.json`에는 반드시 `${...}` 자리표시자만.
- 변수 없이 claude를 실행하면 해당 서버 연결만 실패 — `claude mcp list`에서 ✗로 표시되므로 키 로드 여부부터 확인.

> 슬라이드 46 콜아웃 그대로 — 서버가 노출하는 도구 정의는 매 턴 system prompt에 실린다.
> 8개 전부 켜지 말고 **쓰는 것만 활성화**할 것 (`claude mcp remove <name>` 또는 `/mcp`에서 토글).

### 출처 (2026-07-05 검증)

- GitHub 공식 설치 가이드: https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-claude.md
- MCP 레퍼런스 서버: https://github.com/modelcontextprotocol/servers
- 아카이브 경고(postgres 등): https://github.com/modelcontextprotocol/servers-archived
- Brave 공식: https://www.npmjs.com/package/@brave/brave-search-mcp-server
- Context7 클라이언트 가이드: https://github.com/upstash/context7/blob/master/docs/resources/all-clients.mdx
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Postgres MCP Pro: https://github.com/crystaldba/postgres-mcp
