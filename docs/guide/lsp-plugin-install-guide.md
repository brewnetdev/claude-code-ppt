# Claude Code LSP 플러그인 설치 가이드 — 언어별 추가 방법

작성일: 2026-06-19 · 대상: 개발 입문자 / 직장인 개발 시작 단계
검증 기준: Claude Code **2.1.183**, Piebald-AI 마켓플레이스 **35개 플러그인**, tweakcc **4.1.1**
(상세 출처·검증은 문서 하단 참조)

---

## 결론부터 (핵심)

1. **LSP는 `claude mcp add`가 아니라 `/plugin install`로 설치한다.** Claude Code 2.0.74부터 LSP가 빌트인 도구로 공식 추가되었고, Piebald-AI가 운영하는 공식 마켓플레이스로 언어별 플러그인을 설치한다.
2. **설치는 항상 2단계다.** (1) 해당 언어의 **언어 서버 바이너리**를 먼저 설치 → (2) Claude Code 안에서 **플러그인**을 설치. 둘 중 하나라도 빠지면 동작하지 않는다.
3. **공통 절차 5단계**: 버전 확인 → tweakcc 패치 → 마켓플레이스 등록 → (언어 서버 설치 + 플러그인 설치) → 재시작.
4. **입문자라면 TypeScript(`vtsls`) 하나면 충분하다.** 이 강의의 메인 스택(Next.js/TypeScript)이 여기에 해당한다.

> NOTE — LSP가 무엇이고 *왜* 토큰이 절약되는지(grep 대비 43배 등)는 별도 자료(`lsp.md`, `lsp-codesight-token-ppt-content.md`)를 참고. 이 문서는 **설치·언어별 추가 방법**에만 집중한다.

---

## 1. 사전 이해 — 플러그인 방식 vs MCP 방식

Claude Code에 LSP를 붙이는 길은 두 갈래다. 이 문서는 **공식 플러그인 방식**만 다룬다.

| 구분 | 공식 LSP 플러그인 (이 문서) | MCP 서버 방식 (cclsp / Serena) |
|---|---|---|
| 설치 명령 | `/plugin install` | `claude mcp add` |
| 동작 | Claude Code 내부 LSP 클라이언트가 언어 서버를 직접 구동 | 중간에 별도 MCP 서버를 거침 |
| 파일 수정 후 자동 진단 | 지원 | 미지원(도구로 수동 호출) |
| 고정 토큰 비용 | 최소 (빌트인) | 낮음~높음 |
| 적합한 경우 | 대부분의 프로젝트, 단일~소수 언어 | 마켓플레이스 미지원 언어, 심볼 단위 편집·세션 메모리 필요 시 |

> 입문 단계에서는 **공식 플러그인**이 정답이다. 설정이 가장 간단하고 토큰 비용도 가장 낮다.

---

## 2. 공통 설치 절차 (5단계)

언어와 무관하게 항상 동일한 흐름이다. 언어별로 달라지는 부분은 **STEP 3(언어 서버 설치)**과 **STEP 4의 플러그인 이름**뿐이다.

### STEP 0. Claude Code 버전 확인

마켓플레이스는 **2.1.50 이상**을 요구한다(최신 LSP 설정 필드 `startupTimeout` 등 사용). 현재 최신은 2.1.183이다.

```bash
claude --version        # 2.1.50 미만이면 먼저 업데이트
npm install -g @anthropic-ai/claude-code@latest
```

### STEP 1. tweakcc로 Claude Code 패치

마켓플레이스 README는 빌트인 LSP를 사용 가능 상태로 만들기 위해 **tweakcc 패치**를 요구한다. tweakcc가 npm/네이티브 설치를 자동 감지해 패치한다.

```bash
npx tweakcc --apply
```

> WARNING — 이 패치 요구사항은 Claude Code 버전에 따라 변동될 수 있다. 강의 녹화 시점에 마켓플레이스 README의 "Patching Claude Code" 섹션을 재확인할 것. (출처: Piebald-AI README, 2026-06 기준 여전히 명시됨)

### STEP 2. 마켓플레이스 등록

Claude Code를 실행한 뒤 한 번만 등록하면 된다.

```text
/plugin marketplace add Piebald-AI/claude-code-lsps
```

