import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Mail, Pause, Play, Plus } from 'lucide-react';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';
import {
  createCampaignFromInstrument, getCampaign, listCampaigns, listEnrollments,
  setEnrollmentStage, updateCampaign,
} from '../../../../services/investor/crm/crmCampaignService';
import { renderMerge } from '../../../../services/investor/crm/crmMerge';
import { trackLabel } from '../../../../services/investor/crm/crmFunnelTemplates';
import { landingUrl, ensureBuiltinInstruments } from '../../../../services/investor/crm/crmInstrumentService';
import type { CrmInstrument, FunnelStage } from '../../../../services/investor/crm/crmInstrumentTypes';
import { FUNNEL_STAGES, FUNNEL_STAGE_LABELS } from '../../../../services/investor/crm/crmInstrumentTypes';
import type { CrmCampaign, CrmEnrollment } from '../../../../services/investor/crm/crmCampaignTypes';

// Funnel campaigns: a sequence of emails ending in one of two exits -
// a booked consultation or a demo-account registration. The console edits
// and enrolls; ONLY the functions-crm worker sends. Activating a campaign
// here does nothing until that codebase is deployed and Resend is verified -
// the status chip says so rather than letting anyone assume mail is moving.

export default function InvestorAdminCrmCampaignsPage() {
  const { user } = useInvestorAuth();
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([]);
  const [instruments, setInstruments] = useState<CrmInstrument[]>([]);
  const [selected, setSelected] = useState<CrmCampaign | null>(null);
  const [enrollments, setEnrollments] = useState<CrmEnrollment[]>([]);
  const [previewStep, setPreviewStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [newSlug, setNewSlug] = useState('');

  const load = useCallback(() => {
    listCampaigns().then(setCampaigns).catch((e) => toast.error(e.message));
    ensureBuiltinInstruments().then((rows) => {
      setInstruments(rows.filter((i) => i.status === 'active'));
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = async (id: string) => {
    const c = await getCampaign(id);
    setSelected(c);
    setPreviewStep(0);
    if (c) listEnrollments(c.id).then(setEnrollments).catch(() => setEnrollments([]));
  };

  const create = async (slug: string) => {
    if (!slug) return;
    setBusy(true);
    try {
      const id = await createCampaignFromInstrument(slug, user?.uid ?? '');
      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.campaign.create', `${slug} campaign ${id}`);
      load();
      await open(id);
      toast.success('Campaign created as a draft — review every email, then activate.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally { setBusy(false); }
  };

  const setStatus = async (c: CrmCampaign, status: CrmCampaign['status']) => {
    if (status === 'active') {
      if (!c.settings.companyAddress) {
        toast.error('Set the company postal address first (CAN-SPAM requires it in the footer). Edit settings below.');
        return;
      }
      if (!window.confirm(
        `Activate "${c.name}"?\n\nThe send worker will start emailing ${c.stats.enrolled} enrolled lead(s) on its next run. Make sure the Resend domain is verified and functions-crm is deployed - until then nothing sends, but once both are live this switch is real.`)) return;
    }
    await updateCampaign(c.id, { status });
    await logAction(user?.uid ?? '', user?.email ?? '', 'crm.campaign.status', `${c.id} -> ${status}`);
    load(); open(c.id);
  };

  const previewHtml = useMemo(() => {
    if (!selected) return '';
    const step = selected.steps[previewStep];
    if (!step) return '';
    return renderMerge(step.html, {
      firstName: 'Ana',
      appointmentUrl: selected.settings.appointmentUrl,
      demoUrl: selected.settings.demoUrl,
      companyName: selected.settings.companyName,
      companyAddress: selected.settings.companyAddress || '[postal address — set before activating]',
      unsubscribeUrl: '#unsubscribe-preview',
    });
  }, [selected, previewStep]);

  const funnelCounts = useMemo(() => {
    const counts = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0])) as Record<FunnelStage, number>;
    for (const e of enrollments) {
      const stage: FunnelStage = e.status === 'unsubscribed' || e.status === 'suppressed'
        ? 'exited'
        : (e.funnelStage ?? (e.status === 'completed' ? 'sequenced' : 'captured'));
      counts[stage] += 1;
    }
    return counts;
  }, [enrollments]);

  return (
    <div className="sg-desk">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="sg-page-title">CRM — Funnel Campaigns</h1>
          <p className="sg-page-sub mt-1">
            Email sequences that end in a consultation or a demo-account registration.
            Enroll leads from the Leads page; the scheduled worker does the sending.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Instrument</label>
            <select className="sg-input" value={newSlug} onChange={(e) => setNewSlug(e.target.value)}>
              <option value="">Choose instrument…</option>
              {instruments.map((i) => (
                <option key={i.slug} value={i.slug}>{i.name}</option>
              ))}
            </select>
          </div>
          <button className="sg-btn-primary inline-flex items-center gap-1.5" disabled={busy || !newSlug} onClick={() => create(newSlug)}>
            <Plus size={16} /> New campaign
          </button>
        </div>
      </div>

      <div className="sg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: 'var(--sg-border)' }}>
              <th className="p-2">Campaign</th><th className="p-2">Track</th><th className="p-2">Status</th>
              <th className="p-2">Enrolled</th><th className="p-2">Sent</th><th className="p-2">Opened</th>
              <th className="p-2">Unsubs</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr><td className="p-3 text-sm" colSpan={8}>No campaigns yet — create one from a track above.</td></tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b" style={{ borderColor: 'var(--sg-border)' }}>
                <td className="p-2">{c.name}</td>
                <td className="p-2">{trackLabel(c.instrumentSlug || c.track)}</td>
                <td className="p-2">{c.status}</td>
                <td className="p-2">{c.stats.enrolled}</td>
                <td className="p-2">{c.stats.sent}</td>
                <td className="p-2">{c.stats.opened}</td>
                <td className="p-2">{c.stats.unsubscribed}</td>
                <td className="p-2">
                  <button className="sg-btn-secondary inline-flex items-center gap-1" onClick={() => open(c.id)}>
                    <Eye size={14} /> Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="sg-panel p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input className="sg-input w-80" value={selected.name}
              onChange={(e) => setSelected({ ...selected, name: e.target.value })}
              onBlur={() => updateCampaign(selected.id, { name: selected.name }).then(load)} />
            <span className="text-sm">{trackLabel(selected.instrumentSlug || selected.track)} · {selected.steps.length} emails</span>
            <a className="text-xs" style={{ color: 'var(--sg-teal)' }}
              href={landingUrl(selected.instrumentSlug || selected.track)} target="_blank" rel="noreferrer">
              Landing page
            </a>
            <div className="ml-auto flex gap-2">
              {selected.status !== 'active' ? (
                <button className="sg-btn-primary inline-flex items-center gap-1.5" onClick={() => setStatus(selected, 'active')}>
                  <Play size={15} /> Activate
                </button>
              ) : (
                <button className="sg-btn-secondary inline-flex items-center gap-1.5" onClick={() => setStatus(selected, 'paused')}>
                  <Pause size={15} /> Pause
                </button>
              )}
            </div>
          </div>

          <div className="sg-stat-strip">
            {FUNNEL_STAGES.map((s) => (
              <div key={s} className="sg-panel sg-stat-chip">
                <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>{FUNNEL_STAGE_LABELS[s]}</p>
                <p className="font-semibold mt-1" style={{ fontFamily: 'var(--sg-font-display)' }}>{funnelCounts[s]}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {selected.steps.map((s, i) => (
                <button key={s.key}
                  className="w-full text-left sg-panel p-3"
                  style={previewStep === i ? { borderColor: 'var(--sg-teal)' } : undefined}
                  onClick={() => setPreviewStep(i)}>
                  <div className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
                    Email {i + 1} · {i === 0 ? 'on enrollment' : `+${s.dayOffset} day(s) after email ${i}`}
                  </div>
                  <div className="text-sm font-medium mt-0.5 inline-flex items-center gap-1.5">
                    <Mail size={14} /> {s.subject}
                  </div>
                </button>
              ))}
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Subject (email {previewStep + 1})</label>
                <input className="sg-input w-full" value={selected.steps[previewStep]?.subject ?? ''}
                  onChange={(e) => {
                    const steps = selected.steps.map((s, i) => i === previewStep ? { ...s, subject: e.target.value } : s);
                    setSelected({ ...selected, steps });
                  }}
                  onBlur={() => updateCampaign(selected.id, { steps: selected.steps }).then(() => toast.success('Subject saved'))} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Company postal address (footer, required to activate)</label>
                <input className="sg-input w-full" value={selected.settings.companyAddress}
                  onChange={(e) => setSelected({ ...selected, settings: { ...selected.settings, companyAddress: e.target.value } })}
                  onBlur={() => updateCampaign(selected.id, { settings: selected.settings }).then(() => toast.success('Settings saved'))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Appointment URL</label>
                  <input className="sg-input w-full" value={selected.settings.appointmentUrl}
                    onChange={(e) => setSelected({ ...selected, settings: { ...selected.settings, appointmentUrl: e.target.value } })}
                    onBlur={() => updateCampaign(selected.id, { settings: selected.settings })} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Demo / registration URL</label>
                  <input className="sg-input w-full" value={selected.settings.demoUrl}
                    onChange={(e) => setSelected({ ...selected, settings: { ...selected.settings, demoUrl: e.target.value } })}
                    onBlur={() => updateCampaign(selected.id, { settings: selected.settings })} />
                </div>
              </div>
            </div>

            <div className="sg-panel p-0 overflow-hidden" style={{ minHeight: 480 }}>
              <iframe title="Email preview" srcDoc={previewHtml} sandbox=""
                style={{ width: '100%', height: 560, border: 0, background: '#eef1f4' }} />
            </div>
          </div>

          {enrollments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sg-text-muted">
                  <tr>
                    <th className="text-left p-2">Lead</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.slice(0, 80).map((e) => (
                    <tr key={e.id} className="border-t sg-row-border">
                      <td className="p-2">{e.firstName}</td>
                      <td className="p-2">{e.email}</td>
                      <td className="p-2">
                        <select
                          className="sg-input sg-desk-select"
                          value={e.funnelStage ?? 'sequenced'}
                          onChange={async (ev) => {
                            const stage = ev.target.value as FunnelStage;
                            await setEnrollmentStage(e.id, stage);
                            setEnrollments((rows) => rows.map((r) => r.id === e.id ? { ...r, funnelStage: stage } : r));
                          }}
                        >
                          {FUNNEL_STAGES.map((s) => (
                            <option key={s} value={s}>{FUNNEL_STAGE_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
