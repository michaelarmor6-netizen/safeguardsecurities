import { ExternalLink, Newspaper, Sparkles } from 'lucide-react';

interface InsightArticle {
  title: string;
  source: string;
  summary: string;
  url: string;
}

// Curated snapshot of real, third-party AI/markets coverage — not live-fetched,
// not personalized. Refresh the list (and the "last updated" note below) periodically.
const ARTICLES: InsightArticle[] = [
  {
    title: "Here's how we played the massive rebound in AI stocks this week",
    source: 'CNBC',
    summary:
      'Semiconductor and data center names staged a sharp rebound after a rough July, with the Nasdaq Composite gaining over 5% on the week as investors digested earnings and a weaker jobs report.',
    url: 'https://www.cnbc.com/2026/08/08/heres-how-we-played-the-massive-rebound-in-ai-stocks-this-week.html',
  },
  {
    title: 'Best AI Stocks to Buy Now',
    source: 'Morningstar',
    summary:
      "Morningstar analyst picks for AI exposure, screened for durable competitive advantages and valuation relative to the sector's growth rate.",
    url: 'https://www.morningstar.com/stocks/best-ai-stocks-buy-now',
  },
  {
    title: '5 Stocks To Watch This Week',
    source: 'Benzinga',
    summary: 'A rundown of names catching trader attention this week, including several with AI-driven catalysts.',
    url: 'https://www.benzinga.com/node/10980964',
  },
  {
    title: 'August 2026 Market Insights',
    source: 'CommunityAmerica Credit Union',
    summary: 'A broader macro read on August 2026 markets — rate expectations and sector rotation alongside the AI trade.',
    url: 'https://www.communityamerica.com/blog/2026/august-2026-market-insights',
  },
  {
    title: 'AI Stock Market Impact 2026: How Artificial Intelligence Is Reshaping the Investment Landscape',
    source: 'Intellectia.ai',
    summary:
      'How AI capability, rather than traditional revenue metrics, has become a primary driver of valuation across the tech sector this year.',
    url: 'https://intellectia.ai/blog/ai-stock-market-impact-2026',
  },
];

export default function InvestorAiInsightsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          AI Insights
        </h1>
        <p className="sg-page-sub mt-1">
          Curated AI &amp; markets news from third-party outlets. Informational only — not personalized investment advice.
        </p>
      </div>

      <div className="space-y-3">
        {ARTICLES.map((a) => (
          <a
            key={a.url}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sg-panel p-5 flex flex-col gap-2 transition hover:opacity-90"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
                {a.title}
              </h3>
              <ExternalLink className="h-4 w-4 shrink-0 mt-1" style={{ color: 'var(--sg-muted-2)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
              {a.summary}
            </p>
            <span className="text-xs font-medium" style={{ color: 'var(--sg-indigo)' }}>
              {a.source}
            </span>
          </a>
        ))}
      </div>

      <div className="sg-panel p-4 flex items-center gap-2" style={{ color: 'var(--sg-muted-2)' }}>
        <Newspaper className="h-4 w-4 shrink-0" />
        <span className="text-xs">
          Curated snapshot, links open external third-party sources. Last updated August 13, 2026.
        </span>
      </div>
    </div>
  );
}
