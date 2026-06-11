# Claude Code 슬래시 커맨드 A-Z 전체 레퍼런스

> 기준일: 2026-06-06 · 대상: 개발자
> 출처: Claude Code 공식 문서 `code.claude.com/docs/en/commands` (1차 출처 그대로 정리)
> 범위: 터미널 세션에서 `/`로 시작하는 **빌트인 명령 + 번들 스킬/워크플로** 전체

---

## 0. 먼저 알아둘 것 (결론)

- 세션 중 **`/`만 입력**하면 현재 환경에서 쓸 수 있는 명령 전체가 뜹니다. `/` 뒤에 글자를 치면 자동완성 필터가 됩니다.
- 명령은 **메시지 맨 앞에서만** 인식됩니다. 명령 이름 뒤 텍스트는 인자로 전달됩니다. (`<arg>`=필수, `[arg]`=선택)
- **모든 명령이 모두에게 보이진 않습니다.** 플랫폼·요금제·환경에 따라 다릅니다. (예: `/desktop`은 macOS/Windows + 구독 로그인 시만, `/upgrade`는 Pro·Max만)
- 표기: **[Skill]** = Claude에게 전달되는 프롬프트형 번들 스킬(Claude가 자동 호출도 함), **[Workflow]** = 백그라운드에서 여러 서브에이전트로 분산 실행되는 번들 워크플로. 나머지는 CLI에 코딩된 빌트인.
- ⚠️ `advisor`는 **공식 목록에 없습니다.** 커스텀 명령(`~/.claude/commands/`)이거나 플러그인일 수 있으니 별도 확인이 필요합니다.

---

## A

| 명령 | 종류 | 기능 |
|------|------|------|
| `/add-dir <path>` | 빌트인 | 현재 세션에 파일 접근용 작업 디렉터리 추가. 단, 추가된 디렉터리의 `.claude/` 설정은 대부분 자동 탐색되지 않음 |
| `/agents` | 빌트인 | 서브에이전트 구성 관리 |
| `/autofix-pr [prompt]` | 빌트인 | 현재 브랜치 PR을 감시하는 웹 세션을 띄워, CI 실패·리뷰 코멘트 발생 시 자동으로 수정 푸시. `gh` CLI 필요. 예: `/autofix-pr only fix lint and type errors` |

## B

| 명령 | 종류 | 기능 |
|------|------|------|
| `/background [prompt]` | 빌트인 | 현재 세션을 백그라운드 에이전트로 분리해 터미널을 비움. `claude agents`로 모니터링. **별칭 `/bg`** |
| `/batch <instruction>` | [Skill] | 코드베이스 전반의 대규모 변경을 병렬 수행. 5~30개 독립 단위로 분해→승인 후 각 단위를 격리된 git worktree에서 서브에이전트가 처리·테스트·PR 생성. git 저장소 필요 |
| `/branch [name]` | 빌트인 | 현재 대화를 이 지점에서 분기. 원본은 보존되며 `/resume`로 복귀 가능. (서브에이전트에 위임하려면 `/fork`) |
| `/btw <question>` | 빌트인 | 대화 기록에 남기지 않는 간단한 곁다리 질문 |

## C

