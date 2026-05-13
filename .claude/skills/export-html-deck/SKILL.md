---
name: export-html-deck
description: >
  Effective Claude Code 슬라이드 데크(원본 docs/html/presentation/claude-code-how-to.html)를
  좌측 사이드바 + 우측 컨텐츠 영역 구조의 웹 뷰어 HTML로 export. 출력은
  docs/html-export/effective-claude-code.html에 생성된다. 원본은 건드리지 않는다.
  Use when the user types /export-html-deck, says "deck를 HTML로 export", "웹 뷰어 다시 빌드해",
  "rebuild the HTML export", or whenever the source deck has been modified and the
  exported viewer needs refresh.
allowed-tools: Read, Bash(node:*), Bash(ls:*), Bash(mkdir:*), Bash(open:*), Bash(wc:*), Bash(grep:*)
---

# export-html-deck — 슬라이드 데크를 사이드바+컨텐츠 웹 뷰어로 변환

## 무엇을 하는가

소스 deck의 `<section class="export-slide">` 블록 전체를 추출해 사이드바+뷰어 레이아웃으로 재포장한다.

- 소스 CSS(`<style>` 블록)를 그대로 임베드해서 슬라이드 비주얼 100% 보존
- 각 슬라이드의 타이틀은 `data-slot="title"` → `t-hero` → `t-title` → `t-chapter` 우선순위로 추출 (`src/importer/parsePresentation.ts`와 동일 로직)
- 사이드바 라벨은 `data-slot="page-num"` 값(COVER/SECTION/OPENING/숫자/END) 사용
- 뷰어는 슬라이드 한 장을 1280×720 좌표계로 보여주고 윈도우에 맞춰 스케일

## 호출 방법

### 기본 (소스·출력 경로 모두 기본값)

```bash
node .claude/skills/export-html-deck/scripts/export-deck.js
```

기본값:
- 소스: `docs/html/presentation/claude-code-how-to.html`
- 출력: `docs/html-export/effective-claude-code.html`

### 경로 커스터마이즈

```bash
node .claude/skills/export-html-deck/scripts/export-deck.js <source-path> <output-path>
```

예) 다른 deck export:

```bash
node .claude/skills/export-html-deck/scripts/export-deck.js \
  docs/html/presentation/some-other-deck.html \
  docs/html-export/some-other-deck.html
```

## Instructions

1. 스크립트 실행 (위 명령)
2. 출력 확인:
   - 파일 존재: `ls -la docs/html-export/effective-claude-code.html`
   - 슬라이드 개수 검증: `grep -c 'slide-frame' docs/html-export/effective-claude-code.html` (소스 슬라이드 수와 일치해야 함)
3. (선택) 브라우저에서 확인: `open docs/html-export/effective-claude-code.html`
4. 결과 보고 — 슬라이드 수, 파일 크기, 출력 경로

## 동작 보증

- **원본은 read-only로만 접근** — 스크립트는 `fs.readFileSync(source)`만 호출, 출력에만 `writeFileSync`
- **외부 의존성 없음** — Node 표준 라이브러리(`fs` · `path`)만 사용
- **소스에 슬라이드가 없으면 exit code 1** — 잘못된 파일에 대해 빈 출력 생성 안 함
- **출력 디렉터리 자동 생성** — `mkdirSync({ recursive: true })`

## 출력 HTML 검증 포인트

- `<aside class="deck-sidebar">` 1개
- `<main class="deck-viewer">` 1개
- `<div class="slide-frame" data-slide="N">` 슬라이드 수만큼
- `<script>` 1개 (네비게이션 로직)
- 소스의 `<style>` 블록 임베드 + 레이아웃 CSS 추가

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 사이드바에 빈 타이틀만 보임 | 슬라이드에 `data-slot` 누락 | 소스에 t-hero/t-title 추가 필요 |
| 슬라이드가 화면에 비례 안 맞음 | 사용자가 viewer 안에서 zoom 적용 | 브라우저 zoom 100%로 |
| 화살표 키 안 먹힘 | 다른 요소(input/textarea)에 포커스 | viewer 영역 클릭 후 재시도 |
| 슬라이드 개수가 0개로 나옴 | 소스에 `<section class="export-slide">` 없음 | 소스 deck 검증부터 |

## 키보드 단축키 (생성된 뷰어)

- **←** / **↑** / **PageUp** → 이전 슬라이드
- **→** / **↓** / **Space** / **PageDown** → 다음 슬라이드
- **Home** → 첫 슬라이드 · **End** → 마지막 슬라이드
- **F** → 프레젠테이션 모드 토글 (사이드바 숨김 + 브라우저 풀스크린)
- **Esc** → 프레젠테이션 모드 종료
- 사이드바 아이템 클릭 → 직접 점프
- nav 바의 **🖥 버튼** → 프레젠테이션 모드 진입
- URL hash 동기화 (`#slide-N`)로 직접 링크/브라우저 ←→ 동작
