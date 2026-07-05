# Course-intro deck diagrams (slides 2-10). 1280x470 opaque cream frames,
# rendered @2x by ../level4/render.mjs (.frame screenshot).
import os, html as H

OUT = os.path.dirname(os.path.abspath(__file__))

# 폰트 선택 이유: 레벨 숫자는 기하학적 디스플레이 Outfit(조형 강한 숫자),
# 본문은 IBM Plex Sans KR(한글 가독), 라벨·번호는 IBM Plex Mono(시퀀스 표기 일관성).
CSS = """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
.frame{width:1280px;height:470px;background:#FAFAF8;font-family:'IBM Plex Sans KR',sans-serif;
  color:#1A1A18;padding:28px 36px;display:flex;flex-direction:column}
.mono{font-family:'IBM Plex Mono',monospace}
.row{display:flex;flex:1;gap:28px;align-items:stretch}
.lvblock{width:210px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;flex:0 0 auto}
.lvlabel{font-family:'IBM Plex Mono',monospace;font-size:17px;letter-spacing:.22em;color:#64748B;margin-bottom:2px}
.lvnum{font-family:'Outfit',sans-serif;font-size:225px;font-weight:600;line-height:1.12;color:#0F766E}
.right{flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px;min-width:0}
.rail{display:flex;align-items:stretch;gap:0}
.grid{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:14px}
.card{background:#FFFFFF;border:1px solid #D4D0C8;border-radius:6px;padding:20px 18px;flex:1;min-width:0;
  display:flex;flex-direction:column;gap:8px}
.card .pn{font-family:'IBM Plex Mono',monospace;font-size:13.5px;font-weight:600;color:#0F766E;letter-spacing:.06em}
.card .nm{font-size:15.5px;font-weight:500;line-height:1.45}
.arrow{flex:0 0 14px;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:15px}
.missions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.missions .k{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;letter-spacing:.14em;color:#0F766E;
  margin-right:4px}
.mission{display:flex;align-items:center;border:1px solid #0F766E;border-radius:6px;
  padding:10px 16px;background:#FFFFFF}
.mission .v{font-size:16px;font-weight:500}
/* map (slide 2) */
.stages{display:flex;align-items:stretch;flex:0 0 auto;margin:auto 0}
.stage{background:#FFFFFF;border:1px solid #D4D0C8;border-radius:6px;padding:16px 15px;flex:1;min-width:0;
  display:flex;flex-direction:column;gap:8px;justify-content:flex-start}
.stage .lv{display:flex;gap:6px}
.stage .lv span{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:600;color:#FFFFFF;background:#0F766E;
  border-radius:4px;padding:3px 9px}
.stage .t{font-size:20px;font-weight:700;line-height:1.3}
.stage .d{font-size:13.5px;color:#64748B;line-height:1.45}
.stage .tn{font-size:12.5px;font-weight:600;color:#64748B;margin-top:-3px}
.stage.alt{background:#4A5058;border-color:#4A5058}
.stage.alt .t,.stage.alt .pjitem{color:#FFFFFF}
.stage.alt .d,.stage.alt .tn{color:#C6CBD2}
.stage.alt .pjlab{color:#8FD8CD}
.stage.alt .pj{border-top-color:#6B7280}
.stage.alt .lv span{background:#FFFFFF;color:#374151}
.stage .pj{margin-top:auto;border-top:1px solid #E7E3DC;padding-top:9px;display:flex;flex-direction:column;gap:3px}
.stage .pjlab{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:600;letter-spacing:.14em;color:#0F766E}
.stage .pjitem{font-size:13.5px;font-weight:500;line-height:1.45}
.head{font-family:'IBM Plex Mono',monospace;font-size:14px;letter-spacing:.18em;color:#64748B;margin-bottom:10px}
/* paths (slide 10) */
.paths{display:flex;flex-direction:column;gap:15px;flex:1;justify-content:center}
.path{display:flex;align-items:center;gap:16px}
.path .lab{width:210px;flex:0 0 auto}
.path .lab .t{font-size:18px;font-weight:700}
.path .lab .d{font-size:13.5px;color:#64748B}
.chips{display:flex;align-items:center;gap:0;flex-wrap:nowrap}
.chip{font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:600;border:1px solid #D4D0C8;background:#FFFFFF;
  color:#1A1A18;border-radius:6px;padding:9px 15px}
.chip.on{background:#0F766E;border-color:#0F766E;color:#FFFFFF}
.sep{color:#94A3B8;font-size:15px;padding:0 9px}
"""

