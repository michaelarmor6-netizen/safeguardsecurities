#!/usr/bin/env python3
"""Fix broken 'Contact us' header buttons on archived 2022 post pages."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PAT_OLD = '''			<a href="index.html" class="elementor-button-link elementor-button elementor-size-sm elementor-animation-shrink" role="button">
						<span class="elementor-button-content-wrapper">
							<span class="elementor-button-icon elementor-align-icon-left">
				<i aria-hidden="true" class="far fa-user"></i>			</span>
						<span class="elementor-button-text">Contact us</span>'''


def main() -> None:
    touched = 0
    for p in ROOT.rglob("index.html"):
        if "feed" in p.parts or "wp-content" in p.parts:
            continue
        rel = p.relative_to(ROOT)
        if len(rel.parts) < 4 or rel.parts[0] != "2022":
            continue
        raw = p.read_text(encoding="utf-8")
        if PAT_OLD not in raw:
            continue
        depth = len(rel.parts) - 1  # dirs from ROOT to folder containing index.html
        prefix = "../" * depth
        fixed = PAT_OLD.replace(
            'href="index.html"',
            f'href="{prefix}contact/index.html"',
            1,
        )
        p.write_text(raw.replace(PAT_OLD, fixed, 1), encoding="utf-8", newline="\n")
        touched += 1
        print(p.relative_to(ROOT))
    print(f"Done. {touched} files.")


if __name__ == "__main__":
    main()
