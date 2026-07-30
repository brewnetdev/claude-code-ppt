---
name: html-toc
description: >
  HTML 문서(가이드·레퍼런스류)의 목차(TOC)를 만들거나 고칠 때 발동. 앵커 id 부여,
  href↔id 정합 검증, 그리고 run-ai.kr 같은 SPA 사이트 임베드 시 해시 클릭이
  라우터에 가로채여 크래시하는 문제(rehydrate TypeError)를 막는 가드 삽입까지.
  Use when the user says "목차 앵커 수정", "목차 클릭이 안 돼/에러 나",
  "run-ai에 올릴 목차", "TOC 만들어줘", or an uploaded HTML doc's TOC misbehaves.
allowed-tools: Read, Edit, Write, Bash(python3:*), Bash(node:*), Bash(grep:*)
---

# HTML 목차(TOC) 제작·수정

## 목표·제약 (절차 강요 아님 — 결과 기준)

1. **모든 목차 링크는 `href="#id"` ↔ 문서 내 `id` 1:1** — 깨진 앵커 0개.
2. **SPA 임베드에서도 클릭이 문서 안 스크롤로 끝난다** — 아래 가드 스크립트가 문서에 존재.
3. 수정 후 **검증 스크립트 통과** 없이 완료 선언 금지.

## 앵커 컨벤션

- 섹션 id는 짧은 연번(`s1`, `s2`, …) 또는 kebab 슬러그. 한글 id 금지(인코딩·복사 시 사고).
- 목차는 `<nav class="toc">` 안의 `<a href="#sN">`. 섹션 헤딩(h2/h3)에 id를 직접 부여.
- 스타일은 문서 첫 `<style>` 블록의 기존 룩앤필을 따른다 (참조 정본: `docs/html/terminal-guide-101.html` 패밀리).

## SPA 임베드 가드 (run-ai.kr 크래시 예방 — 핵심 Gotcha)

**증상**: run-ai.kr 등 SPA에 업로드한 문서에서 목차 클릭 시
`Global render error: TypeError: Cannot read properties of undefined (reading 'rehydrate')`
— 라우터가 해시 변경을 경로 이동으로 가로채 존재하지 않는 라우트로 넘어가며 하이드레이션 실패.

**해법**: 캡처 단계(true)에서 해시 클릭을 먼저 받아 `preventDefault + stopPropagation + scrollIntoView`로
문서 안에서 끝낸다. `</body>` 직전에 삽입:

```html
<script>
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
  if (!a) return;
  var id = a.getAttribute('href').slice(1);
  if (!id) return;
  var target = document.getElementById(id);
  if (!target) return;              // 이 문서의 앵커가 아니면 원래 동작에 맡긴다
  e.preventDefault();
  e.stopPropagation();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (history.replaceState) history.replaceState(null, '', '#' + id);
}, true);
</script>
```

- 이미 `<script>`가 있는 문서면 중복 삽입 금지 — 가드 존재 여부(`href^="#"` 캡처 리스너)를 먼저 grep.
- 적용 실적: `docs/html/aws-dev-reference.html`, `docs/html/mcp-2026-07-28.html` (2026-07).

## 검증 (완료 조건)

1. **정합**: `href="#..."` 전수 추출 → 대응 `id` 부재 목록이 빈 배열.

```bash
python3 - <<'EOF'
import re, sys
s = open(sys.argv[1] if len(sys.argv)>1 else 0, encoding='utf-8').read()
hrefs = re.findall(r'href="#([^"]*)"', s); ids = set(re.findall(r'id="([^"]*)"', s))
missing = [h for h in hrefs if h not in ids]
print("anchors:", len(hrefs), "missing:", missing); sys.exit(1 if missing else 0)
EOF
```

2. **동작**: Playwright로 SPA 라우터 하이재킹을 흉내(버블 단계에서 해시 클릭 시 throw하는
   리스너를 addInitScript로 주입) → 전 앵커 클릭 → `window.scrollY > 0` 전수 확인.
   가드가 캡처 단계에서 먼저 처리하면 하이재킹 리스너의 `defaultPrevented`가 true라 크래시하지 않는다.

## 반려 기준

- 앵커가 정합한데 가드 없이 "수정 완료" — SPA 업로드에서 재발한다. 가드까지가 완료.
- `onclick` 인라인 + `javascript:` href 방식 — CSP 있는 사이트에서 막힌다. 위 가드 방식만.
