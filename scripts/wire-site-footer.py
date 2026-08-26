#!/usr/bin/env python3
"""Inject site-config.js + site-footer.js before site-chrome.js on all marketing pages."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = "site-footer.js"
CONFIG_TAG = '<script src="/assets/site-config.js?v=1"></script>'
FOOTER_TAG = '<script src="/assets/site-footer.js?v=1"></script>'
INSERT_BLOCK = CONFIG_TAG + "\n" + FOOTER_TAG + "\n"
SITE_CHROME_RE = re.compile(
    r'(<script\s+src="/assets/site-chrome\.js[^"]*"></script>)',
    re.IGNORECASE,
)


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")
    if MARKER in text:
        return False
    if "site-chrome.js" not in text:
        return False
    new_text, n = SITE_CHROME_RE.subn(INSERT_BLOCK + r"\1", text, count=1)
    if n != 1:
        return False
    path.write_text(new_text, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    updated = 0
    skipped = 0
    for path in sorted(ROOT.rglob("*.html")):
        rel = path.relative_to(ROOT)
        if "node_modules" in rel.parts or "mobile" in rel.parts:
            continue
        if patch_file(path):
            updated += 1
            print(f"  + {rel}")
        else:
            skipped += 1
    print(f"\nUpdated {updated} file(s), skipped {skipped}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
