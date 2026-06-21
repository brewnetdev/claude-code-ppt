# Claude Code 스피너 한국어화 — 작업 가이드

> 작업 일자: 2026-06-18 (초기) / 2026-06-19 (의미 통일 개정)
> 대상 환경: macOS 14+ (Apple Silicon, arm64), Claude Code 2.1.153
> 작업자: villainscode

Claude Code CLI 실행 시 회전하는 영문 동사("Pondering...", "Cogitating..." 등)를 한국어로 교체하고, 도구 호출 시 의미 있는 한국어 상태 라벨을 함께 표시하도록 시스템을 구성한 작업 기록.

## 개정 이력

| 일자 | 변경 |
|---|---|
| 2026-06-18 | 초기 구축 — 영문 verb 178개를 의미 그대로 한국어로 1:1 치환 ("Pondering→사색중", "Boogieing→춤추기" 등) |
| 2026-06-19 | **의미 통일 개정** — 영문 verb의 위트(춤추기·소용돌이·쓸데없는수다 등)가 사용자에게 "지금 뭐 하는지" 정보를 못 줘서, 178개 verb 전부를 "모델이 응답을 만드는 중" 의미로 수렴하는 단어 풀(추론·사고·응답·생성·분석·처리·작업·검토·답변생성중 등)로 재매핑. PreToolUse hook도 17→20개로 보강(Cron·ScheduleWakeup·MCP 리소스). |

---

## 1. 작업 배경 — 왜 두 레이어인가

| 메커니즘 | 한계 | 보완 |
|---|---|---|
| Claude Code의 "whimsical verbs"는 바이너리에 ASCII 문자열로 하드코딩 | `settings.json`으로는 verb 자체를 교체할 수 없음 | 바이너리 in-place 패치 (Layer B) |
| Verb는 무작위로 회전 | 현재 작업과 무관한 단어가 떠도 사용자는 어떤 도구가 실행 중인지 모름 | Hook `statusMessage`로 도구별 한국어 라벨 추가 (Layer A) |
| 자동 업데이트가 새 바이너리를 받으면 패치가 무효화 | 매번 수동 재패치 부담 | LaunchAgent로 FSEvents 감시 → 자동 재패치 (Layer C) |

세 레이어가 동시에 동작해 결함을 상호 보완한다.

---

## 2. 적용 레이어 한눈에

```
사용자 입력
    │
    ▼
[Layer A] Hook statusMessage      ← settings.json (PreToolUse 17개 매처)
    │  ex) Read 호출 → "파일 읽는 중"
    ▼
[Layer B] 바이너리 verb 한국어     ← /Users/codevillain/.local/share/claude/versions/2.1.153
    │  ex) "사색중", "결과조합", "소용돌이" 회전
    ▼
[Layer C] 자동 재패치             ← ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist
       FSEvents가 새 바이너리 감지 → auto-patch-claude.sh 실행
```

---

## 3. 수정·생성한 파일 전체 목록

| # | 파일 경로 | 종류 | 설명 |
|---|---|---|---|
| 1 | `~/.claude/settings.json` | 수정 | PreToolUse hook 17개 매처 추가, 기존 Stop hook 보존 |
| 2 | `~/.claude/settings.json.bak.20260618-174628` | 백업 | 위 수정 직전 시점의 원본 |
| 3 | `~/.claude/scripts/patch-spinner-verbs.py` | 생성 | 매핑 + 바이너리 in-place 치환 본체 (Python) |
| 4 | `~/.claude/scripts/patch-spinner-verbs.sh` | 생성 | 단일 파일 패치 래퍼 (백업·재서명 통합) |
| 5 | `~/.claude/scripts/auto-patch-claude.sh` | 생성 | LaunchAgent용 헬퍼 — versions/ 전체 스캔 |
| 6 | `~/.claude/logs/spinner-patch.log` | 자동 생성 | 자동 패치 활동 로그 |
| 7 | `~/.claude/logs/spinner-patch.stdout` | 자동 생성 | LaunchAgent stdout |
| 8 | `~/.claude/logs/spinner-patch.stderr` | 자동 생성 | LaunchAgent stderr |
| 9 | `~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist` | 생성 | macOS LaunchAgent — FSEvents 감시 |
| 10 | `~/.local/share/claude/versions/2.1.153` | 수정 | 바이너리 verb 패치 (538 occurrence 치환) + ad-hoc 재서명 |
| 11 | `~/.local/share/claude/versions/2.1.153.bak.20260618-174657` | 백업 | 깨끗한 원본 1 (sha256 `449d9c89…`) |
| 12 | `~/.local/share/claude/versions/2.1.153.bak.20260618-175315` | 백업 | 깨끗한 원본 2 (sha256 동일) |

---

## 4. 단계별 작업 내역

### Stage 1 — 환경 진단

| 점검 항목 | 결과 |
|---|---|
| Claude Code 설치 위치 | `~/.local/bin/claude` → `~/.local/share/claude/versions/2.1.153` (symlink) |
| 바이너리 형식 | Mach-O 64-bit executable arm64 (Bun compile), 205 MB |
| 코드 서명 | Apple Developer (TeamIdentifier=Q6L2SF6YDW, hardened runtime 활성) |
| Verb 인코딩 패턴 | 두 가지 동시 — (A) Bun length-prefixed `\0\0\0<len>\0\0\0<len>\0\0\0VERB\0`, (B) JSON 배열 `,"VERB",` |
| Verb 등장 횟수 | 각 verb당 평균 약 3회 (총 538개 위치) |

