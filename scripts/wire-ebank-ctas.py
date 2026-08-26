#!/usr/bin/env python3
"""Wire header Login, footer Log In / Create a free account, and Start Your Account CTAs."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGIN = "https://app.safeguardsecurities.us/login"
REGISTER = "https://app.safeguardsecurities.us/register"

# Must not span </a>: otherwise a /contact anchor without an icon can "reach" the next Login button (single-page artefact).
_TDOT = r"(?:(?!</a>).)*?"

LOGIN_BTN_RE = re.compile(
    r'(<a\s+[^>]*?)href="/contact/index.html"([^>]*>\s*<span class="elementor-button-content-wrapper">'
    + _TDOT
    + r'<span class="elementor-button-icon[^>]*>'
    + _TDOT
    + r'class="far fa-user"'
    + _TDOT
    + r"</span>\s*<span class=\"elementor-button-text\">Login</span>)",
    re.MULTILINE | re.DOTALL,
)

START_ACCOUNT_RE = re.compile(
    r'(<a\s+[^>]*?)href="/contact/index.html"([^>]*>\s*<span class="elementor-button-content-wrapper">'
    + _TDOT
    + r'<span class="elementor-button-text">Start Your Account</span>)',
    re.MULTILINE | re.DOTALL,
)


def patch_html(content: str) -> str:
    # Footer / list — existing anchors
    content = content.replace(
        '<a href="/contact/index.html"><span class="elementor-icon-list-text">Log In</span></a>',
        f'<a href="{LOGIN}"><span class="elementor-icon-list-text">Log In</span></a>',
    )
    content = content.replace(
        '<a href="/contact/index.html"><span class="elementor-icon-list-text">Create a free account</span></a>',
        f'<a href="{REGISTER}"><span class="elementor-icon-list-text">Create a free account</span></a>',
    )
    content = content.replace(
        '<a href="https://app.safeguardsecurities.us"><span class="elementor-icon-list-text">Create a free account</span></a>',
        f'<a href="{REGISTER}"><span class="elementor-icon-list-text">Create a free account</span></a>',
    )

    # Icon-list items that only had bare spans (no <a>)
    content = re.sub(
        r'(<li class="elementor-icon-list-item">\s*)<span class="elementor-icon-list-text">Log In</span>',
        rf'\1<a href="{LOGIN}"><span class="elementor-icon-list-text">Log In</span></a>',
        content,
    )
    content = re.sub(
        r'(<li class="elementor-icon-list-item">\s*)<span class="elementor-icon-list-text">Create a free account</span>',
        rf'\1<a href="{REGISTER}"><span class="elementor-icon-list-text">Create a free account</span></a>',
        content,
    )

    content = LOGIN_BTN_RE.sub(rf'\1href="{LOGIN}"\2', content)
    content = START_ACCOUNT_RE.sub(rf'\1href="{REGISTER}"\2', content)
    return content


def main() -> int:
    changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        if "node_modules" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        new = patch_html(text)
        if new != text:
            path.write_text(new, encoding="utf-8", newline="")
            changed += 1
            print(path.relative_to(ROOT))
    print(f"Updated {changed} file(s).", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