def page(body):
    return f"""<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600&family=Outfit:wght@600&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body style="margin:0"><div class="frame">{body}</div></body></html>"""

def esc(s): return H.escape(s, quote=False)

def level_diagram(num, parts, missions):
    n = len(parts)
    if n <= 5:
        cells = []
        for i, p in enumerate(parts):
            cells.append(f'<div class="card"><div class="pn">PART {i+1:02d}</div><div class="nm">{esc(p)}</div></div>')
            if i < n - 1: cells.append('<div class="arrow">→</div>')
        railhtml = f'<div class="rail">{"".join(cells)}</div>'
    else:
        cols = 3 if n == 6 else 4
        cells = ''.join(
            f'<div class="card"><div class="pn">PART {i+1:02d}</div><div class="nm">{esc(p)}</div></div>'
            for i, p in enumerate(parts))
        railhtml = f'<div class="grid" style="--cols:{cols}">{cells}</div>'
    chips = ''.join(f'<div class="mission"><span class="v">{esc(m)}</span></div>' for m in missions)
    return page(f"""
<div class="row">
  <div class="lvblock"><div class="lvlabel">LEVEL</div><div class="lvnum">{num}</div></div>
  <div class="right">
    {railhtml}
    <div class="missions"><span class="k">MISSION</span>{chips}</div>
  </div>
</div>""")

LEVELS = [
    (1, ["Terminal 과 Git 명령어의 이해", "Claude Code 개요 & 설치", "모델 선택 & Thinking 모드",
         "개발환경 설정", "핵심 설정 파일", "Accept Mode·턴·세션·컨텍스트"],
     ["Hello World 출력 — Python·TypeScript", "럭키드로우 당첨자 선정 웹페이지"]),
    (2, ["AI와 함께하는 개발의 원칙", "작은 단위로 쪼개기", "명확한 지시의 기술",
         "매 단계 리뷰하기", "CLAUDE.md 작성 가이드"],
     ["32가지 UI 컴포넌트 포트폴리오", "GitHub Pages 배포"]),
    (3, ["Prompt & Context Engineering", "Kent Beck의 증강코딩", "TDD (Red·Green·Refactor)",
         "SDD · SpecKit", "프로젝트 구조 설계"],
     ["카페 메뉴판 — 엑셀 연동", "마크다운 에디터"]),
    (4, ["Slash Commands", "Agent Skills 시스템", "Hooks",
         "MCP (Model Context Protocol)", "실습 — 커맨드·스킬·훅 제작"],
     ["나만의 커맨드·스킬·훅 만들기"]),
    (5, ["기획과 요구사항 정의", "개발 문서 작성", "명세서 설계", "SDD 워크플로 — GSD",
         "Handoff & Changelog", "디버깅 & 리팩토링", "프론트엔드 고도화"],
     ["마크다운 지식관리 시스템 — markflow KMS", "DB 설계 — PostgreSQL", "Google OAuth 로그인 연동"]),
    (6, ["환경 관리 전략", "CI/CD 통합", "보안 위협과 방어",
         "클라우드 배포 — Vercel·Railway·Cloudflare", "인증 & 메일 — OAuth·Resend", "비용 최적화 · SEO"],
     ["클라우드 호스팅 — Railway · Vercel · Neon", "Resend 메일 연동"]),
    (7, ["서브에이전트 (Subagent)", "Dynamic Workflows", "멀티 세션 협업 — Agent Teams·Worktree",
         "종합 — 무엇을 언제 고를까", "CI/CD 자동화 (Headless)"],
     ["서브에이전트 구축", "CLI 라이브러리 만들어보기"]),
]

