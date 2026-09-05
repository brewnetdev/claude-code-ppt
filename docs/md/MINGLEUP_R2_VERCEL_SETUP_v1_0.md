# mingleup.net — 이미지 업로드(R2) 연동 런북

> **버전:** 1.0.0
> **최종 수정:** 2026-08-29
> **대상:** 마크다운 에디터(MarkFlow 계열) 이미지 업로드 → Cloudflare R2
> **전제:** 도메인 `mingleup.net`(가비아 등록) · DNS/호스팅 **Vercel** · **네임서버 이전 없음**
>
> 일반 설정 절차는 `IMAGE_UPLOAD_SETUP_v1_1.md`가 정본이다. 이 문서는 그 절차를
> **DNS를 Cloudflare로 옮기지 않는 조건**에서 실행 가능한 형태로 구체화한 것이다.

---

## 0. 이 조건에서 무엇이 되고 무엇이 안 되는가

먼저 확정하고 갈 제약이 하나 있다.

**R2 커스텀 도메인(`img.mingleup.net`)과 Worker 커스텀 도메인(`upload.mingleup.net`)은
쓸 수 없다.** 둘 다 해당 호스트명이 **내 Cloudflare 계정의 존(zone)** 안에 있어야 하고,
Cloudflare가 DNS 레코드와 인증서를 직접 만들어 주는 구조이기 때문이다. 외부 DNS에서
CNAME만 걸어주는 방식은 지원하지 않는다.

우회로로 흔히 떠올리는 **"서브도메인만 Cloudflare 존으로 등록(subdomain setup)"은
Enterprise 전용**이다(부분 존/partial은 Business 이상). 무료 플랜에서는 경로가 없다.
Vercel DNS가 NS 레코드를 지원하니 위임 자체는 가능하지만, 받아 줄 Cloudflare 쪽이
무료 플랜에서 서브도메인 존을 만들어 주지 않는다.

### 그래서 남는 선택지

| 경로 | 업로드 | 이미지 URL | 캐시 | 비고 |
|---|---|---|---|---|
| **A. 최소 구성** | `*.workers.dev` | `pub-xxx.r2.dev/...` | 없음 | 원 가이드 그대로. 가장 빠름 |
| **B. Vercel 프록시 (권장)** | `*.workers.dev` | `mingleup.net/cdn/...` | Vercel 엣지 | 내 도메인 + 캐시 + 버킷 비공개 |

**A안**은 원 가이드 그대로다. 다만 `r2.dev`는 Cloudflare가 명시적으로 **프로덕션용이
아니라고 안내하는 개발용 엔드포인트**다. 요청 수·대역폭에 비공개 변동 한도가 있어
초과 시 `429`가 나고, 캐시·WAF·분석을 못 쓴다. 개인 도구 수준 트래픽이면 실사용에
문제는 없지만, 주소가 `pub-xxx.r2.dev`로 영구 노출된다.

**B안**은 읽기 경로만 Vercel로 돌린다. 이미지가 `https://mingleup.net/cdn/...`로 나가고,
Vercel 엣지 캐시가 앞단에서 받아 준다. 버킷을 완전히 비공개로 둘 수 있고, 이미지가
앱과 동일 출처라 표시 단계의 CORS 문제도 사라진다. 나중에 네임서버를 옮기면 이 계층만
걷어내면 된다.

> **Worker로 이미지를 서빙하는 방식(workers.dev에 GET 핸들러 추가)은 권하지 않는다.**
> `*.workers.dev` 도메인은 응답이 **엣지 캐시되지 않아서**, 이미지 조회 한 번마다
> Worker 요청(무료 10만/일)과 R2 읽기가 그대로 소모된다. 캐시를 받으려면 결국
> 내 존의 Route가 필요한데, 그건 다시 네임서버 이전 이야기가 된다.

아래는 **A안 → B안 순으로 쌓는 구성**이다. B안까지 갈 계획이면 Phase 1에서 개발용
URL을 켜지 말고 바로 Phase 4로 가면 된다.

---

## Phase 1. R2 버킷 생성

```bash
npx wrangler login
npx wrangler r2 bucket create mingleup-images
```

> 버킷 이름은 `wrangler.toml`의 `bucket_name`과 **정확히 일치**해야 한다. 기존 코드가
> `markflow-images`로 되어 있으면 둘 중 하나로 통일한다. 불일치 시 `bucket not found`.

### A안일 때만 — 개발용 공개 URL 활성화

1. Cloudflare 대시보드 → **R2 Object Storage** → `mingleup-images` → **Settings**
2. **Public Development URL** → **Enable** → 확인 문구 `allow` 입력
3. 표시된 `https://pub-<id>.r2.dev`를 복사 (Phase 2의 `PUBLIC_URL`에 사용)

