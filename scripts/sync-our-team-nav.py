import re
from pathlib import Path

about = Path(r"d:\safeguardsecurities\our-team\index.html")
about_path = Path(r"d:\safeguardsecurities\about\index.html")
our_path = Path(r"d:\safeguardsecurities\our-team\index.html")

about_html = about_path.read_text(encoding="utf-8")
our_html = our_path.read_text(encoding="utf-8")

pat = re.compile(
    r"(<nav class=\"hfe-nav-menu__layout-horizontal[^>]*>)(.*?)(</nav>)",
    re.DOTALL,
)
m_about = pat.search(about_html)
m_our = pat.search(our_html)
if not m_about or not m_our:
    raise SystemExit("nav not found")

our_html = our_html[: m_our.start(2)] + m_about.group(2) + our_html[m_our.end(2) :]
our_path.write_text(our_html, encoding="utf-8")
print("synced nav from about to our-team")
