# html-ppt-pro — 레이아웃 아키타입 카탈로그

템플릿(`assets/template.html`)의 CSS 클래스만으로 조립한다. 새 CSS는 테마 토큰
(`var(--…)`)만 사용 — 리터럴 색상 하드코딩 금지. 슬라이드당 아이디어 1개,
불릿 최대 5개(`.claude/skills/html-presentation.md` 전역 규칙 적용).

| # | 아키타입 | 언제 | 핵심 클래스 |
|---|---|---|---|
| A | 표지 | 첫 장 | `.slide.cover` + `.cover-art` |
| B | 목차/아젠다 | 2번째 장 | `.grid.g2` + 번호 카드 |
| C | 섹션 디바이더 | 챕터 전환 | `.slide.section` + `.sec-num` |
| D | 카드 패널 | 개념 2~4개 병렬 | `.grid.g2/g3/g4` + `.card` |
| E | KPI 그리드 | 수치 3~4개 | `.grid.g4` + `.kpi` |
| F | 막대 차트 | 항목별 크기 비교 | `.bars` |
| G | 도넛/게이지 | 비율 1~2개 | `.donut` (SVG) |
| H | A vs B 비교 | 두 값 대비 강조 | `.vs` + `.side.win` |
| I | 로드맵 Phase | 단계 흐름 | `.phases` + `.phase-arrow` |
| J | 실행 과제 카드 | 과제 N개 + 아이콘 | `.grid.g4` + `.card` + 라인 아이콘 |
| K | 협업 체계도 | 원형 노드 관계 | 인라인 SVG (아래 레시피) |
| L | 표 | 정밀 수치 나열 | `table` + `td.num` |
| M | 콜아웃 밴드 | 장 하단 핵심 주장 | `.callout-band` |
| N | 마무리 | 마지막 장 | `.slide.section` 변형 |

공통: 본문 콘텐츠는 `.slide-body`(flex:1 + 수직 중앙)에 넣는다 — 하단 여백
과다 방지가 이 래퍼 하나로 해결된다. 밖에 두면 콘텐츠가 위로 붙는다.

---

## F. 막대 차트 — CSS flat bar (Chart.js 금지)

높이는 값에 비례한 `height:N%` 인라인. 강조 항목만 `.is-key`(포인트 블루).

```html
<div class="bars">
  <div class="bar"><b>52%</b><i style="height:52%"></i><span>2023</span></div>
  <div class="bar"><b>61%</b><i style="height:61%"></i><span>2024</span></div>
  <div class="bar is-key"><b>68%</b><i style="height:68%"></i><span>2025</span></div>
</div>
```

주의: `.bar`가 `flex-direction:column; justify-content:flex-end`라 `b`(값
라벨)를 `i`보다 먼저 써야 막대 위에 얹힌다.

## G. 도넛 / 원형 게이지 — SVG `pathLength="100"`

원둘레 계산 불필요: `pathLength="100"`이면 `stroke-dasharray="값 100"`이 곧
퍼센트다. 로드 애니메이션 없음(결정적 렌더 — 스크린샷 검증 가능).

```html
<div class="donut">
  <svg width="150" height="150" viewBox="0 0 150 150">
    <circle class="track" cx="75" cy="75" r="60" fill="none" stroke-width="16"/>
    <circle class="val" cx="75" cy="75" r="60" fill="none" stroke-width="16"
            pathLength="100" stroke-dasharray="68 100" stroke-linecap="butt"
            transform="rotate(-90 75 75)"/>
    <text class="num" x="75" y="84" text-anchor="middle">68%</text>
  </svg>
  <p class="chart-caption">중앙행정기관 도입률<br>68% (2025 상반기)</p>
</div>
```

반원 게이지: `circle` 대신 `path d="M 20 80 A 60 60 0 0 1 140 80"`(위쪽 반원)
에 같은 `pathLength="100"` 트릭. track용 path 1개 + val용 path 1개.

