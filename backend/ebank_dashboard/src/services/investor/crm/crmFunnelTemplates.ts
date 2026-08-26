// The two built-in funnel tracks: Gold and Pre-IPO. Five emails each,
// funneling to one of two exits - book a consultation, or self-register and
// open a demo account for a first look at the platform.
//
// Copy rules these templates live by (do not "improve" them away):
//   * No promised or implied returns. We describe what the platform DOES
//     and what the client can pursue - never what they will earn. Promising
//     performance is the single fastest way for an investment firm to earn
//     a regulator's attention.
//   * Every email carries the risk disclosure and an unsubscribe link.
//   * Pre-IPO copy states plainly: high risk, illiquid, eligibility-gated.
//     That honesty IS the qualifier - it self-selects serious prospects.
import type { CampaignStep, CampaignTrack } from './crmCampaignTypes';

const ACCENT = '#2a9d8f';
const NAVY = '#0e2a3a';

function shell(preheader: string, bodyHtml: string, ctaLabel: string, ctaUrl: string,
  secondary?: { label: string; url: string }): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>@media only screen and (max-width:620px){.container{width:100%!important}.px{padding-left:20px!important;padding-right:20px!important}}</style>
</head>
<body style="margin:0;padding:0;background-color:#eef1f4;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f4;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="background-color:${NAVY};padding:20px 36px;" class="px">
  <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">{{companyName}}</p>
</td></tr>
<tr><td style="padding:26px 36px 6px;" class="px">
${bodyHtml}
</td></tr>
<tr><td style="padding:8px 36px 10px;" class="px" align="center">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="background-color:${ACCENT};border-radius:6px;">
      <a href="${ctaUrl}" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
    </td>
  </tr></table>
  ${secondary ? `<p style="margin:12px 0 0;font-size:13px;"><a href="${secondary.url}" style="color:${ACCENT};">${secondary.label}</a></p>` : ''}
