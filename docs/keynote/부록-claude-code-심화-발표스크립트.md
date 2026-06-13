# 부록 강의 — 클로드 코드 심화 6강 · 발표(동영상) 스크립트

> 성격: 본 강의(Level 1~)에서 더 깊이 다뤄야 할 주제를 모은 **부록(심화) 슬라이드 덱**
> 대상: 비전공자·입문자 (본 강의를 한 번 들은 분 기준 — 기초 터미널/Git/설정은 이미 학습한 것으로 가정)
> 작성 원칙: 처음 나오는 용어는 ① 풀 용어 ② 뜻 ③ 쉬운 비유 순 / 페이지당 1분 내외(표지·정리는 10~30초)
> 기준 시점: **2026년 6월** (웹 출처는 각 섹션 끝/슬라이드에 표기)
>
> **읽는 법** — `>` 인용 블록 = 실제로 말하는 내레이션, `(화면)` = 연출 지시, `⏱` = 목표 시간, **용어** = 화면에서 처음 나오는 단어 풀이, **샘플 코드** = 화면에 띄우거나 실습으로 보여줄 코드, **이미지 스펙** = 나중에 이 명세대로 생성할 이미지(지금은 만들지 않음).

---

## 구성 (총 100 슬라이드 · 이미지 스펙 24종)

| # | 섹션 | 슬라이드 | 이미지 | 핵심 |
|---|---|---|---|---|
| A1 | 터미널 활용 — 심화 명령어 | 9 | 3 | grep·find·jq·tail·pbcopy·chmod 등 "클로드 코드와 일할 때" 쓰는 명령 |
| A2 | Git 되돌리기 — 스냅샷 롤백·푸시 되돌리기 | 25 | 3 | restore·reset 3종·revert·reflog, 안전 vs 위험(force-push) |
| A3 | 클라우드 세션 — 관리형 VM 격리 실행 | 12 | 3 | `--remote`·teleport·`/tasks`·`/mobile`, 로컬 vs 클라우드 |
| A4 | `/loop` 실전 활용 | 12 | 3 | 반복/self-paced 루프, CI 폴링·PR 베이비싯, `/loop` vs `/schedule` |
| A5 | Fable 5 / Mythos 5 리뷰 | 12 | 5 | 신모델 특징·안전장치 폴백·사용법(모델 ID·플랫폼) |
| A6 | 베스트 프랙티스 — 자율운용·자동화 | 30 | 7 | 권한 모드·훅·헤드리스·스케줄링·멀티에이전트 do/don't |

> 본 부록의 A3는 기존 P87/P88(클라우드 세션) 초안을 더 자세히 대체합니다. A1은 기초 터미널 강의에서 다룬 `pwd/ls/cd/mkdir/touch/rm/cat/echo/nano/lsof/kill`을 **다시 가르치지 않고** 그 위의 심화 명령만 다룹니다.

---

## 이미지 생성 가이드 (공통 디자인 시스템 — 모든 이미지 스펙이 공유)

이미지는 이 단계에서 **생성하지 않습니다.** 각 슬라이드의 **이미지 스펙**은 나중에 그대로 구현할 수 있도록 명세만 정의합니다. 모든 이미지는 아래 토큰을 공유하며, 프로젝트 **anti-ai-slop** 규칙(`.claude/rules/anti-ai-slop.md`)을 강제합니다.

- **캔버스**: 1280×720 (덱 표준 좌표계, 내보내기 시 1.5× → 1920×1080)
- **색(무채색 베이스 + 액센트 1색)**: 배경 크림 `#F0EDE8` · 본문 `#2B2B2B` · 보더 `#D8D2C8` · 액센트 teal `#1A7F7A`(강조/상태에만) — 리포트 덱 룩앤필과 일치
- **타이포**: 본문/라벨 = Pretendard(국문 가독성·중립적 정보 위계) · 코드/모노 = JetBrains Mono(0과 O 구분·등폭) — 의도적으로 선택
- **MUST NOT**: 그라데이션 일체 · 컬러/글로우 그림자 · `blur ≥ 20px` · 글래스모피즘 · 장식 모션 · 배경 워터마크/그리드/광선 · 카드 상단 컬러 액센트 바 · 이모지 불릿 · 마케팅 상투어
- **MUST**: 구획은 `1px solid` 보더 + 여백으로만 · 모서리 0~8px(한쪽 보더엔 radius 0) · 그림자는 쓰더라도 중성 회색 1단 `0 1px 2px rgba(0,0,0,.06)` · 모든 요소는 "어떤 정보를 전달하는가"에 답할 수 있어야 함(답 못 하면 삭제)

---


## A1 — 터미널 활용 — 클로드 코드와 일하는 데 필요한 심화 명령어

> 대상: 비전공자·입문자 (터미널 기초 6개 단어를 한 번 본 분) / 페이지당 1분 내외(표지·정리는 10~30초)
>
> **읽는 법** — `>` 인용 블록 = 실제로 말하는 내레이션, `(화면)` = 연출 지시, `⏱` = 목표 시간, **용어** = 화면에서 처음 나오는 단어 풀이, **샘플 코드** = 화면에 띄우거나 실습으로 보여줄 코드. 모든 슬라이드 번호는 `A1`로 시작합니다.

---

### A1.1 섹션 표지 — 클로드 코드와 일하는 데 필요한 심화 명령어 ⏱ ~12초
**(화면)** 섹션 표지 "터미널 활용 — 심화 명령어" / 부제: 검색 · 파이프 · 로그 · JSON · 프로세스 · 명령 연결 · macOS 도구

> 부록 첫 섹션, **터미널 심화 명령어**입니다. 기초에서 `pwd`·`ls`·`cd` 같은 '6개의 단어'를 배웠다면, 이번엔 클로드 코드와 실제로 일할 때 매일 쓰게 되는 명령어들을 봅니다.
>
> 코드를 찾고, 에러 로그를 모으고, 프로세스를 정리하고, 설정 파일을 들여다보는 것 — 클로드와 협업하는 시간의 90%가 사실 이거예요. 외우는 게 목적이 아니라, **클로드에게 정확히 뭘 물어볼지**를 알기 위한 키워드를 잡고 가는 시간입니다.

---

### A1.2 검색 명령어 — grep · rg · find · tree ⏱ ~65초
**(화면)** 좌측 4개 명령어 리스트 / 우측 비교표(이미지 A1-IMG-1)

> 첫 번째 묶음은 **'찾기'**입니다. 버그가 어디서 났는지, 특정 함수가 어디서 불리는지 — 이걸 빨리 찾아 클로드에게 보여줄 수 있어야 해요.
>
> **`grep`**(그렙, global regular expression print)은 '파일 *안의* 글자'를 찾는 도구예요. 책 한 권에서 특정 단어가 나온 페이지를 전부 형광펜으로 긋는 것과 같아요. `error`라는 글자가 들어간 줄을 전부 찾는 식이죠.
>
> **`rg`**(리프그렙, ripgrep)는 grep을 더 빠르고 똑똑하게 만든 거예요. 가장 큰 장점은 `.gitignore`를 자동으로 무시한다는 것 — 그래서 `node_modules`(외부 라이브러리 더미) 같은 거대한 폴더에 빠지지 않습니다.
>
> **`find`**는 '파일 *이름*'으로 찾는 도구예요. "`settings.json`이 대체 어디 있지?"처럼 이름은 아는데 위치를 모를 때 씁니다. **`tree`**(트리)는 폴더 구조를 나무 모양으로 그려 줘요. 프로젝트 전체 모습을 한눈에 보거나, 그대로 복사해서 클로드에게 "이게 우리 프로젝트 구조야"라고 보여줄 때 아주 유용합니다.

**용어**
- **grep** — 파일 *안 내용*에서 글자/패턴을 찾는 명령. 형광펜으로 단어 긋기.
- **rg (ripgrep)** — grep의 빠른 버전. `.gitignore`를 자동 무시해 `node_modules` 등에 안 빠짐. 설치: `brew install ripgrep`.
- **find** — 파일 *이름*으로 검색하는 명령. 이름은 알지만 위치를 모를 때.
- **tree** — 폴더 구조를 나무 모양으로 출력. 설치: `brew install tree`.
- **패턴(정규식)** — "이런 모양의 글자"를 표현하는 규칙. 일단 '찾을 단어'라고만 알아도 충분.

**샘플 코드** — grep으로 에러 메시지가 있는 위치 찾기.
```bash
# Find every line containing "error" in .js files, searching recursively
grep -r "error" . --include="*.js"

# -n shows line numbers, -r searches subfolders too
grep -rn "handleError" src/

# -i ignores case, -C 3 shows 3 lines of context around each match
grep -i -C 3 "warning" debug.log
```

**샘플 코드** — ripgrep으로 더 빠르게, find/tree로 위치와 구조 보기.
```bash
# rg auto-ignores .gitignore (skips node_modules); --type limits to JS files
rg "TODO" --type js

# Find where a function is defined
rg "function initApp" .

# find searches by filename, not content
find . -name "*.env*"

# Show folder structure 2 levels deep, excluding noise folders
tree -L 2 -I 'node_modules|.git'
```

**이미지 스펙**
- **ID**: A1-IMG-1
- **목적(전달 정보)**: 4개 검색 명령어(grep / rg / find / tree)가 각각 '무엇을 어떻게 찾는지'와 언제 쓰는지를 한 표로 구분해 보여 준다.
- **유형**: 비교표
- **캔버스**: 1280×720
- **레이아웃**: 상단 제목 띠(높이 약 80px) "검색 명령어 비교". 그 아래 4행 5열 표. 좌우 여백 각 64px. 열 헤더(위→아래 첫 행): `명령어` · `찾는 대상` · `속도/특징` · `대표 옵션` · `언제 쓰나`. 행(위→아래): grep / rg / find / tree. 셀 구분은 1px 보더만. 행 높이 균등.
- **텍스트/레이블**:
  - 헤더: `명령어` `찾는 대상` `속도/특징` `대표 옵션` `언제 쓰나`
  - grep | 파일 안 내용 | 표준·어디에나 있음 | `-rn` `-i` `-C` | 에러 메시지 위치 찾기
  - rg | 파일 안 내용 | 빠름·.gitignore 무시 | `--type` | node_modules 빼고 코드 검색
  - find | 파일 이름 | 이름 기준 | `-name` | "그 설정파일 어디 있지?"
  - tree | 폴더 구조 | 트리 형태 출력 | `-L` `-I` | 프로젝트 구조 클로드에 보여주기
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. 헤더 행 텍스트만 teal #1A7F7A로 강조(배경색은 채우지 않음). 명령어 셀(grep/rg/find/tree)은 모노 폰트 + teal 텍스트로 식별성만 부여.
- **타이포**: 본문 라벨은 Pretendard(한글 가독성 좋은 산세리프, 표 라벨 정렬에 적합) 1종. 명령어/옵션은 JetBrains Mono(0과 O, 1과 l 구분이 뚜렷해 명령어 오독 방지) 1종.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿·마케팅 상투어. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자 쓰면 중성 회색 1단(0 1px 2px rgba(0,0,0,.06))만.

---

### A1.3 파이프 & 리다이렉션 — 데이터 흐름 제어 ⏱ ~70초
**(화면)** 좌측 기호 5개(| > >> 2>&1 tee) / 우측 흐름도(이미지 A1-IMG-2)

> 두 번째는 **데이터 흐름**을 다루는 기호들이에요. 명령어의 '출력'을 다른 곳으로 보내는 방법이죠. 이걸 알면 에러 로그를 깔끔하게 모아서 클로드에게 통째로 넘길 수 있습니다.
>
> **`|`**(파이프, pipe)는 '관(管)'이라는 뜻이에요. 앞 명령의 결과를 뒤 명령의 입력으로 흘려보냅니다. 물을 호스로 다음 통에 부어 넣는 거죠. **`>`**(꺾쇠, 리다이렉션)는 출력을 파일에 저장하는데, **기존 내용을 덮어씁니다.** 반면 **`>>`**(이중 꺾쇠)는 파일 *끝에 이어 붙여요.* 기존 내용은 그대로 두고요.
>
> 여기서 꼭 알아야 할 게 **`2>&1`**입니다. 프로그램은 출력을 두 갈래로 내보내요 — 정상 메시지(stdout)와 에러 메시지(stderr). 그냥 `>`로 저장하면 정상 메시지만 잡히고 *에러는 화면에만 남아 사라져요.* `2>&1`은 "에러도 정상 출력 쪽으로 합류시켜"라는 뜻이에요. 그래야 클로드에게 **완전한 로그**를 보여줄 수 있습니다.
>
> 마지막 **`tee`**(티)는 갈림길이에요. 화면에도 보여주고 *동시에* 파일에도 저장합니다. 진행 상황을 눈으로 보면서 기록도 남기고 싶을 때 쓰죠.

**용어**
- **`|` (파이프)** — 앞 명령의 출력을 뒤 명령의 입력으로 넘김. 호스로 다음 통에 붓기.
- **`>` (덮어쓰기)** — 출력을 파일에 저장. 기존 내용 사라짐.
- **`>>` (이어쓰기)** — 파일 *끝*에 추가. 기존 내용 유지.
- **stdout / stderr** — stdout = 정상 출력(채널 1), stderr = 에러 출력(채널 2).
- **`2>&1`** — 에러(2번)를 정상 출력(1번)과 같은 곳으로 합침 → 로그 누락 방지.
- **`tee`** — 화면 출력 + 파일 저장을 동시에. 'T자 갈림길'.

**샘플 코드** — 파이프와 리다이렉션을 실제로 써 보기.
```bash
# Save full dev log (incl. errors) so you can paste it to Claude
npm run dev > error.log 2>&1

# Search for console.log lines and dump the result into a file
grep -r "console.log" src/ > debug-points.txt

# Run tests, watch output AND save it at the same time
npm test | tee test-results.txt

# Save an API response to a file (errors included)
curl https://api.example.com/data > response.json 2>&1
```

**샘플 코드** — 로그를 모으고 클립보드로 복사하기(macOS).
```bash
# Collect error lines, copy to clipboard -> paste into Claude with Cmd+V
grep -i "error" logs/* | pbcopy

# Append logs from several sources into one file (>> keeps old content)
grep "Error" app.log >> all-errors.txt
grep "error" test-output.log >> all-errors.txt
```

> ⚠️ Windows/WSL 한 줄 차이: `pbcopy`는 macOS 전용이에요. WSL에서는 `clip.exe`, 리눅스에서는 `xclip -selection clipboard`를 같은 자리에 쓰면 됩니다.

**이미지 스펙**
- **ID**: A1-IMG-2
- **목적(전달 정보)**: 명령의 출력이 stdout/stderr 두 채널로 나뉘고, 파이프·리다이렉션 기호에 따라 그 흐름이 화면·파일·클립보드 중 어디로 가는지를 보여 준다.
- **유형**: 플로우차트
- **캔버스**: 1280×720
- **레이아웃**: 좌→우 흐름. (1) 왼쪽에 박스 `명령 실행 (npm run dev)`. (2) 그 박스에서 화살표 2개가 오른쪽으로 갈라져 나감 — 위쪽 화살표 라벨 `stdout (정상)`, 아래쪽 화살표 라벨 `stderr (에러)`. (3) 가운데에 4개의 기호 박스를 위→아래로 세로 배열: `| 파이프` · `> 덮어쓰기` · `>> 이어쓰기` · `2>&1 에러 합류`. (4) 오른쪽에 도착지 박스 3개(위→아래): `다음 명령` · `파일(.log)` · `클립보드(pbcopy)`. 각 기호 박스에서 해당 도착지로 1px 화살표. `2>&1` 박스는 stderr 화살표를 stdout 화살표 쪽으로 합치는 모양으로 그려 의미를 시각화.
- **텍스트/레이블**: 박스 라벨은 위 그대로. 화살표 라벨 `stdout (정상)` `stderr (에러)`. 하단 캡션 한 줄: `2>&1 = 에러도 같은 로그로 → 클로드에 완전한 로그 전달`.
- **색**: 배경 크림 #F0EDE8, 박스 본문 #2B2B2B, 보더 #D8D2C8. `2>&1` 박스와 그 합류 화살표만 teal #1A7F7A로 강조(이 슬라이드의 핵심이라 상태 강조 1색 사용). 나머지 화살표·보더는 #D8D2C8.
- **타이포**: 박스 라벨 한글은 Pretendard 1종. 기호·명령(`2>&1`, `pbcopy` 등)은 JetBrains Mono(`2>&1` 같은 기호 나열의 오독 방지) 1종.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿·마케팅 상투어. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자는 중성 회색 1단만.

---

### A1.4 로그 & 텍스트 처리 — 찾고 · 세고 · 비교하고 ⏱ ~65초
**(화면)** 리스트: tail -f / head·tail / wc / sort·uniq / diff

> 세 번째는 **로그를 다루는 기술**이에요. 로그는 프로그램이 남기는 일기장 같은 건데, 보통 길고 지저분해서 그대로 보면 머리가 아파요. 필요한 부분만 골라내는 법을 봅니다.
>
> **`tail -f`**(테일 에프, follow)는 로그를 *실시간으로* 따라갑니다. 개발 서버를 켜 둔 채 새 로그가 찍히면 즉시 화면에 흘러나오죠. 강물을 계속 지켜보는 거예요. 빠져나올 때는 `Ctrl+C`. **`head`/`tail`**은 파일의 *앞/뒤 몇 줄만* 봅니다. `cat`은 파일 전체를 쏟아내서 큰 파일엔 비효율적인데, 보통 에러는 파일 *끝*에 있으니 `tail`로 마지막 몇 줄만 보면 빨라요.
>
> **`wc`**(워드 카운트, word count)는 줄·단어 개수를 세요. "에러가 몇 줄이나 났지?"를 숫자로 알 수 있죠. **`sort`/`uniq`**는 정렬하고 중복을 묶어요 — 같은 에러가 몇 번 반복됐는지 세는 데 씁니다. **`diff`**(디프, difference)는 파일 두 개를 비교해 *달라진 부분만* 짚어 줘요. 설정을 바꾸기 전후를 비교하거나, 예상 출력과 실제 출력을 맞춰 볼 때 딱입니다.

**용어**
- **`tail -f`** — 로그를 실시간으로 추적(follow). `Ctrl+C`로 종료.
- **`head` / `tail`** — 파일 앞/뒤 N줄만 보기. `cat`은 전체 출력이라 큰 파일엔 비효율적.
- **`wc`** — 줄·단어·글자 수 세기(word count). `wc -l` = 줄 수.
- **`sort` / `uniq`** — 정렬 / 중복 묶기. `uniq -c` = 중복을 세어 개수 표시.
- **`diff`** — 두 파일의 달라진 부분만 표시.

**샘플 코드** — 개발 서버 로그를 실시간으로 보기.
```bash
# Terminal 1: run the server
npm run dev

# Terminal 2 (open a new tab with Cmd+T): follow the log live
tail -f logs/server.log   # new lines appear on screen the moment they're written

# Or run the server and save+show the log together
npm run dev 2>&1 | tee dev.log
```

**샘플 코드** — 큰 로그 미리보기 & 반복 에러 세기.
```bash
# Peek at the first 20 lines of a huge log (fast)
head -20 huge-app.log

# Last 50 lines (errors are usually at the end)
tail -50 error.log

# How many lines contain "ERROR"? (-c counts matches)
grep -c "ERROR" app.log

# Group repeated errors and show the most frequent first
grep "ERROR" app.log | sort | uniq -c | sort -rn
```

**샘플 코드** — 설정 파일 변경 전후 비교.
```bash
# What changed in settings.json vs the backup?
diff settings.json settings.json.backup

# Compare expected vs actual test output
diff expected-output.txt actual-output.txt
```

---

### A1.5 JSON 처리 & 환경 설정 — jq · env · export · chmod ⏱ ~70초
**(화면)** 리스트: jq / env·export / echo $VAR / which·type / chmod +x

> 네 번째는 **설정과 권한**을 다루는 명령어예요. 클로드 코드 자체가 `settings.json` 같은 JSON 설정 파일을 많이 쓰기 때문에, 이걸 들여다보는 법을 알면 협업이 훨씬 수월합니다.
>
> **`jq`**(제이큐)는 'JSON을 위한 grep'이에요. JSON은 `{ "키": "값" }` 형태의 설정 표준 형식인데, 통째로 보면 눈이 아파요. `jq`는 보기 좋게 정리해 주고, 원하는 키만 콕 집어 꺼내 줍니다. 예를 들어 `settings.json`에서 `permissions` 부분만 보고 싶을 때요.
>
> **`env`/`export`**는 **환경 변수**를 다뤄요. 환경 변수는 프로그램들이 공유하는 '쪽지'예요 — `DEBUG=true` 같은 걸 켜 두면 그 터미널에서 실행되는 프로그램이 그 값을 읽습니다. **`echo $변수명`**으로 특정 값을 확인하고요(예: `echo $PATH`). **`which`/`type`**는 명령어가 *어디에 설치됐는지* 알려 줘요 — "내 `python`이 대체 어느 버전이지?" 할 때 씁니다.
>
> 마지막 **`chmod +x`**(체모드, change mode)는 파일에 **실행 권한**을 줘요. 클로드가 자동화 스크립트나 훅(hook) 파일을 만들어 주면, 그 파일은 기본적으로 '읽기만' 가능한 상태예요. `chmod +x`로 '실행해도 돼' 도장을 찍어 줘야 동작합니다. 안 하면 'Permission denied'(권한 없음) 에러가 나요.

**용어**
- **`jq`** — JSON을 보기 좋게 정리하고 원하는 키만 추출. 'JSON용 grep'. 설치: `brew install jq`.
- **환경 변수(environment variable)** — 프로그램들이 공유하는 설정 쪽지(예: `PATH`, `NODE_ENV`, `DEBUG`).
- **`export`** — 환경 변수를 *현재 터미널 세션에만* 설정. 창을 닫으면 사라짐.
- **`which` / `type`** — 명령어의 설치 위치/정체를 알려 줌.
- **`chmod +x`** — 파일에 실행 권한 부여(change mode + execute). 없으면 'Permission denied'.

**샘플 코드** — settings.json에서 필요한 부분만 보기(jq).
```bash
# Raw settings.json (hard to read)
cat .claude/settings.json

# Pretty-print the whole file
jq . .claude/settings.json

# Extract just one key
jq '.permissions' .claude/settings.json

# Peek inside an API response
curl -s https://api.github.com/repos/user/repo | jq '.name, .stargazers_count'
```

**샘플 코드** — 환경 변수 확인 & 임시 설정.
```bash
# Show env vars related to Node
env | grep NODE

# Check a single variable's value
echo $HOME
echo $PATH

# Turn on debug mode for THIS terminal session only
export DEBUG=true
npm run dev

# Where is a command installed?
which node
which npm
type python3
```

**샘플 코드** — 훅 스크립트에 실행 권한 주기.
```bash
# Claude generated an automation script
ls -l scripts/my-hook.sh    # permissions show -rw-r--r-- (no x = not executable)

# Add execute permission
chmod +x scripts/my-hook.sh

# Verify -> -rwxr-xr-x (x added)
ls -l scripts/my-hook.sh

# Now it can run
./scripts/my-hook.sh
```

---

### A1.6 프로세스 & 네트워크 — ps · top · curl · API 테스트 ⏱ ~60초
**(화면)** 리스트: ps aux / top·htop / curl -s / (복습) lsof·kill

> 다섯 번째는 **지금 무엇이 돌고 있는가**를 보는 명령어예요. 서버가 안 떠서 답답할 때, 컴퓨터가 느려졌을 때 — 원인을 직접 눈으로 확인하는 거죠.
>
> **`ps aux`**(피에스, process status)는 *실행 중인 모든 프로그램*을 목록으로 보여 줍니다. "백그라운드에서 뭐가 돌고 있지?"를 확인할 때 `ps aux | grep node`처럼 써요. **`top`/`htop`**은 그걸 *실시간으로* 보여 주는 모니터예요 — CPU랑 메모리를 누가 많이 먹는지 순위로 보여 주죠. 차 계기판을 보는 것과 같아요. `htop`은 더 보기 좋은 버전이고, 나갈 때는 `q` 또는 `Ctrl+C`.
>
> **`curl -s`**(컬)은 터미널에서 웹 주소로 *직접 요청*을 보내는 도구예요. 클로드가 "이 API를 호출하면 돼"라고 제안했을 때, 정말 작동하는지 브라우저 없이 바로 확인할 수 있습니다. `-s`는 'silent', 진행률 표시를 끄는 옵션이에요.
>
> 그리고 기초에서 배운 **`lsof`/`kill`** 기억나시죠? 포트가 이미 점유됐을 때 — 'address already in use' 에러 — 그 프로세스를 찾아 정리하는 조합입니다. 자주 만나는 상황이라 한 번 더 복습하고 갑니다.

**용어**
- **`ps aux`** — 실행 중인 모든 프로세스 목록. `| grep node`로 특정 프로그램만 추림.
- **`top` / `htop`** — 실시간 프로세스·CPU·메모리 모니터. `htop` 설치: `brew install htop`. 종료 `q`.
- **`curl -s`** — 터미널에서 URL로 직접 요청. `-s`(silent) = 진행률 숨김.
- **`lsof` / `kill`**(복습) — `lsof -i :3000` 포트 점유 프로세스 조회 → `kill <PID>` 종료.

**샘플 코드** — 실행 중 프로세스 & 자원 사용량 보기.
```bash
# Show only Node.js processes
ps aux | grep node

# Live monitor, sorted by CPU or memory (q or Ctrl+C to quit)
top -o cpu     # by CPU usage
top -o mem     # by memory usage

# Nicer interface (brew install htop)
htop
```

**샘플 코드** — API 테스트 & 응답 확인.
```bash
# A simple GET request
curl https://api.github.com/users/octocat

# Save the response to a file (-s hides the progress meter)
curl -s https://api.example.com/data > api-response.json

# Pipe the response straight into jq to inspect it
curl -s https://api.example.com/data | jq '.items[] | .name'

# A POST request (testing an API Claude suggested)
curl -X POST https://api.example.com/submit \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}'
```

---

### A1.7 파일 조작 & 명령 연결 — 효율적인 작업 흐름 ⏱ ~70초
**(화면)** 리스트: && / || / ; / $(...) / xargs / tar·unzip / ln -s / history·!!

> 여섯 번째는 **명령어를 엮어 쓰는** 방법이에요. 명령을 하나씩 칠 수도 있지만, 연결하면 한 줄로 끝낼 수 있어요. 클로드가 길게 제안한 명령을 읽을 때도 이 기호들을 알면 무슨 뜻인지 바로 보입니다.
>
> **`&&`**(앤드앤드)는 '*성공하면 이어서*'예요. 앞 명령이 성공했을 때만 뒤를 실행하죠. `npm install && npm run build`는 "설치가 잘 됐으면 빌드해"라는 뜻이에요. 중간에 실패하면 거기서 멈춥니다. 반대로 **`||`**(오어오어)는 '*실패하면 대신*'이에요 — 앞이 실패할 때만 뒤를 실행하는 비상 계획이죠. **`;`**(세미콜론)은 성공·실패 상관없이 무조건 순서대로 실행하는데, 거의 안 씁니다.
>
> **`$(...)`**(달러 괄호)는 *명령의 결과를 값처럼 끼워 넣어요.* `$(date ...)`로 현재 날짜를 파일 이름에 박는 식이죠. **`xargs`**(엑스아그스)는 *여러 파일에 같은 작업을 반복*해요. **`tar`/`unzip`**은 압축·해제 — 프로젝트를 백업하거나 GitHub에서 받은 zip을 풀 때 씁니다.
>
> 마지막으로 **`ln -s`**(엘엔, link)는 바로가기(심볼릭 링크)를 만들고, **`history`/`!!`**는 과거 명령을 다시 부릅니다. `!!`는 '방금 친 그 명령 다시'예요. `Ctrl+R`을 누르면 예전 명령을 거꾸로 검색할 수도 있고요.

**용어**
- **`&&`** — 앞 명령이 *성공*하면 뒤 실행. 실패 시 멈춤.
- **`||`** — 앞 명령이 *실패*할 때만 뒤 실행(폴백/비상 계획).
- **`;`** — 성공·실패 무관하게 순서대로 실행.
- **`$(...)`** — 명령 출력을 값처럼 끼워 넣음(명령 치환).
- **`xargs`** — 앞에서 받은 목록을 뒤 명령의 인자로 반복 적용.
- **`tar` / `unzip`** — 압축(`tar -czf`) / zip 해제(`unzip`).
- **`ln -s`** — 심볼릭 링크(바로가기) 생성.
- **`!!`** — 바로 직전 명령을 다시 실행. `Ctrl+R` = 명령 거꾸로 검색.

**샘플 코드** — 명령을 연결해 한 줄로 실행.
```bash
# Install -> build -> run, stopping if any step fails
npm install && npm run build && npm run dev

# If tests fail, fall back to the fast dev build
npm run test || npm run dev:fast

# Back up with the current timestamp baked into the filename
cp settings.json settings.json.backup-$(date +%Y%m%d-%H%M%S)

# List all .log files, then delete them one by one with confirmation
find . -name '*.log' -type f | xargs rm -i
```

**샘플 코드** — 압축 · 링크 · 히스토리.
```bash
# Compress a project folder into a tarball (for backup)
tar -czf my-project.tar.gz my-project/

# Unzip a repo downloaded from GitHub
unzip downloaded-repo.zip

# Make a shortcut to a frequently used folder in your home dir
ln -s /Users/you/work/my-project ~/projects/current

# Re-run the previous command
!!

# Search your command history (or just press Ctrl+R)
history | grep "npm run"
```

> ⚠️ 한 줄 주의: `xargs rm -i`처럼 삭제를 거는 조합은 항상 `-i`(매번 확인)를 붙이세요. 기초에서 배운 대로 `rm`은 휴지통을 안 거칩니다.

---

### A1.8 macOS 특화 & 개발자 도구 — code · open · pbcopy · pbpaste ⏱ ~60초
**(화면)** 리스트: code . / open / pbcopy·pbpaste / watch·nodemon

> 일곱 번째는 **macOS에서 특히 편리한 도구들**이에요. 터미널과 GUI(아이콘으로 누르는 화면) 사이를 자연스럽게 오가게 해 줍니다.
>
> **`code .`**(코드 닷)은 지금 폴더를 *VS Code 에디터로 바로* 열어요. 점(`.`)은 '현재 위치'라는 뜻이죠. 클로드와 설정을 논의한 다음 직접 파일을 손볼 때 한 줄로 에디터를 띄웁니다. **`open`**은 파일·폴더를 *기본 앱으로* 열어요 — `open .`은 Finder로 현재 폴더를, `open https://...`는 브라우저로 링크를 엽니다.
>
> 그리고 제일 자주 쓰게 될 **`pbcopy`/`pbpaste`**(피비카피/피비페이스트). 'pb'는 pasteboard, 즉 클립보드예요. `pbcopy`는 명령 결과를 *클립보드에 자동 복사*해서, 클로드 창에 `Cmd+V`로 바로 붙일 수 있게 해 줍니다. 에러 로그를 마우스로 드래그할 필요가 없어요. `pbpaste`는 반대로 클립보드 내용을 꺼내 쓰고요.
>
> 마지막 **`watch`/`nodemon`**은 *파일이 바뀔 때마다 자동으로 명령을 다시* 실행해요. 코드를 저장할 때마다 테스트가 알아서 돌게 하는 식이죠.

**용어**
- **`code .`** — 현재 폴더를 VS Code로 열기(`.` = 현재 위치). VS Code의 'shell command' 설치 필요.
- **`open`** — 파일/폴더/URL을 기본 앱으로 열기. `open .` = Finder, `open https://...` = 브라우저.
- **`pbcopy` / `pbpaste`** — 클립보드(pasteboard) 복사/붙여넣기. macOS 전용.
- **`watch` / `nodemon`** — 파일 변경 감지 시 명령 자동 재실행.

**샘플 코드** — VS Code & Finder에서 열기.
```bash
# Open the current folder in VS Code
code .

# Open a specific file
code src/App.tsx

# Open the current folder in Finder
open .

# Open a link in the default browser
open https://github.com/your-project
```

**샘플 코드** — 에러 로그를 클립보드로 복사해 클로드에 붙이기.
```bash
# Copy build errors straight to the clipboard, then Cmd+V in Claude
npm run build 2>&1 | pbcopy

# Dump clipboard contents into a file
pbpaste > error-report.txt

# Combine: filter errors, take the first 20, copy them
grep "ERROR" app.log | head -20 | pbcopy
```

