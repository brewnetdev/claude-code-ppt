# OHPen Landing System

> 마케팅 랜딩(`index.html` 및 `en/`·`ja/`·`zh/`·`buy/`)의 디자인 스펙.
> 토큰 원본은 `COLOR.json`이며 이 문서와 **항상 동기화**한다(색 값 변경 시 양쪽 수정).
> 성격: **라이트 웜 페이퍼 에디토리얼** — 무채색 베이스 + 액센트 1색(딥 틸). 장식이 아니라 위계·여백·정렬·타이포로 품질을 만든다.
> 정본 소스: `index.html` · 최종 추출 2026-07-21.
> 상위 방향·철학은 `DESIGN_CONCEPT.md`.

---

## 1. 원칙 (MUST / MUST NOT)

**MUST**
- 무채색 웜 그레이 베이스 + **액센트 1색**(`#003748`). 색은 의미(위계·상태)에만.
- 구획은 효과가 아니라 **`1px solid border` + 여백**으로.
- 위계는 **크기·굵기·여백·정렬**로. 색·그림자로 만들지 않는다.
- `border-radius` 0–8px. 한쪽 테두리엔 radius 0.
- 폰트는 의도적 선택: 한글 본문 IBM Plex Sans KR, 수치·kbd JetBrains Mono. system-ui 수렴 금지.

**MUST NOT** (위반 시 재작성)
- 그라데이션 일체 — **예외: 텔레그램 문의 카드 1곳만**(§7).
- 글로우·컬러 그림자·`backdrop-filter: blur`(글래스모피즘).
- 모션 장식: hover `transform`, 로드 페이드/스태거, pulse·shimmer 키프레임. `transition`은 색·투명도 상태 변화에만 ≤150ms.
- 배경 워터마크·닷 그리드·카드 상단 컬러 액센트 바·이모지 불릿.
- 액센트 2색 이상 — **예외: macOS/텔레그램 등 서드파티 브랜드 재현**(§7).
- 랜딩 본문 그림자 — 랜딩은 그림자 0단계(데모 렌즈만 예외).

---

## 2. 컬러 토큰 (← `COLOR.json`과 동기화)

| 토큰 | 값 | 용도 |
|---|---|---|
| `bg` | `#faf9f5` | 페이지 배경(웜 페이퍼) |
| `surface` | `#ffffff` | 카드·표·FAQ·가격박스 면 |
| `border` | `#e7e5dc` | 1px 구획선(전 카드·표·입력) |
| `text` | `#1a1a18` | 본문·제목 |
| `text-muted` | `#57564f` | 보조·메타·캡션 |
| `accent` | `#003748` | **유일 액센트** — 버튼·링크·kbd 칩·Pro 칩·강조 테두리·Pro 열·헤더 |
| `accent-ink` | `#ffffff` | 액센트 배경 위 텍스트 |
| `link` | `#003748` | 링크(accent 동일) |
| `kbd-bg` | `#efeee7` | FAQ kbd·CTA 밴드·hover 면 |

**헤더(사이트 유일 다크 영역):** bg `#003748` · 네비 `rgba(255,255,255,.75)` · 로고/현재언어/hover `#fff` · 하단선 `rgba(255,255,255,.14)` · 다크 위 accent 버튼 구획 `rgba(255,255,255,.5)`.

