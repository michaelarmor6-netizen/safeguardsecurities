import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, ShieldOff, Trash2, Upload } from 'lucide-react';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';
import { deleteLead, listLeads, markExported, updateLead, type LeadFilter } from '../../../../services/investor/crm/crmLeadService';
import { addSuppression } from '../../../../services/investor/crm/crmSuppressionService';
import { buildVicidialCsv, downloadCsv } from '../../../../services/investor/crm/vicidialExport';
import { enrollLeads, listCampaigns } from '../../../../services/investor/crm/crmCampaignService';
import type { CrmCampaign } from '../../../../services/investor/crm/crmCampaignTypes';
import { CONSENT_BASIS_LABELS, type ConsentBasis, type CrmLead, type CrmLeadStatus } from '../../../../services/investor/crm/crmTypes';

// The lead table and the Vicidial exit. Two invariants live in this page:
// suppression is a one-way door an admin walks deliberately, and every CSV
// of PII that leaves is written to the audit log - who, when, how many.

const STATUSES: CrmLeadStatus[] = ['new', 'working', 'customer', 'dead'];

export default function InvestorAdminCrmLeadsPage() {
  const { user } = useInvestorAuth();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadFilter>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [campaignOptions, setCampaignOptions] = useState<CrmCampaign[]>([]);
  useEffect(() => { listCampaigns().then(setCampaignOptions).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    listLeads(filter)
      .then(setLeads)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load leads'))
      .finally(() => setLoading(false));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const visibleIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const allSelected = selected.size > 0 && visibleIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleIds));
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const targetLeads = useMemo(
    () => (selected.size > 0 ? leads.filter((l) => selected.has(l.id)) : leads),
    [leads, selected],
  );

  const exportVicidial = async () => {
    if (targetLeads.length === 0) { toast.error('Nothing to export'); return; }
    const listId = window.prompt('Vicidial list_id for this file (blank to leave the column empty):', '') ?? '';
    setBusy(true);
    try {
      const { csv, included, skippedNoPhone } = buildVicidialCsv(targetLeads, listId.trim());
      if (included.length === 0) {
        toast.error('None of these leads has a dialable phone - nothing exported');
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `safeguard-vicidial-${stamp}.csv`);
      await markExported(included.map((l) => l.id));
      // A CSV of PII leaving the system must always answer who/when/what.
      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.export.vicidial',
        `${included.length} leads exported (${skippedNoPhone} skipped without phone), list_id="${listId.trim()}"`);
      toast.success(`Exported ${included.length} leads${skippedNoPhone ? ` - ${skippedNoPhone} skipped (no phone)` : ''}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const suppressSelected = async () => {
    const chosen = leads.filter((l) => selected.has(l.id));
    if (chosen.length === 0) { toast.error('Select leads first'); return; }
    if (!window.confirm(`Suppress ${chosen.length} lead(s)? Their phone/email will be blocked from every export and campaign. This is the do-not-contact list - treat it as permanent.`)) return;
    setBusy(true);
    try {
      for (const lead of chosen) {
        if (lead.phoneE164) await addSuppression({ type: 'phone', value: lead.phoneE164, reason: 'manual', source: 'admin' });
        if (lead.email) await addSuppression({ type: 'email', value: lead.email, reason: 'manual', source: 'admin' });
        await updateLead(lead.id, { status: 'dead' });
      }
      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.suppress', `${chosen.length} leads suppressed manually`);
      toast.success(`${chosen.length} suppressed`);
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression failed');
    } finally {
      setBusy(false);
    }
  };

  const removeSelected = async () => {
    const chosen = [...selected];
    if (chosen.length === 0) { toast.error('Select leads first'); return; }
    if (!window.confirm(`Delete ${chosen.length} lead(s) from the CRM? (This does NOT suppress them - use Suppress for do-not-contact.)`)) return;
    setBusy(true);
    try {
      for (const id of chosen) await deleteLead(id);
      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.delete', `${chosen.length} leads deleted`);
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  // Funnel entry point: enrollment re-checks suppression and dedupes per
  // campaign, so this button is safe to press twice.
  const addToCampaign = async (campaignId: string) => {
    const campaign = campaignOptions.find((c) => c.id === campaignId);
    if (!campaign) return;
    const chosen = selected.size > 0 ? leads.filter((l) => selected.has(l.id)) : leads;
    if (chosen.length === 0) { toast.error('Nothing to enroll'); return; }
    if (!window.confirm(`Enroll ${chosen.length} lead(s) into "${campaign.name}"? Emails start when the campaign is active and the send worker runs.`)) return;
    setBusy(true);
    try {
      const r = await enrollLeads(campaign, chosen);
      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.campaign.enroll',
        `${r.enrolled} into ${campaign.name} (${r.skippedNoEmail} no email, ${r.skippedSuppressed} suppressed, ${r.alreadyEnrolled} already in)`);
      toast.success(`${r.enrolled} enrolled — ${r.skippedNoEmail} had no email, ${r.skippedSuppressed} suppressed, ${r.alreadyEnrolled} already enrolled`);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enrollment failed');
    } finally { setBusy(false); }
  };

  const setStatus = async (lead: CrmLead, status: CrmLeadStatus) => {
    try {
      await updateLead(lead.id, { status });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="sg-page-title">CRM — Leads</h1>
          <p className="sg-page-sub mt-1">
            {leads.length} lead(s){selected.size > 0 ? ` · ${selected.size} selected` : ''} — exports act on the selection, or on the whole filtered list when nothing is selected.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/crm-imports" className="sg-btn-secondary inline-flex items-center gap-1.5">
            <Upload size={16} /> Import leads
          </Link>
          <button className="sg-btn-secondary inline-flex items-center gap-1.5" disabled={busy} onClick={suppressSelected}>
            <ShieldOff size={16} /> Suppress
          </button>
          <button className="sg-btn-secondary inline-flex items-center gap-1.5" disabled={busy} onClick={removeSelected}>
            <Trash2 size={16} /> Delete
          </button>
          <select className="sg-input" disabled={busy || campaignOptions.length === 0} value=""
            onChange={(e) => { if (e.target.value) { addToCampaign(e.target.value); e.target.value = ''; } }}>
            <option value="">{campaignOptions.length ? 'Add to campaign…' : 'No campaigns yet'}</option>
            {campaignOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.instrumentSlug ? ` · ${c.instrumentSlug}` : ''}</option>
            ))}
          </select>
          <button className="sg-btn-primary inline-flex items-center gap-1.5" disabled={busy} onClick={exportVicidial}>
            <Download size={16} /> Export Vicidial CSV
          </button>
        </div>
      </div>

      <div className="sg-panel p-3 flex gap-2 flex-wrap items-center">
        <input
          className="sg-input w-56"
          placeholder="Search name / company / phone / email"
          value={filter.search ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value || undefined }))}
        />
        <select className="sg-input w-40" value={filter.status ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as CrmLeadStatus | undefined }))}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="sg-input w-56" value={filter.consentBasis ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, consentBasis: (e.target.value || undefined) as ConsentBasis | undefined }))}>
          <option value="">All consent bases</option>
          {Object.entries(CONSENT_BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="text-sm inline-flex items-center gap-1.5">
          <input type="checkbox" checked={!!filter.hasPhone} onChange={(e) => setFilter((f) => ({ ...f, hasPhone: e.target.checked || undefined }))} />
          Has phone
        </label>
        <label className="text-sm inline-flex items-center gap-1.5">
          <input type="checkbox" checked={!!filter.hasEmail} onChange={(e) => setFilter((f) => ({ ...f, hasEmail: e.target.checked || undefined }))} />
          Has email
        </label>
      </div>

      <div className="sg-panel overflow-x-auto">
        {loading ? (
          <p className="p-4 text-sm">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="p-4 text-sm">No leads yet — start with <Link className="underline" to="/admin/crm-imports">an import</Link>.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--sg-border)' }}>
                <th className="p-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th className="p-2">Name</th>
                <th className="p-2">Company</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Email</th>
                <th className="p-2">Consent</th>
                <th className="p-2">Source</th>
                <th className="p-2">Status</th>
                <th className="p-2">Exported</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b align-top" style={{ borderColor: 'var(--sg-border)' }}>
                  <td className="p-2"><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>
                  <td className="p-2">{`${l.firstName} ${l.lastName}`.trim() || '—'}</td>
                  <td className="p-2">{l.company ?? '—'}</td>
                  <td className="p-2 whitespace-nowrap">{l.phoneE164 ?? '—'}</td>
                  <td className="p-2">{l.email ?? '—'}</td>
                  <td className="p-2">{CONSENT_BASIS_LABELS[l.consentBasis]}</td>
                  <td className="p-2 whitespace-nowrap">
                    {l.source.kind === 'gi' ? `GI ${l.source.mission ?? ''}` : l.source.file ?? l.source.kind}
                  </td>
                  <td className="p-2">
                    <select className="sg-input" value={l.status} onChange={(e) => setStatus(l, e.target.value as CrmLeadStatus)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-2 whitespace-nowrap">{l.lastExportedAt ? l.lastExportedAt.toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
