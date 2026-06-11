# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Relationship
- You can push back on ideas — this can lead to better outcomes
- Ask clarifying questions before making architectural changes
- Propose alternatives when a request conflicts with project conventions


## Project Purpose

Browser-based slide editor for producing video-lecture materials for the *Claude Code Master* book. Recording is split into two parallel tracks:

- **Developer** edition
- **Non-developer** edition

Source assets (book excerpts, HTML fragments, Markdown, PDFs, images) are imported and composed into slides. The final artifact is consumed during video recording — shipped either as an HTML presentation or exported to PDF.

Sample HTML slides will be supplied as the starting template; the editor parses them into an editable scene, not as free-form HTML text.

## Core Design Goals

The page must feel like PowerPoint/Keynote in the browser:

- Click any text element → inline editing
- Insert images (drop / upload / paste)
- Drag to reposition any section
- Resize handles on every section
- Output: runnable HTML presentation or PDF export

When implementing editing UX, favor direct manipulation of the rendered slide over a separate "code pane." Editing state belongs to a scene model; the rendered DOM is a projection of that model.

## Stack (Phase 0 scaffolded)

- **Vite + React 18 + TypeScript** — editor shell, HMR, type safety
- **Tailwind CSS** — editor chrome only (toolbar / sidebars / panels)
- **Sample CSS preserved** — each sample's original CSS is loaded scoped under `.slide-canvas-host`. Do not Tailwindify slide content; keep sample design intact.
- **Zustand** (TBD wire-up in Phase 1) — Scene model store
- **Moveable.js** — overlay-layer free drag/resize (Phase 2)
- **SortableJS** — content-block reorder within slide flow (Phase 2)
- **html-to-image** — per-slide PNG export (Phase 3)
- **Browser `window.print()` + `@page` CSS** — PDF export (Phase 3)

Reveal.js was evaluated and **dropped** — samples are static `.slide` divs with their own design system; Reveal would impose its own slide shell and conflict with sample CSS. PDF export uses browser print directly.

Marp was evaluated as inspiration but not adopted — Marp is markdown-first, we are HTML-WYSIWYG-first. Future MD ingestion may borrow `@marp-team/marpit` parsing patterns.

## Coordinate System

Slides are authored at **1280 × 720** (matches all provided samples). Display in editor scales-to-fit. Export renders at **1.5× → 1920 × 1080** (1080p video target). All `Overlay` x/y/w/h values are in 1280×720 source coordinates — never store post-scale pixels.

## Editing Model — Layered

Each slide has two distinct edit surfaces. Do not collapse them.

| Layer | Behavior | Library |
|---|---|---|
| **Content blocks** (flex flow inside `.slide-inner`, indexed by `data-slot`) | Inline text edit, reorder up/down, add/delete | `contenteditable` + SortableJS |
| **Overlay items** (free position images / textboxes / shapes layered above) | Drag x/y, resize w/h, rotate | Moveable.js |

Sample HTML elements with `data-slot="..."` attributes are parsed by `src/importer/parsePresentation.ts` and editable in place via `src/canvas/useSlideEditing.ts`. Slot names observed so far: `title`, `subtitle`, `label`, `caption`, `body`, `bullets`, `table`, `code`, `quote`, `link-list`, `number`, `step`, `page-num`.

## Project Layout

