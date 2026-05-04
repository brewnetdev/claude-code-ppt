# Vercel 배포 가이드 — 로컬 저자 / 원격 뷰어 모델

## 1. 운영 모델

`claude-code-ppt`는 두 환경이 분리된 정적 SPA입니다.

| 환경 | 어디서 동작 | 무엇을 할 수 있는가 |
|---|---|---|
| **로컬 (저자)** | 본인 컴퓨터의 `npm run dev` | Claude Code skill로 MD → SlidePlan → HTML 변환, `slideplan publish`로 새 데크를 `docs/html/<template>/`에 추가, 라이브러리에서 모든 데크 편집 |
| **Vercel (뷰어)** | `*.vercel.app` 또는 커스텀 도메인 | git 푸시 시점의 데크들을 라이브러리에 노출. 방문자는 자기 브라우저 `localStorage`에 한정해 편집·내보내기 가능 |

**핵심 원칙**:
- 새 데크 생성·게시는 **항상 로컬**에서 한다 (`md-to-slidedeck` 스킬은 Claude Code CLI 의존이므로 서버에서 실행 불가).
- Vercel은 빌드 결과물 호스팅 전용. 백엔드, DB, API 라우트, 환경변수 모두 없음.
- 방문자의 편집은 **로컬 브라우저 `localStorage`에만** 저장된다. 서버나 다른 사용자에게 전파되지 않는다.

---

## 2. 데크 추가 → 배포 워크플로우

### 2-1. 로컬에서 데크 생성

```bash
# (a) MD 원고 → SlidePlan → HTML 통째로 publish
node_modules/.bin/tsx scripts/slideplan.ts publish .tmp/slideplan-foo.json my-deck-id --subtitle "데크 부제"

# 또는 (b) Claude Code 스킬로 자동 변환 후 publish
# (md-to-slidedeck 스킬이 위 publish 명령까지 자동 실행)
```

`publish`는 `docs/html/<template>/<deck-id>.html`을 작성합니다. registry는 `import.meta.glob`로 빌드 타임에 자동 발견하므로 `src/library/deckRegistry.ts`를 손댈 필요는 없습니다.

### 2-2. 로컬 빌드 검증

```bash
npm run typecheck
npx vitest run        # tests/library/builtinDecks.test.ts가 신규 데크 회귀 가드
npm run build
npm run preview       # 5176 등 임의 포트 → 라이브러리 카드에 신규 데크 노출 확인
```

### 2-3. git 푸시 → Vercel 자동 빌드

```bash
git add docs/html/<template>/<deck-id>.html
git commit -m "feat(deck): add <deck-id>"
git push origin main   # 또는 develop, 브랜치별 동작은 §4 참조
```

Vercel Dashboard에서 자동 트리거된 빌드가 PASS하면 배포 완료. 새 데크가 즉시 라이브러리에 노출됩니다.

---

## 3. Vercel 초기 연결 (1회성)

### 3-1. Dashboard 연결 (권장)

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → `claude-code-ppt`
2. Vite preset 자동 감지. 아래 표 값과 일치하는지만 확인:

| 항목 | 값 | 비고 |
|---|---|---|
| Framework Preset | `Vite` | 자동 감지 |
| Build Command | `npm run build` | `tsc -b && vite build` |
| Output Directory | `dist` | 기본값 |
| Install Command | `npm ci` | **lock 파일 sync 필수** |
| Node Version | `20` | `.github/workflows/ci.yml`과 동일하게 맞춤 |
| Environment Variables | (없음) | 사용 안 함 |

3. **Deploy** 클릭 → 첫 배포 URL 발급.

### 3-2. CLI 직접 배포 (대안)

```bash
npm i -g vercel
vercel login
cd claude-code-ppt
vercel --prod   # main 푸시 없이도 즉시 production 배포
```

CLI는 GitHub 연결 없이도 동작하지만, 자동 재배포가 안 되므로 일반 운영에는 §3-1 Dashboard 방식을 권장합니다.

---

## 4. 브랜치 정책

