// SafeGuard branded email generator - the "company introduction" UI turned
// into a reusable shell: black logo header with Sign in, rounded #F2F5FA
// cards, #3D66E1 CTA, navy #0B1A46 text, signature block, #EEF1F6 footer.
//
// The admin pastes PLAIN TEXT; this module does the rest. Paste rules:
//   - blank line            -> new paragraph
//   - line of only "---"    -> new card (rounded grey section)
//   - line starting "## "   -> card heading (bold, 16px)
//   - line starting "- "    -> bullet line
// Everything is HTML-escaped, so a pasted "<" can never break the layout or
// smuggle markup into a client-facing email.

export interface BrandedEmailInput {
  /** Email subject - also becomes the <title>. */
  subject: string;
  /** Big navy headline under the header. Falls back to the subject. */
  headline?: string;
  /** e.g. "Dear Mr McFarlane," - rendered as the first line of card 1. */
  greeting?: string;
  /** The pasted content (see paste rules above). */
  body: string;
  /** Optional call-to-action button. */
  ctaLabel?: string;
  ctaUrl?: string;
  /** Optional amber note above the CTA (the "priority notice" style). */
  notice?: string;
  /** Signature. */
  senderName: string;
  senderRole?: string;
  /** Closing line above "Sincerely". */
  closingLine?: string;
  /** Absolute logo URL so the image renders wherever the HTML is pasted. */
  logoUrl?: string;
}

const COMPANY = 'Safeguard Securities, Inc.';
const SITE = 'https://safeguardsecurities.us';
const PORTAL = 'https://app.safeguardsecurities.us/client-login';
const ADDRESS = '6060 Parkland Boulevard, Suite 200, Mayfield Heights, OH 44124';
const PHONE_DISPLAY = '+1 216 2507891';
const PHONE_TEL = '+12162507891';
const DEFAULT_LOGO = `${SITE}/logo2.png`;

const NAVY = '#0B1A46';
const BLUE = '#3D66E1';
const CARD = '#F2F5FA';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Card { heading?: string; blocks: string[] }

/** Parse pasted plain text into cards of paragraph/bullet HTML blocks. */
export function parseBody(text: string): Card[] {
  const cards: Card[] = [];
  let current: Card = { blocks: [] };
  const pushCard = () => {
    if (current.heading || current.blocks.length) cards.push(current);
    current = { blocks: [] };
  };

  for (const rawChunk of text.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const chunk = rawChunk.trim();
    if (!chunk) continue;
    // A chunk may still contain single newlines: walk its lines.
    let para: string[] = [];
    let bullets: string[] = [];
    const flushPara = () => {
      if (para.length) { current.blocks.push(`<p style="margin:0 0 12px 0;">${para.join('<br>')}</p>`); para = []; }
    };
    const flushBullets = () => {
      if (bullets.length) {
        current.blocks.push(`<p style="margin:0 0 12px 0;">${bullets.map((b) => `&bull;&nbsp; ${b}`).join('<br>')}</p>`);
        bullets = [];
      }
    };
    for (const rawLine of chunk.split('\n')) {
      const line = rawLine.trim();
      if (line === '---') { flushPara(); flushBullets(); pushCard(); continue; }
      if (line.startsWith('## ')) {
        flushPara(); flushBullets();
        // A heading starts a new card unless the current one is still empty.
        if (current.heading || current.blocks.length) pushCard();
        current.heading = escapeHtml(line.slice(3).trim());
        continue;
      }
      if (line.startsWith('- ')) { flushPara(); bullets.push(escapeHtml(line.slice(2).trim())); continue; }
      flushBullets();
      para.push(escapeHtml(line));
    }
    flushPara(); flushBullets();
  }
  pushCard();
  return cards;
}

