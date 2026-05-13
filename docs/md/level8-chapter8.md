# LEVEL 8 — 배포 & 셀프호스팅

> **메인 프로젝트:** Tika 칸반 + markflow SaaS — 실 서비스 론칭 단계
>
> Level 7까지 만든 애플리케이션을 실제 사용자에게 보여줄 차례다. 8.1에서 환경 분리 전략을 정립하고, 8.2에서 `claude -p` + GitHub Actions로 CI/CD 자동화를 구성한다. 8.3~8.4는 Vercel + Railway 양 축의 클라우드 배포, 8.5는 Cloudflare 인프라(Tunnel·Pages·Workers·R2) 기반 셀프 호스팅, 8.6은 OAuth + Resend 트랜잭셔널 메일까지 — *배포는 개발의 끝이 아니라 운영의 시작*이라는 관점으로 통합한다.

---

## 학습 흐름 한눈에

```
8.1  환경 관리         → dev/staging/prod 분리 → 환경 변수·시크릿 → 도메인 매핑
8.2  CI/CD 통합        → claude -p + GitHub Actions → PR 자동 리뷰 → 실패 자동 수정 → Dispatch 알림
8.3  Vercel 배포       → 준비 체크리스트 → Git 연결 → Preview 자동화 → Vercel Functions
8.4  Railway 백엔드    → Docker 기반 → DB 프로비저닝 → 헬스체크 → Vercel 프론트와 연동
8.5  Cloudflare 셀프호스팅 → DNS 자동화 → Tunnel(공인 IP 없이 노출) → Pages·Workers·R2
8.6  인증·메일         → Google/GitHub OAuth → Resend API → React Email → 발송 모니터링
```

---

# 8.1 환경 관리 전략

## 8.1.1 개발 / 스테이징 / 운영 서버 분리

실무에서는 최소 세 가지 환경을 운영하는 것이 일반적이다.

- **개발 환경(Development)**: 개발자가 로컬에서 작업하는 환경 또는 운영 서버와 격리된 테스트 서버. 빠른 피드백 루프가 핵심이며 핫 리로드와 상세한 에러 메시지(Debug level) 로그가 활성화된다.
- **스테이징 환경(Staging)**: 운영 환경과 최대한 동일하게 구성된 테스트 환경. QA 팀·이해관계자가 배포 전 최종 검증을 수행한다. 스키마 설정이나 데이터 사이즈를 비슷하게 구성한 테스트 DB를 사용하거나 운영 DB를 사용하는 경우도 있다.
- **운영 환경(Production)**: 실제 사용자가 접근하는 환경.

### 환경 분리 없이 발생하는 문제

- 개발 중인 불안정한 코드가 사용자에게 노출된다.
- 테스트 데이터가 운영 DB에 섞여 들어간다.
- 운영 환경에서만 재현되는 버그를 파악하기 어렵다.
- 롤백이 필요할 때 어느 지점으로 돌아가야 할지 모호해진다.

### Vercel 환경 관리 체계

| 환경 | 트리거 | URL 형식 | 용도 |
|---|---|---|---|
| Production | main 브랜치 push | your-project.vercel.app | 운영 |
| Preview | PR 생성, 브랜치 push | your-project-git-branch.vercel.app | 스테이징 |
| Development | `vercel dev` | localhost:3000 | 로컬 개발 |

이 구조의 장점은 **별도 설정 없이 Git 워크플로만으로 환경이 자동 분리**된다는 것이다. PR을 develop 브랜치에 반영하면 Preview 배포가 생성되고, main에 머지하고 푸시하면 Production에 배포된다.

### 권장 브랜치 전략

```
main (Production) ← develop (Staging) ← feature/* (Preview)
```

- **feature/\***: 개별 기능 개발. PR 생성 시 Preview 배포로 리뷰
- **develop**: 통합 테스트용. 스테이징 환경 역할
- **main**: 운영 배포. 안정성이 검증된 코드만 머지

> Vercel의 Custom Environments 기능을 사용하면 특정 브랜치에 전용 환경을 연결할 수 있다. Settings > Environments에서 staging 환경을 생성하고, Branch Tracking에 develop 브랜치를 지정하면 develop 배포 시 staging 환경 변수가 적용된다.

## 8.1.2 환경 변수 관리와 시크릿

Vercel에서는 환경 변수를 환경별로 다르게 설정할 수 있다. 프로젝트 **Settings > Environment Variables**에서 Production, Preview, Development 환경별로 분리한다.

```bash
# Production 환경
POSTGRES_URL=postgres://prod-user:xxx@prod-host/tika_prod

# Preview 환경
POSTGRES_URL=postgres://staging-user:xxx@staging-host/tika_staging

# Development 환경
POSTGRES_URL=postgres://dev-user:xxx@localhost/tika_dev
```

Tika 앱은 `src/server/db/index.ts`에서 `process.env.POSTGRES_URL || process.env.DATABASE_URL`을 읽어 PostgreSQL Pool을 생성한다. Vercel에서 Neon을 연결하면 자동 생성되는 `POSTGRES_URL`을 바로 쓰고, 로컬 개발에서는 `.env.local`의 `DATABASE_URL`을 쓰는 폴백 구조다.

### 시크릿 누출을 막는 4가지 규칙

| 규칙 | 이유 |
|---|---|
| `.env*`은 `.gitignore`에 등록 | 깃 커밋 차단이 1차 방어선 |
| 키 발급 즉시 별도 비밀 저장소 보관 | Resend·Cloudflare·OAuth Secret은 한 번만 노출됨 |
| 환경별 다른 DB Credential | 개발 키가 운영 DB를 건드리지 못하도록 |
| 정기 회전(rotation) | 분기 1회 권장, 인시던트 발생 시 즉시 |

