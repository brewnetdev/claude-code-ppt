"""덱 빌더 — MANIFEST + 자산 → docs/html/study/observability-study.html

장표 본문은 BODY 에 장표 번호로 정의한다. 정의가 없으면 MANIFEST 의 assets 를
보고 기본 배치(도판 / 표 / 코드 / 출력 / 텍스트)로 떨어진다.

제목·말할 것·챕터는 MANIFEST 에서 읽는다. 여기에 문구를 다시 적지 않는다 —
두 곳에 적으면 반드시 갈라진다.
"""

import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import assets as A  # noqa: E402
import standalone as SA  # noqa: E402

PPT = A.PPT
REPO = os.path.dirname(os.path.dirname(PPT))
OUT = os.path.join(REPO, "docs", "html", "study", "observability-study.html")
OUT_SA = os.path.join(REPO, "docs", "html", "observability-study-slides.html")

DECK_TITLE = "쿠버네티스 관측성 스터디"
DECK_SUB = "kind · 프로메테우스 · 그라파나 · 로키 — 11장 실습"


def esc(s):
    return html.escape(s, quote=False)


def fig(rel, cap=None):
    c = f'<div class="fig-cap">{esc(cap)}</div>' if cap else ""
    return f'<div class="fig">{A.inline_svg(rel)}{c}</div>'


def png(name, cap=None):
    """옛 PNG 5종. 954px 원본이라 확대하지 않는다."""
    import base64

    p = os.path.join(PPT, "figures", name)
    b64 = base64.b64encode(open(p, "rb").read()).decode()
    c = f'<div class="fig-cap">{esc(cap)}</div>' if cap else ""
    return f'<div class="fig"><img src="data:image/png;base64,{b64}" alt="{esc(cap or name)}">{c}</div>'


def lead(text, wide=False):
    cls = "lead wide" if wide else "lead"
    return f'<div class="{cls}">{text}</div>'


def cols(left_head, left, right_head, right):
    return (
        '<div class="cols">'
        f'<div><div class="col-head">{esc(left_head)}</div>{left}</div>'
        f'<div><div class="col-head">{esc(right_head)}</div>{right}</div>'
        "</div>"
    )


def out(rel, max_lines=14):
    pre, note = A.output_html(rel, max_lines)
    return pre + note