| 명령 | 종류 | 기능 |
|------|------|------|
| `/chrome` | 빌트인 | Claude in Chrome 설정 |
| `/claude-api [migrate\|managed-agents-onboard]` | [Skill] | 프로젝트 언어별 Claude API 레퍼런스 로드(tool use, streaming, batches 등). `anthropic`/`@anthropic-ai/sdk` import 시 자동 활성. `migrate`로 기존 코드 모델 업그레이드 |
| `/clear [name]` | 빌트인 | 빈 컨텍스트로 새 대화 시작(이전 대화는 `/resume`에 보존). **별칭 `/reset`, `/new`** |
| `/code-review [low\|medium\|high\|xhigh\|max\|ultra] [--fix] [--comment] [target]` | [Skill] | 현재 diff를 정확성 버그 + 재사용·단순화·효율 관점으로 리뷰. `--fix` 적용, `--comment` PR 코멘트, `ultra` 클라우드 심층 리뷰 |
| `/color [color\|default]` | 빌트인 | 프롬프트 바 색상 지정(red/blue/green/yellow/purple/orange/pink/cyan) |
| `/compact [instructions]` | 빌트인 | 대화를 요약해 컨텍스트 확보. 포커스 지시 전달 가능 |
| `/config` | 빌트인 | 설정 인터페이스(테마·모델·출력 스타일 등). **별칭 `/settings`** |
| `/context [all]` | 빌트인 | 현재 컨텍스트 사용량을 색상 그리드로 시각화 + 최적화 제안. `all`로 항목별 상세 펼침 |
| `/copy [N]` | 빌트인 | 마지막 응답을 클립보드 복사. `N`으로 N번째 이전 응답 복사. 코드블록 선택 피커 제공 |
| `/cost` | 빌트인 | `/usage` 별칭 |

## D

| 명령 | 종류 | 기능 |
|------|------|------|
| `/debug [description]` | [Skill] | 현재 세션 디버그 로깅 활성화 + 로그 분석으로 문제 진단 |
| `/deep-research <question>` | [Workflow] | 웹 검색 분산 실행→출처 교차검증→인용 포함 리포트 합성 |
| `/desktop` | 빌트인 | 현재 세션을 Claude Code 데스크톱 앱에서 이어가기(macOS/Windows + 구독). **별칭 `/app`** |
| `/diff` | 빌트인 | 미커밋 변경 + 턴별 diff 인터랙티브 뷰어 |
| `/doctor` | 빌트인 | 설치·설정 진단(상태 아이콘). `f` 키로 Claude가 자동 수정 |

## E

| 명령 | 종류 | 기능 |
|------|------|------|
| `/effort [level\|auto]` | 빌트인 | 모델 추론 강도 설정(low/medium/high/xhigh/max/ultracode). `max`·`ultracode`는 세션 한정. 즉시 적용 |
| `/exit` | 빌트인 | CLI 종료. 백그라운드 세션 attach 상태면 분리만 하고 세션은 유지. **별칭 `/quit`** |
| `/export [filename]` | 빌트인 | 현재 대화를 평문으로 내보내기 |

## F

| 명령 | 종류 | 기능 |
|------|------|------|
| `/fast [on\|off]` | 빌트인 | 패스트 모드 토글 |
| `/feedback [report]` | 빌트인 | 피드백·버그 신고·대화 공유. **별칭 `/bug`, `/share`** |
| `/fewer-permission-prompts` | [Skill] | 트랜스크립트에서 읽기전용 Bash/MCP 호출을 찾아 프로젝트 `settings.json`에 허용목록 추가→권한 프롬프트 감소 |
| `/focus` | 빌트인 | 포커스 뷰 토글(마지막 프롬프트·도구 요약·최종 응답만). 풀스크린 렌더링에서만 |
| `/fork <directive>` | 빌트인 | 전체 대화를 상속한 백그라운드 서브에이전트를 띄워 지시 수행(결과 복귀). v2.1.161 이전엔 `/branch` 별칭 |

## G

| 명령 | 종류 | 기능 |
|------|------|------|
| `/goal [condition\|clear]` | 빌트인 | 목표 설정—조건 충족까지 턴을 넘겨 계속 작업. `clear`/`stop`/`off` 등으로 해제 |

## H

| 명령 | 종류 | 기능 |
|------|------|------|
| `/heapdump` | 빌트인 | JS 힙 스냅샷 + 메모리 분석을 `~/Desktop`에 기록(고메모리 진단용) |
| `/help` | 빌트인 | 도움말 및 사용 가능 명령 표시 |
| `/hooks` | 빌트인 | 도구 이벤트용 훅 구성 보기 |

## I

