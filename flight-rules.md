# flight-rules — web 프로젝트 제약

> carve가 생성. 금지/필수 규칙. 검증 훅이 결정적으로 강제한다(PreToolUse exit code 2).
> 행동 원칙(단순함·외과적 변경·TDD·응답 제어 등)과 스택별 규칙은 `carve init-claude`가 만든
> `.claude/CLAUDE.md` 베이스라인 + `.claude/rules/*`가 표준이다. 여기서는 중복하지 않고 하네스 강제만 둔다.

## 금지 (MUST NOT)
- 파괴적 명령(`rm -rf /`·포크밤·디스크 파괴 등) — `carve-block-destructive` 훅이 exit 2로 차단.
- 비밀 파일(`.env`·키·credentials) 접근 — `carve-protect-secrets` 훅이 차단.
- `any` 타입 금지 — 명시적 타입을 쓴다.

## 필수 (MUST)
- 커밋 전 린트 통과: `(린터 미탐지)`
- 푸시 전 테스트 통과: `npm run test`

## 토큰 효율 (MUST)
- 코드 탐색·구조 파악은 **codesight MCP**(`codesight_get_*`)·`.codesight/`를 우선한다.
- 참조/정의/타입 확인은 **LSP**(`findReferences`/`getDiagnostics`)를 우선한다.
- grep·전체 파일 읽기는 위로 안 되는 것만 보조로 쓴다(토큰 효율).

## 시각·문서 산출물 (anti-ai-slop)
- HTML·SVG·카드뉴스·리포트·슬라이드·문서 생성 시 anti-ai-slop 표준을 준수한다.
- 금지: 그라데이션·글로우/컬러 그림자·글래스모피즘·모션 장식·워터마크·마케팅 보일러플레이트.
- 위계는 크기·굵기·여백·정렬·타이포로. `carve-anti-slop` 훅이 `check-slop.mjs`로 경고한다(차단 아님, 예외경로 존재).

