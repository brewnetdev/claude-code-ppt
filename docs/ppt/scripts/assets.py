"""자산 변환기 — TSV·출력·코드·SVG를 장표 마크업으로 바꾼다.

56장을 손으로 마크업하면 반드시 어긋난다. 변환은 여기가 하고 사람은 문구만 본다.
GUIDE.md 의 규약을 코드로 옮긴 것이므로, 규약이 바뀌면 여기를 먼저 고친다.
"""

import html
import os
import re

PPT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def esc(s: str) -> str:
    return html.escape(s, quote=False)


# ── SVG ────────────────────────────────────────────────────────────────────
# 도판 21개가 id="z1" · id="r2" 같은 2글자 id를 쓰고 url(#…) 로 마커·클립을
# 참조한다. 한 문서에 그대로 인라인하면 나중 것이 앞 것의 id를 덮어써서
# 화살표가 사라지거나 엉뚱한 도판에 붙는다. 파일명으로 접두사를 만들어
# id 정의와 참조를 함께 치환한다.

_ID_DEF = re.compile(r'\bid="([^"]+)"')
_ID_REF = re.compile(r'url\(#([^)]+)\)')
_HREF_REF = re.compile(r'\b(xlink:href|href)="#([^"]+)"')


def inline_svg(rel_path: str) -> str:
    """SVG 파일을 읽어 id를 스코핑한 인라인 마크업으로 돌려준다."""
    path = os.path.join(PPT, rel_path)
    with open(path, encoding="utf-8") as f:
        svg = f.read()

    prefix = os.path.splitext(os.path.basename(rel_path))[0] + "-"
    ids = set(_ID_DEF.findall(svg))

    if ids:
        svg = _ID_DEF.sub(lambda m: f'id="{prefix}{m.group(1)}"', svg)
        svg = _ID_REF.sub(
            lambda m: f"url(#{prefix}{m.group(1)})" if m.group(1) in ids else m.group(0),
            svg,
        )
        svg = _HREF_REF.sub(
            lambda m: f'{m.group(1)}="#{prefix}{m.group(2)}"'
            if m.group(2) in ids
            else m.group(0),
            svg,
        )

    # 루트에 고정 width/height 가 있으면 CSS 로 폭을 못 잡는다. viewBox 만 남긴다.
    svg = re.sub(r'(<svg\b[^>]*?)\s+width="[^"]*"', r"\1", svg, count=1)
    svg = re.sub(r'(<svg\b[^>]*?)\s+height="[^"]*"', r"\1", svg, count=1)
    # XML 선언·주석은 인라인에 불필요하다.
    svg = re.sub(r"<\?xml[^>]*\?>\s*", "", svg)
    return svg.strip()


def svg_id_count(rel_path: str) -> int:
    with open(os.path.join(PPT, rel_path), encoding="utf-8") as f:
        return len(set(_ID_DEF.findall(f.read())))


# ── 표 ─────────────────────────────────────────────────────────────────────
# 행을 줄이지 않는다(GUIDE). 열이 넷 이상이거나 셀이 길어 격자로는 22pt 를
# 지킬 수 없는 표만 행 카드로 편다.

CARD_THRESHOLD_COLS = 4
CARD_THRESHOLD_CELL = 46
MONO_HINT = re.compile(r"[a-z0-9_.-]+\s*[:=/]|kubectl |curl |^\d|GB$|MB$|^v?\d+\.\d+")


def read_tsv(rel_path: str):
    path = os.path.join(PPT, rel_path)
    with open(path, encoding="utf-8") as f:
        rows = [ln.rstrip("\n").split("\t") for ln in f if ln.strip()]
    return rows[0], rows[1:]


def _cell_html(text: str) -> str:
    """백틱을 코드 스팬으로. 그 외는 이스케이프."""
    parts = text.split("`")
    out = []
    for i, p in enumerate(parts):
        out.append(f"<code>{esc(p)}</code>" if i % 2 else esc(p))
    return "".join(out)


def table_html(rel_path: str, force: str | None = None) -> str:
    head, body = read_tsv(rel_path)
    longest = max((len(c) for r in [head] + body for c in r), default=0)
    mode = force or (
        "cards"
        if (len(head) >= CARD_THRESHOLD_COLS or longest > CARD_THRESHOLD_CELL)
        else "grid"
    )

    if mode == "grid":
        th = "".join(f"<th>{_cell_html(c)}</th>" for c in head)
        trs = []
        for r in body:
            tds = "".join(f"<td>{_cell_html(c)}</td>" for c in r)
            trs.append(f"<tr>{tds}</tr>")
        open_tag = '<table class="dense">' if len(body) >= 5 else "<table>"
        return (
            open_tag
            + "\n<thead><tr>"
            + th
            + "</tr></thead>\n<tbody>\n"
            + "\n".join(trs)
            + "\n</tbody>\n</table>"
        )

    # 행 카드 — 첫 열이 카드 제목, 나머지 열은 머리행을 라벨로 쓴다.
    cards = []
    for r in body:
        title = _cell_html(r[0])
        rows = []
        for k, v in zip(head[1:], r[1:]):
            if not v.strip():
                continue
            rows.append(
                f'<div class="card-row"><div class="card-k">{_cell_html(k)}</div>'
                f'<div class="card-v">{_cell_html(v)}</div></div>'
            )
        cards.append(
            f'<div class="card"><div class="card-h">{esc(head[0])} {title}</div>'
            + "".join(rows)
            + "</div>"
        )
    dense = " dense" if len(body) >= 3 else ""
    return f'<div class="cards{dense}">\n' + "\n".join(cards) + "\n</div>"


