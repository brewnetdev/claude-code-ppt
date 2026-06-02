# Claude Code 슬라이드 템플릿 사용법

`claude-code-template.html` — 이 프로젝트의 슬라이드 에디터(`src/canvas`)가 그대로 import할 수 있는 **brewnet-dark 테마 기반의 빈 템플릿**. 14개 슬라이드 타입 placeholder가 들어있어, 필요한 것만 골라 채우면 새 덱이 됨.

## 어떻게 만들어졌나

- **테마**: `src/canvas/themes/brewnet-dark.css`와 동일한 CSS 토큰/클래스를 인라인 `<style>`에 포함 (self-contained, 외부 의존성 없음)
- **폰트**: Google Fonts (`Noto Sans KR`, `JetBrains Mono`) CDN 링크 — 오프라인이면 폰트만 fallback
- **좌표계**: 1280×720 (프로젝트 표준 — `src/scene/constants.ts`와 일치)
- **슬롯 규약**: `src/importer/parsePresentation.ts`가 인식하는 `data-slot` 속성 부여 (`title`, `subtitle`, `label`, `caption`, `body`, `bullets`, `table`, `code`, `quote`, `link-list`, `number`, `step`, `page-num`)

## 포함된 슬라이드 타입 (14종)

| # | 이름 | 사용 시점 |
|---|------|----------|
| 01 | COVER | 표지 (한 덱 1장) |
| 02 | SECTION DIVIDER | 챕터/파트 구분 |
| 03 | CONTENT (TITLE + BODY) | 가장 흔한 본문 |
| 04 | BULLET LIST | 요점 나열 |
| 05 | NUMBERED LIST | 순서 있는 단계 |
| 06 | TWO COLUMN 50:50 | 좌우 비교 |
| 07 | TWO COLUMN 6:4 | 본문 + 사이드 시각자료 |
| 08 | TABLE | 비교 표 |
| 09 | CODE BLOCK | 터미널 / 실행 결과 |
| 10 | PROMPT BOX | 사용자 프롬프트 강조 |
| 11 | CALLOUTS | 팁 / 노트 / OK 박스 |
| 12 | BADGES | 태그 / 상태 라벨 |
| 13 | STEP FLOW | 가로 단계 흐름 |
| 14 | ARCHITECTURE | 노드 다이어그램 |

## 사용 방법

### 방법 A — 에디터로 import 후 편집 (권장)

1. `npm run dev`로 에디터 실행 → http://127.0.0.1:5173
2. 상단 툴바의 **Open / Import**(또는 파일 드롭) 영역에 `docs/keynote/claude-code-template.html` 드래그
3. 좌측 사이드바에 14개 슬라이드가 목록으로 뜸 — 각 슬라이드 타이틀은 `data-slot="title"` 또는 `.t-hero/.t-title`에서 추출됨
4. 슬라이드를 클릭해 캔버스에서 직접 텍스트 편집 (contenteditable)
5. 불필요한 슬라이드는 사이드바에서 삭제, 필요한 타입은 **Duplicate**로 복제해 내용 채우기

### 방법 B — 브라우저로 직접 미리보기

```bash
open docs/keynote/claude-code-template.html
```

세로 스크롤로 14개 슬라이드가 한 페이지에 모두 표시됨 — 디자인 토큰 / 클래스 사용 예시 카탈로그로 활용.

### 방법 C — 새 덱 시작점으로 복사

```bash
cp docs/keynote/claude-code-template.html docs/keynote/my-new-deck.html
```

원본은 보존하고, 사본을 편집해 새 강의 덱 작성.

## 편집 가이드

### 텍스트 토큰

- **강조**: `<span class="hl-amber">키워드</span>` (또는 `hl-blue`, `hl-green`, `hl-cyan`)
- **챕터 라벨**: `<div class="t-chapter">CH.1 · 라벨</div>` — 항상 amber 컬러 + uppercase
- **소제목**: `<div class="t-h2">중제목</div>` — 왼쪽에 amber 바
- **부제**: `<div class="t-caption">한 줄 설명</div>` — muted 회색

### 컬러 시맨틱

| 컬러 | 변수 | 용도 |
|------|------|------|
| Amber `#F59E0B` | `--amber` | 핵심 키워드 / 액션 / 주의 |
| Blue `#60A5FA` | `--blue` | 참조 / 노트 / 보충 정보 |
| Green `#34D399` | `--green` | 성공 / 권장 / 확정 |
| Cyan `#22D3EE` | `--cyan` | 기술 라벨 / 메타 |
| Muted `#94A3B8` | `--muted` | 보조 텍스트 / 캡션 |

### 좌표 / 스케일

- 슬라이드 1장 = `1280 × 720`. 절대 변경 금지.
- 에디터는 자동으로 scale-to-fit, export 시 1.5× → `1920×1080`로 렌더.
- 오버레이 이미지를 추가할 경우 좌표는 **1280×720 기준**으로 저장됨 (`src/scene/store.ts`).

### 푸터 페이지 번호

```html
<span class="slide-footer-right" data-slot="page-num">03</span>
```

`COVER`, `SECTION` 같은 라벨 또는 숫자 둘 다 가능. 에디터는 이 값을 슬라이드 메타로 인식하지만 자동 채번은 하지 않음 — 수동 관리.

## 알아두면 좋은 것

- **이 파일은 빈 템플릿**임. 실제 강의 컨텐츠 예시는 `docs/html/presentation/brewnet-presentation.html` 참조 (46장 완성본).
- 슬라이드를 추가하려면 `<div class="slide">...</div>` 블록을 통째로 복사한 뒤 내부만 편집. 순서는 DOM 순서 그대로 import됨.
- 커버 슬라이드의 배경 이미지(`.slide-bg`)는 기본 템플릿에서 생략됨 (파일 크기 절감). 필요하면 brewnet-presentation에서 `.slide-bg` 블록을 복붙.
- 코드/프롬프트 안 색상 토큰(`green`, `yellow`, `cyan`, `blue`, `red`, `gray`)은 syntax highlight 용도로만. JS 처리 없이 클래스만으로 동작.

## 파일 위치

```
docs/keynote/
├── claude-code-template.html   # 본 템플릿 (14 슬라이드 placeholder)
└── USAGE.md                    # 이 문서
```