핵심 제약: Mach-O 코드 서명 + hardened runtime → 1바이트라도 수정하면 macOS Gatekeeper가 차단. **패치 후 반드시 ad-hoc 재서명 필수.**

### Stage 2 — `~/.claude/settings.json` 백업

```bash
cp ~/.claude/settings.json ~/.claude/settings.json.bak.$(date +%Y%m%d-%H%M%S)
```

### Stage 3 — Hook statusMessage 등록 (Layer A)

`~/.claude/settings.json`의 `hooks.PreToolUse` 배열에 17개 매처 추가. 기존 `hooks.Stop`은 보존.

전체 매처 매핑:

| 매처(정규식) | statusMessage | 의도 |
|---|---|---|
| `Read` | `파일 읽는 중` | 파일 한 개 읽기 |
| `Glob` | `파일 검색 중` | 파일 경로 패턴 검색 |
| `Grep` | `코드 검색 중` | 코드 내 문자열 검색 |
| `Edit\|MultiEdit` | `파일 편집 중` | 파일 부분 수정 |
| `Write` | `파일 작성 중` | 파일 신규 생성/덮어쓰기 |
| `NotebookEdit` | `노트북 편집 중` | Jupyter 노트북 셀 수정 |
| `Bash` | `쉘 명령 실행 중` | 셸 명령 실행 |
| `Agent` | `서브에이전트 실행 중` | 하위 에이전트 호출 |
| `WebFetch` | `웹 페이지 조회 중` | URL 본문 가져오기 |
| `WebSearch` | `웹 검색 중` | 웹 검색 |
| `TaskCreate\|TaskUpdate\|TaskList\|TaskGet\|TaskOutput\|TaskStop` | `작업 관리 중` | 작업 추적 |
| `Skill` | `스킬 실행 중` | 슬래시 스킬 호출 |
| `ToolSearch` | `도구 스키마 로드 중` | deferred 도구 로드 |
| `AskUserQuestion` | `사용자 확인 대기` | 사용자 질문 |
| `EnterPlanMode\|ExitPlanMode` | `계획 모드 전환 중` | 계획 모드 토글 |
| `EnterWorktree\|ExitWorktree` | `워크트리 전환 중` | git worktree 전환 |
| `CronCreate\|CronDelete\|CronList` | `예약 작업 관리 중` | cron 스케줄 관리 (2026-06-19 추가) |
| `ScheduleWakeup` | `예약 깨우기 설정 중` | 깨우기 예약 (2026-06-19 추가) |
| `ListMcpResourcesTool\|ReadMcpResourceTool` | `MCP 리소스 조회 중` | MCP 리소스 (2026-06-19 추가) |
| `mcp__.*` | `MCP 도구 호출 중` | 모든 MCP 도구 |

각 매처의 hook `command`는 무해한 no-op (`"command": "true"`) — `statusMessage`만 띄우는 용도.

### Stage 4 — 바이너리 백업

```bash
SRC=~/.local/share/claude/versions/2.1.153
DST="$SRC.bak.$(date +%Y%m%d-%H%M%S)"
cp -p "$SRC" "$DST"
shasum -a 256 "$SRC" "$DST"  # 동일성 검증
```

### Stage 5 — Verb 매핑 + 패치 스크립트 작성 (Layer B)

`~/.claude/scripts/patch-spinner-verbs.py`에 178개 verb 매핑 dict + 검증 + 치환 로직 작성.

핵심 불변식: **영문 verb byte 수 == UTF-8 한국어 byte 수** (한글 1자 = 3 bytes, 길이 부족 시 trailing space 패딩).

패치 알고리즘:

```
for each (en_verb, ko_verb):
    # 패턴 1: JSON 배열
    replace b'"' + en + b'"'  →  b'"' + ko + b'"'

    # 패턴 2: NUL 경계 (Bun length-prefixed)
    replace b'\x00' + en + b'\x00'  →  b'\x00' + ko + b'\x00'
```

같은 길이라 surrounding 오프셋·헤더 변화 없음.

### Stage 6 — 패치 실행 + ad-hoc 재서명

```bash
python3 ~/.claude/scripts/patch-spinner-verbs.py ~/.local/share/claude/versions/2.1.153
```

내부 동작:
1. 백업 생성 (이미 있으면 skip)
2. 538 occurrence 치환
3. `codesign -s - --force --preserve-metadata=entitlements,flags` → ad-hoc 자기 서명
4. atomic rename으로 바이너리 교체

결과: Apple Developer 서명 → ad-hoc 서명 (TeamIdentifier=not set). 파일 크기 1.25 MB 감소(서명 섹션 축소, 정상).

### Stage 7 — 검증

| 확인 항목 | 결과 |
|---|---|
| 영문 verb 잔존 | 0건 (`strings | grep -c '^Pondering$'` → 0) |
| 한국어 verb byte 매칭 | 7/7 (사색중, 결과조합, 소용돌이, 쓸데없는수다, 광합성하기, 혼란시키기, 이름모를일중) |
| 코드 서명 상태 | `Signature=adhoc`, `Identifier=com.anthropic.claude-code` 보존 |
| 바이너리 실행 | `claude --version` → `2.1.153 (Claude Code)` |

