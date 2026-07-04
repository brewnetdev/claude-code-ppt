---
name: svg-ppt-editor
description: Generate, edit, and export SVG slide/infographic assets for presentation (PPT) materials with a strict anti-AI-slop design system and a click-to-select region editing workflow. Use this skill whenever the user asks to create or modify SVG images, slides, diagrams, infographics, or lecture visuals; mentions editing text inside an SVG; wants to modify a selected region/element of an image (e.g. gives an id like e0012); or asks to export SVG to PNG with a transparent or colored background. Trigger even if the user just says "이미지 만들어줘/고쳐줘" in a PPT or lecture-material context.
---

# SVG PPT Editor

SVG 기반 발표자료(슬라이드·인포그래픽·다이어그램)를 생성/편집/익스포트하는 스킬.
3가지 워크플로우를 제공한다: **생성(Generate)** / **선택영역 편집(Select & Edit)** / **익스포트(Export)**.

의존성: `pip install lxml cairosvg` (최초 1회. 미설치 시 사용자에게 설치 명령을 안내하고 승인 후 설치)

---

## 1. 생성 (Generate)

새 SVG 슬라이드/인포그래픽을 만들 때는 반드시 아래 **디자인 시스템(§4)** 을 적용한다.

규칙:
- `viewBox="0 0 1280 720"` (16:9 슬라이드 기본. 사용자가 다른 비율 요청 시 변경)
- 텍스트는 반드시 `<text>`/`<tspan>` 요소로 유지한다. **절대 path로 outline하지 않는다** (이후 텍스트 편집 가능해야 함)
- 논리 단위마다 `<g>`로 묶고 의미있는 `id`를 부여한다 (`id="header"`, `id="chart-area"`)
- 생성 직후 id 태깅을 실행한다:
  ```bash
  python3 "${CLAUDE_SKILL_DIR}/scripts/tag_ids.py" 파일.svg
  ```

## 2. 선택영역 편집 (Select & Edit)

사용자가 "이 부분 고쳐줘"처럼 위치 지정이 필요한 편집을 원하면:

1. **id 태깅** (아직 안 했다면):
   ```bash
   python3 "${CLAUDE_SKILL_DIR}/scripts/tag_ids.py" 파일.svg
   ```
2. **프리뷰 서버 실행** — 백그라운드로 띄우고 사용자에게 브라우저에서 요소를 클릭해 id를 복사해달라고 요청한다:
   ```bash
   python3 "${CLAUDE_SKILL_DIR}/scripts/preview.py" 파일.svg &
   ```
   - 뷰어는 클릭한 요소의 `data-sae-id`를 보여주고 클립보드 복사를 지원한다
   - 파일 변경을 1초 간격으로 감지해 자동 리로드하므로, 편집 결과를 사용자가 즉시 확인할 수 있다
3. **사용자가 id를 주면** (예: "e0012를 파란색으로", "e0007 텍스트를 X로 바꿔줘"):
   - Read로 파일을 열고 해당 `data-sae-id` 요소의 서브트리만 Edit로 수정한다
   - **해당 요소 외의 다른 요소, 문서 구조, viewBox는 절대 변경하지 않는다**
   - 텍스트 수정 요청이면 `<text>`/`<tspan>` 내용만 교체한다
4. 편집 후 뷰어가 자동 갱신되므로 사용자에게 확인을 요청한다
5. 작업 종료 시 사용자가 원하면 id를 제거한다:
   ```bash
   python3 "${CLAUDE_SKILL_DIR}/scripts/tag_ids.py" 파일.svg --strip
   ```

사용자가 id 없이 위치를 말로 지정하면("오른쪽 위 원") 요소를 추정해 수정하되,
후보가 2개 이상이면 프리뷰 서버를 띄워 클릭 선택을 권한다.

## 3. 익스포트 (Export)

PNG 결과물은 항상 `{원본폴더}/output/`에 타임스탬프 파일명으로 생성된다.
익스포트 시 `data-sae-id`는 임시 사본에서 자동 제거되며 원본은 건드리지 않는다.

```bash
# 투명 배경 (기본)
python3 "${CLAUDE_SKILL_DIR}/scripts/export_png.py" 파일.svg

# 배경색 지정 + 2배율 (고해상도 PPT 삽입용 권장)
python3 "${CLAUDE_SKILL_DIR}/scripts/export_png.py" 파일.svg --bg "#FFFFFF" --scale 2
```

PPT 삽입용으로 요청받으면 `--scale 2`를 기본으로 사용한다.

## 4. 디자인 시스템 (MUST — 모든 생성/편집에 강제)

### 금지 (MUST NOT)
- 그라데이션 전면 금지: `<linearGradient>`, `<radialGradient>` 요소 및 참조
- 글로우/블러 필터 금지: `<filter>` 기반 drop-shadow, feGaussianBlur 장식
- 배경 워터마크(거대 반투명 글자/아이콘), 닷·그리드 장식 배경 금지
- 카드 상단 컬러 액센트 바 금지
- 이모지를 불릿·장식으로 사용 금지, 뱃지/pill 남발 금지
- 마케팅 보일러플레이트 문구 금지 (Seamlessly, Elevate, Unlock, ✨ 등)

### 강제 (MUST)
- 색: 무채색(흰 #ffffff / 회 #f5f5f5·#d0d0d0·#6b6b6b / 검 #1a1a1a) 베이스 + **액센트 1색**.
  액센트 기본값 `#0F62FE`(사용자 지정 시 교체). 색은 상태·위계 의미에만 사용
- 구분: 효과 대신 `stroke-width="1"` 실선 테두리와 여백으로 구획
- rx(radius)는 0~8 제한
- 폰트: `font-family="IBM Plex Sans KR, IBM Plex Sans, sans-serif"` 기본
  (사용자 표준 디자인 시스템 폰트 — 한글 가독성과 코드 병기 일관성 때문)
- 위계는 font-size·font-weight·여백·정렬로만 표현. 색·효과로 만들지 않는다
- 모든 시각 요소는 "어떤 정보를 전달하는가"에 답할 수 있어야 한다. 답 못하면 삭제

### 출력 전 자가 점검
생성/수정된 SVG에 다음이 하나라도 있으면 제거 후 재작성:
- [ ] Gradient 요소 또는 참조
- [ ] filter 기반 그림자/글로우
- [ ] 정보 전달 없는 순수 장식 요소
- [ ] outline(path)된 텍스트
- [ ] rx > 8

## 5. 스크립트 요약

| 스크립트 | 역할 | 비고 |
|---|---|---|
| `scripts/tag_ids.py` | 전 요소에 `data-sae-id` 부여/제거 | 멱등, 주석 보존(lxml) |
| `scripts/preview.py` | 클릭 선택 뷰어 (localhost:8437) | 파일 변경 자동 리로드 |
| `scripts/export_png.py` | PNG 익스포트 (투명/배경색, 배율) | `output/` 폴더 자동 생성 |
