# 발표 스크립트 — Claude Code 설치 & PATH 트러블슈팅

> 대상: 개발자 / 예상 강의 시간: 약 5~6분
> 표기: 【화면】 = 보여줄 화면, 【대사】 = 나레이션, ▶ = 시연 명령

---

## 0. 도입 (30초)

【대사】
"설치는 한 줄이면 끝납니다. 그런데 막상 `claude --version`을 쳤는데 'command not found'가 뜨는 분들이 꼭 계세요. 오늘은 설치부터, 이 'command not found'가 왜 나는지, 그리고 어떻게 1분 만에 해결하는지까지 순서대로 보겠습니다."

【대사 — 결론 먼저】
"미리 핵심만 말씀드리면, 원인은 거의 항상 하나입니다. 설치는 됐는데, 설치된 위치 `~/.local/bin`이 PATH에 안 잡혀 있는 거예요. 그래서 셸이 `claude`라는 명령을 못 찾는 겁니다."

---

## 1. 사전 확인 (40초)

【화면】 터미널

▶
```bash
node --version
git --version
```

【대사】
"먼저 두 가지만 확인합니다. Node는 22버전대를 권장하고요, 20 미만이면 올려주세요. Git은 2.5 이상이면 됩니다. 둘 다 버전이 찍히면 준비 끝입니다. 없으면 Node는 nodejs.org에서 LTS, Git은 맥이면 `brew install git`으로 설치하시면 됩니다."

---

## 2. 설치 (60초)

【화면】 터미널

▶
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

【대사】
"설치는 이 공식 스크립트 한 줄을 권장합니다. Anthropic 공식 서버에서 스크립트를 받아서 자동 실행하는데, 자동 업데이트도 되고 Node 의존성도 없어서 제일 안정적이에요. Homebrew나 npm으로도 되지만, 처음엔 이 방식이 가장 깔끔합니다."

▶
```bash
source ~/.zshrc
```

【대사】
"설치가 끝나면 셸 설정을 다시 읽어줍니다. 맥 기본은 zsh라 `.zshrc`, 리눅스는 보통 bash라 `.bashrc`예요. 아니면 그냥 터미널을 닫았다 새로 열어도 됩니다."

▶
```bash
claude --version
```

【대사】
"그리고 버전 확인. 여기서 `2.1.x` 처럼 버전이 찍히면 끝입니다. 그런데 — 바로 여기서 'command not found'가 나는 분들, 지금부터가 진짜입니다."

---

## 3. PATH 문제 진단 & 해결 (120초) ★핵심★

### 3-1. 왜 나는가 (개념, 30초)

【화면】 슬라이드 — "claude가 설치된 곳: ~/.local/bin / PATH에 없으면 셸이 못 찾음"

【대사】
"셸은 명령어를 입력하면 PATH라는 환경변수에 적힌 디렉토리들을 순서대로 뒤져서 실행 파일을 찾습니다. 그런데 네이티브 설치는 `claude`를 `~/.local/bin` 안에 넣어요. 만약 이 폴더가 PATH 목록에 없으면? 파일은 분명히 있는데, 셸이 찾는 곳에 없으니 'command not found'가 나는 겁니다. 파일이 없는 게 아니라, 길을 안 알려준 거예요."

### 3-2. 진단 (20초)

【화면】 터미널

▶
```bash
echo $PATH | tr ':' '\n' | grep -Fx "$HOME/.local/bin"
```

【대사】
"먼저 진단부터. 이 명령은 현재 PATH를 한 줄씩 쪼개서 `~/.local/bin`이 들어 있는지 확인합니다. 경로가 출력되면 PATH는 정상이라는 뜻이고, 아무것도 안 나오면 — 범인을 찾은 겁니다. 등록이 안 돼 있는 거죠."

### 3-3. 해결 (40초)

【화면】 터미널

▶ zsh 사용자
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

▶ bash 사용자
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

【대사】
"해결은 간단합니다. 본인 셸 설정 파일 맨 끝에 `~/.local/bin`을 PATH에 추가하는 한 줄을 넣고, 다시 읽어주면 됩니다. 맥은 `.zshrc`, 리눅스는 `.bashrc`. 어느 셸인지 모르겠다 하시면 `echo $SHELL`로 확인하시면 돼요. `/bin/zsh`면 zsh입니다."

### 3-4. 재확인 (10초)

▶
```bash
claude --version
```

【대사】
"그리고 다시 버전 확인. 이제 정상적으로 찍힐 겁니다. 이게 안 되는 분의 90%는 여기서 해결됩니다."

---

## 4. 그래도 안 될 때 (60초)

【화면】 터미널

▶
```bash
which -a claude
```

【대사】
"드물게 여기까지 했는데도 안 되는 경우가 있어요. 그럴 땐 `which -a claude`로 claude가 여러 군데 깔려 있는지 확인합니다. 예전에 npm으로도 설치한 적이 있으면 두 개가 충돌할 수 있거든요."

【대사 — 셸 불일치】
"또 흔한 케이스가, 예전엔 bash를 쓰다가 zsh로 바꾼 경우예요. 설정이 `.bashrc`에만 들어 있어서 zsh가 못 읽는 거죠. 이럴 땐 `.bashrc`의 PATH 설정을 `.zshrc`로 복사해주면 됩니다."

【대사 — 중복 정리】
"중복 설치가 확인되면 네이티브 하나만 남기고 npm 전역 버전은 `npm uninstall -g`로 정리하는 걸 권장합니다. 버전이 꼬이는 걸 막아줘요."

---

## 5. 마무리 (30초)

【화면】 슬라이드 — 3줄 요약

```
1. 설치: curl -fsSL https://claude.ai/install.sh | bash
2. command not found = PATH 문제 (파일은 있음)
3. 셸 설정에 ~/.local/bin 추가 → source → 끝
```

【대사】
"정리하면, 설치는 한 줄. 'command not found'는 파일이 없는 게 아니라 PATH에 길이 안 잡힌 것. 그래서 셸 설정에 `~/.local/bin`만 추가해주면 해결됩니다. Windows는 `.local\bin`을 사용자 PATH에 넣고 새 PowerShell을 여는 것만 다를 뿐, 원리는 똑같습니다."

---

## 강사 메모 (구두 전달용)

- `~`(틸드)는 홈 디렉토리(`/Users/이름` 또는 `/home/이름`)를 가리킨다는 점을 한 번 짚어주면 비전공 청중도 이해가 쉽다.
- `source`는 "설정 파일을 지금 즉시 다시 읽는다"는 의미. "터미널 재시작과 같은 효과"로 설명하면 직관적.
- PATH 추가 줄에서 `$PATH`를 뒤에 두는 이유(`...:$PATH`)는 "기존 경로를 유지하면서 앞에 추가"하기 위함 — 질문이 나오면 보충.

---

## 출처 (연결 확인 완료)

- 설치: [code.claude.com/docs/en/setup](https://code.claude.com/docs/en/setup)
- PATH 트러블슈팅: [code.claude.com/docs/en/troubleshoot-install](https://code.claude.com/docs/en/troubleshoot-install)

## 검증 노트

- ✅ **확인**: 스크립트에 등장하는 모든 bash 명령 `bash -n` 구문 검사 통과.
- ✅ **확인**: 명령·경로 전부 공식 문서와 일치.
- ⚠️ **녹화 시 재확인**: 버전 표기(`2.1.x`), 예상 강의 시간은 실제 시연 속도에 맞춰 조정.