STAGES = [
    (["L1"], "기초 도구", "터미널 · Git · 설치 · 모델 · 첫 세션",
     ["Hello World — Python·TS", "럭키드로우 웹페이지"]),
    (["L2", "L3"], "일하는 방법", "협업 원칙 · 컨텍스트 엔지니어링 · TDD · SDD",
     ["32가지 UI 컴포넌트", "GitHub Pages 배포", "카페 메뉴판(엑셀 연동)", "마크다운 에디터"]),
    (["L4"], "도구 확장", "커맨드 · 스킬 · Hook · MCP",
     ["나만의 커맨드·스킬·훅 제작"]),
    (["L5"], "실전 프로젝트", "markflow — 기획→명세→구현",
     ["마크다운 지식관리 시스템(KMS)", "DB 설계 — PostgreSQL", "Google OAuth 로그인 연동"]),
    (["L6"], "배포 · 운영", "CI/CD · 보안 · 실 서비스 론칭",
     ["클라우드 호스팅 — Railway · Vercel · Neon", "Resend 메일 연동"]),
    (["L7"], "규모 확장", "멀티 에이전트 오케스트레이션",
     ["서브에이전트 구축", "CLI 라이브러리 만들어보기"], "(중/고급 강의)"),
]

def map_diagram():
    cells = []
    for i, st in enumerate(STAGES):
        lvs, t, d, projects = st[:4]
        note = st[4] if len(st) > 4 else None
        badges = ''.join(f'<span>{lv}</span>' for lv in lvs)
        cls = ' alt' if note else ''
        tn = f'<div class="tn">{esc(note)}</div>' if note else ''
        pj = ''
        if projects:
            items = ''.join(f'<div class="pjitem">{esc(p)}</div>' for p in projects)
            pj = f'<div class="pj"><div class="pjlab">실습 프로젝트</div>{items}</div>'
        cells.append(f'<div class="stage{cls}"><div class="lv">{badges}</div><div class="t">{esc(t)}</div>{tn}<div class="d">{esc(d)}</div>{pj}</div>')
        if i < len(STAGES) - 1: cells.append('<div class="arrow">→</div>')
    return page(f'<div class="head">CLAUDE CODE MASTER · LEVEL 1–6 + L7(중/고급)</div><div class="stages" style="gap:0">{"".join(cells)}</div>')

PATHS = [
    ("비개발자 · 입문", "도구 + 방법론 기본기", ["L1", "L2", "L3"], False),
    ("실전 프로젝트 지향", "하나의 프로젝트를 배포까지", ["L3", "L5", "L6"], False),
    ("생산성 · 자동화 심화", "확장 + 오케스트레이션", ["L4", "L7"], False),
    ("완주 권장 경로", "도구 → 방법 → 확장 → 구현·배포 → 규모 확장", ["L1", "L2", "L3", "L4", "L5", "L6", "L7"], True),
]

def paths_diagram():
    rows = []
    for t, d, chain, full in PATHS:
        chips = ('<span class="sep">→</span>').join(
            f'<span class="chip{" on" if full else ""}">{lv}</span>' for lv in chain)
        rows.append(f'<div class="path"><div class="lab"><div class="t">{esc(t)}</div><div class="d">{esc(d)}</div></div>'
                    f'<div class="chips">{chips}</div></div>')
    return page(f'<div class="head">LEARNING PATHS</div><div class="paths">{"".join(rows)}</div>')

files = {}
for num, parts, mission in LEVELS:
    files[f'intro-level{num}.html'] = level_diagram(num, parts, mission)
files['intro-map.html'] = map_diagram()
files['intro-paths.html'] = paths_diagram()

for name, content in files.items():
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write(content)
    print('wrote', name)