> Claude Code 운영 시점에서는 `.claude/settings.json`의 `permissions.deny`에 `Read(./.env)`, `Read(./.env.*)`을 추가해 LLM이 시크릿 파일을 읽지 못하도록 차단한다. (Level 6 보안 챕터 참조)

## 8.1.3 다중 환경 도메인 구조

서비스가 성장하면 환경별로 도메인을 분리하는 것이 표준이다.

| 환경 | 도메인 패턴 | 비고 |
|---|---|---|
| Production | `tika.example.com` | 메인 |
| Staging | `staging.tika.example.com` | 내부·QA |
| Preview | `pr-123-tika.vercel.app` | PR 단위 자동 |
| API | `api.tika.example.com` | Railway 백엔드 |
| CDN | `cdn.tika.example.com` | R2 정적 자원 |

서브도메인 분리의 장점은 **쿠키 스코프 제어**(`tika.example.com`만 인증 쿠키 수신), **보안 격리**(staging의 XSS가 운영에 영향 없음), **캐시 분리**(CDN 별도 캐시 정책)다.

---

# 8.2 CI/CD 통합

## 8.2.1 `claude -p` + GitHub Actions

`claude -p`(print mode, 비대화형)는 Claude Code를 CLI 한 줄로 실행해 단일 응답을 stdout으로 반환한다. **GitHub Actions에서 가장 많이 쓰이는 진입점**이다.

```yaml
# .github/workflows/claude-review.yml
name: Claude Auto Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code
      - name: Run Claude review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          claude -p "Review the diff for PR #${{ github.event.pull_request.number }}. Focus on bugs, security, perf. Output markdown." \
            --permission-mode dontAsk \
            --allowed-tools "Read,Bash(git diff:*),Bash(gh pr comment:*)" \
            > review.md
          gh pr comment ${{ github.event.pull_request.number }} -F review.md
```

### 핵심 옵션

| 옵션 | 의미 |
|---|---|
| `-p "<prompt>"` | 단일 프롬프트 비대화형 실행. 종료 시 stdout으로 결과 반환 |
| `--permission-mode dontAsk` | CI에서는 사람 답변 불가 → 사전 정의된 allow 룰만 사용 |
| `--allowed-tools` | 허용 도구를 화이트리스트로 명시(deny-by-default 권장) |
| `--output-format json` | 후처리 파이프라인 연결 시 |

> **주의**: Pro/Max 요금제 계정의 OAuth 토큰은 CI에서 사용 불가. CI에는 반드시 **API Key**(Console에서 발급)를 사용한다.

## 8.2.2 PR 자동 코드 리뷰 워크플로우

Claude Code의 **`/review`** 슬래시 명령을 GitHub Actions에서 트리거하는 패턴이다. PR 생성 시 자동으로 diff를 분석하고 마크다운 리뷰를 PR 코멘트로 게시한다.

```yaml
# .github/workflows/auto-review.yml
name: Claude PR Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Run /review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx -y @anthropic-ai/claude-code -p "/review --base ${{ github.base_ref }}" \
            --permission-mode dontAsk \
            --output-format markdown \
            > review.md
      - name: Post review
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: review.md
          header: claude-review
```

### 리뷰 품질 향상 팁

- **`CLAUDE.md`에 리뷰 규칙 명시**: "Critical/High/Medium 심각도로 분류", "잠재적 SQL Injection 항상 체크" 등
- **`sticky-pull-request-comment` 사용**: 같은 PR에 푸시될 때마다 새 코멘트가 쌓이지 않고 기존 코멘트가 갱신됨
- **Cost 통제**: `--max-turns 5` + `--effort low`로 토큰 한도 설정 (Level 6 토큰 절감 참조)

## 8.2.3 테스트 실패 시 자동 수정 → 재푸시

CI에서 테스트가 실패하면 Claude가 로그를 읽고 패치를 제안한 뒤 동일 브랜치에 자동 푸시하는 워크플로다. **자율성이 높은 만큼 권한 범위를 좁게** 잡아야 한다.

```yaml
# .github/workflows/auto-fix.yml
name: Auto Fix on Test Failure
on:
  workflow_run:
    workflows: ["CI Tests"]
    types: [completed]

jobs:
  fix:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_branch }}
      - name: Download failure log
        run: gh run view ${{ github.event.workflow_run.id }} --log > failure.log
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - name: Fix and commit
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "Read failure.log, identify root cause, fix the failing test minimally. Run npm test locally to verify before committing." \
            --permission-mode dontAsk \
            --allowed-tools "Read,Edit,Bash(npm test:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*)"
```

### 가드레일

- **`bypassPermissions` 금지**: 의도치 않은 파일 변경을 막기 위해 `--allowed-tools` 명시적 화이트리스트
- **루프 방지**: 자동 수정 → 재푸시 → 다시 실패 → 다시 수정 — 무한 루프를 막기 위해 `if: ${{ !contains(github.event.head_commit.message, '[claude-fix]') }}` 가드 추가
- **PR 단위로만**: main 브랜치 직접 푸시는 금지. `git checkout -b claude-fix/<run-id>` 후 PR 생성

## 8.2.4 Dispatch + Channels로 결과 알림

Claude Code의 **Dispatch**(원격 작업 트리거)와 **Channels**(완료 알림)를 결합하면 CI 결과를 모바일/Slack으로 즉시 받을 수 있다.

