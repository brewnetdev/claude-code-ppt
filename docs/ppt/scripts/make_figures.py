"""공백 도판 11개 생성 — MANIFEST gaps.figure 명세대로.

GUIDE 규약: 흰 배경 · #585f6b 선 · 모노스페이스 라벨 · viewBox 0 0 960 N.
기존 21개와 규격을 맞춰야 한 덱 안에서 톤이 갈리지 않는다.

수치가 있는 도판(이미지 크기·알림 지연·실험 타임라인)은 tables/ 의 TSV 를
읽어서 그린다. 도판과 표가 다른 숫자를 말하는 사고를 막기 위해서다.
"""

import os

HERE = os.path.dirname(os.path.abspath(__file__))
PPT = os.path.dirname(HERE)
OUT = os.path.join(PPT, "figures")

# GUIDE 팔레트
TEXT, MUTED, BORDER, SURF = "#15181d", "#585f6b", "#d8dbe0", "#f5f6f7"
ACCENT, WARN = "#1a4fa0", "#8f4408"
# 도판 전용 — 흐름의 종류에 의미가 실려 있다
PULL, PUSH, QUERY, OK, OFF = "#6a4a9c", "#b4621a", "#1f4d8f", "#2e7d4f", "#9aa1ad"

MONO = "ui-monospace,monospace"


def head(w, h, label):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'role="img" aria-label="{label}">\n'
        f'  <rect width="{w}" height="{h}" fill="#ffffff"/>\n'
    )


def box(x, y, w, h, stroke=MUTED, fill="none", sw=1.5, rx=0):
    return (
        f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>\n'
    )


def t(x, y, s, size=15, fill=TEXT, anchor="start", weight="400", mono=True):
    fam = MONO if mono else "sans-serif"
    return (
        f'  <text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" '
        f'fill="{fill}" text-anchor="{anchor}" font-weight="{weight}">{s}</text>\n'
    )


