#!/usr/bin/env python3
"""Slide typography tightener.

Bump readability on report-deck slides without touching global theme tokens.

Two-pronged strategy:
  (1) inject a <style> block scoped to slides carrying data-fontup="1",
      so class-based tokens (.t-body, .bullet-list li, ...) get bumped.
  (2) rewrite inline `font-size:Npx` (10 <= N <= 20) inside those slides
      by `ratio` (default 1.22), since inline trumps the class-based rule.

Slides outside the requested ranges, and slides explicitly excluded,
are left untouched. PNG-embed slides are skipped because their text
lives inside a baked image (handled by slide-to-image pipeline).

Usage
-----
    python3 apply_text_bump.py DECK_HTML \
        --ranges 1418-1462,1465-1485,... \
        --ratio 1.22 \
        --style-anchor "<!-- FONTUP STYLE -->"

The deck HTML must contain a `<!-- FONTUP STYLE -->` marker once
(usually at the very top of <body>). The script idempotently rewrites
the style block at that anchor.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


STYLE_BLOCK = """<!-- FONTUP STYLE -->
<style id="slide-fontup">
.slide[data-fontup="1"] .t-body { font-size: 22px !important; line-height: 1.55 !important; }
.slide[data-fontup="1"] .bullet-list li { font-size: 21px !important; line-height: 1.55 !important; }
.slide[data-fontup="1"] .callout-body { font-size: 20px !important; line-height: 1.5 !important; }
.slide[data-fontup="1"] .t-h3 { font-size: 18px !important; }
.slide[data-fontup="1"] .t-caption { font-size: 17px !important; }
.slide[data-fontup="1"] .num-list li > div { font-size: 22px !important; }
.slide[data-fontup="1"] .num-list .sub { font-size: 17px !important; }
</style>
<!-- /FONTUP STYLE -->"""


INLINE_FONT_RE = re.compile(r"font-size\s*:\s*(\d+(?:\.\d+)?)px")
SLIDE_START_RE = re.compile(r'^(<div class="slide(?:[ \-][a-z]+)*" data-template="report")(.*?)>', re.DOTALL)


def parse_ranges(raw: str) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" not in chunk:
            raise ValueError(f"bad range: {chunk}")
        start_s, end_s = chunk.split("-", 1)
        out.append((int(start_s), int(end_s)))
    return out


def in_any_range(lineno: int, ranges: list[tuple[int, int]]) -> bool:
    return any(s <= lineno <= e for (s, e) in ranges)


def bump_inline(line: str, ratio: float) -> str:
    def repl(m: re.Match[str]) -> str:
        val = float(m.group(1))
        if 10.0 <= val <= 20.0:
            new = round(val * ratio * 2) / 2
            new_s = f"{int(new)}" if new == int(new) else f"{new}"
            return f"font-size:{new_s}px"
        return m.group(0)
    return INLINE_FONT_RE.sub(repl, line)


def add_fontup_attribute(line: str) -> tuple[str, bool]:
    """Add data-fontup="1" to a <div class="slide..."> line, idempotent."""
    if 'data-fontup=' in line:
        return line, False
    stripped = line.strip()
    m = SLIDE_START_RE.match(stripped)
    if not m:
        return line, False
    head = m.group(1)
    rest = m.group(2)
    indent_len = len(line) - len(line.lstrip())
    return f'{line[:indent_len]}{head} data-fontup="1"{rest}>', True


def apply(deck_path: Path, ranges: list[tuple[int, int]], ratio: float) -> dict[str, int]:
    raw = deck_path.read_text(encoding="utf-8")

    if "<!-- FONTUP STYLE -->" not in raw:
        raise SystemExit(
            "ERROR: deck has no '<!-- FONTUP STYLE -->' anchor. "
            "Insert that marker once near the top of <body> first."
        )

    block_re = re.compile(
        r"<!-- FONTUP STYLE -->.*?<!-- /FONTUP STYLE -->",
        re.DOTALL,
    )
    raw = block_re.sub(STYLE_BLOCK, raw, count=1)

    # NOTE: Use split('\n') instead of splitlines() because the deck contains
    # U+2028 (LINE SEPARATOR) inside code-block lines. splitlines() would treat
    # those as line breaks too, producing a line numbering that disagrees with
    # grep / sed and shifting every range incorrectly.
    lines = raw.split("\n")
    stats = {"slides_marked": 0, "inline_bumped": 0, "lines_in_range": 0}

    for i, line in enumerate(lines):
        lineno = i + 1
        if not in_any_range(lineno, ranges):
            continue
        stats["lines_in_range"] += 1
        new_line, marked = add_fontup_attribute(line)
        if marked:
            stats["slides_marked"] += 1
            line = new_line.rstrip("\n")
        bumped = bump_inline(line, ratio)
        if bumped != line:
            stats["inline_bumped"] += 1
        lines[i] = bumped

    deck_path.write_text("\n".join(lines), encoding="utf-8")
    return stats


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("deck", type=Path)
    p.add_argument("--ranges", required=True, help="e.g. 1418-1462,1465-1485,...")
    p.add_argument("--ratio", type=float, default=1.22)
    args = p.parse_args()

    ranges = parse_ranges(args.ranges)
    stats = apply(args.deck, ranges, args.ratio)
    print(f"slides marked: {stats['slides_marked']}")
    print(f"inline bumped: {stats['inline_bumped']}")
    print(f"lines touched: {stats['lines_in_range']}")


if __name__ == "__main__":
    main()
