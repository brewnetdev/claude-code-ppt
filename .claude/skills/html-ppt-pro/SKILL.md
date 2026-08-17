---
name: html-ppt-pro
description: >
  토큰 테마 기반 라이트 톤 독립 실행 HTML 프레젠테이션(16:9, 1280×720
  scale-to-fit)을 제작한다. 기본 테마는 navy-clinical(연블루그레이 배경
  #F4F6F9 + 딥네이비 #0A2540 + 포인트블루 #1890FF) — 의료·공공·정책·기업
  보고 덱에 적합. 모듈형 카드 패널, CSS/SVG 플랫 차트(막대·도넛·게이지),
  A vs B 비교 강조, Phase 로드맵, 협업 체계도 아키타입 내장. Use when the
  user says "HTML PPT", "발표자료 HTML로", "16:9 슬라이드", "네이비 테마
  덱", "보고서 프레젠테이션", "라이트/밝은 슬라이드 덱", "의료/공공 스타일
  발표자료", or asks to turn a document into a light-toned business
  presentation. 다크 L9 스타일 덱은 slide-rule, 에디터(report 템플릿) 덱은
  md-to-slidedeck 담당 — 이 스킬은 라이트 톤 독립 HTML 전용.
---

# HTML-PPT-PRO — 토큰 테마 기반 16:9 독립 슬라이드 덱

산출물: 브라우저에서 바로 여는 단일 HTML. 1280×720 고정 스테이지가 화면
중앙에서 비율 유지 확대·축소(`scale(min(w/1280, h/720))`), 방향키 내비,
자동 페이지 번호, 인쇄=PDF(`@page 1280px 720px`). **에디터 스캔 폴더
(docs/html/{presentation,portfolio,report,harness}/) 밖에 저장** — docs/html/
루트에 둔다(에디터 파서가 인라인 스타일을 파괴).

구조는 lewislulu/html-ppt-skill의 "base 프리미티브 + 테마 토큰 오버라이드 +
레이아웃 카탈로그"를 이식하되, anti-ai-slop과 충돌하는 것(그라데이션 테마,
Chart.js, 캔버스 FX, 진입 애니메이션, 프레젠터 모드)은 배제한 단일 파일판.

## 절차

1. **콘텐츠 구조화** — 원고에서 챕터·장표 후보를 뽑는다. 표준 골격:
   표지 → 목차 → (섹션 디바이더 → 본문 2~4장)×N → 마무리.
   같은 아키타입 2연속 금지. 슬라이드당 아이디어 1개, 불릿 최대 5개.
2. **테마 선택** — `references/THEMES.md`. 기본 navy-clinical.
   콘텐츠 톤과 안 맞으면 대안 1개를 근거와 함께 제시하고 진행.
3. **스켈레톤 복사** — `assets/template.html`을 산출 경로로 복사, `{{…}}`
   치환. 컴포넌트 CSS는 토큰만 참조하므로 **새 색상 하드코딩 금지**.
4. **슬라이드 조립** — `references/LAYOUTS.md` 아키타입(A~N)에서 골라
   채운다. 차트는 Chart.js 등 외부 JS 금지 — CSS 막대·SVG
   `pathLength="100"` 도넛/게이지 레시피 사용(결정적 렌더).
5. **검증 게이트** (둘 다 통과할 때까지):
   ```bash
   node .claude/skills/slide-rule/scripts/verify.mjs <deck.html> --shots /tmp/shots 1,2
   node .claude/skills/clean-html/scripts/check-slop.mjs <deck.html>
   ```
   verify.mjs는 `.slide` 셀렉터 기반이라 이 템플릿에 그대로 작동한다
   (하단 660px 침범 + 가로 넘침 심층 검사). 넘침은 tight→여백→폰트→분할
   순으로 해소.
6. **육안 확인** — 표지·차트 장·비교 장 스크린샷을 직접 본다.

## 브리프 수용 정책 (사용자 디자인 요구 vs 하네스 게이트)