| 명령 | 종류 | 기능 |
|------|------|------|
| `/ide` | 빌트인 | IDE 통합 관리 및 상태 표시 |
| `/init` | 빌트인 | `CLAUDE.md` 가이드로 프로젝트 초기화. `CLAUDE_CODE_NEW_INIT=1`로 스킬·훅·개인 메모리까지 안내하는 인터랙티브 플로 |
| `/insights` | 빌트인 | 세션 분석 리포트(프로젝트 영역·상호작용 패턴·마찰 지점) 생성 |
| `/install-github-app` | 빌트인 | 저장소에 Claude GitHub Actions 앱 설정 |
| `/install-slack-app` | 빌트인 | Claude Slack 앱 설치(브라우저 OAuth) |

## K

| 명령 | 종류 | 기능 |
|------|------|------|
| `/keybindings` | 빌트인 | 키보드 단축키 파일 열기 |

## L

| 명령 | 종류 | 기능 |
|------|------|------|
| `/login` | 빌트인 | Anthropic 계정 로그인 |
| `/logout` | 빌트인 | 로그아웃 |
| `/loop [interval] [prompt]` | [Skill] | 세션 유지 중 프롬프트 반복 실행. 인터벌 생략 시 Claude가 자가 페이싱. 예: `/loop 5m check if the deploy finished`. **별칭 `/proactive`** |

## M

| 명령 | 종류 | 기능 |
|------|------|------|
| `/mcp` | 빌트인 | MCP 서버 연결 및 OAuth 인증 관리 |
| `/memory` | 빌트인 | `CLAUDE.md` 메모리 편집, 오토메모리 on/off 및 항목 보기 |
| `/mobile` | 빌트인 | 모바일 앱 다운로드 QR 표시. **별칭 `/ios`, `/android`** |
| `/model [model]` | 빌트인 | 모델 전환 + 기본값 저장. 인자 없으면 피커(`s`로 세션 한정 전환) |

## P

| 명령 | 종류 | 기능 |
|------|------|------|
| `/passes` | 빌트인 | 친구에게 Claude Code 무료 1주 공유(자격 있는 계정만 표시) |
| `/permissions` | 빌트인 | 도구 권한 allow/ask/deny 규칙 관리. **별칭 `/allowed-tools`** |
| `/plan [description]` | 빌트인 | 플랜 모드 진입. 예: `/plan fix the auth bug` |
| `/plugin [subcommand]` | 빌트인 | 플러그인 관리(`list`/`install`/`enable`/`disable`) |
| `/powerup` | 빌트인 | 애니메이션 데모가 있는 인터랙티브 기능 학습 |
| `/privacy-settings` | 빌트인 | 개인정보 설정 보기·변경(Pro·Max만) |

> ⚠️ `/pr-comments`는 **v2.1.91에서 제거**됨 (하단 "제거된 명령" 참조)

## R

| 명령 | 종류 | 기능 |
|------|------|------|
| `/radio` | 빌트인 | 브라우저에서 Claude FM 로파이 라디오 열기 |
| `/recap` | 빌트인 | 현재 세션 한 줄 요약 생성 |
| `/release-notes` | 빌트인 | 버전 피커로 체인지로그 보기 |
| `/reload-plugins [--force]` | 빌트인 | 재시작 없이 활성 플러그인 리로드 |
| `/reload-skills` | 빌트인 | 세션 중 디스크에 추가/변경된 스킬·명령 디렉터리 재스캔(v2.1.152+) |
| `/remote-control` | 빌트인 | claude.ai에서 이 세션을 원격 제어 가능하게. **별칭 `/rc`** |
| `/remote-env` | 빌트인 | 클라우드 에이전트 기본 환경 선택 |
| `/rename [name]` | 빌트인 | 현재 세션 이름 변경(프롬프트 바 표시) |
| `/resume [session]` | 빌트인 | ID/이름으로 대화 재개 또는 피커 열기. 백그라운드 세션은 `bg` 표시(v2.1.144+). **별칭 `/continue`** |
| `/review [PR]` | 빌트인 | 현재 세션에서 PR 로컬 리뷰(심층은 `/code-review ultra`) |
| `/rewind` | 빌트인 | 대화/코드를 체크포인트로 되돌리거나 선택 지점부터 요약. **별칭 `/checkpoint`, `/undo`** |
| `/run` | [Skill] | 프로젝트 앱을 실제 실행해 변경 동작 확인(테스트가 아닌 실행 검증). v2.1.145+ |
| `/run-skill-generator` | [Skill] | `/run`·`/verify`가 앱을 빌드·실행·구동하는 법을 프로젝트별 스킬로 작성. v2.1.145+ |

