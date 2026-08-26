"""Wrap homepage 'Where We Invest' cards with links and generate missing strategy pages."""
from pathlib import Path
import re

ROOT = Path(r"d:\safeguardsecurities")
INDEX = ROOT / "index.html"
TEMPLATE = ROOT / "etfs" / "index.html"

CARD_LINKS = {
    "cc5138e": ("equities/index.html", "Equities"),
    "c4f2ba3": ("multi-asset/index.html", "Multi-Asset"),
    "17ff583": ("real-estate/index.html", "Real Estate"),
    "2980061": ("healthcare/index.html", "Healthcare"),
    "71e9f8f": ("infrastructure/index.html", "Infrastructure"),
    "93b0abd": ("top-dividend/index.html", "Top Dividend"),
    "7daef31": ("consumer-discretionary/index.html", "Consumer Discretionary"),
    "52129b1": ("tech-giants/index.html", "Tech Giants"),
    "fd412ef": ("energy-utilities/index.html", "Energy & Utilities"),
}

NEW_PAGES = [
    {
        "slug": "commodities",
        "title": "Commodities",
        "hero_label": "Commodities",
        "hero_img": "../wp-content/uploads/sites/12/2022/02/service-headers/header-futures.png",
        "main_heading": "Commodities &amp; Natural Resources",
        "intro": (
            "Safeguard Securities provides institutional access to global commodity markets "
            "including energy, metals, and agricultural products. Our platform supports physical "
            "and derivative exposure with disciplined risk controls and transparent execution."
        ),
        "platform_heading": "Our Commodities Platform Delivers",
        "platform_text": (
            "Clients gain diversified commodity exposure through futures, ETFs, and structured "
            "vehicles with real-time margin monitoring, cross-asset hedging tools, and "
            "research-backed allocation frameworks tailored to inflation and macro cycles."
        ),
        "boxes": [
            ("Group-3508.png", "ENERGY"),
            ("Group-3513.png", "PRECIOUS METALS"),
            ("Group-3512.png", "INDUSTRIAL"),
            ("Group-3509.png", "AGRICULTURE"),
            ("Group-3511.png", "HEDGING"),
            ("Group-3510.png", "RESEARCH"),
        ],
    },
    {
        "slug": "mutual-funds",
        "title": "Mutual Funds",
        "hero_label": "Mutual Funds",
        "hero_img": "../wp-content/uploads/sites/12/2022/02/service-headers/header-etfs.png",
        "main_heading": "Institutional Mutual Fund Access",
        "intro": (
            "Our mutual fund platform offers curated access to professionally managed portfolios "
            "across equity, fixed income, and multi-asset strategies—including Safeguard's "
            "proprietary SG Mutual Funds for fractional share participation."
        ),
        "platform_heading": "Our Mutual Fund Platform Delivers",
        "platform_text": (
            "Investors benefit from consolidated reporting, due diligence screening, model "
            "portfolio construction, and ongoing manager oversight designed for long-term "
            "wealth accumulation and institutional governance standards."
        ),
        "boxes": [
            ("Group-3508.png", "EQUITY FUNDS"),
            ("Group-3513.png", "SECTOR FUNDS"),
            ("Group-3512.png", "BALANCED"),
            ("Group-3509.png", "SG MUTUAL FUNDS"),
            ("Group-3511.png", "FIXED INCOME"),
            ("Group-3510.png", "TARGET DATE"),
        ],
    },
    {
        "slug": "consumer-discretionary",
        "title": "Consumer Discretionary",
        "hero_label": "Consumer Discretionary",
        "hero_img": "../wp-content/uploads/sites/12/2022/02/Consumer Discretionary Hero Background.png",
        "intro": (
            "Capture growth in retail, leisure, automotive, and lifestyle brands through "
            "sector-focused equity strategies. We combine fundamental research with macro "
            "consumer indicators to identify durable demand trends."
        ),
        "platform_heading": "Our Consumer Sector Platform Delivers",
        "platform_text": (
            "Access single-name equities, sector ETFs, and thematic baskets with liquidity "
            "screening, earnings catalyst tracking, and risk budgeting aligned to your "
            "portfolio objectives."
        ),
        "boxes": [
            ("Group-3509.png", "RETAIL"),
            ("Group-3513.png", "TRAVEL &amp; LEISURE"),
            ("Group-3512.png", "AUTOMOTIVE"),
            ("Group-3508.png", "E-COMMERCE"),
            ("Group-3511.png", "LUXURY"),
            ("Group-3510.png", "HOSPITALITY"),
        ],
    },
    {
        "slug": "technology-sector",
        "title": "Technology Sector",
        "hero_label": "Technology Sector",
        "hero_img": "../wp-content/uploads/sites/12/2022/02/Technology Sector Hero Background(1).png",
        "intro": (
            "From established software leaders to emerging innovators, Safeguard provides "
            "institutional-grade access to technology equities and sector ETFs with rigorous "
            "valuation and governance analysis."
        ),
        "platform_heading": "Our Technology Platform Delivers",
        "platform_text": (
            "Clients receive research coverage across semiconductors, cloud, cybersecurity, "
            "and AI infrastructure with position sizing, drawdown controls, and integration "
            "into diversified portfolio frameworks."
        ),
        "boxes": [
            ("Group-3508.png", "SOFTWARE"),
            ("Group-3513.png", "SEMICONDUCTORS"),
            ("Group-3512.png", "CLOUD &amp; SAAS"),
            ("Group-3509.png", "CYBERSECURITY"),
            ("Group-3511.png", "AI &amp; DATA"),
            ("Group-3510.png", "HARDWARE"),
        ],
    },
    {
        "slug": "energy-infrastructure",
        "title": "Energy & Infrastructure",
        "hero_label": "Energy &amp; Infrastructure",
        "hero_img": "../wp-content/uploads/sites/12/2022/02/Energy Infrastructure Hero Background.png",
        "intro": (
            "Invest in the backbone of the global economy through energy producers, utilities, "
            "midstream assets, and infrastructure equities with income and growth characteristics."
        ),
        "platform_heading": "Our Energy &amp; Infrastructure Platform Delivers",
        "platform_text": (
            "Strategies span traditional energy, renewables, utilities, and infrastructure with "
            "yield analysis, regulatory awareness, and ESG integration options for institutional "
            "allocators."
        ),
        "boxes": [
            ("Group-3512.png", "OIL &amp; GAS"),
            ("Group-3513.png", "RENEWABLES"),
            ("Group-3508.png", "UTILITIES"),
            ("Group-3509.png", "MIDSTREAM"),
            ("Group-3511.png", "INFRASTRUCTURE"),
            ("Group-3510.png", "POWER GRID"),
        ],
    },
]


