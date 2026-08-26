import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Landmark, Coins, Mail, Plus, Trash2 } from 'lucide-react';
import {
  getFundingDetails,
  updateFundingDetails,
  FUNDING_DETAILS_DEFAULTS,
  type FundingDetails,
  type CryptoWallet,
} from '../../../../services/investor/fundingDetailsService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

// Content of the deposit instructions clients receive (in-app card on the
// Wallet page + auto-email) once a funding request is approved. Stored at
// platformSettings/fundingDetails - editable here without a deploy.

// Field set mirrors the owner's wire-instructions template:
// Bank Name / Bank Address / Bank ID-SWIFT / Beneficiary Account /
// Beneficiary Account No. / Beneficiary Address / Reason for Payment.
const BANK_FIELDS: { key: keyof FundingDetails; label: string; placeholder: string }[] = [
  { key: 'bankName', label: 'Bank name', placeholder: 'e.g. First National Bank' },
  { key: 'bankAddress', label: 'Bank address', placeholder: '' },
  { key: 'bankSwift', label: 'Bank ID / SWIFT code', placeholder: '' },
  { key: 'bankAccountName', label: 'Beneficiary account (name)', placeholder: 'SafeGuard Securities LLC' },
  { key: 'bankAccountNumber', label: 'Beneficiary account no.', placeholder: '' },
  { key: 'beneficiaryAddress', label: 'Beneficiary address', placeholder: '' },
  { key: 'bankRoutingOrIban', label: 'Routing / IBAN (optional)', placeholder: '' },
  { key: 'paymentReason', label: 'Reason for payment', placeholder: 'Investment account funding' },
];

