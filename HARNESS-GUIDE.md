# HARNESS-GUIDE — carve로 설치된 하네스

## 무엇이 설치됐나
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

## 사용법
- **스킬**: 자연어로 트리거 — "커밋 메시지 만들어", "리뷰해줘", "핸드오프 정리".
- **서브에이전트**: `/squad review`, `/squad qa`, `/squad audit` 등 단일 책임 위임.
- **훅**: 자동 동작(차단·포맷·알림). `.claude/settings.json`에 등록됨.
- **하네스 재구성**: "이 프로젝트에 맞는 하네스 구성해줘" → harness-architect 스킬이 안내.

## anti-slop 보장
HTML·SVG·카드뉴스·리포트·슬라이드·문서 생성 시 AI 슬롭(그라데이션·글로우/컬러 그림자·모션 장식·
워터마크·마케팅 보일러플레이트)을 제거하고, 위계는 크기·여백·정렬·타이포로 만든다.
생성 후 `check-slop.mjs`가 결정적으로 검사한다(경고 모드 — 의도적 사용은 예외경로).

## 안전
- 위험 명령·비밀 파일은 결정적으로 차단된다(exit 2). 우회 금지.
- 생성물은 설치 전 auditor가 secret·과도 권한·훅 주입을 스캔한다.

## 제거
```bash
npx carve-harness uninstall   # 설치 자산 클린 제거 + .bak 복원
```
