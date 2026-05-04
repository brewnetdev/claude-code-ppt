# MD → PPT HTML 변환 룰

이 문서는 "Markdown 한 장을 받아서 `design-patterns.html` 수준의 편집기 호환 PPT
HTML을 만든다"는 작업의 결정론적 계약(contract)을 정의한다.

핵심 원리는 한 줄이다.

> **LLM은 HTML을 작성하지 않는다. 슬라이드 계획(JSON)만 작성한다.
> HTML은 결정론적 렌더러가 그 계획에서 만든다.**

## 1. 파이프라인

```
docs/sample/*.md
  │
  │  parseMarkdown (mdast)        — 결정론적 / 코드
  ▼
  raw outline (heading tree, code fences, tables, links)
  │
  │  Author LLM call              — 비결정론 / "슬라이드 의도" 결정
  │   in: outline + AUTHORING_RULES.md (this file)
  │   out: SlidePlan JSON
  ▼
  SlidePlan
  │
  │  validate(SlidePlan)           — 결정론적 / Zod or hand-rolled
  │   on fail → 재시도 (with diff)
  ▼
  SlidePlan (verified)
  │
  │  renderPlan(plan, template)    — 결정론적 / 코드
  │   src/generator/planRenderer.ts
  ▼
  ParsedSlide[] (HTML strings, editor-shape)
  │
  │  upgradeSlideCodeBlocks        — 결정론적 / 이미 존재
  │   shiki + .code-dots stamping
  ▼
  ParsedSlide[] (final)
  │
  │  loadDeck → 에디터 표시
  ▼
  사용자가 우측 PropertiesPanel에서 추가 편집
```

LLM이 잘못 출력해도 (1) 스키마 검증에서 거르고, (2) 검증을 통과한 JSON은
렌더러가 항상 같은 HTML 모양을 찍어내므로 — **editor 호환성이 LLM 품질과
독립적으로 보장된다.**

## 2. SlidePlan 스키마

`src/generator/slidePlan.ts` 가 export 하는 타입과 1:1 매칭. LLM에게 줄 때는
TypeScript 타입 정의를 그대로 인용하면 가장 단단하다 (코드 모델은 TS 문법을
잘 따른다).

```ts
export type SlidePlan = {
  meta: {
    title: string;        // 데크 제목 (cover에 사용)
    subtitle?: string;
    chapter?: string;     // 예: "CHAPTER 07 · DESIGN PATTERN"
    deco?: string;        // 큰 장식 숫자/문자 (cover의 .cover-deco)
    sourceFile: string;   // 원본 MD 파일명
  };
  template: 'presentation' | 'portfolio' | 'report';
  slides: SlideNode[];
};

export type SlideNode =
  | { type: 'cover'; title: string; subtitle?: string; meta?: MetaItem[] }
  | { type: 'section'; num: string; title: string; caption?: string }
  | { type: 'title-body'; title: string; label?: string; subtitle?: string; blocks: Block[] }
  | { type: 'title-bullets'; title: string; label?: string; subtitle?: string; bullets: string[] }
  | { type: 'title-code'; title: string; label?: string; subtitle?: string; code: CodeBlock }
  | { type: 'two-col-code'; title: string; label?: string; ratio?: '6-4' | '4-6' | '5-5'; left: Block[]; right: Block[] }
  | { type: 'comparison-table'; title: string; label?: string; headers: string[]; rows: string[][] }
  | { type: 'callout-summary'; title: string; label?: string; lead?: string; callouts: Callout[] }
  | { type: 'references'; title: string; links: { text: string; href: string }[] };

export type MetaItem = { label: string; value: string };

export type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbered'; items: string[] }
  | { kind: 'code'; lang: SupportedLang; source: string }
  | { kind: 'terminal'; source: string }
  | { kind: 'callout'; tone: CalloutTone; icon?: string; title?: string; body: string }
  | { kind: 'badges'; items: { label: string; tone: BadgeTone }[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

export type CodeBlock = { lang: SupportedLang; source: string };
export type SupportedLang = 'java' | 'typescript' | 'javascript' | 'tsx' | 'jsx'
  | 'python' | 'bash' | 'shell' | 'json' | 'yaml' | 'html' | 'css'
  | 'markdown' | 'plaintext';
export type CalloutTone = 'amber' | 'blue' | 'green';
export type BadgeTone = 'amber' | 'blue' | 'green' | 'red' | 'gray';
export type Callout = { tone: CalloutTone; icon?: string; title?: string; body: string };
```

## 3. 작성자(LLM) 시스템 프롬프트

아래 프롬프트가 LLM에게 들어간다. 사용자가 바꾸는 건 **MD 본문 + 템플릿
선택**뿐이다. 룰 자체는 고정.