### Stage 8 — LaunchAgent 등록 (Layer C)

`~/Library/LaunchAgents/dev.<username>.claude-spinner-patch.plist` 작성 + `launchctl load -w`.

```xml
<key>WatchPaths</key>
<array>
    <string>/Users/codevillain/.local/share/claude/versions</string>
</array>
<key>ThrottleInterval</key>
<integer>10</integer>
<key>RunAtLoad</key>
<false/>
```

versions/ 디렉터리 변경(FSEvents) → 10초 throttle 후 `auto-patch-claude.sh` 실행 → 영문 verb 잔존 파일 자동 패치.

#### Stage 8-A — 자동 plist 생성·등록 스크립트 (2026-06-21 추가)

처음 설치하거나 다른 머신·계정으로 옮길 때 그대로 복사·붙여넣으면 되는 **들여쓰기 0 한 덩어리** 스크립트. `whoami` 와 Homebrew prefix를 자동 감지해 사용자 환경 값으로 치환한다.

```bash
USERNAME="$(whoami)"
HOMEBREW_PREFIX="$([ -d /opt/homebrew ] && echo /opt/homebrew || echo /usr/local)"
PLIST="$HOME/Library/LaunchAgents/dev.${USERNAME}.claude-spinner-patch.plist"

# (멱등) 이미 로드돼 있으면 unload — 새 plist로 안전하게 교체
launchctl unload "$PLIST" 2>/dev/null || true

mkdir -p "$HOME/.claude/logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>dev.${USERNAME}.claude-spinner-patch</string>
    <key>ProgramArguments</key>
    <array>
        <string>${HOME}/.claude/scripts/auto-patch-claude.sh</string>
    </array>
    <key>WatchPaths</key>
    <array>
        <string>${HOME}/.local/share/claude/versions</string>
    </array>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>RunAtLoad</key>
    <false/>
    <key>StandardOutPath</key>
    <string>${HOME}/.claude/logs/spinner-patch.stdout</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/.claude/logs/spinner-patch.stderr</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${HOMEBREW_PREFIX}/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>HOME</key>
        <string>${HOME}</string>
    </dict>
</dict>
</plist>
EOF

# 1. plist 문법 검증 (OK 떠야 정상)
plutil "$PLIST"

# 2. launchd에 등록 + 로드
launchctl load -w "$PLIST"

# 3. 등록 확인 — `-  0  dev.<username>.claude-spinner-patch` 가 보이면 성공
launchctl list | grep claude-spinner-patch
```

> WARNING — **heredoc(`<<EOF`)의 닫는 `EOF`는 행의 맨 앞 첫 글자에서 시작해야 한다.** 가이드를 복사할 때 IDE/마크다운 뷰어가 자동 들여쓰기를 붙이면 셸이 `  EOF`를 종료 마커로 인식 못 하고 `heredoc>` 프롬프트에서 멈춘다. 위 블록은 들여쓰기 0으로 작성된 안전판이다. `Ctrl+C` 로 빠져나온 뒤 위 블록을 한 덩어리째 복사·붙여넣기.

> NOTE — 일부 뷰어가 DOCTYPE의 `>` 를 `\>` 로 자동 escape 해서 붙여넣으면 plist 파싱이 깨진다. `plutil` 이 `XML parsing error` 를 뱉으면 그 줄의 `\>` 를 `>` 로 수정.

핵심 동작:
- `launchctl unload` 가 멱등 — 미로드 상태면 `||true` 로 무시 (재실행 안전).
- `plutil` 은 macOS 내장 plist 문법 검사기. `OK` 가 떠야 다음 단계 진행 안전.
- `launchctl list` 출력의 가운데 숫자는 마지막 종료 코드 (`0` = 성공). 왼쪽 `-` 는 "지금은 실행 안 됨"(이벤트 대기 상태 — 정상).

### Stage 9 — 자동 동작 검증

가짜 트리거(`touch .test-trigger && rm .test-trigger`) → 2초 안에 로그에 새 스캔 entry 자동 생성. FSEvents·throttle 정상 작동 확인.

상세 검증 한 줄:

```bash
touch ~/.local/share/claude/versions/.test-trigger \
  && sleep 12 \
  && rm ~/.local/share/claude/versions/.test-trigger \
  && tail -5 ~/.claude/logs/spinner-patch.log
```

→ 로그 마지막에 `스캔 시작 ... 완료: patched=N skipped=N errors=0` 새 entry가 보이면 FSEvents·ThrottleInterval(10초) 모두 정상.

---

## 5. 동사 매핑 정책 (2026-06-19 개정)

### 5.1 설계 — 의미 통일

영문 verb 178개는 Anthropic이 모델 추론 대기 시간을 채우려고 만든 **무작위 위트**(Pondering·Schlepping·Boogieing 등). 어떤 verb가 떠도 모두 "API 응답을 기다리는 동안"이라는 동일한 의미다. 그래서 위트를 그대로 한국어로 옮긴 초기 버전("춤추기", "소용돌이")은 사용자가 "Claude Code가 지금 뭐 하는지"를 알 수 없게 만들었다.

