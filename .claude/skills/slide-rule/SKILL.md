---
name: slide-rule
description: >
  L9 카피 덱(docs/html/l9-harness-evaluator-slides.html) 스타일의 독립 실행
  프레젠테이션 HTML을 콘텐츠 주입만으로 재생산한다. Dracula-soft 다크 팔레트 ·
  HTML 요소 다이어그램 · 챕터 타이틀 분리 · 점진 완성(ghost) 빌드가 특징.
  Use when the user says "SLIDE-RULE", "슬라이드 룰", "이 스타일로 슬라이드/덱
  만들어", "L9 스타일로", "다크 프레젠테이션 HTML", "독립 실행 슬라이드",
  "하네스 덱 스타일", or asks to convert content(MD·문서·강의안) into a
  standalone dark slide deck. 에디터(report 템플릿) 덱 제작에는 쓰지 않는다 —
  그건 md-to-slidedeck 담당.
---

# SLIDE-RULE — 동일 스타일 독립 슬라이드 덱 제작

산출물: 브라우저에서 바로 여는 단일 HTML (1280×720, 방향키 내비, 자동 페이지
번호, 인쇄=PDF). **에디터 스캔 폴더(docs/html/{presentation,portfolio,report,harness}/)
밖에 저장** — 에디터 파서가 인라인 스타일을 파괴하므로 docs/html/ 루트에 둔다.

## 절차

1. **콘텐츠 수집** — 원고에서 챕터 구조와 장표 후보 목록을 뽑는다.
   챕터마다: 섹션 타이틀 1장 + (권장) 용어표 1장 + 본문. 복잡한 도해·표는
   점진 빌드(A→AB→ABC)로 장 수를 늘려 잡는다.
2. **스켈레톤 복사** — `assets/template.html`을 산출 경로로 복사.
   CSS·JS는 절대 새로 쓰지 않는다(정본과 드리프트 방지). `{{…}}` 치환.
3. **슬라이드 조립** — `references/STYLE-GUIDE.md`의 아키타입(A~L)에서 콘텐츠
   유형에 맞는 마크업을 골라 채운다. 마크업이 헷갈리면 정본
   `docs/html/l9-harness-evaluator-slides.html`의 해당 장을 열어 복사한다.
   핵심 규율 3가지 — ① 챕터 타이틀은 독립 장표 ② 점진 빌드는 ghost
   placeholder + **공개된 요소 픽셀 고정** ③ 도해는 이미지 금지, HTML 박스로.
4. **검증 게이트** (둘 다 통과할 때까지 수정):
   ```bash
   node .claude/skills/slide-rule/scripts/verify.mjs <deck.html> --shots /tmp/shots 1,4
   node .claude/skills/clean-html/scripts/check-slop.mjs <deck.html>
   ```
   verify가 잡은 장은 STYLE-GUIDE §1의 대응 순서(tight→여백→폰트→분할)로 해소.
5. **육안 확인** — 표지·섹션·점진 빌드 최종장·순서도 스크린샷을 직접 본다.
   점진 빌드는 단계 간 같은 박스의 offsetLeft/offsetTop이 동일한지 확인.

## 함정 (실전 이력)

- flex row 가로 넘침은 컨테이너 폭만 재면 안 잡힌다 — verify.mjs가 심층
  자식까지 검사하는 이유. 직접 검사 스크립트를 새로 짜지 말 것.
- Playwright에서 `#N` 해시만 바꾼 goto는 same-document라 스크립트가 재실행
  안 됨 — 장별 스크린샷은 about:blank 경유(verify.mjs `--shots`가 처리).
- 콜아웃 좌측 레일(border-left)·gradient·이모지 불릿은 check-slop이 차단.
  ✓✗△ 판정 기호 warning은 의미 전달이므로 유지.
- 문장은 슬라이드만 읽고 이해돼야 한다 — 발표 구어 수사·압축 은유·어색한
  용어 의역 금지 (STYLE-GUIDE §5.4).
