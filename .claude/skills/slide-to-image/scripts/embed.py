#!/usr/bin/env python3
"""Embed a rendered diagram PNG into a deck slide as a resizable export-overlay.

Usage:
  python3 embed.py <deck.html> "<title fragment>" <png>

- Finds the slide whose data-slot="title" CONTAINS the fragment (NOT body text —
  avoids matching cover/TOC/section dividers that mention the keyword).
- Rebuilds that slide as:  topbar + slide-inner(label + title) + <img class="export-overlay"> + footer
- The PNG is downscaled to 1600px wide and base64-embedded (self-contained; works
  in the Vite editor, standalone file, and print export — relative paths 404 in editor).
- Overlay geometry fits the content box (maxW 1144 x maxH 524, top 150, centered),
  so clicking it in the editor promotes to a Moveable overlay with drag/resize handles.
"""
import re, sys, base64, subprocess

def dims(png):
    o = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', png],
                       capture_output=True, text=True).stdout
    return (int(re.search(r'pixelWidth: (\d+)', o).group(1)),
            int(re.search(r'pixelHeight: (\d+)', o).group(1)))

def b64_1600(png):
    subprocess.run(['sips', '-Z', '1600', png, '--out', '/tmp/_s2i.png'], capture_output=True)
    return 'data:image/png;base64,' + base64.b64encode(open('/tmp/_s2i.png', 'rb').read()).decode()

def geom(w, h):
    maxW, maxH, top0 = 1144, 524, 150
    ar = w / h
    if ar > maxW / maxH:
        W, H = maxW, round(maxW / ar)
    else:
        H, W = maxH, round(maxH * ar)
    return round((1280 - W) / 2), round(top0 + (maxH - H) / 2), W, H

def main():
    deck, frag, png = sys.argv[1], sys.argv[2], sys.argv[3]
    s = open(deck, encoding='utf-8').read()
    secs = re.findall(r'<section class="export-slide".*?</section>', s, re.S)
    idx = next((i for i, sec in enumerate(secs)
                if re.search(r'data-slot="title"[^>]*>[^<]*' + re.escape(frag), sec)), None)
    if idx is None:
        sys.exit(f'ERROR: no slide whose title contains: {frag!r}')
    sec = secs[idx]
    lbl_m = re.search(r'data-slot="label"[^>]*>(.*?)</', sec, re.S)
    lbl = lbl_m.group(1).strip() if lbl_m else ''
    ttl = re.search(r'data-slot="title"[^>]*>(.*?)</', sec, re.S).group(1).strip()
    ft = re.search(r'<div class="slide-footer".*?</span>\s*</div>', sec, re.S).group(0)
    di = re.search(r'data-index="(\d+)"', sec).group(1)
    w, h = dims(png)
    l, t, W, H = geom(w, h)
    img = (f'<img class="export-overlay" src="{b64_1600(png)}" alt="{ttl}" '
           f'style="left:{l}px; top:{t}px; width:{W}px; height:{H}px;" />')
    secs[idx] = (
        f'<section class="export-slide" data-index="{di}">\n'
        '<div class="export-stage slide-canvas-host">\n'
        '<div class="slide" data-template="report">\n  <div class="slide-topbar"></div>\n'
        '  <div class="slide-inner" spellcheck="false">\n'
        f'    <div class="t-chapter" data-slot="label">{lbl}</div>\n'
        f'    <div class="t-title" data-slot="title">{ttl}</div>\n  </div>\n'
        f'  {img}\n  {ft}\n</div>\n</div>\n</section>')
    final = [re.sub(r'(data-index=")\d+(")', r'\g<1>%d\g<2>' % i, x, count=1)
             for i, x in enumerate(secs)]
    first = s.index('<section class="export-slide"')
    head, tail = s[:first], s[s.rindex('</section>') + 10:]
    open(deck, 'w', encoding='utf-8').write(head + "\n".join(final) + tail)
    print(f'embedded "{png}" -> slide idx {idx} (page {idx+1}) of {deck}')

if __name__ == '__main__':
    main()
