---
name: md-to-slidedeck
description: Use when the user asks to convert a Markdown document into an editable Brewnet PPT slide deck (e.g. "이 MD 슬라이드로 만들어줘", "MD를 PPT로 변환해줘", "make slides from this MD"). Drives the deterministic Brewnet PPT pipeline (server.js → runMappingAgent → injectMapping) so any MD + chosen template yields editor-compatible HTML with full content coverage and zero silent loss.
---

# md-to-slidedeck — Markdown → Brewnet PPT 에디터 슬라이드

## Why this skill exists

자유로운 Markdown 입력에서 슬라이드를 "직접 생성"하면 매번 결과물이 흔들립니다. 클래스 이름이 어긋나고, `data-slot` 어노테이션이 빠지고, 코드 블록 크롬이 깨집니다. 이 스킬은 **결정론적 파이프라인을 호출**해서 그 위험을 제거합니다 — Claude는 *무엇이 들어가야 하는지*만 결정하고, *어떻게 렌더링할지*는 절대 결정하지 않습니다.

## Core principle

> **Claude는 HTML을 직접 쓰지 않습니다. `POST /api/generate`만 호출합니다.**
>
> `<div class="slide">` 같은 HTML을 작성하고 있다면, 잘못된 길로 들어선 것입니다. 즉시 멈추고 이 스킬로 돌아오세요.

전체 파이프라인은 다음과 같습니다:

```
사용자 MD
    ↓
[Step 1] registry.json 로드 → templateId 선택/검증
    ↓
[Step 2] POST /api/generate { mdText, templateId }
    ↓ (서버 내부)
    ├─ runMappingAgent (Qwen2.5-Coder, MD_MAPPING.md skill)
    │   → { slides, unmapped[], overflow[], confidence }
    └─ injectMapping (JSDOM, 결정론적)
    ↓
[Step 3] 응답 검증 (커버리지 불변식)
    ↓
[Step 4] 사용자에게 결과 + 미매핑/누락 리포트 전달
```

## Inputs

사용자는 다음을 제공합니다:
- Markdown 파일 경로 또는 본문 텍스트
- (선택) `templateId` — `registry.json`의 `templates` 키 중 하나
- (선택) 데크 제목

명시되지 않으면 추론(아래 "Template selection") 후 사용자에게 알립니다.

## Step 0 — 사전 준비 (반드시 먼저)

다음을 순서대로 확인합니다. 하나라도 실패하면 즉시 abort하고 사용자에게 보고합니다.

### 0.1 — 필수 파일 존재 확인

```bash
test -f registry.json    # 템플릿 스키마
test -f server.js         # API 서버
test -f injector.js       # DOM 주입기
test -f core.js           # AI 호출 + 검증 로직
test -f MD_MAPPING.md     # MD → 슬롯 매핑 규칙
test -f package.json
```

> 실제 프로젝트 구조에서는 위 파일들이 루트 또는 `agent/` 아래에 있을 수 있습니다. `package.json`의 `main` 필드와 `core.js`의 `require` 경로를 우선 신뢰하세요.

### 0.2 — 서버 헬스체크

```bash
curl -s http://localhost:3000/api/health
```

기대 응답:
```json
{ "server": "ok", "ollama": { "ok": true, "hasModel": true }, "presentations": <number> }
```

서버가 죽어 있으면:
1. 사용자에게 `npm start` 실행을 요청합니다.
2. Ollama가 죽어 있으면 `ollama pull qwen2.5-coder:32b`를 안내합니다.
3. **서버 없이 LLM으로 HTML을 직접 생성하지 마세요.** 그 길은 결정론을 깹니다.

### 0.3 — 템플릿 목록 캐싱

```bash
curl -s http://localhost:3000/api/templates
```

응답에서 사용 가능한 `id` 집합 `T`를 얻습니다. Step 2의 `templateId`는 반드시 `T`에 속해야 합니다.

## Step 1 — Template selection

