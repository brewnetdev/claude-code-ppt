# evaluation-criteria — web 프로젝트

> carve가 생성. "좋은 결과"를 주관에 두지 않는다. 측정 가능 항목으로.

## MUST PASS (★★★)
- [ ] 빌드/타입체크 통과
- [ ] 테스트 통과: `npm run test`
- [ ] 비밀 노출·파괴적 명령 위반 0건 (검증 훅 통과)

## SHOULD PASS (★★)
- [ ] 린트 통과: `(린터 미탐지)`
- [ ] 변경이 기존 기능을 깨지 않음 (회귀 테스트)
- [ ] 생성 HTML/SVG/문서 `check-slop` 0 ERROR