# ── 코드 · 실행 결과 ────────────────────────────────────────────────────────
# 명령과 출력은 다른 블록으로 나눈다. 프롬프트 기호($)는 붙이지 않는다.
# 판정 줄에만 강조색을 쓴다 — 파일에 `판정 —` 또는 `← 판정 줄` 로 표시돼 있다.

VERDICT_LINE = re.compile(r"←\s*판정\s*줄")
COMMENT = re.compile(r"(\s*(?:#|//)\s.*)$")
ANNOT = re.compile(r"(\s*←.*)$")
CODE_MAX_LINES = 8


def read_snippet(rel_path: str) -> str:
    with open(os.path.join(PPT, rel_path), encoding="utf-8") as f:
        return f.read().rstrip("\n")


def _dim_tail(line: str, pattern: re.Pattern) -> str:
    """줄 끝의 주석·주기를 흐린 색으로. 본체는 본문색 그대로 둔다."""
    m = pattern.search(line)
    if not m:
        return esc(line)
    head = line[: m.start(1)]
    tail = m.group(1)
    return esc(head) + f'<span class="dim">{esc(tail)}</span>'


# 코드·출력의 가로 맞춤.
# 본문 폭 1174px(1280 - 좌우 여백 53×2)에서 pre 안쪽 패딩 44px 를 뺀 1130px 이
# 한 줄에 쓸 수 있는 전부다. JetBrains Mono 의 평균 자폭은 0.6em 이므로
# 필요한 글꼴 크기는 1130 / (0.6 × 최장줄길이). 기본 24px 로 넘치면 줄인다.
PRE_AVAIL_PX = 1130
MONO_ADVANCE = 0.60
PRE_MIN_PX = 20  # 이 아래로는 뒷줄에서 안 읽힌다. 넘으면 장표를 쪼갠다.


def fit_font_px(lines, default: int) -> int:
    longest = max((len(l) for l in lines), default=0)
    if longest == 0:
        return default
    need = int(PRE_AVAIL_PX / (MONO_ADVANCE * longest))
    return default if need >= default else max(PRE_MIN_PX, need)


def _pre_open(lines, default=24):
    px = fit_font_px(lines, default)
    return "<pre>" if px >= default else f'<pre style="font-size:{px}px">'


def code_html(rel_path: str, max_lines: int = CODE_MAX_LINES, keep=None) -> str:
    """코드 블록. 8줄을 넘으면 줄이되 '줄었음'을 표시한다(GUIDE).

    주석은 흐린 색으로 내린다 — 코드 본체가 먼저 읽혀야 한다.
    긴 줄은 글꼴을 줄여 맞춘다. 줄바꿈하면 들여쓰기가 무너져 더 안 읽힌다.
    """
    lines = read_snippet(rel_path).split("\n")
    elided = False
    if len(lines) > max_lines:
        lines = [lines[i] for i in keep] if keep else lines[:max_lines]
        elided = True

    out = "\n".join(_dim_tail(l, COMMENT) for l in lines)
    if elided:
        out += '\n<span class="elide">…  (전문은 실습 가이드에)</span>'
    return f"{_pre_open(lines)}{out}</pre>"


def output_html(rel_path: str, max_lines: int = 14) -> tuple[str, str]:
    """실행 결과와 판정 문장을 나눠 돌려준다.

    반환: (pre 블록들 HTML, 판정 문장 HTML 또는 '')

    `판정 —` 아래에 들여쓴 블록이 붙어 있는 파일이 있다(06-01의 셀렉터 YAML).
    문장으로 이어 붙이면 YAML 이 뭉개지므로 두 번째 pre 로 떼어 낸다.
    """
    lines = read_snippet(rel_path).split("\n")

    split_at = next(
        (i for i, l in enumerate(lines) if l.strip().startswith("판정")), None
    )
    body = lines[:split_at] if split_at is not None else lines
    tail = lines[split_at:] if split_at is not None else []

    while body and not body[-1].strip():
        body.pop()
    if len(body) > max_lines:
        body = body[:max_lines] + ["…"]

    rendered = []
    for l in body:
        if VERDICT_LINE.search(l):
            rendered.append(f'<span class="verdict">{esc(l)}</span>')
        else:
            rendered.append(_dim_tail(l, ANNOT))
    pre = _pre_open(body) + "\n".join(rendered) + "</pre>"

    # 판정 구역을 문장과 들여쓴 코드로 가른다.
    sentence, block = [], []
    for l in tail:
        if l.startswith("    ") and l.strip():
            block.append(l)
        elif block:
            block.append(l)
        elif l.strip():
            sentence.append(l.strip())
    while block and not block[-1].strip():
        block.pop()

    if block:
        indent = min(len(l) - len(l.lstrip()) for l in block if l.strip())
        blk = [l[indent:] for l in block]
        pre += _pre_open(blk) + "\n".join(esc(l) for l in blk) + "</pre>"

    note = ""
    if sentence:
        text = re.sub(r"^판정\s*[—-]\s*", "", " ".join(sentence))
        note = f'<div class="verdict-note"><b>판정</b> — {_cell_html(text)}</div>'
    return pre, note