def line(x1, y1, x2, y2, stroke=MUTED, sw=1.5, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (
        f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" '
        f'stroke-width="{sw}"{d}/>\n'
    )


def arrow_defs(name, color):
    return (
        f'  <defs><marker id="{name}" viewBox="0 0 10 10" refX="9" refY="5" '
        f'markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
        f'<path d="M0,0 L10,5 L0,10 z" fill="{color}"/></marker></defs>\n'
    )


def arrow(x1, y1, x2, y2, name, color=MUTED, sw=1.8, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (
        f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
        f'stroke-width="{sw}"{d} marker-end="url(#{name})"/>\n'
    )


def wrap(s, width, maxlines=2):
    """어절 경계로 줄을 나눈다. 글자 수로 자르면 'kubectl t / op' 처럼 깨진다."""
    out, cur = [], ""
    for w in s.split(" "):
        cand = f"{cur} {w}".strip()
        if len(cand) <= width or not cur:
            cur = cand
        else:
            out.append(cur)
            cur = w
            if len(out) == maxlines:
                break
    if cur and len(out) < maxlines:
        out.append(cur)
    if len(out) == maxlines and len(" ".join(out)) < len(s):
        out[-1] = out[-1].rstrip() + " …"
    return out


def lines(x, y, text, width, size=12, fill=MUTED, lh=17, maxlines=2, mono=False):
    return "".join(
        t(x, y + i * lh, ln, size, fill, mono=mono)
        for i, ln in enumerate(wrap(text, width, maxlines))
    )


def write(name, body):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(body + "</svg>\n")
    return name


def read_tsv(rel):
    with open(os.path.join(PPT, rel), encoding="utf-8") as f:
        rows = [l.rstrip("\n").split("\t") for l in f if l.strip()]
    return rows[0], rows[1:]


# ── 00-02 메트릭이 이상을 알려주고, 로그가 이유를 말해준다 ──────────────────
def fig_00_02():
    s = head(960, 268, "왼쪽 지연 그래프의 급등과 오른쪽 그 시각의 로그 한 줄")
    s += arrow_defs("a0002", ACCENT)
    # 왼쪽 — 지연 그래프
    s += t(24, 30, "메트릭 — 무엇이", 16, MUTED)
    s += box(24, 46, 420, 200, BORDER, SURF)
    ax_l, ax_b, ax_r, ax_t = 64, 216, 424, 70
    s += line(ax_l, ax_t, ax_l, ax_b, MUTED, 1.2)
    s += line(ax_l, ax_b, ax_r, ax_b, MUTED, 1.2)
    pts = [(0, 190), (40, 188), (80, 191), (120, 187), (160, 189), (200, 186),
           (240, 100), (250, 86), (260, 150), (300, 188), (340, 190), (356, 189)]
    d = " ".join(f"{ax_l + x},{y}" for x, y in pts)
    s += f'  <polyline points="{d}" fill="none" stroke="{ACCENT}" stroke-width="2"/>\n'
    s += line(ax_l, 120, ax_r, 120, WARN, 1.2, "5 4")
    s += t(ax_r - 4, 114, "임계 0.5s", 13, WARN, "end")
    s += t(30, 236, "P95 지연", 13, MUTED)
    s += t(ax_l + 250, 78, "여기", 13, ACCENT, "middle", "600")
    # 오른쪽 — 로그 한 줄
    s += t(516, 30, "로그 — 왜", 16, MUTED)
    s += box(516, 46, 420, 200, BORDER, SURF)
    s += t(532, 82, "14:22:31  order-api", 14, MUTED)
    s += t(532, 108, "ERROR  timeout waiting for", 14, WARN)
    s += t(532, 130, "       payment-gw (3000ms)", 14, WARN)
    s += t(532, 168, "14:22:31  order-api", 14, MUTED)
    s += t(532, 190, "WARN   retry 1/3", 14, MUTED)
    s += t(532, 226, "같은 시각의 그 한 줄", 13, ACCENT)
    s += arrow(452, 146, 508, 146, "a0002", ACCENT)
    s += t(480, 136, "왜?", 13, ACCENT, "middle", "600")
    return write("gap-00-02.svg", s)


# ── 00-03 폐쇄형과 개방형 ──────────────────────────────────────────────────
def fig_00_03():
    s = head(960, 268, "앱 바깥에서 보는 지표와 앱 안에서 내보내는 지표의 대비")
    s += arrow_defs("a0003", MUTED)
    s += t(24, 30, "폐쇄형 — 바깥에서 본다", 16, MUTED)
    s += box(24, 46, 420, 210, BORDER)
    s += box(150, 96, 168, 74, MUTED, SURF)
    s += t(234, 130, "애플리케이션", 15, TEXT, "middle")
    s += t(234, 152, "(안이 안 보인다)", 13, MUTED, "middle")
    s += arrow(60, 133, 142, 133, "a0003", MUTED)
    s += t(34, 126, "CPU", 14, MUTED)
    s += t(34, 148, "메모리", 14, MUTED)
    s += t(234, 208, "'느리다'는 알지만", 14, MUTED, "middle", mono=False)
    s += t(234, 230, "왜 느린지는 모른다", 14, MUTED, "middle", mono=False)

    s += t(516, 30, "개방형 — 안에서 내보낸다", 16, MUTED)
    s += box(516, 46, 420, 210, ACCENT)
    s += box(566, 96, 168, 74, ACCENT, SURF)
    s += t(650, 124, "애플리케이션", 15, TEXT, "middle")
    s += t(650, 148, "계측 코드", 13, ACCENT, "middle")
    s += arrow(742, 133, 906, 133, "a0003", ACCENT)
    s += t(760, 118, "orders_created", 13, ACCENT)
    s += t(760, 158, "processing_seconds", 13, ACCENT)
    s += t(726, 208, "'주문 처리가 3초'", 14, TEXT, "middle", mono=False)
    s += t(726, 230, "— 맥락이 있다", 14, ACCENT, "middle", mono=False)
    return write("gap-00-03.svg", s)


# ── 01-02 만든 뒤에는 못 고친다 ────────────────────────────────────────────
def fig_01_02():
    s = head(960, 268, "지금 설정 파일 20줄과 나중에 노드에 진입해 고치는 경로의 대비")
    s += arrow_defs("a0102", MUTED)
    s += line(60, 150, 900, 150, MUTED, 1.5)
    for x, lb in ((150, "클러스터 생성 전"), (560, "생성 후")):
        s += line(x, 140, x, 160, MUTED, 1.5)
        s += t(x, 178, lb, 14, MUTED, "middle")
    # 위 — 지금
    s += box(60, 56, 320, 70, ACCENT, SURF)
    s += t(76, 84, "설정 파일에 20줄", 16, ACCENT, weight="600")
    s += t(76, 108, "kind create 한 번", 14, MUTED)
    s += arrow(150, 132, 150, 144, "a0102", ACCENT)
    s += t(392, 96, "5분", 15, ACCENT, weight="600")
    # 아래 — 나중
    s += box(470, 180, 430, 92, MUTED)
    s += t(486, 208, "컨트롤 플레인 노드 진입", 16, TEXT, weight="600")
    s += t(486, 232, "매니페스트 수정 → 정적 파드 재시작", 14, MUTED)
    s += t(486, 256, "노드마다 반복 · 재현 안 됨", 14, WARN)
    s += arrow(560, 158, 560, 174, "a0102", MUTED)
    s += t(24, 40, "같은 결과, 다른 비용", 16, MUTED)
    return write("gap-01-02.svg", s)


# ── 02-01 파드는 오래 살지 않는다 ──────────────────────────────────────────
def fig_02_01():
    s = head(960, 236, "VM 수명과 파드 수명의 대비, 그리고 라벨로 묶은 집합")
    s += t(24, 34, "VM — 개별 인스턴스를 추적한다", 16, MUTED)
    s += box(300, 50, 600, 34, MUTED, SURF)
    s += t(312, 72, "web-01                                    24시간+", 14, TEXT)
    s += t(24, 72, "이름이 곧 대상", 14, MUTED)

    s += t(24, 132, "파드 — 이름이 계속 바뀐다", 16, MUTED)
    spans = [(300, 96), (404, 62), (472, 120), (598, 78), (682, 140), (828, 72)]
    for i, (x, w) in enumerate(spans):
        s += box(x, 148, w, 26, OFF, "#ffffff", 1.2)
        s += t(x + 6, 166, f"…-{'abcdef'[i]}{i}x{i}", 12, MUTED)
    s += line(300, 196, 900, 196, MUTED, 1.2, "4 4")
    s += t(300, 216, 'job="order-api" 로 묶으면 하나의 시계열', 14, ACCENT)
    s += t(24, 166, "수 분~수 시간", 14, MUTED)
    return write("gap-02-01.svg", s)


# ── 02-03 평균 40ms 뒤에 숨은 3초 ──────────────────────────────────────────
def fig_02_03():
    s = head(960, 276, "지연 분포 히스토그램에 평균선과 P99 선을 겹친 그림")
    ax_l, ax_b, ax_r = 90, 240, 880
    s += line(ax_l, 60, ax_l, ax_b, MUTED, 1.2)
    s += line(ax_l, ax_b, ax_r, ax_b, MUTED, 1.2)
    bars = [(0, 150), (1, 168), (2, 120), (3, 62), (4, 30), (5, 16), (6, 9), (7, 5)]
    for i, h in bars:
        x = ax_l + 16 + i * 42
        s += box(x, ax_b - h, 30, h, "none", OFF, 0)
    # 꼬리 한 건
    s += box(ax_l + 700, ax_b - 12, 30, 12, "none", WARN, 0)
    s += t(ax_l + 715, ax_b - 28, "1건", 13, WARN, "middle", "600")
    s += t(ax_l + 715, ax_b + 22, "3초", 13, WARN, "middle")
    s += t(ax_l + 30, ax_b + 22, "10ms", 13, MUTED)
    s += t(ax_l + 6, 52, "요청 수", 13, MUTED)
    # 평균선 / P99선
    s += line(ax_l + 62, 60, ax_l + 62, ax_b, ACCENT, 1.6, "5 4")
    s += t(ax_l + 68, 76, "평균 40ms — 대시보드는 초록", 14, ACCENT)
    s += line(ax_l + 706, 60, ax_l + 706, ax_b, WARN, 1.6, "5 4")
    s += t(ax_l + 700, 76, "P99", 14, WARN, "end")
    return write("gap-02-03.svg", s)


# ── 03-05 이미지 크기 ──────────────────────────────────────────────────────
def fig_03_05():
    _, rows = read_tsv("tables/03-05-image-size.tsv")
    s = head(960, 250, "빌드 방식 네 가지의 최종 이미지 크기 비교 막대")
    scale = 620 / 1020.0
    y = 60
    for name, size, keeps in rows:
        mb = float(size.replace("GB", "")) * 1000 if "GB" in size else float(size.replace("MB", ""))
        w = max(6, mb * scale)
        big = mb > 900
        s += t(24, y + 20, name, 15, TEXT, mono=False)
        s += box(300, y, w, 26, "none", WARN if big else OK, 0)
        s += t(310 + w, y + 19, size, 15, WARN if big else TEXT, weight="600")
        s += t(300, y + 44, keeps, 13, MUTED, mono=False)
        y += 58
    return write("gap-03-05.svg", s)


# ── 04-01 메모리 사용량의 네 출처 ──────────────────────────────────────────
def fig_04_01():
    _, rows = read_tsv("tables/04-01-metric-sources.tsv")
    s = head(960, 282, "메모리 사용량을 알려주는 네 가지 출처와 각각의 이름 접두사")
    s += arrow_defs("a0401", MUTED)
    s += box(330, 24, 300, 46, ACCENT)
    s += t(480, 53, '"메모리가 얼마나 쓰였나?"', 16, ACCENT, "middle")
    x = 24
    for i, (src, what, where, prefix) in enumerate(rows):
        s += box(x, 128, 216, 130, MUTED, SURF)
        s += t(x + 14, 156, src, 15, TEXT, weight="600")
        s += t(x + 14, 182, prefix, 14, ACCENT)
        s += lines(x + 14, 208, what, 24, 12, MUTED, 17, 2)
        s += lines(x + 14, 250, where, 24, 12, MUTED, 17, 1)
        s += arrow(x + 108, 122, x + 108, 76, "a0401", MUTED)
        x += 234
    s += t(24, 300, "같은 질문에 네 곳이 서로 다른 숫자로 답한다. 무엇을 재는지가 다르다.",
           15, TEXT, mono=False)
    return write("gap-04-01.svg", s)


# ── 07-02 알림 피로 곡선 ───────────────────────────────────────────────────
def fig_07_02():
    s = head(960, 300, "알림 수가 늘수록 대응률이 떨어지는 곡선")
    ax_l, ax_b, ax_r = 90, 226, 880
    s += line(ax_l, 50, ax_l, ax_b, MUTED, 1.2)
    s += line(ax_l, ax_b, ax_r, ax_b, MUTED, 1.2)
    pts = [(0, 60), (60, 66), (140, 84), (240, 118), (340, 158), (460, 186),
           (600, 204), (740, 212), (786, 214)]
    d = " ".join(f"{ax_l + x},{y}" for x, y in pts)
    s += f'  <polyline points="{d}" fill="none" stroke="{WARN}" stroke-width="2.2"/>\n'
    s += t(ax_l + 6, 44, "대응률", 13, MUTED)
    s += t(ax_r, ax_b + 22, "하루 알림 수", 13, MUTED, "end")
    s += t(ax_l + 10, ax_b + 22, "몇 건", 13, MUTED)
    s += line(ax_l + 340, 50, ax_l + 340, ax_b, MUTED, 1.2, "5 4")
    s += t(ax_l + 350, 70, "여기서부터 무시하기 시작한다", 14, WARN)
    s += t(ax_l + 350, 92, "진짜 알림까지 같이", 14, WARN)
    s += t(24, 276, "울리는데 아무도 안 보는 알림은 없는 것보다 나쁘다.", 15, TEXT, mono=False)
    return write("gap-07-02.svg", s)


# ── 07-03 알림 도착까지 네 구간 ────────────────────────────────────────────
def fig_07_03():
    _, rows = read_tsv("tables/07-03-alert-delay.tsv")
    s = head(960, 270, "고장 시각부터 알림 도착까지 네 구간 타임라인")
    s += arrow_defs("a0703", MUTED)
    x0, y = 40, 120
    widths = [180, 180, 300, 180]
    total = "30s + 30s + 2m + 30s"
    x = x0
    for (name, does, val), w in zip(rows, widths):
        s += box(x, y, w, 52, MUTED, SURF)
        s += t(x + 12, y + 24, name, 14, TEXT, mono=False)
        s += t(x + 12, y + 44, val, 15, ACCENT, weight="600")
        s += lines(x + 12, y + 84, does, max(16, w // 9), 12, MUTED, 17, 3)
        x += w + 8
    s += line(x0, y - 24, x - 8, y - 24, MUTED, 1.5)
    s += t(x0, y - 34, "고장", 14, WARN)
    s += t(x - 8, y - 34, "알림 도착", 14, ACCENT, "end")
    s += t(x0, 60, f"합계 {total} — 3분 30초", 16, TEXT, weight="600")
    return write("gap-07-03.svg", s)


# ── 09-04 간격 · 보존 · 디스크 삼각형 ──────────────────────────────────────
def fig_09_04():
    s = head(960, 320, "스크레이프 간격, 보존 기간, 디스크 용량 세 꼭짓점의 삼각형")
    cx, top, by = 480, 60, 250
    lx, rx = 250, 710
    s += f'  <polygon points="{cx},{top} {lx},{by} {rx},{by}" fill="none" stroke="{MUTED}" stroke-width="1.8"/>\n'
    s += t(cx, top - 14, "스크레이프 간격", 16, TEXT, "middle", "600")
    s += t(cx, top - 36, "15s ~ 60s", 14, ACCENT, "middle")
    s += t(lx - 10, by + 26, "보존 기간", 16, TEXT, "end", "600")
    s += t(lx - 10, by + 48, "3d ~ 30d", 14, ACCENT, "end")
    s += t(rx + 10, by + 26, "디스크", 16, TEXT, weight="600")
    s += t(rx + 10, by + 48, "10Gi ~ 200Gi", 14, ACCENT)
    s += box(360, 140, 240, 62, ACCENT, SURF)
    s += t(480, 168, "둘을 정하면", 15, TEXT, "middle")
    s += t(480, 190, "나머지 하나가 결정된다", 15, ACCENT, "middle")
    return write("gap-09-04.svg", s)


# ── 10-06 실험 3 타임라인 ──────────────────────────────────────────────────
def fig_10_06():
    _, rows = read_tsv("tables/10-06-timeline.tsv")
    s = head(960, 300, "지연 주입 실험의 네 시점 타임라인")
    x0, x1, y = 130, 900, 96
    s += line(x0, y, x1, y, MUTED, 1.5)
    xs = [130, 340, 560, 760]
    colors = [ACCENT, WARN, OK, MUTED]
    for (when, what), x, c in zip(rows, xs, colors):
        s += f'  <circle cx="{x}" cy="{y}" r="6" fill="{c}"/>\n'
        s += t(x, y - 18, when, 15, c, "middle", "600")
        tx = x - 60 if x > 200 else x - 6
        s += lines(tx, y + 34, what, 26, 13, TEXT, 20, 2)
    s += box(130, 176, 400, 56, WARN, SURF)
    s += t(146, 200, "주입한 지연 600ms", 15, TEXT, weight="600")
    s += t(146, 222, "알림은 3분 뒤 — for: 3m 이 만든 간격", 14, WARN)
    return write("gap-10-06.svg", s)


ALL = [fig_00_02, fig_00_03, fig_01_02, fig_02_01, fig_02_03, fig_03_05,
       fig_04_01, fig_07_02, fig_07_03, fig_09_04, fig_10_06]

if __name__ == "__main__":
    for fn in ALL:
        print("  ✓", fn())
    print(f"{len(ALL)}개 생성 → {OUT}")
