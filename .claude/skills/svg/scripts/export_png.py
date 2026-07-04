#!/usr/bin/env python3
"""Export SVG to PNG with transparent or solid background.

Usage:
  python3 export_png.py input.svg                       # transparent, 1x
  python3 export_png.py input.svg --bg "#FFFFFF"        # white background
  python3 export_png.py input.svg --scale 2             # 2x
  python3 export_png.py input.svg --out /path/to/dir    # custom output dir

Output: {svg_dir}/output/{name}_{timestamp}.png (data-sae-id is stripped
from a temporary copy before rendering; the source file is not modified).

Requires: cairosvg (pip install cairosvg)
"""
import argparse
import re
import sys
import tempfile
from datetime import datetime
from pathlib import Path

try:
    import cairosvg
except ImportError:
    sys.exit("cairosvg is required: pip install cairosvg")

ID_RE = re.compile(r'\s+data-sae-id="[^"]*"')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("svg", type=Path)
    ap.add_argument("--bg", default=None, help='background color, e.g. "#FFFFFF" (default: transparent)')
    ap.add_argument("--scale", type=float, default=1.0, help="render scale (default 1)")
    ap.add_argument("--out", type=Path, default=None, help="output directory (default: {svg_dir}/output)")
    args = ap.parse_args()

    if not args.svg.is_file():
        sys.exit(f"file not found: {args.svg}")

    out_dir = args.out if args.out else args.svg.parent / "output"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_path = out_dir / f"{args.svg.stem}_{stamp}.png"

    # strip internal ids from a temp copy so exports stay clean
    content = ID_RE.sub("", args.svg.read_text(encoding="utf-8"))
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False, encoding="utf-8") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    kwargs = {"url": tmp_path, "write_to": str(out_path), "scale": args.scale}
    if args.bg:
        kwargs["background_color"] = args.bg
    cairosvg.svg2png(**kwargs)

    Path(tmp_path).unlink(missing_ok=True)
    print(f"exported: {out_path}")


if __name__ == "__main__":
    main()