개정안은 **byte 길이별 한국어 라벨 풀**을 정의하고 영문 verb를 라운드로빈으로 풀에 할당한다. 어떤 단어가 떠도 "AI가 응답을 만드는 중"이라는 의미가 즉시 읽힌다. 회전 효과는 풀 내 동의어로 유지.

매핑 자체는 `~/.claude/scripts/patch-spinner-verbs.py`의 `_build_verb_map()`이 `EN_VERBS_BY_LENGTH`(영문 원본)와 `KO_LABEL_POOLS`(한국어 풀)에서 동적 생성한다. 풀만 보면 의미가 모두 보이고 178개 entry를 손으로 적을 필요가 없다.

### 5.2 한국어 라벨 풀

| byte | 풀 (모두 "모델이 응답 생성 중" 의미) |
|---|---|
| 5  | (영문 유지 — "Doing", 한글 1자로는 의미 부족) |
| 6  | 추론, 사고, 응답, 생성 |
| 7  | 추론·사고·응답·생성·분석·처리·작업 (+ trailing space) |
| 8  | 추론·사고·응답·생성·분석·처리·작업·검토 (+ 2 spaces) |
| 9  | 추론중, 사고중, 응답중, 생성중, 분석중, 처리중, 작업중, 검토중, 준비중 |
| 10 | (9B 풀 8종) + trailing space |
| 11 | 추론중·사고중·응답중·생성중·분석중·처리중·작업중 (+ 2 spaces) |
| 12 | 답변추론, 응답생성, 코드작성, 문맥분석, 결과정리, 추론진행, 답변구성 |
| 13 | (12B 풀 6종) + trailing space |
| 14 | 답변추론, 응답생성, 코드작성, 문맥분석 (+ 2 spaces) |
| 15 | 답변생성중, 응답생성중, 코드작성중 |
| 16 | 답변생성중, 응답생성중 (+ trailing space) |
| 17 | 답변생성중 (+ 2 spaces) |
| 18 | 답변을생성중, 응답을생성중 |

### 5.3 실제 매핑 샘플

| 영문 verb | 이전 (초기) | 현재 (개정) |
|---|---|---|
| Pondering | 사색중 | 추론중 |
| Boogieing | 춤추기 | 분석중 |
| Schlepping | 끌고가 | 응답중 (+ space) |
| Whirlpooling | 소용돌이 | 답변추론 |
| Photosynthesizing | 광합성하기 | 답변생성중 (+ 2 spaces) |
| Discombobulating | 혼란시키기 | 답변생성중 (+ space) |
| Flibbertigibbeting | 쓸데없는수다 | 답변을생성중 |

전체 매핑은 스크립트에서 `python3 -c "import patch_spinner_verbs; print(patch_spinner_verbs.VERB_MAP)"` 으로 확인 가능.

---

## 5-옛. (참고) 초기 버전의 위트 1:1 매핑 — 보존용

> 아래 표들은 2026-06-18 초기 버전의 매핑이다. 의미 통일 개정으로 더 이상 사용되지 않지만, 만약 위트 버전으로 되돌리고 싶다면 참고할 수 있다.

### 5B — 영문 유지 (1개)

| 영문 | 한국어 | 사유 |
|---|---|---|
| Doing | (영문 유지) | 한글 1자(3B)는 의미 부족 |

### 6B — 한글 2자 (4개)

| 영문 | 한국어 | 그룹 |
|---|---|---|
| Baking | 굽기 | 요리 |
| Ebbing | 썰물 | 흐름 |
| Musing | 사색 | 사고 |
| Vibing | 감각 | 흐름 |

### 7B — 한글 2자 + space (19개)

| 영문 | 한국어 | 그룹 | 영문 | 한국어 | 그룹 |
|---|---|---|---|---|---|
| Beaming | 환함 | 흐름 | Misting | 안개 | 자연 |
| Booping | 톡톡 | 장난 | Mulling | 숙고 | 사고 |
| Brewing | 끓임 | 요리 | Nesting | 둥지 | 자연 |
| Bunning | 묶음 | 작업 | Stewing | 조림 | 요리 |
| Cooking | 요리 | 요리 | Warping | 왜곡 | 변환 |
| Flowing | 흐름 | 흐름 | Working | 작업 | 처리 |
| Forging | 단조 | 생성 | Zesting | 갈기 | 요리 |
| Forming | 형성 | 생성 | Hashing | 해싱 | 처리 |
| Gusting | 돌풍 | 자연 | Herding | 몰이 | 작업 |
| Honking | 경적 | 자연 | | | |

### 8B — 한글 2자 + 2 spaces (29개)

| 영문 | 한국어 | 그룹 | 영문 | 한국어 | 그룹 |
|---|---|---|---|---|---|
| Churning | 휘저 | 요리 | Perusing | 정독 | 탐색 |
| Clauding | 코딩 | 작업 | Pouncing | 덮침 | 자연 |
| Crafting | 제작 | 생성 | Proofing | 교정 | 작업 |
| Creating | 생성 | 생성 | Puzzling | 고민 | 사고 |
| Doodling | 낙서 | 장난 | Roosting | 쉼터 | 자연 |
| Frosting | 장식 | 요리 | Spinning | 회전 | 회전 |
| Grooving | 흥얼 | 장난 | Swirling | 휘말 | 회전 |
| Hatching | 부화 | 자연 | Swooping | 활강 | 흐름 |
| Ideating | 발상 | 사고 | Thinking | 사고 | 사고 |
| Infusing | 주입 | 변환 | Twisting | 비틈 | 변환 |
| Ionizing | 이온 | 자연 | Waddling | 뒤뚱 | 흐름 |
| Moseying | 산책 | 흐름 | Whirring | 윙윙 | 회전 |
| Noodling | 끼적 | 장난 | Whisking | 휘젓 | 요리 |
| Orbiting | 공전 | 회전 | Wibbling | 흔들 | 흐름 |
| Osmosing | 삼투 | 자연 | | | |

