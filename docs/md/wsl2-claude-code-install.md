# Windows에서 WSL2 + Claude Code 설치하기

> 대상: 개발자 / 목적: PPT 슬라이드 제작용 정리
> 결론 우선 → 단계별 명령 → PATH 설정 → 검증 → 출처

---

## 0. 한 줄 결론

**WSL2를 설치(PowerShell, 관리자)한 뒤, WSL(Ubuntu) 안에서 리눅스용 네이티브 설치 스크립트로 Claude Code를 깐다.** PATH는 **대개 자동 등록**되지만, `command not found`가 나면 `~/.bashrc`에 한 줄 추가하면 된다.

```bash
# (요약) PowerShell 관리자
wsl --install              # WSL2 + Ubuntu, 재부팅

# WSL(Ubuntu) 터미널 안에서
curl -fsSL https://claude.ai/install.sh | bash
claude --version
```

---

## 1. 사전 조건 (슬라이드 1장)

- **OS**: Windows 10 1809+ / Windows 11 (단순 `wsl --install`은 빌드 20262+ 필요)
- **하드웨어**: RAM 4GB+ (개발 시 8GB+ 권장), x64/ARM64, **CPU 가상화 활성화**
- **계정**: Claude Code는 **Pro / Max / Team / Enterprise / Console** 계정 필요 (무료 Claude.ai 플랜은 불가)
- **Node.js 불필요**: 네이티브 설치는 독립 실행 바이너리라 Node.js를 미리 깔 필요 없음 (npm 방식만 Node 18+ 필요)

> [스크린샷 영역] `winver` 실행 → Windows 버전/빌드 확인 화면

---

## 2. WSL2 설치 (PowerShell 관리자) — 슬라이드 2장

### 2-1. 설치

```powershell
wsl --install
```

- 기본으로 **WSL2 + Ubuntu**가 함께 설치되고 **WSL2가 기본 버전**으로 설정됨
- 완료 후 **재부팅 1회**
- 이미 설치돼 있다면 최신화: `wsl --update`

### 2-2. WSL2 적용 확인

```powershell
wsl -l -v                    # 설치된 배포판과 VERSION(2여야 함) 확인
wsl --set-default-version 2  # (혹시 1이면) 기본 버전을 2로
```

> [스크린샷 영역] `wsl -l -v` 출력에서 `Ubuntu  Running/Stopped  2` 확인

---

## 3. Ubuntu 초기 설정 & 진입 — 슬라이드 3장

- 재부팅 후 Ubuntu가 자동 실행 → **리눅스용 사용자명/비밀번호** 생성
  - Windows 계정과 **무관**, 이후 `sudo` 명령에 사용
- 이후 진입: **Windows Terminal → Ubuntu 탭** (Microsoft도 WSL은 Windows Terminal과 함께 쓰기를 권장)
- 패키지 최신화:

```bash
sudo apt update && sudo apt upgrade -y
```

> [스크린샷 영역] Windows Terminal에 Ubuntu 탭이 떠 있는 화면

---

## 4. WSL 안에서 Claude Code 설치 — 슬라이드 4장 (핵심)

```bash
# ⚠️ 반드시 WSL(Ubuntu) 터미널 안에서 실행. PowerShell/CMD ❌
curl -fsSL https://claude.ai/install.sh | bash
```

- 윈도우 네이티브용(`install.ps1`)과 **별개**. WSL은 독립 리눅스 환경이라 따로 설치해야 함
- 바이너리 설치 위치: **`~/.local/bin/claude`**
- WSL에서는 **Git for Windows 불필요**
- 네이티브 설치는 **백그라운드 자동 업데이트** 지원

> 참고: npm 방식(`npm install -g @anthropic-ai/claude-code`, Node 18+ 필요)도 가능하나 공식 권장은 네이티브 설치. **`sudo npm install -g`는 권한·보안 문제로 금지.**

---

## 5. PATH 설정 — 슬라이드 5장 (질문 포인트)

**결론: 대부분 자동으로 잡힌다. 안 잡힐 때만 한 줄 추가하면 된다.**

| 상황 | 결과 |
|------|------|
| 일반적인 경우 | Ubuntu 기본 `~/.profile`이 `~/.local/bin`을 PATH에 자동 추가 → **추가 설정 불필요** |
| 설치 직후 같은 세션 | PATH 미갱신으로 `command not found` 가능 → **터미널 재시작** 또는 `source ~/.bashrc` |
| 설치 로그에 경고 표시 | `⚠ ~/.local/bin is not in your PATH` → 아래처럼 수동 추가 |

### 수동 추가 (안 잡힐 때만)

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

> 참고: 설치 스크립트가 안내하는 `export PATH="~/.local/bin:$PATH"`는 큰따옴표 안의 `~`가 홈 디렉터리로 확장되지 않을 수 있으므로, **`$HOME` 형태가 더 안전**하다.

---

## 6. 인증 & 검증 — 슬라이드 6장

```bash
echo $PATH | tr ':' '\n' | grep '\.local/bin'   # PATH에 잡혔는지 확인
which claude                                     # 바이너리 위치 확인
claude --version                                 # 버전 확인
claude doctor                                    # 설치·설정 진단
claude                                            # 첫 실행 → 브라우저 로그인
```

- `claude` 첫 실행 시 브라우저 프롬프트로 로그인 (Pro/Max/Team/Enterprise/Console 계정)

> [스크린샷 영역] `claude doctor` 정상 출력 / 첫 로그인 브라우저 화면

---

## 7. 개발 팁 (슬라이드 7장 — 선택)

- **프로젝트 경로**: 코드는 `/mnt/c/...`(윈도우 마운트)가 아니라 **WSL 네이티브(`~/`)** 에 둘 것
  - 마운트 경로는 파일 I/O 브리지 오버헤드로 `pnpm install` 등이 현저히 느림
- **IDE 연동**: VS Code + WSL 확장 → `WSL: Open Folder in WSL` 후 통합 터미널에서 `claude`
- **샌드박싱**: WSL2만 지원 (WSL1 미지원)

---

## 전체 흐름 (슬라이드 표지/요약용)

[구체적인 내용을 담은 흐름도: PowerShell `wsl --install` → 재부팅 → Ubuntu 사용자 설정 → `apt upgrade` → `curl install.sh | bash` → (PATH 자동/수동) → `claude` 로그인 → 사용]

---