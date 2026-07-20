# Harness Engineering 슬라이드 덱

`harness-evaluator.pptx`를 HTML 덱으로 변환한 산출물. 정본 내용은 `../md/`, 디자인 시스템은 `../design-system/`(Dracula). 모든 다이어그램은 `deck.html` 안에 **인라인 SVG**로 내장(벡터 → 어떤 크기에서도 텍스트 선명).

## 구성

| 파일 | 내용 |
|---|---|
| `deck.html` | 59슬라이드 단일 덱 (16:9, scroll-snap + 화살표 네비게이션, 30개 인라인 SVG 다이어그램 포함) |
| `deck.css` | Dracula 디자인시스템 토큰, 고정 1280×720 캔버스 + JS fit-scale |

## 보는 법

- **화면**: `deck.html`을 브라우저로 연다. 화살표(←/→·↑/↓)·PageUp/Down·Space로 이동, Home/End로 처음/끝. 우하단에 슬라이드 카운터. 페이지 번호는 DOM 순서로 JS 자동 채움(슬라이드 추가·분할 시 재넘버링 불필요).
- **PDF/인쇄**: `@media print`로 슬라이드당 1페이지(1280×720). 예:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless --no-pdf-header-footer --print-to-pdf=deck.pdf "file://$PWD/deck.html"
  ```

## 디자인 규칙 (적용 완료)

- **2색 템플릿**: 표지·아젠다·5섹션·결론·Q&A·감사 10장 = Dracula 다크, 컨텐츠 = 라이트.
- **타입 스케일(전 페이지 균등)**: 대타이틀 44px / 중타이틀 30px / 소타이틀 22px / 본문 20px / 부연·캡션·표 18px / 코드 16px. (섹션 번호 120px는 장식 그래픽.)
- **다이어그램 = 인라인 SVG**: 30개 전부 벡터 SVG로 재작성. 내부 텍스트 18~40px로 크게(박스에 꽉 차게). 라이트 팔레트(결론 1장만 다크)라 슬라이드와 한 몸으로 통합 — 이전 래스터 PNG의 작은 내부 텍스트·다크 카드 문제 해소. 밀집 다이어그램(A/B 매트릭스·값을 하는 지점)은 **설명 페이지 + 풀페이지 도해 페이지**로 2분할.
- **오버플로 관리**: 자동 측정(headless 렌더 canvas scrollHeight 대조) 결과 전 59슬라이드 오버플로 0.
- **anti-ai-slop**: 그라데이션·글로우·장식 모션·워터마크 없음(HTML·CSS·SVG 전부). 무채색 + 퍼플 액센트 1색 + 의미색(danger/success/warning). 위계는 크기·굵기·여백으로.
- **용어**: (1) 첫 등장 어려운 용어에 풀네임+뜻 (CoT·RAG·MCP·LOC·E2E·CI·DTO·BGPD·pp·SME·κ·EDD·vLLM·SC·recall·컴팩션·핸드오프·drift·ArchUnit·Checkstyle·Flyway·LSP·GSD·카나리·pass@100 등). (2) 확립된 영어 용어의 한글 번역은 원어로 표기 — 원본 md/html 기준: **LLM-as-Judge**(구 "LLM 판사"), **Judge**(구 판사/판정기/심판), **Generator**(구 생성자/생성기), **Evaluator**(구 검증자). ‘평가자 간 일치도’(inter-rater)는 통계 표준어라 유지.

## 검증 (carve-verify-loop 독립 게이트)

생성/검증 분리 원칙에 따라 독립 Evaluator 6인(챕터 5 + 전역 1)이 8규칙을 0~100 적대적 채점. 3회 반복으로 실결함(성숙도 넘버링 모순·표 헤더 12px·미주석 용어)을 잡아 수정(65 → 83 → 85). 이후 사용자 피드백 2건 반영:

1. **스케일 상향** — 폰트 ~1.3×, 이미지 컬럼 +40%, 화면 풀 사용. 오버플로는 표 패딩·소폭 트림으로 해소(전 슬라이드 0).
2. **다이어그램 SVG 재작성** — 30개 벡터화(위 참조). 게이트가 지적했던 R2(이미지 내부 텍스트 가독)·R7(톤 채움)·R8(다크 카드) 잔여 항목이 이 단계에서 **근본 해결**됨: 큰 벡터 텍스트, 그라데이션 0, 라이트 팔레트.

> 재현: 스케일·용어·SVG 변경 후에도 anti-slop·오버플로·용어 전수검사를 headless 렌더 + grep으로 재확인.

## 발표 리비전 (2026-07-17)

사용자 피드백 반영: 밀집 슬라이드 삭제(OS 비유·값 지점 도해·Judge 교정), 일부 슬라이드 풀이미지+하단설명 재구성(패러다임·등식·핸드북), 좌우 비율 조정(Agent Loop 5:5·CLAUDE.md 7:3·PLAN.md 6:4·안티패턴 5:5), 3기둥 도해 정렬·하단 띠 삭제, A/B 매트릭스 단순화, specloop → **Evaluator Driven 평가 게이트** 개칭, 결론 메시지 교체("엔진이 어떻게 바뀌든 차량[하네스+Evaluator]을 고치고 능숙하게 운전하라"), Q&A·감사 슬라이드 추가. 전 59슬라이드 오버플로 0.
