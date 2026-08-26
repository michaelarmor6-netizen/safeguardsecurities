import re
from pathlib import Path

path = Path(r"d:\safeguardsecurities\our-team\index.html")
html = path.read_text(encoding="utf-8")

if "our-team.css" not in html:
    html = html.replace(
        '<meta name="msapplication-TileImage"',
        '<link rel="stylesheet" href="/assets/site-chrome.css?v=4">\n'
        '<link rel="stylesheet" href="/assets/our-team.css?v=9">\n'
        '<script src="/assets/our-team.js?v=4" defer></script>\n'
        '<meta name="msapplication-TileImage"',
    )

intro_pat = re.compile(
    r'<section class="elementor-section elementor-top-section elementor-element elementor-element-837f31e.*?</section>\s*'
    r'<section class="elementor-section elementor-top-section elementor-element elementor-element-c685e9b',
    re.DOTALL,
)
new_intro = """<section class="elementor-section elementor-top-section elementor-element elementor-element-837f31e sg-team-intro-section elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="837f31e" data-element_type="section" data-settings="{&quot;_ha_eqh_enable&quot;:false}">
\t\t\t\t\t\t\t<div class="elementor-background-overlay"></motion.div>
\t\t\t\t\t\t\t<div class="elementor-container elementor-column-gap-default">
\t\t\t\t\t<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-e991d63 sg-team-intro-col" data-id="e991d63" data-element_type="column">
\t\t\t<div class="elementor-widget-wrap elementor-element-populated">
\t\t\t\t\t\t\t\t<div class="elementor-element elementor-element-f31a6b3 elementor-widget elementor-widget-heading" data-id="f31a6b3" data-element_type="widget" data-widget_type="heading.default">
\t\t\t\t<div class="elementor-widget-container">
\t\t\t<h2 class="elementor-heading-title elementor-size-default">Executive Leadership</h2>\t\t
\t\t</div>
\t\t\t\t</div>
\t\t\t\t<div class="elementor-element elementor-element-3564999 sg-team-intro-copy elementor-widget elementor-widget-text-editor" data-id="3564999" data-element_type="widget" data-widget_type="text-editor.default">
\t\t\t\t<div class="elementor-widget-container">
\t\t\t\t<p class="sg-intro-lead">At Safeguard Security Inc, our purpose is to work together to build better financial futures for our clients. We believe investing over the long term is critical to achieving that. As a family and management-owned company, we think generationally about the services we build and how we invest on our clients' behalf.</p><p>Our focus is delivering sustainable investment returns while managing our impact on society and the environment. We incorporate sustainability into our operations and investment process, partnering with investee companies to operate more sustainably—delivering long-term returns and a better future for all.</p>
\t\t\t\t\t\t</div>
\t\t\t\t</div>
\t\t\t\t<div class="sg-team-intro-visual" aria-hidden="true">
\t\t\t\t\t<img src="../wp-content/uploads/sites/12/2022/02/our-team.png" alt="" width="640" height="480" loading="lazy" />
\t\t\t\t</div>
\t\t\t\t\t</div>
\t\t</div>
\t\t\t\t\t\t\t</div>
\t\t</section>
\t\t\t\t<section class="elementor-section elementor-top-section elementor-element elementor-element-c685e9b"""
new_intro = new_intro.replace("<motion.div", "<div").replace("</motion.div>", "</div>")

m = intro_pat.search(html)
if m:
    html = html[: m.start()] + new_intro + html[m.end() - len("c685e9b") :]

html = html.replace(
    "elementor-element-c685e9b elementor-section-boxed",
    "elementor-element-c685e9b sg-team-grid-section sg-team-leadership-grid elementor-section-boxed",
    1,
)
html = html.replace(
    "elementor-element-8a4ceb6 elementor-section-boxed",
    "elementor-element-8a4ceb6 sg-team-grid-section sg-team-leadership-grid sg-team-grid-continued elementor-section-boxed",
    1,
)

if "sg-team-ceo-col" not in html:
    ceo_col = """
\t\t\t\t\t<div class="elementor-column elementor-col-25 elementor-top-column elementor-element sg-team-ceo-col" data-element_type="column">
\t\t\t<div class="elementor-widget-wrap elementor-element-populated">
\t\t\t\t\t\t\t\t<div class="elementor-element elementor-element-39f70b5 sg-ceo-card ha-infobox elementor-widget elementor-widget-ha-infobox happy-addon" data-id="39f70b5" data-element_type="widget" data-widget_type="ha-infobox.default">
\t\t\t\t<div class="elementor-widget-container">
\t\t<div class="ha-infobox-body">
\t\t\t<h2 class="ha-infobox-title">Von Levinson</h2>
\t\t\t\t\t\t\t<div class="ha-infobox-text">
\t\t\t\t\t<p>Chief Executive Officer</p>
\t\t\t\t</div>
\t\t\t\t\t</div>
\t\t\t\t</div>
\t\t\t\t</div>
\t\t\t\t\t</div>
\t\t</div>
"""
    marker = 'data-id="c685e9b" data-element_type="section"'
    idx = html.find(marker)
    container_idx = html.find('<div class="elementor-container elementor-column-gap-default">', idx)
    insert_at = html.find(">", container_idx) + 1
    html = html[:insert_at] + ceo_col + html[insert_at:]

html = re.sub(
    r'\s*<figure class="ha-infobox-figure ha-infobox-figure--image">.*?</figure>\s*',
    "\n",
    html,
    flags=re.DOTALL,
)

if "site-chrome.js" not in html:
    html = html.replace("</body>", '<script src="/assets/site-chrome.js?v=4"></script>\n</body>')

path.write_text(html, encoding="utf-8", newline="\n")
print("patched", path, "bytes", path.stat().st_size)