**샘플 코드** — 파일 변경을 감지해 자동 실행.
```bash
# Re-run tests every 2 seconds (brew install watch)
watch -n 2 'npm run test'

# Or nodemon: re-runs the app when a file changes
nodemon src/index.js
```

> ⚠️ Windows/WSL 한 줄 차이: `code .`·`open`은 그대로 또는 비슷하게 쓰지만, `pbcopy`/`pbpaste`는 macOS 전용이에요. WSL에서는 `clip.exe`(복사)와 `powershell.exe Get-Clipboard`(붙여넣기)로 대체합니다.

---

### A1.9 마무리 — 클로드와 협업하는 5가지 패턴 ⏱ ~30초
**(화면)** 5개 패턴 요약 + 핵심 한 줄(이미지 A1-IMG-3 선택적)

> 정리할게요. 오늘 배운 명령어들은 따로따로 외우는 게 아니라, **클로드와 협업하는 흐름** 속에서 묶어 쓰는 게 핵심입니다. 다섯 가지 패턴으로 기억하세요.
>
> 하나, **버그 찾기** — `grep`/`rg`로 에러 위치를 찾아 그 주변을 클로드에게 보여줍니다. 둘, **로그 수집** — `tail -f`로 지켜보다 `2>&1`로 에러까지 저장하고 `pbcopy`로 복사해 붙입니다. 셋, **설정 확인** — `cat`이나 `jq`로 구조를 파악하고 "이 값 뭐고 뭘 바꿀까?"를 묻습니다.
>
> 넷, **프로세스 관리** — `ps`/`top`으로 상태를 보고, 포트가 막히면 `lsof`로 찾아 `kill`로 정리합니다. 다섯, **자동화** — `&&`로 명령을 엮고, 클로드가 스크립트를 만들면 `chmod +x`로 권한을 줍니다.
>
> 핵심은 이거예요. **클로드는 명령어를 '제안'하고, 여러분은 결과를 '읽고 로그를 모아 피드백'합니다.** 이 왕복이 빠를수록 협업이 매끄러워져요. 그게 오늘 명령어들을 배운 진짜 이유입니다.

**이미지 스펙**
- **ID**: A1-IMG-3
- **목적(전달 정보)**: 클로드와 협업하는 5가지 작업 패턴 각각을 '어떤 명령어 조합으로 → 클로드에 무엇을 넘기는가'의 흐름으로 한눈에 정리한다.
- **유형**: 구조도
- **캔버스**: 1280×720
- **레이아웃**: 상단 제목 띠 "클로드와 협업하는 5가지 패턴". 그 아래 5개의 가로 행(위→아래), 각 행은 [패턴 이름 박스(좌, 너비 약 220px)] → [명령어 조합(중앙, 모노)] → [클로드에 넘기는 것(우)] 3단 구성. 행 사이는 1px 보더로만 구분, 좌우 여백 64px. 맨 아래에 한 줄 캡션 박스.
- **텍스트/레이블**:
  - 1 버그 찾기 | `grep` / `rg` | 에러 위치 + 주변 코드
  - 2 로그 수집 | `tail -f` → `2>&1` → `pbcopy` | 완전한 에러 로그
  - 3 설정 확인 | `cat` / `jq` | 설정 구조 + 바꿀 값 질문
  - 4 프로세스 관리 | `ps` / `top` / `lsof` → `kill` | 점유 상태 + 정리 결과
  - 5 자동화 | `&&` 연결 → `chmod +x` | 실행 가능한 스크립트
  - 하단 캡션: `클로드 = 명령 제안 · 나 = 결과 읽고 로그 모아 피드백 → 이 왕복이 빠를수록 협업이 매끄럽다`
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. 패턴 번호(1~5)와 하단 캡션의 핵심 어구만 teal #1A7F7A로 강조. 명령어는 모노 + #2B2B2B.
- **타이포**: 패턴 이름·캡션 한글은 Pretendard 1종. 명령어 조합은 JetBrains Mono(`2>&1`·`&&` 등 기호 가독) 1종.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿·마케팅 상투어. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자는 중성 회색 1단(0 1px 2px rgba(0,0,0,.06))만.

---


---


## A2 — Git 되돌리기 — 스냅샷 롤백과 푸시 되돌리기

> 대상: 비전공자·입문자 (Git을 막 시작했거나, 명령은 쳐 봤지만 "되돌리기"가 무서운 분)
> 작성 원칙: 처음 나오는 용어는 ① 풀 용어 ② 뜻 ③ 쉬운 비유 순으로 풀이 / 페이지당 1분 내외(표지·정리는 10~30초)
>
> **읽는 법** — `>` 인용 블록 = 실제로 말하는 내레이션, `(화면)` = 연출 지시, `⏱` = 목표 시간, **용어** = 처음 나오는 단어 풀이, **샘플 코드** = 화면에 띄우거나 실습으로 보여줄 코드(macOS 터미널 기준).

---

### A2.1 섹션 표지 — Git 되돌리기 ⏱ ~12초
**(화면)** 섹션 표지 "Git 되돌리기 — 스냅샷 롤백과 푸시 되돌리기" / 부제: git status · restore · reset 3종 · revert · reflog · stash

> 부록 두 번째 섹션, **Git 되돌리기**입니다. 클로드 코드로 작업하다 보면 코드가 엉키거나, 커밋을 잘못 하거나, 푸시한 다음에 버그를 발견하는 일이 꼭 생겨요. 이 섹션은 그럴 때 **"어디서 실수했고, 언제 푸시했는지"** 만 보고 어떤 명령을 쓰면 되는지를 정리합니다. 외울 건 별로 없어요. '안전한 되돌리기 한 줄'을 손에 쥐고 가는 게 목표입니다.

---

### A2.2 Git은 시간 여행 기계 ⏱ ~40초
**(화면)** 메인 / "모든 변경이 기록된다 → 언제든 과거로" 한 줄, 아래에 흐름 텍스트: 어디서 실수? → 언제 푸시? → 무엇을 쓸까?

> Git을 한마디로 하면 **"모든 변경을 기록하는 시간 여행 기계"** 예요. 코드를 저장(커밋)할 때마다 그 순간이 통째로 사진처럼 남습니다. 그래서 코드를 아무리 망쳐도 사실은 걱정할 게 없어요. **언제든 과거의 깨끗한 상태로 돌아갈 수 있으니까요.**
>
> 비전공자분이 기억할 핵심 흐름은 딱 세 단계입니다. 첫째 **어디서 실수했는가** — 파일만 망쳤는지, 커밋까지 했는지. 둘째 **언제 푸시했는가** — 내 컴퓨터에만 있는지, 이미 원격에 올렸는지. 셋째, 그 답에 따라 **무엇을 쓸지 고르는** 거예요. 이 세 질문만 던지면 나머지는 명령 한 줄로 끝납니다.

**용어**
- **커밋(commit)** — 코드를 한 번 저장하는 행위이자 그 저장본. 그 순간의 코드 전체가 사진처럼 박제됩니다.
- **푸시(push)** — 내 컴퓨터의 커밋을 원격 저장소(GitHub 등)로 올려 팀과 공유하는 것.

---

### A2.3 커밋 = 되돌아갈 수 있는 저장 지점 ⏱ ~55초
**(화면)** 메인 / "커밋 하나 = 스냅샷 = 타임캡슐" / 해시 예시 `abc1234...` 강조 / 로컬 vs 푸시됨 구분 박스 2개

> 되돌리기를 이해하려면 **커밋이 뭔지**부터 잡아야 해요. 커밋 하나는 **스냅샷(snapshot)**, 즉 그 순간의 코드 전체를 담은 **타임캡슐**입니다. '언제, 무엇을, 왜' 바꿨는지를 메시지와 함께 저장하죠.
>
> 그리고 각 커밋은 자기만의 **해시(hash)** 를 가져요. 해시는 40자리짜리 고유 번호인데, 보통 앞 7자리(`abc1234`)만 써도 충분합니다. 이게 **그 시점으로 점프하는 좌표**예요. "거기로 돌아가" 하고 좌표만 찍으면 됩니다.
>
> 여기서 가장 중요한 한 가지. **로컬(내 컴퓨터)에만 있는 커밋**은 마음대로 지우고 고쳐도 됩니다 — 아무도 안 봤으니까요. 하지만 **이미 push한 커밋**은 동료가 받았을 수 있어서, 함부로 지우면 충돌이 나요. 이때는 '지우는' 대신 **'되돌리는 새 커밋'** 을 하나 더 만듭니다. 이 둘의 차이가 이 섹션 전체를 관통하는 기준이에요.

**용어**
- **스냅샷(snapshot)** — 어떤 순간의 상태를 통째로 떠 둔 사진. 커밋 = 코드의 스냅샷.
- **해시(hash)** — 커밋마다 붙는 고유 ID(40자, 보통 앞 7자만 사용). 과거로 점프할 때 쓰는 좌표.
- **로컬 / 원격** — 로컬 = 내 컴퓨터, 원격 = GitHub 등 공유 서버. push가 둘을 잇는 다리.

---

### A2.4 현재 상태 파악 — 세 가지 필수 명령 ⏱ ~60초
**(화면)** 메인 / 명령 3개를 카드로: `git status` / `git log --oneline` / `git reflog` + 각 한 줄 설명

> 되돌리기보다 먼저 배워야 할 게 **"지금 나 어디 있지?"** 를 확인하는 습관이에요. 위험한 명령을 치기 전에 이 세 줄을 먼저 보세요.
>
> 첫째 **`git status`** — 지금 뭐가 바뀌었는지 보여줍니다. 어떤 파일이 스테이징됐는지, 안 됐는지, 충돌이 났는지를 알려줘요. 둘째 **`git log --oneline`** — 커밋 히스토리를 한 줄씩 보여줍니다. '내가 지금 어디까지 커밋했나'를 한눈에 보는 거죠.
>
> 셋째가 비밀 무기예요. **`git reflog`** — 'reference log'의 줄임말인데, **HEAD가 움직인 모든 기록**을 자동으로 남겨 둡니다. 실수로 지운 커밋도 여기에는 남아 있어서, 나중에 되살릴 수 있어요. 지금은 '이런 게 있구나'만 기억하고, 뒤에서 복구할 때 다시 만납니다.

**용어**
- **스테이징(staging)** — 커밋에 포함할 변경을 미리 골라 담는 대기 구역. `git add`가 여기에 올리는 행위.
- **HEAD** — '지금 내가 서 있는 커밋'을 가리키는 표시. 커밋을 옮겨 다닐 때 HEAD가 따라 움직입니다.
- **reflog** — HEAD가 이동한 이력을 기록한 안전 로그. 실수 복구의 최후 방어선.

**샘플 코드** — 명령을 치기 전에 항상 확인하는 세 줄.
```bash
# 1. 어떤 파일이 바뀌었나?
git status

# 2. 최근 커밋 확인 (한 줄씩)
git log --oneline
# 결과: abc1234 feat: login feature
#       def5678 fix: error message
#       ghi9012 chore: update dependencies

# 3. 실수로 지운 커밋까지 찾기
git reflog
# 결과: abc1234 HEAD@{0}: commit (message)  ← now
#       def5678 HEAD@{1}: commit (message)  ← 1 step back
#       ...older entries
```

---

### A2.5 작업 디렉터리 되돌리기 — 파일 하나만 복구 ⏱ ~55초
**(화면)** 메인 / "수정했는데 마음에 안 들면?" / `git restore <file>` 강조

> 가장 가벼운 되돌리기부터 가요. 파일을 수정했는데 **'아, 이거 아닌데'** 싶을 때예요. 아직 커밋도, add도 안 한 상태죠.
>
> 이럴 땐 **`git restore <파일>`** 한 줄이면 됩니다. 그 파일을 **최근 커밋 상태로 되돌려** 주거든요. 방금 한 수정은 버려지고, 마지막으로 저장했던 모습으로 깨끗하게 돌아갑니다. 비유하면 '저장 안 한 워드 문서를 닫고 다시 여는' 느낌이에요.
>
> 한 발 더 나가서, **특정 과거 커밋의 그 파일**을 가져오고 싶다면 `--source` 옵션을 붙입니다. `git restore --source=abc1234 src/app.ts` 처럼요. 그러면 그 시점의 파일 내용만 현재 작업 폴더로 끌어옵니다. 커밋 이력은 그대로 두고, 작업 중인 파일만 바뀌는 거예요.

**용어**
- **작업 디렉터리(working directory)** — 지금 내가 편집하고 있는 실제 파일들. 아직 커밋·스테이징되지 않은 '날것' 상태.
- **`git restore`** — 작업 디렉터리의 파일을 특정 시점 상태로 되돌리는 명령. 이력은 안 건드림.

**샘플 코드** — 파일 하나만 과거로 돌리기.
```bash
# 현재: src/app.ts를 수정했는데 실수했다
git status
# modified: src/app.ts

# 1. 파일 하나를 최근 커밋 상태로 복구
git restore src/app.ts
# → src/app.ts가 마지막 커밋 상태로 돌아옴 (수정분 폐기)

# 2. 특정 과거 커밋의 상태로 가져오기
git log --oneline src/app.ts   # 이 파일의 히스토리만
git restore --source=abc1234 src/app.ts
# → abc1234 커밋 때의 src/app.ts로 복구
# → 이력은 그대로, 작업트리만 변경됨
```

---

### A2.6 스테이징 취소 — 'git add' 다시 하기 ⏱ ~50초
**(화면)** 메인 / "add 했는데 잘못 골랐다면?" / `git restore --staged <file>` 강조

> 이번엔 한 단계 더 진행한 상황이에요. 파일을 **`git add`로 스테이징까지** 했는데, "어? 이 파일은 빼야 하는데" 하고 실수를 발견한 거죠.
>
> 그럴 땐 **`git restore --staged <파일>`** 입니다. **add만 취소**하고, 파일에 한 작업 내용은 그대로 둬요. 그러니까 변경이 사라지는 게 아니라, 그냥 '커밋 대기줄'에서 빼는 것뿐입니다. 비유하면 장바구니에 담았던 물건을 결제 직전에 빼는 거예요. 물건이 없어지는 게 아니라 장바구니에서만 빠지는 거죠.
>
> 아직 커밋은 안 한 상태니까 언제든 다시 마음 바꿔서 add하거나, 더 수정해도 됩니다. 부담 없어요.

**용어**
- **`--staged`** — '스테이징 구역'을 대상으로 하라는 표시. `git restore --staged`는 add만 되돌리고 파일 내용은 보존.

**샘플 코드** — 두 파일 중 하나만 add 취소.
```bash
# 현재: 두 파일을 add 했는데 하나는 잘못됐다
git status
# staged: src/app.ts       (O)
# staged: src/config.ts    (X, 실수)

# 1. config.ts의 add만 취소
git restore --staged src/config.ts

# 확인
git status
# staged:   src/app.ts       ← 아직 스테이징됨
# modified: src/config.ts    ← 스테이징 취소, 작업트리에만 남음
```

---

### A2.7 마지막 커밋 수정 — git commit --amend ⏱ ~55초
**(화면)** 메인 / "방금 커밋, 오타/파일 누락?" / `git commit --amend` 강조 / 하단 경고: push 후엔 --force-with-lease

> 이제 **커밋까지 해버린** 상황이에요. 방금 커밋했는데 메시지에 오타가 있거나, 넣어야 할 파일을 깜빡 빠뜨린 거죠. 새 커밋을 또 만들면 히스토리가 지저분해지니까, **마지막 커밋 자체를 갈아끼우는** 게 깔끔합니다.
>
> 이걸 하는 명령이 **`git commit --amend`** 예요. amend는 '수정하다'라는 뜻이에요. 마지막 커밋을 새 내용으로 **교체**합니다. 커밋 개수는 그대로 하나고, 대신 **해시는 새로 바뀝니다.** 내용이 달라졌으니 사실상 새 사진이 되는 거예요. 메시지만 고치려면 `--amend -m "..."`, 빠뜨린 파일을 넣으려면 그 파일을 `git add`한 뒤 `--amend --no-edit`을 쓰면 같은 커밋에 슬쩍 합쳐집니다.
>
> 딱 하나 주의할 게 있어요. **이미 push한 커밋을 amend하면 해시가 바뀌어서 원격과 어긋납니다.** 그때 push하려면 `--force`가 필요한데, 더 안전한 **`--force-with-lease`** 를 쓰세요. 이건 뒤에서 자세히 다룹니다. 푸시 전 로컬이라면 마음 편히 amend해도 됩니다.

**용어**
- **`--amend`** — 마지막 커밋을 새 내용으로 교체. 개수는 유지, 해시는 변경.
- **`--no-edit`** — 커밋 메시지는 그대로 두고 파일·내용만 갱신.
- **`--force-with-lease`** — '내가 모르는 새 변경이 원격에 없을 때만' 강제 푸시. 그냥 `--force`보다 안전.

**샘플 코드** — 메시지 수정 / 파일 추가 두 가지.
```bash
# 방법 1: 메시지만 고치기
git commit --amend -m "fix: correct message"

# 방법 2: 빠뜨린 파일을 추가하기
git add src/forgotten.ts
git commit --amend --no-edit
# → 파일이 마지막 커밋에 추가됨 (메시지는 유지)

# 확인
git log --oneline
# abc1234 fix: correct message   ← 교체됨 (해시 변경)
```

---

### A2.8 reset 3종 비교 — 어디까지 되돌릴 것인가? ⏱ ~60초
**(화면)** 메인 / 큰 비교 다이어그램(아래 이미지 스펙) / soft·mixed·hard 한 줄씩

> 여기서부터가 되돌리기의 핵심, **`git reset`** 입니다. 상황을 하나 가정할게요. 커밋이 셋(c1, c2, c3) 있는데 **c3가 실수**예요. c3를 버리고 싶은데, 문제는 **"어디까지 되돌릴 것인가"** 예요. 커밋만 취소할지, 거기 담긴 변경까지 날릴지에 따라 셋 중 하나를 고릅니다.
>
> 첫째 **`--soft`** — 커밋만 취소하고, 변경은 **스테이징에 그대로** 남깁니다. 메시지를 고치거나 커밋을 쪼개고 싶을 때 써요. 둘째 **`--mixed`**, 이게 **기본값**이에요 — 커밋과 스테이징을 둘 다 취소하고, 변경은 **작업 폴더로** 내려보냅니다. add부터 다시 골라 하고 싶을 때죠.
>
> 셋째 **`--hard`** — 커밋도, 변경도 **전부 폐기**합니다. 작업 폴더가 깨끗해져요. 진짜 버리고 싶을 때만 쓰는데, **되돌리기가 매우 어렵습니다.** 화면 그림처럼 '커밋 → 스테이징 → 작업 폴더' 세 칸 중 **어디까지 비울지**를 고른다고 생각하면 쉬워요.

**용어**
- **`git reset`** — HEAD를 과거 커밋으로 옮겨 그 이후 커밋을 취소하는 명령. soft/mixed/hard로 '어디까지 비울지'를 정함.
- **soft / mixed / hard** — soft = 커밋만 취소, mixed(기본) = 커밋+스테이징 취소, hard = 커밋+변경 전부 폐기.
- **`HEAD~1`** — '지금 커밋의 한 단계 전'. `HEAD~3`이면 세 단계 전.

**이미지 스펙**
- **ID**: A2-IMG-1
- **목적(전달 정보)**: `reset --soft / --mixed / --hard` 세 모드가 각각 '로컬 커밋 / 스테이징 / 작업트리' 중 어디까지를 되돌리는지(비우는지)를 한눈에 비교해, 모드 선택 기준을 전달한다.
- **유형**: 비교표(겸 다이어그램)
- **캔버스**: 1280×720
- **레이아웃**: 상단에 제목 "git reset 3종 — 어디까지 되돌리나" (중앙 정렬). 그 아래 가로 3열 카드. 각 카드는 동일 폭(약 380px), 카드 사이 32px 여백, 좌우 바깥 여백 48px. 각 카드 내부는 위→아래로 4행 구조: ① 모드 이름(`--soft` / `--mixed` / `--hard`), ② 한 줄 설명, ③ 세 칸 상태 막대(가로로 '로컬 커밋 | 스테이징 | 작업트리' 세 칸을 1px 보더로 나눔), ④ 언제 쓰나. 세 칸 상태 막대에서 '되돌려지는(영향받는) 칸'은 teal 채움, 그대로 유지되는 칸은 크림 배경. soft = '로컬 커밋' 1칸만 teal, mixed = '로컬 커밋'+'스테이징' 2칸 teal, hard = 세 칸 모두 teal. 막대 아래에 작은 모노 라벨로 변경이 '남는 위치'(soft→스테이징, mixed→작업트리, hard→없음)를 표기.
- **텍스트/레이블**: 카드1 "`--soft` · 커밋만 취소, 변경은 스테이징에 유지 · 메시지 수정·커밋 분할". 카드2 "`--mixed` (기본값) · 커밋+스테이징 취소, 변경은 작업트리로 · add부터 다시". 카드3 "`--hard` · 커밋+변경 전부 폐기, 작업트리 clean · 되돌릴 수 없음(주의)". 상태 막대 칸 라벨: "로컬 커밋 / 스테이징 / 작업트리". 하단 좌측에 작은 캡션 "변경이 남는 위치 →".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8, 액센트 teal #1A7F7A(영향받는 칸 채움·모드 이름에만). hard 카드의 '되돌릴 수 없음' 문구는 본문색 #2B2B2B에 굵기로만 강조(빨강·컬러 그림자 금지).
- **타이포**: 본문/라벨은 Pretendard(한글 가독성·숫자 정렬 안정) 1종, 명령어·`--soft` 등 코드 토큰은 JetBrains Mono(0과 O 구분, 등폭으로 세 칸 정렬이 또렷). 코드와 본문을 폰트로 구분해 '명령'과 '설명'을 시각적으로 분리.
- **금지(anti-ai-slop)**: 그라데이션 일체·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿·마케팅 상투어 금지. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자는 쓰더라도 0 1px 2px rgba(0,0,0,.06) 한 단만.

---

### A2.9 reset --soft: 메시지나 분할만 수정하기 ⏱ ~50초
**(화면)** 메인 / "메시지 고치기·커밋 쪼개기" / `git reset --soft HEAD~1` 강조

> 이제 세 모드를 하나씩 실제로 써 봅니다. 먼저 **`--soft`** 예요. 쓰는 상황은 딱 둘이에요. **커밋 메시지에 오타**가 났거나, 한 덩어리로 묶은 커밋을 **여러 개로 쪼개고** 싶을 때.
>
> `git reset --soft HEAD~1`을 치면 마지막 커밋이 취소되는데, **변경 내용은 스테이징에 고스란히 남아 있어요.** 그래서 `git status`를 보면 변경이 여전히 add된 채로 대기하고 있죠. 메시지를 다시 써서 커밋만 하면 끝입니다. 결과적으로 **커밋 개수는 똑같고, 해시만 새로** 바뀌어요. 앞에서 본 amend랑 비슷하지만, soft reset은 여러 단계(`HEAD~3` 등) 한꺼번에도 다룰 수 있다는 게 차이예요.

**샘플 코드** — 마지막 커밋만 취소, 변경은 유지.
```bash
# 현재 상황
git log --oneline
# abc1234 chore: typo in message
# def5678 feat: login

# 마지막 커밋만 취소 (변경은 유지)
git reset --soft HEAD~1

# 상태 확인
git status
# staged: (변경이 여기 있음 — 아직 스테이징됨)

# 메시지 다시 작성 후 커밋
git commit -m "feat: login feature"

# 결과: 커밋 1개 (개수는 같고, 해시만 변경)
```

---

### A2.10 reset --mixed: 처음부터 add하기 ⏱ ~50초
**(화면)** 메인 / "어떤 파일을 add할지 다시 고르기" / `git reset HEAD~1`(기본값) 강조

> 두 번째는 **`--mixed`**, 옵션을 안 붙이면 자동으로 적용되는 **기본값**이에요. 쓰는 상황은 "커밋은 했는데, **어떤 파일들을 add했는지 다시 고르고** 싶다" 일 때입니다.
>
> `git reset HEAD~1`을 치면 — 또는 똑같이 `git reset --mixed HEAD~1` — 마지막 커밋이 취소되고, 변경이 **작업 폴더로 내려옵니다.** 스테이징도 풀려 있어요. 그래서 `git status`를 보면 파일들이 'modified'로, **add 안 된 상태**로 보입니다. 여기서 정말 넣고 싶은 파일만 골라 다시 `git add`하고 커밋하면 돼요. 한 커밋에 너무 많은 파일을 우르르 넣었을 때, 깔끔하게 다시 나눠 담는 용도로 딱입니다.

**샘플 코드** — 커밋 취소 후 원하는 파일만 다시 add.
```bash
# 현재 상황
git log --oneline
# abc1234 fix: edit several files
# def5678 feat: login

# 마지막 커밋 취소 (변경은 작업트리로)
git reset HEAD~1
# 또는
git reset --mixed HEAD~1   # 같은 명령

# 상태 확인
git status
# modified: src/app.ts      ← 스테이징 아님
# modified: src/config.ts   ← 스테이징 아님

# 원하는 파일만 골라 다시 add
git add src/app.ts
git commit -m "fix: only app.ts"
```

---

### A2.11 reset --hard: 확실히 버리기 (되돌릴 수 없음!) ⏱ ~55초
**(화면)** 메인 / 경고 톤 / "커밋·변경 전부 폐기" / `git reset --hard HEAD~1` 강조 / 하단 경고: 로컬에서만!

> 세 번째 **`--hard`** 는 가장 강력하고, 가장 조심해야 합니다. 코드를 **완전히 버리고** 과거의 깨끗한 커밋으로 통째로 돌아가고 싶을 때 써요.
>
> `git reset --hard HEAD~1`을 치면 마지막 커밋도 지워지고, 거기 담긴 변경도 지워지고, **작업 폴더까지 그 시점으로 싹** 맞춰집니다. `git status`가 'working tree clean'으로 깨끗해져요. 특정 커밋으로 점프하고 싶으면 `git reset --hard def5678`처럼 해시를 직접 찍으면, 그 사이 커밋이 전부 사라집니다.
>
> 화면의 경고를 꼭 짚어 주세요. 이건 **아직 push 안 한 로컬에서만** 쓰세요. 그리고 **한 번 하면 되돌리기가 매우 어렵습니다.** 다행히 앞에서 본 `git reflog`로 복구할 길은 남아 있지만 시간이 걸리니까, hard 전에는 항상 `git log`로 '정말 버려도 되는지' 한 번 더 확인하는 습관을 들이세요.

**용어**
- **working tree clean** — 작업 폴더에 커밋 안 된 변경이 하나도 없는, 완전히 깨끗한 상태.

**샘플 코드** — 커밋·변경을 완전히 폐기.
```bash
# 현재 상황 (이 상태가 정말 버려도 되는지 확인!)
git log --oneline
# abc1234 feat: new feature (broken)
# def5678 feat: login
# ghi9012 init: bootstrap

# 한 단계 뒤로 (c3 버림)
git reset --hard HEAD~1

# 또는 특정 커밋으로 점프 (그 사이 모두 버림)
git reset --hard def5678

# 상태 확인
git log --oneline
# def5678 feat: login   ← abc1234가 사라짐
git status
# working tree clean    ← 변경 없음

# 주의: git reflog로 복구는 가능하지만 시간이 걸림
```

---

### A2.12 안전한 되돌리기: git revert (협업 필수) ⏱ ~60초
**(화면)** 메인 / "이미 push했다면? reset 금지" / `git revert` 강조 / "거꾸로 적용하는 새 커밋" 도식

> 자, 지금까지는 전부 **push 전** 이야기였어요. 이제 분위기가 완전히 바뀝니다. **이미 push한 커밋**을 되돌리고 싶다면 reset은 **금지**예요. 동료가 이미 그 커밋을 받았을 수 있는데, 내가 히스토리를 지워버리면 다음에 동료가 push·pull할 때 충돌이 터지거든요.
>
> 그래서 협업에서는 **`git revert`** 를 씁니다. revert는 '되돌리다'라는 뜻인데, 핵심은 **'지운다'가 아니라 '취소하는 새 커밋을 하나 더 만든다'** 예요. 망친 커밋이 한 일을 **거꾸로 적용**한 커밋을 위에 얹는 거죠. 회계로 치면 잘못된 거래를 지우는 게 아니라, '반대 거래'를 한 줄 더 적어서 상쇄하는 거예요.
>
> 이 방식의 장점은 **기존 이력(c1, c2, c3)이 그대로 보존**된다는 거예요. 누가 무엇을 언제 취소했는지가 기록으로 남고, 동료들은 그냥 **평범한 pull**로 받으면 됩니다. 이력 충돌이 없어요. 협업 브랜치에서 푸시된 걸 되돌릴 땐 이거 하나면 됩니다.

**용어**
- **`git revert`** — 지정한 커밋의 변경을 거꾸로 적용한 '새 커밋'을 만들어 효과를 상쇄. 기존 이력은 그대로 보존.
- **pull** — 원격의 최신 커밋을 내 로컬로 받아 합치는 것. revert는 평범한 pull로 안전하게 전파됨.

**샘플 코드** — 푸시된 커밋을 새 커밋으로 상쇄.
```bash
# 현재 상황 (c3가 원격에 push됨, 동료도 pull했을 수 있음)
git log --oneline
# abc1234 feat: new feature (broken)
# def5678 feat: login
# ghi9012 init: bootstrap

# reset 금지! revert로 새 커밋 만들기
git revert HEAD   # 마지막 커밋(abc1234)을 되돌리는 새 커밋 생성

# 충돌이 나면 파일 수정 후
git add .
git revert --continue

# 상태 확인
git log --oneline
# jkl3456 Revert "feat: new feature"  ← 새 커밋
# abc1234 feat: new feature           ← 여전히 있음!
# def5678 feat: login
# ghi9012 init: bootstrap

# push
git push origin main
```

---

### A2.13 푸시 되돌리기 핵심 결정도 ⏱ ~55초
**(화면)** 메인 / 의사결정 플로우(아래 이미지 스펙) / "세 가지를 먼저 물어라" 강조

> 푸시한 걸 되돌릴 때, 사람들이 가장 헷갈려 하는 게 **"reset이야 revert야?"** 예요. 답은 외우는 게 아니라, 화면의 결정도처럼 **세 가지 질문**을 순서대로 던지면 자동으로 나옵니다.
>
> 첫째, **혼자 쓰는 브랜치인가?** 나만의 `feature/내기능` 브랜치처럼 아무도 안 건드리는 곳인지. 둘째, **팀이 함께 쓰는 브랜치인가?** `main`이나 `develop`처럼 여럿이 공유하는 곳인지. 셋째, **팀이 이미 그걸 pull했는가?**
>
> 이 답에 따라 갈려요. 혼자 쓰는 브랜치면 reset과 강제 푸시가 가능하고, 팀 브랜치거나 누가 이미 받았으면 무조건 revert예요. 애매하면 **revert가 항상 안전한 정답**이라고 생각하셔도 됩니다. 다음 슬라이드부터 두 갈래를 각각 실습합니다.

**이미지 스펙**
- **ID**: A2-IMG-2
- **목적(전달 정보)**: 이미 push된 커밋을 되돌릴 때, 브랜치 종류·공유 여부에 따라 'revert'와 'reset+force-with-lease' 중 무엇을 선택해야 하는지의 의사결정 경로를 전달한다.
- **유형**: 플로우차트(의사결정 다이어그램)
- **캔버스**: 1280×720
- **레이아웃**: 위→아래 세로 흐름. 최상단 시작 박스 1개(중앙). 아래로 첫 번째 마름모형 질문, 거기서 좌/우(또는 아래) 분기로 두 번째 질문, 최종적으로 3개의 결과 박스로 수렴. 화살표는 모두 1px teal 직선·직각 꺾임, 분기 라벨(예/아니오)은 화살표 옆에 작은 모노 텍스트. 박스는 직사각(모서리 4px), 질문은 마름모(또는 모서리 0의 사각으로 구분), 결과 박스 3개는 하단에 가로 정렬. 박스 간 수직 간격 약 48px, 좌우 바깥 여백 64px.
- **텍스트/레이블**: 시작 "이미 push한 커밋을 되돌리고 싶다". 질문1 "혼자 쓰는 브랜치인가? (feature/my-*)". 질문1 '아니오(팀 브랜치)' → 질문2 "팀이 이미 pull했는가?". 결과A(질문1 예) "git reset --hard + git push --force-with-lease  · 개인 브랜치만". 결과B(질문2 예 또는 팀 브랜치) "git revert <커밋> && git push  · 협업 권장(안전)". 결과C(불확실/혼선) "팀에 먼저 알리고 협의 후 진행". 하단 캡션 "애매하면 revert가 항상 안전".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8, 액센트 teal #1A7F7A는 화살표·'권장(안전)' 결과 박스 보더에만. 위험 경로(reset+force) 결과 박스는 컬러로 겁주지 말고 보더+굵은 라벨 "개인 브랜치만"으로만 표시.
- **타이포**: 본문/질문은 Pretendard 1종(분기 의사결정 문장 가독성), 명령어(`git revert`·`--force-with-lease` 등)는 JetBrains Mono로 등폭 표기해 '명령'을 본문과 분리.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 액센트바·이모지 불릿·마케팅 상투어 금지. 구획·화살표는 1px 보더/선과 여백으로만. 모서리 0~8px. 그림자는 0 1px 2px rgba(0,0,0,.06) 한 단만 허용.