```yaml
# .github/workflows/notify.yml
- name: Notify Claude Channel
  env:
    CLAUDE_CHANNEL_TOKEN: ${{ secrets.CLAUDE_CHANNEL_TOKEN }}
  run: |
    curl -X POST https://api.claude.com/v1/channels/notify \
      -H "Authorization: Bearer $CLAUDE_CHANNEL_TOKEN" \
      -d '{
        "title": "Deploy ${{ github.ref_name }} ${{ job.status }}",
        "body": "Run #${{ github.run_id }} on ${{ github.repository }}",
        "url": "${{ github.event.workflow_run.html_url }}"
      }'
```

### 통합 시나리오

1. PR 생성 → `claude-review.yml` → 자동 리뷰 코멘트
2. 머지 → 배포 워크플로 → 빌드 실패 시 `auto-fix.yml` 작동
3. 배포 성공/실패 → Channels 알림이 모바일 푸시로 전달
4. 모바일에서 Dispatch로 "롤백" 명령 → CI 트리거 → 이전 커밋 재배포

> 출처: [code.claude.com/docs/en/headless](https://code.claude.com/docs/en/headless), [code.claude.com/docs/en/dispatch](https://code.claude.com/docs/en/dispatch)

---

# 8.3 Vercel 배포

## 8.3.1 배포 전 준비사항 체크리스트

Vercel은 GitHub 저장소와 연동하여 자동 배포를 구성한다. 배포 전 다음을 점검한다.

- [ ] GitHub 리포지터리 생성 및 `main` 브랜치 푸시 완료
- [ ] 로컬에서 프로덕션 빌드 성공 (`npm run build`)
- [ ] TypeScript 타입 체크 통과 (`npx tsc --noEmit`)
- [ ] `.env.local` → `.env.example` 동기화 (시크릿 제외)
- [ ] DB 마이그레이션 스크립트(`npm run db:migrate`) 준비
- [ ] `dynamic = 'force-dynamic'` — DB 호출 페이지 SSG 회피 설정

```bash
# 타입 체크
npx tsc --noEmit

# 프로덕션 빌드
npm run build
```

빌드 결과로 다음과 같은 라우트 정보가 출력되면 성공이다.

```
Route (app)                         Size     First Load JS
┌ ○ /                               33.4 kB         139 kB
├ ○ /_not-found                     979 B           106 kB
├ ƒ /api/tickets                    144 B           105 kB
├ ƒ /api/tickets/[id]               144 B           105 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

`○`는 정적 페이지, `ƒ`는 서버에서 동적으로 처리되는 API Route를 의미한다.

## 8.3.2 계정 생성과 프로젝트 연결

1. [vercel.com](https://vercel.com)에서 **Sign Up** — 구글 또는 GitHub 계정 권장
2. 계정 종류 선택(개인용/팀), 국가(South Korea), 전화번호 인증
3. 대시보드 → **Add New > Project** → GitHub 리포지터리 Import
4. Framework Preset이 **Next.js**로 자동 감지되면 그대로 진행
5. **Storage 탭 > Create Database > Neon Serverless Postgres** 선택
6. Region: `Singapore`(가장 가까운 위치) → DB 이름 입력 → Create

Neon을 연결하면 다음과 같은 환경 변수가 자동 생성된다.

```bash
POSTGRES_URL=postgres://neondb_owner:xxx@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NON_POOLING=...
POSTGRES_USER=neondb_owner
POSTGRES_HOST=ep-xxx.ap-southeast-1.aws.neon.tech
POSTGRES_PASSWORD=xxx
POSTGRES_DATABASE=neondb
```

### DB 연결 코드 패치 — 지연 초기화

Vercel 빌드 시 DB 연결을 시도하다 실패하지 않도록 **lazy-init Proxy 패턴**으로 변경한다.

```typescript
// src/server/db/index.ts
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let _db: NodePgDatabase<typeof schema> | null = null;

function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    _db = drizzle(pool, { schema });
  }
  return _db;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
```

이 변경으로 두 가지 문제가 해결된다.

- **지연 초기화**: DB 연결이 실제 쿼리 시점까지 지연되어 빌드 시 에러 없음
- **환경 변수 폴백**: `POSTGRES_URL || DATABASE_URL` — Vercel은 Neon이 자동 생성한 `POSTGRES_URL`을, 로컬에서는 `.env.local`의 `DATABASE_URL`을 사용

## 8.3.3 첫 배포와 Preview 자동화

`app/page.tsx`에서 `ticketService.getBoard()`를 호출하면 Next.js가 빌드 시 정적 생성(prerender)을 시도해 DB 접속 에러가 난다. **`force-dynamic`** 으로 우회한다.

```typescript
// app/page.tsx
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const initialData = await ticketService.getBoard();
  // ...
}
```

### 마이그레이션 실행

마이그레이션은 로컬 터미널에서 실행하되 운영 DB(Neon)에 접속한다.

```bash
# 백업
cp .env.local .env.local.backup

# .env.local의 DATABASE_URL을 Neon URL로 임시 교체
DATABASE_URL=postgres://neondb_owner:xxx@ep-xxx.aws.neon.tech/neondb?sslmode=require

# 마이그레이션 실행
npm run db:migrate

