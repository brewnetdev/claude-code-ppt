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

## 슬라이드 덱 편집 — 에디터 캐시 주의 (반복 사고 방지)
이 저장소는 **슬라이드 에디터 앱**이다. `docs/html/...`의 덱 HTML을 직접 수정해도 **에디터 화면에는 자동 반영되지 않는다.**
- 에디터는 덱을 **localStorage/IndexedDB에 캐시**하고, 다시 열 때 **캐시본을 소스보다 우선** 로드한다(`src/App.tsx` `loadDeckFromLocalStorage`). 한 번 연 덱은 디스크 HTML을 고쳐도 옛 버전이 계속 보인다.
- "원본 갱신" 배너는 HTML의 `<meta name="deck-source-hash">` 로만 감지한다(`src/library/deckRegistry.ts`). **이 meta가 없는 덱은 배너가 아예 안 뜬다.**
- **소스 HTML 수정 후 반영 절차** ↓ (셋 다 챙길 것)
  1. **에디터에 반영** — 툴바의 **Reset** 버튼(“편집 내역을 지우고 원본으로 리셋”)을 눌러 캐시를 비우고 소스를 다시 파싱한다. ⚠️ 에디터에서 직접 한 편집은 사라진다.
  2. **dev 서버면** 브라우저 새로고침으로 Vite(`import.meta.glob`)가 바뀐 HTML을 다시 읽게 한 뒤 Reset. **빌드본이면** 재빌드/재시작이 필요하다.
  3. **웹 뷰어(`docs/html-export/...`)는 별도 산출물** — 소스 수정 후 `export-html-deck` 스킬(`node .claude/skills/export-html-deck/scripts/export-deck.js`)로 **다시 빌드**해야 갱신된다.
- 덱 슬라이드 추가·수정 시 사용자에게 위 1~3 중 어디서 보는지 먼저 확인하고, 해당 경로를 함께 안내한다.

자세한 규칙: `flight-rules.md` · 품질 기준: `evaluation-criteria.md`