# ── 장표 본문 정의 ─────────────────────────────────────────────────────────
# 값은 문자열이거나 () -> 문자열. MANIFEST 의 '화면' 열을 마크업으로 옮긴 것이다.
BODY = {
    # 00 · 환경과 버전 고정
    "00-01": lambda: lead(
        "8명이 같은 화면을 보려면<br><b>같은 숫자</b>여야 한다"
    ),
    "00-02": lambda: fig("figures/gap-00-02.svg"),
    "00-03": lambda: fig("figures/gap-00-03.svg"),
    "00-04": lambda: fig("figures/ch00-fig2.svg", "보라 점선 = 메트릭 수집(pull) · 주황 실선 = 로그 전송(push) · 파랑 = 질의"),
    "00-05": lambda: A.table_html("tables/00-05-version-matrix.tsv"),
    "00-06": lambda: out("snippets/output/00-06-preflight.txt"),
    # 01 · kind 클러스터
    "01-01": lambda: A.code_html("snippets/code/01-01-kind-bindaddress.yaml"),
    "01-02": lambda: fig("figures/gap-01-02.svg"),
    "01-03": lambda: fig("figures/ch01-fig1.svg", "포트 매핑은 컨트롤 플레인 노드에만 걸어도 된다 — NodePort 는 모든 노드에서 열린다"),
    "01-04": lambda: out("snippets/output/01-04-get-nodes.txt"),
    # 02 · 계측 가능한 앱
    "02-01": lambda: fig("figures/gap-02-01.svg"),
    "02-02": lambda: A.table_html("tables/02-02-use-red.tsv"),
    "02-03": lambda: fig("figures/gap-02-03.svg"),
    "02-04": lambda: fig("figures/ch02-fig2.svg", "_bucket 은 기본으로 생기지 않는다. 켜는 순간 시계열이 버킷 개수만큼 는다"),
    "02-05": lambda: A.table_html("tables/02-05-metric-kinds.tsv"),
    "02-06": lambda: A.code_html("snippets/code/02-06-metric-names.txt"),
    # 03 · 컨테이너화와 배포
    "03-01": lambda: fig("figures/ch03-fig1.svg", "도커 데몬의 저장소와 kind 노드 안 런타임 저장소는 다른 공간이다"),
    "03-02": lambda: out("snippets/output/03-02-crictl-images.txt"),
    "03-03": lambda: A.table_html("tables/03-03-pullpolicy.tsv"),
    "03-04": lambda: A.table_html("tables/03-04-probes.tsv"),
    "03-05": lambda: fig("figures/gap-03-05.svg"),
    "03-06": lambda: lead(
        "뜨지 않으면 <b>이벤트부터</b> 읽는다"
        '<div style="font-size:24px;color:var(--muted);margin-top:22px;line-height:1.6">'
        "<code>kubectl rollout status</code> 로 기다리고<br>"
        "<code>kubectl describe pod</code> 의 Events 가 이유를 말한다</div>",
        wide=True,
    ),
    # 04 · 프로메테우스 스택
    "04-01": lambda: fig("figures/gap-04-01.svg"),
    "04-02": lambda: cols(
        "node-exporter — 기계의 상태",
        lead("메모리가<br><b>몇 바이트</b> 남았나", wide=True),
        "kube-state-metrics — API 서버가 아는 상태",
        lead("레플리카 3개를 원하는데<br><b>실제로 2개</b>인가", wide=True),
    ),
    "04-03": lambda: lead(
        "metrics-server 는 <b>현재값만</b> 갖는다"
        '<div style="font-size:24px;color:var(--muted);margin-top:22px;line-height:1.6">'
        "<code>kubectl top</code> 과 HPA 를 위한 리소스 메트릭 API.<br>"
        "과거 구간을 저장하는 것은 프로메테우스의 일이다</div>",
        wide=True,
    ),
    "04-04": lambda: fig("figures/ch04-fig1.svg", "오퍼레이터는 CR 을 읽어 설정을 만들어 줄 뿐, 직접 스크레이프하지 않는다"),
    "04-05": lambda: out("snippets/output/04-05-targets.txt"),
    # 05 · 그라파나
    "05-01": lambda: fig("figures/ch05-fig1.svg", "차트가 설치한 기본 대시보드도 전부 이 구조다 — 우리도 같은 방법을 쓴다"),
    "05-02": lambda: A.table_html("tables/05-02-silent-failures.tsv"),
    "05-03": lambda: A.code_html("snippets/code/05-03-datasource-uid.json"),
    # 06 · 앱 메트릭과 PromQL
    "06-01": lambda: fig("figures/ch06-fig1.svg", "①②③ 세 겹이 전부 맞아야 타깃이 나타난다. 하나만 어긋나도 에러 없이 사라진다"),
    "06-02": lambda: A.table_html("tables/06-02-label-layers.tsv"),
    "06-03": lambda: A.code_html("snippets/code/06-03-servicemonitor.yaml"),
    "06-04": lambda: A.table_html("tables/06-04-labels-origin.tsv"),
    "06-05": lambda: A.code_html("snippets/code/06-05-red-queries.promql", max_lines=9),
    # 07 · 대시보드와 알림
    "07-01": lambda: fig("figures/ch07-fig1.svg", "패널 일곱 개. 더 넣고 싶으면 먼저 지울 것을 찾는다"),
    "07-02": lambda: fig("figures/gap-07-02.svg"),
    "07-03": lambda: fig("figures/gap-07-03.svg"),
    "07-04": lambda: lead(
        "규칙에도 <b>release 라벨</b>이 필요하다"
        '<div style="font-size:24px;color:var(--muted);margin-top:22px;line-height:1.6">'
        "<code>metadata.labels.release: kps</code><br>"
        "프로메테우스 CR 의 <code>ruleSelector</code> 가 이 라벨로 규칙을 고른다</div>",
        wide=True,
    ),
    "07-05": lambda: out("snippets/output/07-05-alert-states.txt"),
    # 08 · 로그
    "08-01": lambda: fig("figures/ch08-fig2.svg", "애플리케이션 코드는 한 줄도 바뀌지 않는다 — 표준 출력에만 쓰면 된다"),
    "08-02": lambda: A.table_html("tables/08-02-outdated.tsv"),
    "08-03": lambda: fig("figures/ch08-fig1.svg", "프로메테우스의 카디널리티 문제와 정확히 같은 구조다"),
    "08-04": lambda: A.code_html("snippets/code/08-04-logql.txt"),
    # 09 · 운영
    "09-01": lambda: A.table_html("tables/09-01-tuning-knobs.tsv"),
    "09-02": lambda: fig("figures/ch09-fig2.svg", "uri 가 /api/orders/{id} 로 찍히게 한 것이 이 사고를 막는다"),
    "09-03": lambda: A.code_html("snippets/code/09-03-cardinality.promql"),
    "09-04": lambda: fig("figures/gap-09-04.svg"),
    # 10 · 테스팅과 카오스
    "10-01": lambda: lead(
        "쓸모 있는지 아는 유일한 방법은<br><b>이상을 일부러 만드는 것</b>"
        '<div style="font-size:24px;color:var(--muted);margin-top:22px;line-height:1.6">'
        "지연 주입 · 파드 킬 · 에러 강제 — 세 가지를 차례로 넣는다</div>",
        wide=True,
    ),
    "10-02": lambda: A.table_html("tables/10-02-gameday-sheet.tsv"),
    "10-03": lambda: lead(
        "폭발 반경을 <b>먼저</b> 정한다"
        '<div style="font-size:24px;color:var(--muted);margin-top:22px;line-height:1.6">'
        "파드 <b>1개</b> · 네임스페이스 <b>하나</b> · <b>5분</b><br>"
        "<code>duration</code> 을 반드시 넣는다 — 안 넣으면 수동으로 지울 때까지 계속된다</div>",
        wide=True,
    ),
    "10-04": lambda: A.table_html("tables/10-04-chaos-tools.tsv"),
    "10-05": lambda: lead(
        "파드는 Running, 실험은 <b>무반응</b>"
        '<div style="font-size:24px;color:var(--muted);margin-top:22px;line-height:1.6">'
        "<code>chaosDaemon.runtime: containerd</code><br>"
        "<code>chaosDaemon.socketPath: /run/containerd/containerd.sock</code></div>",
        wide=True,
    ),
    "10-06": lambda: fig("figures/gap-10-06.svg"),
    "10-07": lambda: lead(
        "안전장치를 빼면 <span class=\"warn\">가설이 기각된다</span>"
        '<div style="font-size:24px;color:var(--muted);margin-top:22px;line-height:1.6">'
        "가설: “레플리카가 여러 개면 파드 하나가 죽어도 사용자는 모른다”<br>"
        "<code>replicas: 1</code> 로 줄이면 그 전제가 사라진다</div>",
        wide=True,
    ),
    "10-08": lambda: fig("figures/ch10-fig1.svg", "1~3번은 실험 전에, 4번 판정 칸만 실험 후에 채운다"),
}