### 9B — 한글 3자 (perfect fit, 30개)

| 영문 | 한국어 | 그룹 | 영문 | 한국어 | 그룹 |
|---|---|---|---|---|---|
| Actioning | 실행중 | 처리 | Mustering | 준비중 | 생성 |
| Beboppin' | 박자중 | 장난 | Pondering | 사색중 | 사고 |
| Billowing | 물결중 | 흐름 | Puttering | 만지작 | 장난 |
| Blanching | 데치기 | 요리 | Sautéing | 볶음중 | 요리 |
| Boogieing | 춤추기 | 장난 | Scurrying | 달리기 | 흐름 |
| Burrowing | 굴파기 | 자연 | Sketching | 스케치 | 탐색 |
| Cascading | 쏟아짐 | 흐름 | Smooshing | 뭉치기 | 생성 |
| Composing | 작성중 | 생성 | Sprouting | 발아중 | 자연 |
| Computing | 계산중 | 처리 | Tempering | 조절중 | 변환 |
| Crunching | 처리중 | 처리 | Tinkering | 만지기 | 장난 |
| Drizzling | 흩뿌리 | 자연 | Unfurling | 펼치기 | 흐름 |
| Effecting | 효과중 | 처리 | Wandering | 방황중 | 흐름 |
| Finagling | 꾀하기 | 장난 | Wrangling | 다투기 | 작업 |
| Galloping | 질주중 | 흐름 | Imagining | 상상중 | 사고 |
| Gitifying | 버전중 | 작업 | Inferring | 추론중 | 사고 |

### 10B — 한글 3자 + 1 space (31개)

| 영문 | 한국어 | 그룹 | 영문 | 한국어 | 그룹 |
|---|---|---|---|---|---|
| Befuddling | 헷갈중 | 사고 | Levitating | 부양중 | 마법 |
| Bloviating | 장광설 | 장난 | Marinating | 재우는 | 요리 |
| Canoodling | 어루만 | 장난 | Meandering | 굽이굽 | 흐름 |
| Channeling | 전달중 | 마법 | Nebulizing | 성운화 | 자연 |
| Coalescing | 융합중 | 변환 | Nucleating | 핵형성 | 자연 |
| Cogitating | 사고중 | 사고 | Processing | 처리중 | 처리 |
| Concocting | 조합중 | 요리 | Ruminating | 되새김 | 사고 |
| Enchanting | 매혹중 | 마법 | Scampering | 쪼르륵 | 흐름 |
| Fermenting | 발효중 | 요리 | Schlepping | 끌고가 | 작업 |
| Flambéing | 플람베 | 요리 | Slithering | 스르륵 | 흐름 |
| Flummoxing | 당황중 | 사고 | Spelunking | 탐험중 | 탐색 |
| Fluttering | 팔랑중 | 흐름 | Symbioting | 공생중 | 자연 |
| Frolicking | 장난중 | 장난 | Thundering | 쾅쾅중 | 자연 |
| Garnishing | 장식중 | 요리 | Undulating | 물결중 | 회전 |
| Generating | 생성중 | 생성 | Zigzagging | 지그재 | 흐름 |
| Incubating | 부화중 | 자연 | | | |

### 11B — 한글 3자 + 2 spaces (23개)

| 영문 | 한국어 | 그룹 | 영문 | 한국어 | 그룹 |
|---|---|---|---|---|---|
| Actualizing | 실현중 | 생성 | Germinating | 발아중 | 자연 |
| Calculating | 계산중 | 처리 | Harmonizing | 조화중 | 변환 |
| Catapulting | 발사중 | 흐름 | Improvising | 즉흥중 | 생성 |
| Cerebrating | 두뇌중 | 사고 | Manifesting | 구현중 | 마법 |
| Channelling | 전달중 | 마법 | Moonwalking | 춤추기 | 장난 |
| Considering | 고려중 | 사고 | Percolating | 우려내 | 자연 |
| Cultivating | 재배중 | 자연 | Pollinating | 수분중 | 자연 |
| Deciphering | 해독중 | 탐색 | Propagating | 전파중 | 자연 |
| Determining | 결정중 | 사고 | Sublimating | 승화중 | 자연 |
| Elucidating | 해명중 | 사고 | Transmuting | 변환중 | 변환 |
| Envisioning | 상상중 | 사고 | Unravelling | 풀어내 | 변환 |
| Evaporating | 증발중 | 자연 | | | |

### 12B — 한글 4자 (perfect fit, 15개)

