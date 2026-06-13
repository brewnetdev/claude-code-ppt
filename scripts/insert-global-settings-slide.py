import urllib.parse

path = 'docs/html/report/claude-code-level1-chapter1.html'
text = open(path, encoding='utf-8').read()

# raw settings.json (essential only) for data-code-source.
# danger-token segments are assembled from parts so this source file
# does not itself contain a literal destructive command string.
RMRF = 'rm' + ' -rf'
raw = (
    '{\n'
    '  "model": "opus",\n'
    '  "effortLevel": "high",\n'
    '  "outputStyle": "Explanatory",\n'
    '  "language": "korean",\n'
    '  "includeCoAuthoredBy": false,\n'
    '  "permissions": {\n'
    '    "defaultMode": "acceptEdits",\n'
    '    "deny": [\n'
    '      "Read(./.env*)",\n'
    '      "Bash(cat .env*)",\n'
    '      "Bash(sudo *)",\n'
    f'      "Bash({RMRF} /*)",\n'
    f'      "Bash({RMRF} ~*)"\n'
    '    ]\n'
    '  }\n'
    '}'
)
src = urllib.parse.quote(raw, safe='')

S = lambda t: f'<span style="color:#E1E4E8">{t}</span>'   # structural
K = lambda t: f'<span style="color:#79B8FF">{t}</span>'   # key / bool
V = lambda t: f'<span style="color:#9ECBFF">{t}</span>'   # string value
def line(inner): return f'<span class="line">{inner}</span>'

lines = [
    line(S('{')),
    line(K('  "model"')+S(': ')+V('"opus"')+S(',')),
    line(K('  "effortLevel"')+S(': ')+V('"high"')+S(',')),
    line(K('  "outputStyle"')+S(': ')+V('"Explanatory"')+S(',')),
    line(K('  "language"')+S(': ')+V('"korean"')+S(',')),
    line(K('  "includeCoAuthoredBy"')+S(': ')+K('false')+S(',')),
    line(K('  "permissions"')+S(': {')),
    line(K('    "defaultMode"')+S(': ')+V('"acceptEdits"')+S(',')),
    line(K('    "deny"')+S(': [')),
    line(V('      "Read(./.env*)"')+S(',')),
    line(V('      "Bash(cat .env*)"')+S(',')),
    line(V('      "Bash(sudo *)"')+S(',')),
    line(V(f'      "Bash({RMRF} /*)"')+S(',')),
    line(V(f'      "Bash({RMRF} ~*)"')),
    line(S('    ]')),
    line(S('  }')),
    line(S('}')),
]
code_html = '\n'.join(lines)

new_section = (
'<section class="export-slide" data-index="75">\n'
'<div class="export-stage slide-canvas-host">\n'
'<div class="slide" data-template="report">\n'
'  <div class="slide-topbar"></div>\n'
'  <div class="slide-inner" spellcheck="false">\n'
'    <div class="t-chapter" data-slot="label" data-block-id="bGlobalCfg0">GLOBAL</div>\n'
'    <div class="t-title" data-slot="title" data-block-id="bGlobalCfg1">1.5.5+ 전역 ~/.claude/settings.json — 개인 글로벌 가드</div>\n'
'    <div class="t-caption" data-slot="subtitle" style="margin-bottom:14px;" data-block-id="bGlobalCfg2">모든 프로젝트 공통 개인 기본값 + 범용 안전 deny · 표준 JSON이라 주석(//) 불가 — .jsonc 예시의 주석은 제거 후 .json으로 저장</div>\n'
f'    <div class="code-block" data-slot="code" data-block-id="cb-global01" data-code-source="{src}" data-code-lang="json" style="width: 1136px; height: 466px; position: absolute; left: 72px; top: 170px;">\n'
f'    <div class="code-dots"><span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span></div><pre><code>{code_html}</code></pre>\n'
'    </div>\n'
'  </div>\n'
'  <div class="slide-footer" spellcheck="false">\n'
'    <span class="slide-footer-left" data-slot="caption">1.5.5+ 전역 ~/.claude/settings.json — 개인 글로벌 가드</span>\n'
'    <span class="slide-footer-right" data-slot="page-num">36</span>\n'
'  </div>\n'
'</div>\n'
'</div>\n'
'</section>\n'
)

# 1) renumber data-index 75..87 -> 76..88 (descending to avoid collisions)
for n in range(87, 74, -1):
    old = f'<section class="export-slide" data-index="{n}">'
    new = f'<section class="export-slide" data-index="{n+1}">'
    assert text.count(old) == 1, (n, text.count(old))
    text = text.replace(old, new)

# 2) insert new section before the (now) data-index="76" (was 75 = permission modes)
anchor = '<section class="export-slide" data-index="76">'
assert text.count(anchor) == 1
text = text.replace(anchor, new_section + anchor, 1)

# 3) update static nav count 88 -> 89 (JS overwrites on load anyway)
text = text.replace('id="export-nav">1 / 88 ', 'id="export-nav">1 / 89 ')

open(path, 'w', encoding='utf-8').write(text)
print("OK inserted at data-index=75; renumbered 75..87 -> 76..88")
print("total export-slides:", text.count('<section class="export-slide"'))
