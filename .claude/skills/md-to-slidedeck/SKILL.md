---
name: md-to-slidedeck
description: Use when the user asks to convert a Markdown document into a slide deck for the claude-code-ppt editor (e.g. "이 MD 슬라이드로 만들어줘", "make slides from this MD", "PPT로 변환"). Drives the deterministic SlidePlan → HTML pipeline so any MD + chosen template (presentation / portfolio / report) yields editor-compatible output of the same quality as design-patterns.html.
---

# md-to-slidedeck — Markdown → editor-shaped PPT deck

## Why this skill exists

The naïve path ("ask the LLM to write slide HTML") drifts every run — class names rot, `data-slot` slots get dropped, code-block chrome breaks. This skill enforces a **deterministic format-locked pipeline** so the agent's only creative job is *choosing what each slide says* — never how it is rendered.

The pipeline is fully documented in `docs/guide/AUTHORING_RULES.md` (single source of truth — read it before any large-scale change). This SKILL.md is the operational checklist.

## Core principle

> **You write a SlidePlan JSON. The deterministic renderer writes the HTML.**

You will never produce HTML directly. If you find yourself writing `<div class="...">`, stop — you are off-script.

## Inputs

The user provides:
- a Markdown file path (or content) — e.g. `docs/sample/디자인패턴.md`
- a **template choice**: `presentation` | `portfolio` | `report` (see "Template selection" below)
  - if absent, infer from content (see decision rules) and announce the choice
- optional output deck title

## Template selection

Same SlidePlan, different visual — **the markup is identical across templates; only `data-template` flips and CSS swaps the design tokens**. Pick by *intent*, not by content shape:

