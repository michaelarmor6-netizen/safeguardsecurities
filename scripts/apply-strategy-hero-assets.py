#!/usr/bin/env python3
"""Point strategy page hero + mid CTA imagery at wp-content/... Hero Background PNGs."""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
REL_BASE = "../wp-content/uploads/sites/12/2022/02/"
PINCON = f"{REL_BASE}pincon033.jpg"


def asset_url(filename: str) -> str:
    return REL_BASE + quote(filename)


# slug -> basename under wp-content/uploads/sites/12/2022/02/
MAP: dict[str, str] = {
    "equities": "Equities Hero Background.png",
    "multi-asset": "Multi-Asset Hero Background.png",
    "real-estate": "Real Estate Hero Background.png",
    "healthcare": "Healthcare Hero Background.png",
    "infrastructure": "Infrastructure Hero Background.png",
    "top-dividend": "Top Dividend Hero Background.png",
    "tech-giants": "Tech Giants Hero Background.png",
    "energy-utilities": "Energy Infrastructure Hero Background.png",
}

HERO_IMG = re.compile(
    r'(<div class="elementor-element elementor-element-2061489\b[\s\S]*?'
    r'<img width="1920" height="952" src=")[^"]+(")',
    re.MULTILINE,
)


def main() -> None:
    for slug, fn in MAP.items():
        path = ROOT / slug / "index.html"
        text = path.read_text(encoding="utf-8")
        url = asset_url(fn)
        text2, n = HERO_IMG.subn(r"\1" + url + r"\2", text, count=1)
        if n != 1:
            raise SystemExit(f"hero replace failed for {slug}: {n} matches")
        if PINCON not in text2:
            raise SystemExit(f"pincon033 not found for {slug}")
        text2 = text2.replace(PINCON, url, 1)
        path.write_text(text2, encoding="utf-8", newline="\n")
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