# 코드 스니펫 중 8줄을 넘지만 잘라내면 뜻이 깨지는 것 — 슬라이드 단위로 예외를 둔다.
BODY["10-06-code"] = lambda: A.code_html("snippets/code/10-06-networkchaos.yaml", max_lines=9)


# ── 동반 장표 ──────────────────────────────────────────────────────────────
# MANIFEST 가 한 장표에 자산을 둘 배정한 곳이 일곱 군데다. 둘 다 본문을 채우는
# 크기라 한 장에 넣으면 도판이 절반으로 줄어 읽히지 않는다. GUIDE 가 표에 대해
# 정한 규칙("줄이지 말고 장표를 쪼갠다")을 그대로 적용해 뒤에 한 장을 붙인다.
# 제목과 말할 것은 MANIFEST 의 도판 캡션에서 가져왔다.
COMPANION = {
    "02-06": {
        "title": "두 서비스를 **같은 방식**으로 계측한다",
        "body": lambda: fig("figures/ch02-fig1.svg"),
        "say": "차이는 게이트웨이만 `spring.cloud.gateway.requests` 를 더 내보낸다는 점이다 - 라우트 ID 태그가 붙어 어떤 백엔드가 느린지 바로 보인다",
    },
    "03-04": {
        "title": "startupProbe 가 없으면 **부팅 루프**가 만들어진다",
        "body": lambda: fig("figures/ch03-fig2.svg"),
        "say": "livenessProbe 가 기동 중인 앱을 죽은 것으로 보고 재시작시킨다 - 스프링 앱에 프로브를 걸 때 가장 흔한 사고다",
    },
    "05-03": {
        "title": "Export 옵션 하나가 uid 를 **변수로** 바꾼다",
        "body": lambda: fig("figures/ch05-fig2.svg"),
        "say": "Export for sharing externally 를 켜면 `${DS_...}` 로 치환된다 - 팀 밖으로 줄 때만 켜고, 우리끼리는 끄는 편이 임포트가 간단하다",
    },
    "06-01": {
        "title": "오류도 경고도 없이 타깃은 0개다",
        "body": lambda: out("snippets/output/06-01-up-zero.txt"),
        "say": "ServiceMonitor 는 정상적으로 만들어져 있다 - 프로메테우스 CR 의 셀렉터를 보면 이유가 나온다",
    },
    "06-04": {
        "title": "pod 는 바뀌어도 job 은 그대로다",
        "body": lambda: out("snippets/output/06-04-labels.txt"),
        "say": "그래서 파드가 죽고 떠도 하나의 시계열처럼 묶인다",
    },
    "06-05": {
        "title": "카운터에는 거의 항상 **rate()** 를 씌운다",
        "body": lambda: fig("figures/ch06-fig2.svg"),
        "say": "대괄호 안의 시간은 그만큼 돌아보며 평균 낸다는 뜻이다 - 스크레이프 간격의 4배 이상, 30초 간격이면 최소 2분",
    },
    "07-05": {
        "title": "pending 을 **눈으로** 보는 것이 가장 빠르다",
        "body": lambda: fig("figures/ch07-fig2.svg"),
        "say": "규칙을 만든 직후 프로메테우스 /alerts 화면에서 pending 을 확인한다 - 규칙이 동작하는지 아는 가장 빠른 방법이다",
    },
}