```
src/
  main.tsx                         # React entry
  App.tsx                          # Editor shell + initial deck load
  styles/editor.css                # Tailwind + global editor styles only
  scene/
    constants.ts                   # 1280×720 authoring / 1920×1080 target dimensions
    store.ts                       # Zustand deck store (slides, currentIndex, overlays)
  canvas/
    SlideCanvas.tsx                # 1280×720 canvas with scale-to-fit, drop target
    SlideRenderer.tsx              # Per-slide HTML renderer, commits edits back to store
    OverlayLayer.tsx               # Moveable-powered free-position image layer
    useSlideEditing.ts             # contenteditable + SortableJS wiring with drag handles
    spike.css                      # Edit-affordance CSS (grip handle, selection outlines)
    themes/
      brewnet-dark.css             # Extracted sample CSS (preserved as-is)
  editor/
    Toolbar.tsx / SlideListSidebar.tsx / PropertiesPanel.tsx / EditSpikeBanner.tsx
  importer/
    parsePresentation.ts           # DOMParser → ParsedSlide[] from sample HTML
  exporter/                        # Phase 3 — HTML / PDF / PNG
docs/html/                         # Provided sample HTML families (presentation, manual, portfolio, report)
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on http://127.0.0.1:5173 |
| `npm run build` | TypeScript check + production bundle to `dist/` |
| `npm run typecheck` | Type-only check, no emit |
| `npm run preview` | Serve built bundle locally |

## Phase Status

- **Phase 0 — Scaffold** ✓ Editor shell + sample slide rendering at 1280×720 scale-to-fit
- **Phase 1a — Edit spike** ✓ contenteditable + grip-handle reorder + overlay drag/resize on hardcoded slide
- **Phase 1b — Importer + store + nav** ✓ DOMParser → Zustand deck → clickable slide list, edits persist per slide
- **Phase 1c — CSS scope isolation** — PostCSS prefix to namespace sample CSS under `.slide-canvas-host`
- **Phase 2 — Editing UX** — bullet-item granular edit, table edit, undo/redo, properties panel
- **Phase 3 — Persistence + Export** — JSON save/load, HTML bundle, PDF (print), PNG (html-to-image)

PPTX export is **not** in scope unless requested.


---

# Language & Response Policy

## 언어 사용 기준

| 대상 | 언어 |
|------|------|
| 내부 추론 및 계획 | English |
| 코드, 변수명, 주석, 로그, 에러 메시지 | English |
| Git 커밋 메시지 | English (Conventional Commits: `feat:`, `fix:`, `refactor:` 등) |
| 사용자 응답 (설명, 요약, 질문) | 한국어 |
| 에러 보고 시 | 한국어 설명 + 원문 에러 메시지는 English 유지 |

## 작업 완료 후 응답 형식

작업을 완료한 뒤 반드시 한국어로 다음 항목을 요약한다:

1. **무엇을 변경했는지**
2. **왜 그렇게 했는지**
3. **주의할 점이 있는지**

> 동일 정보를 본문에서 이미 설명했다면, 위 요약은 생략하거나 핵심 1~2줄로 축약한다.


---


# 하네스 (Harness — carve)

> carve가 설치한 하네스. **하네스 규칙의 정본은 이 파일**이며, 루트 `CLAUDE.md`는 이 파일을 가리키는 포인터다.
> 하네스 사용법은 `HARNESS-GUIDE.md`, 플라이트 룰은 `flight-rules.md`, 품질 기준은 `evaluation-criteria.md`, 스프린트 계약은 `sprint-contract.md` 참조.

## 설치된 구성요소
하네스 아키텍트(`harness-architect`), codesight 컨텍스트(`codesight`), LSP 인텔리전스(`lsp`), 핸드오프(`handoff`), 메모리(`memory`), 커밋(`commit`), 체인지로그(`changelog`), 리뷰(`review`), PR(`pr`), Squad(`review`·`plan`·`refactor`·`qa`·`debug`·`docs`·`gitops`·`audit`·`evaluator`), Anti-AI-Slop(`anti-ai-slop`), 파괴적 명령 차단(`block-destructive`), 비밀파일 보호(`protect-secrets`), PreCompact 핸드오프(`precompact-handoff`), 멀티에이전트 병렬(`parallel-agents`), 에이전트 조율(`coordinator`).

## 제약 (결정적 강제 — 권고가 아님)
- 위험 명령(`rm -rf /`·포크밤 등)·비밀 파일(`.env`·키)은 PreToolUse 훅이 **exit 2로 차단**한다. (상세 규칙 → 아래 Guardrails)
- 시각·문서 산출물(HTML·SVG·문서)은 **anti-ai-slop** 표준 — `check-slop`이 게이트한다.
- 커밋 전 린트·푸시 전 테스트가 강제된다(해당 훅 설치 시).

## 토큰 효율 (기본 탑재)
- 코드 탐색·구조 파악은 **codesight MCP**(`codesight_get_*`)·`.codesight/`를 우선한다.
- 참조/정의/타입 확인은 **LSP**(`findReferences`/`getDiagnostics`)를 우선한다.
- grep·전체 파일 읽기는 위로 안 되는 것만 보조로 쓴다(토큰 효율).
- 컨텍스트 점유율 **40% 이하**를 목표로 한다. 초과 시 `handoff`로 스냅샷하고 세션을 분리한다(설치된 압축 스킬이 있으면 함께 활용).
- **편집 중인 파일만** 전체 로드한다. 그 외는 codesight·LSP로 부분 조회(전체 읽기 금지).
- codesight·LSP MCP가 `.claude/settings.json`에 등록돼 있다. 모든 스킬·서브에이전트는 이를 우선 사용한다.

## 계획 우선 (Plan-before-code)
- 새 기능·비자명 변경은 (1) 계획(Spec/파일구조)을 먼저 제시하고 **사용자 승인**을 받은 뒤 (2) 구현한다.
- 각 구현 단계 종료 시 상태를 보고하고 확인을 받는다(단계별 컨펌).
- 추론(왜)과 실행(무엇을)을 분리해 기술한다. 계획은 `squad-plan`, 계약은 `sprint-contract.md` 참조.

## 워크플로
- 스킬: 핸드오프·메모리·커밋·체인지로그·리뷰·PR (자연어로 트리거).
- 깊은 작업은 Squad 서브에이전트(`/squad <member>`)에 위임.

---


## 슬라이드 덱 편집 — 에디터 캐시 주의 (반복 사고 방지)
이 저장소는 **슬라이드 에디터 앱**이다. `docs/html/...`의 덱 HTML을 직접 수정해도 **에디터 화면에는 자동 반영되지 않는다.**
- 에디터는 덱을 **localStorage/IndexedDB에 캐시**하고, 다시 열 때 **캐시본을 소스보다 우선** 로드한다(`src/App.tsx` `loadDeckFromLocalStorage`). 한 번 연 덱은 디스크 HTML을 고쳐도 옛 버전이 계속 보인다.
- "원본 갱신" 배너는 HTML의 `<meta name="deck-source-hash">` 로만 감지한다(`src/library/deckRegistry.ts`). **이 meta가 없는 덱은 배너가 아예 안 뜬다.**
- **소스 HTML 수정 후 반영 절차** ↓ (셋 다 챙길 것)
  1. **에디터에 반영** — 툴바의 **Reset** 버튼(“편집 내역을 지우고 원본으로 리셋”)을 눌러 캐시를 비우고 소스를 다시 파싱한다. ⚠️ 에디터에서 직접 한 편집은 사라진다.
  2. **dev 서버면** 브라우저 새로고침으로 Vite(`import.meta.glob`)가 바뀐 HTML을 다시 읽게 한 뒤 Reset. **빌드본이면** 재빌드/재시작이 필요하다.
  3. **웹 뷰어(`docs/html-export/...`)는 별도 산출물** — 소스 수정 후 `export-html-deck` 스킬(`node .claude/skills/export-html-deck/scripts/export-deck.js`)로 **다시 빌드**해야 갱신된다.
- 덱 슬라이드 추가·수정 시 사용자에게 위 1~3 중 어디서 보는지 먼저 확인하고, 해당 경로를 함께 안내한다.

자세한 규칙: `flight-rules.md` · 품질 기준: `evaluation-criteria.md`