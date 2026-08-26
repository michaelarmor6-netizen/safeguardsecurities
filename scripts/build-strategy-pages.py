"""Generate institutional strategy landing pages from consumer-discretionary/index.html template."""
from __future__ import annotations

import html
from pathlib import Path
from urllib.parse import quote

ROOT = Path(r"d:\safeguardsecurities")
TEMPLATE = ROOT / "consumer-discretionary" / "index.html"
ORIGINAL_HERO_IMG = "../wp-content/uploads/sites/12/2022/02/Consumer%20Discretionary%20Hero%20Background.png"
PINCON_CTAS_IMG = "../wp-content/uploads/sites/12/2022/02/pincon033.jpg"
OVERVIEW_NEEDLE = "</style>\t\t\t\t<p>The Consumer Discretionary sector is"
OVERVIEW_ANCHOR_END = (
    "sustainable, long-term value creators.</p>\t\t\t\t\t\t</div>"
)


def _hero_src(asset_filename: str) -> str:
    return "../wp-content/uploads/sites/12/2022/02/" + quote(asset_filename)


def _body_open(dark_hero: bool) -> str:
    if dark_hero:
        return (
            '<body data-rsssl=1 class="sg-hero-dark-custom sg-sector-focus-3 page-template '
            "page-template-elementor_header_footer page page-id-1484 wp-custom-logo ehf-header ehf-footer "
            "ehf-template-hello-elementor ehf-stylesheet-hello-elementor elementor-default "
            'elementor-template-full-width elementor-kit-8 elementor-page elementor-page-1484">'
        )
    return (
        '<body data-rsssl=1 class="sg-sector-focus-3 page-template page-template-elementor_header_footer '
        "page page-id-1484 wp-custom-logo ehf-header ehf-footer ehf-template-hello-elementor "
        'ehf-stylesheet-hello-elementor elementor-default elementor-template-full-width '
        'elementor-kit-8 elementor-page elementor-page-1484">'
    )


def _overview_block(para: str, bullets: list[tuple[str, str]], advantage: str) -> str:
    lis = "".join(
        f'<li><strong>{html.escape(label)}:</strong> {html.escape(body)}</li>'
        for label, body in bullets
    )
    advantage_line = html.escape(advantage)
    return (
        '\t\t\t\t<p>{{PARA}}</p>'
        '<p style="margin-top:1rem;margin-bottom:0.35rem"><strong>Our Strategic Focus Areas:</strong></p>'
        f'<ul style="margin:0 0 1rem;padding-left:1.25rem">{lis}</ul>'
        '<p style="margin-top:1rem;margin-bottom:0.35rem"><strong>The SafeGuard Advantage</strong></p>'
        f"<p>{advantage_line}</p>\t\t\t\t\t\t</div>"
    ).replace("{{PARA}}", html.escape(para))