**중성 오버레이:** 데모 줌 렌즈 배경 = 슬라이드색 `#F4F5F7`(목업 클론이 투명이라 wrap 배경 대체 — #000이면 검정 반전 버그) · 렌즈 테두리/선택 사각형 `rgba(0,0,0,.5–.6)` · 닫기/배지 `rgba(0,0,0,.6–.65)` · 렌즈 그림자 `rgba(0,0,0,.35)` · 영상 백드롭 `rgba(26,26,24,.72)`.

---

## 3. 타이포그래피

폰트: `--font-sans` = "IBM Plex Sans KR" (본문·제목) · `--font-mono` = "JetBrains Mono" (kbd·메타·가격·수치).

| 역할 | 크기 | 굵기 | 비고 |
|---|---|---|---|
| Hero h1 | **56px** → 42(≤태블릿) → 34(≤760px) | 700 | letter-spacing −0.02em, lh 1.2 |
| Section h2 | **34px** → 27(모바일) | 700 | −0.02em, mb 16px |
| 가격/스탯 | 34px | 700 | mono |
| Solution 번호 | 27px | 500 | mono, accent |
| Card h3 | 21px | 600 | lh 1.3 |
| Hero sub | 19px | 400 | muted, max 46ch |
| Section lede / 로고 | 18px | 400 / 700 | lede muted, max 62ch |
| Body(base) | 16px | 400 | |
| Card 본문 | 15px | 400 | muted |
| 네비·표·버튼 | 14px | 400–600 | |
| 메타·캡션 | 13px | mono | muted |
| kbd 칩(치트시트·본문·FAQ) | **16px** | 500 | mono, min-w 72px·h 34px |
| 표 헤더 라벨 / 데모 kbd | 12px | 500 | mono, uppercase(표) · 데모 kbd는 §8 스코프 |
| Pro/Free 칩 | 11px | 600 | mono |

---

## 4. 기하 — radius · 여백 · 레이아웃

- `--radius-sm` 4px(칩) · `--radius-md` 8px(버튼·카드·표·FAQ 기본).
- 특수: 가격박스 상·하단 개별 7px, `권장` 배지 999px(pill), 원형 50%. (데모 줌 렌즈는 radius 0 — 앱 재현.)
- `--maxw` 1120px, 좌우 패딩 24px.
- 구획: 항상 `1px solid var(--border)` + 여백. 카드 패딩 28–32px.

---

## 5. 컴포넌트

- **버튼** `.btn`(min-height 44px, radius 8px, 600) — `.btn-primary`(accent 채움 + accent-ink), `.btn-secondary`(투명 + border, hover kbd-bg), `.btn-muted`(투명 + muted 텍스트, hover text·kbd-bg), `.btn-sm`(36px). hover는 `filter: brightness(0.92)` 또는 배경 상태 변화만.
- **카드** `.card`(border + radius-md + surface). 그림자 없음.
- **다운로드 카드** `.dl-card` — 히어로 3열: Windows(준비중 secondary) · macOS 무료 · **macOS Pro(`.dl-card--rec` accent 테두리 + `.dl-badge` "권장" pill)**. 강조는 항상 1개 카드에만.
- **Pro/Free 칩** `.pro-chip`(accent 테두리·텍스트) · `.free-chip`(중립 테두리·muted). 기능이 Pro 전용임을 표시.
- **kbd** 칩(16px mono · min-width 72px · height 34px): 본문·치트시트는 accent 채움(accent-ink), **FAQ 안(`.faq kbd`)만 중립**(kbd-bg + text + border). 데모 위젯 내부 kbd는 12px 별도 스코프(§8).
- **가격박스** `.price-box` 2단 스와치: 상단 라벨(accent 배경) + 하단 본문(surface, 가격 34px mono). 1px accent 테두리.
- **비교표** `.compare`(`.table-card` 안): Pro 열(`th.col-pro` + 마지막 td)에 **accent 외곽선**으로 위계, `.no`는 muted "미지원".
- **FAQ** `.faq`: `<details>`/`<summary>`(+/− 마커), `.faq-cat` 카테고리 소제목, 맨 아래 `.faq-contact` 텔레그램 카드(§7).
- **trust-badges** mono 라벨 + border pill. **CTA 밴드** `.cta-band`(kbd-bg 패널 + 가격박스 + 구매 버튼).
- **헤더** 다크(#003748) sticky, 로고 + 네비 + 언어 스위치(KOR·ENG·JPN·CHN) + primary CTA.

---

## 6. 페이지 구조 (`index.html` 섹션 순서)

```
header(dark)
└ hero  #download  [Windows | macOS 무료 | macOS Pro(권장)] + caption
   #demo       인터랙티브 데모 위젯 (§8, 앱 팔레트 스코프)
   #problem    발표 도구의 한계 (grid-3)
   #solution   3해법 (번호 리스트)
   #how        이용 방법 (steps)
   #features   드로잉 도구 (grid-4, Pro 칩)
   #more       그리기 그 이상 (grid-4: 포인터·줌Pro·키캐스트Pro·페이드) + trust-badges
   #shortcuts  단축키 치트시트 (표, 줌 Pro)
   #editions   Free vs Pro 비교표 (Pro 열 강조)
   #cta        가격박스 + 구매하기(→ buy/)
   #faq        카테고리 + 텔레그램 문의 카드
footer  © 2026 OHPen
```

JSON-LD(`SoftwareApplication` + `Organization` + `FAQPage`)는 `<head>`에 인라인 — **FAQ 수정 시 항상 동반 갱신**.

---

## 7. 예외 — 서드파티 브랜드 재현

시스템 규칙을 이기지 않지만 **명시적으로 허용된 예외**:

1. **텔레그램 문의 카드** (`.faq-contact`) — `linear-gradient(180deg, #2AABEE, #229ED9)` + 흰 텍스트. 사이트 **유일 그라데이션·유일 유채색**. Telegram 브랜드 재현이라는 논리. 확장 금지.
2. **다크 헤더** — 사이트에서 라이트가 아닌 유일 영역(accent 채움).
3. (이력) macOS 다운로드 버튼에 apple.com 블루(`#0071e3`)를 잠시 적용했다가 **철회** — 현재 전 버튼은 accent(#003748)로 통일.

원칙: 서드파티 브랜드 아이덴티티 재현은 예외로 허용하되, **토큰으로 격리**하고 한 곳에만 쓴다.

---

## 8. 데모 위젯 — 별도 팔레트 (섞지 말 것)

인터랙티브 데모(`#demo`)는 실제 앱 UI를 재현하는 임베드 위젯으로, **`.ohpen-demo`로 스코프된 다크 팔레트**를 쓴다(랜딩 토큰과 무관). 정본: `docs/demo/index.html`(스플라이스로 인라인 삽입).

- 크롬: bg `#1C2024` · surface `#2B2D30` · text `#EDEEF0` · muted `#9BA1A6` · accent `#E5484D` · border `rgba(255,255,255,.08)` · kbd `#17191C`.
- 드로잉 색(앱 `src/shared/shapes.ts` 미러): 펜 `#E5484D #F76B15 #FFE629 #30A46C #0090FF #1C2024 #FFFFFF` · 형광펜 `#FBFF00 #FF2E9A #3DFF6E #00E1FF #FF7A00 #B26BFF`.
- 도구: 펜·형광펜·네모·원·화살표·손가락·밑줄·포인터 하이라이트 + **화면 확대(줌, Pro)** — 앱 `ohpen/src/overlay/zoom.ts` 동작 재현: 러버밴드 선택 → 선택 영역이 최대 `sel×1.75`(데모 캔버스 935×560 초과 시 다 보이게 배율 자동 축소, 좌상단 앵커로 지정 영역이 렌즈를 정확히 채움)로 자라남(350ms) → ✕/재클릭 종료. 렌즈만 그림자(`0 4px 16px rgba(0,0,0,.35)`) 허용.
- 데모 색·좌표·드로잉 JS는 앱 재현이라 랜딩 규칙으로 통일하지 말 것.