---

### A2.14 푸시된 것 되돌리기: revert (협업, 권장) ⏱ ~50초
**(화면)** 메인 / "팀 브랜치라면 무조건 revert" / 결과 비교 박스

> 결정도에서 **'팀이 함께 쓰는 브랜치'** 로 갈렸다면, 답은 **revert** 하나입니다. `main`이나 `develop`에 push한 커밋이 버그였을 때 쓰는 가장 표준적인 방법이에요.
>
> 흐름은 단순해요. `git revert <커밋>`을 치면 에디터가 열려서 'Revert ...'라는 커밋 메시지를 보여줍니다. 그대로 저장하면 되돌리는 새 커밋이 만들어지고, 충돌이 없으면 바로 `git push`예요. 결과적으로 **기존 히스토리는 그대로**고, 코드만 이전 상태로 돌아갑니다. 동료들은 평범하게 pull만 하면 'Revert' 커밋 하나를 더 받을 뿐이에요. 누구의 작업도 사라지지 않습니다.

**샘플 코드** — 협업 브랜치에서 안전하게 되돌리기.
```bash
# 팀의 main 브랜치에서 실수한 커밋
git log --oneline
# abc1234 feat: new feature  ← pushed, but buggy!
# def5678 feat: login

# revert로 새 커밋 생성
git revert abc1234   # 또는 git revert HEAD

# 에디터가 열림 → 커밋 메시지 확인 후 저장
# 기본 메시지: Revert "feat: new feature"

# 충돌 없으면 바로 push
git push origin main

# 결과: 팀원들이 pull하면
# - 기존 히스토리는 그대로
# - "Revert" 커밋만 추가로 받음
# - 코드는 이전 상태로 돌아감
```

---

### A2.15 푸시된 것 되돌리기: reset + force (개인 브랜치만!) ⏱ ~60초
**(화면)** 메인 / 강한 경고 톤 / "팀 브랜치 절대 금지" / `--force-with-lease` 강조

> 반대로 결정도에서 **'혼자 쓰는 브랜치'** 로 갈렸다면, 비로소 **reset + 강제 푸시**가 허용됩니다. 예를 들어 나만 쓰는 `feature/my-feature`에서 실수 커밋을 깔끔히 지우고 싶을 때예요.
>
> 두 단계입니다. 먼저 로컬에서 `git reset --hard HEAD~1`로 이력을 되돌리고, 그다음 **원격도 강제로 맞춰야** 해요. 로컬은 과거로 갔는데 원격은 아직 그 커밋을 들고 있으니까요. 이때 그냥 `--force`가 아니라 **`--force-with-lease`** 를 쓰세요. 이건 '내가 마지막으로 본 이후 원격에 **누가 새로 올린 게 없을 때만** 밀어붙이는' 안전장치예요. 누가 그새 push했으면 실패하면서 막아 줍니다.
>
> 가장 중요한 경고. **`main`이나 `develop` 같은 팀 브랜치에서는 절대 금지입니다.** 강제 푸시는 팀의 히스토리를 덮어써서 동료 작업을 통째로 날릴 수 있어요. '혼자 쓰는 게 확실한 브랜치'에서만, 그것도 `--force-with-lease`로만 쓰세요. 만약 reset을 잘못했다면 `git reflog`로 원래 해시를 찾아 되돌릴 수 있습니다.

**용어**
- **강제 푸시(force push)** — 원격 히스토리를 내 로컬로 덮어쓰는 push. 팀 작업을 날릴 수 있어 협업 브랜치에선 금지.
- **`--force-with-lease`** — '내가 본 이후 원격에 새 변경이 없을 때만' 강제 푸시. 모르는 변경이 있으면 실패해 사고를 막음.

**샘플 코드** — 개인 브랜치에서만 reset --hard + 강제 푸시.
```bash
# 개인 feature 브랜치에서 실수
git log --oneline
# abc1234 feat: my feature  ← pushed, but buggy!
# def5678 feat: login

# 1단계: 로컬 이력 되돌리기
git reset --hard HEAD~1
git log --oneline
# def5678 feat: login   ← abc1234가 사라짐

# 2단계: 원격도 강제로 맞추기
# ⚠️ 주의: 협업 브랜치(main/develop)에서 절대 금지!
git push --force-with-lease origin feature/my-feature
# --force-with-lease: 내가 모르는 새 변경이 있으면 실패 (더 안전)

# 만약 reset을 실수로 했다면
git reflog                       # 원래 상태의 해시 찾기
git reset --hard <original_hash>
git push --force-with-lease origin feature/my-feature
```

---

### A2.16 실수로 지운 커밋 복구 — git reflog ⏱ ~55초
**(화면)** 메인 / "reset --hard 했는데 복구되나?" / `git reflog` 강조 / "90일 보존" 박스

> 앞에서 계속 언급했던 안전망, 드디어 자세히 봅니다. **`git reset --hard`로 커밋 여러 개를 날렸는데, 복구가 될까?** 다행히 **됩니다.**
>
> 비밀은 **`git reflog`** 예요. git은 HEAD가 움직일 때마다, **모든 이동을 자동으로 기록**해 둡니다. reset으로 사라진 것처럼 보이는 커밋도, 사실 그 해시는 reflog에 남아 있어요. 게다가 **기본 90일** 동안 보존됩니다. 그러니까 reflog를 열어서 '날리기 직전'의 해시를 찾고, `git reset --hard <그 해시>`로 다시 그 시점으로 점프하면 복구 끝이에요.
>
> 한마디로 reflog는 **'git reset --hard 했다'의 최후 보안선**입니다. 일반 `git log`에는 안 보이는 커밋도 reflog에는 있다는 걸 기억해 두면, hard reset이 한결 덜 무서워집니다.

**샘플 코드** — reflog로 날린 커밋 되살리기.
```bash
# 실수: reset --hard로 여러 커밋을 날렸다!
git log --oneline
# c2만 남음... c3, c4, c5가 사라짐

# 1단계: reflog로 원래 위치 찾기
git reflog
# abc1234 HEAD@{0}: reset: moving to HEAD~1
# def5678 HEAD@{1}: commit: feat: add c5   ← 지운 커밋!
# ghi9012 HEAD@{2}: commit: feat: add c4
# ...

# 2단계: 원래 상태로 복구
git reset --hard def5678   # c5가 있던 해시로 이동
git log --oneline
# def5678 feat: c5   ← 복구됨!
# ghi9012 feat: c4
# ...

# 주의: 기본 보존 기간 90일 (설정으로 변경 가능)
```

---

### A2.17 머지 취소 — 시점에 따라 다른 방법 ⏱ ~60초
**(화면)** 메인 / 머지 취소 3시나리오 카드: 진행 중 / push 전 / push 후

> 브랜치를 합치는 **머지(merge)** 도 되돌릴 수 있는데, 핵심은 **"어느 시점이냐"** 에 따라 방법이 다르다는 거예요. 세 가지로 나눠 보면 깔끔합니다.
>
> 첫째, **충돌이 나서 머지가 진행 중인 상태**라면 — 아직 끝나지도 않았으니 그냥 멈추면 돼요. **`git merge --abort`**, 머지 시작 직전으로 깨끗하게 되돌아갑니다. 둘째, **머지는 끝났는데 아직 push 전**이라면 — `git reset --hard ORIG_HEAD`를 씁니다. 여기서 `ORIG_HEAD`는 git이 머지 직전 위치를 **자동으로 기억해 둔 표시**예요. 그 자리로 돌아가는 거죠.
>
> 셋째, **이미 push했다**면 — 앞에서 배운 원칙 그대로 revert예요. 단, 머지 커밋은 부모가 둘이라 어느 쪽을 기준으로 되돌릴지 알려줘야 합니다. **`git revert -m 1 <머지커밋>`** 에서 `-m 1`은 '첫 번째 부모(보통 main 쪽)를 기준으로 되돌려라'라는 뜻이에요. 진행 중 → abort, push 전 → ORIG_HEAD, push 후 → revert. 이 세 칸만 기억하세요.

**용어**
- **머지(merge)** — 두 브랜치의 변경을 하나로 합치는 것. 합칠 때 새 '머지 커밋'이 생기기도 함.
- **`ORIG_HEAD`** — reset·merge 같은 큰 이동 직전의 위치를 git이 자동으로 저장해 둔 표시. '바로 직전으로' 되돌릴 때 유용.
- **`-m 1`** — 머지 커밋의 첫 번째 부모를 기준으로 삼으라는 옵션. 머지 revert엔 필수.

**샘플 코드** — 시점별 머지 취소.
```bash
# 상황 1: 충돌 중, 해결이 복잡함
git merge feature
# CONFLICT 발생...
git merge --abort
# → 머지 시작 직전으로 복귀

# 상황 2: 머지는 끝났는데 push 전
git merge --no-ff feature   # 머지 커밋 생성됨
# 실수 발견, 취소!
git reset --hard ORIG_HEAD
# ORIG_HEAD = 머지 직전 위치 (git이 자동 기록)

# 상황 3: 이미 push함
git log --oneline
# abc1234 Merge pull request ...
# def5678 feat: login
git revert -m 1 abc1234
# -m 1: 머지의 첫 번째 부모(보통 main) 기준으로 되돌림
git push origin main
```

---

### A2.18 임시 보관 — git stash ⏱ ~50초
**(화면)** 메인 / "작업 중인데 급한 일이?" / `git stash` / `git stash pop` 강조

> 되돌리기는 아니지만, 같이 알아 두면 정말 유용한 **`git stash`** 예요. stash는 '몰래 넣어 두다'라는 뜻인데, 상황을 떠올려 보세요. 파일을 한창 수정 중인데 갑자기 **다른 작업**이 끼어듭니다 — 급한 브랜치를 받아야 하거나, develop을 동기화해야 하거나.
>
> 지금 작업은 아직 커밋하기엔 어중간하죠. 이럴 때 **`git stash`** 를 치면, 현재 변경을 **임시 서랍에 쏙 넣어** 두고 작업 폴더를 깨끗하게 비웁니다. 그 상태로 pull이든 브랜치 전환이든 자유롭게 하고, 일이 끝나면 **`git stash pop`** 으로 서랍에서 변경을 **다시 꺼내** 와요. 잠깐 책상을 치워 뒀다가 다시 펼치는 느낌이에요. 커밋하기 애매한 작업을 안전하게 옆에 치워 두는 도구라고 기억하세요.

**용어**
- **`git stash`** — 커밋하지 않은 현재 변경을 임시 보관소에 넣고 작업 폴더를 비움.
- **`git stash pop` / `apply`** — 보관한 변경을 다시 꺼냄. `pop`은 꺼내며 보관본 삭제, `apply`는 보관본을 남겨 둠.

**샘플 코드** — 변경을 임시로 치워 두고 다시 꺼내기.
```bash
# 현재: src/app.ts 수정 중인데 급히 develop을 동기화해야 함
git status
# modified: src/app.ts

# 변경을 임시 보관
git stash
# "Saved working directory..." 메시지
git status
# working tree clean   ← 작업트리가 깨끗해짐

# 다른 작업 (pull, 브랜치 전환 등)
git pull origin develop

# 보관한 변경 복구
git stash pop
# 또는
git stash apply   # 보관본을 남기고 복구

git status
# modified: src/app.ts   ← 복구됨
```

---

### A2.19 실전 시나리오 1: 로컬 커밋 실수 ⏱ ~45초
**(화면)** 메인 / "방금 커밋, push 전" / amend 위주

> 이제 배운 걸 실전 상황에 붙여 봅니다. 첫 번째 시나리오는 가장 흔해요. **방금 커밋했는데 메시지가 틀렸거나, 넣어야 할 파일을 빼먹은** 경우예요. 핵심은 **아직 push를 안 했다**는 점이에요. 로컬에만 있으니 부담 없이 고칠 수 있어요.
>
> 메시지만 틀렸으면 `git commit --amend -m "..."` 한 줄. 파일을 빠뜨렸으면 그 파일을 `git add`한 뒤 `git commit --amend --no-edit` — 메시지는 그대로 두고 파일만 마지막 커밋에 합칩니다. 둘 다 새 커밋을 만들지 않고 **마지막 커밋을 깔끔하게 교체**하니까, 히스토리가 지저분해지지 않아요.

**샘플 코드** — 로컬 커밋 실수 빠르게 해결.
```bash
# 상황: 방금 커밋했는데 메시지 오타 + 파일 누락
git log --oneline
# abc1234 chore: typo in message

# 방법 1: 메시지만 고치기
git commit --amend -m "feat: correct message"

# 방법 2: 파일을 빠뜨렸다면
git add src/forgotten.ts
git commit --amend --no-edit

# 확인
git log --oneline
# abc1234 feat: correct message   ← 메시지 + 파일 모두 반영
```

---

### A2.20 실전 시나리오 2: Push 후 버그 발견 (협업 브랜치) ⏱ ~50초
**(화면)** 메인 / "main에 push, 동료도 pull?" / revert 위주

> 두 번째 시나리오, 식은땀 나는 순간이에요. **`main`에 push했는데 버그를 발견**했어요. 동료가 이미 그걸 pull했을 수도 있고요. 여기서 **reset을 떠올렸다면 멈추세요.** 팀 브랜치에서 reset은 금지입니다.
>
> 정답은 **revert**예요. `git revert abc1234`로 그 커밋을 되돌리는 **새 커밋**을 만들고, `git push origin main`으로 올립니다. 그러면 코드는 이전 상태로 안전하게 돌아가고, **히스토리는 완전하게 보존**돼요. 누가 무엇을 취소했는지까지 기록에 남죠. 동료들은 평범하게 pull만 하면 끝입니다. 충돌도, 잃어버린 작업도 없어요.

**샘플 코드** — 협업 브랜치 버그를 revert로 수습.
```bash
# 상황
git log --oneline
# abc1234 feat: new feature  ← pushed to main, but buggy!

# 1단계: revert로 새 커밋 생성
git revert abc1234
# → 에디터에서 메시지 확인 후 저장

# 2단계: push
git push origin main

# 결과
git log --oneline
# def5678 Revert "feat: new feature"  ← 새 커밋
# abc1234 feat: new feature           ← 여전히 있음

# 동료가 pull하면
# - 코드는 이전 상태로 돌아감
# - 히스토리는 완전함 (누가 무엇을 취소했는지 기록됨)
```

---

### A2.21 실전 시나리오 3: 개인 브랜치 정리 ⏱ ~50초
**(화면)** 메인 / "내 feature 브랜치, 실수 커밋 여러 개" / reset --hard + force-with-lease

> 세 번째 시나리오는 정반대예요. **혼자 쓰는 `feature/login` 브랜치**에서 실수 커밋이 여러 개 쌓였어요. PR을 올리기 전에 **깔끔하게 정리**하고 싶죠. 혼자 쓰는 브랜치니까, 이번엔 reset과 강제 푸시가 **허용**됩니다.
>
> 좋은 커밋(`ghi9012`)까지 `git reset --hard`로 되돌려서 실수들을 한 번에 걷어내고, `git push --force-with-lease`로 원격도 맞춥니다. 그다음 제대로 다시 작업해서 커밋하면, **깔끔한 한두 개 커밋**으로 PR을 만들 수 있어요. 다시 강조하지만, 이건 **그 브랜치를 나만 쓴다는 게 확실할 때만** 하는 거예요.

**샘플 코드** — 개인 브랜치를 좋은 커밋으로 정리.
```bash
# 상황: feature/login 브랜치, 여러 실수 커밋 후 push
git log --oneline
# abc1234 fix: bug fix
# def5678 feat: buggy feature
# ghi9012 feat: login skeleton

# 좋은 커밋(ghi9012)으로 되돌리기
git reset --hard ghi9012

# 강제 push (개인 브랜치이므로 가능)
git push --force-with-lease origin feature/login

# 다시 작업
git add .
git commit -m "feat: complete login"
git push origin feature/login

# 결과: 깔끔한 1개 커밋으로 PR 생성
```

---

### A2.22 안전 체크리스트 — 매번 확인하세요 ⏱ ~50초
**(화면)** 메인 / 체크리스트 5항목 / "reset --hard·--force 전 5초 멈춤" 강조

> 위험한 명령인 **`reset --hard`나 `--force`** 를 치기 전에, 딱 **5초만 멈추는** 습관을 들이세요. 그 5초가 사고를 거의 다 막아 줍니다. 다섯 가지를 순서대로 자문하세요.
>
> 첫째 `git status` — 지금 상태는 뭔가. 둘째 `git log --oneline` — 어디까지 커밋했나. 셋째, **원격에 push 했나?** push했으면 revert. 넷째, **팀이 이미 pull했나?** 그럼 reset·force는 절대 금지. 다섯째, **정말 버려도 되는 작업인가?**
>
> 이 다섯 질문에 답하고 나면, 어떤 명령을 써야 하는지가 거의 자동으로 정해져요. push 안 했으면 reset, push했고 팀 브랜치면 revert, 혼자 쓰는 브랜치면 reset + force-with-lease. 위험한 명령일수록 손보다 머리가 먼저 가야 합니다.

**샘플 코드** — 위험 명령 전에 항상 실행하는 확인 3줄.
```bash
# 위험한 명령 전에 항상 이 3줄
git status        # → 뭐가 바뀌었나?
git log --oneline -5   # → 최근 5개 커밋 확인
git branch -a     # → 지금 어느 브랜치인가?

# 그다음 판단
# push 했나?       → 협업 브랜치? → revert 사용
# push 안 했나?    → reset 사용 (local only)
# 혼자 쓰는 브랜치? → reset + force-with-lease 가능
```

---

### A2.23 명령 선택 가이드 — 빠른 참조 ⏱ ~50초
**(화면)** 메인 / "무엇을 하고 싶은가 → 어느 명령" 매핑 표(아래 이미지 스펙)

> 마지막 실전 슬라이드는 **빠른 참조표**예요. 외울 필요 없어요. 녹화가 끝나면 이 한 장만 캡처해 두고, 필요할 때 **"내가 하고 싶은 게 뭐지?"** 만 보고 오른쪽 명령을 찾으면 됩니다.
>
> 파일만 되돌리고 싶다 → `git restore`. add를 취소하고 싶다 → `git restore --staged`. 마지막 커밋 메시지를 고치고 싶다 → `git commit --amend`. push 전 커밋을 취소 → `git reset` 3종. **이미 push한 걸 되돌리기(협업)** → `git revert`. 개인 브랜치 정리 → `reset --hard` + `force-with-lease`. 실수로 날린 커밋 복구 → `git reflog`. 머지 취소는 시점별로 abort / ORIG_HEAD / revert. 이 표가 이 섹션 전체의 요약이에요.

**샘플 코드** — 상황별 명령 한눈에.
```text
# 파일 수정 (아직 add 안 함)
file      -> git restore <file>

# 파일 add했는데 취소
add       -> git restore --staged <file>

# 마지막 커밋 메시지 수정
message   -> git commit --amend -m "..."

# 마지막 커밋 취소 (아직 push 안 함)
reset     -> git reset --soft|mixed|hard HEAD~1

# 이미 push한 커밋 되돌리기 (협업)
revert    -> git revert <commit> && git push

# 개인 브랜치 정리 (reset + force)
force     -> git reset --hard <commit>
             && git push --force-with-lease

# 커밋 완전 복구 (reset --hard 실수)
reflog    -> git reflog && git reset --hard <hash>

# 머지 취소 (상황별)
merge abort    -> git merge --abort
merge undo     -> git reset --hard ORIG_HEAD
merge reverted -> git revert -m 1 <merge-commit>
```