PAGES = [
    {
        "slug": "equities",
        "title": "Equities",
        "hero_img": _hero_src("Equities Hero Background.png"),
        "hero_alt": "Global equities — diversified stock market exposure",
        "dark_hero": False,
        "headline": "Capturing Global Equity Growth",
        "sub": "Accessing world-class companies across market caps and geographies.",
        "cta": "Explore Equity Portfolios",
        "pillars": (
            "QUALITY GROWTH LEADERS",
            "EMERGING INNOVATORS",
            "SMID CAP DISCOVERY",
        ),
        "insights_heading": "Equity Portfolio Insights",
        "insights_body": (
            "Request institutional-grade equity commentary and allocation snapshots aligned with your mandates. "
            "Submit the form below to connect with SafeGuard Securities."
        ),
        "overview_para": (
            "Equities remain the backbone of long-term wealth creation. At SafeGuard Securities, we blend "
            "fundamental company research with macro-economic analysis to identify stocks positioned for sustainable "
            "earnings growth. Our approach spans large-cap blue-chips to emerging-market leaders, ensuring broad "
            "diversification and upside capture."
        ),
        "bullets": [
            (
                "Quality Growth Leaders",
                "Companies with durable competitive moats, consistent revenue expansion, and high return on equity.",
            ),
            (
                "Emerging Market Innovators",
                "Fast-growing enterprises in Asia, Latin America, and Africa benefiting from rising consumer "
                "and infrastructure spending.",
            ),
            (
                "Small & Mid-Cap Discoveries",
                "Undervalued, high-potential issuers overlooked by large institutional investors.",
            ),
        ],
        "advantage": (
            "We marry bottom-up equity selection with disciplined risk controls. Our portfolio managers dynamically "
            "adjust sector and regional weights, leveraging proprietary valuation models to maximize risk-adjusted returns."
        ),
    },
    {
        "slug": "multi-asset",
        "title": "Multi-Asset",
        "hero_img": _hero_src("Multi-Asset Hero Background.png"),
        "hero_alt": "Multi-asset allocation strategies",
        "dark_hero": False,
        "headline": "Balancing Risk and Return Across Asset Classes",
        "sub": "Sophisticated allocation strategies to navigate all market environments.",
        "cta": "Discover Multi-Asset Solutions",
        "pillars": (
            "DYNAMIC ALLOCATION",
            "INCOME & TOTAL RETURN",
            "ALTERNATIVE OVERLAY",
        ),
        "insights_heading": "Multi-Asset Solutions",
        "insights_body": (
            "Discuss bespoke allocation stacks or risk overlays tailored to institutional objectives. Submit your profile "
            "below for discreet follow-up from SafeGuard Securities."
        ),
        "overview_para": (
            "Multi-Asset portfolios combine equities, fixed income, real estate, commodities, and alternatives to smooth "
            "volatility while pursuing attractive returns. SafeGuard Securities’ multi-asset team constructs bespoke "
            "allocations tailored to each client's risk profile, time horizon, and income needs."
        ),
        "bullets": [
            (
                "Dynamic Asset Allocation",
                "Tactical shifts based on economic indicators, valuations, and momentum signals.",
            ),
            (
                "Income & Total Return Blend",
                "Integrating high-quality bonds, real estate, and dividend equities for steady cash flow.",
            ),
            (
                "Alternative Overlay",
                "Incorporating hedge-fund-style strategies—long/short equity, managed futures—to diversify traditional risks.",
            ),
        ],
        "advantage": (
            "Our integrated risk platform monitors exposures in real time, enabling rapid rebalancing when market "
            "regimes shift. This active stewardship seeks to deliver consistent performance through bull and bear cycles."
        ),
    },
    {
        "slug": "real-estate",
        "title": "Real Estate",
        "hero_img": _hero_src("Real Estate Hero Background.png"),
        "hero_alt": "Real estate investment strategies",
        "dark_hero": False,
        "headline": "Unlocking Value in Property Markets",
        "sub": "Direct and indirect real estate investments for income and appreciation.",
        "cta": "Explore Real Estate Funds",
        "pillars": ("CORE INCOME", "VALUE-ADD", "SPECIALTY RE"),
        "insights_heading": "Real Estate Investing",
        "insights_body": (
            "Ask about REIT allocations, income sleeves, or private placement pathways. Submit the form below and our "
            "team will coordinate follow-up from SafeGuard Securities."
        ),
        "overview_para": (
            "Real estate offers a powerful combination of yield, inflation protection, and long-term capital growth. "
            "SafeGuard Securities invests across residential, commercial, industrial, and specialized sectors (healthcare "
            "facilities, data centers) through REITs, private equity vehicles, and direct holdings."
        ),
        "bullets": [
            ("Core/Core-Plus Assets", "Stable, income-generating properties in prime locations."),
            (
                "Value-Add Opportunities",
                "Under-managed or under-capitalized assets with renovation and leasing upside.",
            ),
            (
                "Specialty Real Estate",
                "Targeting niche sectors—life sciences, logistics hubs, student housing—to gain structural tailwinds.",
            ),
        ],
        "advantage": (
            "Our in-house real estate analysts conduct rigorous site-level due diligence and leverage local operating "
            "partners. This on-the-ground expertise drives superior asset selection and operational execution."
        ),
    },
    {
        "slug": "healthcare",
        "title": "Healthcare",
        "hero_img": _hero_src("Healthcare Hero Background.png"),
        "hero_alt": "Healthcare and medical innovation investing",
        "dark_hero": False,
        "headline": "Investing in Life-Changing Innovation",
        "sub": "Exposure to pharmaceutical breakthroughs, medical devices, and healthcare services.",
        "cta": "View Healthcare Strategies",
        "pillars": ("BIOTECHNOLOGY", "MEDTECH", "SERVICES & CARE"),
        "insights_heading": "Healthcare Strategies",
        "insights_body": (
            "Request biotechnology, medical technology, or healthcare services thematic notes curated for fiduciary "
            "allocators. Complete the brief form below for coordinated follow-up from SafeGuard Securities."
        ),
        "overview_para": (
            "The Healthcare sector combines defensive characteristics with growth catalysts from innovation. "
            "SafeGuard Securities targets companies leading the charge in biotech, specialized therapeutics, and digital "
            "health solutions that address aging populations and global wellness trends."
        ),
        "bullets": [
            (
                "Biotechnology & Biopharma",
                "Developers of next-generation therapies, gene editing, and immuno-oncology.",
            ),
            (
                "Medical Technology",
                "Manufacturers of advanced diagnostics, minimally invasive surgical tools, and remote monitoring devices.",
            ),
            (
                "Healthcare Services & Infrastructure",
                "Operators of hospitals, outpatient clinics, and telemedicine platforms with scalable business models.",
            ),
        ],
        "advantage": (
            "We partner with medical experts to validate scientific milestones and clinical trial data. Combining "
            "technical rigor with financial discipline ensures we back only innovations with clear pathways to commercial success."
        ),
    },
    {
        "slug": "infrastructure",
        "title": "Infrastructure",
        "hero_img": _hero_src("Infrastructure Hero Background.png"),
        "hero_alt": "Infrastructure and essential networks investing",
        "dark_hero": False,
        "headline": "Building the Foundations of Tomorrow",
        "sub": "Essential assets powering transportation, utilities, and communications.",
        "cta": "Discover Infrastructure Funds",
        "pillars": ("TRANSPORT & LOGISTICS", "UTILITY NETWORKS", "DIGITAL INFRASTRUCTURE"),
        "insights_heading": "Infrastructure Investing",
        "insights_body": (
            "Discuss concession-based assets, regulated utilities, or digital tower exposures with SafeGuard Securities. "
            "Submit below to request pertinent infrastructure insights."
        ),
        "overview_para": (
            "Infrastructure investments offer resilient cash flows backed by long-term contracts and regulatory protections. "
            "SafeGuard Securities focuses on transportation networks, utilities, telecommunications towers, and "
            "public-private partnerships that support economic growth and connectivity."
        ),
        "bullets": [
            ("Transport & Logistics Hubs", "Airports, toll roads, and ports with steady traffic-based revenues."),
            (
                "Utility Networks",
                "Electricity transmission, water treatment, and natural gas pipelines with inflation-linked contracts.",
            ),
            (
                "Digital Infrastructure",
                "Cell towers, data centers, and fiber-optic networks fueling the digital economy.",
            ),
        ],
        "advantage": (
            "Our infrastructure team leverages deep sector relationships and regulatory expertise to structure resilient investments. "
            "This disciplined approach balances yield enhancement with capital preservation."
        ),
    },
    {
        "slug": "top-dividend",
        "title": "Top Dividend",
        "hero_img": _hero_src("Top Dividend Hero Background.png"),
        "hero_alt": "Dividend-focused equity investing",
        "dark_hero": False,
        "headline": "Generating Reliable Income Streams",
        "sub": "High-yield equity portfolios with a track record of growing distributions.",
        "cta": "Explore Dividend Solutions",
        "pillars": ("DIVIDEND ARISTOCRATS", "HIGH-YIELD SELECTS", "GLOBAL INCOME"),
        "insights_heading": "Income & Dividend Solutions",
        "insights_body": (
            "Request payout sustainability overlays, yield ladders, or global dividend sleeves consistent with mandates. "
            "Submit your details below for discreet follow-up from SafeGuard Securities."
        ),
        "overview_para": (
            "Dividend-paying equities provide both income and potential for capital appreciation. SafeGuard Securities' Top Dividend strategy "
            "selects companies with sustainable payout ratios, strong free-cash-flow conversion, and a history of consistent dividend growth."
        ),
        "bullets": [
            ("Dividend Aristocrats", "Blue-chip firms with 25+ years of consecutive payout increases."),
            ("High-Yield Selects", "Under-covered mid-cap companies offering above-average yields and catalysts for future growth."),
            (
                "Global Income Opportunities",
                "Diversifying into international markets to capture stable dividends and currency diversification.",
            ),
        ],
        "advantage": (
            "We employ proprietary stress-testing to assess payout sustainability through different interest-rate and economic scenarios. "
            "This rigorous vetting ensures portfolios deliver dependable cash flows."
        ),
    },
    {
        "slug": "tech-giants",
        "title": "Tech Giants",
        "hero_img": _hero_src("Tech Giants Hero Background.png"),
        "hero_alt": "Mega-cap technology leaders investing",
        "dark_hero": True,
        "headline": "Backing the Titans of Innovation",
        "sub": "Concentrated exposure to leading mega-cap technology companies.",
        "cta": "View Tech Giants Strategy",
        "pillars": ("PLATFORM LEADERS", "CLOUD INFRASTRUCTURE", "DIGITAL ECOSYSTEM"),
        "insights_heading": "Mega-Cap Technology Insights",
        "insights_body": (
            "Request concentrated mega-cap thematic notes plus valuation discipline guardrails curated for fiduciary allocators. "
            "Provide your credentials below for follow-up from SafeGuard Securities."
        ),
        "overview_para": (
            "The largest technology names—spanning consumer internet, cloud computing, and platform services—remain dominant "
            "drivers of market returns. SafeGuard Securities' Tech Giants strategy targets established leaders with massive "
            "network effects, scalable platforms, and robust balance sheets."
        ),
        "bullets": [
            (
                "Platform Leaders",
                "Companies commanding significant market share in e-commerce, social media, and search.",
            ),
            ("Cloud Infrastructure Providers", "Operators of hyperscale data centers and enterprise-grade IaaS/PaaS offerings."),
            (
                "Digital Ecosystem Innovators",
                "Firms building proprietary ecosystems across hardware, services, and software.",
            ),
        ],
        "advantage": (
            "Our concentrated approach combines thorough regulatory risk assessment with thematic research to detect emerging growth "
            "vectors within these mega-caps—capturing upside while managing valuation discipline."
        ),
    },
    {
        "slug": "energy-utilities",
        "title": "Energy & Utilities",
        "hero_img": _hero_src("Energy Infrastructure Hero Background.png"),
        "hero_alt": "Energy production and regulated utilities investing",
        "dark_hero": True,
        "headline": "Powering Stability and Growth",
        "sub": "Diversified exposure to traditional energy and essential utility services.",
        "cta": "Discover Energy & Utilities",
        "pillars": ("REGULATED UTILITIES", "INTEGRATED MAJORS", "RENEWABLES & STORAGE"),
        "insights_heading": "Energy & Utility Income",
        "insights_body": (
            "Discuss diversified utility exposures, hydrocarbon-cycle positioning, and renewables pathway trades with our team. "
            "Submit the form below for discreet follow-up from SafeGuard Securities."
        ),
        "overview_para": (
            "Energy & Utilities combine the income stability of regulated services with strategic opportunities in traditional "
            "and renewable power. SafeGuard Securities invests across the spectrum—from electric and water utilities to "
            "integrated oil majors and green energy producers."
        ),
        "bullets": [
            (
                "Regulated Utilities",
                "Electric, water, and gas distributors offering predictable, inflation-linked cash flows.",
            ),
            (
                "Integrated Energy Majors",
                "Diversified oil & gas companies with strong upstream, midstream, and refining operations.",
            ),
            ("Renewables & Storage", "High-growth solar, wind, and battery storage developers driving the energy transition."),
        ],
        "advantage": (
            "Our dual-track energy research team assesses commodity price cycles alongside regulatory frameworks. "
            "This ensures balanced portfolios that provide income stability today and capture green growth tomorrow."
        ),
    },
]


