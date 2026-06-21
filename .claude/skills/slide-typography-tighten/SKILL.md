---
name: slide-typography-tighten
description: 슬라이드 덱(`docs/html/report/claude-code-levelN-chapterN.html`)의 본문 텍스트가 작거나 PNG 다이어그램 내부 박스 여백이 과해 가독성이 떨어질 때, 글로벌 테마(`src/canvas/themes/*.css`)는 건드리지 않고 슬라이드 단위로 폰트·박스 여백 토큰을 조정한다. Use when the user says "LN 슬라이드 글자 키워줘", "N페이지 본문 폰트 확대", "다이어그램 박스 여백 줄여줘", "슬라이드 텍스트 가독성 개선", "1080p 화면용 폰트 업스케일". 기존 `slide-to-image` 스킬과 책임 분리 — 텍스트→이미지화는 `slide-to-image`, 기존 콘텐츠의 폰트·여백 튜닝은 이 스킬.
---

# slide-typography-tighten

**대상**: `docs/html/report/claude-code-level{N}-chapter{N}.html` (1280×720 .slide 구조 덱).
**책임**: 기존 콘텐츠의 폰트 크기와 박스 padding을 조정해 1080p 영상 강의 화면에서 가독성을 확보한다.
**비책임**: 새 다이어그램 생성(→ `slide-to-image`). 글로벌 테마 토큰 수정. 에디터 캐시 클리어(→ 사용자 안내).

## 두 가지 입력 신호 분기

| 사용자 신호 | 처리 경로 |
|---|---|
| "본문 글자가 작아", "텍스트 키워줘", "1080p에서 안 보여" | **A. 텍스트 슬라이드 폰트 확대** (`apply_text_bump.py`) |
| "다이어그램 안 여백이 너무 커", "박스 위아래 공간이 비어", "내부 박스에 콘텐츠 작아" | **B. PNG 다이어그램 재생성** (원본 HTML 패치 → 재렌더 → 재임베드) |

거의 항상 두 경로 모두 필요하므로 **A 먼저 → 검수 컨펌 → B 진행**.

## A. 텍스트 슬라이드 폰트 확대

### A-1. 슬라이드 인덱스 ↔ 라인 매핑 산출

```bash
grep -nE 'page-num">|<div class="slide' "$DECK" | head -80
grep -n 'export-overlay' "$DECK" | awk -F: '{print $1}'
```

- 첫 번째 grep: 슬라이드 시작 라인과 page-num 라벨로 사용자 페이지 번호와 에디터 1-based idx 매핑.
- 두 번째 grep: PNG 임베드 슬라이드 식별(텍스트 폰트 확대 대상에서 제외).

### A-2. 스타일 앵커 삽입 (한 번만, 멱등)

덱 `<body>` 바로 다음에 다음 마커 블록을 삽입한다:

```html
<!-- FONTUP STYLE -->
<style id="slide-fontup">
.slide[data-fontup="1"] .t-body { font-size: 22px !important; line-height: 1.55 !important; }
.slide[data-fontup="1"] .bullet-list li { font-size: 21px !important; line-height: 1.55 !important; }
.slide[data-fontup="1"] .callout-body { font-size: 20px !important; line-height: 1.5 !important; }
.slide[data-fontup="1"] .t-h3 { font-size: 18px !important; }
.slide[data-fontup="1"] .t-caption { font-size: 17px !important; }
.slide[data-fontup="1"] .num-list li > div { font-size: 22px !important; }
.slide[data-fontup="1"] .num-list .sub { font-size: 17px !important; }
</style>
<!-- /FONTUP STYLE -->
```

스타일 블록을 먼저 삽입하면 그 이후 모든 슬라이드 라인이 **+12줄 시프트**된다. 스크립트가 사용할 ranges는 **시프트 이후 새 라인 번호** 기준이다.

### A-3. 14장(또는 사용자 지정 수) 슬라이드에 마킹 + 인라인 폰트 ×1.22

```bash
python3 scripts/apply_text_bump.py "$DECK" \
  --ranges 1429-1475,1476-1498,1499-1575,... \
  --ratio 1.22
```

스크립트 동작:
1. `<!-- FONTUP STYLE -->` 앵커 블록을 idempotent하게 재작성.
2. 각 range 안의 `<div class="slide(...)" data-template="report">` 라인에 `data-fontup="1"` 추가.
3. 같은 range 안의 인라인 `font-size:Npx` (10 ≤ N ≤ 20) 를 `ratio` (기본 1.22)로 확대.

### A-4. 결과 검증 (필수)

```bash
grep -nE 'data-fontup="1"' "$DECK" | grep -v 'style id\|\.slide\['
```

- 마킹된 슬라이드 라인 ↔ 의도 idx 1:1 매핑 확인.
- PNG 임베드 슬라이드·제외 슬라이드(예: idx 17 Practice, idx 25 등)에 마킹 들어갔으면 **즉시 정정**.