이 명령은 카탈로그만 내려받을 뿐, 플러그인은 아직 설치되지 않는다.

### STEP 3. 언어 서버 바이너리 설치 (← 언어별로 다름)

이 부분이 언어마다 다르다. → **4장 언어별 추가 방법** 참조.
설치 후 실행 파일이 **PATH에 있어야** Claude Code가 찾을 수 있다.

### STEP 4. 플러그인 설치 (← 플러그인 이름만 언어별로 다름)

방법 A — **대화형 UI (README 권장)**:

```text
/plugins
→ Tab으로 "Marketplaces" 이동
→ claude-code-lsps 선택 → "Browse plugins"
→ 스페이스바로 원하는 언어 선택 (예: TypeScript, Rust)
→ "i" 키로 설치
```

방법 B — **명령으로 직접 설치**:

```text
/plugin install <플러그인명>@claude-code-lsps
```

`@` 뒤의 `claude-code-lsps`는 마켓플레이스의 `name` 필드 값이다. 플러그인 이름은 4장 표에서 확인한다.

> NOTE — 일부 기존 자료(PPT)에 적힌 `vtsls@Piebald-AI-claude-code-lsps`는 **오류**다. 올바른 형식은 `vtsls@claude-code-lsps`이다.

### STEP 5. Claude Code 재시작

```bash
# 종료 후 다시 실행
claude
```

재시작하면 LSP 도구가 활성화되고, 별도 설정 없이 `goToDefinition` `findReferences` 등을 자동으로 사용한다.

---

## 3. 빠른 시작 예시 (TypeScript 전체 흐름)

이 강의 메인 스택 기준 복붙용 예시. 한 화면에 모든 단계가 들어간다.

```bash
# (터미널) 0) 버전 확인 후 필요 시 업데이트
claude --version

# 1) Claude Code 패치
npx tweakcc --apply

# 3) 언어 서버 설치 (TypeScript)
npm install -g @vtsls/language-server typescript
```

```text
# (Claude Code 안에서)
/plugin marketplace add Piebald-AI/claude-code-lsps   # 2) 마켓플레이스 등록
/plugin install vtsls@claude-code-lsps                # 4) 플러그인 설치
# 5) Claude Code 재시작
```

설치 확인:

```text
TicketStatus 타입이 사용된 모든 위치를 찾아줘
```

응답에 `Using findReferences for symbol "TicketStatus"`처럼 LSP 오퍼레이션이 표시되면 정상 동작이다.

---

## 4. 언어별 추가 방법 (핵심)

각 언어는 **① 언어 서버 설치 명령**과 **② 플러그인 설치 명령**의 짝으로 구성된다.
②의 형식은 모두 `/plugin install <플러그인명>@claude-code-lsps`로 동일하므로, 아래 표에서는 **플러그인명**만 표기한다.

### 4-1. 전체 매핑 표 (35개 플러그인)

마켓플레이스 `marketplace.json`에서 추출한 검증된 매핑이다.