export default function SettingsFundingDetailsSection() {
  const { user, profile } = useInvestorAuth();
  const [form, setForm] = useState<FundingDetails>(FUNDING_DETAILS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFundingDetails()
      .then(setForm)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load funding details'))
      .finally(() => setLoading(false));
  }, []);

  // The per-request reference (SG-XXXXXXXX) is appended to the reason
  // automatically on the card/invoice/email - admins set only the base text.
  const setWallet = (i: number, patch: Partial<CryptoWallet>) =>
    setForm((f) => ({
      ...f,
      cryptoWallets: f.cryptoWallets.map((w, idx) => (idx === i ? { ...w, ...patch } : w)),
    }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleaned: FundingDetails = {
        ...form,
        cryptoWallets: form.cryptoWallets
          .map((w) => ({ asset: w.asset.trim(), network: w.network.trim(), address: w.address.trim(), memo: (w.memo ?? '').trim() }))
          .filter((w) => w.address !== ''),
      };
      await updateFundingDetails(cleaned);
      setForm(cleaned);
      if (user) logAction(user.uid, profile?.email ?? '', 'Funding details updated');
      toast.success('Funding details saved');
      const bankFieldsFilled =
        [cleaned.bankName, cleaned.bankAccountName, cleaned.bankAccountNumber, cleaned.bankSwift,
         cleaned.bankRoutingOrIban, cleaned.bankAddress, cleaned.beneficiaryAddress].some((v) => v.trim() !== '');
      if (bankFieldsFilled && !cleaned.bankEnabled) {
        toast('Bank details are saved but NOT offered to clients - tick "Offer bank wire / transfer" to enable them.', { icon: '⚠️', duration: 7000 });
      }
      if (cleaned.cryptoWallets.length > 0 && !cleaned.cryptoEnabled) {
        toast('Crypto wallets are saved but NOT offered to clients - tick "Offer crypto deposits" to enable them.', { icon: '⚠️', duration: 7000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="sg-text-muted text-sm">Loading...</p>;

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="sg-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main">Bank Wire / Transfer</h3>
        </div>
        <p className="text-sm sg-text-muted">
          Sent to clients (in-app + email) when their funding request is approved. Each client
          quotes a per-request reference code so finance can match incoming payments.
        </p>
        <label className="flex items-center gap-2 text-sm sg-text-main">
          <input
            type="checkbox"
            checked={form.bankEnabled}
            onChange={(e) => setForm((f) => ({ ...f, bankEnabled: e.target.checked }))}
            style={{ accentColor: 'var(--sg-indigo-deep)' }}
          />
          Offer bank wire / transfer
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          {BANK_FIELDS.map((bf) => (
            <label key={bf.key} className="text-sm sg-text-main space-y-1">
              <span className="text-xs sg-text-muted">{bf.label}</span>
              <input
                type="text"
                value={form[bf.key] as string}
                placeholder={bf.placeholder}
                onChange={(e) => setForm((f) => ({ ...f, [bf.key]: e.target.value }))}
                className="sg-input w-full"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="sg-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main">Crypto</h3>
        </div>
        <label className="flex items-center gap-2 text-sm sg-text-main">
          <input
            type="checkbox"
            checked={form.cryptoEnabled}
            onChange={(e) => setForm((f) => ({ ...f, cryptoEnabled: e.target.checked }))}
            style={{ accentColor: 'var(--sg-indigo-deep)' }}
          />
          Offer crypto deposits
        </label>
        <p className="text-xs sg-text-muted">
          For a Binance account instead of an on-chain wallet: set Network to <em>Binance Pay</em> and
          put your Binance Pay ID / UID (or registered email) in the address field. Use the memo/tag
          field for networks and exchange deposits that require one.
        </p>
        {form.cryptoWallets.map((w, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-2 items-start">
            <input type="text" value={w.asset} placeholder="Asset (USDT)" className="sg-input sm:w-32" onChange={(e) => setWallet(i, { asset: e.target.value })} />
            <input type="text" value={w.network} placeholder="Network (TRC20)" className="sg-input sm:w-36" onChange={(e) => setWallet(i, { network: e.target.value })} />
            <input type="text" value={w.address} placeholder="Address / Binance Pay ID" className="sg-input flex-1 font-mono" onChange={(e) => setWallet(i, { address: e.target.value })} />
            <input type="text" value={w.memo ?? ''} placeholder="Memo/tag (optional)" className="sg-input sm:w-36" onChange={(e) => setWallet(i, { memo: e.target.value })} />
            <button
              type="button"
              className="sg-danger-btn"
              onClick={() => setForm((f) => ({ ...f, cryptoWallets: f.cryptoWallets.filter((_, idx) => idx !== i) }))}
              aria-label="Remove wallet"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="sg-action-btn flex items-center gap-1"
          onClick={() => setForm((f) => ({ ...f, cryptoWallets: [...f.cryptoWallets, { asset: '', network: '', address: '' }] }))}
        >
          <Plus className="h-4 w-4" /> Add wallet
        </button>
      </div>

      <div className="sg-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main">Funding Email Template</h3>
        </div>
        <p className="text-sm sg-text-muted">
          Copy used in the funding-instructions email (layout, logo header/footer, and the
          details tables are fixed). <code>{'{{reference}}'}</code> in the subject is replaced
          with the request's reference number.
        </p>
        <label className="text-sm sg-text-main space-y-1 block">
          <span className="text-xs sg-text-muted">Subject</span>
          <input
            type="text"
            value={form.emailSubject}
            onChange={(e) => setForm((f) => ({ ...f, emailSubject: e.target.value }))}
            className="sg-input w-full"
          />
        </label>
        <label className="text-sm sg-text-main space-y-1 block">
          <span className="text-xs sg-text-muted">Intro paragraph (after "Hello, name!")</span>
          <textarea
            value={form.emailIntro}
            onChange={(e) => setForm((f) => ({ ...f, emailIntro: e.target.value }))}
            className="sg-input w-full"
            rows={3}
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm sg-text-main space-y-1">
            <span className="text-xs sg-text-muted">Support email (footer)</span>
            <input type="text" value={form.supportEmail} onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))} className="sg-input w-full" />
          </label>
          <label className="text-sm sg-text-main space-y-1">
            <span className="text-xs sg-text-muted">Support phone (footer)</span>
            <input type="text" value={form.supportPhone} onChange={(e) => setForm((f) => ({ ...f, supportPhone: e.target.value }))} className="sg-input w-full" />
          </label>
        </div>
        <label className="text-sm sg-text-main space-y-1 block">
          <span className="text-xs sg-text-muted">Company address (footer)</span>
          <input type="text" value={form.companyAddress} onChange={(e) => setForm((f) => ({ ...f, companyAddress: e.target.value }))} className="sg-input w-full" />
        </label>
      </div>

      <div className="sg-panel p-5 space-y-3">
        <h3 className="font-semibold sg-text-main">Additional instructions</h3>
        <textarea
          value={form.extraInstructions}
          onChange={(e) => setForm((f) => ({ ...f, extraInstructions: e.target.value }))}
          placeholder="e.g. Payments typically clear within 1-2 business days. Contact support@... with your reference code for help."
          className="sg-input w-full"
          rows={3}
        />
        <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save funding details'}</button>
      </div>
    </form>
  );
}