````
You are a slide author for the *claude-code-ppt* editor. You receive a Markdown
document and must produce a JSON plan that the deterministic renderer will
turn into editor HTML. You do NOT write HTML.

OUTPUT
======
Reply with ONLY a single JSON object that conforms to the SlidePlan TypeScript
type below. No prose, no markdown fences around the JSON, no comments.

```ts
<paste the SlidePlan + Block + … types from §2 here>
```

DESIGN GOALS
============
- Aim for 8–14 slides for a 2,000–4,000 word doc, 18–30 for code-heavy docs.
- Always lead with one `cover` slide and end with `references` if the source
  has external links.
- For each major section (`##` or top-level concept), add a `section` divider
  before its content slides. Number them "01", "02", … with leading zero.
- Prefer `two-col-code` (ratio 6-4) when there is a code listing AND
  explanatory prose for it. Code goes left, explanation right.
- A single slide carries at most ONE code block. Split long files across
  multiple slides with `(이어서)` or step labels in the title.
- Bullets: ≤ 6 items per slide; concise (≤ 60 chars per item).
- Tables: ≤ 5 columns, ≤ 8 rows. If larger, split into multiple slides.
- Callouts: use `amber` for "core insight / warning", `blue` for "note /
  context", `green` for "tip / success". Pick at most one per slide.

LANGUAGE DETECTION
==================
- Java code → `lang: 'java'`. shiki bundle includes it.
- Console output / log lines / non-code → `lang: 'plaintext'`.
- Shell sessions starting with `$ ` → use `kind: 'terminal'` (NOT 'code').
- Unknown → `'plaintext'` (never invent a language).

ABSOLUTE RULES
==============
- All text fields are plain strings. No HTML tags, no markdown syntax inside
  strings (the renderer escapes them). Use newlines (`\n`) inside `code.source`.
- Every slide MUST have a non-empty `title` (except `cover` which uses
  `meta.title`).
- `cover.subtitle`, `section.caption`, etc. are optional but recommended.
- `references.links[i].href` MUST be a valid http(s) URL.
- Do not reference image assets — image overlays are added later in the editor.

INPUT
=====
Template: <one of presentation / portfolio / report>
Source filename: <e.g. 디자인패턴.md>
Markdown:
<the raw MD>

Begin output now.
````

## 4. 포맷을 고정하는 4중 잠금

LLM 출력은 본질적으로 흔들리므로, 다음 4겹의 검증을 거쳐 *항상 같은 모양의
HTML이 나온다는 것*을 보장한다.

| 층 | 위치 | 검증 내용 | 실패 시 |
|---|---|---|---|
| **1. JSON 스키마** | `validateSlidePlan(plan)` | type union 일치, 필수 필드, lang/tone enum | LLM 재호출 (전체 1회) |
| **2. 의미 게이트** | 같은 함수 | 슬라이드 1개 이상, cover가 0번 인덱스, 동일 num의 section 중복 없음, 모든 references href 유효 | LLM 재호출 (diff 보강) |
| **3. 결정론적 렌더링** | `renderPlan(plan)` | 슬라이드 type → HTML pattern. data-slot/footer/template attr은 코드 상수 | 불가능 (코드 경로) |
| **4. 에디터 게이트** | `runGates(html)` (이미 존재) | parse roundtrip, 모든 슬라이드 title 비어있지 않음, 코드/터미널 블록 addressable, cover decoration 존재 | 코드 버그 → 핫픽스 |

Layer 3·4가 **HTML 모양 자체를 고정**한다. Layer 1·2가 그 코드 경로에 **올바른
입력만 들어가도록** 한다. 이 두 보장이 합쳐져서 "MD가 어떻게 바뀌어도
출력 PPT는 design-patterns.html과 동일한 구조"라는 명제가 성립한다.

### 4.1 `validateSlidePlan`

```ts
// src/generator/slidePlan.ts
export function validateSlidePlan(raw: unknown): { ok: true; plan: SlidePlan } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  // 1. shape
  if (typeof raw !== 'object' || raw === null) return { ok: false, errors: ['plan is not an object'] };
  const r = raw as Record<string, unknown>;
  if (typeof r.template !== 'string' || !['presentation','portfolio','report'].includes(r.template))
    errors.push('template must be presentation|portfolio|report');
  if (!Array.isArray(r.slides) || r.slides.length === 0)
    errors.push('slides must be a non-empty array');
  // 2. semantics
  const slides = (r.slides ?? []) as SlideNode[];
  if (slides[0]?.type !== 'cover') errors.push('first slide must be type=cover');
  const sectionNums = slides.filter((s): s is Extract<SlideNode, { type: 'section' }> => s.type === 'section').map((s) => s.num);
  if (new Set(sectionNums).size !== sectionNums.length) errors.push('duplicate section.num');
  for (const s of slides) {
    if (s.type !== 'cover' && (!('title' in s) || !s.title?.trim())) errors.push(`slide.title empty (${s.type})`);
    if (s.type === 'references') {
      for (const l of s.links) {
        if (!/^https?:\/\//.test(l.href)) errors.push(`bad href: ${l.href}`);
      }
    }
  }
  return errors.length === 0 ? { ok: true, plan: raw as SlidePlan } : { ok: false, errors };
}
```