| 영문 | 한국어 | 그룹 |
|---|---|---|
| Architecting | 구조설계 | 생성 |
| Boondoggling | 허튼소리 | 장난 |
| Caramelizing | 캐러멜화 | 요리 |
| Deliberating | 심사숙고 | 사고 |
| Embellishing | 꾸미는중 | 요리 |
| Gallivanting | 쏘다니기 | 흐름 |
| Hyperspacing | 공간이동 | 흐름 |
| Lollygagging | 꾸물거리 | 장난 |
| Newspapering | 기사작성 | 생성 |
| Quantumizing | 양자처리 | 자연 |
| Reticulating | 그물짜기 | 생성 |
| Sock-hopping | 껑충뛰기 | 장난 |
| Synthesizing | 결과조합 | 생성 |
| Tomfoolering | 장난질중 | 장난 |
| Whirlpooling | 소용돌이 | 회전 |

### 13B — 한글 4자 + 1 space (13개)

| 영문 | 한국어 | 그룹 |
|---|---|---|
| Accomplishing | 완수하기 | 처리 |
| Bootstrapping | 초기화중 | 생성 |
| Combobulating | 정리하기 | 변환 |
| Contemplating | 곰곰생각 | 사고 |
| Crystallizing | 결정화중 | 자연 |
| Gesticulating | 몸짓표현 | 장난 |
| Jitterbugging | 흥겹게춤 | 장난 |
| Orchestrating | 총괄지휘 | 생성 |
| Perambulating | 산책하기 | 흐름 |
| Pontificating | 잘난체중 | 장난 |
| Precipitating | 강수발생 | 자연 |
| Razzmatazzing | 야단법석 | 장난 |
| Transfiguring | 형상변환 | 변환 |

### 14B — 한글 4자 + 2 spaces (6개)

| 영문 | 한국어 | 그룹 |
|---|---|---|
| Choreographing | 안무작성 | 생성 |
| Dilly-dallying | 어슬렁대 | 장난 |
| Hullaballooing | 와글와글 | 장난 |
| Metamorphosing | 탈바꿈중 | 변환 |
| Philosophising | 철학사색 | 사고 |
| Topsy-turvying | 뒤죽박죽 | 장난 |

### 15B — 한글 5자 (perfect fit, 3개)

| 영문 | 한국어 | 그룹 |
|---|---|---|
| Fiddle-faddling | 꼼지락대기 | 장난 |
| Razzle-dazzling | 와르르번쩍 | 장난 |
| Recombobulating | 다시정리중 | 변환 |

### 16B — 한글 5자 + 1 space (2개)

| 영문 | 한국어 | 그룹 |
|---|---|---|
| Discombobulating | 혼란시키기 | 변환 |
| Prestidigitating | 마술부리기 | 마법 |

### 17B — 한글 5자 + 2 spaces (1개)

| 영문 | 한국어 | 그룹 |
|---|---|---|
| Photosynthesizing | 광합성하기 | 자연 |

### 18B — 한글 6자 (perfect fit, 2개)

| 영문 | 한국어 | 그룹 |
|---|---|---|
| Flibbertigibbeting | 쓸데없는수다 | 장난 |
| Whatchamacalliting | 이름모를일중 | 장난 |

---

## 6. 반영(적용) 방법

### 즉시 반영 — 새 claude 세션 시작

이미 실행 중인 claude 프로세스는 시작 시점의 옛 바이너리·옛 settings를 메모리에 들고 있어 변경이 반영되지 않는다. **새 프로세스만이 디스크 변경을 새로 읽는다.**

```bash
# 방법 1: 새 터미널 탭에서 확인 (현재 세션 유지)
# Cmd+T 새 탭 → claude
claude

# 방법 2: 현재 세션 종료 후 새로 시작 (현재 작업 컨텍스트 잃음)
# /exit 또는 Ctrl+D 후
claude
```

### 정상 동작 확인 기준

- 스피너 옆 회전 단어가 한국어 (예: `사색중`, `결과조합`, `소용돌이`)
- 도구 호출 시 옆에 한국어 상태 라벨 표시 (예: `파일 읽는 중`, `코드 검색 중`)
- `claude --version` 정상 출력

---

## 7. 자동 재패치 시스템 — LaunchAgent

### 동작 흐름

```
1. Claude Code 자동 업데이트
2. ~/.local/share/claude/versions/2.1.154 새 파일 생성
   ↓ FSEvents 감지
3. LaunchAgent 10초 throttle 대기
4. auto-patch-claude.sh 실행
5. versions/ 전체 스캔 — 영문 verb 잔존 파일만 패치
6. 백업 → 한국어 패치 → ad-hoc 재서명
7. 로그 기록 (~/.claude/logs/spinner-patch.log)
8. 다음 claude 실행 시 한국어 verb로 동작
```

### 등록 명령

```bash
launchctl load -w ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist
```

처음 등록하거나 plist를 새로 만드는 경우는 §4 Stage 8-A의 **자동 plist 생성·등록 한 덩어리 스크립트**를 그대로 사용한다 (`whoami` + Homebrew prefix 자동 감지 + plutil 검증 포함).

### plist 문법 검증

```bash
plutil ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist
# OK 가 나오면 정상. XML parsing error 가 나오면 해당 줄 확인.
```

### plist 수정 후 안전한 재로드 (3단계)

```bash
PLIST=~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist
launchctl unload "$PLIST" 2>/dev/null || true   # 1. 기존 unload (멱등)
# ... plist 수정 ...
plutil "$PLIST"                                  # 2. 문법 검증
launchctl load -w "$PLIST"                       # 3. 재로드
```

### 상태 확인