**이미지 스펙**
- **목적(전달 정보)**: "하고 싶은 일(왼쪽) → 써야 할 명령(오른쪽)"의 1:1 매핑을 한 장으로 제공해, 실전에서 명령을 즉시 찾게 한다.
- **ID**: A2-IMG-3
- **유형**: 비교표(매핑 테이블)
- **캔버스**: 1280×720
- **레이아웃**: 2열 테이블. 좌열 "하고 싶은 일"(한국어 상황), 우열 "명령"(모노 코드). 헤더 행 1개 + 데이터 9행. 각 행은 1px 보더로 구분, 행 높이 균등(약 60px), 좌우 셀 패딩 16px. 좌열 폭 38%, 우열 폭 62%. 표 바깥 여백 상하 48px·좌우 64px. 표 상단에 제목 "상황 → 명령 빠른 참조" 좌측 정렬.
- **텍스트/레이블**: 행 순서대로 — "파일 수정(add 전) | `git restore <file>`", "add 취소 | `git restore --staged <file>`", "마지막 커밋 메시지 | `git commit --amend -m \"...\"`", "push 전 커밋 취소 | `git reset --soft|mixed|hard HEAD~1`", "push한 커밋 되돌리기(협업) | `git revert <commit> && git push`", "개인 브랜치 정리 | `git reset --hard <commit> && git push --force-with-lease`", "날린 커밋 복구 | `git reflog && git reset --hard <hash>`", "머지 중단(진행 중) | `git merge --abort`", "머지 취소(push 전/후) | `git reset --hard ORIG_HEAD` / `git revert -m 1 <merge>`". 헤더 "하고 싶은 일 | 명령".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. 헤더 행 배경만 살짝 다른 톤(#E7E2D9 같은 무채색 한 단), 액센트 teal #1A7F7A는 'push한 커밋 되돌리기(협업) → revert' 행의 좌측 셀 텍스트에만 사용해 가장 중요한 안전 명령을 강조. 그 외 컬러 사용 금지.
- **타이포**: 좌열(상황) Pretendard, 우열(명령) JetBrains Mono — 등폭이라 여러 행의 명령이 세로로 정렬되어 스캔이 빠르고 `|`·`<>` 같은 기호가 또렷. 두 폰트로 '상황'과 '명령'을 구분.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 액센트바·이모지 불릿·마케팅 상투어 금지. 행 구분은 1px 보더로만(zebra 줄무늬 색 금지). 모서리 0~4px. 그림자는 0 1px 2px rgba(0,0,0,.06) 한 단까지만.

---

### A2.24 추가 자료 및 팁 ⏱ ~40초
**(화면)** 메인 / 도움말·시각화·GUI 도구 목록

> 마무리 전에, 더 편하게 git을 다루는 도구 몇 개만 소개할게요. 막히면 언제든 **`git help <명령>`** — 예를 들어 `git help reset` — 으로 공식 문서를 볼 수 있어요. 히스토리를 그림으로 보고 싶으면 **`git log --graph --all`**, 모든 브랜치의 HEAD 이동까지 보려면 **`git reflog --all`** 이 유용합니다.
>
> 터미널이 아직 어색하면 **GUI 도구**도 좋아요. 초보자에겐 GitHub Desktop이 직관적이고, VS Code를 쓴다면 'Git Graph' 확장으로 히스토리를 시각화할 수 있어요. 터미널 프롬프트에 현재 브랜치·상태를 띄워 주는 oh-my-zsh 플러그인도 추천합니다. 손에 맞는 도구를 하나 정해 두면 되돌리기가 훨씬 덜 무서워져요.

**용어**
- **GUI 도구** — 명령 대신 버튼·그래프로 git을 다루는 프로그램(GitHub Desktop, VS Code Git Graph 등). 초보자가 히스토리를 직관적으로 보기 좋음.

**샘플 코드** — 알아 두면 좋은 보조 명령.
```bash
# 공식 문서 보기
git help reset

# 브랜치 히스토리를 그래프로
git log --graph --all --oneline

# 모든 브랜치의 HEAD 이동 기록
git reflog --all
```

---

### A2.25 핵심 정리 — 기억해야 할 5가지 ⏱ ~30초
**(화면)** 결론 / 번호 매긴 5줄 요약 / "push 전이냐 후냐"가 기준임을 다시 강조

> 이 섹션을 다섯 줄로 압축합니다.
> **하나**, 커밋은 스냅샷이에요. 언제든 돌아갈 수 있는 저장 지점이라 코드를 망쳐도 괜찮습니다.
> **둘**, **push 전**이라면 `reset`·`--amend`·`git restore`로 자유롭게 고치세요. 아무도 안 봤으니까요.
> **셋**, **push 후 협업 브랜치**라면 무조건 `revert`로 '되돌리는 새 커밋'을 만드세요. reset은 금지입니다.
> **넷**, **혼자 쓰는 브랜치에서만** `reset --hard` + `--force-with-lease`가 허용돼요.
> **다섯**, 실수로 날린 커밋도 `git reflog`로 90일 안엔 복구됩니다.
> 결국 모든 판단의 기준은 단 하나, **"내가 이걸 push했는가?"** 예요. 이 질문만 기억하면 나머지는 따라옵니다. 수고하셨습니다.


---


## A3 — 클라우드 세션 — Anthropic 관리 VM에서 격리 실행

> 범위: 부록 강의 섹션 **A3** — Claude Code 클라우드 세션 & Remote Control
> 대상: 비전공자·입문자 (터미널/클라우드 실행을 처음 접하는 분 포함)
> 작성 원칙: 처음 나오는 용어는 ① 풀 용어 ② 뜻 ③ 쉬운 비유 순으로 풀이 / 페이지당 1분 내외(표지·정리는 짧게)
>
> **읽는 법** — `>` 인용 블록 = 실제로 말하는 내레이션, `(화면)` = 연출 지시, `⏱` = 목표 시간, **용어** = 화면에서 처음 나오는 단어 풀이, **샘플 코드** = 화면에 띄우거나 실습으로 보여줄 코드, **이미지 스펙** = 나중에 이 명세대로 만들 다이어그램.

---

### A3.1 섹션 표지 — 클라우드 세션 & Remote Control ⏱ ~12초
**(화면)** 섹션 표지 "클라우드 세션 — Anthropic 관리 VM에서 격리 실행" / 부제: 로컬 vs 클라우드 · Remote Control · --remote / --teleport · 모바일 · 보안

> 이번 부록 섹션은 **클로드 코드를 내 노트북 밖에서 돌리는 두 가지 방법**을 다룹니다. 하나는 노트북에서 돌리던 작업을 카페나 폰에서 **그대로 조종**하는 Remote Control, 다른 하나는 아예 **앤트로픽 서버의 깨끗한 가상 컴퓨터**에서 작업을 통째로 맡기는 클라우드 세션이에요. 둘이 어떻게 다르고, 언제 어느 걸 쓰는지, 그리고 둘 사이를 어떻게 오가는지를 차근차근 보겠습니다. 외울 건 없고 "아, 노트북을 꺼도 일이 굴러가게 만들 수 있구나"만 잡고 가시면 됩니다.

---

### A3.2 클라우드 세션 vs Remote Control — 선택 기준 ⏱ ~60초
**(화면)** 로컬 vs 클라우드 실행 아키텍처 다이어그램 / 부제: "코드가 *어디서* 도는가"

> 먼저 가장 중요한 그림 하나입니다. 클로드 코드는 **코드가 실제로 도는 위치**에 따라 두 가지 모드가 있어요.
> 첫째, **Remote Control(리모트 컨트롤)** — '원격 조종'이라는 뜻이에요. 코드는 여전히 **내 노트북에서** 돌고, 브라우저나 폰은 **조종기 역할**만 합니다. TV 본체는 거실에 있고 리모컨만 손에 든 셈이죠. 그래서 내 노트북의 파일, 설정, 도구가 **전부 그대로** 쓰입니다.
> 둘째, **클라우드 세션(Cloud Sessions)** — `claude.ai/code`에서 시작하는 모드인데, 작업이 **앤트로픽이 관리하는 가상 컴퓨터**에서 완전히 돌아갑니다. 깨끗하게 새로 받아 온 저장소, 내 노트북과는 완전히 분리된 환경이에요. 그래서 **노트북을 꺼도 일이 계속** 굴러가고, 여러 개를 동시에 돌릴 수도 있습니다.
> 고르는 기준은 단순합니다. **진행 중이던 로컬 작업을 어디서든 이어 조종**하고 싶으면 Remote Control, **완전히 새 작업이거나 여러 개를 병렬로** 돌리고 싶으면 클라우드 세션이에요.

**용어**
- **Remote Control** — 내 노트북의 클로드 코드 프로세스를 브라우저(`claude.ai/code`)나 모바일 앱으로 원격 제어. 로컬 파일·MCP·도구가 그대로 쓰임.
- **클라우드 세션(Cloud Sessions)** — 앤트로픽이 관리하는 가상 컴퓨터에서 별도로 실행. 새로 클론된 저장소·깨끗한 환경·로컬과 독립. 여러 개 병렬 가능.
- **Teleport(텔레포트)** — 클라우드 세션을 내 로컬 터미널로 '순간이동'시켜 당겨오기. 클라우드→로컬 한 방향만 됨.
- **VM(가상 컴퓨터, Virtual Machine)** — 한 물리 서버 안에 소프트웨어로 만든 독립된 컴퓨터. 세션마다 따로 떨어져 있어 서로 영향이 없음.

**이미지 스펙**
- **ID**: A3-IMG-1
- **목적(전달 정보)**: 같은 작업이라도 "코드가 도는 위치"가 로컬이냐 클라우드냐로 갈리고, 브라우저/모바일이 그 사이에서 어떤 역할인지를 한눈에 보여 준다.
- **유형**: 구조도(아키텍처 다이어그램)
- **캔버스**: 1280×720
- **레이아웃**: 좌→우 3열. 왼쪽 박스 "내 노트북(로컬)" 안에 작은 칩 3개(프로세스 / 파일·환경 / MCP·도구). 가운데 박스 "조종 장치" 안에 칩 2개(브라우저 claude.ai/code / 모바일 앱). 오른쪽 박스 "Anthropic 관리 VM(클라우드)" 안에 칩 2개(격리된 새 저장소 / 깨끗한 환경). 화살표: 가운데↔왼쪽은 양방향 실선("Remote Control: 조종만") 라벨, 가운데→오른쪽은 단방향 실선("Cloud Session: 통째로 실행") 라벨. 각 박스 사이 여백 64px, 박스 내부 패딩 24px.
- **텍스트/레이블**: 박스 제목 "내 노트북 (로컬)" / "조종 장치" / "Anthropic 관리 VM (클라우드)". 칩 텍스트 "프로세스" "파일·환경" "MCP·도구" "브라우저 claude.ai/code" "모바일 앱" "격리된 새 저장소" "깨끗한 환경". 화살표 라벨 "Remote Control — 조종만" "Cloud Session — 통째로 실행".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. 액센트 teal #1A7F7A는 "Anthropic 관리 VM" 박스 보더와 화살표 라벨 강조에만 사용(상태·위계 의미).
- **타이포**: 본문/라벨은 Pretendard(한글 라벨 가독성·무게 단계가 또렷). 칩 안의 명령·URL(`claude.ai/code`)은 JetBrains Mono(0과 O 구분, 등폭). 모노는 위치를 명령/주소로 신호하기 위해 의도적으로 분리.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자는 쓰더라도 중성 회색 1단(0 1px 2px rgba(0,0,0,.06))만.

---

### A3.3 Remote Control — 아무 데서나 로컬 작업 계속하기 ⏱ ~60초
**(화면)** 부제: "코드는 노트북에, 조종은 브라우저·폰에서" / 명령 2~3줄

> Remote Control을 켜는 법부터 보겠습니다. 방법은 두 가지예요. 새로 세션을 시작할 때 `claude --remote-control`로 켜거나, 이미 돌고 있는 세션 안에서 `/rc` 명령을 쳐서 도중에 활성화할 수 있습니다.
> 켜면 화면에 **QR 코드**나 접속 URL이 뜨는데, 폰으로 QR을 찍거나 브라우저로 그 주소에 들어가면 바로 조종이 됩니다. 중요한 건 **로컬 환경이 그대로** 따라온다는 거예요. 내 파일, MCP 서버, 직접 만든 커스텀 도구, 프로젝트 설정이 전부 살아 있습니다.
> 게다가 **여러 기기에서 동시에** 입력할 수 있어요. 터미널, 브라우저, 폰에서 번갈아 메시지를 보내도 같은 세션으로 모입니다. 네트워크가 잠깐 끊기거나 노트북이 수면에 들어가도 대략 **10분 안이면 자동으로 다시 연결**돼요.
> 단, 조건이 있습니다. **Pro·Max·Team·Enterprise 구독**이 있어야 하고, 로컬에서 `claude` 명령을 **최소 한 번은 실행**해 둬야 합니다(워크스페이스 신뢰 동의 때문에요).

**용어**
- **Server mode(서버 모드)** — `claude remote-control`. 프로세스가 계속 떠서 원격 연결을 기다림. `--spawn` 옵션으로 동시 세션 동작 방식을 고름.
- **Interactive mode(대화형 모드)** — `claude --remote-control`. 터미널에서 평소처럼 대화하면서, 동시에 Remote Control도 켜진 상태.
- **QR 코드** — 카메라로 찍으면 주소로 연결되는 사각 코드. 폰에서 세션에 빠르게 붙을 때 씀.
- **워크스페이스 신뢰(workspace trust)** — 어떤 폴더를 클로드 코드가 작업해도 되는지 처음에 한 번 동의하는 절차.

**샘플 코드** — Remote Control을 켜는 두 가지 방법.
```bash
# 방법 1) 처음부터 Remote Control 켜고 시작 (대화형 + 원격 동시)
claude --remote-control "Draft the release notes"

# 방법 2) 이미 돌고 있는 세션 안에서 도중에 켜기
/rc        # 화면에 QR 코드 / 접속 URL 표시 → 폰·브라우저로 접속

# 참고: 여러 세션을 띄워 두고 연결을 기다리게 하려면 (서버 모드)
claude remote-control
```

---

### A3.4 클라우드 세션 — 로컬 머신 없이 완전 실행 ⏱ ~60초
**(화면)** 부제: "claude.ai/code 또는 claude --remote" / 사전 설치 도구 목록

> 이번엔 클라우드 세션입니다. 시작하는 길은 두 가지예요. 웹 `claude.ai/code`에서 바로 시작하거나, 터미널에서 `claude --remote "작업 설명"`을 치면 됩니다.
> 시작 전 **딱 하나** 준비할 게 있어요. **깃허브(GitHub) 계정 연결**입니다. 클라우드가 내 저장소를 받아 와서 작업하고 다시 올려야 하니까요. GitHub App을 깔거나 `/web-setup` 명령으로 깃허브 토큰을 동기화해 주면 됩니다.
> 각 세션은 **앤트로픽이 관리하는 가상 컴퓨터**에서 따로 돌아서, 내 노트북에 전혀 영향을 안 줍니다. 그래서 여러 작업을 **병렬로** 돌릴 수 있고, 노트북을 닫아도 계속 일해요. 한 번 만든 환경은 **세션 캐시**로 자동 보관돼서, 같은 환경을 다시 쓰면 세트업을 처음부터 다시 안 해도 됩니다(대략 7일 유지).
> 그리고 비어 있는 깡통이 아니에요. **Python, Node.js, Ruby, PostgreSQL, Redis, Docker, Git** 같은 도구가 미리 깔려 있습니다. 네트워크는 기본적으로 **Trusted(신뢰)** 모드라, npm·PyPI 같은 패키지 저장소는 바로 접근됩니다.

**용어**
- **격리 VM(Isolated VM)** — 세션마다 앤트로픽이 주는 독립 가상 컴퓨터. 사양은 4 vCPU · 16 GB RAM · 30 GB 디스크. 세션끼리 서로 막혀 있음.
- **세트업 스크립트(Setup script)** — 클라우드 세션이 시작되기 전에 자동으로 도는 Bash 스크립트. `gh` CLI 설치, 의존성 설치 등을 함. 환경마다 다르게 설정.
- **환경 캐싱(Environment caching)** — 세트업 결과를 스냅샷처럼 저장해 다음 세션을 빨리 시작. 파일만 캐시하고 실행 중인 프로세스는 캐시하지 않음.
- **Trusted 네트워크** — 기본값. npm·PyPI·RubyGems·Docker Hub·GitHub 같은 일반 레지스트리는 허용.

**샘플 코드** — 클라우드 세션 시작과 사전 도구 확인.
```bash
# 준비) 깃허브 토큰 동기화 (최초 1회)
/web-setup

# 시작) 터미널에서 클라우드 세션 생성 (반드시 먼저 git push)
claude --remote "Add input validation to the signup form"

# 확인) 세션 안에서 미리 깔린 도구 점검
check-tools     # Python 3.x / Node 20·21·22 / Ruby / PostgreSQL 16 / Redis 7 / Docker / Git ...
```

---

### A3.5 클라우드 세션 환경 구성 & 설정 ⏱ ~60초
**(화면)** 부제: "리포에 커밋된 것만 따라온다" / 자동 사용 vs 사용 불가 2열 비교

> 클라우드 세션은 **저장소에 커밋된 것만** 따라온다 — 이게 핵심 원칙입니다.
> **자동으로 쓰이는 것** — `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, 그리고 커밋된 스킬·에이전트·명령. 즉 팀과 공유되는, Git에 올라간 설정은 그대로 적용돼요.
> **반대로 못 쓰는 것** — 내 컴퓨터에만 있는 것들입니다. `~/.claude/`에 둔 개인 사용자 설정, 로컬 플러그인, API 토큰, 그리고 대화형으로 로그인하는 SSO 인증 같은 거요. 클라우드는 내 노트북을 모르니까 당연한 거죠.
> 환경 변수가 필요하면 **`.env` 형식**으로 정의하면 됩니다(`NODE_ENV=development`처럼 띄어쓰기 없이요). 설정에서 만질 수 있는 항목은 크게 세 가지 — **네트워크 접근 수준, 환경 변수, 세트업 스크립트**입니다.
> 한 가지 헷갈리기 쉬운 구분. **SessionStart 훅과 세트업 스크립트는 도는 시점이 달라요.** 훅은 캐시를 건너뛰고 **매번** 실행되고, 스크립트는 캐시되어 **한 번만** 돕니다. `CLAUDE_CODE_REMOTE`라는 환경변수로 "지금 클라우드인가?"를 조건 분기할 수 있어요. 마지막으로 자원 한계 — 4 vCPU · 16 GB RAM · 30 GB 디스크를 넘는 무거운 작업은 실패할 수 있으니, 그럴 땐 Remote Control로 로컬에서 돌리는 걸 권합니다.

**용어**
- **`.env` 형식** — `이름=값`을 한 줄에 하나씩 적는 환경 변수 파일 형식. 값 사이에 띄어쓰기를 넣지 않음.
- **SessionStart 훅** — 세션이 시작될 때마다 도는 자동 스크립트(매번 실행, 캐시 안 됨).
- **`CLAUDE_CODE_REMOTE`** — 지금 클라우드 세션인지 알려 주는 환경변수. 로컬/클라우드에 따라 동작을 갈라 쓸 때 사용.
- **GitHub 프록시(GitHub proxy)** — 모든 git 작업이 거치는 보안 중계. 실제 토큰은 VM 밖에 남겨 두어 안전을 보장.

**샘플 코드** — 따라오는 것 vs 안 따라오는 것, 그리고 조건 분기.
```bash
# [자동으로 따라옴] 저장소에 커밋된 설정
CLAUDE.md
.claude/settings.json
.mcp.json
.claude/skills/  .claude/agents/  .claude/commands/

# [따라오지 않음] 내 컴퓨터에만 있는 것
~/.claude/                    # 개인 사용자 설정
# 로컬 플러그인 / API 토큰 / SSO·대화형 인증
```
```bash
# SessionStart 훅에서 "클라우드일 때만" 분기 (훅은 매번 실행됨)
if [ "$CLAUDE_CODE_REMOTE" = "1" ]; then
  echo "Running on a cloud VM — skip local-only steps"
fi
```

---

### A3.6 CLI ↔ 웹 세션 이동 — --remote 와 --teleport ⏱ ~60초
**(화면)** 순방향/역방향 이동 플로우 다이어그램 / 명령 비교

> 이제 **CLI와 웹 사이를 오가는 두 명령**을 정리합니다. 방향이 반대라 헷갈리기 쉬운데, 그림으로 잡으면 쉬워요.
> **순방향 — CLI에서 클라우드로.** `claude --remote "작업"`을 치면 **새 클라우드 세션**이 만들어집니다. 딱 하나 규칙, **반드시 먼저 `git push`** 하세요. 클라우드는 깃허브에 올라간 코드를 받아 오니까, 안 올리면 옛날 코드로 작업합니다. 이 명령을 여러 번 치면 **각각 독립된 세션**이 병렬로 생겨요.
> **역방향 — 클라우드에서 CLI로.** 이게 바로 **Teleport(텔레포트)**, '순간이동'이에요. 방법은 셋. `/tasks` 명령으로 백그라운드 세션 목록을 띄워 `t` 키로 당겨오거나, `claude --teleport <세션-ID>`로 바로 지정하거나, 웹 화면의 **'Open in CLI'** 버튼으로 명령을 복사해 터미널에 붙여 넣으면 됩니다. 세션 안에서 `/teleport`(줄여서 `/tp`)를 쳐도 선택지가 열려요.
> 단, 텔레포트는 **클라우드→로컬 한 방향만** 됩니다. 그리고 끌어오려면 조건이 맞아야 해요 — git 상태가 깨끗하고, 올바른 저장소에, 푸시된 브랜치고, 같은 계정으로 로그인돼 있어야 합니다. (반대로 **로컬을 웹으로** 밀어 넣고 싶으면 텔레포트가 아니라 데스크톱 앱의 **Continue 메뉴**를 씁니다.)

**용어**
- **`--remote`** — CLI에서 새 클라우드 세션을 만드는 옵션. `claude --remote "프롬프트"`. 칠 때마다 독립 VM에서 실행.
- **`--teleport`** — 클라우드 세션을 로컬 터미널로 당겨오기. `claude --teleport <세션-ID>`. 한 방향(클라우드→로컬)만.
- **`/tasks`** — 백그라운드 세션을 한눈에 보는 CLI 명령. `t` 키로 텔레포트 시작.
- **Handoff(핸드오프, 일방향)** — 클라우드→로컬만 가능. 로컬을 웹으로 보내려면 데스크톱 앱 Continue 메뉴 사용.

**샘플 코드** — 순방향과 역방향.
```bash
# 순방향) CLI → 클라우드: 새 세션 생성 (먼저 push!)
git push
claude --remote "Implement the migration plan in PLAN.md"

# 역방향) 클라우드 → CLI: 세션 목록에서 당겨오기
/tasks                              # 목록 → t 키로 teleport
claude --teleport cse_01abc...      # 또는 세션 ID로 직접
```

**이미지 스펙**
- **목적(전달 정보)**: `--remote`(CLI→클라우드, 순방향)와 `--teleport`(클라우드→CLI, 역방향)의 방향과 진입 경로(터미널/`/tasks`/Open in CLI)를 한 장으로 구분해, 어느 명령이 어느 방향인지 헷갈리지 않게 한다.
- **ID**: A3-IMG-2
- **유형**: 플로우차트
- **캔버스**: 1280×720
- **레이아웃**: 위→아래 2단. 윗단(순방향) 좌→우: "터미널" 박스 → 화살표(라벨 `claude --remote "작업"`) → "Anthropic 관리 VM(독립 세션)" 박스. 박스 위에 작은 주의 태그 "먼저 git push". 아랫단(역방향) 우→좌: "클라우드 세션" 박스 → 화살표(라벨 `claude --teleport <id>`) → "로컬 터미널" 박스. 아랫단 왼쪽 끝에 진입 경로 3개를 작은 칩 세로 나열: "`/tasks` → t 키" / "Open in CLI 버튼" / "`/teleport` (`/tp`)". 두 단 사이 1px 구분선과 라벨 "순방향" / "역방향(Teleport)". 박스 패딩 24px, 화살표는 직선 + 끝 삼각촉.
- **텍스트/레이블**: 박스 "터미널" "Anthropic 관리 VM (독립 세션)" "클라우드 세션" "로컬 터미널". 화살표 라벨(모노) `claude --remote "작업"` / `claude --teleport <id>`. 주의 태그 "먼저 git push". 진입 칩 "/tasks → t 키" "Open in CLI" "/teleport (/tp)". 단 라벨 "순방향 (CLI → 클라우드)" "역방향 (클라우드 → CLI · Teleport)".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. teal #1A7F7A는 "Teleport" 역방향 화살표와 단 라벨에만(방향 강조 = 의미). 주의 태그는 무채색 보더로 두되 텍스트만 teal로 강조.
- **타이포**: 라벨·본문 Pretendard(한글 단계별 무게). 명령·세션 ID는 JetBrains Mono(`<id>`의 꺾쇠와 하이픈, 0/O 구분이 또렷). 모노로 "이건 입력하는 명령"임을 신호.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자는 중성 회색 1단(0 1px 2px rgba(0,0,0,.06))만.

---

### A3.7 모바일 앱 & 모니터링 — /mobile, /tasks, 실시간 추적 ⏱ ~55초
**(화면)** 부제: "QR로 폰 연결 → 세션을 실시간으로 본다" / 명령 목록

> 작업을 맡겨 놓고 **폰으로 지켜보는** 방법입니다. `/mobile` 명령을 치면 **QR 코드**가 떠요. 폰으로 찍으면 iOS·Android 앱 다운로드 링크로 연결됩니다.
> 앱에서는 **클라우드 세션도 실시간으로** 볼 수 있어요. 세션 목록에 상태가 표시되고, 들어가면 진행 상황이 보입니다. Remote Control 세션은 한 발 더 나아가 **폰에서 직접 조종**도 되고, **푸시 알림**도 받을 수 있어요. 오래 걸리는 작업이 끝났거나 클로드가 판단을 물어볼 때 폰으로 알려 주는 거죠.
> 진행 상황을 자세히 보려면 `/tasks`를 씁니다. 백그라운드 세션의 **진행률, 변경 내역(diff), 통계**를 확인할 수 있어요. 각 세션엔 고유한 **transcript URL**(`cse_`로 시작)이 있어서 그걸로 바로 열 수도 있습니다.
> 주의할 점 하나 — **모바일 푸시는 Remote Control, 즉 로컬 프로세스가 떠 있어야** 옵니다. `/config`에서 `"Push when Claude decides"`를 켜 주세요. 알림이 안 오면 앱에서 푸시 토큰 새로고침, iOS는 집중 모드(Focus), Android는 배터리 최적화 해제를 확인하면 대개 해결됩니다.

**용어**
- **`/mobile`** — CLI나 웹에서 QR 코드를 띄우는 명령. iOS/Android 앱 다운로드 링크 제공.
- **transcript URL** — 세션마다 붙는 고유 주소(`cse_` 접두사). `CLAUDE_CODE_REMOTE_SESSION_ID` 환경변수에서 읽음.
- **diff(차이)** — 코드가 바뀌기 전과 후의 차이를 줄 단위로 보여 주는 것. 무엇이 추가·삭제됐는지 한눈에 확인.
- **푸시 알림(Push notification)** — 작업 완료·판단 필요 시 폰으로 오는 알림. 로컬 프로세스 실행이 필수.

**샘플 코드** — 폰 연결과 세션 모니터링.
```bash
/mobile        # QR 코드 표시 → 폰으로 찍어 iOS/Android 앱 연결
/tasks         # 백그라운드 세션 목록: 진행률 · diff · 통계 확인
/config        # "Push when Claude decides" 켜기 (로컬 프로세스 필수)
```

---

### A3.8 보안 & 격리 — 샌드박스, 프록시, 인증 ⏱ ~55초
**(화면)** 부제: "토큰은 VM 밖에, 트래픽은 프록시를 통과" / 보안 항목 목록

> 클라우드에 코드를 올린다니 "안전한가?" 싶으실 텐데, 설계가 그 걱정을 줄이는 방향이에요.
> 첫째, **격리**입니다. 각 클라우드 세션은 **독립된 가상 컴퓨터**라, 다른 세션과 파일시스템이 완전히 막혀 있어요. 네트워크도 기본은 제한 모드(Trusted 도메인만)이고, 필요하면 커스텀 목록을 직접 정할 수 있습니다.
> 둘째, **깃허브 인증**이 영리합니다. 실제 git 토큰은 **VM 밖에** 보관되고, 안에서는 권한을 좁힌 임시 자격증명(scoped credential)으로 **프록시를 통해** git 작업을 해요. 토큰 원본이 VM 안에 안 들어가니, 누가 VM을 뒤져도 토큰을 못 가져갑니다.
> 셋째, **모든 트래픽은 보안 프록시를 통과**합니다. 악성 요청 차단, 요청 횟수 제한(rate limit), DNS 감사를 거쳐요. 트래픽은 전부 TLS로 암호화되고 단기 자격증명을 씁니다.
> 알아 둘 점 몇 가지 — 클라우드 세션은 **앤트로픽 인프라에서 API를 호출**하니, 조직이 IP를 화이트리스트로 묶어 두면 실패할 수 있어요(앤트로픽 지원이 필요합니다). 전용 시크릿 보관소는 **아직 없어서** 비밀값은 환경 변수로 관리하는데, 가시성에 주의하세요. 그리고 **Zero Data Retention** 정책이 켜진 조직은 `/web-setup`과 클라우드 세션 기능을 쓸 수 없습니다.

**용어**
- **샌드박스(sandbox)** — 바깥과 격리된 안전한 실험실. 안에서 무슨 일이 나도 바깥(다른 세션·내 노트북)엔 영향이 없음.
- **scoped credential(범위 제한 자격증명)** — 필요한 권한만 좁게 허용한 임시 토큰. 만료가 짧아 유출돼도 피해가 작음.
- **TLS(전송 계층 보안)** — 주고받는 데이터를 암호화하는 표준. 'https'의 자물쇠가 바로 이것.
- **Zero Data Retention(ZDR)** — 데이터를 남기지 않는 조직 정책. 켜져 있으면 `/web-setup`·클라우드 세션 사용 불가.
- **IP 화이트리스트** — 허용된 IP 주소에서만 접속을 받는 보안 설정. 클라우드는 앤트로픽 IP에서 호출하므로 충돌할 수 있음.

---

### A3.9 사용 시나리오 — 언제 어느 것을 쓸까 ⏱ ~60초
**(화면)** 부제: "상황별 선택 + Plan-Execute 패턴" / 시나리오 카드 다이어그램

> 이론을 상황에 붙여 보겠습니다. 외울 표는 아니고 '감'을 잡는 용도예요.
> **Remote Control이 맞는 경우** — 진행 중이던 작업을 카페·이동 중·집에서 **이어서** 하고 싶을 때. 로컬 도구가 전부 그대로 따라오니까요.
> **클라우드 세션이 맞는 경우** — ① 새 저장소에 **처음** 손댈 때, ② 여러 작업을 **병렬**로 돌릴 때, ③ 노트북을 **못 쓰는** 상황일 때.
> 여기서 강력한 조합이 **Plan-Execute(계획-실행) 패턴**입니다. 로컬에서 `--permission-mode plan`으로 **읽고 탐색만** 하며 전략을 세우고(파일은 안 건드려요), 그걸 commit·push한 다음, 클라우드 `--remote`로 **실행을 통째로 맡기는** 흐름이에요. 사람은 계획·감독만, 기계는 자동 실행. 한 단계 더 나아간 **Ultraplan**은 클라우드에서 계획을 쓰고 웹에서 코멘트로 다듬은 뒤 로컬이든 원격이든 골라 실행합니다.
> **병렬 실행**은 `claude --remote`를 여러 번 쳐서 각각 독립 세션으로 돌리고 `/tasks`로 모니터링한 뒤 각각 별개의 PR로 마무리하는 방식이고요. 반대로 클라우드 자원(16 GB RAM)을 넘는 **무거운 작업**은 Remote Control로 로컬에서 도는 게 맞습니다. 작업 도중 로컬로 끌어와 손보고 다시 푸시하고 싶으면 **Teleport**를 쓰면 돼요.

**용어**
- **`--permission-mode plan`** — 로컬에서 읽기·탐색만 하고 파일 수정은 막는 모드. 작은 컨텍스트로 계획만 세움.
- **Plan-Execute 패턴** — 로컬에서 계획 → commit → 클라우드에서 자동 실행. 사람 감독 + 기계 자동화를 결합.
- **Ultraplan** — 클라우드에서 계획을 쓰고 웹에서 검토하며 웹↔로컬을 오가는 방식.
- **병렬 실행(Parallel execution)** — `--remote`를 여러 번 띄워 독립 VM에서 동시에 돌리고 `/tasks`로 추적, 각각 별도 PR로.

**이미지 스펙**
- **목적(전달 정보)**: 같은 사용자가 '계획 → 실행 → 병렬 → 모니터' 흐름에서 로컬과 클라우드를 어떻게 번갈아 쓰는지(어느 단계에서 어떤 모드가 맞는지)를 한 장으로 보여 준다.
- **ID**: A3-IMG-3
- **유형**: 플로우차트
- **캔버스**: 1280×720
- **레이아웃**: 좌→우 4단계 박스 + 각 박스 아래 '실행 위치' 띠. 1단 "계획(Plan)" 아래 띠 "로컬", 2단 "실행(Execute)" 아래 띠 "클라우드", 3단 "병렬(Parallel)" 아래 띠 "클라우드 × N", 4단 "모니터(Monitor)" 아래 띠 "웹·모바일". 박스 사이 단방향 화살표. 각 박스 하단에 핵심 명령 한 줄(모노). 하단에 가로 분기 화살표 하나: 4단에서 1단/2단 쪽으로 점선 + 라벨 "Teleport — 로컬로 당겨와 수정 후 재푸시". 박스 폭 균등, 사이 여백 40px, 패딩 20px.
- **텍스트/레이블**: 단계 제목 "계획 (Plan)" "실행 (Execute)" "병렬 (Parallel)" "모니터 (Monitor)". 실행 위치 띠 "로컬" "클라우드" "클라우드 × N" "웹·모바일". 박스 하단 명령(모노) `claude --permission-mode plan` / `claude --remote "..."` / `claude --remote × 3` / `/tasks · /mobile`. 분기 라벨 "Teleport — 로컬로 당겨와 수정 후 재푸시".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. teal #1A7F7A는 '실행 위치 띠' 중 "클라우드"·"클라우드 × N" 라벨과 Teleport 점선에만(위치/방향 의미). 단계 박스 자체는 무채색.
- **타이포**: 단계·라벨 Pretendard(한글 위계). 명령은 JetBrains Mono(플래그·`×`·`...` 가독성, 0/O 구분). 모노로 '입력 명령'을 시각적으로 분리.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자는 중성 회색 1단(0 1px 2px rgba(0,0,0,.06))만.

---

### A3.10 주의사항 & 한계 ⏱ ~60초
**(화면)** 부제: "쓰기 전에 알아 둘 8가지" / 경고 목록

> 실수하기 쉬운 지점들을 모았습니다. 이 슬라이드만 잘 봐 둬도 헛수고를 크게 줄일 수 있어요.
> 첫째, **첫 push는 필수**예요. `claude --remote` 전에 로컬 커밋을 git push 해야 클라우드가 최신 코드를 봅니다. 안 그러면 옛 코드로 일해요.
> 둘째, **Teleport는 한 방향**입니다. 클라우드→로컬만 돼요. 로컬을 웹으로 보내려면 데스크톱 앱의 **Continue 메뉴**를 씁니다.
> 셋째, 조직이 **IP를 제한**하면 클라우드 세션이 실패할 수 있어요(앤트로픽 지원 필요). 넷째, **인증 종류** — API 키나 Bedrock·Vertex로 인증 중이면 Remote Control이 안 됩니다. `/login`으로 claude.ai OAuth로 바꿔 주세요.
> 다섯째, **사용량 한도(rate limit)는 계정 전체와 공유**됩니다. 클라우드 세션을 병렬로 많이 돌리면 한도가 빨리 줄어요. 여섯째, `/plugin`·`/resume`처럼 **대화형 선택창이 필요한 명령은 웹·모바일에서 안 됩니다.** 일곱째, **Remote Control은 로컬 프로세스가 살아 있어야** 해요 — 터미널을 닫으면 종료됩니다. 여덟째, 클라우드 세션은 **GitHub만** 지원합니다. GitLab·Bitbucket은 로컬 번들 업로드로 우회는 되지만 푸시는 안 돼요.

**용어**
- **Rate limit(사용량 한도)** — 일정 시간 안에 쓸 수 있는 양의 상한. 클라우드 세션도 일반 사용과 같은 계정 한도를 공유.
- **OAuth(오어스)** — 비밀번호를 넘기지 않고 'claude.ai 계정으로 로그인'처럼 위임 인증하는 표준. Remote Control은 이 방식이 필요.
- **`CCR_FORCE_BUNDLE`** — 이 환경변수를 켜면 GitHub 없이도 로컬 저장소를 번들로 업로드 가능. 단, 푸시는 여전히 GitHub 필요.
- **Workspace trust(워크스페이스 신뢰)** — 첫 `claude` 실행 때 디렉터리를 신뢰하겠다는 동의. 이걸 거쳐야 Remote Control 사용 가능.

**샘플 코드** — 자주 막히는 두 지점의 처방.
```bash
# 함정 1) push 안 하면 옛 코드로 작업 → 항상 먼저 push
git add . && git commit -m "checkpoint" && git push
claude --remote "작업 설명"

# 함정 2) API key/Bedrock/Vertex 인증이면 Remote Control 불가
#         → claude.ai OAuth 로그인으로 전환
claude /login        # claude.ai 계정으로 인증
```

---

### A3.11 실전 — 예제 워크플로 ⏱ ~70초
**(화면)** 부제: "계획 → 클라우드 실행 → 병렬 → 모바일 → Remote Control" / 5단계 코드 블록

> 마지막으로, 지금까지 본 걸 **하나의 흐름**으로 꿰어 보겠습니다. 한 작업이 5단계로 이어집니다.
> **1단계, 로컬에서 계획.** `--permission-mode plan`으로 클로드가 읽고 탐색만 하며 전략을 짭니다. 승인하면 `PLAN.md`로 적고 commit·push 해요. 컨텍스트가 작아 빠르고 안전합니다.
> **2단계, 클라우드에서 자동 실행.** `claude --remote "PLAN.md대로 구현"`을 치면 클라우드가 계획대로 일합니다. `/tasks`로 진행률을 봐요.
> **3단계, 병렬 작업.** `claude --remote`를 **세 번** 쳐서 인증 버그 수정·문서 갱신·로거 리팩터를 동시에 돌립니다. 각각 독립 세션이라 서로 안 부딪쳐요.
> **4단계, 모바일 모니터링.** `/mobile`로 폰에 연결해 실시간으로 보고, 필요하면 메시지로 개입합니다. 끝나면 'Open in CLI'로 PR을 만들거나 Teleport로 로컬에 끌어와요.
> **5단계, Remote Control로 이동 중에도 계속.** `claude --remote-control`로 시작해 두면, 카페에서 폰·브라우저로 같은 작업을 이어 갈 수 있습니다. 정리하면 — **사람은 계획과 감독만, 기계가 병렬로 자동 실행**한다, 이게 핵심입니다.

**샘플 코드 — 1단계: 로컬 계획 수립(작은 컨텍스트)**
```bash
cd ~/my-project
claude --permission-mode plan
# Claude explores the structure and proposes a plan
# After approval: write PLAN.md, then
git add . && git commit -m "plan: migration strategy" && git push
```
**샘플 코드 — 2단계: 클라우드에서 자동 실행**
```bash
# From the terminal, or start a session at claude.ai/code
claude --remote "Implement the migration plan in PLAN.md"
# Monitor progress with /tasks
```
**샘플 코드 — 3단계: 병렬 작업(여러 세션 동시)**
```bash
# Develop three features at once — each in its own VM
claude --remote "Fix auth bug in src/auth/login.ts"
claude --remote "Update API docs in docs/api.md"
claude --remote "Refactor logger to use structured output"
# Track them all with /tasks
```
**샘플 코드 — 4단계: 모바일 모니터링 및 개입**
```bash
/mobile          # Connect the phone via QR code
# Watch progress live; send a message to intervene if needed
# When done: 'Open in CLI' → open a PR, or teleport it back locally
```
**샘플 코드 — 5단계: Remote Control로 이동 중에도 계속**
```bash
# Start on the local machine
claude --remote-control "Draft the slide deck for tomorrow"
# From a browser/phone: tap 'Open in CLI' or scan the QR
# Keep working from a cafe — all local tools stay available
```

---

### A3.12 정리 — 한 줄 요약 ⏱ ~30초
**(화면)** 정리 슬라이드: 두 모드 한 줄 비교 + 핵심 명령 3개

> 한 장으로 정리하겠습니다. 노트북 밖에서 클로드 코드를 돌리는 길은 **둘**이에요.
> **Remote Control** — 코드는 내 노트북에, 조종만 브라우저·폰에서. **진행 중이던 작업을 어디서든 이어 갈 때.** (`claude --remote-control`)
> **클라우드 세션** — 앤트로픽의 깨끗한 가상 컴퓨터에서 통째로 실행. **새 작업이거나 여러 개를 병렬로 돌릴 때.** (`claude --remote "작업"`)
> 그리고 둘을 잇는 다리, **Teleport** — 클라우드 작업을 로컬로 한 방향 당겨오기(`claude --teleport <id>`). 기억할 두 가지만 — **첫 push는 필수**, 그리고 클라우드는 **GitHub만** 지원. 이 셋만 손에 익히면, 노트북을 닫아도 일이 굴러가게 만들 수 있습니다.

**용어**
- **Remote Control** — 로컬 실행 + 원격 조종(`--remote-control`).
- **클라우드 세션** — 격리 VM에서 통째 실행(`--remote`).
- **Teleport** — 클라우드→로컬 한 방향 당겨오기(`--teleport`).

---

> 📎 공식 문서
> - Claude Code on the web — https://code.claude.com/docs/en/claude-code-on-the-web
> - Remote Control — https://code.claude.com/docs/en/remote-control
> - CLI reference — https://code.claude.com/docs/en/cli-reference
> - 가이드(서드파티) — https://claudefa.st/blog/guide/development/remote-control-guide


---


## A4 — /loop 실전 활용 — 반복·자율 페이싱 루프

> 대상: 비전공자·입문자 (터미널/슬래시 커맨드를 처음 보는 분 포함)
> 작성 원칙: 처음 나오는 용어는 ① 풀 용어 ② 뜻 ③ 쉬운 비유 순으로 풀이 / 페이지당 1분 내외(표지·정리는 짧게)
>
> **읽는 법** — `>` 인용 블록 = 실제로 말하는 내레이션, `(화면)` = 연출 지시, `⏱` = 목표 시간, **용어** = 화면에서 처음 나오는 단어 풀이, **샘플 코드** = 화면에 띄우거나 실습으로 보여줄 코드.

---

### A4.1 섹션 표지 — /loop 실전 활용 ⏱ ~12초
**(화면)** 섹션 표지 "/loop 실전 활용" / 부제: 반복 폴링 · 자율 페이싱 루프 · /goal · /schedule 비교

> 부록 네 번째 섹션, **`/loop`** 입니다. 한마디로 클로드 코드에게 **"이 일을 일정 간격으로 알아서 반복해 줘"** 라고 시키는 기능이에요.
> 배포 상태를 5분마다 확인하기, PR을 자동으로 지켜보기, 테스트가 통과할 때까지 계속 고치기 — 이런 '반복 작업'을 사람이 손으로 매번 누르지 않아도 되게 만들어 줍니다. 어떤 상황에 어떤 루프를 쓰는지, 그리고 멈추는 법과 주의점까지 실전 위주로 보겠습니다.

---

### A4.2 /loop 란 무엇인가 ⏱ ~60초
**(화면)** 부제: "세션 중 프롬프트·커맨드를 정한 간격으로 자동 반복" / 문법 `/loop [간격] [프롬프트]`

> **`/loop`**(루프)는 클로드 코드의 **'프롬프트 자동 반복' 스킬**입니다. 여기서 '루프'는 영어로 '고리·반복'이라는 뜻인데요, 한 번 시켜 두면 같은 일을 **정해진 시간 간격마다 알아서 다시 실행**해 줍니다. 마치 알람을 5분마다 울리게 맞춰 두는 것과 비슷해요.
> 문법은 간단합니다. `/loop` 뒤에 **간격**과 **프롬프트**를 붙입니다. 둘 다 생략할 수 있어요. 간격을 빼면 클로드가 상황을 보고 대기 시간을 알아서 고르는 **동적 모드**가 되고, 프롬프트까지 빼면 미리 정해진 **기본 점검 작업**을 돌립니다.
> 한 가지 중요한 성질, **세션 스코프**입니다. '세션'은 지금 열어 둔 클로드 코드 대화창 하나를 말해요. 그 대화창이 살아 있는 동안만 루프가 돌고, 창을 닫으면 멈춥니다. 다만 `--resume`이나 `--continue`로 세션을 다시 열면, 만들어진 지 7일 안 된 루프는 자동으로 되살아납니다.
> 그리고 헷갈리기 쉬운 점 하나. 한 번 시키고 끝나는 '자율 실행'과 달리, `/loop`는 **정기적으로 반복**합니다. 반대로 뒤에서 볼 **`/goal`** 은 조건이 만족될 때까지 **턴마다 자동 반복**하는 또 다른 방식이라, `/loop`와는 성격이 달라요.

**용어**
- **세션 스코프(session scope)** — 지금 열린 클로드 코드 대화가 살아 있는 동안만 작동하는 범위. 창을 닫으면 멈춤.
- **동적 모드(self-paced)** — 간격을 생략했을 때, 클로드가 1분~1시간 사이에서 대기 시간을 알아서 고르는 방식.
- **케이던스(cadence)** — 반복 빈도. '5분마다', '1시간마다' 같은 주기.

**샘플 코드** — `/loop`의 기본 문법과 세 가지 형태.
```text
# 문법: /loop [간격] [프롬프트]

# 1) 간격 + 프롬프트 — 5분마다 배포 상태 확인
/loop 5m check if the deployment finished and show the status

# 2) 간격 생략 — 동적 모드(클로드가 대기 시간 자동 선택)
/loop check whether CI passed and tell me what failed

# 3) 둘 다 생략 — 내장 점검 작업(.claude/loop.md 또는 기본 프롬프트)
/loop
```

---

### A4.3 /loop 멈추기 & 제약 ⏱ ~60초
**(화면)** 부제: "ESC 정지 · 동적 자동 종료 · 7일 만료 · 머신 켜짐 필수" / 경고 박스 4개

> 루프를 시작했으면 **멈추는 법**도 알아야겠죠. 대기 중인 다음 반복은 **ESC 키**로 취소할 수 있습니다. 단, `/loop`로 만든 게 아니라 직접 인라인으로 요청한 작업은 ESC로 안 멈추고, 명시적으로 삭제해야 해요.
> **동적 모드**에서는 클로드가 '이제 할 일이 끝났다'고 판단하면 다음 반복을 스스로 잡지 않아 **저절로 끝날 수도** 있습니다. 반면 간격을 못 박은 **고정 간격** 루프는 자동으로 멈추지 않고, 뒤에서 말할 7일 만료까지 계속 돕니다.
> 그 **7일 만료**가 중요한 안전장치예요. 모든 `/loop` 반복 작업은 만들어진 지 **7일이 지나면 자동으로 삭제**됩니다. '잊어버린 루프가 무한정 API를 호출하는' 사고를 막기 위한 보안 정책이죠. 계속 필요하면 7일이 되기 전에 다시 만들어 주면 됩니다.
> 마지막으로, `/loop`는 **내 컴퓨터(로컬)에서 돕니다.** 그래서 컴퓨터가 켜져 있어야 해요. 노트북을 닫거나 전원을 끄면 멈춥니다. 컴퓨터가 꺼져 있어도 24시간 돌려야 한다면, 뒤에서 볼 **`/schedule`**(클라우드 루틴)이나 데스크톱 예약 작업을 써야 합니다.

**용어**
- **ESC 키 정지** — `/loop`의 다음 반복 예약을 취소. 고정 간격 루프에 유효하며, 동적 모드는 클로드가 종료 여부를 스스로 결정.
- **7일 만료(expiry)** — 보안 정책. `/loop` 반복 작업은 생성 후 7일 안에 자동 삭제되고, 그 마지막 반복 뒤 종료됨.
- **복구(restore)** — `--resume`/`--continue`로 세션을 다시 열면 7일 안 지난 `/loop`가 자동 복원되는 것.

---

### A4.4 실전 루프 01: CI/빌드 상태 폴링 ⏱ ~60초
**(화면)** 부제: "고정 간격 vs 동적 간격 — 배포·CI 상태 자동 확인" / 코드 2개 + 호출 흐름

> 가장 흔한 쓰임은 **폴링**입니다. '폴링'은 '일정 간격으로 상태를 물어보는 것'이에요. "배포 끝났어?"를 5분마다 대신 물어봐 주는 거죠.
> **고정 간격**부터 봅시다. `/loop 5m ...`처럼 간격을 적으면 정확히 5분마다 같은 프롬프트를 실행합니다. 화면 첫 줄이 그 예예요 — 배포가 끝났는지 5분마다 확인하고 상태를 보여 줍니다.
> **동적 간격**은 간격을 빼는 거예요. 화면 둘째 줄처럼 `/loop check whether CI passed...`만 하면, 클로드가 상황을 보고 대기 시간을 정합니다. CI가 한창 돌고 있으면 짧게(1~10분), 조용해지면 길게(30~60분) 기다려요.
> 실전에서는 배포를 시작할 때 `/loop 2m check deploy status`를 켜 두면, 배포 중엔 자주 확인하다가 끝나서 변화가 없으면 간격이 늘어납니다. 매번 손으로 상태창을 들여다볼 필요가 없어지는 거죠.

**용어**
- **폴링(polling)** — 일정 간격으로 상태를 묻는 것. 예: "배포 완료?"를 매 5분 확인.
- **지터(jitter)** — API 부하를 분산하려고 일부러 약간의 시간 오프셋(최대 30분)을 더하는 것.

**샘플 코드** — 고정 간격과 동적 간격 두 가지 폴링.
```text
# 고정 간격 — 5분마다 배포 완료 여부 확인
/loop 5m check if the deployment finished and show me the current status

# 동적 간격 — 클로드가 대기 시간을 자동 조절
/loop check whether CI passed and tell me what failed
```

**이미지 스펙** —
- **ID**: A4-IMG-1
- **목적(전달 정보)**: `/loop` 한 사이클이 '세션 시작 → 루프 등록 → 간격 대기 → 프롬프트 실행 → 결과 보고 → 다시 대기'로 돌아간다는 반복 흐름과, ESC로 빠져나오는 지점을 보여 준다.
- **유형**: 플로우차트
- **캔버스**: 1280×720
- **레이아웃**: 가로 중앙에 둥근 사각형 6개를 시계 방향 루프로 배치. 좌상단부터 시계 방향으로 ①세션 시작 ②`/loop` 등록 ③간격 대기 ④프롬프트 실행 ⑤결과 보고를 두고, ⑤에서 ③으로 되돌아가는 화살표로 반복 고리를 닫는다. ③(간격 대기) 박스 옆에 별도 화살표로 ⑥종료(ESC / 7일 만료)를 빼낸다. 화살표는 1px 실선, 각 박스 사이 여백 48px 이상.
- **텍스트/레이블**: 박스 라벨 — "세션 시작", "/loop 등록", "간격 대기", "프롬프트 실행", "결과 보고", "종료: ESC · 7일 만료". 반복 화살표 옆 캡션 "다음 반복".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. 액센트 teal #1A7F7A는 반복 화살표와 "다음 반복" 캡션에만, '종료' 박스는 무채색 보더로만 구분.
- **타이포**: 본문 라벨은 Pretendard(한글 라벨 가독성·깔끔한 산세리프), 명령어 `/loop`는 JetBrains Mono(0과 O 구분, 등폭으로 명령어 정렬).
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿·마케팅 상투어. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자는 쓰더라도 중성 회색 1단(0 1px 2px rgba(0,0,0,.06))만.

---

### A4.5 실전 루프 02: PR 트리아지 & 베이비싯 ⏱ ~60초
**(화면)** 부제: "열린 PR을 15분마다 자동으로 지켜보기" / 코드 2개

> 두 번째 실전은 **PR 베이비싯**입니다. '베이비싯(babysit)'은 '아이를 봐 주듯 계속 곁에서 지켜보고 챙기는 것'이라는 뜻이에요. 열린 PR이 있을 때 `/loop 15m`을 켜 두면, 15분마다 클로드가 그 PR을 자동으로 들여다봅니다.
> 무엇을 확인하냐면 — CI가 실패했는지, 새 리뷰 코멘트가 달렸는지, 머지 충돌이 났는지를 모두 감지하고 대응해요. CI가 깨졌으면 로그를 보고 수정안을 제안하고, 리뷰가 달리면 거기에 답합니다.
> 여기서 `/loop`를 **아무것도 안 붙이고** 치면, 미리 정해진 **내장 점검 작업**이 돕니다. 순서가 정해져 있어요. ①하다 만 작업 이어서, ②PR 리뷰 코멘트·CI·머지 충돌 처리, ③버그 찾기·정리 — 이렇게 차례로 진행됩니다.
> 동적 모드의 장점이 여기서 빛나요. PR이 **조용해지면**(새 리뷰 없음, CI 통과) 간격을 늘려서 쓸데없는 확인을 줄입니다. 회의 중이거나 다른 작업을 할 때 `/loop`를 백그라운드에 돌려 두면, PR 상태 변화를 알아서 감시하고 챙겨 주는 '협력자' 역할을 합니다.

**용어**
- **베이비싯(babysit)** — 지속적으로 모니터링하고 필요한 조치를 취하는 것. PR이면 CI·리뷰·머지 상태를 자동으로 지켜보고 대응.
- **quiet(조용한 상태)** — 더는 새 입력·변화가 없는 상황. 동적 모드가 간격을 늘리는 신호.

**샘플 코드** — PR을 자동으로 챙기는 두 가지 방법.
```text
# 명시 프롬프트 — CI 실패 진단 + 리뷰 코멘트 대응
/loop check the open PR: if CI failed, diagnose the logs and propose a fix.
If new review comments arrived, address them.

# 내장 점검 작업 — 15분마다 PR을 자동으로 케어
/loop 15m
```

---

### A4.6 실전 루프 03: 장기 백그라운드 작업 모니터링 ⏱ ~55초
**(화면)** 부제: "긴 테스트·마이그레이션을 10~30분 간격으로 폴링" / 코드 2개

> 세 번째는 **오래 걸리는 작업** 모니터링입니다. 전체 테스트 스위트나 데이터 마이그레이션처럼 시간이 오래 걸리는 일은 보통 **10~30분 간격**으로 폴링해요. 너무 자주 확인하면 로그가 도배되고, 너무 드물면 끝난 걸 늦게 알게 되거든요.
> 여기서 '스위트(suite)'는 **통합 테스트 모음**이에요. 단위 테스트보다 오래 걸려서 보통 분 단위죠. `/loop 10m`으로 "전체 테스트 끝났는지 확인하고 새 실패만 요약해 줘"를 걸어 두면, 10분마다 알아서 물어봅니다.
> 좋은 점은 **다른 탭에서 다른 일을 할 수 있다**는 거예요. 루프를 켜 둔 채 코드 리뷰나 문서 작성을 하고 있으면, 클로드가 백그라운드에서 정기적으로 "끝났어?"를 대신 확인해 줍니다. 야간 빌드나 CI가 느린 조직에서 특히 유용해요.
> 단, 앞에서 말했듯 **로컬 머신이 켜져 있어야** 합니다. 퇴근해야 하는데 계속 지켜봐야 한다면, 이건 `/loop`가 아니라 **`/schedule`**(클라우드 루틴)의 영역이에요.

**용어**
- **스위트(suite)** — 통합 테스트 모음. 단위 테스트보다 오래 걸림(분 단위).
- **stall(정지·멈춤)** — 예상과 달리 진행이 멈춘 상태. 동적 모드는 stall을 감지하면 짧은 간격으로 재확인.

**샘플 코드** — 긴 작업을 넉넉한 간격으로 폴링.
```text
# 전체 테스트 완료 폴링 — 10분마다, 새 실패만 요약
/loop 10m check if the full test suite completed and summarize any new failures

# 데이터 마이그레이션 진행 상황 — 30분마다, 멈추면 알림
/loop 30m check the migration job status, show progress, and alert if it stalls
```

---

### A4.7 실전 루프 04: '테스트 통과할 때까지 고치기' (자율 수렴) ⏱ ~60초
**(화면)** 부제: "/loop(수동 멈춤) vs /goal(자동 수렴)" / 코드 2개

> 네 번째는 **"될 때까지 고치기"** 입니다. 실패하는 테스트를 통과할 때까지 반복해서 고치는 거죠. 방법이 두 가지인데, 차이를 꼭 알아 두세요.
> `/loop`로도 할 수 있습니다. "테스트 다 통과했는지 확인하고, 안 됐으면 고칠 방법을 제안해 줘"를 정기 폴링으로 돌리는 거예요. 다만 이건 **수동으로 멈춰야** 합니다.
> 더 깔끔한 방법은 **`/goal`** 입니다. `/goal`은 '목표'라는 뜻인데, **조건이 만족될 때까지 턴마다 자동으로 다시 실행**하고, 조건이 충족되면 **스스로 멈춰요.** 화면 둘째 줄처럼 `/goal all tests pass`라고만 하면, 클로드가 '실패 분석 → 수정 → 재실행 → 통과했나?'를 모든 테스트가 통과할 때까지 반복합니다.
> 비밀은 **평가 모델**에 있어요. `/goal`은 각 턴이 끝날 때마다 별도의 가벼운 모델(기본값은 Haiku)이 "조건 됐어? 아직?"을 판단합니다. 그래서 더 효율적이고 확실해요.
> 실전 선택 기준은 간단합니다. **상태를 감시(폴링)** 하고 싶으면 `/loop`, **조건이 만족될 때까지 계속 작업**시키고 싶으면 `/goal`입니다.

**용어**
- **/goal** — 조건 기반 자율 수렴. 조건 만족까지 턴마다 자동 재실행하고 멈춤도 자동. (v2.1.139 이상 필요)
- **자율 수렴(autonomous convergence)** — 목표 조건을 만족할 때까지 반복하는 패턴. red-green-refactor와 비슷하되 자동화된 것.
- **평가 모델(evaluator)** — `/goal`에서 매 턴 조건 충족 여부를 판단하는 별도의 경량 모델(기본 Haiku).

**샘플 코드** — 같은 목표, 두 가지 접근.
```text
# 방법 1: /loop로 반복 — 정기 폴링, 멈춤은 수동
/loop check if all tests pass and tell me what broke. If not, suggest a fix.

# 방법 2: /goal로 자동 수렴 — 조건 만족 시 자동 종료 [추천]
/goal all tests pass
```

---

### A4.8 /loop vs /schedule — 언제 뭘 쓸까 ⏱ ~60초
**(화면)** 부제: "로컬 폴링 vs 클라우드 자동화" / 비교 테이블

> 여기서 자주 헷갈리는 두 형제, **`/loop`** 와 **`/schedule`**(클라우드 루틴)을 비교하겠습니다.
> `/loop`는 **세션 중, 내 컴퓨터에서** 정기적으로 폴링합니다. 머신이 켜져 있어야 하고, 간격은 **1분 이상**이면 자유로워요.
> `/schedule`은 **세션과 무관하게, 클라우드 인프라에서** 자동으로 돕니다. 그래서 **컴퓨터가 꺼져 있어도** 작동해요. 대신 최소 간격이 **1시간 이상**이고, 클라우드에서 도니까 **내 로컬 파일에는 접근하지 못합니다.**
> 그래서 선택 기준은 이래요. 배포 상태를 30분 안에 감시? → `/loop`. 야간 뉴스레터 생성? → `/schedule`. PR을 실시간으로 챙기기? → `/loop`. 매주 정기 정리? → `/schedule`.
> **비용**도 갈립니다. `/loop`는 로컬이라 추가 비용 없이 세션만 유지하면 되고, `/schedule`은 클라우드 실행 시간 요금이 붙어요(구독 한도 내 일일 한도). 그리고 `/schedule`은 **웹훅 트리거**도 지원합니다. GitHub에서 PR이 열리거나 릴리스가 나는 '이벤트'에 반응해 자동으로 도는 거죠.

**용어**
- **/schedule(Routines)** — 클라우드 기반 예약 자동화. 머신과 무관, 1시간 이상 간격, 웹훅·API·cron 트리거 지원.
- **데스크톱 예약 작업** — 로컬 머신의 cron/작업 스케줄러를 감싼 것. 머신은 켜져 있어야 하지만 `/loop`보다 지속성이 높음.
- **웹훅(webhook)** — GitHub 이벤트(PR 열림·릴리스 등)에 반응해 자동으로 트리거되는 연결.

**이미지 스펙** —
- **ID**: A4-IMG-2
- **목적(전달 정보)**: `/loop`(로컬 폴링)과 `/schedule`(클라우드 자동화)를 6개 기준으로 한눈에 비교해, 어떤 상황에 무엇을 골라야 하는지 결정하게 한다.
- **유형**: 비교표
- **캔버스**: 1280×720
- **레이아웃**: 2열 비교표. 좌측 좁은 라벨 열(기준), 우측에 `/loop` 열과 `/schedule` 열 2개. 행 6개: 머신 켜짐 필요 / 세션 필요 / 로컬 파일 접근 / 최소 간격 / 지속성 / 권장 용도. 헤더 행 1px 보더로 본문과 구분, 각 셀 좌측 정렬, 행 높이 균일하고 셀 패딩 16px 이상.
- **텍스트/레이블**: 헤더 — "기준", "/loop (로컬 폴링)", "/schedule (클라우드)". 행 값 — 머신 켜짐: `/loop`="필요" · `/schedule`="불필요" / 세션 필요: "필요" · "불필요" / 로컬 파일 접근: "가능" · "불가" / 최소 간격: "1분" · "1시간" / 지속성: "세션 동안" · "상시(클라우드)" / 권장 용도: "배포·CI·PR 실시간 감시" · "야간·주간 정기 자동화, 웹훅".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 표 보더 #D8D2C8. 액센트 teal #1A7F7A는 헤더 행의 두 명령어 텍스트(`/loop`, `/schedule`)에만. 셀 강조(빨강/초록 등) 없이 무채색 유지.
- **타이포**: 표 본문은 Pretendard(한글 비교 라벨 가독성), 명령어·간격값(`/loop`, `1m`, `1h`)은 JetBrains Mono(등폭으로 값 정렬·숫자 가독성).
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿·마케팅 상투어. 구획은 1px 보더+여백으로만. 모서리 0~8px(표 셀 모서리 0). 그림자는 쓰더라도 중성 회색 1단(0 1px 2px rgba(0,0,0,.06))만.

---

### A4.9 케이던스 선택: 고정 간격 vs 동적 모드 ⏱ ~55초
**(화면)** 부제: "급할 땐 고정 짧은 간격, 여유 있을 땐 동적" / 코드 2개

> 간격을 정하는 두 방식, **고정 간격**과 **동적 모드**를 정리합니다.
> **고정 간격**은 `/loop 3m ...`처럼 시간을 못 박는 거예요. 1분부터 수 시간까지 가능합니다. '배포 대기 3분', '백로그 정리 1시간'처럼 작업 성격에 딱 맞춰 줄 때 좋아요. 예측 가능한 대신, 상황이 바뀌어도 그대로라 가끔 비효율적입니다.
> **동적 모드**는 간격을 생략해 클로드에게 맡기는 거예요. 매 턴 끝에 상황을 보고 다음 대기 시간을 **1분~1시간** 사이에서 고릅니다. 더 똑똑하지만, 정확히 언제 다시 도는지는 예측하기 어려워요.
> **토큰 비용** 면에서는, 동적 모드가 상황 판단에 약간의 추론 비용이 더 듭니다. 고정 간격이 살짝 저렴하지만 무시할 수준이에요.
> 추천은 — 급할 때(배포가 라이브 중)는 **고정 짧은 간격**, 여유 있을 때(야간 테스트)는 **동적 모드**가 더 효율적입니다. 한 가지 주의, **Bedrock·Vertex·Foundry** 환경에서는 동적 모드가 지원되지 않고 **고정 10분**으로 폴링됩니다.

**용어**
- **고정 간격(fixed interval)** — 사용자가 명시한 케이던스(5m, 1h 등). 예측 가능하지만 상황 변화엔 둔감할 수 있음.
- **동적 간격(self-paced)** — 클로드가 1분~1시간 사이에서 자동 선택. 더 효율적이지만 시점 예측은 어려움.
- **토큰 오버헤드(token overhead)** — 상황 분석을 위한 추가 토큰 비용. 무시할 수준이지만 누적되면 비용에 영향.

**샘플 코드** — 같은 CI 폴링, 고정 vs 동적.
```text
# 고정 간격 — 3분마다 (너무 길면 실패 감지가 늦어짐)
/loop 3m check if CI passed

# 동적 간격 — 클로드가 상황에 따라 간격을 조절
/loop check if CI passed
```

---

### A4.10 실전: .claude/loop.md 커스텀 기본 프롬프트 ⏱ ~55초
**(화면)** 부제: "프로젝트 전용 기본 점검 작업을 파일로 정의" / 코드 1개 + 검색 순서

> 마지막 실전 팁, **`.claude/loop.md`** 입니다. 이 파일을 프로젝트에 두면, `/loop`를 프롬프트 없이 칠 때 **이 파일 내용을 기본 작업으로** 씁니다. 프로젝트에 딱 맞는 점검 자동화를 글로 적어 두는 거예요.
> 클로드가 찾는 **순서**가 있어요. ①프로젝트의 `.claude/loop.md` → ②사용자 홈의 `~/.claude/loop.md` → ③내장 기본 점검 작업. 가까운 쪽이 먼저 이깁니다.
> 좋은 점은, loop.md를 **수정하면 다음 반복부터 바로 적용**된다는 거예요. 루프를 다시 시작할 필요가 없습니다.
> 주의 두 가지. 파일이 **25,000바이트를 넘으면 잘립니다** — 간결하게 적으세요. 그리고 **Bedrock·Vertex·Foundry**에서는 loop.md를 읽지 않으니, 그 환경에서는 프롬프트를 직접 적어 줘야 합니다.

**용어**
- **.claude/loop.md** — 프로젝트 스코프의 기본 `/loop` 프롬프트. 프로젝트별 커스텀 자동화 규칙을 정의.
- **내장 점검 작업** — `/loop`를 프롬프트·간격 모두 생략하면 자동 실행. '미완료 작업 → PR 케어 → 정리' 순서.

**샘플 코드** — 프로젝트 전용 점검을 `.claude/loop.md`에 정의.
```markdown
Check the `release/next` branch PR:
1. If CI is red, pull the failing job log and propose a minimal fix.
2. If new review comments arrived, address each and resolve threads.
3. If everything green and quiet, say so in one line.

# 이 파일은 `/loop` (프롬프트 생략) 또는 `/loop 15m` (간격만 지정)일 때 사용된다.
```

---

### A4.11 정리: /loop 실전 체크리스트 ⏱ ~30초
**(화면)** 부제: "상황별로 무엇을 쓸지 한 장 요약" / 체크리스트 + 한 줄 요약

> 한 장으로 정리합니다. **상황에 맞는 도구**를 고르는 게 핵심이에요.
> 빠른 감시(배포·CI·PR)는 짧은 고정 간격 `/loop 5m`, 느린 백그라운드 작업은 넉넉한 `/loop 30m`, 상황 변화에 자동 대응은 간격을 뺀 동적 `/loop`. **될 때까지 고치기**는 `/goal all tests pass`, **컴퓨터가 꺼져 있어도** 돌려야 하면 클라우드 `/schedule`입니다.
> 멈추는 법도 함께 — 고정 `/loop`는 **ESC**, `/goal`은 `/goal clear`, 아무것도 안 해도 **7일이면 자동 만료**됩니다. 그리고 세션을 닫았다 열어도 `--resume`/`--continue`로 7일 안 지난 루프는 자동 복구돼요.
> 한 줄로 요약하면 — **폴링은 `/loop`, 수렴은 `/goal`, 상시 자동화는 `/schedule`.** 이 세 가지를 작업 성격에 맞게 조합하면 됩니다.

**용어**
- **린(lean) 운영** — 필요한 최소 `/loop`만 실행. 불필요한 폴링을 줄여 비용·토큰 절감.
- **조합 활용** — `/loop`(폴링) + `/goal`(수렴) + `/schedule`(클라우드)를 작업 성격에 맞게 섞어 쓰는 것.

**이미지 스펙** —
- **ID**: A4-IMG-3
- **목적(전달 정보)**: 작업 상황(빠른 감시 / 느린 작업 / 자동 대응 / 될 때까지 고치기 / 상시 자동화)별로 어떤 명령을 골라야 하는지를 '상황→명령' 짝으로 즉시 매핑한다.
- **유형**: 비교표
- **캔버스**: 1280×720
- **레이아웃**: 2열 결정표. 좌열="상황", 우열="쓸 명령". 행 6개를 위→아래로: 빠른 폴링(1~10분) / 느린 폴링(30~60분) / 동적 폴링 / 될 때까지 고치기 / 상시 자동화(머신 꺼져도) / PR 베이비싯. 헤더 행은 1px 보더로 구분, 각 행 셀 패딩 16px, 행 사이 1px 구분선.
- **텍스트/레이블**: 헤더 — "상황", "쓸 명령". 행 값 — 빠른 폴링: `/loop 5m ...` / 느린 폴링: `/loop 30m ...` / 동적 폴링: `/loop ...` / 될 때까지 고치기: `/goal all tests pass` / 상시 자동화: `/schedule` / PR 베이비싯: `/loop 15m`.
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 표 보더 #D8D2C8. 액센트 teal #1A7F7A는 우열의 명령어 텍스트에만. 상황 라벨은 무채색.
- **타이포**: 상황 라벨은 Pretendard(한글 가독성), 명령어는 JetBrains Mono(등폭으로 명령어·간격값 정렬, 0과 O 구분).
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿·마케팅 상투어. 구획은 1px 보더+여백으로만. 모서리 0~8px(표 셀 모서리 0). 그림자는 쓰더라도 중성 회색 1단(0 1px 2px rgba(0,0,0,.06))만.

---

### A4.12 Q&A: 자주 묻는 질문 ⏱ ~60초
**(화면)** 부제: "/loop 실전에서 자주 나오는 질문 6가지" / Q&A 목록

> 마무리로 자주 나오는 질문을 짚겠습니다.
> **Q. `/loop`와 `/goal`의 차이는?** `/loop`는 정기 폴링이라 수동으로 멈추고, `/goal`은 조건 만족까지 턴마다 자동으로 돌다가 스스로 멈춥니다. 폴링이면 `/loop`, 수렴이면 `/goal`이에요.
> **Q. 세션을 닫았다가 다시 열면?** 7일이 안 지난 `/loop`는 `--resume`/`--continue`로 자동 복구됩니다. 만료된 건 사라져요.
> **Q. 간격은 얼마까지 줄 수 있나?** 최소 1초까지 받지만 **1분 단위로 올림** 처리됩니다(cron이 분 단위라서요).
> **Q. 루프 도중 에러가 나면?** 에러 로그가 대화에 그대로 표시되고, 다음 반복은 정해진 간격에 다시 실행됩니다. 계속 같은 에러가 난다면 루프 결과를 한 번 검토하세요.
> **Q. 여러 `/loop`를 동시에?** 한 세션에 예약 작업을 **최대 50개**까지 가질 수 있습니다. 동시 실행이 아니라 **순차 대기열**로 처리돼요.
> **Q. `/loop`와 Monitor 도구의 차이는?** `/loop`는 cron 기반 정기 폴링이고, Monitor는 백그라운드 스크립트를 돌리며 실시간 로그를 흘려보내는 도구예요. 동적 모드 `/loop`가 내부적으로 Monitor를 쓸 수도 있습니다.

**용어**
- **대기열(queue)** — 여러 예약 작업이 순차로 실행되는 순서. 동시 실행이 아님.
- **Monitor 도구** — 백그라운드 스크립트 실행 + 실시간 로그 스트림. 동적 모드 `/loop`에서 폴링 대신 쓰일 수 있음.


---


## A5 — Fable 5 / Mythos 5 리뷰 — 신기능과 사용법

> 범위: 부록 강의 — Claude **Fable 5** & **Mythos 5**(2026년 6월 9일 출시) 리뷰
> 대상: 비전공자·입문자 (모델·API·터미널을 처음 보는 분 포함)
> 작성 원칙: 처음 나오는 용어는 ① 풀 용어 ② 뜻 ③ 쉬운 비유 순으로 풀이 / 페이지당 1분 내외(표지·정리는 10~30초)
>
> **읽는 법** — `>` 인용 블록 = 실제로 말하는 내레이션, `(화면)` = 연출 지시, `⏱` = 목표 시간, **용어** = 처음 나오는 단어 풀이, **샘플 코드** = 화면에 띄우거나 실습으로 보여줄 코드, **이미지 스펙** = 나중에 만들 다이어그램의 명세.

---

### A5.1 섹션 표지 — Fable 5 & Mythos 5 리뷰 ⏱ ~12초
**(화면)** 표지 "Claude Fable 5 & Mythos 5" / 부제: 차세대 Mythos-Class 모델 — 무엇이 새롭고, 어떻게 쓰는가 / 날짜 2026.06.09

> 이번 부록은 2026년 6월 9일에 나온 **Claude Fable 5**와 **Mythos 5**를 같이 살펴봅니다. 무엇이 좋아졌고, 가격은 어떻게 되고, 그래서 **언제 이 모델로 갈아타면 되는지**까지 — 비전공자분도 따라올 수 있게 천천히 정리해 드릴게요.

---

### A5.2 출시 개요 — Fable 5와 Mythos 5는 무엇인가 ⏱ ~55초
**(화면)** 좌우 2칸: 왼쪽 "Fable 5 — 일반 공개", 오른쪽 "Mythos 5 — 제한 공개(Project Glasswing)" / 가운데 "같은 기반 모델, 다른 안전장치"

> 먼저 큰 그림입니다. Anthropic이 같은 날 **두 모델**을 내놨어요. 이름이 비슷하지만 역할이 다릅니다.
> 하나는 **Fable 5**, 누구나 쓸 수 있는 **일반 공개** 모델이에요. 지금까지 가장 강했던 Opus 4.8을 대체하는, **현재 가장 강력한 공개 모델**입니다.
> 다른 하나는 **Mythos 5**. 능력은 Fable 5와 똑같은데, **안전장치를 걷어낸** 버전이라 아무나 못 씁니다. 승인받은 기관만 접근할 수 있어요. 둘은 '같은 엔진에 다른 잠금장치'라고 생각하면 쉽습니다.
> Fable 5는 출시와 함께 거의 모든 **벤치마크**에서 1위, 그러니까 SOTA를 찍었습니다. 소프트웨어 개발, 지식 업무, 비전(이미지 이해), 과학 분야 전반에서요.

**용어**
- **Mythos-Class** — Anthropic의 최상위 성능 모델 라인. 공개판 Fable 5와 제한판 Mythos 5로 나뉩니다.
- **벤치마크(benchmark)** — 여러 모델을 같은 문제로 시험 보게 해서 점수를 매기는 표준 시험. 학교의 모의고사라고 보면 됩니다.
- **SOTA(State Of The Art)** — '현재 최고 기록'이라는 뜻. 그 분야에서 1등이라는 말입니다.
- **Project Glasswing** — Mythos 5의 접근을 통제하는 Anthropic의 승인 프로그램. 검증된 기관만 들어갑니다.

---

### A5.3 핵심 사양 & 가격 ⏱ ~60초
**(화면)** 사양 카드 4개: 컨텍스트 1M · 출력 최대 128k · 가격 입력 $10 / 출력 $50 (100만 토큰당) · Adaptive thinking 전용

> 숫자 네 개만 기억하시면 됩니다.
> 첫째, **컨텍스트(context)** 기본 **100만 토큰**입니다. 컨텍스트는 모델이 '한 번에 기억하는 작업 공간'이에요. 토큰은 글자를 쪼갠 단위인데, 100만 토큰이면 책 여러 권 분량을 한꺼번에 펼쳐 놓고 작업할 수 있다는 뜻입니다.
> 둘째, **출력은 한 번에 최대 128k 토큰**. 긴 리포트나 대량 코드를 한 방에 뽑아내기 좋습니다.
> 셋째, **가격**. 입력은 100만 토큰당 $10, 출력은 $50입니다. Opus 4.8의 딱 2배예요. 비싸 보이지만, 뒤에서 보듯 '토큰을 덜 쓰고 끝내는' 효율 덕에 실제 청구액은 생각보다 안 오를 수 있습니다.
> 넷째, **Adaptive thinking**, 즉 '적응형 사고'만 지원합니다. 이건 모델이 **문제 난이도를 보고 스스로 고민의 깊이를 조절**하는 모드예요. 우리가 사고량을 끄거나(disabled) 토큰 수로 직접 정할 수 없고, 항상 켜져 있습니다.
> 추가로 한 가지, Fable 5는 **30일 데이터 보유 정책**이 강제됩니다. 데이터를 0일만 보관하는(ZDR) 설정으로는 못 쓰고, 일부 승인 기관만 예외예요.

**용어**
- **컨텍스트(context window)** — 모델이 한 요청에서 한꺼번에 읽고 기억하는 최대 분량. 책상 위에 한 번에 펼칠 수 있는 서류 양이라고 보면 됩니다.
- **토큰(token)** — 글자를 잘게 나눈 처리 단위. 한국어 한 글자가 대략 1~2토큰입니다. 가격이 토큰 단위로 매겨집니다.
- **Adaptive Thinking(적응형 사고)** — 요청 복잡도에 따라 사고 깊이를 자동 조절하는 모드. Fable 5에선 유일한 사고 방식이라 끌 수 없습니다.
- **데이터 보유(data retention)** — 회사가 내 요청·응답을 며칠 보관하느냐의 정책. Fable 5는 30일이 최소 기준입니다.

**이미지 스펙**
- **ID**: A5-IMG-1
- **목적(전달 정보)**: Fable 5의 4대 핵심 사양(컨텍스트·출력·가격·사고 모드)을 한눈에 비교·암기시킨다.
- **유형**: 비교표(사양 카드형)
- **캔버스**: 1280×720
- **레이아웃**: 상단에 제목 영역(높이 96px). 그 아래 2×2 그리드로 카드 4개, 카드 간 24px 간격, 바깥 여백 64px. 각 카드는 1px 보더 박스(라운드 8px), 카드 안 위쪽에 큰 수치, 아래쪽에 한 줄 설명. 카드 순서(좌상→우상→좌하→우하): ①컨텍스트 ②출력 ③가격 ④사고 모드.
- **텍스트/레이블**:
  - 제목: "Fable 5 핵심 사양 4가지"
  - 카드1: 큰 글씨 "1M 토큰" / 설명 "컨텍스트(기본·최대)"
  - 카드2: 큰 글씨 "128k 토큰" / 설명 "요청당 최대 출력"
  - 카드3: 큰 글씨 "$10 / $50" / 설명 "입력 / 출력 · 100만 토큰당 (Opus 4.8의 2배)"
  - 카드4: 큰 글씨 "Adaptive only" / 설명 "사고 모드 — 항상 켜짐, 끌 수 없음"
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. 액센트 teal #1A7F7A는 카드3의 "(Opus 4.8의 2배)" 한 곳과 카드4의 "Adaptive only" 글자에만 사용(가격·제약을 강조).
- **타이포**: 본문은 Pretendard(한국어 라벨 가독성·자간 안정). 수치/모델명은 JetBrains Mono(등폭, 숫자·기호 정렬과 0/O 구분이 명확). 코드·수치는 모노로 통일해 표 느낌을 준다.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백으로만. 그림자 필요 시 0 1px 2px rgba(0,0,0,.06) 한 단만.

---

### A5.4 코딩·소프트웨어 엔지니어링 강점 ⏱ ~60초
**(화면)** 막대 비교 2종: SWE-Bench Pro(Fable 5 80.3% vs Opus 4.8 69.2%) / FrontierCode Diamond(Fable 5 29.3% vs Opus 4.8 13.4% vs GPT-5.5 5.7%) + 사례 카드 "Stripe: 50M 라인 마이그레이션 2개월 → 1일"

> 가장 눈에 띄는 건 **코딩 실력**입니다. 시험 점수로 보겠습니다.
> 먼저 **SWE-Bench Pro**, 실제 깃허브 이슈를 풀게 하는 어려운 시험이에요. Fable 5가 **80.3%**, Opus 4.8이 69.2%. **11%포인트 넘게** 올랐습니다.
> 더 어려운 **FrontierCode Diamond**에서는 Fable 5가 29.3%, Opus 4.8이 13.4%, 비교 대상인 GPT-5.5가 5.7%였어요. 어려운 문제일수록 격차가 벌어집니다.
> 실제 사례도 있어요. 결제회사 **Stripe**가 5천만 줄짜리 루비(Ruby) 코드베이스 마이그레이션을, 원래 **2개월** 걸릴 작업을 **하루 만에** 끝냈다고 보고했습니다.
> 그리고 중요한 포인트 하나 — **토큰 효율**이 좋습니다. 같은 일을 **더 적은 토큰**으로 끝내요. 중간 노력(medium) 설정에서도 최고 점수가 나왔습니다. 수백만 토큰짜리 긴 작업에서도 집중력이 잘 안 떨어지고요.

**용어**
- **SWE-Bench Pro** — 실제 소프트웨어 버그·이슈를 모델이 직접 고치게 해서 통과율을 재는 시험. 높을수록 실전 코딩에 강합니다.
- **마이그레이션(migration)** — 코드를 새 버전·새 구조·새 언어로 옮기는 대규모 이사 작업. 손이 많이 가고 실수가 잦은 일입니다.
- **코드베이스(codebase)** — 한 프로젝트의 전체 소스 코드 묶음. '50M 라인'은 5천만 줄이라는 뜻입니다.
- **토큰 효율** — 같은 결과를 더 적은 토큰으로 만드는 정도. 효율이 좋으면 가격이 2배여도 총비용은 덜 오를 수 있습니다.

**이미지 스펙**
- **ID**: A5-IMG-2
- **목적(전달 정보)**: 두 코딩 벤치마크에서 Fable 5가 Opus 4.8·GPT-5.5 대비 얼마나 앞서는지 막대 길이로 직관 비교시킨다.
- **유형**: 비교표(가로 막대 그래프)
- **캔버스**: 1280×720
- **레이아웃**: 위→아래 2개 섹션. 섹션 헤더(시험 이름)는 좌측 정렬, 아래에 가로 막대들을 같은 0축에서 시작. 각 막대 끝에 수치 라벨. 상단 섹션 "SWE-Bench Pro"(막대 2개: Fable 5, Opus 4.8). 하단 섹션 "FrontierCode Diamond"(막대 3개: Fable 5, Opus 4.8, GPT-5.5). 막대 높이 동일, 막대 간 16px, 섹션 간 48px, 바깥 여백 64px. 막대는 채움 없이 1px 보더 박스로 그리고 길이만 비율대로(80.3% 등 동일 스케일 100% 기준).
- **텍스트/레이블**:
  - 제목: "코딩 벤치마크 — Fable 5 vs 비교 모델"
  - 상단: "SWE-Bench Pro" / "Fable 5  80.3%" / "Opus 4.8  69.2%"
  - 하단: "FrontierCode Diamond" / "Fable 5  29.3%" / "Opus 4.8  13.4%" / "GPT-5.5  5.7%"
  - 하단 캡션: "수치 출처: 인용 벤치마크 자료"
- **색**: 배경 크림 #F0EDE8, 본문·막대 보더 #2B2B2B, 보조 보더 #D8D2C8. Fable 5 막대만 teal #1A7F7A 1px 보더 + 막대 끝 수치를 teal로(우위 강조). 나머지 막대는 무채색 보더.
- **타이포**: 라벨·제목 Pretendard. 퍼센트 수치 JetBrains Mono(숫자 정렬·소수점 가독). 모델명도 모노로 등폭 정렬.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 액센트바·이모지 불릿 금지. 막대는 단색 채움이나 패턴 대신 1px 보더로만 표현. 그림자 최소화.

---

### A5.5 비전·과학·약물 설계 ⏱ ~50초
**(화면)** 3칸: "비전 — 그래프 숫자 추출 / 스크린샷→웹앱 재구축", "약물·단백질 설계(Mythos 5) — 약 10배 가속", "제약 — 생물·화학은 Opus 4.8 폴백 가능"

> 코딩 말고도 강해진 분야가 있습니다.
> 첫째, **비전(vision)**, 즉 이미지를 보는 능력이에요. 과학 논문의 그래프에서 정확한 숫자를 읽어내고, 화면 스크린샷 하나만 보고 그 웹 앱을 다시 만들어 낼 정도입니다.
> 둘째, 과학 쪽 — 특히 **Mythos 5**는 새로운 **단백질(프로테인) 설계** 과정을 약 **10배** 빠르게 해 줍니다. 복잡한 분자 구조를 분석하고 설계를 최적화하는, 어려운 생물정보학 작업에서 정확도가 높아요.
> 다만 솔직하게 한 가지 짚고 갈게요. 일반 공개판인 Fable 5는 **생물·화학 분야 일부 요청**에 대해, 안전장치 때문에 **Opus 4.8로 자동 우회(폴백)**될 수 있습니다. 이건 다음 장에서 자세히 봅니다.

**용어**
- **비전(vision)** — 모델이 이미지·스크린샷·그래프를 '보고' 이해하는 능력. 글뿐 아니라 그림도 입력으로 받습니다.
- **단백질/프로테인 설계** — 원하는 기능을 가진 단백질을 컴퓨터로 설계하는 작업. 신약·치료제 연구의 핵심 단계입니다.
- **생물정보학(bioinformatics)** — 생물 데이터(유전자·분자 구조 등)를 컴퓨터로 분석하는 분야.
- **폴백(fallback)** — 어떤 모델이 요청을 못/안 받을 때 **다른 모델로 자동 넘기는** 안전 우회. '예비 라인'이라고 보면 됩니다.

---

### A5.6 안전장치 & 폴백 메커니즘 ⏱ ~60초
**(화면)** 흐름도: 사용자 요청 → Fable 5 분류기(3종 검사) → 민감 주제? → YES: 거부 + Opus 4.8 폴백 / NO: Fable 5 응답 / 하단 메모 "95%+ 세션은 폴백 없음"

> Fable 5에는 똑똑한 **문지기**가 붙어 있습니다. 들어오는 요청을 **3개의 분류기(classifier)**가 자동으로 검사해요. ①사이버보안, ②생물·화학, ③모델 distillation, 이 세 가지를 봅니다.
> 만약 사이버 공격이나 위험한 생물 이중용도 연구처럼 **고위험 영역**이면, Fable 5는 응답을 **거부**하고 더 보수적인 **Opus 4.8로 폴백**합니다.
> 겁먹을 필요는 없어요. **95% 이상의 세션에서는 폴백이 아예 안 일어납니다.** 일상적인 코딩·문서 작업은 거의 다 Fable 5가 직접 처리해요.
> 비용 면에서도 배려가 있습니다. 폴백이 일어나도, 캐시 비용 같은 걸 **환불(fallback credit)**해 줘서 불필요한 중복 청구를 막습니다.
> 그리고 핵심 차이 — **Mythos 5에는 이 안전장치가 전혀 없습니다.** 그래서 Project Glasswing 승인 기관만 쓸 수 있는 거예요.

**용어**
- **분류기(classifier)** — 들어온 요청이 위험한 주제인지 아닌지를 자동으로 판정하는 검사기. 공항의 보안 검색대 같은 역할입니다.
- **distillation(증류)** — 강한 모델의 능력을 베껴 작은 모델을 만드는 행위. 여기서는 모델을 무단 복제하려는 시도를 막는 검사를 뜻합니다.
- **이중용도(dual-use)** — 좋게도 나쁘게도 쓸 수 있는 연구·기술. 위험성이 커서 더 엄격히 다룹니다.
- **fallback credit(폴백 환불)** — 폴백이 발생했을 때 발생한 일부 비용(특히 prompt 캐시 비용)을 되돌려 주는 제도.

**이미지 스펙**
- **ID**: A5-IMG-3
- **목적(전달 정보)**: 사용자 요청이 Fable 5의 분류기를 거쳐 '직접 응답'과 'Opus 4.8 폴백'으로 갈라지는 처리 흐름을 단계별로 보여 준다.
- **유형**: 플로우차트
- **캔버스**: 1280×720
- **레이아웃**: 좌→우 단일 흐름. 박스를 화살표로 연결. ①"사용자 요청" 박스(좌측) → ②"Fable 5 분류기 — 사이버 / 생물·화학 / distillation 검사" 박스 → ③"민감 주제?" 마름모(판단 노드) → 두 갈래로 분기. 위 갈래(YES, 우상): "거부 + Opus 4.8 폴백" 박스, 화살표에 "YES" 라벨. 아래 갈래(NO, 우하): "Fable 5가 직접 응답" 박스, 화살표에 "NO" 라벨. 캔버스 하단 가로 폭 전체에 메모 바: "전체 세션의 95% 이상은 폴백 없이 Fable 5가 직접 처리". 박스 간 가로 간격 48px, 바깥 여백 64px.
- **텍스트/레이블**:
  - 제목: "Fable 5 요청 처리 흐름"
  - 박스 텍스트: "사용자 요청" / "Fable 5 분류기 (3종 검사)" / "민감 주제?" / "거부 → Opus 4.8 폴백" / "Fable 5 직접 응답"
  - 화살표 라벨: "YES" / "NO"
  - 하단 메모: "95%+ 세션: 폴백 미발동 · 폴백 시 prompt-cache 비용 환불"
- **색**: 배경 크림 #F0EDE8, 박스 보더·본문 #2B2B2B, 보조선 #D8D2C8. 액센트 teal #1A7F7A는 "민감 주제?" 판단 노드 보더와 "거부 → Opus 4.8 폴백" 경로(YES 화살표 + 박스 보더)에만 사용해 위험 분기를 강조. NO 경로와 나머지는 무채색.
- **타이포**: 라벨·박스 텍스트 Pretendard. 모델명(Fable 5, Opus 4.8)과 "95%+" 수치는 JetBrains Mono로 등폭 강조.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·박스 상단 컬러 액센트바·이모지 불릿 금지. 박스는 1px 보더+여백으로만 구획. 화살표는 가는 단색 선, 그림자 없음.

---

### A5.7 Claude Code에서 Fable 5 사용하기 ⏱ ~60초
**(화면)** 터미널 목업: `/model fable` 실행 → "Switched to claude-fable-5" / 하단 메모 "최소 버전 2.1.170 이상 · 선택은 자동 저장"

> 이제 실제로 써 봅시다. **Claude Code**에서 Fable 5로 바꾸는 건 명령어 한 줄이면 됩니다.
> 터미널에 `/model fable` 또는 `/model claude-fable-5`라고 치면 모델이 전환돼요. 한 번 고르면 **user settings에 자동 저장**돼서 다음 세션에도 그대로 유지됩니다.
> 주의할 점 하나 — Claude Code **버전이 2.1.170 이상**이어야 합니다. 너무 옛날 버전이면 목록에 안 보일 수 있어요. `claude --version`으로 확인하고, 필요하면 업데이트하세요.
> 배포 환경마다 모델 이름표가 조금 다릅니다. **Claude API**에서는 `claude-fable-5` 그대로 쓰고, **AWS Bedrock**이나 **Google Vertex AI**에서는 그 플랫폼 전용 ID를 환경변수로 지정해야 합니다.
> 참고로 **GitHub Copilot**도 2026년 6월부터 Fable 5를 지원합니다. 구독 요금제에 추가 비용 없이요(6월 22일까지 일반 공개 일정).

**용어**
- **Claude Code** — 터미널에서 돌아가는 Anthropic 공식 코딩 도구. `/model` 같은 슬래시 명령으로 조작합니다.
- **슬래시 명령(slash command)** — `/`로 시작하는 도구 내부 명령. `/model`은 사용할 모델을 바꿉니다.
- **user settings(사용자 설정)** — 내 계정·내 컴퓨터에 저장되는 개인 설정. 모델 선택이 여기 저장돼 다음에도 유지됩니다.
- **모델 ID** — 모델을 코드에서 지정하는 정확한 이름표. Claude API는 `claude-fable-5`, 클라우드 배포판은 provider별 ID를 씁니다.

**샘플 코드** — Claude Code에서 Fable 5로 전환 (macOS 터미널 기준; Windows/WSL도 동일).
```bash
# 모델 전환 — 둘 중 아무거나
/model fable
# 또는
/model claude-fable-5

# 현재 버전 확인 (2.1.170 이상 필요)
claude --version
```

**샘플 코드** — Claude API SDK로 Fable 5 호출 (Python).
```python
from anthropic import Anthropic

# API key는 환경변수 ANTHROPIC_API_KEY로 두는 것을 권장 (코드에 하드코딩 금지)
client = Anthropic()

# Fable 5는 adaptive thinking이 항상 켜져 있음 → thinking 파라미터는 생략한다.
# temperature 같은 샘플링 옵션도 보내면 400 에러 → 넣지 않는다.
message = client.messages.create(
    model="claude-fable-5",
    max_tokens=2048,
    messages=[{"role": "user", "content": "Your prompt here"}],
)
print(message.content[0].text)
```

**이미지 스펙**
- **ID**: A5-IMG-4
- **목적(전달 정보)**: `/model fable` 한 줄로 Claude Code에서 모델이 전환되고 설정이 저장되는 경험을 터미널 화면 그대로 보여 준다.
- **유형**: 터미널 목업
- **캔버스**: 1280×720
- **레이아웃**: 가운데에 터미널 창 1개(폭 약 960px, 1px 보더, 라운드 8px, 상단에 얇은 타이틀 바 + 좌측 신호등 도형 3개는 단색 원 외곽선만). 창 안은 프롬프트 줄 → 입력 명령 → 출력 메시지 순으로 위→아래. 창 아래 64px 여백 두고 메모 한 줄. 바깥 여백 96px.
- **텍스트/레이블**:
  - 타이틀 바: "zsh — claude-code"
  - 1행(프롬프트): "❯ /model fable"  (프롬프트 기호는 ❯ 대신 텍스트로 `>` 사용 가능)
  - 2행(출력): "Switched to claude-fable-5"
  - 3행(출력): "Saved to user settings — persists next session"
  - 하단 메모: "필요 버전: Claude Code 2.1.170 이상  ·  확인: claude --version"
- **색**: 터미널 배경은 크림 계열을 그대로 쓰되 약간 밝은 #F4F1EC, 창 보더 #D8D2C8, 일반 텍스트 #2B2B2B. 액센트 teal #1A7F7A는 입력한 명령 `/model fable`과 출력의 모델 ID `claude-fable-5` 글자에만(성공 상태 강조). 신호등 원은 무채색 외곽선.
- **타이포**: 터미널 안 전부 JetBrains Mono(등폭 — 실제 터미널 질감, 0/O·l/1 구분). 창 밖 제목·메모는 Pretendard.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·창 상단 컬러 액센트바·이모지 불릿 금지. 신호등을 빨강/노랑/초록 채움으로 칠하지 말 것(무채색 외곽선만 — 장식 색 금지). 그림자 필요 시 0 1px 2px rgba(0,0,0,.06) 한 단만.

---

### A5.8 Fable 5 vs Opus 4.8 — 언제 업그레이드할까? ⏱ ~55초
**(화면)** 비교표: 모델 | 성능 | 가격(입/출) | 추천 용도 / Fable 5(SOTA / $10·$50 / 대형·장기·멀티턴) vs Opus 4.8(높음 / $5·$25 / 간단·빠른 응답)

> 가장 많이 받는 질문, **"꼭 Fable 5로 갈아타야 하나요?"** 정답은 '경우에 따라'입니다.
> **Fable 5가 어울리는 일** — 대형 코드 리팩토링, 50줄 넘는 스크립트, 여러 단계 추론이 필요한 아키텍처 설계처럼 **크고 긴** 작업이요.
> **Opus 4.8로도 충분한 일** — 간단한 버그 수정, 문법 검사, 빠른 응답이 더 중요한 경우, 그리고 비용을 아끼고 싶을 때입니다.
> 가격은 2배지만, **성능·속도·정확도가 크게 올라가니** 그 비용이 값을 하는지(ROI)를 따져 보세요. 가장 확실한 방법은 **같은 작업을 두 모델로 한 번씩 시켜 보고 결과를 비교**하는 겁니다. 직접 써 보는 게 제일 정확합니다.

**용어**
- **리팩토링(refactoring)** — 동작은 그대로 두고 코드 구조만 더 깔끔하게 고치는 작업.
- **멀티턴(multi-turn)** — 한 번 묻고 끝이 아니라, 여러 번 주고받으며 이어 가는 대화형 작업.
- **ROI(Return On Investment)** — 투자 대비 효과. 가격 2배를 내고 그만큼 이득이 있는지 따지는 것.
- **아키텍처 설계** — 프로그램의 전체 구조·뼈대를 정하는 일. 긴 추론이 필요해 강한 모델이 유리합니다.

**이미지 스펙**
- **ID**: A5-IMG-5
- **목적(전달 정보)**: Fable 5와 Opus 4.8을 성능·가격·추천 용도 3축으로 나란히 비교해 '내 작업은 어느 쪽인지' 판단을 돕는다.
- **유형**: 비교표
- **캔버스**: 1280×720
- **레이아웃**: 2열 × 4행 표. 맨 왼쪽 좁은 라벨 열(항목명) + 모델 2열(Fable 5 / Opus 4.8). 행: ①모델명(헤더) ②성능 ③가격(입/출) ④추천 용도. 셀은 1px 보더, 헤더 행만 살짝 굵은 보더로 구분. 표 폭 약 1000px, 가운데 정렬, 바깥 여백 96px. 셀 안은 좌측 정렬, 충분한 패딩(16px).
- **텍스트/레이블**:
  - 제목: "Fable 5 vs Opus 4.8 — 선택 기준"
  - 헤더: 빈칸 / "Fable 5" / "Opus 4.8"
  - 성능 행: "성능" / "SOTA (최고)" / "높음"
  - 가격 행: "가격(입/출, 100만 토큰)" / "$10 / $50" / "$5 / $25"
  - 용도 행: "추천 용도" / "대형 리팩토링·장기 추론·멀티턴·비전" / "간단한 작업·빠른 응답·비용 절감"
- **색**: 배경 크림 #F0EDE8, 표 보더 #D8D2C8, 본문 #2B2B2B. 액센트 teal #1A7F7A는 Fable 5 열의 헤더 텍스트 "Fable 5"와 "SOTA (최고)" 셀 글자에만(우위 강조). 나머지는 무채색.
- **타이포**: 항목 라벨·용도 설명 Pretendard. 모델명·가격 수치 JetBrains Mono(가격 정렬·통화 기호 가독).
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·헤더 상단 컬러 액센트바·이모지 불릿 금지. 행 구분은 1px 보더로만(줄무늬 배경색 금지). 그림자 최소화.

---

### A5.9 Claude Mythos 5 — 누가, 언제, 왜? ⏱ ~50초
**(화면)** 카드: "대상 — Project Glasswing 승인 기관(사이버 방어자·인프라·생물 연구)", "차이 — 안전장치 제거, 거부 없이 처리", "접근 — 계정팀 문의·개별 승인"

> 그럼 **Mythos 5**는 누가 쓸까요? 결론부터 — 일반 사용자는 신경 안 쓰셔도 됩니다. Fable 5로 충분해요.
> Mythos 5의 **대상**은 Project Glasswing 승인 기관입니다. 사이버 방어자, 인프라 제공자, 생물학 연구기관처럼 **검증된 곳**만이요.
> **차이**는 명확합니다. Fable 5의 안전장치를 **제거**해서, 모든 요청을 거부 없이 처리합니다. 그래서 사이버보안 분야에서는 취약점을 찾아내고 다루는 능력이 세계 최강 수준이에요 — 단, **검증된 용도에 한해서**입니다.
> **접근 방법**은 Anthropic, AWS, Google Cloud의 **계정팀에 직접 문의**해서 개별 승인을 받는 거예요. 자동 가입이 아닙니다.
> 다시 강조하면 — 일반 사용자는 Fable 5가 **같은 기능을 안전 범위 안에서** 제공하니 그걸로 충분합니다.

**용어**
- **사이버 방어자(cyber defender)** — 공격을 막고 시스템을 지키는 보안 전문가·조직. Mythos 5의 정당한 사용처 중 하나입니다.
- **취약점(vulnerability)** — 시스템의 보안 약점·구멍. 방어자는 이걸 미리 찾아 막아야 합니다.
- **계정팀(account team)** — 클라우드·API 제공사가 큰 고객에게 붙여 주는 전담 담당팀. Mythos 5 접근은 여기로 문의합니다.

---

### A5.10 실전 팁 & 주의점 ⏱ ~60초
**(화면)** 체크리스트 5: prompt 구조 / effort 파라미터 / refusal 처리 / 데이터 보유 / 토큰 효율

> 실제로 쓸 때 도움 되는 팁 다섯 가지입니다.
> 첫째, **프롬프트 구조**. 긴 작업은 '먼저 생각해 보고(reasoning), 그 다음 행동'하도록 유도하면 결과가 좋아집니다.
> 둘째, **effort 파라미터**. low(빠름)·medium(균형)·high(깊은 사고)로 **비용과 품질을 조절**할 수 있어요. 간단한 일엔 low, 어려운 일엔 high.
> 셋째, **refusal 처리**. Fable 5가 요청을 거부할 때(`stop_reason='refusal'`) 이건 **에러가 아니라** 정상 응답입니다. HTTP 상태는 200이에요. 그래서 코드에서 `content`를 바로 읽기 전에 `stop_reason`을 먼저 확인하는 처리가 필요합니다.
> 넷째, **데이터 보유**. 30일 정책이라, 극도로 민감한 코드는 로컬에서 처리하는 게 안전합니다.
> 다섯째, **토큰 효율**. 앞서 말했듯 같은 작업을 Opus 4.8보다 적은 토큰으로 끝낼 수 있어서, **가격이 2배여도 전체 비용은 더 낮을 수 있습니다.**

**용어**
- **effort 파라미터** — 모델이 얼마나 깊게 고민할지를 정하는 옵션. low/medium/high로 비용·속도·품질을 맞춥니다.
- **refusal(거부)** — 안전장치가 요청을 거절한 상태. HTTP 200(정상)으로 오고 `stop_reason`이 `'refusal'`이라 에러로 잡으면 안 됩니다.
- **stop_reason** — 응답이 왜 끝났는지를 알려주는 필드. `end_turn`(정상 종료), `refusal`(거부) 등이 있습니다.
- **로컬 처리(local)** — 데이터를 외부 API로 보내지 않고 내 컴퓨터 안에서만 다루는 것. 민감 정보 보호에 유리합니다.

**샘플 코드** — refusal은 에러가 아니므로 `stop_reason`을 먼저 확인 (Python).
```python
message = client.messages.create(
    model="claude-fable-5",
    max_tokens=2048,
    messages=[{"role": "user", "content": "Your prompt here"}],
)

# Fable 5는 거부 시 HTTP 200 + stop_reason="refusal"로 응답한다 (에러 아님).
# content를 바로 읽기 전에 stop_reason을 먼저 확인할 것.
if message.stop_reason == "refusal":
    # 거부됨: content가 비어 있거나 일부만 있을 수 있으니 별도 처리
    print("Request was declined by safety classifiers.")
else:
    print(message.content[0].text)
```

---

### A5.11 가용성 & 확장 일정 ⏱ ~45초
**(화면)** 타임라인/플랫폼 표: Claude API(6/9 즉시) · 구독 6/9~6/22 단계 배포 · AWS Bedrock · Vertex AI · Microsoft Foundry · GitHub Copilot(6월, 6/22 전체)

> 어디서 쓸 수 있는지 정리하겠습니다.
> **Claude API**는 6월 9일 즉시 일반 공개됐습니다. 사용한 만큼 내는 pay-as-you-go와 Enterprise 둘 다요.
> **구독 요금제**는 6월 9일부터 22일까지 단계적으로 배포돼서, 전체 사용자에게 풀릴 예정입니다.
> 클라우드 플랫폼도 다 됩니다. **AWS Bedrock**, **Google Cloud의 Vertex AI**, **Microsoft Foundry** 모두 지원 중이에요.
> **GitHub Copilot**은 2026년 6월에 일반 공개를 시작해서, 6월 22일에 전체 사용자 대상으로 제공됩니다.
> 정리하면 — 거의 모든 주요 경로에서 Fable 5를 쓸 수 있다고 보면 됩니다.

**용어**
- **pay-as-you-go(종량제)** — 쓴 만큼만 비용을 내는 방식. 미리 큰돈을 약정하지 않습니다.
- **Enterprise(기업 요금제)** — 대규모 조직용 계약형 요금제.
- **AWS Bedrock / Vertex AI / Microsoft Foundry** — 각각 아마존·구글·마이크로소프트의 클라우드에서 Claude를 쓰게 해 주는 플랫폼. 모델 ID 표기만 조금씩 다릅니다.
- **GitHub Copilot** — 깃허브의 코딩 보조 도구. 이제 Fable 5를 선택지로 제공합니다.

---

### A5.12 정리 — Fable 5는 언제 쓸까? ⏱ ~30초
**(화면)** 한줄 요약 + 출처: "지금 Opus 4.8을 쓴다면, 그 다음 단계로 Fable 5를 시도해 보세요" / 공식 문서 링크

> 마지막으로 한 줄 정리입니다. **지금 Opus 4.8을 쓰고 있다면, 다음 단계로 Fable 5를 한번 시도해 보세요.** Stripe 엔지니어 표현으로는, 단순히 '더 좋다'를 넘어 '질적으로 다른' 경험이라고 합니다.
> 비용은 가격 2배 × 더 적은 토큰이라, 전체 예산은 대략 **1.2~1.5배** 증가에 품질은 크게 올라가는 그림이에요. 특히 **코드 리팩토링, 멀티턴 추론, 장기 컨텍스트, 그리고 스크린샷 분석 같은 비전 작업**에 추천합니다.
> 더 자세한 건 화면의 공식 문서를 참고하세요. 부록은 여기까지입니다. 수고하셨습니다.

**용어**
- **장기 컨텍스트(long context)** — 아주 긴 입력을 한 번에 다루는 작업. 100만 토큰 컨텍스트가 빛을 발하는 영역입니다.

> 공식 문서: https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5


---


## A6 — 베스트 프랙티스 — 자율운용과 자동화

> 범위: 부록 강의 "베스트 프랙티스 — 자율운용과 자동화" 섹션 (슬라이드 A6.1 ~ A6.30)
> 대상: 비전공자·입문자 (권한·훅·스케줄링을 처음 접하는 분 포함)
> 작성 원칙: 처음 나오는 용어는 ① 풀 용어 ② 뜻 ③ 쉬운 비유 순으로 풀이 / 페이지당 1분 내외(표지·정리는 12~30초)
>
> **읽는 법** — `>` 인용 블록 = 실제로 말하는 내레이션, **(화면)** = 연출 지시, ⏱ = 목표 시간, **용어** = 처음 나오는 단어 풀이, **샘플 코드** = 화면에 띄우거나 실습으로 보여줄 코드, **이미지 스펙** = 나중에 이 명세대로 만들 다이어그램.

---

### A6.1 섹션 표지 — 자율운용과 자동화 ⏱ ~12초
**(화면)** 섹션 표지 "베스트 프랙티스 — 자율운용과 자동화" / 부제: 권한 모드 · 자율 루프 · 훅 · 헤드리스 · 스케줄링 · 샌드박싱

> 부록의 이 섹션은 클로드 코드를 **'얼마나 알아서 하게 두느냐'**, 그리고 **'반복 작업을 어떻게 자동으로 돌리느냐'** 두 기둥을 다룹니다. 권한을 좁게 주는 법, 검증 기준을 명확히 잡는 법, 훅과 스케줄링으로 손 안 대고 돌리는 법까지요. 외울 건 없고, '자율은 편하지만 자동화는 가드레일이 먼저다' 이 감각만 가져가시면 됩니다.

---

### A6.2 자율운용의 5가지 권한 모드 ⏱ ~70초
**(화면)** 권한 모드 5종을 '감독적 → 무인'으로 늘어놓은 스펙트럼 다이어그램

> 클로드 코드가 어디까지 알아서 해도 되는지를 정하는 게 **권한 모드(permission mode)**입니다. '권한 모드'란 클로드가 확인 없이 실행할 수 있는 범위를 정하는 전역 스위치예요. 비유하면 운전 보조의 단계 같은 겁니다. 다섯 단계를 왼쪽(보수적)부터 보겠습니다.
>
> 첫째 **Default(기본)** — 파일을 고치거나 셸 명령을 돌리기 전에 **매번 확인**을 받습니다. 가장 안전하지만 가장 손이 많이 가요. 둘째 **acceptEdits** — 파일 편집과 `mkdir`·`mv`·`cp` 같은 평범한 파일 작업은 자동 승인하고, 그 외 셸 명령은 여전히 물어봅니다. 셋째 **Plan(계획)** — 읽기·탐색만 되고 **편집은 금지**예요. 구현 전에 코드를 둘러보고 계획만 세우는 단계 전용입니다.
>
> 넷째 **Auto** — 배경에 안전 검증기가 붙어 모든 명령을 평가하고(권한 확장·미확인 인프라·악의적 콘텐츠를 차단), 감시 아래에서는 제한 없이 진행합니다. 아직 **연구 미리보기** 단계예요. 다섯째 **bypassPermissions** — 모든 권한 프롬프트를 건너뜁니다(명시적 ask 규칙과 `rm -rf /`만 예외). 반드시 **컨테이너나 가상머신(VM) 안에서만** 쓰고, **프로덕션 서버에서는 절대 금지**입니다.

**용어**
- **Default mode** — 모든 작업을 사람이 검토·승인하는 가장 보수적인 모드.
- **Permission mode** — 클로드 코드가 확인 없이 실행할 수 있는 범위를 정하는 전역 설정.
- **VM(가상머신)** — 진짜 컴퓨터 안에 격리해 띄운 '가짜 컴퓨터'. 망가져도 본체엔 영향이 없음.

**이미지 스펙**
- **ID**: A6-IMG-1
- **목적(전달 정보)**: 권한 모드 5종이 '감독적(프롬프트 많음·안전) ↔ 무인(프롬프트 없음·위험)' 축의 어디에 놓이는지와, 각 모드의 자동 승인 범위·확인 빈도를 한눈에 비교한다.
- **유형**: 비교표 + 스펙트럼 다이어그램
- **캔버스**: 1280×720
- **레이아웃**: 상단에 좌→우 가로 스펙트럼 바 1개(왼쪽 끝 "감독적", 오른쪽 끝 "무인"). 바 위에 5개 노드를 등간격으로: Default → acceptEdits → Plan(읽기 전용으로 살짝 분리 표기) → Auto → bypassPermissions. 하단에 5열 비교표: 행 = "자동 승인 범위", "확인 프롬프트", "권장 환경", "비고". 표 셀은 1px 보더로만 구분.
- **텍스트/레이블**: 열 제목 = Default / acceptEdits / Plan / Auto / bypassPermissions. "자동 승인 범위" 행 = 없음 / 파일편집·mkdir·mv·cp / 읽기·탐색만 / 검증 통과 명령 / 전부(ask·rm -rf / 제외). "권장 환경" 행 = 일반 / 소규모 신뢰팀 / 탐색·계획 / 자동화(연구 미리보기) / 컨테이너·VM 전용.
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. 액센트 teal #1A7F7A는 스펙트럼 바와 "VM 전용" 경고 텍스트에만.
- **타이포**: 본문 = Pretendard(한글 라벨 가독·등폭 정렬 안정). 모드명·명령은 JetBrains Mono(0과 O 구분, 코드 식별성).
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백으로만. 모서리 0~8px. 그림자는 쓰더라도 0 1px 2px rgba(0,0,0,.06)만.

---

### A6.3 DO / DON'T — 권한 모드 선택 규칙 ⏱ ~60초
**(화면)** 좌측 DO(체크), 우측 DON'T(엑스) 2열 대비 + 명령 1줄 강조

> 권한 모드는 **신뢰도에 맞춰** 고르는 게 핵심입니다.
>
> **DO** — 작은 팀이고 서로 신뢰가 높으면 acceptEdits, 자동화가 꼭 필요하면 auto, 완전 무인이면 bypassPermissions(단 VM에서만)를 고르세요. 또 단발 작업은 `--allowedTools`로 범위를 좁히는 게 좋아요. 예를 들어 CI에서 테스트와 편집만 허용하면 됩니다. 그리고 auto 모드의 한계도 알아 두세요 — 안전 분류기가 **8회 연속 차단**하면 auto가 자동으로 멈춥니다. 그때는 접근 방식 자체를 다시 봐야 한다는 신호예요.
>
> **DON'T** — Default에서 "Yes, don't ask again"을 계속 누르지 마세요. 그렇게 쌓인 권한 규칙은 나중에 엉킵니다. 차라리 설정 파일에 명시적으로 적고 재시작하세요. 그리고 다시 강조하지만 **프로덕션 서버에서 bypassPermissions는 금지**입니다. OS 레벨 샌드박스와 같이 써도 위험해요. 로컬 개발 VM 전용입니다.

**용어**
- **`--allowedTools`** — 이번 실행에서만 허용할 도구를 직접 지정하는 옵션. 전역 설정과 무관하게 범위를 좁힘.
- **CI(지속적 통합, Continuous Integration)** — 코드를 올릴 때마다 자동으로 빌드·테스트를 돌려 주는 자동화 서버.

**샘플 코드** — CI에서 테스트와 편집만 허용하는 단발 실행.
```bash
# 이번 실행은 테스트 실행과 파일 편집만 허용 (그 외 셸 명령은 막힘)
claude -p 'Fix failing tests and edit code only' \
  --allowedTools 'Bash(npm test),Edit'
```

---

### A6.4 자율 루프 패턴 — Iterate Until Green ⏱ ~60초
**(화면)** "목표 제시 → 실행 → 진단 → 수정 → 재실행 → 통과" 순환 플로우

> 자율운용에서 가장 효과 좋은 패턴이 **'Iterate until green'**, 우리말로 '초록불 될 때까지 반복'입니다. 여기서 초록(green)은 테스트나 빌드가 **통과**한 상태를 뜻해요.
>
> 방식은 간단합니다. 먼저 검증 목표를 제시하고 — 예를 들어 "테스트를 모두 통과시켜라" — 그러면 클로드가 실행하고, 실패를 진단하고, 고치고, 다시 실행하기를 **통과할 때까지 스스로 반복**합니다. 개발자가 매 시도마다 끼어들 필요가 없어요. 피드백 루프를 클로드가 직접 닫는 거죠.
>
> 제약도 분명합니다. 테스트나 빌드가 너무 오래 걸리면(10초 넘으면) 그만큼 컨텍스트를 낭비합니다. 그래서 처음엔 **단일 테스트 파일이나 린트 하나**로 시작하는 게 좋아요. 별도 스킬은 필요 없습니다. 기본 제공이에요. 대신 Plan 모드는 끄고, 검증 기준을 명확히 줘야 합니다. 검증 체크를 줬을 때 자가 수렴 효율이 크게 올라간다는 게 Anthropic 권장 사항입니다.

**용어**
- **Iterate until green** — 테스트·빌드 통과를 목표로 클로드가 알아서 고치고 다시 돌리기를 반복하는 루프.
- **린트(lint)** — 코드 스타일·문법 오류를 자동으로 잡아 주는 검사 도구. 테스트보다 빠르게 끝남.

**샘플 코드** — 자율 루프를 트리거하는 프롬프트 한 줄.
```text
Fix failing tests and iterate until they all pass.
Run the test suite after each change.
```

**이미지 스펙**
- **ID**: A6-IMG-2
- **목적(전달 정보)**: 사람이 한 번만 목표를 주면 클로드가 '실행→진단→수정→재실행'을 스스로 닫아 통과까지 반복한다는 폐쇄 피드백 루프 구조를 보여 준다.
- **유형**: 플로우차트(순환)
- **캔버스**: 1280×720
- **레이아웃**: 좌측에 "목표 제시"(사람 입력) 박스 1개 → 우측으로 화살표 진입. 중앙에 시계 방향 원형 루프 4박스: 실행 → 진단 → 수정 → 재실행. "재실행"에서 분기: 실패면 "진단"으로 화살표 되돌아감, 통과면 아래 "초록불 = 종료" 박스로 빠져나감.
- **텍스트/레이블**: "목표 제시 (검증 기준 포함)", "실행", "진단", "수정", "재실행", 분기 라벨 "실패 → 반복" / "통과 → 종료", 종료 박스 "GREEN: 모든 테스트 통과".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. teal #1A7F7A는 "통과 → 종료" 경로와 GREEN 박스에만(상태 강조).
- **타이포**: 본문 Pretendard. 종료 박스의 "GREEN" 키워드는 JetBrains Mono로 상태 코드처럼 표기.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백. 모서리 0~8px. 그림자는 0 1px 2px rgba(0,0,0,.06)만.

---

### A6.5 DO / DON'T — 자율 루프 운영 ⏱ ~55초
**(화면)** 2열 DO/DON'T + "객관적 기준 vs 주관적 기준" 대비

> 자율 루프의 성패는 **검증 기준을 객관적으로 주느냐**에 달렸습니다.
>
> **DO** — 통과 조건을 구체적으로 쓰세요. "이 케이스가 통과해야 한다: `user@example.com→true`, `invalid→false`, `user@.com→false`"처럼요. 그리고 느린 검증(10초 넘는 것)은 별도 단계로 분리하세요. CI 테스트는 `/goal` 조건이나 Stop 훅으로 막고, 로컬 린트는 PostToolUse 훅으로 빠르게 돌립니다. 또 auto 모드가 **8회 넘게 차단**하면 구현 접근이 틀린 거니 계획 단계로 돌아가세요.
>
> **DON'T** — "코드가 좋아 보이면 끝내" 같은 **주관적 기준**은 쓰지 마세요. 끝나는 조건이 없어 무한 루프가 될 수 있습니다. 그리고 테스트 전체를 한 번에 돌리지 마세요. `npm test` 대신 `tests/auth.test.ts` 하나만 돌려 피드백을 빠르게 받는 게 낫습니다. 컨텍스트가 차서 루프를 끝낼 바엔, `/clear` 후 재시작이 백그라운드 자동화보다 깔끔합니다.

**용어**
- **`/goal`** — 작업의 성공 기준을 명시하는 명령. 이 조건을 통과해야 작업이 끝난 것으로 봄.
- **Stop 훅** — 클로드가 턴을 끝내기 직전에 실행되는 검사. 최종 검증을 거는 자리.

---

### A6.6 헤드리스 & 스크립트 자동화 — claude -p ⏱ ~60초
**(화면)** 부제: "대화 없이 한 번에 실행 — CI·훅·배치" / 출력 포맷 3종 칩

> 사람이 대화하지 않고 클로드를 한 방에 돌리는 게 **헤드리스(headless)** 모드입니다. '헤드리스'는 '화면(머리) 없이'라는 뜻으로, 대화창 없이 명령줄에서 프롬프트 하나로 실행한다는 거예요. 명령은 `claude -p "프롬프트"` 형태입니다.
>
> 용도는 CI/CD, 커밋 전 검사(pre-commit hook), 대량 배치 처리, 무인 리뷰 같은 거예요. 핵심 옵션 두 개를 보겠습니다. **`--bare`** 플래그는 훅·스킬·MCP·CLAUDE.md를 전부 건너뛰어, **어느 머신에서 돌려도 같은 결과**를 보장합니다. CI에서 권장해요. 그리고 **출력 포맷**은 text(기본)·json(구조화)·stream-json(실시간) 중에 파이프라인에 맞게 고릅니다.
>
> 한 가지 주의. 백그라운드로 띄운 작업(예: 개발 서버)은 자동으로 5초 뒤 종료됩니다. 오래 돌려야 하면 별도로 관리해야 해요.

**용어**
- **헤드리스(headless) 모드** — 대화창 없이 명령줄에서 프롬프트 하나로 클로드를 실행하는 방식. `claude -p`.
- **`--bare`** — 프로젝트 설정(훅·스킬·MCP·CLAUDE.md)을 무시하고 넘긴 매개변수만으로 실행하는 스크립팅 모드.
- **CI/CD** — 코드를 올리면 자동으로 빌드·테스트(CI)하고 배포(CD)까지 이어 주는 자동화 파이프라인.

**샘플 코드** — 읽기·편집·테스트만 허용하는 헤드리스 실행.
```bash
# 대화 없이 한 번에 실행 — 읽기/편집/테스트만 허용
claude -p "Your prompt" \
  --allowedTools 'Read,Edit,Bash(npm test)'
```

---

### A6.7 DO / DON'T — CI·헤드리스 안전 ⏱ ~60초
**(화면)** 2열 DO/DON'T + json 출력의 `cost_usd` 필드 강조

> 헤드리스를 CI에 걸 때는 **설정을 명시하고 권한을 단계별로 좁히는** 게 원칙입니다.
>
> **DO** — `--bare`에 명시적 설정을 같이 주세요. `--settings '{...}'`로 설정을 박고 `--allowedTools`로 도구를 한정합니다. 파이프라인 각 단계도 권한을 최소화하세요. 린트 단계는 `Bash(npm run lint)`만, 수정 단계는 `Edit,Bash(npm run lint)`만요. 또 `--output-format json`을 쓰면 `cost_usd` 필드로 매 실행 비용을 기록할 수 있고, 구조화 출력은 `jq`로 파싱하면 됩니다.
>
> **DON'T** — CI에서 `.claude/settings.json`이나 `~/.claude/`를 자동 로드하게 두지 마세요. 개발자 로컬 설정이 끼어들 수 있습니다. `--settings`로 명시하세요. 그리고 무제한 Bash 허용, 즉 `--allowedTools 'Bash'`는 위험합니다. 악의적 명령(`rm -rf` 등)이 끼어들 틈을 줍니다. 마지막으로 stdin으로 10MB 넘는 데이터를 파이프하지 마세요. 초과하면 에러입니다. 대신 파일 경로를 넘기세요.

**용어**
- **`--settings`** — 실행에 쓸 설정을 JSON으로 직접 넘기는 옵션. 로컬 설정 파일을 무시하고 이것만 적용.
- **`jq`** — JSON을 명령줄에서 필터링·추출하는 표준 도구. `.cost_usd`처럼 필드를 콕 집어 꺼냄.
- **stdin(표준 입력)** — 명령에 파이프(`|`)로 흘려보내는 입력 통로.

**샘플 코드** — 설정 명시 + 도구 한정 + 비용 추적까지.
```bash
# 로컬 설정 무시(--bare) + 설정 명시 + 도구 한정
claude --bare -p 'Run lint and fix' \
  --settings '{"model":"claude-sonnet-4-6"}' \
  --allowedTools 'Bash(npm run lint),Edit' \
  --output-format json | jq '.cost_usd'   # 이번 실행 비용(USD)
```

---

### A6.8 훅 자동화 — PreToolUse · PostToolUse · Stop ⏱ ~65초
**(화면)** 도구 실행 타임라인 위에 세 훅 시점을 꽂은 다이어그램

> 자동화의 심장은 **훅(hook)**입니다. 훅은 '갈고리'라는 뜻인데, 클로드가 어떤 동작을 하기 **직전·직후·턴 종료 시점**에 내가 끼워 넣는 자동 스크립트예요. 세 가지 시점을 보겠습니다.
>
> **PreToolUse** — 도구를 실행하기 *직전*에 끼웁니다. 위험 명령(`rm -rf`)을 차단하거나 비밀 파일을 보호하는 자리예요. **PostToolUse** — 도구가 *성공한 뒤*에 자동 실행됩니다. eslint·prettier·테스트를 자동으로 거는 데 씁니다. **Stop** — 클로드가 *턴을 끝내기 직전*에 재평가합니다. "모든 테스트가 통과했는지" 같은 최종 검증을 거는 자리죠.
>
> 신호 규칙이 중요합니다. 훅이 끝낼 때 내는 종료 코드(exit code) 중 **0은 성공, 2는 차단**이에요. 특히 exit 2에서 JSON을 같이 출력하면 권한 결정을 **덮어쓸 수 있습니다**. 그 외 코드는 무시하고 진행해요. 설정은 `.claude/settings.json`이나 전역 `~/.claude/settings.json`의 hooks 섹션에 넣습니다. PreToolUse 차단이 가장 강력한 가드레일인 이유는, deny 규칙과 달리 **allow 우선순위까지 무시하고 막기** 때문입니다.

**용어**
- **PreToolUse hook** — 도구 호출 직전에 실행되어 명령을 차단하거나 수정할 수 있는 훅.
- **PostToolUse hook** — 도구가 성공한 직후 실행되는 훅. 린트·포맷·테스트 자동화에 씀.
- **Exit code 2** — 훅이 exit 2를 내면 도구 실행을 차단. JSON을 함께 출력하면 권한 결정을 덮어씀.

**샘플 코드** — 세 훅 시점을 한눈에(개념용 골격).
```json
{
  "hooks": {
    "PreToolUse":  [{ "matcher": "Bash", "hooks": [/* 위험 명령 차단 */] }],
    "PostToolUse": [{ "matcher": "Edit", "hooks": [/* 린트·포맷 자동화 */] }],
    "Stop":        [{ "hooks": [/* 최종 검증: 전체 테스트 통과 확인 */] }]
  }
}
```

**이미지 스펙**
- **ID**: A6-IMG-3
- **목적(전달 정보)**: 한 번의 도구 사용 흐름 위에서 PreToolUse(실행 전)·PostToolUse(성공 후)·Stop(턴 종료 전)이 각각 어느 시점에 개입하는지, 그리고 exit code 0/2의 분기 의미를 보여 준다.
- **유형**: 타임라인 다이어그램
- **캔버스**: 1280×720
- **레이아웃**: 좌→우 가로 타임라인 1줄. 마디 순서: "클로드가 도구 호출" → [PreToolUse] → "도구 실행" → [PostToolUse] → "턴 진행 …" → [Stop] → "턴 종료". 세 훅 박스는 타임라인 위쪽에 세로로 솟은 형태로 배치. 각 훅 박스 아래 작은 캡션으로 역할 1줄. 우하단에 작은 범례 박스: "exit 0 = 통과 / exit 2 = 차단(+JSON이면 권한 override)".
- **텍스트/레이블**: "PreToolUse — 실행 전 차단·수정", "PostToolUse — 성공 후 린트·테스트", "Stop — 종료 전 최종 검증", 범례 "exit 0 통과 · exit 2 차단".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. teal #1A7F7A는 "exit 2 차단" 표기와 PreToolUse 박스 테두리에만(가장 강한 가드레일 강조).
- **타이포**: 본문 Pretendard. 훅 이름·`exit 0/2`는 JetBrains Mono.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백. 모서리 0~8px(타임라인 마디 박스는 직각). 그림자는 0 1px 2px rgba(0,0,0,.06)만.

---

### A6.9 DO / DON'T — 훅 구성 ⏱ ~55초
**(화면)** 2열 DO/DON'T + "선별 차단 vs 전부 차단" 대비

> 훅은 **꼭 필요한 명령만 선별**해서 거는 게 핵심입니다.
>
> **DO** — PreToolUse로 파괴적 명령을 차단하세요. 예를 들어 `block-rm.sh`가 exit 2로 `rm -rf`를 막고 위반 사항을 기록합니다. PostToolUse로는 매 파일 편집 후 `eslint --fix`를 자동 적용하면 좋고요. Stop 훅으로 "모든 테스트가 통과하지 않으면 턴을 끝내지 않게" 최종 게이트를 걸 수 있습니다(최대 8회 차단). 그리고 훅 에러는 반드시 stderr로 기록하세요. 운영에선 audit log가 필수입니다.
>
> **DON'T** — 모든 Bash 명령에 훅을 달지 마세요. 오버헤드가 커집니다. `rm`·`drop database`처럼 위험한 것만 선별하세요. PostToolUse에서 느린 전체 테스트를 돌리면 피드백 루프가 사라집니다. `--testPathPattern`이나 `/goal` 조건으로 좁히세요. 또 PreToolUse·PostToolUse에서 30초를 넘기지 마세요. 클로드가 안 기다립니다. 오래 걸리면 `async: true`로 백그라운드에서 돌리세요.

**용어**
- **stderr(표준 에러)** — 프로그램이 에러·로그를 내보내는 별도 출력 통로. 정상 출력(stdout)과 구분됨.
- **audit log(감사 로그)** — 무슨 명령이 언제 차단·실행됐는지 남기는 기록. 사고 추적에 필수.

---

### A6.10 스케줄링 3가지 — /loop · Desktop tasks · Cloud Routines ⏱ ~65초
**(화면)** 세 방식의 '수명 · 트리거 · 신뢰도' 3열 비교표

> 반복 작업을 **시간에 맞춰 자동 실행**하는 방법이 세 가지 있습니다. 신뢰도가 낮은 것부터 보겠습니다.
>
> **`/loop`** — 지금 열린 세션이 살아 있는 동안 일정 간격으로 반복(폴링)합니다. 5~7일 뒤 자동 만료돼요. 개발 중 빠른 피드백용입니다. **Desktop scheduled tasks** — 로컬 머신 전원이 켜져 있어야 돌아갑니다. 로컬 파일 접근이 필요할 때 추천해요. **Cloud Routines(클라우드 루틴)** — 2026년 4월에 나온 신규 기능으로, Anthropic 인프라에서 **24시간 독립 실행**됩니다. webhook이나 cron으로 트리거할 수 있고, 신뢰도가 가장 높아요.
>
> 고르는 기준은 셋입니다. 신뢰도는 Routine > Desktop > /loop, 접근성은 로컬 파일이 필요하면 Desktop, 비용은 Routine이 유료(credit 소비)라는 점이요. 보안 경계도 다릅니다. Routine은 격리된 VM에서 돌아 권한 범위를 재정의할 수 있고, 로컬 task는 개발 머신 권한을 그대로 씁니다.

**용어**
- **Cloud Routines** — Anthropic 관리 인프라에서 cron/webhook으로 자동 실행되는 독립 클로드 코드 세션.
- **`/loop`** — 현재 세션에서 5~7일 유효한 반복 작업 스케줄러(폴링).
- **cron** — "매주 월요일 8시" 같은 반복 일정을 표준 문법으로 적는 스케줄 표기법.
- **webhook** — 특정 사건이 일어나면 외부에서 호출을 날려 작업을 시작시키는 트리거.

**이미지 스펙**
- **ID**: A6-IMG-4
- **목적(전달 정보)**: 세 스케줄링 방식이 수명·트리거·실행 위치·신뢰도·비용에서 어떻게 다른지 비교해, 상황별로 무엇을 골라야 하는지 판단 기준을 준다.
- **유형**: 비교표
- **캔버스**: 1280×720
- **레이아웃**: 3열 표(열 = /loop, Desktop tasks, Cloud Routines), 행 = "수명", "실행 위치", "트리거", "신뢰도", "비용", "권장 상황". 셀은 1px 보더로만 구분. 상단 헤더 행만 살짝 굵게.
- **텍스트/레이블**: "수명" = 5~7일 만료 / 머신 켜진 동안 / 24·7 상시. "실행 위치" = 현재 세션 / 로컬 머신 / Anthropic 인프라(격리 VM). "트리거" = 세션 폴링 / 로컬 스케줄 / cron·webhook. "신뢰도" = 낮음 / 중간 / 높음. "비용" = 세션 비용 / 로컬 / credit(유료). "권장 상황" = 개발 중 빠른 피드백 / 로컬 파일 필요 / 무인 상시 운영.
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. teal #1A7F7A는 "신뢰도" 행의 Cloud Routines '높음' 셀에만(권장 강조).
- **타이포**: 본문 Pretendard. `/loop`·`cron`·`webhook`은 JetBrains Mono.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백. 모서리 0~8px. 그림자는 0 1px 2px rgba(0,0,0,.06)만.

---

### A6.11 DO / DON'T — 스케줄링 안전 ⏱ ~55초
**(화면)** 2열 DO/DON'T + "성공 기준 명시 vs 주관적 자동 승인" 대비

> 무인 스케줄링은 **성공 기준을 프롬프트에 박고, 결과를 알림으로 받는** 게 안전의 두 축입니다.
>
> **DO** — 무인 task의 프롬프트에는 성공 기준을 명확히 쓰세요. "실패한 CI를 확인하고, 발견되면 이슈에 코멘트를 남겨라. 성공 = 실패 파이프라인 0개 또는 이슈 3개 이상 기록"처럼요. `/loop`는 개발 세션 중에만 쓰세요. 세션이 우아하게 끝나면 loop도 자동으로 멈춥니다. Routine 권한은 대화형 세션보다 더 좁게, 테스트·린트만 허용하고 프로덕션 배포는 수동 단계로 빼세요. 그리고 Routine 결과는 Slack이나 메일 **알림**으로 받으세요. 자동 실행이라 실패를 사람이 놓치기 쉽습니다.
>
> **DON'T** — "잘못돼 보이는 건 다 고쳐" 같은 주관적·자동 승인 프롬프트로 Routine을 돌리지 마세요. 과하게 공격적인 변경 위험이 큽니다. `/loop`를 24시간 넘게 돌리지도 마세요. 7일 만료 후 재시작해야 하니, 그럴 땐 Routine을 쓰세요. 마지막으로 Routine에 비밀(API 키·토큰)을 env 변수로 그냥 넘기면 노출 위험이 있습니다. 암호화된 secrets manager를 쓰세요.

**용어**
- **secrets manager** — API 키·토큰 같은 비밀을 암호화해 안전하게 보관·전달하는 도구.
- **Slack 알림** — 작업 결과를 팀 채널로 자동 통보. 무인 작업의 실패를 빠르게 감지하는 수단.

---

### A6.12 CLAUDE.md를 조종 문서로 — 자율성 설정 ⏱ ~60초
**(화면)** 부제: "모든 세션에 로드되는 영구 컨텍스트 — 자율성의 첫 번째 레버"

> 권한과 훅이 강제 규칙이라면, **CLAUDE.md**는 모든 세션 시작 시 로드되는 **영구 컨텍스트(persistent context)**입니다. 강제는 아니고 '권고(advisory)'지만, 클로드가 거의 항상 따릅니다. 자율성 수준을 정하는 첫 번째 레버예요.
>
> 핵심 내용은 코드 스타일, 테스트 명령, 파괴적 명령 경고, 아키텍처 제약, 비밀 파일 경고입니다. 자율화 팁 세 가지를 보면 — 첫째, 테스트 실행 명령을 명시하세요(전체 말고 `npm run test:unit`처럼 콕 집어서). 둘째, 가드레일을 분명히 하세요(예: `migration/` 폴더 수정 금지). 셋째, 초기 계획 단계를 권장하세요.
>
> 길이도 중요합니다. **500줄 미만**으로, 모호한 규칙은 빼고 꼭 명심할 것만 남기세요. CLAUDE.md가 너무 길면 정작 중요한 규칙이 묻힙니다. 외부 파일은 `@경로` 문법으로 가져올 수 있어요. 예를 들어 `@docs/git-workflow.md`처럼요.

**용어**
- **CLAUDE.md** — 모든 세션 시작 시 자동으로 로드되는 프로젝트 지침 파일.
- **persistent context(영구 컨텍스트)** — 세션마다 다시 적지 않아도 항상 주입되는 배경 정보.
- **`@경로` import** — `@docs/git-workflow.md`처럼 외부 파일을 CLAUDE.md에 끼워 넣는 문법.

**샘플 코드** — 자율성 수준을 명시한 CLAUDE.md 발췌.
```text
## Commands
- Run unit tests: `npm run test:unit`   # 전체 말고 단위 테스트만

## Autonomy
- Always write tests before implementing.
- Run `npm test` after each change, iterate until green.

## Guardrails
- NEVER edit migrations/ or secrets.yaml.

@docs/git-workflow.md   # 외부 워크플로 문서 import
```

---

### A6.13 DO / DON'T — CLAUDE.md 작성 ⏱ ~55초
**(화면)** 2열 DO/DON'T + "코드가 모르는 것만 기록" 원칙 강조

> CLAUDE.md는 **코드만 봐서는 알 수 없는 것**을 적는 자리입니다.
>
> **DO** — 빌드 명령, 비표준 테스트 프레임워크, 아키텍처 패턴처럼 코드에 안 드러나는 규칙을 적으세요. 자율화 수준도 명시하세요. "구현 전에 항상 테스트를 작성하고, 매 변경 후 `npm test`를 돌려라" 같은 식으로요. 위험 경고도 분명히: "migrations/ 와 secrets.yaml은 절대 수정 금지. `/permissions`로 차단된 파일을 확인하라." 그리고 시작은 `/init`으로 하세요. Anthropic이 주는 starter 템플릿을 다듬는 게 빠릅니다.
>
> **DON'T** — 코드로 알 수 있는 건 적지 마세요. 파일별 설명, 함수 이름 규칙은 코드 보면 됩니다. "Clean code는 중요하다" 같은 추상적 원칙도 무시됩니다. 또 CLAUDE.md를 changelog처럼 매 커밋마다 갱신하지 마세요. 팀이 못 따라잡습니다. 3개월마다 재검토하는 정도가 좋습니다.

**용어**
- **`/init`** — 프로젝트를 분석해 CLAUDE.md 초안을 생성해 주는 명령. 새 프로젝트에 한 번 실행.
- **changelog(변경 이력)** — 릴리스별 변경 사항을 정리한 문서. CLAUDE.md와 역할이 다름.

---

### A6.14 멀티에이전트 & 병렬화 — Worktrees · Subagents · Agent Teams ⏱ ~65초
**(화면)** 세 방식의 '용도 · 선택 기준' 비교 다이어그램

> 큰 작업은 **여러 갈래로 나눠** 돌리면 빠릅니다. 세 가지 도구가 있어요.
>
> **Worktree(워크트리)** — git worktree를 써서 브랜치별로 격리된 CLI 세션을 띄웁니다. 충돌 없이 병렬 작업이 가능해요(예: 기능 작업과 버그 수정을 동시에). **Subagent(서브에이전트)** — 독립된 컨텍스트에서 탐색·검토만 하는 전문 에이전트입니다. 메인 세션의 컨텍스트를 아껴 주죠. **Agent Teams(에이전트 팀)** — 리더가 여러 서브에이전트를 조율하며 자동으로 결정·재할당합니다. 파일 20개 이상, 여러 도메인이 얽힌 대형 프로젝트에 맞아요.
>
> 고르는 기준은 명확합니다. 편집 충돌을 피하려면 Worktree, 탐색하느라 컨텍스트가 지저분해지면 Subagent, 조율이 필요하면 Agent Teams. 다만 각 세션·에이전트가 컨텍스트를 소비하니 비용 추적은 필수예요. 사실 병렬화가 중요한 이유 자체가 **컨텍스트가 가득 차는 걸 막는 것**이고, 그 가장 효과적인 해법이 병렬화입니다.

**용어**
- **Worktree** — git worktree 기반으로 격리된 CLI 세션을 띄워 브랜치별 병렬 작업을 하는 방식.
- **Subagent** — 독립 컨텍스트와 전용 프롬프트로 탐색·검토를 맡는 전문 에이전트.
- **Agent Teams** — 리더가 여러 서브에이전트를 조율해 자동 워크플로를 돌리는 구성.

**이미지 스펙**
- **ID**: A6-IMG-5
- **목적(전달 정보)**: 병렬화 3방식(Worktree/Subagent/Agent Teams)이 각각 어떤 문제(편집 충돌/탐색 noise/조율)를 푸는지 매핑해, 상황에 맞는 선택 기준을 준다.
- **유형**: 구조도(3분할)
- **캔버스**: 1280×720
- **레이아웃**: 세로 3분할 패널. 각 패널 상단에 방식 이름, 중단에 작은 구조 스케치(Worktree = 한 리포에서 branch-a/branch-b 두 세션으로 갈라짐, Subagent = 메인 세션 옆에 격리된 보조 에이전트 1개, Agent Teams = 리더 1 + 하위 3~4), 하단에 "해결 문제" 한 줄. 패널 사이는 1px 세로 보더.
- **텍스트/레이블**: 패널 제목 "Worktree / Subagent / Agent Teams". 해결 문제 라벨 = "편집 충돌 회피" / "탐색 noise·컨텍스트 절약" / "대형 작업 조율(20+ files)". 하위 에이전트 예시 라벨 = auth / db / api / ui.
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. teal #1A7F7A는 각 패널의 "해결 문제" 키워드에만(역할 강조).
- **타이포**: 본문 Pretendard. 방식 이름·`git worktree`는 JetBrains Mono.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백. 모서리 0~8px. 그림자는 0 1px 2px rgba(0,0,0,.06)만.

---

### A6.15 DO / DON'T — 병렬화 & 조율 ⏱ ~55초
**(화면)** 2열 DO/DON'T + "2~4명 팀이 효율적" 강조

> 병렬화는 **충돌 경로를 나누고, 통합 시 다시 검증**하는 게 원칙입니다.
>
> **DO** — worktree로 병렬 작업하세요. `claude --worktree feature-a`와 `claude --worktree feature-b`를 따로 띄우면 merge 충돌을 피합니다. Subagent에는 리뷰·탐색을 위임하세요. "이 PR을 보안 관점에서 검토해 줘"처럼요. 메인 컨텍스트를 아낄 수 있습니다. 대형 리팩터에는 Agent Teams가 좋아요. 리더 1명에 auth/db/api/ui 같은 전문 에이전트 3~4명이면 자동 조율과 결과 수집이 됩니다. 병렬 작업 후엔 merge 전에 전체 테스트를 돌려 충돌을 잡으세요.
>
> **DON'T** — 같은 파일을 동시에 편집하지 마세요. worktree라도 내용 merge는 필요합니다. 중요한 경로만 병렬화하세요. Subagent에 구현 작업은 맡기지 마세요. 컨텍스트가 격리돼 메인 세션 상태를 모릅니다. 탐색·검증용으로만 쓰세요. 그리고 조율 없이 5개 이상 에이전트를 띄우지 마세요. 리더가 조정을 못 합니다. **2~4명 팀**이 가장 효율적입니다.

**샘플 코드** — 두 기능을 격리된 worktree에서 병렬로.
```bash
# 두 기능을 격리된 세션에서 병렬 작업 → merge 충돌 회피
claude --worktree feature-a
claude --worktree feature-b
```

---

### A6.16 권한 규칙 심화 — Deny · Ask · Allow 우선순위 ⏱ ~65초
**(화면)** 평가 순서 Deny → Ask → Allow 플로우 + 구문 예시

> 권한 규칙은 **세 종류의 우선순위**로 평가됩니다. 순서가 핵심이에요.
>
> 평가는 **Deny → Ask → Allow** 순입니다. Deny 규칙이 하나라도 맞으면 즉시 차단, Ask가 맞으면 확인을 요청, 둘 다 아니고 Allow가 맞으면 자동 승인이에요. 구문은 두 가지예요. `Tool`은 그 도구 전체, `Tool(specifier)`는 조건부입니다. 예를 들어 `Bash(npm test *)`, `Edit(/src/**, **/.env)`, `Read(.env)`처럼요. 와일드카드 `*`는 한 구간(단어 경계 존중), `**`는 여러 경로 단계를 매칭합니다.
>
> 두 가지 비직관적인 동작을 꼭 기억하세요. 첫째, **훅이 더 우선**입니다. PreToolUse 훅이 exit 2를 내면 allow 규칙도 무시하고 차단해요. deny보다도 앞섭니다. 둘째, 심볼릭 링크 동작이 비대칭입니다. **Allow는 링크 자신과 대상이 둘 다 매칭**돼야 통과하고, **Deny는 둘 중 하나만 매칭돼도 차단**합니다. 안전 쪽으로 치우쳐 있는 거죠.

**용어**
- **Deny · Ask · Allow** — 권한 규칙 우선순위. Deny(차단) > Ask(확인) > Allow(자동 승인).
- **Permission specifier** — `Tool(조건)` 형태로 와일드카드·경로·도메인 패턴을 세부 지정하는 부분.
- **심볼릭 링크(symlink)** — 실제 파일을 가리키는 '바로가기'. 링크와 대상이 다른 경로일 수 있어 규칙 매칭이 둘로 나뉨.

**샘플 코드** — 우선순위와 구문을 한 묶음으로.
```json
{
  "permissions": {
    "deny":  ["Edit(migrations/**)", "Bash(rm -rf *)", "Read(secrets.json)"],
    "ask":   ["Bash(git push *)"],
    "allow": ["Read", "Edit(/src/**)", "Bash(npm test *)"]
  }
}
```

**이미지 스펙**
- **ID**: A6-IMG-6
- **목적(전달 정보)**: 한 도구 호출이 Deny→Ask→Allow 순서로 평가되어 차단/확인/승인 중 하나로 떨어지는 결정 흐름과, PreToolUse 훅이 그 위에 군림한다는 우선순위를 보여 준다.
- **유형**: 플로우차트(결정 트리)
- **캔버스**: 1280×720
- **레이아웃**: 위→아래 결정 트리. 최상단 "도구 호출" → 첫 분기 "PreToolUse 훅 exit 2?" (예 → "차단", 아니오 → 아래로). 다음 "Deny 매칭?" (예 → "차단"). 다음 "Ask 매칭?" (예 → "사용자 확인"). 다음 "Allow 매칭?" (예 → "자동 승인", 아니오 → "기본: 확인"). 각 종료 노드는 우측에 배치.
- **텍스트/레이블**: 분기 라벨 "예/아니오", 종료 노드 "차단(blocked)", "사용자 확인(ask)", "자동 승인(allow)", "기본 확인". 최상단 강조 캡션 "Hook이 deny보다 우선".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. teal #1A7F7A는 "차단" 종료 노드와 "Hook이 deny보다 우선" 캡션에만.
- **타이포**: 본문 Pretendard. Deny/Ask/Allow·exit 2는 JetBrains Mono.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백. 모서리 0~8px. 그림자는 0 1px 2px rgba(0,0,0,.06)만.

---

### A6.17 DO / DON'T — 권한 규칙 작성 ⏱ ~55초
**(화면)** 2열 DO/DON'T + "Deny 먼저, Allow는 좁게" 강조

> 권한 규칙은 **Deny를 먼저 깔고, 설정 파일에 박아 공유**하는 게 원칙입니다.
>
> **DO** — Deny로 위험한 것을 최우선 차단하세요. migrations/ 폴더 편집 deny, `rm -rf` deny, secrets.json deny처럼요. 규칙은 설정 파일에 checked-in 하세요. CLAUDE.md와 `.claude/settings.json`으로 팀과 공유하고, 개인 오버라이드는 `.local.json`에 둡니다. CI·스크립트는 `--allowedTools`로 그때그때 필요한 것만 열어 override하세요. 그리고 `/permissions` 명령으로 어느 레벨(전역/프로젝트/로컬)에서 어떤 규칙이 작동 중인지 확인하세요.
>
> **DON'T** — Allow부터 깔고 나중에 문제를 발견하는 식은 피하세요. Deny가 우선이라 나중에 Deny를 추가해도 깔끔하지만, 습관 자체는 deny/ask부터 시작하는 게 안전합니다. 대화형에서 "Yes, don't ask again"을 남발하지 마세요. URL 필터링을 Bash 규칙으로 하려 들지도 마세요. `Bash(curl https://github.com*)`는 옵션·리다이렉트·변수로 우회됩니다. URL은 WebFetch 도메인 규칙으로 거세요.

**용어**
- **checked-in(체크인)** — 설정을 Git에 커밋해 버전 관리·팀 공유 상태로 두는 것.
- **`.local.json`** — 개인 전용 오버라이드 설정. 커밋하지 않아 팀 규칙을 안 건드림.
- **WebFetch 도메인 규칙** — URL 접근을 도메인 단위로 허용·차단하는 권한 규칙. Bash 우회를 막음.

---

### A6.18 샌드박싱 — OS 레벨 Bash 격리 ⏱ ~65초
**(화면)** "권한 규칙 ∩ 샌드박스 = 최종 경계" 2계층 다이어그램

> 권한 규칙과 **별개의 한 겹**을 더 두는 게 **샌드박싱(sandboxing)**입니다. '샌드박스'는 '모래놀이통'이라는 뜻인데, Bash 도구를 OS 레벨에서 격리해 파일·네트워크 접근 경계를 강제하는 거예요. 권한 규칙과 직교(orthogonal)하는 별도 계층입니다.
>
> 작동은 이렇습니다. `sandbox.filesystem`의 allowRead/denyRead로 읽기 경계를, `sandbox.network.allowedDomains`로 네트워크 경계를 정합니다. 효과가 강력한 건, 프롬프트 인젝션이나 모델 오류로도 경계 밖에 못 나간다는 점이에요. 커널이 강제하니까요. 설정은 `.claude/settings.json`의 `sandbox.*` 섹션, 또는 `/sandbox` 명령으로 대화형으로 합니다.
>
> 모드는 셋입니다. **restricted**(기본·권한 필요), **unrestricted**(격리 없음), **autoAllowBashIfSandboxed**(샌드박스 안이면 Bash 자동 승인). 한 가지 주의 — Read/Edit deny 규칙과 **합쳐져** 최종 경계가 정해집니다. 즉 최종 경계 = 샌드박스 ∩ 권한 deny예요. 권한과 샌드박스를 같이 쓰는 **다층 방어(defense-in-depth)**가 가장 안전합니다.

**용어**
- **Sandboxing(샌드박싱)** — Bash 명령의 파일·네트워크 접근을 OS 레벨에서 강제 격리하는 계층.
- **autoAllowBashIfSandboxed** — 샌드박스 경계 안이라면 Bash 사용을 자동 승인하는 설정.
- **프롬프트 인젝션(prompt injection)** — 외부 입력에 숨긴 지시로 모델을 속여 의도치 않은 행동을 유도하는 공격.
- **defense-in-depth(다층 방어)** — 한 겹이 뚫려도 다른 겹이 막도록 보호 계층을 여러 개 두는 원칙.

**샘플 코드** — 읽기·네트워크 경계를 정한 sandbox 설정.
```json
{
  "sandbox": {
    "filesystem": {
      "denyRead": ["/etc/passwd", "~/.ssh/**", ".env"]
    },
    "network": {
      "allowedDomains": ["github.com", "api.example.com"]
    }
  }
}
```

**이미지 스펙**
- **ID**: A6-IMG-7
- **목적(전달 정보)**: 권한 규칙(deny)과 OS 샌드박스가 서로 다른 계층이며, 둘의 교집합이 Bash의 실제 접근 경계가 된다는 다층 방어 구조를 보여 준다.
- **유형**: 구조도(2계층/교집합)
- **캔버스**: 1280×720
- **레이아웃**: 좌측에 큰 박스 "권한 규칙 deny(앱 레벨)", 우측에 큰 박스 "샌드박스 deny(OS·커널 레벨)". 두 박스가 가운데서 겹치는 교집합 영역을 사각 중첩으로 표현(벤다이어그램 대신 직사각 중첩). 교집합 라벨 "최종 접근 경계 = 샌드박스 ∩ 권한 deny". 하단에 작은 캡션 줄: "프롬프트 인젝션·모델 오류로도 경계 밖 접근 불가(커널 강제)".
- **텍스트/레이블**: "권한 규칙(deny/ask/allow)", "OS 샌드박스(filesystem·network)", "최종 경계 = 교집합", "커널 강제".
- **색**: 배경 크림 #F0EDE8, 본문 #2B2B2B, 보더 #D8D2C8. teal #1A7F7A는 교집합 영역 테두리와 "최종 경계" 라벨에만.
- **타이포**: 본문 Pretendard. `sandbox.*`·deny는 JetBrains Mono.
- **금지(anti-ai-slop)**: 그라데이션·컬러/글로우 그림자·blur≥20px·글래스모피즘·장식 모션·배경 워터마크/그리드/광선·카드 상단 컬러 액센트바·이모지 불릿 금지. 구획은 1px 보더+여백. 모서리 0~8px. 그림자는 0 1px 2px rgba(0,0,0,.06)만.

---

### A6.19 DO / DON'T — 샌드박싱 설정 ⏱ ~55초
**(화면)** 2열 DO/DON'T + "bypassPermissions + sandbox 조합" 강조

> 샌드박싱은 **무인 환경에서만 켜고, 핵심 경로만 denyRead로 막는** 게 원칙입니다.
>
> **DO** — bypassPermissions와 sandbox를 같이 쓰세요. 무인 자동화에서 권한 프롬프트 없이도 경계는 커널이 강제하니 CI에 적합합니다. 샌드박스는 CI·클라우드 세션에만 켜세요. denyRead로 중요한 경로를 보호하세요. `denyRead(['/etc/passwd', '~/.ssh', '.env'])` 식으로요. allowedDomains로 네트워크도 제한하세요. webhook·외부 API 호출 시 필요한 도메인만(예: github.com, api.example.com) 여세요.
>
> **DON'T** — sandbox 없이 bypassPermissions만 쓰지 마세요. 모든 권한이 열려 있어 프로덕션 서버에서는 절대 금지입니다. 개발 노트북에 일반적으로 샌드박스를 켜지도 마세요. 보통 모든 파일 접근이 필요하니 불편합니다. `allowRead: /`처럼 전체 접근으로 샌드박스를 무력화하지 마세요. 규칙 목적이 사라집니다. allow 규칙을 너무 많이 깔아 과복잡하게 만들지도 마세요. critical deny만 명시하고 나머지는 여는 게 유지보수에 낫습니다.

**용어**
- **denyRead** — 샌드박스에서 읽기를 명시적으로 막을 경로 목록. 비밀·시스템 파일 보호에 씀.
- **allowedDomains** — 샌드박스 안에서 네트워크로 접근을 허용할 도메인 목록.

---

### A6.20 체크포인트 & Rewind — 자율 실행 안전망 ⏱ ~60초
**(화면)** 부제: "편집 전 자동 snapshot → Esc 2번/`/rewind`로 복구" + "Git 아님" 경고

> 자율 실행 중 실수를 되돌리는 안전망이 **체크포인트(checkpoint)**와 **Rewind(되감기)**입니다.
>
> 클로드는 파일을 편집하기 전에 자동으로 백업, 즉 **snapshot(스냅샷)**을 떠 둡니다. 이게 체크포인트예요. 되돌릴 때는 **Esc를 두 번** 누르거나 `/rewind`를 치면 이전 상태로 복구됩니다. 이때 '파일만 / 대화만 / 둘 다' 중에 고를 수 있어요. 특정 메시지부터 '이후 요약' 또는 '이전 요약'으로 컨텍스트를 압축하는 것도 됩니다.
>
> 두 가지 주의가 중요합니다. 첫째, 이건 **Git이 아닙니다.** 체크포인트는 세션 안에서만 유효해요. 장시간 작업 뒤엔 반드시 git commit을 하세요. 둘째, 무인 작업에서는 Rewind를 쓸 수 없습니다. 그래서 무인일수록 **Stop 훅으로 사전 검증**하는 게 더 중요해져요. 체크포인트는 실수 복구용이지, 프로덕션 백업이 아닙니다.

**용어**
- **Checkpoint(체크포인트)** — 클로드가 편집 전에 떠 두는 파일 스냅샷. rewind의 복구 지점.
- **Rewind(되감기)** — 특정 메시지 시점으로 돌아가기. 파일·대화·둘 다 중 선택 가능.
- **snapshot(스냅샷)** — 특정 시점의 상태를 통째로 떠 둔 백업본.

**샘플 코드** — 되감기 진입 방법(개념용).
```text
Esc Esc        # 이전 메시지로 되감기 진입
/rewind        # 복구 범위 선택: 파일만 / 대화만 / 둘 다
# 주의: 세션 한정. 장시간 작업 후엔 반드시 git commit.
```

---

### A6.21 DO / DON'T — 자율 실행 안전망 ⏱ ~55초
**(화면)** 2열 DO/DON'T + "checkpoint는 git 대체 아님" 경고

> 안전망의 핵심은 **개발 중엔 Rewind, 무인엔 Stop 훅, 최종 보장은 git**이라는 역할 분담입니다.
>
> **DO** — Rewind는 개발 중 실수 복구용으로만 쓰세요. 위험한 변경(migration·config·auth) 전에는 `/goal`로 성공 기준을 잡고 Stop 훅으로 게이트하세요. CI 파이프라인에서는 git status를 확인한 뒤 자동 commit 하세요. rewind가 없으니 모든 변경을 명시적으로 남겨야 합니다. 큰 refactor는 worktree + Subagent 리뷰로 독립 평가를 받으세요.
>
> **DON'T** — checkpoint를 버전 관리 대체로 쓰지 마세요. git commit/push가 유일한 최종 보장입니다. 무인 세션 중에 '대화만' 되감지 마세요. 파일은 이미 바뀌었으니 git 상태를 꼭 확인해야 합니다. Stop 훅이 8회 이상 차단하는 걸 무시하지 마세요. 클로드가 멈추라는 신호이니 접근을 재검토하세요.

**용어**
- **`/goal`** — 작업의 성공 기준을 명시하는 명령. Stop 훅과 짝지어 자동 검증을 건다.
- **버전 관리(version control)** — 변경 이력을 영구히 남기는 Git의 핵심 기능. checkpoint와 달리 세션을 넘어 유지됨.

---

### A6.22 실제 예시 1 — 린트 자동화(PostToolUse hook) ⏱ ~60초
**(화면)** settings.json + run-eslint.sh 두 코드 블록 병치

> 첫 번째 실전 예시는 **매 파일 편집 후 자동으로 린트**를 거는 PostToolUse 훅입니다.
>
> 화면 위 코드를 보면, `Edit` 도구가 쓰일 때마다 `run-eslint.sh`를 실행하도록 등록했습니다. timeout은 10초로 잡았고요. 아래 스크립트는 편집된 파일 경로만 꺼내서 그 파일에만 `eslint --fix`를 돌립니다. `jq`로 입력 JSON에서 파일 경로를 뽑는 게 포인트예요.
>
> 효과는, 매 편집 후 자동으로 컨벤션이 강제돼 사람 리뷰 부담이 줄어듭니다. 주의할 건 린터가 느리면(5초 넘으면) 피드백 루프가 증발하니 변경된 파일만 돌려야 한다는 점이에요. 권한도 걱정 없습니다. Edit이 이미 허용돼 있으면 PostToolUse는 추가 확인이 필요 없어요(non-blocking). 정책(린트 규칙)을 코드(훅)로 강제하면 가드레일이 자동으로 도는 겁니다.

**용어**
- **non-blocking** — 실행을 막지 않고 옆에서 처리만 하는 동작. PostToolUse는 도구를 막지 않음.
- **timeout(타임아웃)** — 정한 시간 안에 안 끝나면 중단하는 제한. 훅이 무한정 매달리는 걸 막음.

**샘플 코드** — PostToolUse 훅 등록.
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/run-eslint.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**샘플 코드** — 변경된 파일만 eslint --fix.
```bash
#!/bin/bash
# 입력 JSON에서 편집된 파일 경로만 추출
file="$(jq -r '.tool_input.path' <<< "$1")"
# 그 파일에만 자동 수정 적용 (전체 X)
npm run lint -- --fix "$file" 2>&1 | grep -q 'error' && exit 0 || exit 0
```

---

### A6.23 실제 예시 2 — 위험 명령 차단(PreToolUse hook) ⏱ ~60초
**(화면)** block-rm.sh + settings.json 두 코드 블록 병치

> 두 번째 예시는 **`rm -rf`를 실행 직전에 차단**하는 PreToolUse 훅입니다. 무인 자동화의 최후 보루예요.
>
> 화면 위 스크립트를 보면, Bash 명령에서 `command`를 꺼내 `^rm -rf`로 시작하는지 검사합니다. 맞으면 `permissionDecision: "deny"` JSON을 찍고 **exit 2**로 도구 실행을 막아요. 여기가 핵심인데, exit 2 + JSON이면 **allow 규칙까지 무효화**하는 deny-first override가 걸립니다. 아래 등록 코드에선 `if: "Bash(rm *)"` 조건으로 rm 명령일 때만 훅을 돌려 오버헤드를 줄였고요.
>
> 우회 방지가 중요합니다. 패턴을 `^rm -rf`로 잡으면 `rm -rf`, 그리고 `*` 와일드카드 조건으로 `rm -f`, `rm /path`까지 걸러집니다. 무인 자동화에서 가장 위험한 명령을 커널이나 권한 규칙보다 **앞단에서** 끊는 안전장치예요.

**용어**
- **deny-first override** — 훅의 차단(exit 2)이 allow 규칙보다 우선해 무조건 막는 동작.
- **`permissionDecision`** — 훅이 JSON으로 반환하는 권한 결정 값. `"deny"`면 실행 차단.

**샘플 코드** — rm -rf 차단 스크립트.
```bash
#!/bin/bash
command="$(jq -r '.tool_input.command' <<< "$1")"

# 'rm -rf'로 시작하면 deny 결정을 내고 exit 2로 차단
if [[ "$command" =~ ^rm\ -rf ]]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive rm -rf blocked by policy"
    }
  }'
  exit 2
fi
exit 0
```

**샘플 코드** — rm 명령일 때만 훅 실행하도록 등록.
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(rm *)",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh"
          }
        ]
      }
    ]
  }
}
```

---

### A6.24 실제 예시 3 — /loop로 CI 폴링 ⏱ ~55초
**(화면)** 터미널 세션 목업 — `/loop 5m` 입력부터 "Tests passed"까지

> 세 번째 예시는 **`/loop`로 5분마다 실패한 테스트를 자동 재실행**하는 흐름입니다. 'iterate until green'의 가장 간단한 구현이에요.
>
> 화면 터미널을 보면, 세션에서 `/loop 5m`을 치고 5분 간격으로 `npm test`를 돌리게 합니다(최대 7일). 그다음 "계속 시도하고, 보이는 실패는 고쳐"라고 지시하면, 클로드가 테스트 실행 → 실패 읽기 → 수정 → 재실행을 반복하다 통과하면 "Tests passed. Loop completed."로 끝납니다.
>
> 제약은 분명해요. CLI 세션이 열려 있어야 하고, 7일 뒤 자동 만료됩니다. 그래서 장시간 필요하면 Cloud Routine으로 가야 합니다(`/schedule 0 8 * * *` 같은 cron으로요).

**용어**
- **폴링(polling)** — 일정 간격으로 반복해서 상태를 확인하는 방식. `/loop`가 이 방식.
- **`--bail`** — 테스트가 처음 실패하는 즉시 중단하는 옵션. 피드백을 빠르게 받음.

**샘플 코드** — `/loop`로 CI 폴링 세션(목업).
```bash
$ claude

