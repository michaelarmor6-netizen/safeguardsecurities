import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Download, Mail } from 'lucide-react';
import { buildBrandedEmail } from '../../../services/investor/emailTemplateBuilder';

// Branded email generator: paste plain text, get the SafeGuard company-
// introduction template (black logo header, rounded cards, blue CTA, company
// footer) as ready-to-send HTML. Formatting rules for the pasted text are
// shown beside the box; everything is escaped, so no paste can break the
// layout. Copy puts BOTH text/html and text/plain on the clipboard, so
// pasting into Thunderbird/Gmail compose keeps the design.

const FIELD = 'sg-input w-full';

export default function InvestorAdminEmailTemplatePage() {
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [greeting, setGreeting] = useState('Dear Mr {{LAST_NAME}},');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderRole, setSenderRole] = useState('Client Services, Safeguard Securities');
  const [closingLine, setClosingLine] = useState('We look forward to hearing from you.');

  const html = useMemo(
    () =>
      buildBrandedEmail({
        subject, headline: headline || undefined, greeting: greeting || undefined,
        body, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined,
        notice: notice || undefined, senderName, senderRole: senderRole || undefined,
        closingLine: closingLine || undefined,
      }),
    [subject, headline, greeting, body, ctaLabel, ctaUrl, notice, senderName, senderRole, closingLine],
  );

  const copyHtml = async () => {
    try {
      // Rich copy: paste into an email compose window and it arrives styled.
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([html], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
      toast.success('Copied - paste into your email compose window or an HTML file');
    } catch {
      try {
        await navigator.clipboard.writeText(html);
        toast.success('HTML source copied');
      } catch {
        toast.error('Copy failed - use Download instead');
      }
    }
  };

  const download = () => {
    const slug = (subject || 'safeguard-email').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'safeguard-email'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="sg-page-title flex items-center gap-2"><Mail className="h-6 w-6" /> Email Template Builder</h1>
          <p className="sg-page-sub mt-1">
            Paste your content, get a branded SafeGuard email - logo header, card layout, signature
            and footer applied automatically. Works for any purpose: notices, follow-ups, offers.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="sg-action-btn flex items-center gap-2" onClick={copyHtml}>
            <Copy className="h-4 w-4" /> Copy for email
          </button>
          <button type="button" className="sg-action-btn flex items-center gap-2" onClick={download}>
            <Download className="h-4 w-4" /> Download .html
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ---- form ---- */}
        <div className="sg-panel p-4 space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Subject *</label>
            <input className={FIELD} value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scheduling your review call" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Headline (defaults to subject)</label>
            <input className={FIELD} value={headline} onChange={(e) => setHeadline(e.target.value)}
              placeholder="Big navy title under the logo" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Greeting</label>
            <input className={FIELD} value={greeting} onChange={(e) => setGreeting(e.target.value)} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>
              Content * — blank line = paragraph · <code>## Heading</code> = new card ·{' '}
              <code>-</code> = bullet · <code>---</code> = card break
            </label>
            <textarea className={`${FIELD} font-mono text-xs`} rows={14} value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'Thank you for being a valued client...\n\n## What happens next\n- We will confirm your appointment\n- Connection details follow the same day'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Button label (optional)</label>
              <input className={FIELD} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Get Started" />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Button link</label>
              <input className={FIELD} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://… or mailto:…" />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Amber notice above the button (optional)</label>
            <input className={FIELD} value={notice} onChange={(e) => setNotice(e.target.value)}
              placeholder="e.g. We will never ask for your password while arranging an appointment." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Sender name *</label>
              <input className={FIELD} value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Maria Santos" />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Sender role</label>
              <input className={FIELD} value={senderRole} onChange={(e) => setSenderRole(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Closing line</label>
            <input className={FIELD} value={closingLine} onChange={(e) => setClosingLine(e.target.value)} />
          </div>
        </div>

        {/* ---- live preview ---- */}
        <div className="sg-panel p-2">
          <p className="text-xs px-2 py-1" style={{ color: 'var(--sg-muted-2)' }}>Live preview (600px email width)</p>
          <iframe
            title="Email preview"
            srcDoc={html}
            sandbox=""
            className="w-full rounded-[10px] bg-white"
            style={{ height: 720, border: '1px solid var(--sg-border)' }}
          />
        </div>
      </div>
    </div>
  );
}
