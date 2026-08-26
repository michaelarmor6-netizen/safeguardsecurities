import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  description: string;
}

export default function FundingRequiredNotice({ title, description }: Props) {
  return (
    <div className="sg-card p-8 text-center max-w-md mx-auto" style={{ borderRadius: 16 }}>
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'rgba(251,191,36,.12)' }}
      >
        <Lock className="h-5 w-5" style={{ color: 'var(--sg-gold)' }} />
      </div>
      <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
        {title}
      </h2>
      <p className="text-sm mt-2" style={{ color: 'var(--sg-muted)' }}>
        {description}
      </p>
      <Link to="/workspace/wallet" className="sg-btn-primary inline-block mt-5">
        Fund Your Account
      </Link>
    </div>
  );
}
