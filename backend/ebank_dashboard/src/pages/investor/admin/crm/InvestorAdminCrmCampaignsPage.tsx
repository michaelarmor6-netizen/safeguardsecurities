import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Mail, Pause, Play, Plus } from 'lucide-react';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';
import {
  createCampaignFromTrack, getCampaign, listCampaigns, listEnrollments, updateCampaign,
} from '../../../../services/investor/crm/crmCampaignService';
import { renderMerge } from '../../../../services/investor/crm/crmMerge';
import { TRACK_LABELS } from '../../../../services/investor/crm/crmFunnelTemplates';
import type {
  CampaignTrack, CrmCampaign, CrmEnrollment,
} from '../../../../services/investor/crm/crmCampaignTypes';

// Funnel campaigns: a sequence of emails ending in one of two exits -
// a booked consultation or a demo-account registration. The console edits
// and enrolls; ONLY the functions-crm worker sends. Activating a campaign
// here does nothing until that codebase is deployed and Resend is verified -
// the status chip says so rather than letting anyone assume mail is moving.

export default function InvestorAdminCrmCampaignsPage() {
  const { user } = useInvestorAuth();
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([]);
  const [selected, setSelected] = useState<CrmCampaign | null>(null);
  const [enrollments, setEnrollments] = useState<CrmEnrollment[]>([]);
  const [previewStep, setPreviewStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listCampaigns().then(setCampaigns).catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = async (id: string) => {
    const c = await getCampaign(id);
    setSelected(c);
    setPreviewStep(0);
    if (c) listEnrollments(c.id).then(setEnrollments).catch(() => setEnrollments([]));
  };

  const create = async (track: CampaignTrack) => {
    setBusy(true);
    try {
      const id = await createCampaignFromTrack(track, user?.uid ?? '', {
        fromName: 'SafeGuard Securities',
        appointmentUrl: 'https://safeguardsecurities.us/appointments',
        demoUrl: 'https://global.safeguardsecurities.us/signup?demo=1',
        companyName: 'SafeGuard Securities',
        companyAddress: '', // CAN-SPAM: fill in Settings before activating
      });
      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.campaign.create', `${track} campaign ${id}`);
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
    const active = enrollments.filter((e) => e.status === 'active').length;
    const done = enrollments.filter((e) => e.status === 'completed').length;
    const out = enrollments.filter((e) => e.status === 'unsubscribed' || e.status === 'suppressed').length;
    return { active, done, out };
  }, [enrollments]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="sg-page-title">CRM — Funnel Campaigns</h1>
          <p className="sg-page-sub mt-1">
            Email sequences that end in a consultation or a demo-account registration.
            Enroll leads from the Leads page; the scheduled worker does the sending.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="sg-btn-secondary inline-flex items-center gap-1.5" disabled={busy} onClick={() => create('gold')}>
            <Plus size={16} /> New Gold campaign
          </button>
          <button className="sg-btn-primary inline-flex items-center gap-1.5" disabled={busy} onClick={() => create('preipo')}>
            <Plus size={16} /> New Pre-IPO campaign
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
                <td className="p-2">{TRACK_LABELS[c.track]}</td>
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
            <span className="text-sm">{TRACK_LABELS[selected.track]} · {selected.steps.length} emails</span>
            <span className="text-sm">
              funnel: {funnelCounts.active} in sequence · {funnelCounts.done} completed · {funnelCounts.out} opted out
            </span>
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

          <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(260px, 1fr) minmax(320px, 1.4fr)' }}>
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
        </div>
      )}
    </div>
  );
}