def splice_overview(markup: str, cfg: dict) -> str:
    i = markup.find(OVERVIEW_NEEDLE)
    if i == -1:
        raise SystemExit("Overview marker missing in template.")
    end = markup.find(OVERVIEW_ANCHOR_END, i)
    if end == -1:
        raise SystemExit("Overview end anchor missing in template.")
    j = end + len(OVERVIEW_ANCHOR_END)
    block = "</style>" + _overview_block(cfg["overview_para"], cfg["bullets"], cfg["advantage"])
    return markup[:i] + block + markup[j:]


def build_one(cfg: dict) -> None:
    raw = TEMPLATE.read_text(encoding="utf-8")
    body_old = raw.split("<body", 1)[1].split(">", 1)[0]
    out = raw.replace(f"<body{body_old}>", _body_open(cfg["dark_hero"]), 1)
    out = out.replace(
        "<title>Consumer Discretionary &#8211; Safeguard Securities</title>",
        f"<title>{cfg['title']} &#8211; Safeguard Securities</title>",
        1,
    )
    out = out.replace(f'src="{ORIGINAL_HERO_IMG}"', f'src="{cfg["hero_img"]}"', 1)
    out = out.replace(
        'alt="Consumer discretionary — luxury retail and lifestyle sector investing"',
        f'alt="{html.escape(cfg["hero_alt"])}"',
        1,
    )
    out = out.replace(f'src="{PINCON_CTAS_IMG}"', f'src="{cfg["hero_img"]}"', 1)
    out = out.replace("Navigating the Modern Consumer Landscape", cfg["headline"], 1)
    out = out.replace(
        "Capitalizing on shifting demographics, brand resilience, and the evolution of global retail.",
        cfg["sub"],
        1,
    )
    out = out.replace(
        '>View Sector Insights</span>',
        f'>{cfg["cta"]}</span>',
        1,
    )

    out = splice_overview(out, cfg)

    c1, c2, c3 = cfg["pillars"]
    out = out.replace("NEXT-GEN E‑COMMERCE", c1, 1)
    out = out.replace("PREMIUM &amp; LUXURY GOODS", c2.replace("&", "&amp;"), 1)
    out = out.replace("EXPERIENTIAL ECONOMY", c3.replace("&", "&amp;"), 1)

    out = out.replace("Consumer Sector Insights", cfg["insights_heading"], 1)
    old_insight_p = (
        "Request discretionary-focused commentary and resources aligned with institutional standards. "
        "Submit the form below and a SafeGuard Securities representative will respond with pertinent sector insights."
    )
    if old_insight_p not in out:
        raise SystemExit("Insights paragraph missing.")
    out = out.replace(old_insight_p, cfg["insights_body"], 1)

    out_dir = ROOT / cfg["slug"]
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(out, encoding="utf-8")
    print(f"wrote {cfg['slug']}/index.html")


def main() -> None:
    tpl = TEMPLATE.read_text(encoding="utf-8")
    if ORIGINAL_HERO_IMG not in tpl:
        raise SystemExit("Hero image marker missing.")
    seen: set[str] = set()
    for cfg in PAGES:
        if cfg["slug"] in seen:
            raise SystemExit(f"duplicate slug {cfg['slug']}")
        seen.add(cfg["slug"])
        build_one(cfg)


if __name__ == "__main__":
    main()