def wrap_invest_cards(html: str) -> str:
    for data_id, (href, _label) in CARD_LINKS.items():
        marker = f'elementor-element-{data_id}'
        if marker not in html:
            raise SystemExit(f"Missing widget {data_id} in index.html")
        if f'sg-invest-card-link" href="{href}"' in html:
            continue
        pattern = (
            rf'(<div class="elementor-element elementor-element-{data_id}[^>]*>)'
            rf'(.*?</div>\s*</div>\s*</div>)'
        )
        match = re.search(pattern, html, flags=re.DOTALL)
        if not match:
            raise SystemExit(f"Could not wrap card {data_id}")
        replacement = (
            f'<a class="sg-invest-card-link" href="{href}">{match.group(1)}'
            f"{match.group(2)}</a>"
        )
        html = html[: match.start()] + replacement + html[match.end() :]
    return html


def build_image_boxes(boxes: list) -> str:
    cols = []
    for img, label in boxes:
        cols.append(
            f"""				<div class="elementor-column elementor-col-16 elementor-inner-column elementor-element elementor-invisible" data-element_type="column" data-settings="{{&quot;background_background&quot;:&quot;gradient&quot;,&quot;animation&quot;:&quot;fadeInUp&quot;,&quot;animation_delay&quot;:200}}">
			<div class="elementor-widget-wrap elementor-element-populated">
								<div class="elementor-element elementor-position-top elementor-vertical-align-top elementor-widget elementor-widget-image-box" data-element_type="widget" data-widget_type="image-box.default">
				<div class="elementor-widget-container">
			<div class="elementor-image-box-wrapper"><figure class="elementor-image-box-img"><img width="115" height="126" src="../wp-content/uploads/sites/12/2022/02/{img}" class="attachment-full size-full" alt="" loading="lazy" /></figure><div class="elementor-image-box-content"><h3 class="elementor-image-box-title">{label}</h3></div></div>		</div>
				</div>
					</div>
		</div>"""
        )
    return "\n".join(cols)


