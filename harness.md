# harness.md — claude-code-ppt 개발 하네스 사용법

이 프로젝트는 `npx carve-harness`로 설치한 개발 하네스를 쓴다. 프론트엔드 슬라이드/PPT 에디터(React + Vite + TypeScript)에 맞게 **슬림화**된 상태다 — no-op·노이즈 훅은 해제하고 실값 있는 것만 활성화했다.

문서 구성:
- 이 문서(`harness.md`): 일상 사용법 — 무엇을 어떻게 부르나
- `HARNESS-GUIDE.md`: carve가 생성한 원본 설치 가이드
- `flight-rules.md`: 강제 규칙(금지/필수) 명세
- `evaluation-criteria.md`: 측정 가능한 완료 기준
- `sprint-contract.md`: 작업 시작 전 합의하는 "완료" 정의
- `carve-manifest.json`: 설치 자산 추적(제거·복원 근거)

---

## 1. 구조 한눈에

하네스는 4계층이다.

| 계층 | 위치 | 트리거 | 성격 |
|---|---|---|---|
| 강제 훅 | `.claude/hooks/` + `.claude/settings.json` | 툴 호출/프롬프트 자동 | 결정적(차단은 exit 2) |
| Squad 에이전트 | `.claude/agents/` | `/squad <member>` | 단일 책임 위임 |
| 워크플로 스킬 | `.claude/skills/` | 자연어 또는 `/carve-*` | 절차 자동화 |
| 계약·규칙 문서 | 루트 `*.md` | 에이전트·훅이 참조 | 단일 진실 출처 |

런타임 비용은 **훅**에만 있다(매 툴콜/프롬프트 발화). 스킬·에이전트 `.md`는 호출 전엔 비용 0인 휴면 파일이다.

---

## 2. 활성 훅 (8개)

`settings.json`에 등록돼 자동 발화한다. `.sh` 본체는 `.claude/hooks/`에 있다.

| 훅 | 이벤트 | 동작 |
|---|---|---|
| `carve-block-destructive` | PreToolUse(Bash) | 포크밤·`mkfs`·`dd of=/dev/`·`rm -rf /`(또는 `~`,`$HOME`,`*`)·`git push --force main/master`를 **exit 2 차단**. 일반 `rm`은 통과 |
| `carve-protect-secrets` | PreToolUse(Read/Edit/Write) | `.env`·`*.pem`·`*.key`·`id_rsa`·`credentials.json`·`.aws/credentials` 접근 **차단**. `.env.example`은 허용 |
| `carve-pre-push-test` | PreToolUse(Bash) | `git push` 감지 시 `npm run test` 실행, 실패하면 push **차단**. `CARVE_TEST_CMD`로 명령 교체 가능 |
| `carve-codesight-refresh` | PreToolUse(Bash) | `git commit` 시 `.codesight/` 인덱스를 백그라운드 갱신(비차단) |
| `carve-anti-slop` | PostToolUse(Write/Edit) | 저장한 `.html/.css/.svg/.md`를 `check-slop.mjs`로 검사 → ERROR면 **경고만**(차단 아님). `*/presentation/*`·`*/slides/*` 경로는 예외 |
| `carve-precompact-handoff` | PreCompact | 컨텍스트 압축 직전 작업 상태를 핸드오프로 저장 |
| `subagent-chain` | SubagentStart/Stop | `squad-*` 에이전트 시작·종료 시 OS 네이티브 알림 |

확인: `node -e "..."`로 보거나 `npx carve-harness doctor`로 문법·등록을 점검한다.

## 3. 해제된 훅 (4개) 과 재활성화

프론트엔드 전용·솔로 작업에 맞춰 아래는 등록 해제했다. `.sh` 파일은 남아 있어 한 줄로 되살릴 수 있다.

| 훅 | 해제 이유 | 되살리는 법 |
|---|---|---|
| `carve-pre-commit-lint` | 린터 미설정 → no-op | ESLint 추가 후 `settings.json` PreToolUse(Bash)에 재등록 + `CARVE_LINT_CMD` 지정 |
| `carve-auto-format` | 포매터 미설정 → no-op | Prettier 추가 후 PostToolUse(Edit/Write) 재등록 + `CARVE_FORMAT_CMD` 지정 |
| `carve-slack-notify` | 웹훅 미설정 → no-op | Slack 웹훅 URL 설정 후 Stop 훅 재등록 |
| `squad-router` | 매 프롬프트 주입 노이즈 | UserPromptSubmit 재등록(필요 시). 끄는 대안은 프롬프트에 `#direct` 또는 `export SQUAD_ROUTER=off` |

재등록은 `.claude/settings.json`의 해당 이벤트 배열에 항목을 다시 넣으면 된다(아래 4. 형식 참조).

---

