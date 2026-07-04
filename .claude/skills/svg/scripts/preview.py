#!/usr/bin/env python3
"""Selection preview server: open an SVG in the browser, click any element
to get its data-sae-id, paste that id back to Claude Code to request edits.

Usage:
  python3 preview.py input.svg [--port 8437]

The page auto-reloads when the file changes on disk (1s mtime polling),
so edits made by Claude Code appear immediately.
Stop with Ctrl+C.
"""
import argparse
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VIEWER_HTML = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>SVG Selection Preview</title>
<style>
  /* IBM Plex: 사용자 디자인 시스템 표준 폰트 (한글 UI/코드 병기) */
  :root { --accent: #0F62FE; --border: #d0d0d0; --text: #1a1a1a; --muted: #6b6b6b; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "IBM Plex Sans KR", "IBM Plex Sans", sans-serif;
         color: var(--text); background: #fafafa; height: 100vh;
         display: flex; flex-direction: column; }
  header { padding: 10px 16px; border-bottom: 1px solid var(--border);
           background: #fff; font-size: 13px; display: flex; gap: 16px; align-items: baseline; }
  header .file { font-weight: 600; }
  header .hint { color: var(--muted); }
  main { flex: 1; display: flex; min-height: 0; }
  /* 체커보드: 투명영역 표시용(기능적). gradient 미사용 — SVG 패턴 data URI */
  #stage { flex: 1; overflow: auto; padding: 24px;
           background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ffffff"/><rect width="8" height="8" fill="%23efefef"/><rect x="8" y="8" width="8" height="8" fill="%23efefef"/></svg>'); }
  #stage svg { max-width: 100%; height: auto; background: transparent; }
  aside { width: 300px; border-left: 1px solid var(--border); background: #fff;
          padding: 16px; font-size: 13px; overflow-y: auto; }
  aside h2 { font-size: 12px; font-weight: 600; color: var(--muted);
             text-transform: uppercase; letter-spacing: .04em; margin-bottom: 12px; }
  dl { display: grid; grid-template-columns: 64px 1fr; row-gap: 8px; column-gap: 8px; }
  dt { color: var(--muted); }
  dd { font-family: "IBM Plex Mono", monospace; word-break: break-all; }
  #copyBtn { margin-top: 16px; width: 100%; padding: 8px; font-size: 13px;
             border: 1px solid var(--accent); color: var(--accent); background: #fff;
             border-radius: 4px; cursor: pointer; font-family: inherit; }
  #copyBtn:disabled { border-color: var(--border); color: var(--muted); cursor: default; }
  .sae-hover { outline: 1px solid var(--accent); outline-offset: 1px; }
  .sae-selected { outline: 2px solid var(--accent); outline-offset: 1px; }
  #empty { color: var(--muted); }
</style>
</head>
<body>
<header>
  <span class="file" id="fileName"></span>
  <span class="hint">요소 클릭 → id 복사 → Claude Code에 붙여넣어 수정 지시</span>
</header>
<main>
  <div id="stage"></div>
  <aside>
    <h2>선택 요소</h2>
    <div id="empty">선택된 요소가 없습니다.</div>
    <dl id="info" hidden>
      <dt>sae-id</dt><dd id="fId"></dd>
      <dt>tag</dt><dd id="fTag"></dd>
      <dt>id</dt><dd id="fOrigId"></dd>
      <dt>text</dt><dd id="fText"></dd>
    </dl>
    <button id="copyBtn" disabled>id 복사</button>
  </aside>
</main>
<script>
"use strict";
let lastMtime = null;
let selected = null;

async function loadSvg() {
  const res = await fetch("/svg?t=" + Date.now());
  const text = await res.text();
  const stage = document.getElementById("stage");
  stage.innerHTML = text;
  const svg = stage.querySelector("svg");
  if (!svg) { stage.textContent = "SVG 파싱 실패"; return; }
  svg.addEventListener("mouseover", e => {
    const el = e.target.closest("[data-sae-id]");
    if (el && el !== svg) el.classList.add("sae-hover");
  });
  svg.addEventListener("mouseout", e => {
    const el = e.target.closest("[data-sae-id]");
    if (el) el.classList.remove("sae-hover");
  });
  svg.addEventListener("click", e => {
    const el = e.target.closest("[data-sae-id]");
    if (!el || el === svg) return;
    if (selected) selected.classList.remove("sae-selected");
    selected = el;
    el.classList.add("sae-selected");
    showInfo(el);
  });
}

function showInfo(el) {
  document.getElementById("empty").hidden = true;
  document.getElementById("info").hidden = false;
  document.getElementById("fId").textContent = el.getAttribute("data-sae-id");
  document.getElementById("fTag").textContent = el.tagName;
  document.getElementById("fOrigId").textContent = el.id || "—";
  const txt = (el.textContent || "").trim();
  document.getElementById("fText").textContent =
    txt ? (txt.length > 60 ? txt.slice(0, 60) + "…" : txt) : "—";
  const btn = document.getElementById("copyBtn");
  btn.disabled = false;
  btn.textContent = "id 복사";
}

document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!selected) return;
  const id = selected.getAttribute("data-sae-id");
  await navigator.clipboard.writeText(id);
  document.getElementById("copyBtn").textContent = id + " 복사됨";
});

async function pollMtime() {
  try {
    const res = await fetch("/mtime?t=" + Date.now());
    const m = await res.text();
    if (lastMtime !== null && m !== lastMtime) await loadSvg();
    lastMtime = m;
  } catch (_) { /* server stopped */ }
  setTimeout(pollMtime, 1000);
}

fetch("/name").then(r => r.text()).then(n => {
  document.getElementById("fileName").textContent = n;
  document.title = n + " — SVG Selection Preview";
});
loadSvg().then(pollMtime);
</script>
</body>
</html>
"""


def make_handler(svg_path: Path):
    class Handler(BaseHTTPRequestHandler):
        def _send(self, body: bytes, ctype: str) -> None:
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:  # noqa: N802
            route = self.path.split("?")[0]
            if route == "/":
                self._send(VIEWER_HTML.encode("utf-8"), "text/html; charset=utf-8")
            elif route == "/svg":
                self._send(svg_path.read_bytes(), "image/svg+xml")
            elif route == "/mtime":
                self._send(str(svg_path.stat().st_mtime).encode(), "text/plain")
            elif route == "/name":
                self._send(svg_path.name.encode("utf-8"), "text/plain; charset=utf-8")
            else:
                self.send_error(404)

        def log_message(self, *args) -> None:  # silence request logs
            pass

    return Handler


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("svg", type=Path)
    ap.add_argument("--port", type=int, default=8437)
    args = ap.parse_args()

    if not args.svg.is_file():
        sys.exit(f"file not found: {args.svg}")

    url = f"http://127.0.0.1:{args.port}/"
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(args.svg.resolve()))
    print(f"preview: {url}  (Ctrl+C to stop)")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