### 4.2 `renderPlan` (HTML 모양을 박는 곳)

설계는 단순한 dispatch.

```ts
export function renderPlan(plan: SlidePlan): ParsedSlide[] {
  const total = plan.slides.length;
  return plan.slides.map((node, i) => {
    const html = renderSlide(node, i, total, plan.meta);
    const title = extractTitle(node);
    return { id: `${plan.template}-${i + 1}`, html, title };
  });
}

function renderSlide(node: SlideNode, idx: number, total: number, meta: SlidePlan['meta']): string {
  const inner = (() => {
    switch (node.type) {
      case 'cover':              return renderCover(node, meta);
      case 'section':            return renderSection(node);
      case 'title-body':         return renderTitleBody(node);
      case 'title-bullets':      return renderTitleBullets(node);
      case 'title-code':         return renderTitleCode(node);
      case 'two-col-code':       return renderTwoColCode(node);
      case 'comparison-table':   return renderTable(node);
      case 'callout-summary':    return renderCalloutSummary(node);
      case 'references':         return renderReferences(node);
    }
  })();
  return wrapSlide({ template: 'presentation', innerHtml: inner, pageNum: idx + 1, totalPages: total });
}
```

각 `render*` 함수는 `design-patterns.html`의 해당 슬라이드 패턴을 그대로 쓴다.
예를 들어 `renderCover`는 다음 모양을 늘 만든다:

```html
<div class="slide-cover">
  <div class="cover-deco">${deco}</div>
  <div class="cover-level">${chapter}</div>
  <div class="t-hero" data-slot="title">${title}</div>
  <div class="cover-subtitle" data-slot="subtitle">${subtitle}</div>
  <div class="cover-meta">
    ${metaItems.map(m => `<div class="cover-meta-item"><span class="label">${m.label}</span>${m.value}</div>`).join('')}
  </div>
</div>
```

LLM이 `cover.deco`에 무엇을 넣든 — `"07"` 이든 `"GoF"` 이든 — *바깥 마크업과
data-slot 위치는 변하지 않는다.*

### 4.3 게이트 통합

기존 `src/generator/quality/gates.ts` 의 `runGates(html, slides, ...)` 가 이미
parse-roundtrip / data-slot / data-block-id / cover-decoration 를 검사한다.
`renderPlan` 출력을 그대로 흘려넣어 마지막 안전망으로 쓴다. 게이트가 실패하면
**렌더러 버그**이지 LLM 문제가 아니므로 코드 픽스 대상이다.

## 5. 재시도 전략

```
1차: parseMarkdown → LLM(plan) → validateSlidePlan
  - PASS → 4단계로 진행
  - FAIL → 2차 (errors[] 를 프롬프트 끝에 붙여 재호출)

2차: 같은 호출, 추가 시스템 메시지:
  "Your previous JSON failed validation. Errors:
     - <error 1>
     - <error 2>
   Re-emit the entire SlidePlan, fixing only these issues."
  - PASS → 진행
  - FAIL → 3차 / 또는 사람에게 escalate

총 시도 ≤ 3회. 게이트 4 (HTML 검사) 는 내부적으로 결정론이라 통상 1회면 끝.
```

## 6. 새 데크 추가 흐름

1. `docs/sample/foo.md` 작성
2. 라이브러리 화면 → MD 업로드 + 템플릿 선택 → "Generate"
3. 위 파이프라인이 백그라운드에서 돈다 (스피너 표시, 일반 4–10초)
4. 통과 시 자동으로 에디터 진입, 실패 시 에러 토스트 + 사람이 손볼 지점 안내

이때 사용자가 추가 편집을 해도 결과가 깨지지 않는 이유:
- 모든 슬라이드가 `data-slot` 계약을 지키므로 PropertiesPanel이 정상 동작
- 코드블럭은 `upgradeSlideCodeBlocks` 가 shiki+chrome stamp 후 `data-code-source`
  로 라운드트립 가능
- localStorage 저장은 deck-id-scoped 라 다른 데크에 영향 없음

