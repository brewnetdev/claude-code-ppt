# Claude Context 완벽 분석 가이드

> 분석 대상: [zilliztech/claude-context](https://github.com/zilliztech/claude-context)
> 작성일: 2026-04-25 · 라이선스: MIT · ⭐ 5.8k · Fork 522

---

## 1. 한 줄 요약

**Claude Context**는 Claude Code, Cursor, Windsurf 같은 AI 코딩 에이전트에 **"코드베이스 전체를 시맨틱 검색으로 컨텍스트화"** 해주는 MCP 플러그인이다. 수백만 줄짜리 레포에서도 관련 코드만 정확히 뽑아 LLM에 넣어주므로, **토큰 사용량을 약 40% 절감**하면서 검색 품질은 유지한다.

만든 곳은 벡터 DB **Milvus**의 본가인 **Zilliz**. 자기네 인프라 위에서 가장 잘 돌아가도록 설계되어 있다.

---

## 2. 작동 원리 (Architecture)

### 2.1 핵심 흐름

```
[당신의 코드베이스]
        │
        ▼
   ① AST 기반 코드 청킹  ← Tree-sitter 등으로 함수/클래스 단위 분할
        │
        ▼
   ② Embedding 생성     ← OpenAI / VoyageAI / Gemini / Ollama
        │
        ▼
   ③ Vector DB 저장     ← Zilliz Cloud 또는 self-hosted Milvus
        │
        ▼
   ④ Hybrid Search      ← BM25 (키워드) + Dense Vector (시맨틱)
        │
        ▼
   ⑤ MCP 프로토콜로 Claude Code에 전달
```

### 2.2 핵심 기술 4가지

#### ① 인텔리전트 청킹 (AST 기반)
- 단순히 N줄씩 자르지 않고 **추상 구문 트리(AST)** 로 분석해 함수/클래스/메서드 단위로 의미 있게 분할
- 실패 시 LangChain의 character-based splitter로 자동 폴백
- 환경변수 `SPLITTER_TYPE=ast | langchain` 으로 지정 가능

#### ② 하이브리드 검색 (BM25 + Dense Vector)
- **BM25 (Sparse)**: 정확한 키워드/식별자 매칭 (예: 함수명, 변수명)
- **Dense Vector (Semantic)**: 의미 기반 검색 (예: "사용자 인증을 처리하는 함수 찾아줘")
- 둘을 결합해 키워드와 의미를 모두 잡는다
- `HYBRID_MODE=false` 로 끄고 dense만 쓸 수도 있음

#### ③ Incremental Indexing (Merkle Tree)
- 코드가 바뀔 때마다 전체 재인덱싱하지 않음
- **머클 트리**로 변경된 파일만 골라 재처리 → 대형 레포에서 결정적인 최적화
- 토픽 태그에도 `merkle-tree`가 명시되어 있음

#### ④ MCP (Model Context Protocol) 인터페이스
- Anthropic이 만든 표준 프로토콜로 AI 에이전트가 외부 도구를 사용할 수 있게 함
- stdio transport 사용 → MCP 호환 클라이언트 어디든 연결 가능

### 2.3 모노레포 구조

| 패키지 | 설명 |
|---|---|
| `@zilliz/claude-context-core` | 인덱싱 엔진 + 임베딩 + 벡터 DB 연동 핵심 라이브러리 |
| `@zilliz/claude-context-mcp` | MCP 서버 (대부분의 사용자가 쓰는 진입점) |
| VSCode Extension | "Semantic Code Search" 라는 이름의 IDE 확장 |

언어 비중: TypeScript 68.6%, Python 15.7%, JavaScript 10.6%

---

## 3. 특징 정리

### 3.1 강점

| 특징 | 설명 |
|---|---|
| 🧠 **거대 코드베이스 대응** | 수백만 줄 레포에서도 관련 코드만 추출 (multi-round discovery 불필요) |
| 💰 **토큰 비용 절감** | 자체 평가 결과 동일 검색 품질 기준 약 **40% 토큰 감소** |
| 🔌 **에이전트 무관** | Claude Code / Cursor / Windsurf / Codex / Gemini CLI / Cline / Cherry Studio 등 모두 지원 |
| 🏠 **완전 로컬 배포 가능** | Ollama (임베딩) + self-hosted Milvus (벡터 DB) 조합으로 코드가 외부로 나가지 않음 |
| 🔧 **다양한 임베딩 제공자** | OpenAI, VoyageAI (코드 특화 `voyage-code-3`), Gemini, Ollama |
| 🌐 **다국어 지원** | TypeScript, JavaScript, Python, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Scala, Markdown |
| 📜 **MIT 라이선스** | 상업적 사용·수정·배포 자유 |

### 3.2 약점 / 주의점

| 한계 | 상세 |
|---|---|
| 🔑 **외부 인프라 의존 (기본 설정 시)** | 기본 권장 설정은 Zilliz Cloud + OpenAI API → 코드 청크가 외부로 전송됨. 사내 코드/기밀 코드는 로컬 배포 필수 |
| 🚫 **Node.js 24+ 비호환** | Node.js >= 20.0.0 AND < 24.0.0 만 지원. 24 쓰면 다운그레이드 필요 |
| 💸 **무료 한도** | Zilliz Cloud 무료 플랜은 100만 벡터 저장/검색 작업 → 개인용은 충분하나 대규모 팀에선 유료 전환 필요 |
| 🔄 **임베딩 비용** | OpenAI 사용 시 인덱싱 대상 코드 양에 비례한 임베딩 비용 발생 |
| 📌 **이름 헷갈림** | "Claude Context" 지만 Anthropic 공식 도구가 아니다. **Zilliz의 서드파티 MCP 서버** |

### 3.3 비슷한 도구와 차이

- **Serena MCP**: LSP 기반 심볼 검색 (정확한 정의/참조 추적). Claude Context는 시맨틱 검색이라 자연어 질의에 강함
- **Context7**: 라이브러리/프레임워크 공식 문서 검색용. Claude Context는 사용자 코드베이스 검색용
- **DeepWiki**: GitHub 레포 자동 위키 생성. Claude Context는 실시간 검색

---

## 4. 맥에서 설치하는 법

> **전제**: macOS (Apple Silicon 또는 Intel) + Node.js 20 또는 22

### 4.1 사전 준비

#### Step 1. Node.js 버전 확인 및 조정

```bash
node -v
```

- 결과가 `v20.x` 또는 `v22.x` 면 OK
- `v24.x` 이상이면 다운그레이드 필요:

```bash
# nvm 사용 시
nvm install 22
nvm use 22

# Homebrew로 다중 버전 관리하는 경우
brew install node@22
brew link --overwrite node@22
```

#### Step 2. Claude Code 설치 (이미 있으면 스킵)

```bash
npm install -g @anthropic-ai/claude-code
```

#### Step 3. API 키 2개 발급

**(A) Zilliz Cloud Personal API Key** (벡터 DB)
1. https://cloud.zilliz.com/signup 가입 (GitHub 로그인 가능)
2. 콘솔에서 **Serverless Cluster** 생성 (무료)
3. 클러스터 상세 → Connection Info에서 다음 2개 복사:
   - `Public Endpoint` (예: `https://xxx.api.gcp-us-west1.zillizcloud.com`)
   - `API Key`

**(B) OpenAI API Key** (임베딩 모델용)
1. https://platform.openai.com/api-keys
2. `sk-` 로 시작하는 키 발급
3. **참고**: `text-embedding-3-small` 기준 1M 토큰당 $0.02 정도라 부담 적음

> 💡 코드를 외부에 보내기 싫다면 (B) 대신 Ollama 사용. 아래 4.4 섹션 참조.

### 4.2 기본 설치 (Claude Code + Zilliz Cloud + OpenAI)

가장 권장되는 1단계 설치 명령어:

```bash
claude mcp add claude-context \
  -e OPENAI_API_KEY=sk-여러분의-openai-키 \
  -e MILVUS_TOKEN=여러분의-zilliz-key \
  -- npx @zilliz/claude-context-mcp@latest
```

> **주의**: README의 기본 예시에는 `MILVUS_ADDRESS` 가 빠져 있는데, 이는 Zilliz **Personal API Key** 를 쓰면 토큰에서 주소를 자동 해석하기 때문. 만약 별도 클러스터 키를 쓴다면 다음처럼 추가:

```bash
claude mcp add claude-context \
  -e OPENAI_API_KEY=sk-여러분의-openai-키 \
  -e MILVUS_ADDRESS=https://xxx.api.gcp-us-west1.zillizcloud.com \
  -e MILVUS_TOKEN=여러분의-zilliz-key \
  -- npx @zilliz/claude-context-mcp@latest
```

#### 설치 확인

```bash
claude mcp list
```

`claude-context` 가 목록에 보이고 상태가 정상이면 완료.

### 4.3 글로벌 설정 (권장 - 여러 클라이언트에서 재사용)

여러 도구(Claude Code + Cursor + Codex 등)에서 같은 설정을 쓰고 싶다면 글로벌 `.env` 파일을 만든다:

```bash
mkdir -p ~/.context
cat > ~/.context/.env << 'EOF'
EMBEDDING_PROVIDER=OpenAI
OPENAI_API_KEY=sk-여러분의-openai-키
EMBEDDING_MODEL=text-embedding-3-small
MILVUS_TOKEN=여러분의-zilliz-key
EOF
```

이후엔 환경변수 없이 깔끔하게 등록 가능:

```bash
claude mcp add claude-context -- npx @zilliz/claude-context-mcp@latest
```

### 4.4 완전 로컬 배포 (코드 외부 유출 X)

기밀 코드/사내 코드라면 모든 컴포넌트를 로컬에서 돌리는 조합이 가능하다.

#### Step 1. Ollama 설치 + 임베딩 모델 다운로드

```bash
# Ollama 설치 (이미 있으면 스킵)
brew install ollama

# Ollama 실행
ollama serve &

# 임베딩 모델 받기 (가장 가벼운 선택)
ollama pull nomic-embed-text
```

#### Step 2. Milvus 로컬 실행 (Docker)

```bash
# Docker Desktop이 설치되어 있어야 함
docker pull milvusdb/milvus:latest

docker run -d \
  --name milvus-standalone \
  -p 19530:19530 \
  -p 9091:9091 \
  -v milvus_data:/var/lib/milvus \
  milvusdb/milvus:latest \
  milvus run standalone
```

#### Step 3. Claude Code에 등록 (전부 로컬 모드)

```bash
claude mcp add claude-context \
  -e EMBEDDING_PROVIDER=Ollama \
  -e EMBEDDING_MODEL=nomic-embed-text \
  -e OLLAMA_HOST=http://127.0.0.1:11434 \
  -e MILVUS_ADDRESS=127.0.0.1:19530 \
  -e MILVUS_TOKEN=local \
  -- npx @zilliz/claude-context-mcp@latest
```

이 조합이면 OpenAI/Zilliz Cloud로 코드 한 줄도 나가지 않는다. 코드빌런님이 작업 중이신 Mac Mini M4 Pro + Qwen3 로컬 LLM 워크플로우와 자연스럽게 합쳐질 수 있는 구조.

> 💡 **VoyageAI 사용 팁**: 코드 특화 임베딩이 필요하면 `voyage-code-3` 모델이 가장 강력. OpenAI보다 코드 검색 정확도가 일반적으로 높다고 평가됨.
> ```bash
> -e EMBEDDING_PROVIDER=VoyageAI \
> -e VOYAGEAI_API_KEY=pa-여러분의-키 \
> -e EMBEDDING_MODEL=voyage-code-3
> ```

### 4.5 다른 클라이언트 설정 예시

#### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["-y", "@zilliz/claude-context-mcp@latest"],
      "env": {
        "OPENAI_API_KEY": "sk-여러분의-키",
        "MILVUS_TOKEN": "여러분의-zilliz-key"
      }
    }
  }
}
```

#### Codex CLI (`~/.codex/config.toml`)

```toml
[mcp_servers.claude-context]
command = "npx"
args = ["@zilliz/claude-context-mcp@latest"]
env = { "OPENAI_API_KEY" = "sk-여러분의-키", "MILVUS_TOKEN" = "여러분의-zilliz-key" }
startup_timeout_ms = 20000
```

> ⚠️ Codex CLI는 키가 `mcp_servers` (언더스코어), 다른 도구들은 `mcpServers` (캐멀케이스). 헷갈리기 쉬움.

#### VSCode Extension만 쓰는 경우

CLI 등록 없이 IDE에서만 검색하고 싶다면:
1. VSCode 마켓플레이스에서 "**Semantic Code Search**" (publisher: zilliz) 검색 → 설치
2. 명령 팔레트에서 설정

---

## 5. 사용법

### 5.1 가장 기본적인 워크플로우

#### Step 1. 프로젝트 디렉터리에서 Claude Code 실행

```bash
cd ~/projects/my-large-project
claude
```

#### Step 2. 코드베이스 인덱싱

Claude Code 프롬프트창에 자연어로 입력:

```
Index this codebase
```

또는

```
이 코드베이스를 인덱싱해줘
```

Claude가 알아서 `index_codebase` MCP 도구를 호출한다. 처음엔 코드 양에 따라 수 분~수십 분 걸릴 수 있다.

#### Step 3. 인덱싱 상태 확인

```
Check the indexing status
```

진행률 % 가 표시된다. 100% 가 되면 검색 가능.

#### Step 4. 시맨틱 검색

```
Find functions that handle user authentication
사용자 인증을 처리하는 함수 찾아줘
JWT 토큰 검증 로직이 있는 곳 보여줘
RabbitMQ 발행 로직이 들어간 모듈 찾아줘
```

자연어 질의로 관련 코드 청크가 라인 번호와 함께 반환된다.

### 5.2 제공되는 MCP 도구 4가지

Claude Code가 자동으로 호출하는 도구들:

| 도구 | 역할 |
|---|---|
| `index_codebase` | 디렉터리를 인덱싱 (BM25 + dense vector) |
| `search_code` | 자연어로 인덱싱된 코드 검색 |
| `clear_index` | 특정 코드베이스의 인덱스 삭제 |
| `get_indexing_status` | 인덱싱 진행 상태 조회 |

### 5.3 실전 활용 시나리오

#### 시나리오 1: 큰 레거시 프로젝트 파악
```
"이 코드베이스에서 결제 처리 흐름이 어디서 시작되는지 보여줘"
"트랜잭션 롤백 로직이 들어간 부분 모두 찾아줘"
```
→ 디렉터리 트리를 일일이 뒤지지 않고 의미 기반 점프 가능

#### 시나리오 2: 리팩토링 영향도 분석
```
"AuthService.validateToken 호출하는 모든 위치 찾아줘"
"이 인터페이스를 구현한 클래스 모두 보여줘"
```

#### 시나리오 3: 새 기능 추가 시 기존 패턴 학습
```
"우리 코드베이스에서 캐싱은 어떤 패턴으로 구현되어 있어?"
"비동기 작업 큐 등록 예시 보여줘"
```
→ 기존 컨벤션 따라 새 코드 작성 가능

#### 시나리오 4: 코드빌런님 사용 사례 (개인 추정)
- **Simplite/tika 모노레포**: 백엔드 + 프론트엔드 + 공유 라이브러리 코드를 한 번에 인덱싱해두면 "tika의 칸반 드래그앤드롭 로직 보여줘" 같은 질의 가능
- **이전 QNote/HomeHub 프로젝트 참고**: 새 프로젝트에서 "QNote의 SQLite 마이그레이션 패턴이 어떻게 됐었지?" 같은 회고 검색

### 5.4 인덱스 제외 파일 커스터마이징

기본적으로 `node_modules`, `.git`, 빌드 산출물 등은 자동 제외. 추가 패턴이 필요하면:

```bash
-e CUSTOM_EXTENSIONS=.vue,.svelte,.astro \
-e CUSTOM_IGNORE_PATTERNS=temp/**,*.backup,private/**
```

### 5.5 임베딩 배치 사이즈 튜닝

대형 레포 인덱싱 속도를 올리고 싶다면:

```bash
-e EMBEDDING_BATCH_SIZE=200  # 기본 100
```

다만 OpenAI rate limit이나 Ollama 메모리 한계에 부딪힐 수 있으니 적절히 조정.

---

## 6. 가격/비용 추정

| 시나리오 | 월 비용 추정 (개인 사용) |
|---|---|
| **Zilliz Cloud Free + OpenAI text-embedding-3-small** | $0 ~ $5 (코드 양에 따라 임베딩 비용만) |
| **Zilliz Cloud Free + VoyageAI voyage-code-3** | $0 ~ $10 (정확도 우선) |
| **완전 로컬 (Ollama + Docker Milvus)** | $0 (전기 요금 외) |
| **팀 사용 (Zilliz Standard + OpenAI)** | $50~ |

> 💡 인덱싱은 1회성에 가깝고, 검색만 할 때는 BM25 부분이 비용 들지 않으므로 운영 비용은 생각보다 낮은 편.

---

## 7. 결론 - 누구에게 추천하나

✅ **추천하는 경우**
- Claude Code/Cursor/Windsurf 등으로 매일 코딩하는 개발자
- 5만 줄 이상의 중대형 코드베이스를 다루는 사람
- 토큰 비용을 줄이고 싶은 팀
- RAG/벡터 검색을 실제로 적용해보고 싶은 사람
- 사내 코드 보안 때문에 외부 코딩 도구 못 썼던 팀 (로컬 배포)

❌ **굳이 필요 없는 경우**
- 코드베이스가 작아서 (< 5천 줄) Claude Code의 기본 파일 읽기만으로 충분한 경우
- Claude Code의 `/init` 으로 만든 CLAUDE.md + grep 조합이 이미 잘 동작하고 있는 경우 (성능 차이 체감 적음)
- Node.js 24를 다른 프로젝트에서 강하게 묶여 쓰고 있어 다운그레이드가 곤란한 경우

---

## 8. 참고 링크

- 📦 **GitHub**: https://github.com/zilliztech/claude-context
- 📚 **공식 문서**: https://github.com/zilliztech/claude-context/tree/master/docs
- 🌐 **DeepWiki (자동 생성된 위키)**: https://deepwiki.com/zilliztech/claude-context
- 📦 **npm (MCP)**: https://www.npmjs.com/package/@zilliz/claude-context-mcp
- 📦 **npm (Core)**: https://www.npmjs.com/package/@zilliz/claude-context-core
- 🔌 **VSCode Extension**: https://marketplace.visualstudio.com/items?itemName=zilliz.semanticcodesearch
- ☁️ **Zilliz Cloud 가입**: https://cloud.zilliz.com/signup
- 🔧 **환경변수 가이드**: https://github.com/zilliztech/claude-context/blob/master/docs/getting-started/environment-variables.md
- 🐳 **Milvus Docker Hub**: https://hub.docker.com/r/milvusdb/milvus

---

## 부록: 문제 해결 체크리스트

| 증상 | 해결 |
|---|---|
| `claude mcp add` 후 서버가 안 뜸 | Node 버전 확인 (`node -v` → 20 또는 22) |
| 인덱싱이 0%에서 멈춤 | OpenAI API 키 잔액/유효성 확인, `claude mcp list` 로 상태 확인 |
| Zilliz 연결 에러 | `MILVUS_TOKEN` 과 `MILVUS_ADDRESS` 매칭 확인. Personal API Key는 토큰만 있어도 됨 |
| Ollama 임베딩 시 메모리 부족 | `EMBEDDING_BATCH_SIZE=20` 으로 낮춰보기 |
| Codex CLI에서만 안 됨 | `mcp_servers` (언더스코어) 키 사용 확인. `startup_timeout_ms` 늘려보기 |
| 검색 결과가 부정확 | `voyage-code-3` 같은 코드 특화 임베딩으로 교체 |
