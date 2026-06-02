# CLAUDE.md — web 프로젝트 하네스

> carve가 설치한 하네스 가이드. 사용법은 `HARNESS-GUIDE.md` 참고.

## 설치된 구성요소
- LSP 인텔리전스 (`lsp`)
- 핸드오프 (`handoff`)
- 메모리 (`memory`)
- 커밋 (`commit`)
- 체인지로그 (`changelog`)
- 리뷰 (`review`)
- PR (`pr`)
- 파괴적 명령 차단 (`block-destructive`)
- 비밀파일 보호 (`protect-secrets`)
- 커밋 전 린트 (`pre-commit-lint`)
- 푸시 전 테스트 (`pre-push-test`)
- 자동 포맷 (`auto-format`)
- Slack 알림 (`slack-notify`)
- PreCompact 핸드오프 (`precompact-handoff`)
- Squad 리뷰 (`squad-review`)
- Squad 플랜 (`squad-plan`)
- Squad 리팩터 (`squad-refactor`)
- Squad QA (`squad-qa`)
- Squad 디버그 (`squad-debug`)
- Squad 문서 (`squad-docs`)
- Squad GitOps (`squad-gitops`)
- Squad 감사 (`squad-audit`)
- Squad 평가자 (`squad-evaluator`)
- Anti-AI-Slop 팩 (`anti-ai-slop`)
- 검증 루프 (`verify`)
- 보안 스캔 (`security-scan`)
- 테스트 생성 (`test-gen`)
- TDD (`tdd`)
- 초압축 모드 (`caveman`)
- 스킬 작성 (`write-a-skill`)
- 시스템 조망 (`zoom-out`)
- 모델 라우팅 (`model-route`)
- 멀티에이전트 병렬 (`parallel-agents`)
- Evaluator 튜닝 (`evaluator-tuning`)
- 하네스 감사 (`harness-audit`)
- 에이전트 조율 (`coordinator`)
- codesight 컨텍스트 (`codesight`)
- 하네스 아키텍트 (`harness-architect`)

## 제약 (결정적 강제 — 권고가 아님)
- 위험 명령(`rm -rf /`·포크밤 등)·비밀 파일(`.env`·키)은 PreToolUse 훅이 **exit 2로 차단**한다.
- 시각·문서 산출물(HTML·SVG·문서)은 **anti-ai-slop** 표준 — `check-slop`이 게이트한다.
- 커밋 전 린트·푸시 전 테스트가 강제된다.

## 토큰 효율 (기본 탑재)
- 코드 탐색·구조 파악은 **codesight MCP**(`codesight_get_*`)·`.codesight/`를 우선한다.
- 참조/정의/타입 확인은 **LSP**(`findReferences`/`getDiagnostics`)를 우선한다.
- grep·전체 파일 읽기는 위로 안 되는 것만 보조로 쓴다(토큰 효율).
codesight·LSP MCP가 `.claude/settings.json`에 등록돼 있다. 모든 스킬·서브에이전트는 이를 우선 사용한다.

## 워크플로
- 스킬: 핸드오프·메모리·커밋·체인지로그·리뷰·PR (자연어로 트리거).
- 깊은 작업은 Squad 서브에이전트(`/squad <member>`)에 위임.

자세한 규칙: `flight-rules.md` · 품질 기준: `evaluation-criteria.md`
