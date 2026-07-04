#!/usr/bin/env python3
"""Inject or strip stable data-sae-id attributes on every SVG element.

Usage:
  python3 tag_ids.py input.svg          # inject ids (idempotent, in-place)
  python3 tag_ids.py input.svg --strip  # remove all data-sae-id (in-place)

Requires: lxml (pip install lxml)
"""
import argparse
import sys
from pathlib import Path

try:
    from lxml import etree
except ImportError:
    sys.exit("lxml is required: pip install lxml")

ATTR = "data-sae-id"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("svg", type=Path)
    ap.add_argument("--strip", action="store_true", help="remove all data-sae-id")
    args = ap.parse_args()

    if not args.svg.is_file():
        sys.exit(f"file not found: {args.svg}")

    parser = etree.XMLParser(remove_blank_text=False, strip_cdata=False)
    tree = etree.parse(str(args.svg), parser)
    root = tree.getroot()

    count = 0
    if args.strip:
        for el in root.iter():
            if isinstance(el.tag, str) and ATTR in el.attrib:
                del el.attrib[ATTR]
                count += 1
        action = "stripped"
    else:
        # continue numbering after the current max to stay idempotent
        existing = [
            int(el.get(ATTR)[1:])
            for el in root.iter()
            if isinstance(el.tag, str)
            and el.get(ATTR, "").startswith("e")
            and el.get(ATTR)[1:].isdigit()
        ]
        seq = max(existing, default=0)
        for el in root.iter():
            if not isinstance(el.tag, str):  # skip comments / PIs
                continue
            if ATTR not in el.attrib:
                seq += 1
                el.set(ATTR, f"e{seq:04d}")
                count += 1
        action = "tagged"

    tree.write(str(args.svg), xml_declaration=True, encoding="utf-8")
    print(f"{action} {count} element(s) in {args.svg}")


if __name__ == "__main__":
    main()
