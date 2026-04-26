 npm 배포 셋업 가이드

  ---
  Step 1. npm 계정 만들기

  1. npmjs.com → Sign Up
  2. 이메일 인증 완료

  ---
  Step 2. npm org @brewnet 생성

  1. npmjs.com 로그인 후 우측 상단 프로필 → Add Organization
  2. Organization name: brewnet 입력
  3. Free 플랜 선택 (public 패키지는 무료)
  4. Create → @brewnet org 생성 완료

  ▎ @brewnet/cli 처럼 스코프 패키지를 퍼블리시하려면 org가 반드시 있어야 합니다.

  ---
  Step 3. NPM_TOKEN 발급

  1. npmjs.com → 프로필 → Access Tokens
  2. Generate New Token → Granular Access Token 선택
  3. 설정:
    - Token name: brewnet-github-actions
    - Expiration: 원하는 기간 (또는 No expiration)
    - Packages and scopes: @brewnet org → Read and write
  4. Generate Token → 토큰 값 복사 (한 번만 보임)

  ---
  Step 4. GitHub Secrets에 NPM_TOKEN 등록

  1. GitHub → claude-code-expert/brewnet 리포 → Settings
  2. 좌측 Secrets and variables → Actions
  3. New repository secret
    - Name: NPM_TOKEN
    - Secret: Step 3에서 복사한 토큰 붙여넣기
  4. Add secret

  ---
  Step 5. package.json 버전 확인 후 태그 push

  # 현재 버전 확인
  cat packages/cli/package.json | grep version

  # 원하는 버전으로 올리기 (예: 0.1.0)
  # packages/cli/package.json의 version 필드를 직접 수정

  # 커밋 + 태그
  git add packages/cli/package.json
  git commit -m "chore: bump @brewnet/cli to v0.1.0"
  git push origin main

  # 태그 생성 및 push → 이 순간 GitHub Actions 트리거
  git tag v0.1.0
  git push origin v0.1.0

  ---
  Step 6. 배포 확인

  GitHub → Actions 탭 → Publish to npm 워크플로 → 초록불 확인

  # npm에서 설치 가능한지 검증
  npm install -g @brewnet/cli
  brewnet --version

  ---
  이후 버전 업 방법

  # packages/cli/package.json version 수정 후
  git tag v0.1.1
  git push origin v0.1.1

  태그만 push하면 자동 배포됩니다.


  <div class="hero-links"><a href="https://brewnet.dev" class="hero-domain" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>brewnet.dev</a><a href="https://github.com/claude-code-expert/brewnet" class="hero-github" target="_blank" rel="noopener"><svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>https://github.com/claude-code-expert/brewnet</a></div>