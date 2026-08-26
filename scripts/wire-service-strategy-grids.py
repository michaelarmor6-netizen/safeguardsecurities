#!/usr/bin/env python3
"""
Copy the wired Investment Strategies grid from stock/index.html into other
service pages that use the same Equities / b5ffc08 template (one level deep).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FOLDERS = ("options", "bonds", "crypto", "futures", "ipos")


def main() -> None:
    stock_path = ROOT / "stock" / "index.html"
    stock_lines = stock_path.read_text(encoding="utf-8").splitlines(keepends=True)
    # Lines 275-432 inclusive (1-based): widget-wrap contents under column 65de950
    wired_grid = "".join(stock_lines[274:432])

    view_all_pat = re.compile(
        r'(<div class="elementor-element elementor-element-f50b040\b[^>]*>\s*'
        r'<div class="elementor-widget-container">\s*'
        r'<div class="elementor-button-wrapper">\s*)'
        r'<a href="index\.html"',
        re.MULTILINE,
    )

    for folder in FOLDERS:
        path = ROOT / folder / "index.html"
        if not path.is_file():
            print(f"skip (missing): {path.relative_to(ROOT)}")
            continue
        text = path.read_text(encoding="utf-8")
        if 'class="sg-invest-card-link" href="../equities/index.html"' in text:
            print(f"skip (already wired): {path.relative_to(ROOT)}")
            continue
        if '<h2 class="ha-infobox-title">Equities</h2>' not in text:
            print(f"skip (no Equities tile): {path.relative_to(ROOT)}")
            continue

        lines = text.splitlines(keepends=True)
        if len(lines) < 432:
            print(f"skip (too short): {path.relative_to(ROOT)}")
            continue

        old_chunk = "".join(lines[274:432])
        if "elementor-element-a0b1126" not in old_chunk:
            print(f"skip (unexpected grid): {path.relative_to(ROOT)}")
            continue

        new_text = "".join(lines[:274] + [wired_grid] + lines[432:])
        new_text, nsubs = view_all_pat.subn(r'\1<a href="../index.html"', new_text, count=1)
        if nsubs != 1:
            print(f"warn: View All href not updated ({nsubs}x): {path.relative_to(ROOT)}")

        new_text = new_text.replace(
            '<link rel="stylesheet" href="/assets/site-chrome.css?v=9">',
            '<link rel="stylesheet" href="/assets/site-chrome.css?v=12">',
            1,
        )

        path.write_text(new_text, encoding="utf-8", newline="\n")
        print(f"wired: {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