## 4. settings.json 훅 형식

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash",
        "hooks": [ { "type": "command", "command": "bash .claude/hooks/carve-block-destructive.sh", "_carve": true } ] }
    ]
  }
}
```

- `matcher`: 어느 툴에 걸지(`Bash`, `Read|Edit|Write`, 빈 문자열=전체)
- 차단형 훅은 비정상 입력에 `exit 2`로 동작을 막는다(권고 아님)
- `_carve: true`는 carve가 자기 자산을 식별하는 표식

---

## 5. 워크플로 스킬

자연어로 트리거하거나 `/carve-<name>`으로 명시 호출한다.

개발 흐름
- `commit` — "커밋 메시지 만들어" → Conventional Commit 생성
- `pr` — "PR 만들어" → 브랜치 변경 요약 + `gh`로 PR
- `changelog` — "체인지로그" → Keep a Changelog 형식 갱신
- `review` — "리뷰해줘" → 변경 파일 검토(깊은 건 squad-review 위임)
- `verify` — "검증해" → build → lint → test → typecheck 순차
- `tdd` — "테스트 먼저" → red-green-refactor
- `test-gen` — "테스트 생성" → 수용 기준 기반 테스트

세션 관리
- `handoff` — "핸드오프" → 진행상황·결정·다음 할 일 인계
- `memory` — "기억해" → 비자명한 결정·맥락 영속화
- `caveman` — "초압축 모드" → 토큰 ~75% 절감 응답
- `zoom-out` — "큰 그림" → 시스템 수준 시야

시각 산출물 (이 프로젝트 핵심)
- `anti-ai-slop`(마스터) 아래 `clean-html`·`svg-image`·`card-news`·`html-report`·`html-presentation`
- "예쁘게/모던하게" 요청에도 그라데이션·글로우·글래스모피즘·모션 장식·마케팅 문구를 빼고 크기·여백·정렬·타이포로 위계를 만든다
- 슬라이드 데크 변환은 `md-to-slidedeck`, 웹 뷰어 export는 `export-html-deck`

토큰 효율
- `codesight` — "구조 파악/어디서 쓰여" → 프로젝트 맵 MCP(grep 대체)
- `lsp` — "정의로 이동/참조 찾기" → findReferences/getDiagnostics(grep 대체)

메타(필요 시)
- `harness-architect` — "하네스 구성해줘" → 구성요소 선택 안내
- `harness-audit` — "하네스 점검" → doctor + 등록·문법·자산 정합
- `write-a-skill` · `model-route` · `parallel-agents` · `coordinator` · `evaluator-tuning`

---

## 6. Squad 에이전트

`/squad <member> [task]` 또는 개별 `/squad-<member>`로 호출한다. 단일 책임 전문가이며 파이프라인으로 이어진다.

```
plan → 구현 → review ─APPROVE→ qa ─PASS→ gitops(commit/PR)
                 └REQUEST_CHANGES→ refactor → review(재검증)
debug(버그) → qa → gitops          audit(배포 전 보안)
evaluator(독립 평가) ── sprint-contract.md / evaluation-criteria.md 기준 PASS/FAIL
```

멤버: `plan` `review` `refactor` `qa` `debug` `docs` `gitops` `audit` `evaluator`

`squad-evaluator`는 구현 주체와 분리된 평가자로, `evaluation-criteria.md`(빌드·테스트·슬롭 0 ERROR)와 `sprint-contract.md`(완료 정의)를 기준으로 판정한다. 제대로 쓰려면 작업 시작 시 `sprint-contract.md`의 목표 칸을 먼저 채운다.

> 참고: `squad-audit`는 인증/결제 백엔드용 설계라 이 프론트엔드 프로젝트에선 활용도가 낮다. 필요할 때만 명시 호출한다.

---

## 7. MCP 서버

`settings.json`의 `mcpServers`에 등록돼 있다.

- `codesight` — `npx codesight --mcp`. 프로젝트 구조 맵, 탐색 토큰 절약
- `cclsp` — `npx cclsp@latest`. LSP 기반 정확한 코드 네비게이션

규칙: 코드 탐색·구조 파악은 codesight/LSP를 먼저 쓰고, grep·전체 파일 읽기는 보조로만(`flight-rules.md`의 토큰 효율 규칙).

---

## 8. 관리 명령

```bash
npx carve-harness list      # 설치 가능/설치된 구성요소
npx carve-harness doctor    # 보안·권한·훅 문법 감사
npx carve-harness install   # 대화형 선택 설치(일괄 설치 없음)
npx carve-harness uninstall # 전체 제거 + .bak 복원
```

`uninstall`은 `CLAUDE.md.bak`을 복원하므로 수정한 `CLAUDE.md`가 덮어써진다. 부분 되돌리기는 `.claude/settings.json`을 직접 편집하는 편이 안전하다.

---

## 9. 슬림화 결정 요약

- 활성 훅을 11 → 8로 줄였다(no-op 3 + 노이즈 1 해제).
- 스킬·에이전트 `.md`는 휴면 비용 0이라 삭제하지 않고 그대로 둔다.
- `anti-slop` 게이트와 `pre-push-test`는 이 프로젝트(시각 산출물 + 실제 테스트 스위트)에 정확히 맞아 유지한다.
- 린터/포매터(ESLint·Prettier)를 도입하면 `pre-commit-lint`·`auto-format`을 재활성화할 가치가 생긴다.
