import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { isFinanceRole } from '../../../lib/investorRoles';
import { getAllInvestorProfiles, type InvestorProfile } from '../../../services/investor/profileService';
import {
  createStaffInvoice,
  formatAddress,
  formatInvoiceMoney,
  getAllInvoices,
  invoiceTotal,
  markInvoicePaid,
  sendInvoiceEmail,
  voidInvoice,
  type InvoiceLineItem,
  type InvoiceSendMode,
  type StaffInvoice,
} from '../../../services/investor/invoiceService';
import { logAction } from '../../../services/investor/auditService';

const clientLabel = (p: InvestorProfile) =>
  p.displayName?.trim() || [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.email || p.id;

const STATUS_LABEL: Record<string, string> = {
  issued: 'Issued',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
};

export default function InvestorAdminInvoicesPage() {
  const navigate = useNavigate();
  const { user, profile } = useInvestorAuth();
  const canWrite = profile ? isFinanceRole(profile.role) : false;
  const [rows, setRows] = useState<StaffInvoice[]>([]);
  const [clients, setClients] = useState<InvestorProfile[]>([]);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToCompany, setBillToCompany] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('0');
  const [taxLabel, setTaxLabel] = useState('Tax');
  const [paymentTerms, setPaymentTerms] = useState('Due upon receipt');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [includePay, setIncludePay] = useState(true);
  const [sendMode, setSendMode] = useState<InvoiceSendMode>('auto');
  const [items, setItems] = useState<InvoiceLineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);

  const load = () =>
    Promise.all([getAllInvoices(), getAllInvestorProfiles()])
      .then(([invoices, profiles]) => {
        setRows(invoices);
        setClients(profiles.filter((p) => p.role === 'client'));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load invoices'));

  useEffect(() => { load(); }, []);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 20);
    return clients.filter((c) => `${clientLabel(c)} ${c.email}`.toLowerCase().includes(q)).slice(0, 20);
  }, [clients, clientQuery]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.number} ${r.billToName} ${r.billToEmail} ${r.status}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const selectClient = (p: InvestorProfile) => {
    setClientId(p.id);
    setClientQuery(clientLabel(p));
    setBillToName(clientLabel(p));
    setBillToEmail(p.email ?? '');
    setBillToAddress(formatAddress(p.address));
  };

  const resetForm = () => {
    setClientId('');
    setClientQuery('');
    setBillToName('');
    setBillToEmail('');
    setBillToCompany('');
    setBillToAddress('');
    setCurrency('USD');
    setTaxRate('0');
    setTaxLabel('Tax');
    setPaymentTerms('Due upon receipt');
    setDueDate('');
    setNotes('');
    setIncludePay(true);
    setSendMode('auto');
    setItems([{ description: '', quantity: 1, unitPrice: 0 }]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canWrite) return;
    setSaving(true);
    try {
      const id = await createStaffInvoice({
        userId: clientId,
        billToName,
        billToEmail,
        billToCompany,
        billToAddress,
        currency,
        lineItems: items,
        taxRate: Number(taxRate) || 0,
        taxLabel,
        notes,
        paymentTerms,
        dueDate: dueDate ? new Date(`${dueDate}T17:00:00`) : null,
        includePaymentInstructions: includePay,
        sendMode,
        createdByUid: user.uid,
        createdByEmail: profile?.email ?? user.email ?? '',
      });
      await logAction(user.uid, profile?.email ?? '', 'Invoice issued', `${billToEmail} ${sendMode}`);
      if (sendMode === 'auto') {
        try {
          await sendInvoiceEmail(id);
          toast.success('Invoice issued and emailed');
        } catch (mailErr) {
          toast.error(mailErr instanceof Error ? mailErr.message : 'Invoice saved, but email failed');
        }
      } else {
        toast.success('Invoice issued — send it manually when ready');
      }
      resetForm();
      setCreating(false);
      load();
      if (sendMode === 'manual') navigate(`/invoice-email/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sg-text-main">Invoices</h1>
          <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
            Issue official invoices. Send automatically through the configured mail client, or compose manually.
          </p>
        </div>
        {canWrite && (
          <button type="button" className="sg-btn-primary flex items-center gap-2" onClick={() => setCreating((v) => !v)}>
            <Plus className="h-4 w-4" />
            {creating ? 'Close form' : 'New invoice'}
          </button>
        )}
      </div>

      {creating && canWrite && (
        <form onSubmit={submit} className="sg-panel p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--sg-muted)' }}>Client</label>
            <div className="relative mt-1">
              <Search className="h-4 w-4 absolute left-3 top-3" style={{ color: 'var(--sg-muted)' }} />
              <input
                className="sg-input w-full pl-9"
                placeholder="Search clients by name or email"
                value={clientQuery}
                onChange={(e) => { setClientQuery(e.target.value); setClientId(''); }}
              />
            </div>
            {!clientId && clientQuery && (
              <ul className="mt-1 max-h-40 overflow-auto rounded-[10px] border text-sm" style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-elevated)' }}>
                {filteredClients.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="w-full text-left px-3 py-2 hover:opacity-80" onClick={() => selectClient(c)}>
                      <span className="sg-text-main">{clientLabel(c)}</span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--sg-muted)' }}>{c.email}</span>
                    </button>
                  </li>
                ))}
                {filteredClients.length === 0 && <li className="px-3 py-2" style={{ color: 'var(--sg-muted)' }}>No matching clients</li>}
              </ul>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Bill-to name</label>
              <input className="sg-input w-full mt-1" required value={billToName} onChange={(e) => setBillToName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Bill-to email</label>
              <input className="sg-input w-full mt-1" type="email" required value={billToEmail} onChange={(e) => setBillToEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Company (optional)</label>
              <input className="sg-input w-full mt-1" value={billToCompany} onChange={(e) => setBillToCompany(e.target.value)} />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Currency</label>
              <select className="sg-input w-full mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {['USD', 'EUR', 'GBP', 'CHF'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Billing address</label>
            <textarea className="sg-input w-full mt-1" rows={2} value={billToAddress} onChange={(e) => setBillToAddress(e.target.value)} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--sg-muted)' }}>Line items</p>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="sg-input col-span-12 sm:col-span-6"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => setItems((prev) => prev.map((p, idx) => idx === i ? { ...p, description: e.target.value } : p))}
                  />
                  <input
                    className="sg-input col-span-4 sm:col-span-2"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => setItems((prev) => prev.map((p, idx) => idx === i ? { ...p, quantity: Number(e.target.value) } : p))}
                  />
                  <input
                    className="sg-input col-span-6 sm:col-span-3"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit amount"
                    value={item.unitPrice || ''}
                    onChange={(e) => setItems((prev) => prev.map((p, idx) => idx === i ? { ...p, unitPrice: Number(e.target.value) } : p))}
                  />
                  <button
                    type="button"
                    className="col-span-2 sm:col-span-1 sg-action-btn flex justify-center"
                    onClick={() => setItems((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="sg-action-btn mt-2 text-sm"
              onClick={() => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }])}
            >
              Add line
            </button>
            <p className="text-sm mt-2 sg-text-main">
              Total {formatInvoiceMoney(invoiceTotal(items, Number(taxRate) || 0), currency)}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Tax label</label>
              <input className="sg-input w-full mt-1" value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Tax %</label>
              <input className="sg-input w-full mt-1" type="number" min="0" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Due date</label>
              <input className="sg-input w-full mt-1" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Payment terms</label>
            <input className="sg-input w-full mt-1" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div>
            <label className="text-xs" style={{ color: 'var(--sg-muted)' }}>Notes (shown on invoice)</label>
            <textarea className="sg-input w-full mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm sg-text-main">
            <input type="checkbox" checked={includePay} onChange={(e) => setIncludePay(e.target.checked)} />
            Include configured bank / payment instructions
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs uppercase tracking-wider" style={{ color: 'var(--sg-muted)' }}>Delivery</legend>
            <label className="flex items-start gap-2 text-sm sg-text-main">
              <input type="radio" name="sendMode" checked={sendMode === 'auto'} onChange={() => setSendMode('auto')} />
              <span>Send automatically through the configured email client (Resend / finance mailbox)</span>
            </label>
            <label className="flex items-start gap-2 text-sm sg-text-main">
              <input type="radio" name="sendMode" checked={sendMode === 'manual'} onChange={() => setSendMode('manual')} />
              <span>Prepare for manual send in my mail app</span>
            </label>
          </fieldset>

          <button type="submit" className="sg-btn-primary" disabled={saving || !clientId}>
            {saving ? 'Issuing…' : 'Issue invoice'}
          </button>
        </form>
      )}

      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-3" style={{ color: 'var(--sg-muted)' }} />
        <input className="sg-input w-full pl-9" placeholder="Search invoices" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="sg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--sg-muted)' }}>
              <th className="text-left p-3">Number</th>
              <th className="text-left p-3">Client</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-left p-3">Issued</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Email</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((inv) => (
              <tr key={inv.id} style={{ borderTop: '1px solid var(--sg-border)' }}>
                <td className="p-3 font-mono">{inv.number}</td>
                <td className="p-3">
                  <div className="sg-text-main">{inv.billToName}</div>
                  <div className="text-xs" style={{ color: 'var(--sg-muted)' }}>{inv.billToEmail}</div>
                </td>
                <td className="p-3 text-right">{formatInvoiceMoney(invoiceTotal(inv.lineItems, inv.taxRate), inv.currency)}</td>
                <td className="p-3 whitespace-nowrap">{inv.issuedAt?.toLocaleString() ?? '—'}</td>
                <td className="p-3">{STATUS_LABEL[inv.status] ?? inv.status}</td>
                <td className="p-3 text-xs" style={{ color: 'var(--sg-muted)' }}>
                  {inv.emailSentAt
                    ? `Sent ${inv.emailSentAt.toLocaleString()}`
                    : inv.emailError
                      ? inv.emailError
                      : inv.sendMode === 'auto'
                        ? 'Not sent'
                        : 'Manual'}
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button type="button" className="sg-action-btn text-xs" onClick={() => navigate(`/invoice/${inv.id}`)}>View</button>
                  {canWrite && !inv.emailSentAt && inv.status !== 'void' && (
                    <button
                      type="button"
                      className="sg-action-btn text-xs"
                      disabled={busyId === inv.id}
                      onClick={async () => {
                        setBusyId(inv.id);
                        try {
                          await sendInvoiceEmail(inv.id);
                          if (user) logAction(user.uid, profile?.email ?? '', 'Invoice emailed', inv.number);
                          toast.success('Invoice emailed');
                          load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Send failed');
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Send
                    </button>
                  )}
                  {canWrite && (
                    <button type="button" className="sg-action-btn text-xs" onClick={() => navigate(`/invoice-email/${inv.id}`)}>Manual</button>
                  )}
                  {canWrite && inv.status !== 'paid' && inv.status !== 'void' && (
                    <button
                      type="button"
                      className="sg-action-btn text-xs"
                      disabled={busyId === inv.id}
                      onClick={async () => {
                        setBusyId(inv.id);
                        try {
                          await markInvoicePaid(inv.id);
                          if (user) logAction(user.uid, profile?.email ?? '', 'Invoice marked paid', inv.number);
                          load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed');
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Mark paid
                    </button>
                  )}
                  {canWrite && inv.status !== 'void' && (
                    <button
                      type="button"
                      className="sg-action-btn text-xs"
                      disabled={busyId === inv.id}
                      onClick={async () => {
                        setBusyId(inv.id);
                        try {
                          await voidInvoice(inv.id);
                          if (user) logAction(user.uid, profile?.email ?? '', 'Invoice voided', inv.number);
                          load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed');
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center" style={{ color: 'var(--sg-muted)' }}>
                  No invoices yet. Finance can issue the first official invoice above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
