#!/usr/bin/env python3
"""
Wire 'Factors to Consider' Read More targets on cloned service pages and fixes in
single-page-site-fixed.html.

- Fundamental Analysis: widget 913399a -> ../fundamental-and-technical-analysis/
- Investing Essentials: widget b62dba7 -> ../investing-essentials/
- Portfolio Management: widget 34a850d -> ../portfolio-management/

single-page-site-fixed.html (About-style duplicate):
- 7c5ee5c Fundamental Analysis -> fundamental-and-technical-analysis/
- dedc6a4 Portfolio Management -> portfolio-management/
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HREF_FUND_SERVICES = "../fundamental-and-technical-analysis/index.html"
HREF_FUND_ROOT = "fundamental-and-technical-analysis/index.html"
HREF_ESSENTIALS_SERVICES = "../investing-essentials/index.html"
HREF_PORTFOLIO_SERVICES = "../portfolio-management/index.html"
HREF_PORTFOLIO_ROOT = "portfolio-management/index.html"

BTN_WRAPPER = (
    r"\s*<div class=\"elementor-widget-container\">\s*"
    r"<div class=\"elementor-button-wrapper\">\s*"
)

FUNDAMENTAL_BTN = re.compile(
    r'(<div class="elementor-element elementor-element-913399a\b[^>]*>' + BTN_WRAPPER + r')<a href="index\.html"',
    re.MULTILINE,
)
INVESTING_BTN = re.compile(
    r'(<div class="elementor-element elementor-element-b62dba7\b[^>]*>' + BTN_WRAPPER + r')<a href="index\.html"',
    re.MULTILINE,
)
PORTFOLIO_BTN = re.compile(
    r'(<div class="elementor-element elementor-element-34a850d\b[^>]*>' + BTN_WRAPPER + r')<a href="index\.html"',
    re.MULTILINE,
)

FIX_7C_INDEX = re.compile(
    r'(<div class="elementor-element elementor-element-7c5ee5c\b[^>]*>[\s\S]*?'
    r'<a class="elementor-button-link[^"]*" href=")index\.html(" role="button")',
    re.MULTILINE,
)
FIX_DEDC_PORTFOLIO = re.compile(
    r'(<div class="elementor-element elementor-element-dedc6a4\b[^>]*>[\s\S]*?'
    r'<a class="elementor-button-link[^"]*" href=")index\.html(" role="button")',
    re.MULTILINE,
)
FUNDAMENTAL_BAD_FILE = re.compile(
    r'(<div class="elementor-element elementor-element-913399a\b[^>]*>'
    + BTN_WRAPPER
    + r')<a href="fundamental-analysis\.html"',
    re.MULTILINE,
)


def patch_file(path: Path) -> tuple[int, str]:
    raw = path.read_text(encoding="utf-8")
    out = raw
    n = 0

    out, c = FUNDAMENTAL_BTN.subn(rf'\1<a href="{HREF_FUND_SERVICES}"', out)
    n += c
    out, c = FUNDAMENTAL_BAD_FILE.subn(rf'\1<a href="{HREF_FUND_SERVICES}"', out)
    n += c
    out, c = INVESTING_BTN.subn(rf'\1<a href="{HREF_ESSENTIALS_SERVICES}"', out)
    n += c
    out, c = PORTFOLIO_BTN.subn(rf'\1<a href="{HREF_PORTFOLIO_SERVICES}"', out)
    n += c

    if path.name == "single-page-site-fixed.html":
        out, c = FIX_7C_INDEX.subn(rf"\1{HREF_FUND_ROOT}\2", out)
        n += c
        out, c = FIX_DEDC_PORTFOLIO.subn(rf"\1{HREF_PORTFOLIO_ROOT}\2", out)
        n += c

    return n, out


def main() -> None:
    total_updates = 0
    touched = 0
    skip = {"_site", ".git"}
    for path in sorted(ROOT.rglob("*.html")):
        if path.suffix.lower() != ".html":
            continue
        if any(p in skip for p in path.parts):
            continue
        n, updated = patch_file(path)
        if not n:
            continue
        path.write_text(updated, encoding="utf-8", newline="\n")
        total_updates += n
        touched += 1
        print(f"{path.relative_to(ROOT)}\t({n}x)")
    print(f"Done. {touched} files, {total_updates} href updates.")


if __name__ == "__main__":
    main()
