# LEVEL 6 — 스크린샷 촬영 체크리스트

덱(`docs/html/report/claude-code-level7-chapter7.html`)에 **촬영 지시 카드**로 자리를 잡아둔 화면 목록이다.
모두 로그인이 필요한 콘솔이라 자동 캡처가 불가능하다 — 아래 경로대로 직접 촬영해 지정 경로에 저장하면 된다.

## 촬영 규칙

- 브라우저 창 폭 **1400px 이상**, 배율 100%. 촬영 후 상단 탭바·주소창·북마크바는 잘라낸다.
- **연결 문자열·API 키·토큰 값·개인 이메일·전화번호는 반드시 마스킹**한다(회색 박스 + `*** masked ***`).
- 저장 형식 PNG, 가로 **1180px** 로 리샘플. 파일명은 아래 표의 경로를 그대로 쓴다.
- 촬영 후 덱의 해당 슬라이드에서 `SCREENSHOT — 강사 직접 촬영` 점선 카드를 이미지 블록으로 교체한다.

## 목록 (11컷)

| 페이지 | 슬라이드 | 접속 | 클릭 경로 | 캡처 영역 | 저장 경로 |
|---|---|---|---|---|---|
| 13 | 커밋 전에 잡고, 올라가도 막는다 | https://github.com/<org>/markflow/settings/security_analysis | Settings → Advanced Security → Secret Protection / Push protection 활성화 후, 더미 토큰을 커밋해 push | push가 거부되며 터미널에 차단 메시지가 출력된 상태 | `docs/images/level6/screens/gh-push-protection.png` |
| 16 | 테스트가 통과해야 배포되게 막는다 | https://vercel.com/<team>/markflow/settings/build-and-deployment | Settings → Build and Deployment → Deployment Checks → Add Checks | 연결할 GitHub Actions 체크 이름이 목록에 뜬 상태 | `docs/images/level6/screens/vercel-deployment-checks.png` |
| 25 | 버킷 만들고 자격증명 발급하기 | https://dash.cloudflare.com | Storage & databases → R2 object storage → Overview → 우측 Account Details의 API Tokens 옆 Manage → Create API Token | 권한 4단계 라디오와 버킷 범위 지정이 함께 보이는 상태 | `docs/images/level6/screens/r2-api-token.png` |
| 29 | 구글 클라우드 콘솔이 바뀌었다 — Google Auth Platform | https://console.cloud.google.com/auth/overview | 프로젝트 선택 → 좌측 Google Auth Platform | Overview·Branding·Audience·Clients·Data Access 5개 탭이 모두 보이는 상태 | `docs/images/level6/screens/gcp-auth-platform-tabs.png` |
| 30 | OAuth 클라이언트 만들기 — redirect URI가 전부다 | https://console.cloud.google.com/auth/clients | Clients → CREATE CLIENT → Web application | Authorized redirect URIs 입력이 채워진 상태와 발급된 Client ID | `docs/images/level6/screens/gcp-oauth-client.png` |
| 33 | Resend에 도메인 등록하고 DNS 4레코드 넣기 | https://resend.com/domains | Domains → Add Domain → 도메인 입력 → Region 선택 → Add | 추가해야 할 DNS 레코드 4행 표가 보이는 상태 | `docs/images/level6/screens/resend-dns-records.png` |
| 34 | 검증하고, 실제로 도착하는지 확인한다 | Gmail 받은편지함 | 수신한 인증 메일 → 점 3개 메뉴 → 원본 보기 | SPF·DKIM·DMARC 가 모두 PASS 로 표시된 화면 | `docs/images/level6/screens/gmail-auth-pass.png` |
| 41 | 네이버 서치어드바이저에 사이트 등록하기 | https://searchadvisor.naver.com | 웹마스터 도구 → 사이트 등록 → markflow 도메인 입력 | 등록 직후 소유확인 방법 선택 화면 | `docs/images/level6/screens/naver-site-register.png` |
| 45 | 소유확인하고 사이트맵을 제출한다 | https://search.google.com/search-console | 속성 추가 → URL 접두어 → HTML 태그 인증 → 사이트맵 → 새 사이트맵 추가 | 사이트맵 상태가 '성공'으로 바뀌고 발견된 URL 수가 표시된 상태 | `docs/images/level6/screens/gsc-sitemap.png` |
| 50 | 도메인을 Cloudflare로 가져오기 | https://dash.cloudflare.com | Domains → Add a site / Onboard a domain → 도메인 입력 → 네임서버 안내 화면 | 배정된 Cloudflare 네임서버 2개가 보이는 화면 | `docs/images/level6/screens/cf-onboard-nameservers.png` |
| 51 | 회색 구름과 주황 구름 — Vercel 앞에서는 반드시 회색 | https://dash.cloudflare.com | 해당 도메인 → DNS → Records | Vercel용 레코드는 회색 구름(DNS only), R2 cdn 레코드는 주황 구름(Proxied)으로 나란히 보이는 상태 | `docs/images/level6/screens/cf-dns-proxy-status.png` |

## 촬영 시 주의

- **13 커밋 전에 잡고, 올라가도 막는다** — GitHub 메뉴가 옛 "Code security and analysis"에서 "Advanced Security"로 이동했다 — 실제 화면에서 위치 확인
- **16 테스트가 통과해야 배포되게 막는다** — 체크 이름은 워크플로가 최소 1회 실행된 뒤에야 목록에 나타난다
- **25 버킷 만들고 자격증명 발급하기** — 사이드바 최상위에 R2가 단독으로 있던 옛 경로와 다르다
- **41 네이버 서치어드바이저에 사이트 등록하기** — 2025~2026 UI 개편 공식 발표는 확인되지 않았다 — 실제 화면 기준으로 캡처

## 이미 확보된 화면 (재촬영 불필요)

`docs/images/level6/screens/fig7-*.png` 는 책 원고에서 추출한 저자의 실제 콘솔 캡처다.
Vercel 가입·저장소 연결·Neon 프로비저닝·환경변수·첫 배포 실패/재배포·도메인 연결·Railway 는 이미 들어가 있다.

### 확보했지만 아직 덱에 넣지 않은 화면 (11장)

필요하면 바로 끌어다 쓸 수 있다. 원본은 `docs/resource/인프런섹션7-배포와셀프호스팅.docx` 의 임베드 이미지에서 추출했다.

| 파일 | 화면 |
|---|---|
| `screens/fig7-05.png` | Vercel 대시보드 — Import Git Repository / Clone Template |
| `screens/fig7-06.png` | GitHub — Vercel 앱 설치 권한(Only select repositories) |
| `screens/fig7-16.png` | Settings → Environment Variables 목록 + Add |
| `screens/fig7-18.png` | 터미널 — db:migrate 성공 출력 |
| `screens/fig7-19.png` | 터미널 — db:seed 출력 |
| `screens/fig7-21.png` | Neon 콘솔 Tables — 시드 데이터 |
| `screens/fig7-25.png` | New Project — Deploy 직전 설정 |
| `screens/fig7-27.png` | 첫 배포 실패 로그(전체 화면) |
| `screens/fig7-28.png` | Deployment Details — Build Failed + Redeploy |
| `screens/fig7-51.png` | 가비아 도메인 관리 — 네임서버 행 |
| `screens/fig7-53.png` | Vercel Domains — Third Party 도메인 Active |
