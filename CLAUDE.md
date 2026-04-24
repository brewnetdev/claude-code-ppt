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