## S

| 명령 | 종류 | 기능 |
|------|------|------|
| `/sandbox` | 빌트인 | 샌드박스 모드 토글(지원 플랫폼만) |
| `/schedule [description]` | 빌트인 | 클라우드 인프라에서 실행되는 루틴 생성·수정·실행. **별칭 `/routines`** |
| `/scroll-speed` | 빌트인 | 마우스 휠 스크롤 속도 조정(풀스크린 렌더링만) |
| `/security-review` | 빌트인 | 현재 브랜치 변경의 보안 취약점 분석(injection, auth, 데이터 노출 등) |
| `/setup-bedrock` | 빌트인 | Amazon Bedrock 인증·리전·모델 설정 마법사(`CLAUDE_CODE_USE_BEDROCK=1` 시만 표시) |
| `/setup-vertex` | 빌트인 | Google Vertex AI 설정 마법사(`CLAUDE_CODE_USE_VERTEX=1` 시만 표시) |
| `/simplify [target]` | [Skill] | 변경 코드의 정리(cleanup) 전용 리뷰 4개 에이전트 병렬 실행→수정 적용. v2.1.154부터 버그는 안 찾음(버그는 `/code-review`). 이전 버전은 `/code-review --fix`와 동일 |
| `/skills` | 빌트인 | 사용 가능 스킬 목록(`t` 토큰순 정렬, `Space`로 숨김) |
| `/stats` | 빌트인 | `/usage` 별칭(Stats 탭으로 열림) |
| `/status` | 빌트인 | 설정 인터페이스(Status 탭)—버전·모델·계정·연결 상태 |
| `/statusline` | 빌트인 | 상태줄 구성(설명하면 자동 구성) |
| `/stickers` | 빌트인 | Claude Code 스티커 주문 |
| `/stop` | 빌트인 | 현재 백그라운드 세션 중지(attach 상태에서만). 분리만 하려면 `/exit` |

## T

| 명령 | 종류 | 기능 |
|------|------|------|
| `/tasks` | 빌트인 | 백그라운드 실행 항목 보기·관리. **별칭 `/bashes`** |
| `/team-onboarding` | 빌트인 | 최근 30일 사용 이력으로 팀 온보딩 가이드 생성 |
| `/teleport` | 빌트인 | 웹 세션을 현재 터미널로 가져오기(브랜치+대화). **별칭 `/tp`**. 구독 필요 |
| `/terminal-setup` | 빌트인 | Shift+Enter 등 터미널 키바인딩 구성(VS Code/Cursor/Zed 등에서만 표시) |
| `/theme` | 빌트인 | 컬러 테마 변경(auto·라이트·다크·색맹 접근성·ANSI·커스텀) |
| `/tui [default\|fullscreen]` | 빌트인 | 터미널 UI 렌더러 설정·재기동. `fullscreen`은 깜빡임 없는 alt-screen 렌더러 |

## U