`registry.json`이 권위 있는 enum입니다. 사용자가 명시하지 않으면 아래 추론 규칙을 사용하고, **최종 선택을 사용자에게 announce**합니다 (자의적으로 결정하지 마세요).

### 1.1 — 사용자가 명시한 경우

`templateId`가 `T`에 있으면 그대로 사용. 없으면 가장 가까운 후보 3개를 제안하고 멈춥니다.

### 1.2 — 추론 규칙 (사용자 미명시 시)

다음을 위에서 아래로 평가하고, 처음 매칭되는 것을 선택:

| 입력 MD 특징 | 선택 templateId |
|---|---|
| ` ```chart ` 코드블록 ≥ 1 OR 표 ≥ 2 + 한국어 KPI 패턴 (`**숫자%** 라벨`) | `pidori-report-template` 계열 (있는 경우), 없으면 `brewnet-dark` |
| 카드 패턴 (`- **제목**: 설명`) ≥ 3 | `brewnet-dark`의 `three-cards` 슬라이드 활용 |
| H1 1개 + 긴 prose + 외부 링크 ≥ 3 | `portfolio-template` (있는 경우), 없으면 `brewnet-light` |
| 펜스드 코드 블록 ≥ 3 (Java/TS/Python 등) | `brewnet-dark` (코드 친화 다크 테마) |
| 그 외 모든 경우 | `brewnet-dark` (안전한 기본값) |

**중요**: 위 표에 없는 템플릿 이름을 만들어내지 마세요. `registry.json`에 정의된 ID만 유효합니다.

### 1.3 — 선택 announce

```
선택된 템플릿: brewnet-dark (이유: 한국어 KPI 패턴 + 카드 3개 감지)
```

## Step 2 — MD 사전 분석 (커버리지 베이스라인)

API를 호출하기 **전에** 입력 MD에서 "보존되어야 할 의미 단위"를 카운트합니다. 이게 Step 3의 검증 기준이 됩니다.

```javascript
const baseline = {
  h1Count:        // # 헤딩 개수
  h2Count:        // ## 헤딩 개수
  h3Count:        // ### 헤딩 개수
  listItemCount:  // 모든 - / * 항목
  codeBlockCount: // ``` ~ ``` 펜스 개수 (chart 포함)
  imageCount:     // ![alt](url) 개수
  linkCount:      // [text](url) 개수 (이미지 제외)
  kvLineCount:    // `key: value` 형식 줄
};
```

이 카운트를 출력에 표시하지는 않지만 메모리에 보관합니다. **이게 사용자께서 강조하신 "내용 누락 방지"의 측정 기반입니다.**

## Step 3 — API 호출

```bash
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg md "$(cat path/to/source.md)" \
              --arg tid "brewnet-dark" \
              '{mdText: $md, templateId: $tid}')"