Claude Code on ...
Session: test-polling-abc123

You: /loop 5m

Starting loop task. Fire every 5 minutes. Max 7 days.
Run: npm test -- --bail && echo 'Tests passed' || echo 'Failures detected'

Claude: I'll run your test command every 5 minutes until it passes,
feeding the results back into my context.

You: Keep trying. Fix any failures you see.

[Claude runs → test fails → reads error → fixes → runs again → test passes]

Tests passed. Loop completed.
```

---

### A6.25 실제 예시 4 — Cloud Routine으로 주간 보안 감사 ⏱ ~60초
**(화면)** Cloud Routine 설정 화면 목업 — name·schedule·prompt·permission mode

> 네 번째 예시는 **매주 월요일 자동으로 보안 감사를 돌리는** Cloud Routine입니다. 핵심은 **자동 수정 금지, 보고만**이에요.
>
> 화면 설정을 보면, 이름은 `weekly-security-audit`, 스케줄은 `0 8 * * MON`(매주 월요일 8시 UTC)입니다. 프롬프트는 src/와 의존성에 보안 감사를 돌리되 — `npm audit`, 하드코딩된 비밀 grep 검사, 결과를 #security Slack 채널에 보고하고, **"자동 수정은 하지 말고 보고만 하라"**고 명시했어요. 그리고 permission mode를 **plan(읽기 전용)**으로, allowedTools를 `Bash(npm audit *), Read`로 좁혔습니다.
>
> 이 조합의 안전성이 포인트입니다. plan 모드 + 좁은 allowedTools로 탐색만 가능하고, 보고는 Slack으로 가서 팀이 수동으로 수정을 결정해요. 비용은 Routine credit을 소비하고요. 무인 자동화의 황금률 — **auto-fix 금지, human review 필수**입니다.

**용어**
- **Cloud Routine** — cron/webhook 트리거로 Anthropic 인프라에서 자동 실행되는 독립 클로드 코드.
- **`npm audit`** — 의존성 패키지의 알려진 보안 취약점을 점검하는 명령.
- **하드코딩된 비밀(hardcoded secret)** — 코드에 그대로 박아 넣은 API 키·비밀번호. 유출 위험이 큼.

**샘플 코드** — Cloud Routine 설정(읽기 전용·보고 전용).
```text
Name: weekly-security-audit
Schedule: 0 8 * * MON   # 매주 월요일 08:00 UTC