## B. PNG 다이어그램 재생성

### B-1. 원본 HTML 위치

원본은 거의 `docs/images/level{2|3|...}/<name>.html`. level3 덱이 level2 자산을 공유하는 경우가 있으니 양쪽 모두 확인. PNG에 대응하는 HTML이 없으면 재생성 불가 — 사용자에게 보고.

### B-2. 진단 (박스 안 여백 과다 패턴)

다음 두 패턴이 동시에 보이면 사용자가 호소하는 "박스 위아래 100px 빈공간" 증상.

```css
.card { justify-content: center; padding: 16px 16px; }
.flow { grid-template-rows: auto 1fr; }
```

→ grid 1fr 카드가 row 전체로 늘어남(예: 400px), 콘텐츠는 ~120px → 280px 빈공간이 `center`로 위/아래 분산.

### B-3. 패치 원칙

| 항목 | 변경 |
|---|---|
| `.card` | `justify-content: center` → `space-evenly`. padding 16 → 24~26px (위아래) / 16~18px (좌우). gap 10 → 14px. |
| `.step` 등 핵심 폰트 | +37~58% (예: 19px → 30px) |
| `.kick / .out` | +28% (12.5 → 16~17px) |
| `.role` | +21% (14 → 18~19px) |
| `.ph` (phase 헤더) | +20% (15 → 18px) |
| `.aux .*` (보조 박스) | 비례 확대 (13 → 15~16px) |
| **frame 비율** | **건드리지 않는다** — 1280×590 = 2.17은 슬라이드 콘텐츠 박스(1144×524) 비율과 거의 같다. frame을 줄이면 슬라이드 내 빈공간이 생긴다. |

### B-4. 재렌더 + 재임베드

```bash
node docs/images/level2/render.mjs \
  docs/images/level2/<name>.html \
  docs/images/level2/<name>.png 1280 590

python3 .claude/skills/slide-to-image/scripts/embed.py \
  "$DECK" "<제목 부분일치 텍스트>" \
  docs/images/level2/<name>.png
```

### B-5. 적중 idx 검증 (필수)

`embed.py` 출력 `embedded ... -> slide idx N (page M)` 에서 M이 의도 페이지와 일치하는지 대조. 불일치 시 제목 fragment를 더 구체화.

### B-6. 오버레이 폭 감사

```bash
grep -nE 'export-overlay[^"]*"\s+width="[0-9]+' "$DECK" | grep -v '^.*width="11[0-9][0-9]"'
```

`width<1000` 인 다이어그램은 콘텐츠 박스를 못 채우고 좁게 표시됨 — 재임베드 또는 비율 조정 필요.

## 멱등성·안전성

- 스크립트 재실행: `data-fontup="1"` 마킹·STYLE 블록 모두 멱등. ratio만 바꿔 재실행 가능.
- 백업: 시작 전 `cp $DECK $DECK.bak.fontup-$(date +%Y%m%d-%H%M%S)`.
- 라인 카운트 함정: 덱 안에 ` ` (Unicode Line Separator)가 들어있어 Python `splitlines()`가 grep과 다른 라인 번호를 매긴다. 본 스크립트는 `split('\n')` 로 강제 일치시킨다 (`apply_text_bump.py` 주석 참조).

## anti-ai-slop 정합성

- 본 스킬은 폰트·padding·gap 토큰만 건드린다. 그라데이션·글로우·모션·border-radius 변경 금지.
- 좌측 액센트 바 추가 금지(see `.claude/rules/anti-ai-slop.md`).
- 스타일 블록 안의 색·border-style 추가 금지.

## 에디터 캐시 안내 (마무리 단계)

덱 HTML을 수정해도 에디터가 localStorage 캐시본을 먼저 띄운다(`src/App.tsx` `loadDeckFromLocalStorage`). 사용자에게 다음 셋 중 하나 안내:

1. **에디터(`npm run dev`)에서 보면**: 브라우저 새로고침 + 툴바 **Reset** 버튼 클릭. ⚠️ 에디터에서 직접 한 편집은 사라진다.
2. **단독 HTML 뷰어(`docs/html-export/`)에서 보면**: `export-html-deck` 스킬로 재익스포트 필요 (`node .claude/skills/export-html-deck/scripts/export-deck.js`).
3. **PDF 익스포트**: 재익스포트 후 `window.print()`.

## 참고 메모리

- `[[level-slide-image-workflow]]` — 슬라이드 이미지화 워크플로, 폰트 확대 시 프레임/내부 박스 클리핑 객관 검출 필수.
- `[[diagram-full-width-audit]]` — 콘텐츠 다이어그램은 frame 590(비율 2.17) = 전폭. width<1000 감사.
- `[[verify-embed-target-slide]]` — `embed.py` 제목 부분일치 → 임베드 후 적중 idx 대조.
- `[[export-html-fidelity]]` — Export HTML 충실도, 4종 테마 CSS 전부 번들.