def create_page(cfg: dict) -> None:
    html = TEMPLATE.read_text(encoding="utf-8")
    slug = cfg["slug"]
    html = html.replace("<title>ETFs &#8211; Safeguard Securities</title>", f"<title>{cfg['title']} &#8211; Safeguard Securities</title>")
    html = html.replace(
        'src="../wp-content/uploads/sites/12/2022/02/service-headers/header-etfs.png"',
        f'src="{cfg["hero_img"]}"',
        1,
    )
    html = html.replace(
        '<h5 class="elementor-heading-title elementor-size-default">Exchange-Traded Funds</h5>',
        f'<h5 class="elementor-heading-title elementor-size-default">{cfg["hero_label"]}</h5>',
    )
    html = html.replace(
        "<h2 class=\"elementor-heading-title elementor-size-default\">Institutional ETF Solutions</h2>",
        f'<h2 class="elementor-heading-title elementor-size-default">{cfg["main_heading"]}</h2>',
    )
    html = re.sub(
        r"<p>Our institutional ETF platform offers access.*?</p>",
        f"<p>{cfg['intro']}</p>",
        html,
        count=1,
        flags=re.DOTALL,
    )
    html = html.replace('rel="canonical" href="index.html"', 'rel="canonical" href="index.html"')
    html = html.replace(
        "Buy and sell ETFs that track indices",
        f"Explore {cfg['title']} strategies with Safeguard Securities",
        1,
    )
    old_boxes = [
        "INDEX BASED",
        "SECTOR BASED",
        "COMMODITY BASED",
        "COUNTRY BASED",
        "BOND ETFS",
        "VOLATILITY ETFS",
    ]
    for old, (_img, label) in zip(old_boxes, cfg["boxes"]):
        html = html.replace(
            '<div class="elementor-image-box-content"><h3 class="elementor-image-box-title">'
            + old
            + "</h3>",
            '<div class="elementor-image-box-content"><h3 class="elementor-image-box-title">'
            + label
            + "</h3>",
            1,
        )

    out_dir = ROOT / slug
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "index.html"
    out_path.write_text(html, encoding="utf-8")
    print(f"created {out_path}")


def main() -> None:
    index_html = INDEX.read_text(encoding="utf-8")
    index_html = wrap_invest_cards(index_html)
    INDEX.write_text(index_html, encoding="utf-8")
    print("linked invest cards on homepage")

    for cfg in NEW_PAGES:
        create_page(cfg)

    css_path = ROOT / "assets" / "site-chrome.css"
    css = css_path.read_text(encoding="utf-8")
    block = """
/* Homepage — Where We Invest cards */
.sg-invest-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.sg-invest-card-link:hover,
.sg-invest-card-link:focus {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(9, 22, 60, 0.12);
  outline: none;
}
.sg-invest-card-link .ha-infobox-title {
  color: inherit;
}
.elementor-element-5544027a .sg-invest-card-link {
  cursor: pointer;
}
"""
    if ".sg-invest-card-link" not in css:
        css += block
        css_path.write_text(css, encoding="utf-8")
        print("added invest card styles")

    # bump cache on homepage only
    index_html = INDEX.read_text(encoding="utf-8")
    index_html = index_html.replace("site-chrome.css?v=5", "site-chrome.css?v=6")
    INDEX.write_text(index_html, encoding="utf-8")


if __name__ == "__main__":
    main()
