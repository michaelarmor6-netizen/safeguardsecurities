import { useEffect, useState } from 'react';
import { CheckCircle, Mail, Copy, ClipboardCopy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  generateInvestorAccountMailtoUrl,
  generateInvestorWelcomeEmailHtml,
} from '../../../../utils/investorAccountEmailService';
import type { InvestorAccountManager } from '../../../../services/investor/profileService';
import { getPlatformSettings } from '../../../../services/investor/settingsService';
import type { OnboardingMode } from '../onboardingTypes';

interface Props {
  mode: OnboardingMode;
  firstName: string;
  lastName: string;
  email: string;
  temporaryPassword?: string;
  uid?: string;
  accountManager?: InvestorAccountManager;
  onCreateAnother?: () => void;
}

export default function Step7Confirmation({
  mode,
  firstName,
  lastName,
  email,
  temporaryPassword,
  uid,
  accountManager,
  onCreateAnother,
}: Props) {
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [emailOverrides, setEmailOverrides] = useState({ subjectOverride: '', introOverride: '' });

  useEffect(() => {
    getPlatformSettings()
      .then((s) => setEmailOverrides({ subjectOverride: s.welcomeEmailSubjectOverride, introOverride: s.welcomeEmailIntroOverride }))
      .catch(() => {});
  }, []);

  if (mode === 'self') {
    return (
      <div className="text-center py-6 space-y-4">
        <CheckCircle className="w-16 h-16 mx-auto" style={{ color: 'var(--sg-teal)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Application Submitted
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--sg-muted)' }}>
          Thanks — your details have been submitted for review. We'll notify you once your account is fully activated.
        </p>
        <Link to="/activation" className="sg-btn-primary inline-block">
          Continue
        </Link>
      </div>
    );
  }

  const loginUrl = 'https://app.safeguardsecurities.us/login';
  const emailVars = {
    firstName,
    lastName,
    email,
    temporaryPassword: temporaryPassword ?? '',
    loginUrl,
    uid,
    accountManager,
    ...emailOverrides,
  };
  const html = generateInvestorWelcomeEmailHtml(emailVars);
  const mailtoUrl = generateInvestorAccountMailtoUrl(emailVars);

  const copyCredentials = async () => {
    await navigator.clipboard.writeText(`Email: ${email}\nTemporary Password: ${temporaryPassword ?? ''}\nLogin: ${loginUrl}`);
    setCopiedCreds(true);
    toast.success('Credentials copied');
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  const copyFormattedEmail = async () => {
    try {
      if (typeof ClipboardItem !== 'undefined') {
        const htmlBlob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([`View this email at: ${loginUrl}`], { type: 'text/plain' });
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]);
      } else {
        await navigator.clipboard.writeText(html);
      }
      setCopiedEmail(true);
      toast.success('Email copied — paste into Gmail/Outlook compose');
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast.error('Could not copy formatted email — try Open in Email Client instead');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <CheckCircle className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--sg-teal)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Account Created
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>
          {firstName} {lastName}'s account is active. Send them these credentials.
        </p>
      </div>

      <div className="sg-card p-4 space-y-2" style={{ borderRadius: 14 }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--sg-muted-2)' }}>Email</span>
          <span style={{ color: 'var(--sg-text)' }}>{email}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--sg-muted-2)' }}>Temporary Password</span>
          <span className="font-mono" style={{ color: 'var(--sg-text)' }}>{temporaryPassword}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--sg-muted-2)' }}>Login URL</span>
          <span style={{ color: 'var(--sg-text)' }}>{loginUrl}</span>
        </div>
      </div>

      <div className="sg-card p-4 space-y-3" style={{ borderRadius: 14 }}>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--sg-muted-2)' }}>Welcome Email Preview</p>
          <button
            type="button"
            onClick={copyFormattedEmail}
            className="sg-btn-ghost flex items-center gap-1.5 text-xs px-2.5 py-1.5"
          >
            <ClipboardCopy className="h-3.5 w-3.5" /> {copiedEmail ? 'Copied' : 'Copy Formatted Email'}
          </button>
        </div>
        <iframe
          srcDoc={html}
          title="Welcome email preview"
          className="w-full"
          style={{ height: 560, border: '1px solid var(--sg-border)', borderRadius: 10, background: '#fff' }}
        />
        <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
          Mailto links can't carry HTML formatting — use "Copy Formatted Email" and paste directly into a Gmail/Outlook compose window to send it styled like above.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => window.open(mailtoUrl, '_blank')} className="sg-btn-primary flex items-center gap-2">
          <Mail className="h-4 w-4" /> Open Plain-Text Email
        </button>
        <button type="button" onClick={copyCredentials} className="sg-btn-ghost flex items-center gap-2">
          <Copy className="h-4 w-4" /> {copiedCreds ? 'Copied' : 'Copy Credentials'}
        </button>
        {onCreateAnother && (
          <button type="button" onClick={onCreateAnother} className="sg-btn-ghost">
            Create Another Account
          </button>
        )}
      </div>
    </div>
  );
}
