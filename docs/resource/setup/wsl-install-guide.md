# Windows에서 WSL 설치하기 — macOS와 동일한 터미널 환경 만들기

> 강의 노트 — Windows 사용자가 macOS와 똑같은 `ls`, `cd`, `git` 명령어 환경을 갖추는 방법
>
> 비개발자 기준 스텝바이스텝. 명령어 한 줄씩 따라하면 됩니다.

---

## 목차

1. [WSL이 뭔가요?](#1-wsl이-뭔가요)
2. [설치 전 확인 사항](#2-설치-전-확인-사항)
3. [WSL 설치 (3단계)](#3-wsl-설치-3단계)
4. [Ubuntu 첫 실행 설정](#4-ubuntu-첫-실행-설정)
5. [필수 도구 설치](#5-필수-도구-설치)
6. [Windows Terminal 꾸미기](#6-windows-terminal-꾸미기)
7. [Windows ↔ WSL 파일 주고받기](#7-windows--wsl-파일-주고받기)
8. [VS Code 연동](#8-vs-code-연동)
9. [자주 만나는 에러와 해결법](#9-자주-만나는-에러와-해결법)
10. [한 페이지 요약](#10-한-페이지-요약)

---

## 1. WSL이 뭔가요?

### 1.1 한 줄 설명

**Windows 안에서 진짜 리눅스(Linux)를 돌리는 기능**입니다.

> **약어**: WSL = **W**indows **S**ubsystem for **L**inux ("윈도우용 리눅스 하위 시스템")
> 현재 버전은 **WSL2**입니다. 가벼운 가상머신 위에서 진짜 Linux 커널을 돌립니다.

### 1.2 왜 WSL을 깔아야 하나요?

| 상황 | Windows 기본 (PowerShell/CMD) | WSL (Ubuntu) |
|------|------------------------------|--------------|
| `ls` 명령어 | ❌ 안 됨 (`dir` 써야 함) | ✅ 됨 |
| `cd ~` 홈으로 이동 | ❌ 안 됨 | ✅ 됨 |
| `cp -r`, `rm -rf` | ❌ 다른 명령어 | ✅ 됨 |
| 강사/책 예제 그대로 | ❌ 자주 안 맞음 | ✅ 그대로 |
| Docker, Node.js, Python 설치 | 복잡함 | `apt install`로 한 줄 |

**결론**: 강의 예제, 책의 명령어, 유튜브 튜토리얼 대부분이 macOS/Linux 기준입니다.
WSL을 깔면 **Windows 컴퓨터로도 그대로 따라할 수 있습니다**.

### 1.3 WSL을 깔면 컴퓨터가 어떻게 되나요?

- Windows는 그대로 잘 작동합니다 (없어지지 않음)
- Windows 시작 메뉴에 "Ubuntu"라는 앱이 새로 생깁니다
- 그걸 클릭하면 검은 터미널 창이 뜨고, 그 안은 완전한 Linux 환경
- Windows 파일과 Linux 파일은 서로 접근할 수 있음

비유: Windows라는 큰 집 안에 **Linux 방이 하나 생기는 것**입니다.

---

## 2. 설치 전 확인 사항

### 2.1 Windows 버전 확인

WSL2는 다음 조건을 만족해야 합니다:

- **Windows 11** (모든 버전)
- 또는 **Windows 10 버전 2004 이상** (빌드 19041 이상)

**확인 방법:**

1. `Windows 키 + R` 누르기
2. `winver` 입력 후 Enter
3. 표시되는 버전 확인

> 권장: Windows 11. Windows 10도 가능하지만 가급적 업데이트해서 사용하세요.

### 2.2 가상화(Virtualization) 활성화 확인

WSL2는 가상화 기능을 씁니다. BIOS에서 켜져 있어야 합니다.

**확인 방법:**

1. `Ctrl + Shift + Esc` → 작업 관리자 열기
2. **성능** 탭 → **CPU** 클릭
3. 오른쪽 아래 **"가상화: 사용"** 확인

```
✅ 사용 (Enabled) → 그대로 진행
❌ 사용 안 함 (Disabled) → BIOS에서 켜야 함
```

**가상화가 꺼져 있는 경우:**

1. 컴퓨터 재시작 → 부팅 시 `Del` 또는 `F2` 키 연타 (제조사마다 다름)
2. BIOS 진입 후 다음 항목 찾기:
   - Intel CPU: **VT-x** 또는 **Intel Virtualization Technology**
   - AMD CPU: **SVM** 또는 **AMD-V**
3. **Enabled**로 설정 → 저장 후 재부팅

> **강사 강조 포인트**
> 노트북에서 BIOS 들어가는 게 무섭다면, 일단 그냥 설치를 시도해보세요. 설치가 실패할 때 에러 메시지를 보고 BIOS 작업을 하면 됩니다.

### 2.3 관리자 권한 필요

설치 명령은 **관리자 권한**으로 실행해야 합니다. 곧 보여드립니다.

---

## 3. WSL 설치 (3단계)

### 3.1 [Step 1] PowerShell을 관리자로 열기

방법 A (권장):

1. 시작 메뉴에서 **"PowerShell"** 검색
2. 또는 **"터미널"** 검색 (Windows 11)
3. 검색 결과에서 **"관리자 권한으로 실행"** 클릭
4. UAC 창이 뜨면 **"예"**

방법 B:

1. `Win + X` 키
2. 메뉴에서 **"터미널(관리자)"** 또는 **"Windows PowerShell(관리자)"** 클릭

> **확인 포인트**: 창 제목에 **"관리자"**라는 글자가 보여야 합니다. 안 보이면 안 됩니다.

### 3.2 [Step 2] 설치 명령 한 줄 실행

PowerShell 창에서:

```powershell
wsl --install
```

이 한 줄이 자동으로 다음을 모두 처리합니다:

1. **Virtual Machine Platform** 기능 활성화
2. **Windows Subsystem for Linux** 기능 활성화
3. **WSL2 Linux 커널** 다운로드 및 설치
4. **WSL2를 기본 버전**으로 설정
5. **Ubuntu**(기본 배포판) 다운로드 및 설치

진행 화면 예시:

```
Installing: Virtual Machine Platform
Virtual Machine Platform has been installed.
Installing: Windows Subsystem for Linux
Windows Subsystem for Linux has been installed.
Installing: Ubuntu
Ubuntu has been installed.
The requested operation is successful. Changes will not be effective
until the system is rebooted.
```

### 3.3 [Step 3] 재부팅

설치가 끝나면 **반드시 컴퓨터를 재시작**해야 합니다.

```powershell
shutdown /r /t 0
```

또는 그냥 평소처럼 시작 → 다시 시작.

### 3.4 다른 배포판 설치하고 싶다면?

Ubuntu 말고 다른 Linux를 깔고 싶을 때 (선택 사항):

```powershell
# 설치 가능한 목록 보기
wsl --list --online

# 특정 배포판 설치
wsl --install -d Ubuntu-24.04
wsl --install -d Debian
wsl --install -d kali-linux
```

> **초보자 권장**: 그냥 기본 Ubuntu 쓰세요. 한국어 자료가 가장 많습니다.

---

## 4. Ubuntu 첫 실행 설정

### 4.1 Ubuntu 처음 열기

재부팅 후:

1. **시작 메뉴** → "Ubuntu" 검색 → 클릭
2. 또는 PowerShell에서 `wsl` 입력

처음 실행하면 검은 창이 뜨고 잠깐 기다리라는 메시지가 나옵니다.

```
Installing, this may take a few minutes...
Please create a default UNIX user account. The username does not
need to match your Windows username.
For more information visit: https://aka.ms/wslusers
Enter new UNIX username:
```

### 4.2 Linux 사용자 만들기

**username 입력:**

```
Enter new UNIX username: codevillain
```

규칙:
- 영문 소문자 + 숫자
- 공백 없음
- Windows 사용자 이름과 달라도 됩니다

**비밀번호 입력:**

```
New password:
Retype new password:
```

> **⚠️ 중요**
> 비밀번호 입력 시 **화면에 아무것도 안 보입니다** (`*` 표시도 안 됨).
> 이게 정상입니다. 그냥 타이핑하고 Enter 누르세요.
> 잊지 마세요 — 나중에 `sudo` 쓸 때마다 필요합니다.

### 4.3 첫 화면 확인

설정이 끝나면 이런 프롬프트가 보입니다:

```
Welcome to Ubuntu 24.04 LTS (GNU/Linux 5.15.x-microsoft-standard-WSL2 x86_64)

codevillain@DESKTOP-ABC123:~$
```

| 부분 | 의미 |
|------|------|
| `codevillain` | 방금 만든 Linux 사용자 이름 |
| `DESKTOP-ABC123` | Windows 컴퓨터 이름 |
| `~` | 현재 위치 (Linux 홈 폴더 = `/home/codevillain`) |
| `$` | 입력 대기 (프롬프트) |

이제부터 macOS와 똑같은 환경입니다. `ls`, `cd`, `pwd` 모두 됩니다.

### 4.4 동작 확인 (테스트)

```bash
$ pwd
/home/codevillain

$ ls
(처음엔 비어 있음)

$ echo "Hello, Linux on Windows!"
Hello, Linux on Windows!

$ uname -a
Linux DESKTOP-ABC123 5.15.x-microsoft-standard-WSL2 ...
```

축하합니다. **Windows 안에 진짜 Linux가 깔렸습니다.**

---

## 5. 필수 도구 설치

### 5.1 시스템 업데이트 (가장 먼저)

```bash
sudo apt update && sudo apt upgrade -y
```

해석:

| 부분 | 의미 |
|------|------|
| `sudo` | **S**uper**U**ser **DO** — 관리자 권한으로 |
| `apt` | **A**dvanced **P**ackage **T**ool — Ubuntu의 앱스토어 |
| `update` | 최신 패키지 목록 갱신 |
| `&&` | 앞 명령이 성공하면 다음 실행 |
| `upgrade` | 실제로 업그레이드 진행 |
| `-y` | "yes" — 묻는 질문에 다 yes |

> 처음 실행하면 비밀번호를 물어봅니다. 4.2에서 만든 비밀번호 입력.

### 5.2 Git 설치 확인

대부분 이미 깔려 있습니다. 확인:

```bash
$ git --version
git 2.43.0
```

안 깔려 있으면:

```bash
$ sudo apt install git -y
```

### 5.3 Git 초기 설정

```bash
git config --global user.name "Code Villain"
git config --global user.email "codevillain@example.com"
```

### 5.4 자주 쓰는 도구들 한 번에

```bash
sudo apt install -y \
  curl \
  wget \
  build-essential \
  unzip \
  tree \
  htop
```

| 도구 | 용도 |
|------|------|
| `curl` | URL에서 파일 받기 / API 호출 |
| `wget` | 웹 파일 다운로드 |
| `build-essential` | C 컴파일러 등 기본 빌드 도구 |
| `unzip` | 압축 해제 |
| `tree` | 폴더 구조 시각화 |
| `htop` | 프로세스 모니터 |

### 5.5 GitHub CLI (선택)

이전 강의에서 다룬 `gh` CLI도 깔 수 있습니다:

```bash
(type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) \
  && sudo mkdir -p -m 755 /etc/apt/keyrings \
  && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg \
     | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
  && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
     | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && sudo apt update \
  && sudo apt install gh -y
```

설치 확인:

```bash
$ gh --version
gh version 2.x.x ...

$ gh auth login
```

---

## 6. Windows Terminal 꾸미기

기본 Ubuntu 창은 못생겼습니다. **Windows Terminal**을 쓰면 macOS 터미널처럼 예뻐집니다.

### 6.1 Windows Terminal 설치

Windows 11에는 기본 설치되어 있습니다. Windows 10이면:

1. **Microsoft Store** 열기
2. **"Windows Terminal"** 검색 → 설치
3. 또는 PowerShell에서: `winget install Microsoft.WindowsTerminal`

### 6.2 Ubuntu를 기본 프로필로

1. Windows Terminal 실행
2. 위쪽 탭 옆 **`∨`** 화살표 클릭 → **설정**
3. 왼쪽 **시작** 메뉴 → **기본 프로필** → **Ubuntu** 선택
4. **저장**

이제 Windows Terminal을 열면 바로 Ubuntu가 뜹니다.

### 6.3 색 테마 바꾸기

설정 화면 → 왼쪽에서 **Ubuntu** 프로필 클릭 → **모양** 탭 → **색 구성표**:

추천:
- **One Half Dark** — 무난한 다크 테마
- **Solarized Dark** — 눈에 편함
- **Campbell Powershell** — 기본보다 보기 좋음

### 6.4 폰트 바꾸기 (선택)

기본 폰트는 한글이 어색합니다. 다음 폰트가 좋습니다:

1. **D2Coding** (한국 개발자 사랑) — https://github.com/naver/d2codingfont
2. **JetBrains Mono** — https://www.jetbrains.com/lp/mono/
3. **Cascadia Code** — Windows Terminal 기본 (영어만 사용 시)

다운로드 → 더블클릭 → 설치 → Windows Terminal 설정에서 **글꼴**에 이름 입력.

---

## 7. Windows ↔ WSL 파일 주고받기

### 7.1 WSL에서 Windows 파일 접근

Windows의 `C:\` 드라이브는 WSL 안에서 `/mnt/c/`로 접근합니다.

```bash
# Windows 바탕화면으로 이동
$ cd /mnt/c/Users/사용자이름/Desktop

# Windows의 다운로드 폴더 보기
$ ls /mnt/c/Users/사용자이름/Downloads

# Windows 파일을 Linux 홈으로 복사
$ cp /mnt/c/Users/사용자이름/Desktop/file.txt ~
```

| 약어 | 풀이 | 의미 |
|------|------|------|
| `/mnt/c/` | **M**ou**NT** + C드라이브 | "윈도우의 C 드라이브에 마운트(연결)됨" |
| `~` | (틸드) | 내 홈 폴더 = `/home/사용자이름` |

### 7.2 Windows에서 WSL 파일 접근

Windows 탐색기에서:

1. 탐색기 주소창에 입력: `\\wsl$` 또는 `\\wsl.localhost`
2. Enter 누르면 WSL 배포판 목록이 보임
3. **Ubuntu** 폴더 더블클릭
4. `home/사용자이름` 폴더로 이동

이제 평소처럼 마우스로 파일을 끌어다 놓을 수 있습니다.

### 7.3 현재 폴더를 Windows 탐색기로 열기

WSL 안에서:

```bash
$ explorer.exe .
```

`.` (현재 폴더)을 Windows 탐색기로 엽니다. **이거 진짜 자주 씁니다.**

### 7.4 ⚠️ 어디에 파일을 저장해야 할까?

**중요한 규칙**:

| 작업 | 권장 위치 | 이유 |
|------|----------|------|
| 개발 프로젝트 (코드) | `~` (Linux 홈) | 속도 빠름 |
| 일반 문서, 사진 | Windows 위치 (`/mnt/c/...`) | Windows에서도 쓰니까 |

> **이유**: WSL에서 `/mnt/c/`에 있는 파일은 속도가 매우 느립니다.
> 코드 같은 건 반드시 `~/projects` 같은 Linux 쪽에 두세요.

**좋은 폴더 구조 예시:**

```bash
$ mkdir -p ~/projects
$ cd ~/projects
$ git clone https://github.com/villainscode/my-app.git
```

---

## 8. VS Code 연동

WSL의 진짜 강점은 **VS Code와의 연동**입니다.

### 8.1 VS Code 설치

1. https://code.visualstudio.com/ 접속
2. Windows용 다운로드 → 설치
3. 설치 마법사에서 **"PATH에 추가"** 옵션 체크

### 8.2 WSL 확장 설치

1. VS Code 실행
2. 왼쪽 사이드바 **확장(Extensions)** 아이콘 클릭 (또는 `Ctrl+Shift+X`)
3. 검색창에 **"WSL"** 입력
4. **"WSL"** (Microsoft 공식) 설치

### 8.3 WSL에서 VS Code 열기

Ubuntu 터미널 안에서:

```bash
$ cd ~/projects/my-app
$ code .
```

처음 실행 시 VS Code Server가 자동으로 깔립니다. 잠깐 기다리면 VS Code 창이 뜨고, **왼쪽 아래에 `WSL: Ubuntu`**라고 표시됩니다.

이제 VS Code는 Linux 환경에서 실행됩니다:
- 터미널(`Ctrl + \`` )도 Linux Bash
- 파일 시스템도 Linux 쪽
- Git 명령어도 Linux Git
- Python, Node.js도 Linux 버전

> **결과**: macOS 사용자와 100% 동일한 개발 환경.

---

## 9. 자주 만나는 에러와 해결법

### 9.1 "WslRegisterDistribution failed with error: 0x80370102"

**원인**: 가상화가 BIOS에서 꺼져 있음

**해결**: 2.2절 참고. BIOS에서 VT-x / SVM 활성화.

### 9.2 "Error code: 0x8007019e"

**원인**: WSL 기능이 활성화 안 됨

**해결**: PowerShell(관리자)에서:

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

재부팅 후 다시 시도.

### 9.3 "WSL 2 requires an update to its kernel component"

**원인**: WSL2 커널이 오래됨

**해결**:

```powershell
wsl --update
```

### 9.4 Ubuntu가 너무 느려요

**원인 1**: 코드를 `/mnt/c/` 쪽에 두고 있음

**해결**: 코드를 `~/projects/` (Linux 홈) 으로 옮기세요. 7.4절 참고.

**원인 2**: WSL이 메모리를 너무 많이 쓰거나 너무 적게 씀

**해결**: Windows 사용자 폴더에 `.wslconfig` 파일 만들기

`C:\Users\사용자이름\.wslconfig` 위치에:

```ini
[wsl2]
memory=4GB
processors=2
```

저장 후 PowerShell에서:

```powershell
wsl --shutdown
```

Ubuntu를 다시 실행하면 적용됩니다.

### 9.5 비밀번호를 잊었어요

**해결**:

1. PowerShell 관리자 열기
2. ```powershell
   wsl -u root
   ```
3. Ubuntu가 root로 열림
4. ```bash
   passwd 내사용자이름
   ```
5. 새 비밀번호 2번 입력
6. `exit`로 나가고 다시 일반 사용자로 진입

### 9.6 WSL 통째로 다시 시작

뭔가 이상하다 싶을 때:

```powershell
wsl --shutdown
```

그 후 Ubuntu를 다시 실행하면 깨끗한 상태에서 시작합니다.

### 9.7 Ubuntu를 완전히 지우고 다시 깔고 싶어요

```powershell
# 현재 설치된 배포판 확인
wsl --list --verbose

# Ubuntu 삭제 (모든 데이터 사라짐!)
wsl --unregister Ubuntu

# 다시 설치
wsl --install -d Ubuntu
```

> **⚠️ 주의**: `--unregister`는 그 안의 모든 파일을 삭제합니다. 백업하세요.

---

## 10. 한 페이지 요약

### 10.1 설치 (3줄)

```powershell
# PowerShell을 관리자로 열고
wsl --install
# 재부팅
# Ubuntu 시작 → username/password 만들기
```

### 10.2 첫 셋업 (Ubuntu 안에서)

```bash
sudo apt update && sudo apt upgrade -y
git config --global user.name "내 이름"
git config --global user.email "내@이메일.com"
mkdir -p ~/projects
```

### 10.3 파일 위치 규칙

```
코드/프로젝트 → ~/projects/  (Linux 홈, 빠름)
일반 문서     → /mnt/c/...   (Windows 쪽)
```

### 10.4 자주 쓰는 명령

```bash
# WSL 안에서
explorer.exe .          # 현재 폴더를 Windows 탐색기로 열기
code .                  # VS Code로 열기

# PowerShell에서
wsl                     # WSL 진입
wsl --shutdown          # WSL 끄기
wsl --list --verbose    # 설치된 배포판 보기
wsl --update            # WSL 커널 업데이트
```

### 10.5 강의 진행 체크리스트

수강생이 다음을 할 수 있으면 성공입니다:

- [ ] `winver`로 Windows 버전 확인
- [ ] 작업 관리자에서 가상화 활성화 확인
- [ ] PowerShell 관리자로 `wsl --install` 실행
- [ ] Ubuntu에서 username/password 만들기
- [ ] `sudo apt update`로 시스템 업데이트
- [ ] `git --version` 확인
- [ ] `~/projects` 폴더 만들기
- [ ] Windows Terminal 기본 프로필을 Ubuntu로
- [ ] VS Code WSL 확장 설치
- [ ] `code .`로 VS Code 열기

---

## 부록. 공식 문서

| 주제 | URL |
|------|-----|
| WSL 공식 설치 가이드 | https://learn.microsoft.com/en-us/windows/wsl/install |
| WSL 개발 환경 모범 사례 | https://learn.microsoft.com/en-us/windows/wsl/setup/environment |
| WSL 명령어 레퍼런스 | https://learn.microsoft.com/en-us/windows/wsl/basic-commands |
| 문제 해결 가이드 | https://learn.microsoft.com/en-us/windows/wsl/troubleshooting |
| Windows Terminal 다운로드 | https://aka.ms/terminal |
| VS Code WSL 확장 | https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl |

> **강사 진행 팁**
> WSL 설치 자체는 명령어 한 줄이라 간단하지만, 가상화 확인 / BIOS 작업 / 비밀번호 입력 시 화면 안 보임 같은 함정 포인트들이 비개발자를 막힘니다.
> 영상 촬영 시 이 세 부분을 특히 천천히 설명하세요.