def default_body(slide):
    """BODY 에 정의가 없을 때의 기본 배치."""
    a = slide["assets"]
    if a.get("figures"):
        return fig(a["figures"][0])
    if a.get("tables"):
        return A.table_html(a["tables"][0])
    if a.get("output"):
        return out(a["output"][0])
    if a.get("code"):
        return A.code_html(a["code"][0])
    return lead(esc(slide["screen"]), wide=True)


# ── 프레임 장표 (표지 · 로드맵 · 마무리) ────────────────────────────────────
# MANIFEST 의 56장에는 없지만 figure_pool 이 "00장 표지 / 전체 로드맵 장표 /
# 마무리 장표"를 명시적으로 가리킨다. 표지 없는 덱은 쓸 수 없으므로 셋을 만들고
# figure_pool 이 지목한 도판을 쓴다.
# ── 조립 ───────────────────────────────────────────────────────────────────
# 장표를 먼저 중립적인 목록으로 만들고, 두 형식으로 각각 찍어낸다.
#   1) 에디터 덱   docs/html/study/observability-study.html   (편집·Export·배포)
#   2) 단독 실행본 docs/html/observability-study-slides.html  (브라우저에서 바로 발표)
# 내용을 두 번 적지 않는다 - 두 곳에 적으면 반드시 갈라진다.