| 언어 | 플러그인명 | 언어 서버 | ① 언어 서버 설치 | 대상 확장자 |
|---|---|---|---|---|
| TypeScript / JavaScript | `vtsls` | vtsls | `npm install -g @vtsls/language-server typescript` | .ts .tsx .js .jsx .mjs .cjs |
| Python (권장) | `pyright` | pyright-langserver | `npm install -g pyright` | .py .pyi .pyw |
| Python (초고속) | `ty` | ty | `uv tool install ty` (또는 `pip install ty`) | .py .pyi .pyw |
| Python (pyright 포크) | `basedpyright` | basedpyright-langserver | `pip install basedpyright` ⚠️ | .py .pyi .pyw |
| Rust | `rust-analyzer` | rust-analyzer | `rustup component add rust-analyzer` | .rs |
| Go | `gopls` | gopls | `go install golang.org/x/tools/gopls@latest` | .go |
| Java | `jdtls` | jdtls | jdtls 다운로드 / `brew install jdtls` (Java 21+) | .java |
| C / C++ | `clangd` | clangd | `brew install llvm` / `apt-get install clangd` | .c .cc .cpp .cxx .h .hpp 등 |
| C# | `omnisharp` | OmniSharp | `brew install omnisharp/omnisharp-roslyn/omnisharp-mono` (.NET SDK) | .cs .csx |
| Ruby | `ruby-lsp` | ruby-lsp | `gem install ruby-lsp` | .rb .rake .gemspec .rbw |
| PHP (기본) | `phpactor` | phpactor | `composer global require --dev phpactor/phpactor` | .php .phtml 등 |
| PHP (Rust 구현) | `php-lsp` | php-lsp | `cargo install php-lsp` | .php .phtml 등 |
| Kotlin | `kotlin-lsp` | kotlin-lsp | `brew install JetBrains/utils/kotlin-lsp` (Java 17+) | .kt .kts |
| Scala | `metals` | metals | Coursier로 bootstrap (Java 11/17) | .scala .sbt .sc |
| HTML / CSS / ESLint | `vscode-langservers` | vscode-{html,css,eslint}-language-server | `npm install -g @zed-industries/vscode-langservers-extracted` | .html .css .scss + ESLint 대상 |
| Vue | `vue-volar` | (sh 런처) | `npm install -g @vue/language-server@2` (v2 전용) | .vue |
| Svelte | `svelte-lsp` | svelteserver | `npm install -g svelte-language-server` | .svelte |
| Dart / Flutter | `dart` | dart | Dart SDK 또는 Flutter 설치 | .dart |
| Elixir | `elixir-ls` | elixir-ls | `brew install elixir-ls` (Elixir 1.15+, OTP 24+) | .ex .exs .heex |
| Bash | `bash-language-server` | bash-language-server | `npm install -g bash-language-server` (Node 20+) | .sh .bash |
| LaTeX | `texlab` | texlab | `cargo install --locked texlab` / `brew install texlab` | .tex .bib .cls .sty |
| OCaml | `ocaml-lsp` | opam exec ocamllsp | `opam install ocaml-lsp-server` | .ml .mli .mll .mly |
| Julia | `julia-lsp` | julia | Julia에서 `Pkg.add("LanguageServer")` | .jl |
| Ada / SPARK | `ada-language-server` | ada_language_server | Alire `alr get ada_language_server` / 릴리스 | .adb .ads .adc .gpr |
| Solidity | `solidity-language-server` | solidity-language-server | `cargo install solidity-language-server` (Foundry) | .sol |
| PowerShell | `powershell-editor-services` | pwsh | pwsh 설치 + `Install-Module PowerShellEditorServices` | .ps1 .psm1 .psd1 |
| Perl | `perl-lsp` | perl-lsp | `cargo install perl-lsp` / 릴리스 바이너리 | .pl .pm .pod .t .psgi .cgi |
| BSL / 1C:Enterprise | `bsl-lsp` | bsl-language-server | GitHub 릴리스에서 플랫폼별 다운로드 | .bsl .os |
| Markdown / mdbase | `mdbase-lsp` | mdbase-lsp | 소스 빌드 `cargo build --release` / 릴리스 | .md (mdbase 컬렉션) |
| Swift | `swift-lsp` | sourcekit-lsp | Xcode / Swift 툴체인 ⚠️ | .swift .m .mm .c .h |
| Haskell | `haskell-language-server` | haskell-language-server-wrapper | `ghcup install hls` ⚠️ | .hs .lhs |
| GraphQL | `graphql-lsp` | graphql-lsp | `npm install -g graphql-language-service-cli` ⚠️ | .graphql .gql .graphqls |
| Gleam | `gleam` | gleam | Gleam 설치 (LSP 내장) ⚠️ | .gleam |
| Lean 4 (lake) | `lean4-lake-lsp` | lake | Lean 툴체인 (elan) ⚠️ | .lean |
| Lean 4 (lean) | `lean4-lean-lsp` | lean | Lean 툴체인 (elan) ⚠️ | .lean |

> ⚠️ 표시 항목(basedpyright, swift, haskell, graphql, gleam, lean4 ×2)은 **플러그인은 마켓플레이스에 존재**하나, README의 상세 설치 섹션에는 아직 수록되지 않았다. 언어 서버 설치는 각 도구 공식 문서로 재확인 후 사용할 것.

### 4-2. 주요 언어 상세