**B안이면 이 단계를 건너뛴다.** 버킷을 비공개로 두는 게 B안의 이점이다.

---

## Phase 2. Worker 배포 (업로드 전용)

### 2.1 `apps/worker/wrangler.toml`

```toml
name = "mingleup-r2-uploader"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "mingleup-images"      # Phase 1과 동일해야 함

[vars]
# A안: R2 개발용 URL
PUBLIC_URL = "https://pub-YOUR_BUCKET_ID.r2.dev"
# B안: Vercel 프록시 경로 (Phase 4에서 만든다)
# PUBLIC_URL = "https://mingleup.net/cdn"

# 업로드를 허용할 출처만 열거. 기본값 "*"는 반드시 좁힌다
ALLOWED_ORIGINS = "https://mingleup.net,https://www.mingleup.net,http://localhost:3002"
```

`ALLOWED_ORIGINS`를 `*`로 두면 **누구나 내 버킷에 업로드할 수 있다.** 로컬 포트는 실제
dev 서버 포트에 맞춘다.

`PUBLIC_URL`은 Worker가 업로드 성공 후 돌려줄 URL의 앞부분이다. Worker가
`${PUBLIC_URL}/${key}` 형태로 조립하고 key가 `images/{timestamp}-{uuid}.{ext}`이므로,
B안에서 `https://mingleup.net/cdn`을 넣으면 최종 URL이
`https://mingleup.net/cdn/images/1712345678-uuid.png`가 된다.
**배포 전에 `apps/worker/src/index.ts`에서 실제 조립 방식을 한 번 확인할 것.**

### 2.2 배포

```bash
cd apps/worker
npx wrangler deploy
# → https://mingleup-r2-uploader.<account>.workers.dev
```

출력된 URL을 기록해 둔다. Phase 5의 환경변수 값이다.

### 2.3 확인

```bash
WORKER=https://mingleup-r2-uploader.<account>.workers.dev

curl -s $WORKER/health                       # {"ok":true}

# 허용 출처 — CORS 헤더가 나와야 정상
curl -si -X OPTIONS $WORKER/upload \
  -H "Origin: https://mingleup.net" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control

# 비허용 출처 — 헤더가 안 나와야 정상
curl -si -X OPTIONS $WORKER/upload \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control
```

---

## Phase 3. (A안) 여기서 끝 — 동작 확인

A안이면 Phase 4를 건너뛰고 Phase 5로 간다. 업로드된 이미지는
`https://pub-xxx.r2.dev/images/...`로 서빙된다.

```bash
# 1x1 PNG 업로드 스모크 테스트
printf '\x89PNG\r\n\x1a\n' > /tmp/t.png   # 실제로는 정상 PNG 파일 사용
curl -s -X POST $WORKER/upload -F "file=@/tmp/t.png" -H "Origin: https://mingleup.net"
# → {"success":true,"url":"https://pub-xxx.r2.dev/images/....png"}
# 반환된 URL을 브라우저에서 열어 표시 확인
```

---

## Phase 4. (B안) Vercel 프록시 라우트 — 이미지를 내 도메인으로

읽기 경로만 Vercel로 돌린다. 업로드는 Phase 2의 Worker 그대로다.

```
브라우저 ──FormData POST──▶ Worker(workers.dev) ──PUT──▶ R2 (비공개)
브라우저 ──GET /cdn/...───▶ Vercel 엣지 캐시 ──miss시 S3 API──▶ R2
```

### 4.1 R2 API 토큰 발급

1. Cloudflare 대시보드 → **R2** → **Manage R2 API Tokens** → **Create API token**
2. 권한 **Object Read only** (프록시는 읽기만 하면 된다)
3. 발급된 **Access Key ID / Secret Access Key**와 **Account ID**를 기록

### 4.2 의존성

```bash
cd apps/web
pnpm add @aws-sdk/client-s3
```

### 4.3 라우트 핸들러

```ts
// apps/web/app/cdn/[...path]/route.ts
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// 업로드 키 규칙(images/{timestamp}-{uuid}.{ext})만 허용 — 임의 경로 조회 차단
const KEY_RE = /^images\/[A-Za-z0-9._-]+$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const key = (await params).path.join('/');
  if (!KEY_RE.test(key)) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    );
    return new Response(obj.Body as ReadableStream, {
      headers: {
        'Content-Type': obj.ContentType ?? 'application/octet-stream',
        // 키에 timestamp+uuid가 들어가 내용이 바뀌지 않으므로 영구 캐시
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(obj.ETag ? { ETag: obj.ETag } : {}),
      },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}
```