| Template | Use for | Visual identity | What gets emphasized |
|---|---|---|---|
| `presentation` | Code-heavy talks, tutorial decks, design-pattern walkthroughs (default) | Dark BG (#0F172A), amber accent (#F59E0B), monospace footer | Code blocks, comparison tables, two-col-code, callouts |
| `portfolio` | Personal/team intro decks, project showcases, case studies, narrative pitches | White BG (#FFFFFF), blue accent (#3D5AF1), serif-friendly | Hero titles, paragraph callouts, references, light table |
| `report` | Business reports, KPI dashboards, dense data slides | Warm cream BG (#FAFAF8), teal accent (#0F766E), 2px header underline + zebra rows | Tables, comparison-table, callout-summary KPI boxes, references |

**Inference rules (when user doesn't specify)**:

- Source MD has ≥ 3 fenced code blocks → `presentation`
- Source MD has ≥ 2 tables AND headings like "Q1/Q2", "KPI", "ROI", "매출", "지표", "성과" → `report`
- Source MD is mostly prose + ≥ 3 references → `portfolio`
- Otherwise → `presentation` (safest fallback)

> Never invent a template name outside the enum. The validator's `TEMPLATES` Set rejects anything else and the renderer's `data-template` attribute is what CSS selectors hook on — a typo means *no styling at all*.

## Procedure

### Step 1 — Read the contract

Read these files in order before authoring anything new:

1. `docs/guide/AUTHORING_RULES.md` — full pipeline spec
2. `src/generator/slidePlan.ts` — exact TypeScript types you must match (validator lives here)
3. `tests/generator/fixtures/sample-plan.json` — a working reference plan covering all 9 slide types

If any of those files are missing, **abort and report** — the pipeline is misconfigured.

### Step 2 — Read the source MD

Use the Read tool. If the file is huge (> 2000 lines), read in chunks. Track:
- top-level `#` headings (cover candidates)
- `##` / `###` headings (slide and sub-slide boundaries)
- code fences (note the language tag — Java/TS/Python/etc. all map to a `kind: 'code'` block; bash/sh or `$ ` prefix → `kind: 'terminal'`)
- tables, lists, links

### Step 2.5 — Compute baseline (anti silent-loss)

Before authoring, write down the counts that the rubric scores against. **This is the benchmark Step 5.5 will check.** If the agent silently truncates content (e.g., 8 list items → 6 because the validator caps at 6), the baseline catches it.

Record mentally (or as a comment in the plan):

| Element | Count |
|---|---|
| `#` headings (H1) | … |
| `##` headings (H2) | … |
| `###` headings (H3) | … |
| fenced code blocks (lang ∈ {ts, js, java, py, …}) | … |
| terminal-shaped code (lang ∈ {bash, sh} or starts with `$ `) | … |
| tables | … |
| `[text](href)` links | … |
| `---` thematic breaks | … |

Rule: **every counted item should map to *something* in the output.** A H2 may collapse into a sub-section of a single slide (acceptable, soft warning) but a code block silently dropped is a hard failure. Note any planned collapse so you can defend it to the user later.

### Step 3 — Author the SlidePlan JSON

Mental model: pick slide types from `SlideNode` such that the deck reads well at presentation pace. Rule of thumb: 8–14 slides for a 2,000–4,000 word doc, 18–30 for code-heavy docs.

Hard requirements (the validator will reject otherwise):
- `slides[0].type === 'cover'`
- every non-cover slide has a non-empty `title`
- `section.num` values are unique (use `"01"`, `"02"`, … padded)
- `references[].href` matches `^https?://`
- one code block per slide max — split long files
- bullet items ≤ 6 per slide, ≤ 60 chars per item

Soft requirements (good taste):
- start with `cover`, end with `references` if the source has external links
- one `section` divider before each numbered chapter
- prefer `two-col-code` (ratio 6-4) when a code listing has accompanying explanation
- callouts: `amber` = warning/insight, `blue` = note, `green` = tip — at most one per slide
- pure text fields are plain strings (no markdown, no HTML — the renderer escapes them)

Write the plan to `.tmp/slideplan-<sourceStem>.json`. Create `.tmp/` if it doesn't exist.

### Step 4 — Validate

Run:

```bash
node_modules/.bin/tsx scripts/slideplan.ts validate .tmp/slideplan-<sourceStem>.json
```

- Exit 0 + summary printout → proceed.
- Exit 1 + error list → **revise the JSON**, addressing every reported error in one pass. Do NOT play whack-a-mole — fix all errors, re-run validate, repeat. Cap retries at 3. If still failing, escalate to the user with the latest error list.

### Step 5 — Render

```bash
node_modules/.bin/tsx scripts/slideplan.ts render .tmp/slideplan-<sourceStem>.json
```

This emits a standalone deck HTML to `.quality-runs/slideplan/<sourceStem>.html`. Print the path so the user can `open` it.

### Step 5.5 — Coverage gate (anti silent-loss)

```bash
node_modules/.bin/tsx scripts/slideplan.ts score .tmp/slideplan-<sourceStem>.json docs/sample/<sourceStem>.md
```

The CLI runs the same 11-category rubric the automated quality loop uses (`src/generator/quality/{detector,scorer}.ts`) and exits non-zero when `ratio < 0.85`. Read the printed table:

- **PASS (ratio ≥ 0.85)** → proceed to Step 6.
- **FAIL** → identify the categories with `score: 0` or low score in the "Missed / low-coverage" section. Common causes:
  - `code` low → you split / dropped code fences. Re-author so every code fence in the MD becomes one `kind: 'code' | 'terminal'` block.
  - `table` low → table fields collapsed to bullets. Use the `comparison-table` slide type instead.
  - `text` low → you paraphrased instead of quoting; the probe-based check needs verbatim chunks. Quote at least the opening / middle / closing 80 chars verbatim.
  - `h2` low → you merged too aggressively. Split the slide.

Fix the plan, re-run validate → render → score. **Cap retries at 2.** If still failing, escalate to the user with the latest report.

### Step 6 — Optional: in-editor preview

The standalone HTML emitted by `render` is a quick visual check; it does **not** run `upgradeSlideCodeBlocks`, so code blocks lack shiki + macOS dots chrome. To get the full editor experience and have the deck show up in the library:

```bash
node_modules/.bin/tsx scripts/slideplan.ts publish .tmp/slideplan-<sourceStem>.json <deck-id> [--subtitle "..."]
```

- `<deck-id>` is the localStorage key — lowercase, dashes only, ≤ 64 chars (e.g. `claude-code-master-intro`). Must be unique among existing decks under `docs/html/<template>/`.
- The command writes `docs/html/<template>/<deck-id>.html` with `<title>` from `plan.meta.title` and (optional) `<meta name="subtitle">`. The registry's `import.meta.glob` picks the file up automatically — **no need to edit `src/library/deckRegistry.ts`**.
- Pass `--force` only when the user explicitly asks to overwrite an existing deck.

Prefer this command when the user says "에디터에서 열어줘" / "라이브러리에 추가해줘". Then tell them to restart `npm run dev`.

Direct edits to `src/library/deckRegistry.ts` are **only** needed when overriding the title or assigning a custom subtitle for a deck that lacks `<meta name="subtitle">`. Don't touch the registry for routine publishes.

## Definition of Done

Split into **Hard** (auto-abort if false) and **Soft** (report to user but proceed).

### Hard invariants

- [ ] `validate` exits 0 against the produced plan
- [ ] `render` exits 0 and writes a deck HTML
- [ ] `score` exits 0 (coverage ratio ≥ 0.85 — see Step 5.5)
- [ ] Every required slot (cover.title, section.num/title, references[].href, …) is non-empty in the plan
- [ ] No source code fence is silently dropped — count(code+terminal blocks in plan) ≥ count(fences in MD) measured at Step 2.5

### Soft invariants (report only)

- [ ] Slide count is within rule of thumb (8–14 / 18–30, see Step 3)
- [ ] Every code block in the plan has the correct `lang` (no `plaintext` for actual Java/TS code)
- [ ] No code block has `kind: 'code'` when the source is a `$ `-prefixed shell session — those are `kind: 'terminal'`
- [ ] H2 collapse rate ≤ 30% (you merged at most one in three; if more, surface why)
- [ ] You announced the rendered HTML path **and** the coverage ratio to the user

## What this skill does NOT do

- **Does not write HTML.** Ever.
- **Does not invent `Block.kind` or `SlideNode.type` values** outside the enums defined in `slidePlan.ts`.
- **Does not place images** — the editor handles image overlays; you only emit text/code.
- **Does not parse markdown frontmatter** (`---\n…\n---`). Current samples don't use it; treat any frontmatter as raw text inside the first `paragraph` block until/unless explicitly asked.

## Failure recovery

If the pipeline fails after 3 validate retries:
1. Stop autonomously fixing. Escalate.
2. Show the user: the last validation error list, the offending slide indexes, and a one-sentence diagnosis (e.g. "Slide 7 has a `comparison-table` whose row count doesn't match `headers.length`").
3. Do not delete `.tmp/slideplan-*.json` — it's the diagnostic artifact.

If `render` fails after `validate` succeeded, that's a renderer bug — read `src/generator/planRenderer.ts` and report which slide type is broken. Do NOT silently downgrade or re-author the plan to dodge the bug.

If `score` fails after `validate` + `render` succeeded (coverage ratio < 0.85):
1. Identify the missed categories from the report's "Missed / low-coverage" section.
2. Revise **only** the parts of the plan needed to restore those categories — don't rewrite the whole deck.
3. Re-run `validate` → `render` → `score`.
4. Cap at 2 score retries. After that, surface the latest report to the user with one of:
   - "MD에 X 개의 항목 (예: code blocks 25개) 이 있는데 슬라이드에는 N 개만 담겨 있습니다. 그대로 진행 / 추가 슬라이드 분할 / 일부 무시 중 결정해 주세요."
   - "Text coverage 가 낮습니다 — 본문을 단축 요약했기 때문입니다. 원문 verbatim 인용을 늘릴지, 그대로 진행할지 결정해 주세요."
**Never silently accept a sub-0.85 ratio. The user has explicitly asked us not to drop content.**

## Related files

- `docs/guide/AUTHORING_RULES.md` — full contract / system prompt template / 4-layer format-lock matrix
- `src/generator/slidePlan.ts` — types + `validateSlidePlan`
- `src/generator/planRenderer.ts` — deterministic HTML emitter (one `render*` per slide type)
- `scripts/slideplan.ts` — `validate` / `render` CLI entry points
- `tests/generator/planRenderer.test.ts` — invariant tests (run via `npx vitest run tests/generator/planRenderer.test.ts` after touching any of the above)
- `tests/generator/fixtures/sample-plan.json` — fixture covering all 9 slide types