입문 강의에서 실제로 쓸 가능성이 높은 언어만 단계별로 정리한다. 모두 STEP 3 + STEP 4에 해당한다.

#### TypeScript / JavaScript — `vtsls` (가장 많이 씀)

```bash
# ① 언어 서버 (npm / pnpm / bun 중 택1)
npm install -g @vtsls/language-server typescript
```
```text
# ② 플러그인
/plugin install vtsls@claude-code-lsps
```

#### Python — `pyright`

```bash
# ① 언어 서버
npm install -g pyright
```
```text
# ② 플러그인
/plugin install pyright@claude-code-lsps
```

> 속도가 더 중요하면 Astral의 `ty`(`uv tool install ty`)와 `ty` 플러그인을 대신 쓸 수 있다. 같은 프로젝트에서 Python LSP는 하나만 활성화하는 것을 권장한다.

#### Go — `gopls`

```bash
# ① 언어 서버 (Go bin 경로가 PATH에 있어야 함, 보통 ~/go/bin)
go install golang.org/x/tools/gopls@latest
```
```text
# ② 플러그인
/plugin install gopls@claude-code-lsps
```

#### Rust — `rust-analyzer`

```bash
# ① 언어 서버 (rustup 사용 시)
rustup component add rust-analyzer
```
```text
# ② 플러그인
/plugin install rust-analyzer@claude-code-lsps
```

#### Java — `jdtls`

```bash
# ① 언어 서버 — Java 21+ 런타임 필요
curl -LO http://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz
mkdir -p ~/jdtls && tar -xzf jdt-language-server-latest.tar.gz -C ~/jdtls
# macOS Homebrew 대안: brew install jdtls
# JAVA_HOME을 Java 21+ 설치 경로로 지정
```
```text
# ② 플러그인
/plugin install jdtls@claude-code-lsps
```

#### C / C++ — `clangd`

```bash
# ① 언어 서버
brew install llvm            # macOS
# sudo apt-get install clangd # Ubuntu/Debian
```
```text
# ② 플러그인
/plugin install clangd@claude-code-lsps
```

#### Vue — `vue-volar` (반드시 v2.x)

```bash
# ① 언어 서버 — v2 필수 (v3는 Claude Code의 단순 LSP 연동과 호환 안 됨)
npm install -g @vue/language-server@2
# 타입 검사를 위해 프로젝트에 TypeScript도 설치
npm install --save-dev typescript
```
```text
# ② 플러그인 — vtsls 플러그인을 보완하는 용도(둘 다 설치 권장)
/plugin install vue-volar@claude-code-lsps
```

> WARNING — `@vue/language-server@3`은 동작하지 않는다. 런처가 PATH에서 최신 호환 **2.x.x** 바이너리를 선택하므로 v2를 명시 설치해야 한다.

#### Svelte — `svelte-lsp`

```bash
# ① 언어 서버
npm install -g svelte-language-server
```
```text
# ② 플러그인
/plugin install svelte-lsp@claude-code-lsps
```

### 4-3. 다국어 프로젝트

프로젝트에 여러 언어가 섞여 있으면(예: TypeScript 프론트 + Python 백엔드) **각 언어의 플러그인을 모두 설치**하면 된다. Claude Code는 파일 확장자에 따라 알맞은 언어 서버를 자동 선택한다.

```text
/plugin install vtsls@claude-code-lsps
/plugin install pyright@claude-code-lsps
```

---

## 5. 설치 확인 & 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| LSP 도구가 호출되지 않음 | tweakcc 패치 누락 또는 재시작 안 함 | `npx tweakcc --apply` 후 Claude Code 재시작 |
| "command not found" 류 오류 | 언어 서버가 PATH에 없음 | `which vtsls`(또는 해당 서버)로 확인, 글로벌 bin 경로를 PATH에 추가 |
| 버전 관련 설정 오류 | Claude Code 2.1.50 미만 | `npm install -g @anthropic-ai/claude-code@latest` |
| Vue에서 타입 정보 안 뜸 | `@vue/language-server@3` 설치됨 / 프로젝트 TS 없음 | v2 재설치, 프로젝트에 `typescript` 설치 |
| 첫 실행이 느림 | 언어 서버 초기 인덱싱/컴파일 | Java·Elixir·Julia 등은 최초 30~60초 소요 후 빨라짐 |