| 명령 | 종류 | 기능 |
|------|------|------|
| `/ultraplan <prompt>` | 빌트인 | ultraplan 세션에서 계획 초안→브라우저 검토→원격 실행 또는 터미널로 회신 |
| `/ultrareview [PR]` | 빌트인 | 클라우드 샌드박스 멀티에이전트 심층 리뷰. 권장 호출은 `/code-review ultra`(이건 별칭). Pro·Max 무료 3회 |
| `/upgrade` | 빌트인 | 상위 요금제 전환 페이지 열기 |
| `/usage` | 빌트인 | 세션 비용·요금제 한도·활동 통계. **별칭 `/cost`, `/stats`** |
| `/usage-credits` | 빌트인 | 한도 도달 시 작업 지속용 사용 크레딧 구성(이전 `/extra-usage`) |

## V

| 명령 | 종류 | 기능 |
|------|------|------|
| `/verify` | [Skill] | 앱을 빌드·실행·관찰해 변경이 의도대로 동작하는지 확인. v2.1.145+ |
| `/voice [hold\|tap\|off]` | 빌트인 | 음성 받아쓰기 토글. Claude.ai 계정 필요 |

> ⚠️ `/vim`은 **v2.1.92에서 제거**됨 (하단 참조)

## W

| 명령 | 종류 | 기능 |
|------|------|------|
| `/web-setup` | 빌트인 | 로컬 `gh` CLI 자격으로 GitHub 계정을 Claude Code on the web에 연결 |
| `/workflows` | 빌트인 | 워크플로 진행 뷰(실행 감시·일시정지·재개·저장) |

---

## 제거된 명령 (참고)

| 명령 | 상태 | 대체 |
|------|------|------|
| `/pr-comments [PR]` | v2.1.91에서 제거 | Claude에게 직접 "PR 코멘트 보여줘"라고 요청 |
| `/vim` | v2.1.92에서 제거 | `/config` → Editor mode에서 Vim/Normal 전환 |

## MCP 프롬프트 (동적)

연결된 MCP 서버가 노출하는 프롬프트는 `/mcp__<server>__<prompt>` 형식으로 명령처럼 나타납니다. 서버 연결 상태에 따라 동적으로 발견됩니다.

---

## [검증 노트]

| 항목 | 상태 | 근거 |
|------|------|------|
| 전체 명령 목록·기능·별칭·인자 | ✅ 확인됨 | 공식 문서 본문 그대로 정리 |
| `add-dir`/`agents`/`autofix-pr`/`background`/`simplify` 존재 | ✅ 확인됨 | 공식 목록에 모두 포함 |
| `advisor` | ⚠️ 미확인 | **공식 목록에 없음.** 커스텀 명령/플러그인 가능성 — 별도 확인 필요 |
| 버전 의존 명령(`/fork` v2.1.161, `/simplify`·`/code-review` v2.1.154, `/reload-skills` v2.1.152, `/run`·`/verify` v2.1.145 등) | ✅ 확인됨 | 공식 문서의 min/max-version 주석 반영 |
| 제거 명령(`/pr-comments` v2.1.91, `/vim` v2.1.92) | ✅ 확인됨 | 공식 문서 표기 |

**할루시네이션 점검**: 모든 명령·인자·별칭·기능 설명은 공식 문서 `code.claude.com/docs/en/commands` 본문과 1:1 대조했습니다. 블로그·커뮤니티에서 떠도는 `/godmode`·`/ghost`·`BEASTMODE` 등 "프롬프트 코드"는 **빌트인 슬래시 커맨드가 아니므로 제외**했습니다.

> ⚠️ 녹화 직전 재확인 권장: Claude Code는 월 수 차례 릴리스됩니다. 명령 목록은 **세션에서 `/` 또는 `/help`** 로 본인 버전 기준 실제 목록을 한 번 더 확인하세요. (표시되는 명령은 플랫폼·요금제·환경에 따라 다름)

**참고 1차 출처 (링크 정상 확인)**
- 슬래시 커맨드 전체: https://code.claude.com/docs/en/commands
- 스킬(커스텀 명령 작성): https://code.claude.com/docs/en/skills
- 인터랙티브 모드/단축키: https://code.claude.com/docs/en/interactive-mode