`KEY_RE` 화이트리스트가 중요하다. 없으면 `/cdn/../../` 같은 요청으로 버킷의 다른
객체를 긁어갈 수 있다.

### 4.4 Worker의 `PUBLIC_URL` 교체 후 재배포

```toml
PUBLIC_URL = "https://mingleup.net/cdn"
```

```bash
cd apps/worker && npx wrangler deploy
```

### 4.5 개발용 URL 차단

B안이 동작하면 R2 → Settings에서 **Public Development URL을 Disable**한다. 켜둔 채
두면 `pub-xxx.r2.dev` 주소가 계속 살아 있어 프록시를 우회한 직접 접근이 가능하다.

---

## Phase 5. Vercel 환경변수 + 재배포

### 5.1 환경변수

Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables**

| Key | Value | 노출 | 환경 |
|---|---|---|---|
| `NEXT_PUBLIC_R2_WORKER_URL` | `https://mingleup-r2-uploader.<account>.workers.dev` | 브라우저 | Production · Preview · Development |
| `R2_ACCOUNT_ID` | Cloudflare 계정 ID | **서버 전용** | 〃 |
| `R2_ACCESS_KEY_ID` | R2 토큰 Access Key | **서버 전용** | 〃 |
| `R2_SECRET_ACCESS_KEY` | R2 토큰 Secret | **서버 전용** | 〃 |
| `R2_BUCKET` | `mingleup-images` | **서버 전용** | 〃 |

아래 네 개는 **절대 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.** 붙이는 순간 R2 자격증명이
클라이언트 번들에 그대로 박혀 공개된다. (A안이면 첫 줄 하나만 필요하다.)

### 5.2 재배포 — 빠뜨리면 반영되지 않는다

`NEXT_PUBLIC_*`는 **빌드 시점에 번들로 인라인**된다. 변수만 추가하고 재배포하지 않으면
기존 번들에 빈 값이 남아 앱이 계속 "Worker 미설정"으로 동작한다.

```bash
vercel --prod     # 또는 대시보드에서 Redeploy
```

### 5.3 Preview 배포 CORS

Vercel Preview는 배포마다 임의의 `*.vercel.app` 주소를 쓴다. Worker의 `ALLOWED_ORIGINS`는
정확한 문자열 매칭이라 프리뷰에서는 업로드가 CORS로 막힌다. 셋 중 하나를 택한다.

1. 프리뷰에서 업로드를 쓰지 않는다 (가장 단순)
2. 고정 프리뷰 도메인(예: `dev.mingleup.net`)을 Vercel에 붙이고 그 주소만 허용에 추가
3. Worker에서 `*.vercel.app` 접미사 매칭 — **타인의 vercel.app 프로젝트까지 열리므로 비권장**

---

## Phase 6. 앱에서 켜고 연결 테스트

1. `https://mingleup.net` → 워크스페이스 → **설정 → 이미지 저장소**(`/settings/storage`)
2. **이미지 업로드 토글 ON** — 기본값이 OFF라 켜지 않으면 에디터에서 업로드가 비활성이다
3. 환경변수가 잡혔으면 URL 입력란이 비활성화되고 **"환경 변수로 설정 완료됨"** 표시
   - 이 문구가 없으면 Phase 5.2 재배포가 안 된 것이다
4. **연결 테스트** — 1×1 투명 PNG(67 bytes)를 `/upload`로 POST해 200 + URL 반환 확인
5. 에디터에서 이미지 드래그/붙여넣기 → 마크다운에 삽입된 URL 확인
   - A안: `https://pub-xxx.r2.dev/images/...`
   - B안: `https://mingleup.net/cdn/images/...`

> URL 해석 우선순위는 **환경변수 > localStorage(`mf-cf-worker-url`)** 다. 과거 테스트로
> localStorage에 다른 값이 남아 있어도 환경변수가 이긴다. 반대로 환경변수를 지우면 옛
> localStorage 값이 되살아나므로, 정리하려면 브라우저에서 그 키를 직접 삭제한다.

---

## Phase 7. 점검 체크리스트

공통

- [ ] `curl $WORKER/health` → `{"ok":true}`
- [ ] `ALLOWED_ORIGINS`에 `*` 없음, 실제 출처만 열거
- [ ] 비허용 Origin의 preflight에 CORS 헤더가 **안** 나옴
- [ ] `wrangler.toml`의 `bucket_name` = 실제 버킷명
- [ ] Vercel 환경변수 등록 **후 재배포** 완료
- [ ] 설정 페이지에 "환경 변수로 설정 완료됨" 표시
- [ ] 에디터에서 실제 업로드 1건 성공, 브라우저에서 이미지 표시됨

