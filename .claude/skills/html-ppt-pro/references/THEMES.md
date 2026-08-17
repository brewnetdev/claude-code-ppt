# html-ppt-pro — 테마 시스템

테마 = `template.html` 상단 `:root` 토큰 블록 교체 **한 곳**. 컴포넌트 CSS는
전부 `var(--…)`만 참조하므로 토큰만 갈면 덱 전체가 바뀐다
(lewislulu/html-ppt-skill의 base+theme 분리 구조를 단일 파일로 압축한 것).

## 토큰 계약 (테마가 반드시 정의할 것)

| 토큰 | 역할 |
|---|---|
| `--bg` | 스테이지 배경 |
| `--surface` | 카드 패널 |
| `--navy` | 메인 — 표지·디바이더·콜아웃 밴드·헤딩·기준 데이터 |
| `--blue` | 포인트 — KPI 값·뱃지·강조 카드 보더·강조 데이터 (액센트 1색 원칙) |
| `--text-1/-2/-3` | 본문 / 보조 / 캡션·푸터 |
| `--border`, `--border-strong` | 1px 구획선 / 도해 연결선 |
| `--good/--warn/--bad` | 상태 의미색 (상태 표시 외 사용 금지) |
| `--radius`, `--radius-sm` | 0~8px 안에서 |
| `--shadow` | 중성 회색 1단계만, 또는 none |
| `--font-sans`, `--font-mono` | 의도적 선택 + 이유 한 줄 주석 필수 |

표지·디바이더의 다크 배경 위 색(`#6FBBFF`, `#B9C6D6` 등)은 `.slide.cover` /
`.slide.section` 블록에 있다 — 테마 바꿀 때 이 블록도 함께 조정.

## 1. navy-clinical (기본 탑재 — 의료·공공·정책·신뢰)

브리프 정본. 템플릿에 이미 들어있다.

```
--bg:#F4F6F9  --surface:#FFFFFF  --navy:#0A2540  --blue:#1890FF
--text-1:#1E293B  --text-2:#475569  --text-3:#8A94A6
--border:#D7DEE8  --border-strong:#B6C2D2
폰트: Pretendard(중립·신뢰 톤) + JetBrains Mono(수치)
```

## 2. teal-cream (강의·리포트 — 하우스 팔레트)

에디터 report 덱과 같은 계열. 강의 자료를 독립 덱으로 뽑을 때.

```
--bg:#FAF9F5  --surface:#FFFFFF  --navy:#0F766E  --blue:#0D9488
--text-1:#0F172A  --text-2:#1E3A8A  --text-3:#94A3B8
--border:#E2E0D8  --border-strong:#C8C4B8
폰트: Noto Sans KR(본문 가독) + JetBrains Mono
```

주의: navy/blue가 같은 틸 계열이라 `.vs` 대비가 약함 — 비교 강조 덱이면
navy-clinical 사용.

## 3. graphite-amber (기술 발표 — 브루넷 계열 라이트)

`html-presentation.md`의 GOOD 예시와 정합. 개발자 대상 세미나.

```
--bg:#FFFFFF  --surface:#F8F8F7  --navy:#111827  --blue:#F59E0B
--text-1:#111827  --text-2:#4B5563  --text-3:#9CA3AF
--border:#E5E7EB  --border-strong:#C9CDD4
폰트: Noto Sans KR + JetBrains Mono
```

## 새 테마 추가 규칙

1. 위 토큰 계약을 전부 채운다. 무채색 베이스 + 액센트 1색 — `--navy`는
   "어두운 메인"이지 두 번째 액센트가 아니다.
2. 그라데이션·컬러 그림자·글래스 토큰 금지 (check-slop이 차단).
3. 배경↔본문 대비 최소 7:1, 카드↔배경은 보더로 구분(그림자 의존 금지).
4. 다크 테마를 원하면 이 스킬이 아니라 **slide-rule**(L9 Dracula)을 쓴다 —
   중복 구현 금지.