설치 목록 확인:

```text
/plugin list
```

[스크린샷 영역] `/plugins` 대화형 UI에서 `claude-code-lsps` 마켓플레이스의 플러그인 목록과 설치 상태가 보이는 화면 — 강의 녹화 시 캡처

---

## 6. 활용 예시 — LSP가 붙으면 무엇이 달라지나

```text
TicketStatus 타입이 사용된 모든 위치를 찾아줘
```
```text
> Using findReferences for symbol "TicketStatus"
Found 12 references:
  - src/shared/types/index.ts:8:1 (declaration)
  - src/server/services/ticketService.ts:3:10
  ...
```

텍스트 검색(grep)이었다면 주석·문자열 속 "TicketStatus"까지 섞여 들어온다. 언어 서버는 **실제 코드 참조만** 반환하므로 안전하게 리팩토링할 수 있다.

수정 직후 타입 에러 확인도 빌드 없이 가능하다.

```text
방금 수정한 route.ts에 에러 없는지 확인해줘
```
```text
> Using getDiagnostics for app/api/tickets/route.ts
  - Error at line 45: Type 'string' is not assignable to type 'TicketPriority'
```

---

## 7. 출처 & 할루시네이션 검증 노트

### 1차 출처 (직접 확인)

- LSP 마켓플레이스 README: https://github.com/Piebald-AI/claude-code-lsps (raw README 직접 파싱 — 35개 플러그인, 언어별 설치법, tweakcc 패치 요구사항 확인)
- 마켓플레이스 카탈로그: `marketplace.json` 직접 파싱 → 플러그인명·언어 서버·확장자 매핑 추출 (35개 플러그인 확인)
- Claude Code 버전: https://registry.npmjs.org/@anthropic-ai/claude-code/latest → **2.1.183** 확인
- tweakcc 버전: https://registry.npmjs.org/tweakcc/latest → **4.1.1** 확인
- 플러그인 설치 명령 형식 `<plugin>@<marketplace-name>`: Claude Code 공식 문서(code.claude.com/docs/en/discover-plugins) 및 복수 2차 자료 일치 확인

### 검증 항목 표

| 항목 | 상태 | 비고 |
|---|---|---|
| LSP는 `/plugin install`로 설치 (MCP 아님) | ✅ 확인 | 2.0.74 changelog 정식 추가 |
| 마켓플레이스 플러그인 35개 | ✅ 확인 | marketplace.json 직접 카운트 |
| 설치 명령 `vtsls@claude-code-lsps` | ✅ 확인 | 마켓플레이스 name 필드 = `claude-code-lsps` |
| 2.1.50+ 요구 | ✅ 확인 | README 명시, 현재 최신 2.1.183 |
| tweakcc `--apply` 패치 필요 | ⚠️ 녹화 시 재확인 | 현재 README에 명시되나 CC 버전 따라 변동 가능 |
| ⚠️ 표시 6개 언어 서버 설치법 | ⚠️ 녹화 시 재확인 | 플러그인 존재 확정, README 상세 미수록 — 각 도구 공식 문서 확인 |
| LSP 9개 오퍼레이션 | ✅ 확인 | README 명시 |

### 기존 프로젝트 파일 갱신 권장

| 파일 | 수정 권장 사항 |
|---|---|
| `lsp.md` | "20개 이상 언어 / 9개 오퍼레이션 / TypeScript·Python·Go·Rust·Java·C/C++" → 현재 **35개 플러그인, 약 30개 언어**로 갱신. tweakcc 패치 단계 추가 권장. 예시의 "Tika 프로젝트" → markflow로 정정 |
| `lsp-codesight-token-ppt-content.md` | 설치 명령 `vtsls@Piebald-AI-claude-code-lsps` → **`vtsls@claude-code-lsps`**로 정정. "플러그인 26개/LSP 29개" → **35개**로 갱신 |

> 본 문서 작성 전 답변 할루시네이션 재점검 완료: 모든 플러그인명·언어 서버·확장자는 마켓플레이스 `marketplace.json` 실측 매핑 기반, 버전 수치는 npm registry 실측 기반. README 미수록 항목은 ⚠️로 명시 구분함.