const cardHtml = (inner: string) => `
          <tr>
            <td style="padding:16px 28px 0 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CARD}" style="background-color:${CARD}; border-radius:10px;">
                <tr>
                  <td style="padding:22px 24px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.65; color:${NAVY};">
${inner}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

export function buildBrandedEmail(input: BrandedEmailInput): string {
  const subject = escapeHtml(input.subject.trim() || 'A message from Safeguard Securities');
  const headline = escapeHtml((input.headline ?? input.subject).trim());
  const logo = (input.logoUrl ?? DEFAULT_LOGO).trim() || DEFAULT_LOGO;
  const cards = parseBody(input.body);

  // Greeting rides at the top of the first card (or its own card if none).
  const greeting = input.greeting?.trim()
    ? `<p style="margin:0 0 12px 0;">${escapeHtml(input.greeting.trim())}</p>`
    : '';
  if (greeting) {
    if (cards.length === 0) cards.push({ blocks: [] });
    cards[0].blocks.unshift(greeting);
  }

  const cardsHtml = cards.map((c) => cardHtml(
    (c.heading ? `<h2 style="margin:0 0 12px 0; font-size:16px; font-weight:bold; color:${NAVY};">${c.heading}</h2>\n` : '') +
    c.blocks.join('\n'),
  )).join('\n');

  const hasCta = Boolean(input.ctaLabel?.trim() && input.ctaUrl?.trim());
  const ctaCard = hasCta || input.notice?.trim() ? cardHtml(
    (input.notice?.trim()
      ? `<p style="margin:0 0 ${hasCta ? '18px' : '0'} 0; font-size:13px; line-height:1.55; color:#8A4B12;"><strong>Please note:</strong> ${escapeHtml(input.notice.trim())}</p>`
      : '') +
    (hasCta
      ? `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                      <tr>
                        <td bgcolor="${BLUE}" style="background-color:${BLUE}; border-radius:8px;">
                          <a href="${escapeHtml(input.ctaUrl!.trim())}" target="_blank" style="display:inline-block; padding:12px 28px; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#FFFFFF; text-decoration:none;">${escapeHtml(input.ctaLabel!.trim())}</a>
                        </td>
                      </tr>
                    </table>`
      : ''),
  ) : '';

  const closing = escapeHtml(input.closingLine?.trim() || 'We look forward to hearing from you.');
  const senderName = escapeHtml(input.senderName.trim() || 'Client Services');
  const senderRole = escapeHtml(input.senderRole?.trim() || `Client Services, ${COMPANY.replace(', Inc.', '')}`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F7FA; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F7FA" style="background-color:#F5F7FA;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%; background-color:#FFFFFF;">

          <tr>
            <td bgcolor="#000000" style="background-color:#000000; padding:16px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${SITE}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;border:0;">
                      <img src="${escapeHtml(logo)}" width="160" alt="${COMPANY}" style="display:block; width:160px; height:auto; border:0;">
                    </a>
                  </td>
                  <td align="right" valign="middle" style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#FFFFFF;">
                    <a href="${PORTAL}" style="display:inline-block; padding:6px 12px; border:1px solid #FFFFFF; border-radius:6px; color:#FFFFFF; text-decoration:none; font-size:12px;">Sign in</a><br>
                    <span style="display:inline-block; margin-top:8px; color:#C9D6FF; font-size:11px;">Client Services</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <h1 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:24px; line-height:1.3; font-weight:bold; color:${NAVY};">
                ${headline}
              </h1>
            </td>
          </tr>
${cardsHtml}
${ctaCard}

          <tr>
            <td style="padding:24px 28px 32px 28px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:${NAVY};">
              <p style="margin:0 0 16px 0;">${closing}</p>
              <p style="margin:0 0 16px 0;">Sincerely,</p>
              <p style="margin:0; font-weight:bold;">${senderName}</p>
              <p style="margin:2px 0 0 0; color:${BLUE}; font-size:13px;">${senderRole}</p>
              <p style="margin:10px 0 0 0; font-size:12px; color:#6B7280; line-height:1.55;">
                ${ADDRESS}<br>
                <a href="tel:${PHONE_TEL}" style="color:${BLUE}; text-decoration:none;">${PHONE_DISPLAY}</a>
                &nbsp;|&nbsp;
                <a href="${SITE}" style="color:${BLUE}; text-decoration:none;">safeguardsecurities.us</a>
              </p>
            </td>
          </tr>

          <tr>
            <td bgcolor="#EEF1F6" style="background-color:#EEF1F6; padding:22px 28px; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:1.6; color:#6B7280; text-align:center;">
              ${COMPANY} &middot; Institutional Investment &amp; Brokerage<br>
              <a href="${SITE}" style="color:${BLUE}; text-decoration:none;">www.safeguardsecurities.us</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