# 시드 데이터 입력
npm run db:seed
```

Drizzle ORM이 `drizzle.config.ts`에서 `DATABASE_URL`을 읽어 `tickets` 테이블과 인덱스를 운영 DB에 생성한다.

### Preview 배포 자동화

Git Project를 Vercel에 main 브랜치로 연결해두면, 다음과 같이 자동 트리거된다.

| 액션 | 결과 |
|---|---|
| `feature/*` 브랜치 push | Preview 배포 (`*-git-feature.vercel.app`) |
| PR open / synchronize | Preview 빌드 + Vercel Bot이 PR에 URL 코멘트 |
| `main`에 머지 | Production 자동 배포 |
| Build 실패 | Vercel 대시보드 + GitHub Checks에 표시 |

## 8.3.4 Vercel Functions 활용

Vercel Functions는 두 가지 런타임을 제공한다.

| 런타임 | 콜드 스타트 | 한도 | 적합한 용도 |
|---|---|---|---|
| Node.js | ~250ms | Hobby 10s / Pro 60s | DB 쿼리, 외부 API 호출 |
| Edge | ~50ms | 25s | 인증, 리다이렉트, A/B 테스트 |

### Edge Runtime 예시 — Geo 기반 리다이렉트

```typescript
// app/api/redirect/route.ts
export const runtime = 'edge';

export function GET(req: Request) {
  const country = (req as any).geo?.country ?? 'US';
  const target = country === 'KR'
    ? 'https://tika.kr'
    : 'https://tika.app';
  return Response.redirect(target, 307);
}
```

### Background Functions — 긴 작업 분리

Vercel Functions는 응답 후 백그라운드로 추가 작업을 처리할 수 있다(`waitUntil`).

```typescript
import { after } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  await saveImmediately(body);

  after(async () => {
    await sendAnalytics(body);   // 응답 이후 실행
    await sendEmail(body.email);
  });

  return Response.json({ ok: true });
}
```

> 출처: [vercel.com/docs/functions](https://vercel.com/docs/functions)

---

# 8.4 Railway 백엔드 배포

## 8.4.1 Docker 기반 배포 설정

Tika 앱은 Next.js API Routes를 사용하므로 별도 백엔드 서버가 필요 없다. 하지만 Express·Fastify·Spring Boot 같은 별도 백엔드를 운영하는 경우 **Railway**가 가장 간편하다. Railway는 컨테이너 기반의 안정적 배포를 서버리스 복잡성 없이 제공한다.

### 기본 Dockerfile (Node.js)

```dockerfile
# Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["node", "dist/server.js"]
```

### Railway 자동 감지

Railway는 다음 우선순위로 빌드 설정을 결정한다.

1. **Dockerfile**이 있으면 그대로 사용
2. **`nixpacks.toml`** 이 있으면 Nixpacks 빌드
3. 둘 다 없으면 자동 감지 (Node/Python/Go 등)

```bash
# Railway CLI 사용 시
npm i -g @railway/cli
railway login
railway init
railway up
```

대시보드에서 **New > GitHub Repository** → Git 리포지터리 연결 후 Settings의 **Networking > Generate Domain**을 클릭하면 자동 도메인을 발급받는다.

## 8.4.2 데이터베이스 프로비저닝

Railway는 **PostgreSQL, Redis, MongoDB, MySQL**을 원클릭으로 프로비저닝한다.

```
대시보드 → New → Database → PostgreSQL → Add
```

생성된 DB는 같은 프로젝트 내 다른 서비스가 자동으로 환경 변수를 참조할 수 있다.

```bash
# Railway가 자동 주입하는 환경 변수
DATABASE_URL=${{ Postgres.DATABASE_URL }}
DATABASE_PUBLIC_URL=${{ Postgres.DATABASE_PUBLIC_URL }}
PGUSER=${{ Postgres.PGUSER }}
PGPASSWORD=${{ Postgres.PGPASSWORD }}
PGHOST=${{ Postgres.PGHOST }}
PGPORT=${{ Postgres.PGPORT }}
PGDATABASE=${{ Postgres.PGDATABASE }}
```

`${{ Postgres.* }}` 문법은 Railway가 빌드 시점에 실제 값을 치환한다. **시크릿이 코드에 노출되지 않으면서** 동일 프로젝트 내 서비스 간 자동 연결이 가능하다.

## 8.4.3 헬스 체크와 재시작 정책

Railway에서는 **헬스 체크 엔드포인트**를 명시하면 컨테이너가 죽거나 응답이 없을 때 자동 재시작한다.

```toml
# railway.toml
[build]
builder = "DOCKERFILE"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
numReplicas = 1
```

### `/health` 엔드포인트 구현 (Express)

```typescript
import express from 'express';
import { db } from './db';

const app = express();

app.get('/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');           // DB 연결 검증
    res.json({ status: 'ok', timestamp: Date.now() });
  } catch (e) {
    res.status(503).json({ status: 'degraded', error: String(e) });
  }
});
```

| 정책 | 동작 |
|---|---|
| `ON_FAILURE` | 비정상 종료 시에만 재시작 (권장) |
| `ALWAYS` | 정상 종료여도 재시작 |
| `NEVER` | 한 번 죽으면 끝 (배치 작업용) |

## 8.4.4 Vercel 프론트와 연동

Vercel(프론트) + Railway(백엔드) 조합 시 **CORS와 도메인 매핑**을 정확히 설정해야 한다.

### Vercel 환경 변수

```bash
# Vercel Settings > Environment Variables
NEXT_PUBLIC_API_URL=https://api.tika.example.com
```

### Railway CORS 설정

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'https://tika.example.com',          // 운영
    'https://*.vercel.app',              // Preview
    'http://localhost:3000',             // 로컬
  ],
  credentials: true,                      // 쿠키 전달
}));
```

### 비용 비교

| 플랜 | Vercel | Railway |
|---|---|---|
| 무료 한도 | 100GB 대역폭/월 | $5 크레딧 |
| 유료 시작 | $20/월(Pro) | 사용량 기반 |
| 강점 | Next.js·정적 | 컨테이너·DB·롱러닝 |

> Railway는 일정 기간만 무료고 결국 한 달 5~10불 정도 비용이 발생하므로 **사용하지 않는 서버 리소스는 즉시 삭제**하는 것이 좋다.

---

# 8.5 Cloudflare 인프라를 통한 로컬 호스팅

## 8.5.1 도메인 연결과 DNS 자동화

프로덕션 환경에 배포를 마쳤다면 마지막은 **커스텀 도메인 연결**이다. `tika-xxx.vercel.app` 같은 자동 URL 대신 `tika.example.com` 같은 도메인은 사용자 신뢰도, 브랜딩, SEO, 쿠키 공유 범위 측면에서 실질적 이점이 있다.

### Vercel 도메인 연결 — 두 가지 방식

| 방식 | 동작 | 권장 상황 |
|---|---|---|
| 네임서버 변경 | 도메인 NS를 `ns1/ns2.vercel-dns.com`으로 교체 | Vercel에서 구입한 도메인 |
| DNS 레코드 추가 | A/CNAME만 추가 | 외부 등록 기관 도메인 |

### 단계별 절차

1. **Settings > Domains**로 이동 → 도메인 입력 (예: `tika.example.com`)
2. DNS 레코드 설정
   - **CNAME** (서브도메인): `cname.vercel-dns.com`
   - **A 레코드** (루트 도메인): Vercel이 제공하는 Anycast IP
3. DNS 전파 대기(보통 몇 분~24시간) — Vercel 도메인이면 1분 이내
4. SSL 인증서 자동 발급 확인 (Let's Encrypt)

### 외부 도메인(예: 가비아) 연동

```
가비아 도메인 관리 → 네임서버 설정 → 1차/2차 모두
ns1.vercel-dns.com / ns2.vercel-dns.com 로 변경
```

또는 네임서버는 그대로 두고 DNS 레코드만 추가하는 방법도 가능하다.

```
Type: CNAME    Name: www      Value: cname.vercel-dns.com
Type: A        Name: @        Value: 76.76.21.21 (Vercel IP)
```

DNS 전파 후 Vercel 도메인 화면에서 **Register: Third Party**, **Status: Active**로 표시되면 완료. `https://`는 Let's Encrypt가 자동 발급한다.

### Railway 도메인 설정

```
Settings > Networking > Public Networking > Custom Domain → Add
DNS 제공업체에서 CNAME 레코드 추가
  Name: api
  Value: <railway 제공 CNAME>
```

프런트가 Vercel(`tika.example.com`)이고 백엔드가 Railway라면 **`api.tika.example.com`**처럼 서브도메인으로 분리한다.

## 8.5.2 Cloudflare Tunnel을 이용한 셀프 호스팅

**Cloudflare Tunnel**(이전 명칭 Argo Tunnel)은 공인 IP나 포트포워딩 없이 로컬 머신·홈 서버를 인터넷에 안전하게 노출시킨다. 클라우드 비용 없이 macMini·Raspberry Pi에서 24/7 운영이 가능하다.

### 작동 원리

```
[로컬 서버 :3000]
   │
   │ outbound only (TCP 7844)
   ▼
[cloudflared 데몬] ───► [Cloudflare Edge] ───► [브라우저 https://app.example.com]
                          (자동 SSL, DDoS 방어)
```

**Inbound 포트를 열지 않는다**. cloudflared가 outbound로 Cloudflare에 연결을 유지하고, 들어오는 요청을 그 터널로 역방향 전달한다.

### 설치와 인증

```bash
# macOS
brew install cloudflared

# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/

# Cloudflare 계정 인증 (브라우저 OAuth)
cloudflared tunnel login
```

### 터널 생성 + 라우팅

```bash
# 1) 터널 생성 (UUID 발급)
cloudflared tunnel create tika-home
# > Tunnel credentials written to /Users/me/.cloudflared/<UUID>.json

# 2) DNS 라우팅 자동 추가
cloudflared tunnel route dns tika-home app.example.com

# 3) 설정 파일
cat > ~/.cloudflared/config.yml <<EOF
tunnel: <UUID>
credentials-file: /Users/me/.cloudflared/<UUID>.json

ingress:
  - hostname: app.example.com
    service: http://localhost:3000
  - hostname: api.example.com
    service: http://localhost:8080
  - service: http_status:404      # catchall
EOF

# 4) 실행
cloudflared tunnel run tika-home
```

### 서비스 등록 (자동 시작)

```bash
# macOS launchd
sudo cloudflared service install
# Linux systemd
sudo cloudflared service install --legacy
sudo systemctl enable --now cloudflared
```

### 보안 강화 — Zero Trust Access

Tunnel만으로도 SSL은 자동이지만, **Cloudflare Zero Trust Access** 정책을 추가하면 노출된 엔드포인트에 인증을 강제할 수 있다.

```
Zero Trust 대시보드 → Access > Applications > Add
Application type: Self-hosted
Domain: app.example.com
Policy: Allow if email ends with @company.com
```

회사 직원만 접근, 또는 OTP·하드웨어 키 요구 등 IAM-급 정책을 셀프 호스팅 서버에 부착할 수 있다.

> 출처: [developers.cloudflare.com/cloudflare-one/connections/connect-networks](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks)

## 8.5.3 Cloudflare 인프라 활용 (Pages·Workers·R2)

Cloudflare는 Vercel 대안으로 **Pages**(정적 호스팅), **Workers**(엣지 함수), **R2**(S3 호환 오브젝트 스토리지)를 무료 한도로 제공한다.

### Pages — 정적 사이트 + Functions

```bash
# Wrangler CLI 설치
npm i -g wrangler
wrangler login

# 프로젝트 배포
wrangler pages deploy ./dist --project-name=tika-web
```

Git 연동 시 **GitHub push → 자동 빌드 → 글로벌 엣지 배포** 흐름이 Vercel과 동일하다. 무료 한도가 매우 관대하다(빌드 무제한, 대역폭 무제한).

### Workers — 엣지 함수

```typescript
// apps/worker/src/index.ts
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/health') return Response.json({ ok: true });
    if (url.pathname === '/upload' && req.method === 'POST') {
      return handleUpload(req, env);
    }
    return new Response('Not Found', { status: 404 });
  }
};
```

```toml
# apps/worker/wrangler.toml
name = "tika-r2-uploader"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "tika-images"

[vars]
PUBLIC_URL = "https://pub-YOUR_BUCKET_ID.r2.dev"
ALLOWED_ORIGINS = "https://tika.example.com,http://localhost:3000"
```

### R2 — S3 호환 객체 스토리지

```bash
# 버킷 생성
wrangler r2 bucket create tika-images

# Worker 배포
cd apps/worker
wrangler deploy
# > https://tika-r2-uploader.<account>.workers.dev
```

**R2 무료 티어 한도**

| 항목 | 한도 |
|---|---|
| 저장 | 10GB |
| 읽기 | 1,000만 요청/월 |
| 쓰기 | 100만 요청/월 |
| **아웃바운드(Egress)** | **무제한 (egress free)** |

R2의 가장 큰 장점은 **Egress 비용이 0**이라는 점이다. AWS S3는 GB당 $0.09 청구되지만 R2는 다운로드가 무료라 이미지·동영상 호스팅에 압도적으로 유리하다.

### Spring Boot에서 R2 연동 (S3 SDK)

R2는 S3 API와 호환되므로 AWS SDK v2를 그대로 쓴다. **단, 5가지 설정이 필수**다.

```java
@Bean
public S3Client r2S3Client(@Value("${app.r2.access-key-id}") String accessKeyId,
                           @Value("${app.r2.secret-access-key}") String secret,
                           @Value("${app.r2.endpoint}") String endpoint) {
    return S3Client.builder()
        .region(Region.of("auto"))                                       // 1) R2는 region 없음
        .endpointOverride(URI.create(endpoint))                          // 2) account 엔드포인트
        .credentialsProvider(StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKeyId, secret)))
        .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)  // 3) flexible-checksum 끄기
        .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
        .serviceConfiguration(S3Configuration.builder()
            .pathStyleAccessEnabled(true)                                // 4) path-style 강제
            .chunkedEncodingEnabled(false)                               // 5) aws-chunked 끄기
            .build())
        .build();
}
```

| 설정 | 빠뜨리면 |
|---|---|
| `region("auto")` | SigV4 scope 불일치 → `SignatureDoesNotMatch` |
| `endpointOverride` (account 엔드포인트) | 버킷이 URL에 들어가면 `NoSuchBucket` |
| `Checksum*.WHEN_REQUIRED` | SDK 2.30+ 기본값이 `STREAMING-UNSIGNED-PAYLOAD-TRAILER` 자동 삽입 → R2 거부 (가장 흔한 함정) |
| `pathStyleAccessEnabled(true)` | vhost-style은 R2 미지원 |
| `chunkedEncodingEnabled(false)` | aws-chunked 트레일러 일부 거부 |

### 업로드 키 규칙 + Content-Disposition 강제

```java
PutObjectRequest req = PutObjectRequest.builder()
    .bucket(bucket)
    .key("attachments/%d/%s/%s.%s".formatted(year, month, UUID.randomUUID(), ext))
    .contentType(file.getContentType())
    .contentLength(file.getSize())
    .contentDisposition(buildContentDisposition(file.getOriginalFilename()))  // attachment 강제
    .build();
```

`Content-Disposition: attachment`를 강제하면 SVG/HTML 업로드 시 브라우저가 **인라인 렌더링하지 못해 XSS를 막는다**. `stored_key`는 서버가 UUID로 생성하므로 클라이언트가 경로 순회로 다른 객체를 덮어쓸 수 없다.

> 출처: 본 강의 자료 — `R2_INTEGRATION_GUIDE_v1_0.md`, `IMAGE_UPLOAD_SETUP_v1_1.md`

---

# 8.6 회원 인증과 Resend 트랜잭셔널 메일

## 8.6.1 Google Cloud Platform을 이용한 OAuth 연동

Google OAuth 2.0은 **Google Cloud Console**에서 OAuth Client를 발급받아 사용한다.

### 사전 준비

1. [console.cloud.google.com](https://console.cloud.google.com) 로그인
2. 프로젝트 생성 → **APIs & Services > OAuth consent screen** 구성
   - User Type: External (개인 서비스) / Internal (Workspace)
   - 앱 이름, 지원 이메일, 승인된 도메인 입력
3. **Credentials > Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (개발)
     - `https://tika.example.com/api/auth/callback/google` (운영)
4. **Client ID / Client Secret** 발급 → 즉시 안전한 비밀 저장소에

### Spring Boot 통합 (Spring Security OAuth2 Client)

```yaml
# application.yml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope: profile, email
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
```

### 콜백 처리 — 사용자 매핑

```java
@Service
public class OAuth2UserService extends DefaultOAuth2UserService {
    @Override
    public OAuth2User loadUser(OAuth2UserRequest req) {
        OAuth2User user = super.loadUser(req);
        String email = user.getAttribute("email");
        Boolean verified = user.getAttribute("email_verified");
        if (!Boolean.TRUE.equals(verified)) {
            throw new OAuth2AuthenticationException("EMAIL_NOT_VERIFIED");
        }
        User dbUser = userRepository.findByEmail(email)
            .orElseGet(() -> registerNewUser(email, user));
        return new AuthenticatedUser(dbUser, user.getAttributes());
    }
}
```

> Google이 반환한 `email_verified=true`이면 **별도 인증 메일 없이 즉시 로그인**시킬 수 있다 — 이미 Google이 검증했기 때문.

### Next.js 통합 (NextAuth.js)

```typescript
// app/api/auth/[...nextauth]/route.ts
import GoogleProvider from "next-auth/providers/google";
import NextAuth from "next-auth";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      return profile?.email_verified === true;
    },
  },
});

export { handler as GET, handler as POST };
```

## 8.6.2 GitHub을 이용한 OAuth 연동

개발자 대상 서비스라면 GitHub OAuth가 친숙하다.

### OAuth App 등록

1. GitHub → **Settings > Developer settings > OAuth Apps > New OAuth App**
2. 입력 항목
   - Application name, Homepage URL
   - Authorization callback URL: `https://tika.example.com/api/auth/callback/github`
3. **Generate a new client secret** → 한 번만 노출됨

### Next.js 통합

```typescript
import GitHubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
});
```

### 이메일이 비공개인 경우

GitHub은 사용자가 이메일을 비공개로 설정한 경우 `profile.email`이 `null`로 들어온다. **`/user/emails` 엔드포인트**를 추가 호출해 primary 이메일을 가져온다.

```typescript
async function fetchPrimaryEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const emails: { email: string; primary: boolean; verified: boolean }[] = await res.json();
  return emails.find(e => e.primary && e.verified)?.email ?? null;
}
```

| 제공자 | 장점 | 주의점 |
|---|---|---|
| Google | 사용자 풀 가장 큼, `email_verified` 필드 신뢰 가능 | 외부 앱은 Google의 검증 절차 필요 |
| GitHub | 개발자 친화적, scope 세분화 | 이메일 비공개 케이스 추가 처리 |

## 8.6.3 Resend API 통합

**Resend**는 SMTP가 아닌 REST API 기반의 트랜잭셔널 메일 서비스다. 월 3,000건 무료, DKIM 자동 설정, 99.9% 가용성을 표방한다.

### 가입 + API 키 발급

1. [resend.com](https://resend.com) 가입 (월 3,000건 무료)
2. **API Keys** → 새 키 생성 → `re_xxxxxxxx...` 형태 복사 (Full Access 권장)
3. **한 번만 노출되므로 즉시 비밀 저장소에**

### Spring Boot RestClient 빈 등록

```java
@Configuration
public class RestClientConfig {
    @Bean
    public RestClient resendRestClient(@Value("${app.email.resend-api-key}") String apiKey) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        f.setReadTimeout((int) Duration.ofSeconds(10).toMillis());
        return RestClient.builder()
            .baseUrl("https://api.resend.com")
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .defaultHeader("Content-Type", "application/json")
            .requestFactory(f)
            .build();
    }
}
```

### 메일 발송 클라이언트

```java
@Service
public class ResendEmailClient {
    private final RestClient resendRestClient;
    private final String fromAddress;

    public void sendVerificationEmail(String to, String code, long expiryMinutes) {
        ResendEmailRequest req = new ResendEmailRequest(
            fromAddress,
            List.of(to),
            "[Tika] 이메일 인증 코드",
            buildHtml(code, expiryMinutes));
        try {
            resendRestClient.post().uri("/emails")
                .body(req).retrieve()
                .body(ResendEmailResponse.class);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    record ResendEmailRequest(String from, List<String> to, String subject, String html) {}
    record ResendEmailResponse(String id) {}
}
```

### 트랜잭션 외부 발송 — `AFTER_COMMIT` + `@Async`

메일 발송(네트워크 I/O)을 트랜잭션 안에서 하면 DB 커넥션을 수 초간 점유 → 풀 고갈 위험. **이벤트로 분리하고 커밋 후 비동기로 발송**한다.

```java
@Component
public class VerificationCodeEventListener {
    private final ResendEmailClient client;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onVerificationCodeGenerated(VerificationCodeGeneratedEvent event) {
        client.sendVerificationEmail(event.email(), event.code(), event.expiryMinutes());
    }
}
```

이 패턴이 보장하는 것

- 커밋된 데이터만 발송 (롤백된 회원 정보로 메일 안 감)
- DB 커넥션은 즉시 반환되고 메일 발송은 별도 스레드 풀에서 진행
- 메일 실패가 비즈니스 트랜잭션을 깨지 않음

## 8.6.4 React Email 템플릿

[React Email](https://react.email)은 React 컴포넌트로 메일 템플릿을 작성하고 정적 HTML로 렌더링한다. **JSX 컴포넌트 → `render()` → 인라인 CSS HTML**로 변환되어 모든 메일 클라이언트에서 깨지지 않는다.

### 설치

```bash
npm install @react-email/components @react-email/render
```

### 템플릿 작성

```tsx
// emails/verification.tsx
import { Body, Button, Container, Head, Html, Preview, Text } from '@react-email/components';

interface Props {
  code: string;
  expiryMinutes: number;
}

export default function VerificationEmail({ code, expiryMinutes }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Tika 이메일 인증 코드</Preview>
      <Body style={{ fontFamily: 'sans-serif', background: '#f9fafb' }}>
        <Container style={{ maxWidth: 480, margin: '0 auto', padding: 32 }}>
          <Text style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Tika</Text>
          <Text>이메일 인증 코드</Text>
          <Text style={{ fontSize: 36, letterSpacing: 8, color: '#2563eb' }}>{code}</Text>
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>
            이 코드는 {expiryMinutes}분 후 만료됩니다.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Resend로 직접 발송 (Node.js SDK)

```typescript
import { Resend } from 'resend';
import VerificationEmail from './emails/verification';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@tika.example.com',
  to: user.email,
  subject: '[Tika] 이메일 인증 코드',
  react: VerificationEmail({ code, expiryMinutes: 5 }),
});
```

### 미리 보기 개발 서버

```bash
npx react-email dev
# http://localhost:3000 에서 모든 템플릿을 라이브 프리뷰
```

| 메일 작성 방식 | 장점 | 단점 |
|---|---|---|
| HTML 문자열 | 가볍고 SDK 불필요 | 인라인 CSS 직접 관리, 가독성↓ |
| Thymeleaf/Handlebars | 백엔드 친화 | 메일 클라이언트 호환성 별도 검증 |
| **React Email** | **컴포넌트 재사용, 프리뷰 도구** | 빌드 단계 필요 |

## 8.6.5 발송 모니터링과 도메인 인증

### 도메인 인증 (운영 필수)

운영 발신을 하려면 **자기 도메인을 Resend에 등록하고 SPF/DKIM/DMARC**를 추가해야 한다. 그렇지 않으면 스팸함 직행이다.

| 레코드 | 값 | 역할 |
|---|---|---|
| **SPF** (TXT @) | `v=spf1 include:amazonses.com ~all` | 발신 서버 화이트리스트 |
| **DKIM** (TXT `resend._domainkey`) | Resend가 제공하는 공개키 | 메일 본문 서명 검증 |
| **DMARC** (TXT `_dmarc`) | `v=DMARC1; p=none; rua=mailto:dmarc@example.com` | 정책 + 보고서 수신 |

```
Resend 대시보드 → Domains → Add Domain → noreply.tika.example.com
DNS 레코드 3개 추가 → Verify DNS Records → ✅ 모두 확인
```

### DMARC 단계적 강화

```
1단계: p=none      → 보고서만 수집, 차단 없음 (1~2주)
2단계: p=quarantine → 미인증 메일 스팸함으로 (한 달)
3단계: p=reject    → 미인증 메일 즉시 거부
```

처음부터 `p=reject`를 쓰면 정상 메일까지 차단될 수 있으므로 단계적 적용이 정석이다.

### 발송 모니터링 — Resend Webhooks

```yaml
# Resend 대시보드 → Webhooks → Add Endpoint
URL: https://api.tika.example.com/webhooks/resend
Events: email.sent, email.delivered, email.bounced, email.complained
```

```java
@PostMapping("/webhooks/resend")
public ResponseEntity<Void> onResendEvent(@RequestBody ResendEvent event,
                                          @RequestHeader("svix-signature") String sig) {
    if (!verifySignature(sig, event)) return ResponseEntity.status(401).build();

    switch (event.type()) {
        case "email.bounced"   -> blockUser(event.data().to());      // 자동 차단
        case "email.complained"-> blockUser(event.data().to());      // 스팸 신고 = 차단
        case "email.delivered" -> log.info("delivered {}", event.data().email_id());
    }
    return ResponseEntity.ok().build();
}
```

### 발송 지표 KPI

| 지표 | 정상 범위 | 경보 |
|---|---|---|
| 도착률(Delivered Rate) | > 98% | < 95%면 도메인 평판 점검 |
| Bounce Rate | < 2% | > 5%면 이메일 검증 강화 |
| Complaint Rate | < 0.1% | > 0.3%면 발신 일시 중단 |
| Open Rate | 20~40% | 너무 높으면 봇 트래픽 의심 |

> Resend 무료 플랜의 한도(3,000건/월)는 개인 프로젝트·초기 SaaS에 충분하다. 대량 발송이 필요하면 SES·Postmark·Mailgun과 병행하거나 유료 플랜으로 전환.

---

## 마무리 — 배포는 운영의 시작

이 장에서 다룬 내용을 한 줄로 요약한다.

| 절 | 핵심 |
|---|---|
| 8.1 | 환경 분리는 *Git 브랜치 전략*과 짝을 이룰 때 의미가 있다 |
| 8.2 | `claude -p`는 CI/CD에 LLM을 끼워 넣는 가장 단순한 방법이다 |
| 8.3 | Vercel은 Next.js 풀스택을 단일 플랫폼에서 끝낸다 |
| 8.4 | 별도 백엔드가 필요하면 Railway가 가장 빠르다 |
| 8.5 | Cloudflare Tunnel + R2로 *공인 IP 없이* 셀프 호스팅이 가능하다 |
| 8.6 | OAuth + Resend + DKIM은 SaaS 기본 패키지다 |

배포는 개발의 끝이 아니라 운영의 시작이다. 서버·로그 모니터링으로 문제를 빠르게 발견하고, 실시간 알림으로 즉시 대응하며, 원클릭 롤백 계획을 항상 준비해두어야 한다.

---

## 참고 자료

- [vercel.com/docs](https://vercel.com/docs)
- [docs.railway.com](https://docs.railway.com)
- [developers.cloudflare.com/cloudflare-one/connections/connect-networks](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks)
- [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2)
- [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
- [resend.com/docs](https://resend.com/docs)
- [react.email](https://react.email)
- [next-auth.js.org](https://next-auth.js.org)
- [code.claude.com/docs/en/headless](https://code.claude.com/docs/en/headless)
- [code.claude.com/docs/en/dispatch](https://code.claude.com/docs/en/dispatch)