| 브랜치 | Vercel 동작 | 용도 |
|---|---|---|
| `main` push | **Production** 갱신 | 안정 배포 |
| `develop` push | **Preview** 임시 URL | 통합 검증 |
| feat/* 브랜치 또는 PR | **Preview** 임시 URL | PR 댓글에 자동 링크 |

`.github/workflows/ci.yml`이 push/PR마다 typecheck + vitest + build를 돌려 Vercel 빌드보다 먼저 실패를 잡습니다. CI가 실패하면 Vercel 빌드도 같은 이유로 실패하므로 **반드시 CI 그린 → 머지** 순서를 지킵니다.

---

## 5. 운영 한계와 대응

### 5-1. localStorage 한계 — 방문자 편집은 다른 기기로 이전 안 됨

| 문제 | 원인 | 대응 |
|---|---|---|
| 방문자가 편집한 내용이 다른 브라우저에서 안 보임 | `localStorage`는 브라우저·도메인 단위 격리 | 정상 동작. 협업 편집은 본 프로젝트 범위 밖 |
| 방문자가 편집을 영구 보존하고 싶어함 | 서버 저장소 없음 | Toolbar의 **Export HTML / PDF / PNG**로 결과물 다운로드 안내 |
| 캐시·시크릿 모드에서 편집 사라짐 | `localStorage` 비휘발성 보장 안 됨 | 동일. 영구 저장은 Export로 안내 |

### 5-2. Skill은 로컬 전용 — 배포된 사이트에선 새 데크 추가 불가

Vercel 배포본은 **읽기·편집만** 가능합니다. 새 데크 추가가 필요하면 항상 로컬로 돌아와 §2-1 → §2-3 사이클을 반복합니다. 이 제한을 풀려면 별도 백엔드(API + 영구 저장소)가 필요하며 본 프로젝트의 운영 모델을 벗어납니다.

### 5-3. 번들 크기

`docs/html/`의 모든 데크가 `?raw` import로 인라인되므로 `dist/assets/index-*.js`가 일반 SPA보다 큽니다. 현재 ~1.97 MB (gzip ~798 KB). Vercel free tier 정적 파일 한도(100 MB/파일)와는 무관하지만, 데크 수가 늘면 초기 로드 시간이 증가합니다. 임계점에 도달하면 `vite.config.ts`의 `manualChunks`로 데크별 분할을 검토합니다.

### 5-4. lock 파일 sync

`npm ci`(CI + Vercel)는 `package-lock.json`이 `package.json`과 strict-sync 상태일 때만 통과합니다. transitive peer-dep(예: `vitest@4` 내부 `vite@8`이 요구하는 `esbuild ^0.27/0.28`)가 lock에 빠지면 빌드 실패합니다. 의존성 변경 후에는:

```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
```

로 강제 재생성하고 검증한 뒤 푸시합니다. 자세한 증상은 §7 표 참조.

---

## 6. 선택: `vercel.json`

기본 자동 감지로 충분하지만, 설정을 명시 고정하려면:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci"
}
```

현재 클라이언트 라우팅을 쓰지 않으므로 `rewrites`는 불필요. React Router 도입 시점에 `[{ "source": "/(.*)", "destination": "/index.html" }]` 추가.

---

## 7. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `npm ci` "Missing: <pkg>@<ver> from lock file" | package.json↔lock 비동기 (peer-dep 미반영) | `rm -rf node_modules package-lock.json && npm install` 후 lock 커밋 |
| `tsc` 빌드 실패 | TypeScript 오류 | 로컬 `npm run typecheck` 재현 후 수정 |
| `?raw` import 미해석 | `src/vite-env.d.ts` 누락 또는 `tsconfig.app.json:include`에 `src` 빠짐 | 파일/설정 복원 |
| 배포 성공인데 빈 화면 | JS 번들 로드 실패 | DevTools Console + Network 탭 점검, `npm run preview`로 로컬 재현 |
| 폰트/이미지 누락 | `public/` 경로 참조 오류 | `dist/` 구조 직접 확인 |
| 라이브러리 카드에 새 데크 안 보임 | registry glob 패턴 불일치 | `docs/html/{presentation,portfolio,report}/<deck-id>.html` 위치 확인. `manual/` 등 다른 하위 경로는 의도적 제외 |

### 롤백

Vercel Dashboard → 프로젝트 → **Deployments** → 이전 배포 선택 → **Redeploy** = 즉시 롤백.

---

## 8. 첫 배포 체크리스트

배포 직전 순서대로 확인:

- [ ] `npm ci`가 통과하는지 — lock 파일 sync 확인 (`rm -rf node_modules && npm ci`)
- [ ] `npm run typecheck` PASS
- [ ] `npx vitest run` PASS — 빌트인 데크 회귀 14건 포함 70건 그린
- [ ] `npm run build` PASS — `dist/` 생성, 번들 크기 합리적
- [ ] `npm run preview` — 라이브러리에서 모든 데크 카드 클릭 → 슬라이드 ≥1개 노출 확인
- [ ] git push → CI 워크플로우 PASS
- [ ] Vercel Dashboard에서 빌드 PASS → 배포 URL에서 동일 검증 한 번 더

---

## 9. 향후 확장 후보 (현재 범위 외)

- **데크 export → 외부 호스팅**: Toolbar의 Export HTML로 단일 파일 데크를 만들어 GitHub Pages, Notion 등 다른 정적 호스팅에 개별 게시. 본 프로젝트 빌드 사이클과 분리.
- **백엔드 도입**: 방문자 편집을 서버에 저장하려면 Supabase / Firebase / 자체 API + 인증 필요. 현재 `localStorage`-only 모델을 벗어남.
- **Skill의 서버 측 실행**: Claude Code CLI 의존성을 서버 함수로 옮기려면 Anthropic API 직접 호출 + 가드레일 + 비용 통제가 필요. 별도 설계 작업.
