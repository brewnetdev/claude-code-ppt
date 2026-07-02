# AI 방법론(L2·L3) · 프롬프트/스킬(L4) 삽입 이미지 — 페이지 매핑

> 파일 위치: AI 방법론(신규 LEVEL 2 ① + LEVEL 3 ②) → `docs/images/level2/` (공유) · 프롬프트·스킬(신규 LEVEL 4) → `docs/images/level4/`
>
> ⚠️ 커리큘럼 재번호 반영: 옛 LEVEL 2가 L2(협업 원칙)·L3(방법론·구조·실습)로 분할, 옛 LEVEL 3(프롬프트·스킬)은 L4로 이동.

## LEVEL 2 ① 협업 원칙 + LEVEL 3 ② 방법론·구조·실습 — AI 시대 개발 방법론 (`level2/`, 32종)
> p4~p32대(2.1~2.4)=신규 L2 · p34~(2.5~)=신규 L3

| 제목 | 페이지 | 이미지 |
|---|---|---|
| 설계 없는 개발 — 재작업 사이클 | p4–5 | `rework-cycle.png` |
| 명세 없는 요청 vs 명세 있는 요청 | p6 | `spec-vs-nospec.png` |
| Taste — 작동하는 코드 vs 좋은 코드 | p9–10 | `taste-good-vs-working.png` |
| AI 출력의 비결정적 특성 | p11 | `non-deterministic.png` |
| 한 번에 너무 많이 vs 단계별 분해 | p13–14 | `task-breakdown.png` |
| 작업 분해의 기준과 점진적 설계 | p15–16 | `task-decomposition.png` |
| 다중 AI 에이전트 활용 워크플로 | p17–18 | `multi-agent-workflow.png` |
| 명확한 지시의 5요소 | p20 | `clear-instruction-5.png` |
| 나쁜 완료 조건 vs 좋은 완료 조건 | p24 | `completion-conditions.png` |
| 리뷰에 유용한 슬래시 커맨드 | p28 | `review-slash-commands.png` |
| 커밋 메시지 prefix 규칙 | p32 | `commit-prefix.png` |
| /init 으로 CLAUDE.md 자동 생성 | p34–35 | `init-claude-md.png` |
| CLAUDE.md 파일 위치별 공유 범위 | p36 | `claude-md-scope.png` |
| .claude/rules/ 경로 기반 자동 컨텍스트 주입 | p37 | `rules-path-injection.png` |
| Glob 패턴 기본 문법 | p38 | `glob-patterns.png` |
| Kent Beck 증강코딩 + 경고 3신호 | p39–40 | `augmented-coding.png` |
| Make it work · right · fast | p41 | `make-work-right-fast.png` |
| Small Safe Steps — 좋은 예 vs 나쁜 예 | p42 | `small-safe-steps.png` |
| TDD 사이클 (Red→Green→Refactor) | p43–48 | `tdd-cycle.png` |
| AI가 TDD를 무시하는 이유 + 강제 규칙 | p43–45 | `tdd-enforce.png` |
| Hook을 활용한 자동 테스트 실행 | p49 | `hook-auto-test.png` |
| 명세 역할을 하는 테스트 | p51 | `test-as-spec.png` |
| SDD · SpecKit 슬래시 커맨드 체인 | p52–54 | `speckit-chain.png` |
| SDD 적용 — 좋은 요청 vs 나쁜 요청 | p56 | `spec-applied.png` |
| SDD를 사용 / 건너뛰는 상황 | p58 | `sdd-when.png` |
| 프로젝트 파일별 역할 요약 | p60 | `file-roles.png` |
| AGENTS.md 표준 문서 | p61 | `agents-md.png` |
| Git 브랜치 전략 | p62 | `branch-strategy.png` |
| 린트 · 포맷터 · Hook 자동화 | p63–65 | `eslint-prettier-hook.png` |
| 32가지 핵심 UI 컴포넌트 카탈로그 | p67 | `ui-catalog-32.png` |
| 실습 워크플로 6단계 | p68 | `practice-workflow-6.png` |
| LEVEL 2 핵심 요약 | p69 | `level2-summary.png` |

