#!/usr/bin/env python3
"""Rename Our Services submenu item Mergers & Acquisitions -> M&A in header nav."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPLACEMENTS = (
    ('class="hfe-sub-menu-item">Mergers & Acquisitions</a>', 'class="hfe-sub-menu-item">M&amp;A</a>'),
    ('class="hfe-sub-menu-item">Mergers &amp; Acquisitions</a>', 'class="hfe-sub-menu-item">M&amp;A</a>'),
)


def main() -> None:
    changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        if "node_modules" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        new = text
        for old, repl in REPLACEMENTS:
            new = new.replace(old, repl)
        if new != text:
            path.write_text(new, encoding="utf-8", newline="\n")
            changed += 1
            print(path.relative_to(ROOT))
    print(f"Updated {changed} file(s).")


if __name__ == "__main__":
    main()