```bash
launchctl list | grep claude-spinner-patch
# 출력 예: -    0    dev.codevillain.claude-spinner-patch
#   ↑ 현재 미실행 (정상, FSEvents 대기 중)
#        ↑ 마지막 종료 코드 (0 = 성공)
```

### 로그 실시간 모니터링

```bash
tail -f ~/.claude/logs/spinner-patch.log
```

### 일시 정지 / 재가동

```bash
# 일시 정지
launchctl unload ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist

# 재가동
launchctl load -w ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist
```

### 영구 제거

```bash
launchctl unload ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist
rm ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist
```

### 수동 강제 실행 (테스트)

```bash
~/.claude/scripts/auto-patch-claude.sh
```

이미 패치된 파일은 idempotent skip된다.

---

## 8. 트러블슈팅

### 증상 1 — 새 세션에서도 영문 verb가 보임

| 가능 원인 | 진단 명령 | 조치 |
|---|---|---|
| 자동 업데이트가 끼어들어 새 버전 바이너리가 활성 | `ls -la ~/.local/share/claude/versions/`, `tail ~/.claude/logs/spinner-patch.log` | LaunchAgent 트리거 여부 확인 → 미트리거면 `~/.claude/scripts/auto-patch-claude.sh` 수동 실행 |
| symlink가 옛 버전을 가리킴 | `readlink ~/.local/bin/claude` | symlink가 새 버전을 가리키지 않으면 Claude Code 업데이트가 미완료 상태. 잠시 후 재시도 |
| LaunchAgent 미로드 | `launchctl list \| grep claude-spinner-patch` | 결과 없으면 `launchctl load -w ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist` 재로드 |

### 증상 2 — hook 라벨만 안 보임 (verb는 한국어)

| 가능 원인 | 진단 명령 | 조치 |
|---|---|---|
| `settings.json` JSON 문법 오류 | `python3 -m json.tool ~/.claude/settings.json` | 오류 메시지 위치 보정. 백업에서 복원 가능: `cp ~/.claude/settings.json.bak.20260618-174628 ~/.claude/settings.json` |
| PreToolUse 매처가 실제 도구명과 불일치 | `cat ~/.claude/settings.json \| python3 -m json.tool` 로 매처 확인 | 도구명 정확한 표기 확인 (대소문자 주의) |

### 증상 3 — `claude` 실행 시 `killed: 9` 또는 즉시 종료

| 가능 원인 | 조치 |
|---|---|
| ad-hoc 서명을 macOS Gatekeeper가 거부 | 아래 "복구 절차" → 바이너리 복구 |
| 엔터프라이즈 MDM 정책 차단 | IT 관리자에 문의. ad-hoc 서명 허용 정책 필요 |

### 증상 4 — LaunchAgent가 트리거되어도 패치가 안 됨

```bash
# 상세 로그 확인
tail -50 ~/.claude/logs/spinner-patch.log
tail -50 ~/.claude/logs/spinner-patch.stderr
```

| 로그 단서 | 조치 |
|---|---|
| `patched=0 skipped=N` | 정상 — 이미 패치된 파일만 있음 |
| `errors > 0` | 실패한 파일 식별. 백업에서 복원 후 수동 패치 재시도 |
| `python3: command not found` | Python3 미설치. macOS 시스템 Python3 활성화 또는 Homebrew 설치 |

### 증상 5-A — plist 작성 중 `heredoc>` 프롬프트에서 빠져나오지 못함

```bash
$ cat > ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist <<EOF
heredoc>     ← 여기서 계속 멈춤
```

| 원인 | 조치 |
|---|---|
| heredoc 닫는 `EOF`가 행 맨 앞이 아니라 **앞에 공백·탭 들여쓰기**가 붙어 있음. 셸이 종료 마커로 인식 못 함 | `Ctrl+C` 로 빠져나온 뒤 §4 Stage 8-A의 **들여쓰기 0 한 덩어리** 스크립트를 그대로 복사·붙여넣기 |
| 마크다운 뷰어·IDE가 자동 들여쓰기 추가 | 가이드의 코드 블록을 복사할 때는 **반드시 코드 블록 안에서만** 복사 (마크다운 본문 영역에서 드래그 ✗). 또는 가이드 raw 파일 직접 보기 |
| DOCTYPE의 `>` 가 `\>` 로 자동 escape됨 | 붙여넣기 후 `\>` → `>` 수정. `plutil` 이 `XML parsing error` 를 뱉으면 그 줄 |

> TIP — heredoc 들여쓰기를 꼭 유지하고 싶다면 `<<-EOF` (하이픈) 사용 + **탭으로만** 들여쓰기 (공백은 안 됨). 그러나 plist는 들여쓰기 0이 가장 안전.

### 증상 5 — 자동 업데이트 후 며칠 동안 영문 verb

LaunchAgent throttle은 10초지만, FSEvents 이벤트 자체가 누락될 수 있다(시스템 절전 등).

```bash
# 강제 스캔
~/.claude/scripts/auto-patch-claude.sh

# 로그에서 처리 결과 확인
tail ~/.claude/logs/spinner-patch.log
```

---

## 9. 백업 및 복구

### 9.1 백업 자산 목록