</td></tr>
<tr><td style="background-color:#f7f9fa;border-top:1px solid #e2e7ea;padding:18px 36px;" class="px">
  <p style="margin:0 0 8px;font-size:11px;line-height:1.6;color:#8b959c;">
    Investing involves risk, including the possible loss of the amount you commit. Nothing in this
    email is a recommendation or a guarantee of performance; markets move both ways. Demo accounts
    use simulated funds and simulated results, which do not predict live outcomes. Consider your
    objectives and, where appropriate, seek independent advice before investing.
  </p>
  <p style="margin:0;font-size:11px;line-height:1.6;color:#8b959c;">
    {{companyName}} · {{companyAddress}} · <a href="{{unsubscribeUrl}}" style="color:${ACCENT};">Unsubscribe</a>
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#333d44;">${t}</p>`;
const h = (t: string) => `<h1 style="margin:0 0 14px;font-size:20px;line-height:1.35;color:${NAVY};">${t}</h1>`;
const quote = (t: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:#f1f8f7;border-left:4px solid ${ACCENT};padding:14px 18px;border-radius:0 6px 6px 0;"><p style="margin:0;font-size:14px;line-height:1.55;color:${NAVY};font-weight:600;">${t}</p></td></tr></table><br>`;

// --------------------------------------------------------------- gold -----
export function goldTrack(): CampaignStep[] {
  return [
    {
      key: 'g1', dayOffset: 0,
      subject: 'Why gold still earns its place in a modern portfolio',
      html: shell(
        'What gold actually does in a portfolio - and what it does not.',
        h('Gold, without the mythology') +
        p('Hi {{firstName}},') +
        p('Gold is neither the magic hedge its fans describe nor the relic its critics dismiss. What it has been, across decades of market history, is <strong>a store of value with a low correlation to stocks</strong> - which is why allocators keep a measured share of it, especially in inflationary or uncertain stretches.') +
        p('Over the next few days we will send you a short series on how experienced investors approach gold: how much, in what form (physical, funds, or gold-linked instruments), and how a disciplined entry beats a headline-driven one.') +
        p('If you would rather talk it through with a person from the start, our desk is open.'),
        'Book a consultation', '{{appointmentUrl}}',
        { label: 'Or explore the platform with a free demo account', url: '{{demoUrl}}' },
      ),
    },
    {
      key: 'g2', dayOffset: 2,
      subject: 'The three ways to hold gold - and what each one costs you',
      html: shell(
        'Physical, funds, or gold-linked instruments - the real trade-offs.',
        h('Physical, funds, or instruments?') +
        p('Hi {{firstName}},') +
        p('<strong>Physical gold</strong> is tangible and slow: storage, insurance, and a spread when you sell. <strong>Gold funds</strong> are convenient but add management fees and track, not beat, the metal. <strong>Gold-linked instruments</strong> - the route our clients use - give you defined exposure to the gold price with a known cost up front and no vault to worry about.') +
        p('On the SafeGuard platform, gold positions are structured with a <strong>defined maximum downside</strong>: you always know, before you commit, the most a position can cost you. That is the discipline most first-time gold buyers never get.') +
        p('See how a defined-risk gold position looks in practice - the demo account shows you the exact screens.'),
        'Open a free demo account', '{{demoUrl}}',
        { label: 'Prefer a walkthrough? Book a consultation', url: '{{appointmentUrl}}' },
      ),
    },
    {
      key: 'g3', dayOffset: 3,
      subject: 'A sneak peek: how our AI reads the gold market',
      html: shell(
        'What an AI-assisted trading desk actually looks like from the inside.',
        h('Your analyst that never sleeps') +
        p('Hi {{firstName}},') +
        p('Behind every SafeGuard position is our AI engine reading the market around the clock - price structure, momentum, macro releases - and turning it into <strong>plain-language signals your account manager reviews with you</strong>. The machine does the groundwork; a person makes the call with you. That is how we run everything.') +
        quote('AI-powered, human-led: the engine surfaces the opportunity, your desk manager walks you through it, and nothing happens without your say-so.') +
        p('The demo account includes the same AI insights panel our live clients see, running on live market data with simulated funds. Fifteen minutes inside it will tell you more than any brochure.'),
        'See the AI in action - free demo', '{{demoUrl}}',
        { label: 'Book a consultation instead', url: '{{appointmentUrl}}' },
      ),
    },
    {
      key: 'g4', dayOffset: 3,
      subject: 'What a first gold allocation looks like, step by step',
      html: shell(
        'From first deposit to first position - the actual process.',
        h('From “interested” to invested, without the leap') +
        p('Hi {{firstName}},') +
        p('Here is exactly how new clients start with gold at SafeGuard: <strong>1)</strong> a short consultation to size an allocation to your goals and risk comfort; <strong>2)</strong> a funded account with deposit instructions and a personal reference code; <strong>3)</strong> a first defined-risk position, placed by your desk manager and visible in your dashboard from the moment it opens.') +
        p('No pressure to be an expert on day one - standard accounts are <strong>desk-managed</strong>, which means a professional executes while you keep full visibility and control over every decision.') +
        p('The consultation is free, takes about twenty minutes, and commits you to nothing.'),
        'Book your consultation', '{{appointmentUrl}}',
        { label: 'Still exploring? The demo stays free', url: '{{demoUrl}}' },
      ),
    },
    {
      key: 'g5', dayOffset: 4,
      subject: 'Last note from us on gold (the door stays open)',
      html: shell(
        'Closing the series - what to do with what you now know.',
        h('Where this leaves you') +
        p('Hi {{firstName}},') +
        p('This is the last email in our gold series - we keep our promises about inbox space. In four notes you have seen why allocators hold gold, the three ways to own it, how our AI engine reads the market, and what a first allocation actually involves.') +
        p('Two doors, both open whenever you are ready: <strong>talk to a person</strong> about an allocation sized to your goals, or <strong>step inside the platform</strong> with a demo account and judge it for yourself.') +
        p('Either way - thank you for reading this far. Serious investors read; that is usually the tell.'),
        'Book a consultation', '{{appointmentUrl}}',
        { label: 'Open the free demo account', url: '{{demoUrl}}' },
      ),
    },
  ];
}

// -------------------------------------------------------------- pre-ipo ---
export function preIpoTrack(): CampaignStep[] {
  return [
    {
      key: 'p1', dayOffset: 0,
      subject: 'Pre-IPO investing: the honest version',
      html: shell(
        'What pre-IPO access really is - potential, risk, and who it is for.',
        h('Before the bell rings') +
        p('Hi {{firstName}},') +
        p('Some of the most talked-about outcomes in investing happened <strong>before</strong> a company ever listed. That is the appeal of pre-IPO access. Here is the part most pitches skip: pre-IPO positions are <strong>high-risk and illiquid</strong> - your capital can be committed for years, and some companies never list at all.') +
        p('We would rather tell you that in the first sentence than the fine print, because pre-IPO allocation is genuinely not for everyone - it is for investors who can commit a measured slice of their portfolio to a long, uncertain, potentially rewarding horizon.') +
        p('Over this short series: how access works, how we vet opportunities, and how eligibility is assessed. If that sounds like you, start the conversation.'),
        'Book an eligibility consultation', '{{appointmentUrl}}',
        { label: 'Or register and explore the platform first', url: '{{demoUrl}}' },
      ),
    },
    {
      key: 'p2', dayOffset: 2,
      subject: 'How pre-IPO access actually reaches an individual investor',
      html: shell(
        'The route from a private company to your portfolio, plainly.',
        h('The route to the table') +
        p('Hi {{firstName}},') +
        p('Individual investors rarely buy pre-IPO shares directly from a company. Access flows through <strong>secondary transactions and structured allocations</strong>, arranged by intermediaries with the relationships and the paperwork. That is the role SafeGuard plays for eligible clients: sourcing, structuring, and administering the position end to end.') +
        p('What that means for you in practice: <strong>one counterparty, one dashboard, full documentation</strong> - and an account manager who explains every term before you sign anything.') +
        p('Eligibility is assessed case by case - jurisdiction, investor profile, and the nature of each offering all matter. The consultation is where that starts.'),
        'Check your eligibility', '{{appointmentUrl}}',
        { label: 'Explore the platform with a demo account', url: '{{demoUrl}}' },
      ),
    },
    {
      key: 'p3', dayOffset: 3,
      subject: 'A sneak peek: the AI that does our first read on every deal',
      html: shell(
        'How SafeGuard vets a private-market opportunity before a person ever pitches it.',
        h('The groundwork behind every allocation') +
        p('Hi {{firstName}},') +
        p('Every opportunity that reaches a SafeGuard client has already been through our engine: <strong>sector positioning, funding history, comparable valuations, and the crowd of red flags</strong> private markets are famous for. The AI does the tireless part; our desk does the judgment; you see the digest, not the noise.') +
        quote('AI-powered, human-led: the engine filters, the desk decides what is worth your time, and you decide everything after that.') +
        p('Register on the platform and the demo account shows you the interface our clients use - dashboards, research digests, and the AI insights panel, on live market data with simulated funds.'),
        'Register & see the platform', '{{demoUrl}}',
        { label: 'Skip ahead - book the consultation', url: '{{appointmentUrl}}' },
      ),
    },
    {
      key: 'p4', dayOffset: 3,
      subject: 'What a measured pre-IPO allocation looks like',
      html: shell(
        'Sizing, horizon, and the questions our desk will ask you.',
        h('Measured, or not at all') +
        p('Hi {{firstName}},') +
        p('When our desk sizes a pre-IPO allocation, three questions come before any deal talk: <strong>What share of your portfolio can stay illiquid for years without changing your life? What is your horizon? What does the rest of your portfolio already carry?</strong>') +
        p('If the honest answers point to “not now,” we say so - a client pushed into an unsuitable allocation is a client lost, and we play longer games than that. If they point to “yes,” you will know exactly what you hold, on what terms, and what has to happen for it to pay.') +
        p('That conversation takes half an hour and costs nothing.'),
        'Book the sizing conversation', '{{appointmentUrl}}',
        { label: 'Not ready to talk? Keep exploring the demo', url: '{{demoUrl}}' },
      ),
    },
    {
      key: 'p5', dayOffset: 4,
      subject: 'Last note on pre-IPO access (and what happens next)',
      html: shell(
        'Series close - eligibility, early registration, and the two doors.',
        h('The short version of everything') +
        p('Hi {{firstName}},') +
        p('Pre-IPO access, in five sentences: the potential is real and so is the risk; access flows through structured allocations that firms like ours arrange; every deal we show you has been through the AI engine and a human desk; allocations are sized to your life, not to our targets; and eligibility comes first, always.') +
        p('This is the last email in the series. If pre-IPO belongs in your portfolio, <strong>early registration</strong> puts you in line for the next allocation window rather than reading about it afterward.') +
        p('Two doors, as always - and both stay open after this series ends.'),
        'Register your interest', '{{demoUrl}}',
        { label: 'Book the eligibility consultation', url: '{{appointmentUrl}}' },
      ),
    },
  ];
}

export function buildTrack(track: CampaignTrack): CampaignStep[] {
  return track === 'gold' ? goldTrack() : preIpoTrack();
}

export const TRACK_LABELS: Record<CampaignTrack, string> = {
  gold: 'Gold Investments',
  preipo: 'Pre-IPO Access',
};
