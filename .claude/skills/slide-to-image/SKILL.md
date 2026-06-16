---
name: slide-to-image
description: >
  덱(docs/html/report/claude-code-levelN-chapterN.html)의 특정 슬라이드(텍스트/불릿/표)를
  16:9 다이어그램 PNG로 "이미지화"하고, 리사이즈 가능한 export-overlay 로 그 슬라이드에 임베드한다.
  사용자가 "N페이지 이미지화", "이 슬라이드 이미지로 만들어", "16:9 다이어그램으로", "도식화/인포그래픽화"
  라고 할 때 사용. 기존 level2/level3 다이어그램(rework-cycle·tdd-cycle 등)과 동일한 룩앤필·제작 파이프라인을 강제한다.
---

# slide-to-image — 슬라이드를 16:9 다이어그램으로

슬라이드의 **텍스트 콘텐츠를 정보 위계가 있는 16:9 다이어그램**으로 바꾼다. 결과물은
`docs/images/<level>/<name>.html` → `<name>.png` 로 렌더되고, 덱 슬라이드에 **리사이즈 가능한
오버레이 이미지**로 들어간다. 안티-AI-슬롭 표준(`.claude/rules/anti-ai-slop.md`)을 반드시 지킨다.

## 절차 (4단계)

### 1) 대상 슬라이드 콘텐츠 읽기
덱에서 해당 슬라이드의 `data-slot="label"`(챕터), `data-slot="title"`(제목),
`data-slot="subtitle"`(부제), `data-slot="body"`, `data-slot="bullets"` 텍스트를 추출한다.
페이지 번호 N = 슬라이드 인덱스 N-1 (에디터 네비 "N / 합계" 기준).

### 2) 16:9 다이어그램 HTML 작성 — `docs/images/<level>/<name>.html`
아래 디자인 시스템을 그대로 쓴다. **제목 텍스트는 덱 타이틀바가 담당하므로 다이어그램 안에는
다시 넣지 않는다**(중복 방지). 다이어그램은 본문·불릿을 시각 구조(비교 패널 / 카드 / 플로우 / 표)로 옮긴다.

```css
:root{
  --ink:#1A1A18; --warm:#6B6560; --line:#D4D0C8;
  --teal:#0F766E; --teal-deep:#115E59; --green:#047857; --blue:#1E3A8A; --red:#B91C1C;
  --panel-bg:#FFFFFF; --cream:#FAF3E6;
  --sans:'Noto Sans KR','Inter',sans-serif; --mono:'JetBrains Mono',monospace;
}
/* 폰트 로드: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet"> */
html,body{ background:transparent; } body{ font-family:var(--sans); color:var(--ink); -webkit-font-smoothing:antialiased; }
```

**프레임(가장 중요)**: `.frame { width:1280px; height:<H>px; padding:24px 30px; }`
- 덱 콘텐츠 영역은 16:9 슬라이드에서 타이틀바·푸터를 빼면 **가로로 긴 띠(약 1136 × 524px, 비율 ≈ 2.17:1)** 다.
  슬라이드는 이미지를 **height 제한(약 524px)** 으로 표시하므로 표시 폭 = 524 × (가로/세로비).
- 따라서 **기본 비율을 ≈ 2.17:1 로 맞춘다 → H ≈ 1280/2.17 ≈ 590**(권장 580~600).
  이렇게 하면 콘텐츠 영역 가로폭(~1135px)을 꽉 채워 가장 넓게 표시된다. 비율이 더 정사각(1.8~2.0)이면
  height 제한에 걸려 좌우가 비고 좁아 보인다. 720(16:9)은 절대 쓰지 말 것.
- 콘텐츠가 590 높이에 안 들어가면 → 폰트·패딩·gap 을 줄여 맞춘다(프레임을 키우지 말 것).
- 콘텐츠는 프레임 안에 **하단 여백을 남기고** 들어가야 한다(바닥에 닿으면 "짤린" 것처럼 보임).

**레이아웃 패턴**(콘텐츠 성격에 맞게 택1):
- 대비/비교(나쁜 vs 좋은, A vs B) → 2-패널 그리드 + 가운데 `VS`.
- 단계/순서(1·2·3) → 카드 가로 플로우(`→`) 또는 세로 스텝(`↓`).
- 분류/항목 → 카드 그리드 또는 표(thead/tbody).
- 각 패널/카드: `border:1px solid var(--line); background:var(--panel-bg);` 1px 테두리로만 구획.
- 하단 핵심 요약은 `--cream` 배경 콜아웃 1줄(선택).

**타이포·여백**: 본문 18~20px, 부제 18px, 카드 타이틀 22~26px, mono 라벨 16~20px, line-height 1.3~1.5.
- **줄바꿈 금지(가능한 한)**: 한 줄에 들어갈 라벨/타이틀엔 `white-space:nowrap`. 칸이 좁아 줄바꿈되면
  → 폰트 1~2px↓ / 패딩↓ / 컬럼 폭↑ / 텍스트 단축(덱 타이틀과 중복되는 수식어 제거)으로 한 줄에 맞춘다.
- 2단 비교에서 칸이 좁으면 라벨+값을 **세로 스택**(라벨 위, 값 아래 풀폭)으로 둬 텍스트가 박스를 넘지 않게.

**anti-ai-slop 필수**: gradient 금지(배경·텍스트·topbar 전부), 컬러/글로우 그림자 금지,
backdrop-filter 금지, 모션 금지, border-radius 0~8px, 이모지 불릿 금지. 색은 무채색+teal 액센트 의미용으로만.

### 3) PNG 렌더
```
node docs/images/level2/render.mjs docs/images/<level>/<name>.html docs/images/<level>/<name>.png 1280 <H>
```
`render.mjs` 는 `.frame` 을 deviceScaleFactor 2로 캡처(투명 배경) → `<name>.png`(2560×2H).
렌더 후 `sips -Z 1200 ... /tmp/chk.png` 로 축소해 **반드시 눈으로 확인**: 줄바꿈/넘침/하단 짤림 점검,
있으면 2)로 돌아가 수정.

### 4) 덱에 리사이즈 오버레이로 임베드
`scripts/embed.py` 사용:
```
python3 .claude/skills/slide-to-image/scripts/embed.py <deck.html> "<제목 일부>" docs/images/<level>/<name>.png
```
- **제목(data-slot="title") 부분일치**로 대상 슬라이드를 찾는다(본문 키워드 매칭 금지 — 커버/목차/간지 오염 방지).
- 슬라이드를 `슬라이드 라벨+제목 + <img class="export-overlay"> + 푸터` 로 재구성. 이미지는 1600px로 다운스케일해 base64 임베드(자기완결, 에디터/standalone/export 모두 동작).
- 오버레이 지오메트리: 콘텐츠 박스 `maxW 1144 × maxH 524, top 150, 가로중앙` 안에 비율 맞춰 배치 →
  에디터에서 클릭 시 Moveable 상하·좌우 핸들로 리사이즈된다.

## 주의
- 상대경로(`../../images/...`) `<img>` 는 **쓰지 말 것** — 에디터(서버 루트 기준)에서 404. 반드시 base64.
- 임베드 후 에디터엔 캐시가 우선 로드되므로, 확인하려면 해당 덱을 열고 툴바 **Reset**.
- 덱 footer/page-num·라벨은 보존한다. 원본 텍스트 콘텐츠는 다이어그램이 모두 담아야 한다(정보 손실 금지).