```
~/.claude/settings.json.bak.20260612-232124   (이전 작업 백업)
~/.claude/settings.json.bak.20260618-174628   (이번 작업 직전 백업)

~/.local/share/claude/versions/2.1.153.bak.20260618-174657   (바이너리 원본 1)
~/.local/share/claude/versions/2.1.153.bak.20260618-175315   (바이너리 원본 2)
   sha256: 449d9c89d7a63b1d427d912a7bd6e6f23f9a7b363866697c9fa9a0012546b254
```

두 바이너리 백업은 sha256 동일 — 어느 쪽으로 복구해도 같은 깨끗한 원본.

### 9.2 부분 복구 — Hook statusMessage만 제거

```bash
# settings.json만 이번 작업 직전 상태로 복원
cp ~/.claude/settings.json.bak.20260618-174628 ~/.claude/settings.json

# 검증
python3 -m json.tool ~/.claude/settings.json
```

이러면 바이너리 verb는 한국어 유지, hook 라벨만 사라진다.

### 9.3 부분 복구 — 바이너리 verb만 영문 복원

```bash
SRC=~/.local/share/claude/versions/2.1.153.bak.20260618-174657
DST=~/.local/share/claude/versions/2.1.153

cp -p "$SRC" "$DST"

# 백업은 원본 Apple Developer 서명을 보존하므로 별도 재서명 불필요
# 단, 확인 차원에서 서명 검증
codesign -dv "$DST"
```

이러면 hook 라벨은 유지, verb는 영문 회전으로 복귀.

### 9.4 전체 롤백

```bash
# 1. LaunchAgent 제거
launchctl unload ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist
rm ~/Library/LaunchAgents/dev.codevillain.claude-spinner-patch.plist

# 2. 바이너리 복원
cp -p ~/.local/share/claude/versions/2.1.153.bak.20260618-174657 \
      ~/.local/share/claude/versions/2.1.153

# 3. settings.json 복원
cp ~/.claude/settings.json.bak.20260618-174628 ~/.claude/settings.json

# 4. 스크립트·로그 정리 (선택)
rm -rf ~/.claude/scripts/patch-spinner-verbs.{py,sh}
rm -f ~/.claude/scripts/auto-patch-claude.sh
rm -rf ~/.claude/logs/spinner-patch.*

# 5. 새 claude 세션에서 영문 verb 복귀 확인
claude --version
```

### 9.5 ad-hoc 서명 실패 시 강제 재서명

패치 후 어떤 이유로 서명이 깨졌다면:

```bash
codesign -s - --force --preserve-metadata=entitlements,flags \
    ~/.local/share/claude/versions/2.1.153

# 재검증
codesign -dv ~/.local/share/claude/versions/2.1.153
# Signature=adhoc 보이면 정상
```

---

## 10. 자주 묻는 질문

### Q1. 이 패치가 다른 사용자나 다른 머신에서도 동작하나?

LaunchAgent는 codevillain 계정 한정. 다른 계정/머신에서는 plist의 절대 경로를 그 계정·머신에 맞게 수정해 재설치해야 한다.

### Q2. Claude Code가 메이저 버전 업그레이드(3.x) 하면?

바이너리 packaging 방식이 바뀌지 않는 한 동일하게 작동. 만약 압축·암호화 등으로 바뀌면 패치 로직 자체가 안 통하고 로그에 `patched=0 errors=N`이 누적된다. 그 시점에 매핑 로직 재설계 필요.

### Q3. 한국어 매핑이 마음에 안 드는 verb가 있다면?

`~/.claude/scripts/patch-spinner-verbs.py`의 `VERB_MAP` dict에서 해당 entry 수정 후, 같은 byte 길이 invariant를 유지해야 한다. 수정 후:

```bash
# 1. 매핑 검증
python3 -c "
import importlib.util
spec = importlib.util.spec_from_file_location('pv', '/Users/codevillain/.claude/scripts/patch-spinner-verbs.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
m.validate_map()
print(f'OK — {len(m.VERB_MAP)}개 매핑 byte 길이 일치')
"

# 2. 백업에서 원본 복구 후 재패치 (이미 한국어로 된 바이너리에 또 패치하면 매칭 안 됨)
cp -p ~/.local/share/claude/versions/2.1.153.bak.20260618-174657 \
      ~/.local/share/claude/versions/2.1.153
python3 ~/.claude/scripts/patch-spinner-verbs.py
```

### Q4. macOS Sequoia(15)/Tahoe(16) 이상에서도 동작하나?

ad-hoc 서명 정책은 macOS 14.5에서 통과 확인됨. 향후 버전에서 hardened runtime 정책이 강화되면 차단될 가능성 있음. 차단 시 백업으로 즉시 복구 가능.

### Q5. Linux/Windows에서 동작?

- **Linux**: 바이너리 패치 자체는 가능(코드 서명 없음). 그러나 LaunchAgent는 macOS 전용 → systemd path unit 등으로 대체 필요.
- **Windows**: WSL 안에서 Linux 방식과 동일. 네이티브 Windows는 코드 서명·바이너리 구조가 달라 매핑 재설계 필요.

---

## 11. 참고 자료

- 영문 verb 원본 목록: [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-spinner-verbs-and-tips.md) (179개 verb 문서화)
- Claude Code Hooks 공식: https://docs.claude.com/en/docs/claude-code/hooks
- Claude Code Settings 공식: https://docs.claude.com/en/docs/claude-code/settings
- macOS LaunchAgent 공식: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