B안 추가

- [ ] R2 API 토큰이 **Object Read only** 권한
- [ ] `R2_*` 환경변수에 `NEXT_PUBLIC_` 접두사가 **없음**
- [ ] `curl -I https://mingleup.net/cdn/images/<파일>` → 200 + `cache-control: ...immutable`
- [ ] 두 번째 요청에서 `x-vercel-cache: HIT`
- [ ] `curl -I https://mingleup.net/cdn/../etc` 류 → 404 (KEY_RE 차단)
- [ ] R2 **Public Development URL = Disabled**

---

## 자주 막히는 지점

| 증상 | 원인 | 조치 |
|---|---|---|
| 앱이 계속 "Worker 미설정" | `NEXT_PUBLIC_*`는 빌드 타임 주입인데 재배포 안 함 | Phase 5.2 |
| 업로드 시 CORS 오류 | `ALLOWED_ORIGINS`에 실제 출처 없음(프리뷰·포트 불일치 포함) | Phase 2.1 수정 후 재배포 |
| `bucket not found` | `wrangler.toml`의 `bucket_name` 불일치 | Phase 1과 일치시킴 |
| 업로드는 성공, 이미지 404 | `PUBLIC_URL`이 실제 서빙 경로와 불일치 | Worker의 URL 조립 방식 확인 후 `PUBLIC_URL` 교체·재배포 |
| B안에서 이미지 500 | R2 자격증명 미설정/오타, 또는 `runtime = 'edge'`로 둠 | 환경변수 확인, `runtime = 'nodejs'` 유지 |
| B안 캐시 미적용 | `Cache-Control` 헤더 누락 | 4.3의 헤더 확인, `x-vercel-cache`로 검증 |
| A안에서 간헐 429 | `r2.dev` 변동 한도 초과 | B안으로 전환 |
| Workers 1027 에러 | 무료 10만 요청/일 초과 | 이미지 서빙을 Worker로 하고 있지 않은지 확인 |

---

## 나중에 커스텀 도메인(`img.mingleup.net`)을 쓰고 싶어지면

선택지는 둘뿐이다.

1. **mingleup.net 네임서버를 Cloudflare로 이전** — 가비아는 등록기관으로 그대로 남고
   DNS 운영만 넘어간다. 이전 후 Vercel용 A/CNAME 레코드를 Cloudflare에 다시 만들되
   **프록시는 반드시 끈다(회색 구름)** — 켜면 Vercel 인증서 발급이 막혀 SSL 오류가 난다.
   AAAA 레코드도 지운다. 그 뒤 R2 Settings에서 커스텀 도메인을 붙이면 된다.
2. **이미지 전용 도메인을 따로 준비해 Cloudflare에 올린다** — mingleup.net은 건드리지
   않는다. 도메인 비용이 추가된다.

B안으로 구성해 뒀다면 이전 후 `PUBLIC_URL`만 새 커스텀 도메인으로 바꾸고 `/cdn` 라우트를
지우면 된다. 기존에 저장된 마크다운의 이미지 URL은 그대로 남으므로, 라우트를 지울
거라면 새 도메인으로 리다이렉트를 걸어 두거나 본문 URL을 일괄 치환해야 한다.

## 비용

R2 무료 티어는 저장 10GB, 읽기 1,000만/월, 쓰기 100만/월이며 **아웃바운드(Egress)가 무료**다.
Workers 무료 플랜은 **10만 요청/일**(UTC 자정 리셋, 초과 시 1027). 업로드만 Worker를
거치는 구성이면 이 한도는 사실상 문제가 되지 않는다. B안의 이미지 조회는 Vercel 대역폭을
쓰지만 엣지 캐시 히트는 R2·Worker를 건드리지 않는다.

---

## 참고

- 일반 설정 절차·화면 구성·에러 코드: `IMAGE_UPLOAD_SETUP_v1_1.md`
- S3 SDK 직접 연동(Spring Boot) 방식과 트러블슈팅 10종: `R2_INTEGRATION_GUIDE_v1_0.md`
- [Cloudflare — Public buckets (r2.dev 한도·커스텀 도메인)](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Cloudflare — Subdomain setup (Enterprise 전용)](https://developers.cloudflare.com/dns/zone-setups/subdomain-setup/)
- [Cloudflare — Workers 한도](https://developers.cloudflare.com/workers/platform/limits/)
- [Vercel — Should I use Cloudflare in front of Vercel?](https://vercel.com/kb/guide/cloudflare-with-vercel)