## LEVEL 4 — 프롬프트·컨텍스트 & 스킬·커맨드·Hook (`level4/`, 38종)

| 제목 | 페이지 | 이미지 |
|---|---|---|
| 프롬프트 vs 컨텍스트 엔지니어링 | p4 | `prompt-vs-context.png` |
| 패러다임 이동 Prompt→Context→Harness | p5 | `paradigm-shift.png` |
| Context Rot 현상 + 대응 6원칙 | p6–7 | `context-rot.png` |
| /context 200K vs 1M + 사용률 구간 전략 | p8–9 | `usage-strategy.png` |
| 프롬프팅 기법 6선 + 선택 가이드 | p10–11 | `prompting-techniques.png` |
| 적시 컨텍스트(JIT) + .claudeignore | p16 | `jit-claudeignore.png` |
| 컨텍스트 엔지니어링 워크플로 (명령 시퀀스) | p18 | `context-eng-workflow.png` |
| 4대 컨텍스트 실행 전략 | p19 | `context-exec-4.png` |
| effort 파라미터 (통합 다이얼) | p20 | `effort-dial.png` |
| CLAUDE.md 4계층과 로딩 규칙 | p22 | `claude-md-hierarchy.png` |
| CLAUDE.md 작성법 — 나쁜 예 vs 좋은 예 | p23–24 | `claude-md-good-bad.png` |
| 코딩 컨벤션 코드화 (검증 가능한 규칙) | p25 | `coding-convention-code.png` |
| paths Glob 패턴 | p26–27 | `paths-glob.png` |
| @path 임포트 (필요할 때 끌어오는 컨텍스트) | p28 | `import-context.png` |
| AGENTS.md 도구 중립 메모리 표준 | p29–30 | `agents-md.png` |
| 메모리 시스템 — # 단축키와 /memory | p31 | `memory-shortcut.png` |
| 슬래시 커맨드 (기본 · 워크플로) | p33–35 | `slash-commands.png` |
| 토큰 효율 5단계 실전 조합 | p36 | `token-efficiency-5.png` |
| 커스텀 커맨드 + $ARGUMENTS | p37–38 | `custom-command.png` |
| 실전 명령어 조합 패턴 | p39 | `command-combo.png` |
| Agent Skill 자가 호출 + 기본 구조 | p41–42 | `agent-skill.png` |
| Skill 작업 유형 + 확인 3가지 방법 | p44–45 | `skill-types.png` |
| Reference Skill vs Action Skill | p46–49 | `reference-vs-action-skill.png` |
| 공식 · 번들 · 마켓플레이스 Skill 카탈로그 | p50–52 | `skill-catalog.png` |
| Skill 활성화 · 비활성화 (토큰 절약) | p53 | `skill-activation.png` |
| 커스텀 Skill 디렉터리 + 팀 배포 | p54 | `custom-skill-deploy.png` |
| Hook 8개 이벤트 | p56–57 | `hook-events-8.png` |
| PreCompact + SessionStart 핸드오프 | p59 | `handoff-precompact.png` |
| Hook stdin JSON 페이로드 | p60 | `hook-stdin-json.png` |
| 알림 Hook (mac · Slack · settings.json) | p61–63 | `notification-hook.png` |
| 가드레일 Hook 모음 | p64–72 | `guardrails.png` |
| Hook 주의사항 · 디버깅 | p73 | `hook-debugging.png` |
| MCP Transport — http vs stdio | p75–76 | `mcp-transport.png` |
| [실습] 프로젝트 컨벤션을 Skill로 캡슐화 | p82 | `practice-skill.png` |
| [실습] 팀 코드리뷰 룰을 슬래시 커맨드로 | p83 | `practice-command.png` |
| [실습] 커스텀 Skill · Hook 패키지 | p84 | `practice-hook-package.png` |
| LEVEL 3 핵심 요약 ① (컨텍스트·CLAUDE.md·커맨드) | p85 | `level3-summary-1.png` |
| LEVEL 3 핵심 요약 ② (Skill·Hook·MCP·실습) | p86 | `level3-summary-2.png` |
