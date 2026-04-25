# Vercel 배포 가이드

<!-- auto-generated -->

## 1. 개요

`claude-code-ppt`는 순수 정적 SPA(Single Page Application)입니다. 백엔드 서버, API 라우트, 데이터베이스, 환경변수가 전혀 없으며, 모든 상태는 브라우저의 `localStorage`(`claude-code-ppt:deck:v1` 키)에만 저장됩니다. 샘플 HTML/CSS는 빌드 시 Vite의 `?raw` import로 번들에 인라인되므로 런타임 자산 경로도 신경 쓸 필요가 없습니다. `npm run build`로 생성된 `dist/` 디렉터리를 정적 호스팅에 올리는 것이 배포의 전부입니다.

---

## 2. 사전 준비

배포 전에 아래 세 가지를 먼저 확인합니다.

1. **Vercel 계정** — [vercel.com](https://vercel.com)에서 무료 계정을 생성합니다. GitHub 계정으로 OAuth 로그인을 권장합니다.

2. **GitHub 저장소에 push** — 현재 작업 브랜치(`main`)가 원격 저장소에 push되어 있어야 합니다.
   ```bash
   git push origin main
   ```

3. **로컬 빌드 검증** — Vercel에 배포하기 전에 로컬에서 빌드가 클린하게 통과하는지 확인합니다.
   ```bash
   npm run typecheck   # TypeScript 타입 검사
   npm run build       # tsc -b && vite build → dist/ 생성
   npm run preview     # dist/ 결과물을 로컬에서 확인
   ```
   `npm run build` 스크립트는 내부적으로 `tsc -b && vite build`를 실행합니다. TypeScript 오류가 있으면 빌드가 실패하므로 반드시 로컬에서 먼저 해결합니다.

---

## 3. 방법 1: Vercel Dashboard 연결 (권장)

GitHub 저장소와 연결하면 이후 push마다 자동으로 배포됩니다.

### 3-1. 연결 절차

1. [vercel.com/new](https://vercel.com/new)로 이동합니다.
2. **Import Git Repository** 에서 `claude-code-ppt` 저장소를 선택합니다.
3. 아래 표의 설정값을 확인합니다. Vercel이 Vite 프레임워크를 자동 감지하므로 대부분 이미 채워져 있습니다.

| 항목 | 값 |
|------|----|
| Framework Preset | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Environment Variables | (없음) |

4. **Deploy** 버튼을 클릭합니다.

### 3-2. 브랜치별 동작

| 브랜치 | 배포 환경 |
|--------|-----------|
| `main` push | **Production** 배포 (`*.vercel.app` 도메인 갱신) |
| 그 외 브랜치 / PR | **Preview** 배포 (임시 URL 발급, PR 댓글에 자동 링크) |

---

## 4. 방법 2: Vercel CLI 직접 배포

터미널에서 즉시 배포해야 하는 경우 CLI를 사용합니다.

### 4-1. CLI 설치 및 로그인

```bash
npm i -g vercel
vercel login
```

`vercel login`은 이메일 또는 GitHub OAuth 방식을 선택할 수 있습니다.

### 4-2. 배포 실행

프로젝트 루트(`claude-code-ppt/`)에서 실행합니다.

```bash
# Preview 배포 (기본)
vercel

# Production 배포
vercel --prod
```

### 4-3. 첫 실행 시 대화형 질문 답변 가이드

```
? Set up and deploy "~/claude-code-ppt"?     → Y
? Which scope do you want to deploy to?       → (본인 계정 선택)
? Link to existing project?                   → N  (첫 배포 시)
? What's your project's name?                 → claude-code-ppt
? In which directory is your code located?    → ./  (기본값, Enter)
? Want to modify these settings?              → N
```

이후 동일 디렉터리에서 `vercel` 또는 `vercel --prod`를 실행하면 질문 없이 즉시 배포됩니다.

---

## 5. 선택: `vercel.json` 추가

Vercel은 `vite.config.ts`를 감지해 별도 설정 없이도 정상 동작합니다. 그러나 명시적 설정을 원하거나 팀 프로젝트에서 설정을 고정하려면 프로젝트 루트에 `vercel.json`을 추가할 수 있습니다.

> **현재 프로젝트에서 `vercel.json`은 필수가 아닙니다.** 아래는 참고용 예시입니다.

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`rewrites` 항목은 SPA에서 직접 URL 접근 시 발생하는 404를 방지하는 catch-all rewrite입니다. 현재 `claude-code-ppt`는 클라이언트 사이드 라우팅을 사용하지 않고 `/`에 단일 페이지로 마운트되므로 이 설정은 **필수가 아닙니다**. 향후 React Router 등을 도입하면 추가합니다.

---

## 6. 체크리스트 — 배포 직전 확인

배포 전 아래 항목을 순서대로 확인합니다.

- [ ] `npm run typecheck` — 타입 오류 없이 통과
- [ ] `npm run build` — `dist/` 생성 완료, 빌드 로그에 오류 없음
- [ ] `npm run preview` — 로컬에서 `dist/` 결과물 동작 확인 (슬라이드 렌더링, 편집 기능)
- [ ] `dist/assets/*.js` 번들 크기 확인 — 샘플 HTML(`docs/html/` 하위)이 `?raw`로 번들에 인라인되므로 JS 번들이 비교적 큽니다. 빌드 완료 후 출력되는 번들 크기를 확인하고 예상치를 벗어나면 Vite 빌드 리포트로 분석합니다.
- [ ] `localStorage` 키 충돌 없음 — 저장 키는 `claude-code-ppt:deck:v1`로 고정되어 있으며, 동일 도메인에 다른 앱을 배포하지 않는 한 충돌하지 않습니다.

---

## 7. 알려진 주의 사항

### 번들 크기

`docs/html/` 하위의 샘플 HTML 파일(presentation, manual, portfolio, report 계열)이 `?raw` import로 번들에 직접 인라인됩니다. 이로 인해 `dist/assets/*.js`가 일반 React SPA보다 클 수 있습니다. Vercel free tier의 정적 파일 크기 한도(100 MB/파일)와는 무관하며, 서버리스 함수가 없는 순수 정적 배포이므로 함수 크기 한도도 해당 없습니다.

번들 크기가 예상보다 클 경우 빌드 후 출력에서 각 청크 크기를 확인하거나, 아래 명령으로 상세 리포트를 확인합니다.

```bash
npx vite-bundle-visualizer
```

### Source Maps

`vite.config.ts`에 별도 설정이 없으므로 production 빌드에서 source map은 기본적으로 생성되지 않습니다. 배포된 앱을 디버깅해야 할 때는 로컬에서 임시로 활성화합니다.

```bash
# 로컬 디버깅 전용 — dist/ 결과물에 source map 포함
npx vite build --sourcemap
```

이 결과물을 Vercel에 올리면 source map 파일도 함께 공개됩니다. 운영 배포에는 권장하지 않습니다.

### 웹폰트

샘플 CSS(`src/canvas/themes/brewnet-dark.css` 등)에서 JetBrains Mono, Pretendard, Noto Sans KR 등의 폰트가 참조될 수 있습니다. Google Fonts CDN을 통해 로드되는 경우 별도 조치가 필요 없습니다. 로컬 폰트 파일을 `public/` 또는 `src/` 아래에 두고 참조하는 경우에는 `dist/`에 포함 여부를 `npm run preview`로 확인합니다.

### Playwright E2E

`npm run e2e` (Playwright)는 배포 산출물이 아니라 로컬 개발 검증용입니다. CI 파이프라인에서 E2E를 실행하려면 별도 GitHub Actions 워크플로우를 구성해야 하며, 이는 현재 배포 범위에 포함되지 않습니다.

---

## 8. 커스텀 도메인 / Preview 배포 / 환경변수

### 커스텀 도메인

Vercel Dashboard → 프로젝트 → **Settings > Domains**에서 보유한 도메인을 추가합니다. DNS 공급자에서 Vercel이 안내하는 CNAME 또는 A 레코드를 등록하면 자동으로 TLS 인증서가 발급됩니다.

### Preview 배포

`main` 이외의 브랜치를 push하거나 PR을 열면 Vercel이 자동으로 임시 URL(`*.vercel.app`)의 Preview 배포를 생성합니다. 별도 설정 없이 Dashboard에서 URL을 확인하거나, GitHub PR 댓글에서 링크를 클릭할 수 있습니다.

### 환경변수

현재 `claude-code-ppt`는 환경변수를 사용하지 않습니다. 향후 외부 API 키나 기능 플래그가 필요해지면 `VITE_` prefix를 붙여 선언합니다(`VITE_API_KEY` 등). `VITE_` prefix가 있는 변수만 Vite 빌드 시 클라이언트 번들에 노출됩니다. Vercel Dashboard → **Settings > Environment Variables**에서 Production / Preview / Development 환경별로 구분하여 등록합니다.

---

## 9. 롤백 / 트러블슈팅 — 빌드 실패 패턴

### 롤백

Vercel Dashboard → 프로젝트 → **Deployments** 탭에서 이전 배포를 선택한 뒤 **Redeploy**를 클릭하면 즉시 해당 버전으로 롤백됩니다.

### 빌드 실패 패턴

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| `tsc` 오류로 빌드 실패 | TypeScript 타입 오류 | `npm run typecheck`로 로컬 재현 후 수정 |
| `?raw` import 오류 | `vite-env.d.ts` 참조 누락 | `tsconfig.app.json`의 `include`에 `src`가 포함되어 있는지 확인; `src/vite-env.d.ts`가 존재하는지 확인 |
| 직접 URL 접근 시 404 | 클라이언트 라우팅 미처리 | `vercel.json`에 catch-all rewrite 추가 (5절 참조) |
| 배포 성공이지만 앱 화면이 빈 화면 | JS 번들 로드 실패 (CSP, 경로 문제) | 브라우저 콘솔 확인; `npm run preview`로 로컬에서 동일 현상 재현 |
| 폰트/이미지가 안 보임 | `public/` 경로 참조 오류 | `vite build` 후 `dist/` 구조에서 해당 파일 존재 여부 확인 |

---

## 10. 다음 액션

프로젝트 루트에서 아래 명령 하나로 첫 배포를 시작합니다.

```bash
vercel
```

배포가 완료되면 터미널에 `*.vercel.app` 형식의 URL이 출력됩니다. 이 URL을 GitHub 저장소의 **About** 설명(우측 상단 톱니바퀴 → Website)과 프로젝트 `README.md`에 추가해 두면 팀원이 항상 최신 배포 주소를 확인할 수 있습니다.