## H. A vs B 비교 — 강조 측만 포인트 블루

"중앙행정기관 68% vs 지자체 41%" 류. 이기는 쪽 `.win`(블루 보더+블루 숫자),
지는 쪽은 네이비 숫자. 색이 곧 위계 — 다른 장식 불필요.

```html
<div class="vs">
  <div class="side win"><p class="who">중앙행정기관</p><p class="num">68%</p></div>
  <div class="mid">VS</div>
  <div class="side"><p class="who">지방자치단체</p><p class="num">41%</p></div>
</div>
```

## I. 로드맵 Phase 1→3

```html
<div class="phases">
  <div class="phase"><p class="tag">PHASE 1</p><h4>기반 구축</h4>
    <ul><li>항목</li><li>항목</li></ul></div>
  <div class="phase-arrow">→</div>
  <div class="phase"><p class="tag">PHASE 2</p><h4>확산</h4>
    <ul><li>항목</li></ul></div>
  <div class="phase-arrow">→</div>
  <div class="phase"><p class="tag">PHASE 3</p><h4>정착</h4>
    <ul><li>항목</li></ul></div>
</div>
```

Phase 4개면 `.phases`를 `grid-template-columns:1fr 28px 1fr 28px 1fr 28px 1fr`
로 인라인 오버라이드.

## J. 실행 과제 카드 — 라인 아이콘

아이콘은 이모지 금지, 24×24 인라인 SVG stroke 아이콘(선 1.8px, `stroke=
"var(--blue)"` 불가 — SVG 속성은 `#1890FF` 직접, 단 CSS `stroke` 프로퍼티로
주면 토큰 사용 가능). 예:

```html
<div class="card">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
       style="stroke:var(--blue);stroke-width:1.8;margin-bottom:12px">
    <rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/>
  </svg>
  <h3>01 · 과제명</h3><p>한 줄 설명</p>
</div>
```

## K. 협업 체계도 — 원형 노드 SVG

중심 노드 1 + 주변 노드 N을 SVG로. 선 먼저, 노드 나중(겹침 순서).
텍스트는 12~14px, 노드 밖으로 넘치면 노드 지름을 키우지 말고 텍스트를 줄인다.

```html
<svg width="560" height="330" viewBox="0 0 560 330" style="margin:0 auto">
  <line x1="280" y1="165" x2="120" y2="70"  stroke="#B6C2D2"/>
  <line x1="280" y1="165" x2="440" y2="70"  stroke="#B6C2D2"/>
  <line x1="280" y1="165" x2="120" y2="260" stroke="#B6C2D2"/>
  <line x1="280" y1="165" x2="440" y2="260" stroke="#B6C2D2"/>
  <circle cx="280" cy="165" r="58" fill="#0A2540"/>
  <text x="280" y="170" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">주관기관</text>
  <circle cx="120" cy="70" r="44" fill="#fff" stroke="#1890FF" stroke-width="1.5"/>
  <text x="120" y="75" text-anchor="middle" fill="#0A2540" font-size="12.5">참여기관 A</text>
  <!-- 나머지 노드 반복 -->
</svg>
```

## M. 콜아웃 밴드

장의 결론 한 문장. **주장 + 근거 수치** 형식, 느낌표 금지. 슬라이드당 최대 1개.

```html
<div class="callout-band">도입률 격차 27%p — 지자체 지원 없이는
  <strong>2027 목표(전 기관 80%) 달성 불가</strong></div>
```

---

## 도해 일반 규칙

- 도해는 이미지(PNG) 금지 — HTML 박스/인라인 SVG로 그린다(수정 가능성·선명도).
- 3D 효과 금지(브리프에 "3D/플랫"이 있어도 플랫만 — anti-ai-slop 우선).
- SVG 내 한글 텍스트는 브라우저 렌더라 폰트 걱정 없음(cairosvg 아님).
- 색 의미 고정: 네이비=기준/전체, 블루=강조/우리, 회색=비교군/비활성.