HI = re.compile(r"\*\*(.+?)\*\*")


def rich(text):
    """MANIFEST 문구의 **강조** 표기를 스팬으로. 백틱은 코드로."""
    s = esc(text)
    s = HI.sub(r'<span class="hi">\1</span>', s)
    parts = s.split("`")
    return "".join(f"<code>{p}</code>" if i % 2 else p for i, p in enumerate(parts))


def collect(man):
    """장표 목록. 각 항목은 {cls, kicker, title, body, key, foot} 이다."""
    out = []
    chapters = man["chapters"]

    out.append({
        "cls": "title",
        "kicker": "관측성 실습 시리즈",
        "h1": esc(DECK_TITLE),
        "sub": esc(DECK_SUB),
        "meta": "kind v0.32.0 · kube-prometheus-stack 88.3.0 · Loki 3.x",
        "foot": "OVERVIEW",
    })

    rm = "".join(
        f'<div class="rm-item"><span class="n">{esc(c["chapter"])}</span>{esc(c["title"])}</div>'
        for c in chapters
    )
    out.append({
        "cls": "", "kicker": "전체 흐름",
        "title": "앞 장의 산출물이 다음 장의 <span class=\"hi\">입력</span>이 된다",
        "body": f'<div class="roadmap">{rm}</div>',
        "key": "건너뛰면 사전 조건이 깨진다. 마지막 10장은 앞의 열 장이 실제로 쓸모 있는지 판정하는 장이다.",
        "foot": "AGENDA",
    })

    for ch in chapters:
        # 챕터 타이틀 - 참조 덱의 .sec 구조. 그 장의 장표 제목을 미리 보여 준다.
        preview = "".join(
            f'<span>{esc(sl["id"])}</span>{esc(sl["title"])}<br>' for sl in ch["slides"]
        )
        out.append({
            "cls": "sec",
            "cnum": esc(ch["chapter"]),
            "h1": esc(ch["title"]),
            "sub": preview,
            "foot": f'SECTION {ch["chapter"]}',
        })

        for sl in ch["slides"]:
            out.append({
                "cls": "", "kicker": f'{ch["chapter"]} · {ch["title"]}',
                "title": rich(sl["title"]),
                "body": BODY.get(sl["id"], lambda s=sl: default_body(s))(),
                "key": rich(sl["say"]),
                "foot": f'{ch["chapter"]} · {ch["title"]}',
            })
            comp = COMPANION.get(sl["id"])
            if comp:
                out.append({
                    "cls": "", "kicker": f'{ch["chapter"]} · {ch["title"]}',
                    "title": rich(comp["title"]),
                    "body": comp["body"](),
                    "key": rich(comp["say"]),
                    "foot": f'{ch["chapter"]} · {ch["title"]}',
                })

    out.append({
        "cls": "", "kicker": "마무리",
        "title": "00장에서 그린 목표 구조가 <span class=\"hi\">그대로</span> 완성됐다",
        "body": fig("figures/ch09-fig1.svg"),
        "key": "화살표 방향 - 메트릭은 당겨 오고 로그는 밀어 넣는다 - 도 그때 그대로다.",
        "foot": "END",
    })
    return out


