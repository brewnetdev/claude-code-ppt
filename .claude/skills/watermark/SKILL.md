---
name: watermark
description: >
  HTML 문서·슬라이드 데크에 브랜드 워터마크(cc-watermark)를 적용하거나 제거한다.
  기본 문구는 https://run-ai.kr 와 brewnet.dev@gmail.com 두 줄이며, JetBrains Mono
  44px · rgba(148,163,184,0.24) · -26° 회전으로 대각선 반복 배치된다. .slide 구조
  문서는 슬라이드마다, 그 외 흐르는 HTML은 화면 고정 레이어로 들어간다.
  Use when the user says "워터마크 넣어/빼줘", "watermark 적용", "이 문서에 브랜드
  워터마크", "워터마크 제거", or asks to brand/unbrand an HTML document or deck.
allowed-tools: Read, Bash(node:*), Bash(ls:*), Bash(grep:*), Bash(open:*)
---

# watermark — HTML 문서·데크 브랜드 워터마크

## 무엇을 하는가

지정한 HTML 파일에 브랜드 워터마크를 주입하거나 제거한다. 에디터의 Properties
워터마크 토글과 **동일한 스펙**(`src/watermark/watermark.ts`)을 쓰므로 결과가 일치한다.

- **데크**(`<div class="slide">` 존재): 슬라이드마다 절대배치 `cc-watermark` 스팬 삽입
- **흐르는 문서**(그 외 HTML): `<body>`에 `position:fixed` 워터마크 레이어 1개 삽입
- 멱등(idempotent): 실행 전 기존 워터마크를 먼저 제거하므로 중복 누적 없음

## 스펙 (단일 출처)

| 속성 | 값 |
|---|---|
| 폰트 | `'JetBrains Mono', monospace` |
| 크기 | `44px` |
| 색 | `rgba(148,163,184,0.24)` |
| 회전 | `rotate(-26deg)` |
| 기본 문구 | `https://run-ai.kr`, `brewnet.dev@gmail.com` |

스펙을 바꿔야 하면 `src/watermark/watermark.ts`(앱)와 이 스킬의
`scripts/apply-watermark.js`를 **함께** 수정한다.

## 사용법

```bash
# 적용 (기본 문구)
node .claude/skills/watermark/scripts/apply-watermark.js docs/html/manual/menual-dark.html

# 제거
node .claude/skills/watermark/scripts/apply-watermark.js path/to/file.html --off

# 사용자 지정 문구 (| 로 구분, 한 줄씩)
node .claude/skills/watermark/scripts/apply-watermark.js file.html --lines "https://run-ai.kr|brewnet.dev@gmail.com|© 2026"

# 여러 파일 일괄
node .claude/skills/watermark/scripts/apply-watermark.js docs/html/report/*.html
```

## 동작 순서

1. 대상 파일을 확인한다 (사용자가 경로를 안 줬으면 어떤 파일인지 묻는다).
2. 적용/제거/문구를 정한다. 기본은 적용 + 브랜드 기본 문구.
3. 위 스크립트를 실행한다 (파일을 **제자리에서 덮어쓴다** — 원본 보존이 필요하면 먼저 복사).
4. `grep -c cc-watermark <file>` 로 적용 개수를 확인해 보고한다.

## 주의

- 파일을 **제자리 수정**한다. 되돌리려면 git 또는 `--off`.
- 워터마크는 anti-ai-slop 표준의 "배경 워터마크 금지"에 대한 **명시적 브랜드 예외**다
  (강의 자료 브랜딩 용도). 일반 콘텐츠 장식으로 남용하지 않는다.
- `<script>` 실행이나 레이아웃을 건드리지 않는다 (스팬/레이어는 `pointer-events:none`).