Prompt:
Run security audit on src/ and deps:
1. npm audit --json
2. Check for hardcoded secrets with grep
3. Report findings to #security Slack channel
4. Do NOT auto-fix. Just report.

Permission mode: plan (read-only)
Allowed tools: Bash(npm audit *), Read
```

---

### A6.26 종합 체크리스트 — 자율운용 준비도 ⏱ ~65초
**(화면)** Phase 1(Dev) / Phase 2(CI) / Phase 3(무인) 3단 체크리스트

> 지금까지 배운 걸 **3단계 준비도 체크리스트**로 묶어 보겠습니다.
>
> **Phase 1 — 개발(Dev)** — CLAUDE.md에 코드 스타일·테스트 명령·위험 경고를 적고, `.claude/settings.json`에 권한 규칙을 정의합니다(중요 경로 Deny, 읽기 전용 Allow, `Bash(test)`). PostToolUse 훅으로 린트·포맷을 자동화하고, 대화형 세션은 Default나 acceptEdits로 씁니다.
>
> **Phase 2 — CI** — `claude -p --bare`로 헤드리스 스크립트를 짜 CI에 통합하고, `--allowedTools`로 단계별 권한을 최소화합니다. PreToolUse 훅으로 파괴적 명령(rm -rf, DROP, delete production)을 차단하고, test/lint/build를 자동 게이트로 씁니다.
>
> **Phase 3 — 무인** — `/goal`이나 Stop 훅으로 성공 기준을 정의하고, auto 모드나 bypassPermissions + sandbox로 권한 프롬프트를 제거합니다. Cloud Routine이나 `/loop`로 스케줄링하고(7일 넘게 필요하면 Routine), 결과를 Slack/메일 알림으로 받습니다. 그리고 **주 1회 이상 실행 결과를 사람이 리뷰**해 human-in-the-loop을 유지하세요.

**용어**
- **human-in-the-loop** — 자동화 흐름 안에 사람의 검토·승인을 의도적으로 남겨 두는 운영 방식.
- **게이트(gate)** — 통과 조건을 못 채우면 다음 단계로 못 넘어가게 막는 검문소. 테스트·린트가 흔한 게이트.

---

### A6.27 실수 방지 — 안티패턴 6선 ⏱ ~65초
**(화면)** 6개 안티패턴을 엑스 표시와 함께 목록으로

> 마지막으로 자주 밟는 **안티패턴 여섯 가지**를 모았습니다. 역설적이지만 '자율성이 높을수록 사람의 감독이 더 필요하다'가 핵심 교훈이에요.
>
> 하나, **"좋아 보이면 끝내"** — 자율 루프에서 주관적 판단은 금지입니다. 테스트·린트·빌드 같은 객관적 기준만 쓰세요. 둘, **권한을 한 번에 다 열기** — "Bash를 allow" 해두면 나중에 막기 어렵습니다. 반대로 deny/ask부터 시작하세요. 셋, **CLAUDE.md 과다 작성** — 500줄을 넘기면 중요한 규칙이 묻힙니다. 3개월마다 가지치기하세요.
>
> 넷, **무인 auto-fix 무제한** — 변경 권한을 열어 두면 과하게 공격적인 수정이 납니다. plan(보고 전용) 모드를 권합니다. 다섯, **훅 남발** — 모든 도구에 훅을 달면 오버헤드가 커요. `rm`, `DROP` 같은 핵심 명령만 차단하세요. 여섯, **Cloud Routine 비밀 노출** — env 변수로 API 키를 넘기면 audit log에 남습니다. 외부 secrets manager가 필수예요.

**용어**
- **안티패턴(anti-pattern)** — 흔히 쓰지만 결국 문제를 키우는 잘못된 관행.
- **가지치기(prune)** — 불필요해진 규칙·항목을 주기적으로 덜어 내 핵심만 남기는 정리 작업.

---

### A6.28 정리 — 두 기둥의 균형 ⏱ ~30초
**(화면)** "자율운용 | 자동화 | CLAUDE.md | 안전 계층" 4박스 요약

> 이 섹션을 네 가지로 정리하겠습니다.
>
> **자율운용**은 권한 모드 스펙트럼(default→acceptEdits→auto→bypassPermissions)으로 감독 수준을 조절합니다. 권한은 좁게, 검증 기준은 명확히, human-in-the-loop은 유지. **자동화**는 PreToolUse(차단)→PostToolUse(린트·테스트)→Stop(최종 검증)의 3단 훅 게이트 위에, 헤드리스 스크립트와 스케줄링(Loop/Routine)을 얹습니다.
>
> **CLAUDE.md**는 영구 컨텍스트로 자율성 수준을 정하고, 코드 레벨 정책(훅)이 그걸 강제합니다. **안전 계층**은 권한 규칙 + 훅 + 샌드박싱의 3중 방어예요. 하나가 뚫려도 다른 게 잡습니다. 한 줄 결론 — **"자율은 편하지만 자동화는 필수"**, 무인 작업엔 훅·검증·알림 세 가지가 없으면 사고 확률이 높습니다.

---

### A6.29 리소스 & 다음 단계 ⏱ ~30초
**(화면)** 공식 문서 링크 + 5단계 실습 체크 + 조직 수준 가이드

> 더 파고들 분을 위한 자료입니다.
>
> 공식 문서는 권한(permissions), 훅 가이드(hooks-guide), 베스트 프랙티스(best-practices), 헤드리스(headless), 샌드박싱(sandboxing), 클라우드 루틴(routines) 여섯 개가 핵심이에요. 화면 링크를 참고하세요.
>
> 실습은 다섯 단계로요. 하나, `/init`으로 CLAUDE.md를 만들고 팀 규칙을 추가합니다. 둘, `.claude/settings.json`에 중요 경로 deny 규칙 5개를 넣습니다. 셋, PostToolUse 훅으로 `npm run lint`를 자동 실행합니다. 넷, `claude -p '...' --allowedTools 'Read,Bash(npm test)'`를 테스트합니다. 다섯, `/loop`나 `/schedule`로 간단한 폴링 task를 하나 걸어 봅니다. 조직 수준에선, 팀은 settings.json을 git에 체크인해 규칙을 공유하고, 회사는 managed-settings.json으로 중앙 정책을 강제하며, 고급으로는 Agent Teams 병렬화 + Squad 리뷰로 품질 게이트를 둡니다.

**샘플 코드** — 공식 문서 링크.
```text
https://code.claude.com/docs/en/permissions.md      # 권한 모드·규칙
https://code.claude.com/docs/en/hooks-guide.md       # 훅 전체 API
https://code.claude.com/docs/en/best-practices.md    # 권장 패턴
https://code.claude.com/docs/en/headless.md          # claude -p, CI
https://code.claude.com/docs/en/sandboxing.md        # OS 레벨 격리
https://code.claude.com/docs/en/routines.md          # Cloud Routine cron/webhook
```

---

### A6.30 마무리 — 자율성은 신뢰가 아니라 제어 ⏱ ~30초
**(화면)** "Supervised → Policy-Driven → Verified" 자율성 3단계 + 선택 기준

> 마지막으로 한 가지 관점을 남기겠습니다. "클로드 코드의 자율성이 높다"는 말은 환상입니다. 실제론 **좋은 가드레일이 곧 자동화된 통제**예요.
>
> 자율 운영은 세 단계로 봅니다. 첫째 **Supervised Autonomy**(default 모드) — 모든 행동을 사전 승인하니 안전하지만 느립니다. 둘째 **Policy-Driven Autonomy**(훅 + CLAUDE.md) — 정책으로 범위를 정하니 효율적이에요. 셋째 **Verified Autonomy**(goal + Stop 훅 + auto 모드) — 목표를 두고 자동 검증하니 빠르지만 위험도 높습니다.
>
> 고르는 기준은 — 1단계는 프로토타입·신규 영역·낮은 신뢰도, 2단계는 프로덕션·팀 5~20명·반복 워크플로, 3단계는 대규모 refactor·자동화 필수·24/7 운영이되 **매주 1회 사람 리뷰가 필수**입니다. 결국 **"더 자동화할수록 더 신중하게"**, 이게 안전한 자율운용의 핵심입니다.


---
