# Dracula Developer System — DESIGN-SYSTEM.md

> 다크 우선(dark-first) 개발자 디자인 시스템. 출처: [draculatheme.com](https://draculatheme.com/) 공식 스펙.
> 토큰 원본은 [`COLOR.json`](COLOR.json) — 이 문서와 항상 동기화한다.
> 데모: [`dracula-dark.html`](dracula-dark.html) · [`dracula-light.html`](dracula-light.html) · [`landing.html`](landing.html)

## TL;DR

- UI 크롬은 **무채색 베이스 + 액센트 1색(Purple)**. 6색 팔레트는 **코드 신택스 전용**.
- 그라데이션·글로우·글래스모피즘·모션 장식 **전면 금지**. 구획은 1px border + 여백.
- 서체: **IBM Plex Sans KR**(본문) + **JetBrains Mono**(코드·데이터).
- 다크가 기본, 라이트는 파생. 두 모드 모두 `COLOR.json`의 `modes`에서 가져온다.

---

## 1. 원칙 (MUST / MUST NOT)

### MUST NOT
- 그라데이션: `linear/radial/conic-gradient`, `background-clip:text` 금지.
- 글로우/컬러 그림자, `backdrop-filter: blur`(글래스모피즘) 금지.
- 모션 장식: hover `transform`, 로드 페이드, pulse·shimmer 키프레임 금지.
  `transition`은 색·투명도 등 상태 변화에만, ≤150ms.
- 배경 워터마크·닷 그리드·카드 상단 컬러 액센트 바·이모지 불릿 금지.

### MUST
- 색은 의미에만. 위계는 **크기·굵기·여백·정렬**로 만든다.
- 구획은 1px solid border + 여백. `border-radius` 0–8px. 그림자 없음.
- 모든 시각 요소는 "무슨 정보를 전달하는가"에 답해야 한다. 없으면 삭제.

## 2. 컬러 토큰

### 2.1 다크 모드 (기본)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--color-bg` | `#282a36` | 앱/페이지 배경 |
| `--color-surface` | `#44475a` | 카드·입력·hover 면 |
| `--color-border` | `#44475a` | 1px 구획선 |
| `--color-text` | `#f8f8f2` | 본문 |
| `--color-text-muted` | `#6272a4` | 보조·비활성 ⚠ 12px 이하 본문 금지 (대비 ≈3:1) |
| `--color-accent` | `#bd93f9` | 링크·주요 액션·포커스 (유일한 액센트) |
| `--color-accent-ink` | `#282a36` | 액센트 위 텍스트 |
| `--color-danger` | `#ff5555` | 에러·파괴적 액션 |
| `--color-success` | `#50fa7b` | 성공 |
| `--color-warning` | `#ffb86c` | 경고 |

### 2.2 라이트 모드 (파생)

| 토큰 | 값 | 파생 근거 |
|------|-----|-----------|
| `--color-bg` | `#f8f8f2` | Dracula Foreground 재활용 |
| `--color-surface` | `#ffffff` | — |
| `--color-border` | `#d8dae5` | Current Line 계열 라이트닝 |
| `--color-text` | `#282a36` | Background 반전 |
| `--color-text-muted` | `#6272a4` | 유지 (흰 배경 대비 ≈4.7:1) |
| `--color-accent` | `#644ac9` | Purple 다크닝 — 흰 배경 대비 확보 |
| `--color-accent-ink` | `#ffffff` | — |
| `--color-danger` | `#c93030` | Red 다크닝 |
| `--color-success` | `#1d8a45` | Green 다크닝 |
| `--color-warning` | `#b26214` | Orange 다크닝 |

### 2.3 신택스 토큰 (코드 블록 전용 — UI 크롬 사용 금지)

| 역할 | 다크 | 라이트 |
|------|------|--------|
| keyword | `#ff79c6` Pink | `#c7226e` |
| string | `#f1fa8c` Yellow | `#946f00` |
| number | `#bd93f9` Purple | `#644ac9` |
| function | `#50fa7b` Green | `#1d8a45` |
| type | `#8be9fd` Cyan | `#0e7490` |
| comment | `#6272a4` | `#6272a4` |
| param | `#ffb86c` Orange | `#b26214` |
| variable | `#f8f8f2` | `#282a36` |

## 3. 타이포그래피

```css
--font-sans: "IBM Plex Sans KR", "IBM Plex Sans", sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
```

| 토큰 | Size/LH | Weight | 용도 |
|------|---------|--------|------|
| `text-xs` | 12/1.5 | 400·500 | 캡션·메타 |
| `text-sm` | 14/1.6 | 400·500 | 보조 본문·라벨 |
| `text-base` | 16/1.6 | 400 | 본문 |
| `text-lg` | 18/1.5 | 500 | 리드 |
| `text-xl` | 21/1.3 | 600 | h3 |
| `text-2xl` | 27/1.2 | 600 | h2 |
| `text-3xl` | 34/1.15 | 700 | h1 |
| `code` | 13/1.75 | 400 | 코드(mono) |

## 4. 레이아웃

- 스페이싱: 4px 베이스 — `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`
- Radius: `0 / 4px / 8px`
- Border: `1px solid var(--color-border)`
- Elevation: 그림자 없음. 구획은 border/surface 대비.

## 5. 컴포넌트 레시피

- **Button Primary**: `bg accent · text accent-ink · radius 4px · padding 8px 16px · weight 600`. hover는 `filter: brightness(1.08)`만. 라벨은 실제 동작 명시("변경 저장", "제출" 금지).
- **Button Secondary**: `bg surface · text text · border 1px`.
- **Card**: `bg surface · border 1px · radius 8px · padding 20–24px`. 상단 액센트 바 금지.
- **Input**: `bg bg · border 1px · radius 4px · padding 8px 12px`. Focus는 `border-color: accent`만 (글로우 금지). Placeholder는 muted.
- **Table**: 헤더 `bg surface · text muted · uppercase 12px 600`. 셀 `border-bottom 1px · padding 11px 14px`. zebra 금지.
- **Code Block**: `bg bg · border 1px · radius 8px · mono 13px/1.75`. 신택스 색은 §2.3만.
- **Badge**: `bg transparent · border 1px · text muted · radius 4px · padding 2px 8px`. 상태 표시가 필요할 때만.

## 6. 다른 프로젝트에서 재활용하기

1. `COLOR.json`을 복사하고 `modes.dark` 또는 `modes.light`를 CSS 변수로 매핑:

```js
import tokens from "./COLOR.json" with { type: "json" };
const css = Object.entries(tokens.modes.dark)
  .map(([k, v]) => `--color-${k}: ${v.value};`).join("\n");
```

2. 모드 전환은 `<html data-theme="light">` 속성 스위치 하나로 — 토큰 이름은 두 모드에서 동일하다.
3. `rules.mustNot`을 코드 리뷰 체크리스트로 사용한다.

## 관련 문서

- [SEO 가이드](../SEO_GUIDE.md) — HTML 산출물 공통 규칙
- [브랜드 테마](../brand/DESIGN-SYSTEM.md) — 마케팅·에디토리얼 산출물용 자매 시스템