## 6.5 템플릿별 작성 규약

같은 SlidePlan이지만 `meta.template`에 따라 CSS가 디자인 토큰을 스왑한다. 마크업은 동일하므로 LLM이 다르게 구성할 필요는 없다 — 다만 **각 템플릿의 강점을 살리는 슬라이드 타입 분포**가 다르다.

### `presentation` (default — 코드/튜토리얼)

- 다크 톤 (`#0F172A` BG, `#F59E0B` 앰버 포인트). 코드 블록의 검정 배경이 자연스럽게 녹는다.
- 권장 슬라이드 분포: cover · section · `title-code` 다수 · `two-col-code` · `comparison-table` · `callout-summary` · references
- 콜아웃은 `amber`(인사이트), `blue`(노트), `green`(팁)을 자유롭게 — 다크 BG에 발광하듯 보인다
- 한 슬라이드에 `title-code` + 콜아웃 = 강한 패턴 (`design-patterns.html` 톤)

### `portfolio` (자기소개·프로젝트 쇼케이스·내러티브 피치)

- 라이트 톤 (`#FFFFFF` BG, `#3D5AF1` 블루 포인트). 코드 블록은 다크로 유지(가독성) — 흰 카드 위 어두운 코드 박스가 강조 역할.
- 권장 분포: cover(블루 BG) · `title-body` 위주 · `title-bullets` · `references` 끝맺음
- **피해야 할 패턴**:
  - `comparison-table` 4행 × 5열 같은 빽빽한 표 → 라이트 BG + 얇은 보더가 시각적으로 약함. 표가 필요하면 ≤ 3열로 압축
  - `two-col-code` 양쪽 모두 코드 → 흰 BG에 다크 박스 두 개가 비주얼 무게를 가져감. 한쪽은 `paragraph`/`bullets`로 균형
  - `callout-summary` 3개 풀로딩 → 라이트 BG에서 콜아웃 대비가 약하므로 슬라이드당 ≤ 1
- **선호 패턴**:
  - cover의 `subtitle`을 인용구처럼 길게(2~3줄) — 블루 BG에 흰 텍스트가 표지처럼 작동
  - `title-bullets`에 `sub` 필드(설명 한 줄)를 적극 활용 — 산문 톤이 살아남
  - references를 마지막 슬라이드로 — 산문 발표의 자연스러운 마무리

### `report` (웜 크림 BG + 티얼 액센트, 표 강조)

- **회피 패턴**:
  - fenced code blocks 다수 → presentation으로 옮길 것 (report의 코드블럭은 다크 박스로 유지되어 무게가 큼)
  - `two-col-code` → 동일 이유. 표/콜아웃에 자리를 양보
  - `cover`에 deco 과다 → 슬레이트 다크 BG라 텍스트 대비를 우선
- **선호 패턴**:
  - `comparison-table` 다수 — 헤더 2px 티얼 언더라인 + zebra 행으로 데이터가 가장 읽기 쉬움
  - `callout-summary`를 KPI 카드 용도로 — `amber` (티얼) = 핵심 지표, `green` = positive metric, `blue` = neutral context
  - `title-bullets`의 `sub` 필드를 metric 단위·기간 표기로 활용 (예: "전년 대비 +18%, Q1 기준")
  - references를 마지막 슬라이드로 — 데이터 출처 명시

## 7. 안 하는 것 (Out of Scope)

- LLM이 직접 HTML 작성 — 절대 금지. 6장의 SlidePlan만 작성.
- 슬라이드 내부에서 임의 클래스 사용 — `Block.kind` enum에 없는 것은 거절.
- 이미지 자동 배치 — 텍스트/코드만. 이미지는 에디터에서 사용자가 추가.
- 한 슬라이드에 코드블럭 2개 이상 — 무조건 분할.
- markdown frontmatter (`---\n…\n---`) 해석 — 현재 sample들은 사용 안 함.

## 8. 점진적 도입 순서

1. `src/generator/slidePlan.ts` — type 정의 + validator
2. `src/generator/planRenderer.ts` — `renderSlide*` 함수들 (위 dispatch)
3. `src/generator/llm/authorPlan.ts` — Anthropic SDK 호출 래퍼 (재시도 포함)
4. `src/generator/pipeline.ts` 의 generateOnce 를 새 경로로 교체
5. `scripts/run-quality-loop.ts` 의 3개 샘플로 회귀 — 모두 PASSED 받아낼 때까지
   `renderSlide*` 또는 룰 보강

이 순서로 가면 기존 (mechanical adapter) 경로를 켜둔 채 새 경로를 옆에서
키울 수 있고, 기존 게이트가 그대로 보호망이 된다.