def inner_html(s):
    """장표 내용. 두 형식이 같은 마크업을 쓴다."""
    if s["cls"] == "title":
        return (
            f'<div class="kicker">{s["kicker"]}</div>'
            f'<h1>{s["h1"]}</h1>'
            f'<div class="sub">{s["sub"]}</div>'
            f'<div class="meta">{s["meta"]}</div>'
        )
    if s["cls"] == "sec":
        return (
            f'<div class="cnum">{s["cnum"]}</div>'
            f'<h1>{s["h1"]}</h1>'
            f'<div class="sub">{s["sub"]}</div>'
        )
    return (
        f'<div class="kicker">{esc(s["kicker"])}</div>'
        f'<h2>{s["title"]}</h2>'
        f'<div class="body">{s["body"]}</div>'
        f'<div class="key">{s["key"]}</div>'
    )


HEAD_LINKS = (
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard'
    '@v1.3.9/dist/web/static/pretendard.css" />\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    'family=JetBrains+Mono:wght@400;600&amp;display=swap" />\n'
)


def emit_editor(slides):
    """에디터 덱 - export-slide 섹션 구조. 스타일은 themes/study.css 가 준다."""
    n = len(slides)
    parts = []
    for i, s in enumerate(slides):
        cls = f' {s["cls"]}' if s["cls"] else ""
        parts.append(
            f'<section class="export-slide" data-index="{i}">\n'
            '<div class="export-stage slide-canvas-host">\n'
            f'<div class="slide{cls}" data-template="study">\n'
            f'<div class="slide-inner{cls}">{inner_html(s)}</div>\n'
            '<div class="slide-footer">'
            f'<span class="slide-footer-left">{esc(s["foot"])}</span>'
            f'<span class="slide-footer-right">{i + 1} / {n}</span>'
            "</div>\n</div>\n</div>\n</section>"
        )
    return (
        "<!DOCTYPE html>\n"
        '<html lang="ko" data-template="study">\n<head>\n<meta charset="UTF-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        f"<title>{esc(DECK_TITLE)}</title>\n"
        f'<meta name="deck-subtitle" content="{esc(DECK_SUB)}" />\n'
        + HEAD_LINKS
        + "</head>\n<body>\n"
        + "\n".join(parts)
        + "\n</body>\n</html>\n"
    )


def emit_standalone(slides):
    """단독 실행본 — 마크업은 에디터 덱과 같고 셸만 다르다.

    `<html data-template="study">` 를 두어야 인라인한 테마 CSS 의
    `[data-template="study"]` 스코프가 걸린다.
    """
    parts = []
    for s in slides:
        cls = f' {s["cls"]}' if s["cls"] else ""
        parts.append(
            f'<section class="slide{cls}">\n'
            f'<div class="slide-inner{cls}">{inner_html(s)}</div>\n'
            '<div class="slide-footer">'
            f'<span class="slide-footer-left">{esc(s["foot"])}</span>'
            '<span class="slide-footer-right"></span>'
            "</div>\n</section>"
        )
    return (
        "<!DOCTYPE html>\n"
        '<html lang="ko" data-template="study">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"<title>{esc(DECK_TITLE)} — {esc(DECK_SUB)}</title>\n"
        + HEAD_LINKS
        + f"<style>{SA.css()}</style>\n</head>\n<body>\n"
        '<div id="stage"><div id="deck">\n'
        + "\n\n".join(parts)
        + '\n<div id="prog"></div>\n</div></div>\n<div id="hud"></div>\n'
        f"<script>{SA.SCRIPT}</script>\n</body>\n</html>\n"
    )


def build():
    man = json.load(open(os.path.join(PPT, "MANIFEST.json"), encoding="utf-8"))
    slides = collect(man)
    n = len(slides)

    for path, doc, marker in (
        (OUT, emit_editor(slides), 'class="export-slide"'),
        (OUT_SA, emit_standalone(slides), '<section class="slide'),
    ):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(doc)
        assert doc.count(marker) == n, f"{path}: {doc.count(marker)} != {n}"
    return n


if __name__ == "__main__":
    n = build()
    print(f"{n}장 → {os.path.relpath(OUT, REPO)}")
    print(f"{n}장 → {os.path.relpath(OUT_SA, REPO)}  (단독 실행)")