- "3D 그래프" 요청 → **플랫만** 제작 (anti-ai-slop 우선, 한 줄 고지).
- "표지 모션" 요청 → 기본은 **정적 기하 SVG**(템플릿 내장 동심원+노드).
  사용자가 재차 명시 요구할 때만 keyframes 추가하되, check-slop ERROR
  1건(keyframes)이 남는다는 것을 고지하고 예외로 기록한다.
- "그라데이션" 요청 → 단색 대체안 제시 (게이트가 차단하므로 협상 불가).

## 진입 모션 (opt-in — 사용자 명시 요청 시에만, L9 Navy Edition 실전 검증)

사용자가 애니메이션을 명시 요청하면 아래 레시피를 그대로 쓴다. 임의 변형 금지.

```css
@media (prefers-reduced-motion: no-preference){
  @keyframes rise{from{opacity:0;transform:translateY(16px)}}  /* to 없음! */
  .slide.on .kicker{animation:rise .38s ease backwards}
  .slide.on h1,.slide.on h2{animation:rise .45s ease .06s backwards}
  .slide.on .sub{animation:rise .5s ease .16s backwards}
  .slide.on li{animation:rise .42s ease .1s backwards}
  /* li:nth-child(2~5) delay .17/.24/.31/.38s, n+6은 .45s 고정 */
  .slide.on :where(table,pre,.dg,.frame,.cols,.big,img){animation:rise .55s ease .12s backwards}
  .slide.on .key{animation:rise .5s ease .3s backwards}   /* 콜아웃은 마지막 */
}
```

핵심 규율 4가지:
1. **keyframes는 `from`만 정의** — 종료값이 각 요소의 원래 스타일로 보간되므로
   ghost(반투명 placeholder) 패턴·개별 opacity를 깨지 않는다. `to{opacity:1}`을
   쓰면 fill 모드가 ghost를 불투명하게 박제한다.
2. **자동 캡처 가드 필수** — Playwright가 애니메이션 중간(반투명)을 찍어
   "색이 회색" 오진을 만든다. 런타임에 `if(navigator.webdriver)
   document.documentElement.classList.add('no-anim')` + CSS
   `html.no-anim *{animation:none!important;transition:none!important}`.
3. **스코프 게이트** — 모션은 재생 컨텍스트(활성 슬라이드 `.slide.on`, 또는 발표
   전용 조상 속성)에 가둔다. 정적 렌더 경로(인쇄·export·편집 캔버스)에 새면 안
   된다. `@media print`에 `*{animation:none!important}` 포함.
4. **transition 표기** — check-slop 파서가 `.15s`를 15s로 오독한다. 항상
   `0.15s`처럼 0을 붙여 쓰고 150ms 이하로 유지.

고지 의무: 이 블록을 넣으면 check-slop ERROR 1건(keyframes)이 잔존한다 —
승인된 예외임을 산출 보고에 명시한다.

## 함정

- **한글 줄바꿈**: `body{word-break:keep-all}`이 템플릿에 있다 — 지우지
  말 것. 단어 중간 끊김 방지가 브리프 필수 요건.
- **하단 여백**: 본문은 반드시 `.slide-body`(flex:1 + 수직 중앙) 안에.
  밖에 두면 콘텐츠가 위로 붙고 하단이 빈다.
- **막대 차트 마크업 순서**: 값 라벨 `b` → 막대 `i` → 축 라벨 `span`
  (column+flex-end 구조라 순서 바뀌면 막대가 라벨을 밀어낸다).
- **카드 강조**: 상단 액센트 바(`border-top: 3px solid`)는 check-slop이
  차단 — `.is-key`(전체 1px 블루 보더)를 쓴다. 좌측 레일도 금지.
- **SVG 색**: SVG 프리젠테이션 속성(`stroke="…"`)엔 CSS 변수가 안 먹는다
  — `style="stroke:var(--blue)"` 프로퍼티로 주거나 리터럴 헥스를 쓴다
  (도해 SVG 내부만 리터럴 허용).
- **텍스트 색**: `--text-3`(캡션용)을 본문에 쓰지 않는다 — 본문 저대비는
  반려 사유([[deck-text-colors-dark]] 이력).