```

또는 Node 환경:
```javascript
const res = await fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mdText, templateId })
});
const { id, html, mapping, stats } = await res.json();
```

응답 스키마:
```json
{
  "id":   "uuid",
  "html": "<!DOCTYPE html>...",
  "mapping": {
    "templateId": "brewnet-dark",
    "confidence": 0.92,
    "slides":   { "<slideId>": { "<slot>": "<value>" }, ... },
    "unmapped": [{ "slideId": "...", "slot": "...", "reason": "..." }],
    "overflow": [{ "slideId": "...", "slot": "...", "dropped": "..." }]
  },
  "stats": { "elapsed": "12.3s", "filled": 24, "unmapped": 1, "skipped": 0 }
}
```

> 서버 내부에서 이미 2-pass self-check + 최대 3회 재시도가 일어납니다 (`core.js`의 `withRetry`). 클라이언트에서 별도 재시도하지 않습니다 — 서버가 실패하면 진짜 실패한 것입니다.

## Step 4 — 커버리지 검증 (Definition of Done)

다음 **모든** 항목이 참이어야 작업 완료로 봅니다. 하나라도 거짓이면 사용자에게 즉시 보고하고 결정을 받습니다.

### 4.1 — Hard invariants (자동 abort)

- [ ] HTTP 응답이 200이고 `id`, `html`, `mapping`이 모두 존재
- [ ] `mapping.confidence >= 0.80`
- [ ] `mapping.overflow.length === 0`
  - overflow가 0이 아니면 → **콘텐츠 절단 발생**. 사용자에게 "X개 항목이 슬라이드 용량을 초과했습니다. 표시할까요, 슬라이드 분할할까요, 무시할까요?" 결정을 받습니다.
- [ ] 모든 슬라이드의 `required: true` 슬롯이 빈 문자열이나 `"UNMAPPED"`가 아님

### 4.2 — Coverage check (Step 2 baseline 대비)

- [ ] H1 카운트의 100%가 어떤 슬라이드의 `title` 슬롯에 등장
- [ ] 코드블록 카운트의 100%가 결과 HTML에 보존 (등장 횟수 비교)
- [ ] 이미지 URL 100%가 결과 mapping의 image 타입 슬롯에 보존
- [ ] H2/H3 누락률 ≤ 20% (의미상 통합될 수 있음, 단 사용자 보고 필수)

검증 로직 예시:
```javascript
function verifyCoverage(baseline, mapping, html) {
  const issues = [];
  
  // H1 보존
  const titlesInOutput = Object.values(mapping.slides)
    .map(s => s.title).filter(Boolean);
  if (titlesInOutput.length < baseline.h1Count) {
    issues.push(`H1 누락: 입력 ${baseline.h1Count}개 → 출력 ${titlesInOutput.length}개`);
  }
  
  // 코드블록 보존 (HTML에서 <pre> 또는 <code> 카운트)
  const codeMatches = (html.match(/<pre[\s>]|<code[\s>]/g) || []).length;
  if (codeMatches < baseline.codeBlockCount) {
    issues.push(`코드블록 누락: 입력 ${baseline.codeBlockCount}개 → 출력 ${codeMatches}개`);
  }
  
  return issues;
}
```

### 4.3 — Soft warnings (사용자 보고만)

- `mapping.unmapped.length > 0` → 어떤 슬롯이 비었는지 표로 정리해 보여줍니다 (UI에서 빨간 점선으로 표시되긴 하지만 명시적 보고가 안전)
- `mapping.confidence < 0.90` → "AI가 매핑 품질에 자신 없어 합니다. 수동 검토를 권장합니다."

## Step 5 — 사용자에게 결과 전달

다음 정보를 함께 표시합니다:

```
✅ 슬라이드 생성 완료

URL:        http://localhost:3000/api/presentations/<id>
미리보기:    http://localhost:3000/api/presentations/<id>/html
에디터:      editor.html (열어서 ID <id> 입력)

통계:
  - 생성 시간:    12.3s
  - 채워진 슬롯:  24개
  - 미매핑 슬롯:  1개 (cover.eyebrow — 원본에 카테고리 정보 없음)
  - 절단된 항목:  0개
  - AI 신뢰도:    0.92

미매핑 상세:
  | 슬라이드      | 슬롯       | 사유                       |
  |--------------|-----------|---------------------------|
  | cover        | eyebrow   | 원본 MD에 카테고리 정보 없음 |
```

## Failure recovery

### 시나리오별 복구

**서버가 죽음** → 사용자에게 `npm start` 안내 + 1회만 재호출

**Ollama 타임아웃** → 서버 로그 확인 안내 + 모델 사이즈 다운그레이드 옵션 제안 (`qwen2.5-coder:14b`)

**`mapping.confidence < 0.50`** → 입력 MD가 너무 모호함을 사용자에게 알리고, 다음 중 하나를 제안:
1. MD에 `<!-- slide: ID -->` 주석을 추가해 슬라이드 경계를 명시
2. 다른 templateId로 재시도
3. MD를 더 작은 단위로 분할

**`overflow.length > 0`** → **자동으로 무시하지 마세요.** 사용자께서 명시한 "내용 누락 금지" 원칙과 직접 충돌합니다. 다음을 표시하고 결정을 받습니다:
```
⚠️ 다음 항목이 슬라이드 용량 초과로 절단되었습니다:

| 슬라이드      | 슬롯   | 절단된 내용              |
|--------------|--------|------------------------|
| three-cards  | cards  | "4번째 항목\n5번째 항목" |

선택지:
[A] 슬라이드를 추가해서 보존 (template에 추가 카드 슬라이드 있는 경우만)
[B] 사용자가 직접 MD를 수정해서 재실행
[C] 절단을 수용하고 진행
```

**Coverage check 실패 (Step 4.2)** → 절대 silent하게 진행하지 마세요. 어떤 항목이 누락되었는지 명시하고 사용자 결정을 받습니다.

## What this skill does NOT do

- **HTML을 직접 작성하지 않습니다.** `<div class="slide">` 같은 텍스트를 출력하는 순간 잘못된 길입니다.
- **`registry.json`에 없는 templateId를 만들지 않습니다.**
- **재시도를 클라이언트에서 하지 않습니다** (서버가 이미 함).
- **`overflow`나 `unmapped`를 silent하게 무시하지 않습니다** — 항상 사용자에게 보고합니다.
- **이미지/차트 데이터를 손실시키지 않습니다.** 매핑 실패 시 그 사실을 보고합니다.
- **Markdown frontmatter (`---` 블록)를 무시하지 않습니다.** `templateId`, `theme` 같은 메타데이터로 활용 가능. 단, `MD_MAPPING.md`에 frontmatter 처리 규칙이 추가되기 전까지는 frontmatter 본문을 첫 번째 paragraph로 취급합니다.

## Related files (실제 프로젝트 SSoT)

- `registry.json` — 템플릿/슬롯 enum의 권위 있는 정의. 새 템플릿 추가 시 여기 먼저.
- `MD_MAPPING.md` — Markdown → 슬롯 매핑 규칙 (Qwen에게 주입되는 시스템 프롬프트)
- `TEMPLATE_GEN.md` — 새 템플릿 HTML 생성 규칙 (Agent C용)
- `core.js` — `runMappingAgent`, `runTemplateGenAgent`, `withRetry`, `validateMapping`
- `injector.js` — JSDOM 기반 결정론적 DOM 주입기
- `server.js` — Express API. `/api/generate`가 메인 엔드포인트.
- `editor.html` — 생성된 데크의 인터랙티브 편집 UI
- `templates/` 디렉토리 — 각 templateId별 HTML 파일 (registry의 `file` 필드 참조)

## Quick reference — API 엔드포인트

| Method | Path | 용도 |
|--------|------|------|
| GET    | `/api/health` | 헬스체크 |
| GET    | `/api/templates` | 템플릿 목록 |
| POST   | `/api/generate` | **MD → 슬라이드 생성 (메인)** |
| GET    | `/api/presentations/:id` | 저장된 프레젠테이션 조회 |
| GET    | `/api/presentations/:id/html` | HTML만 |
| PATCH  | `/api/presentations/:id/slides/:slideId/slots/:slotName` | 슬롯 편집 |
| GET    | `/api/presentations` | 전체 목록 |
| POST   | `/api/templates/generate` | 새 템플릿 생성 (Agent C) |

## 한국어 콘텐츠 처리 노트

- 한글은 영문 대비 글자당 정보 밀도가 높아, registry의 `maxItems` / 슬롯 길이 제약이 더 빨리 차오릅니다. overflow 발생 시 한국어 입력에서는 특히 주의 깊게 보고하세요.
- KPI 패턴: `**+34%** 유기적 트래픽`처럼 한글 라벨이 일반적입니다. `MD_MAPPING.md`의 정규식이 이를 처리합니다.
- Placeholder 텍스트는 한글 대괄호 표기 `[제목]` `[부제목]` 사용 (영어 대괄호 `[Title]`이 아님).
