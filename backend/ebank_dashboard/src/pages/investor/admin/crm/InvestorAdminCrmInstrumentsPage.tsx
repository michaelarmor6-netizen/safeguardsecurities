import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { renderMerge } from '../../../../services/investor/crm/crmMerge';
import { renderInstrumentLandingPreview } from '../../../../services/investor/crm/crmLandingPreview';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';
import {
  ASSET_CLASS_LABELS,
  type InstrumentAssetClass,
  type CrmInstrument,
  type InstrumentLanding,
} from '../../../../services/investor/crm/crmInstrumentTypes';
import {
  blankLanding,
  ensureBuiltinInstruments,
  landingUrl,
  updateInstrument,
  upsertInstrument,
} from '../../../../services/investor/crm/crmInstrumentService';

const CLASSES = Object.keys(ASSET_CLASS_LABELS) as InstrumentAssetClass[];

export default function InvestorAdminCrmInstrumentsPage() {
  const { user } = useInvestorAuth();
  const [rows, setRows] = useState<CrmInstrument[]>([]);
  const [selected, setSelected] = useState<CrmInstrument | null>(null);
  const [previewStep, setPreviewStep] = useState(0);
  const [previewTab, setPreviewTab] = useState<'landing' | 'email'>('landing');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    slug: '',
    name: '',
    assetClass: 'futures' as InstrumentAssetClass,
    riskDisclosure: 'Investing involves risk, including possible loss of the amount you commit. This is not a recommendation or a forecast.',
    defaultAppointmentUrl: 'https://safeguardsecurities.us/appointments',
    defaultDemoUrl: 'https://global.safeguardsecurities.us/signup?demo=1',
    landing: blankLanding(),
  });

  const load = useCallback(() => {
    ensureBuiltinInstruments()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load instruments'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveSelected = async () => {
    if (!selected) return;
    try {
      await updateInstrument(selected.slug, {
        name: selected.name,
        assetClass: selected.assetClass,
        status: selected.status,
        landing: selected.landing,
        riskDisclosure: selected.riskDisclosure,
        defaultAppointmentUrl: selected.defaultAppointmentUrl,
        defaultDemoUrl: selected.defaultDemoUrl,
        defaultSteps: selected.defaultSteps,
      });
      if (user) logAction(user.uid, user.email ?? '', 'crm.instrument.update', selected.slug);
      toast.success('Instrument saved');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const create = async () => {
    try {
      const slug = await upsertInstrument(draft);
      if (user) logAction(user.uid, user.email ?? '', 'crm.instrument.create', slug);
      toast.success('Instrument created');
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const setLanding = (patch: Partial<InstrumentLanding>) => {
    if (!selected) return;
    setSelected({ ...selected, landing: { ...selected.landing, ...patch } });
  };

  return (
    <div className="sg-desk">
      <div className="sg-desk-head">
        <div className="min-w-0">
          <h1 className="sg-page-title">CRM — Instruments</h1>
          <p className="sg-page-sub mt-1">
            Catalog of investment types a funnel can run. First live instrument: Futures — Gold Options.
            Landing copy and default emails are copied onto a campaign when you create one.
          </p>
        </div>
        <button type="button" className="sg-btn-primary inline-flex items-center gap-1.5" onClick={() => setCreating((v) => !v)}>
          <Plus size={16} /> {creating ? 'Close' : 'New instrument'}
        </button>
      </div>

      {creating && (
        <div className="sg-panel p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Slug</label>
              <input className="sg-input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="e.g. forex-majors" />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Name</label>
              <input className="sg-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Asset class</label>
              <select className="sg-input" value={draft.assetClass} onChange={(e) => setDraft({ ...draft, assetClass: e.target.value as InstrumentAssetClass })}>
                {CLASSES.map((c) => <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Headline</label>
              <input className="sg-input" value={draft.landing.headline} onChange={(e) => setDraft({ ...draft, landing: { ...draft.landing, headline: e.target.value } })} />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Risk disclosure (required)</label>
            <textarea className="sg-input min-h-[88px]" value={draft.riskDisclosure} onChange={(e) => setDraft({ ...draft, riskDisclosure: e.target.value })} />
          </div>
          <button type="button" className="sg-btn-primary" onClick={create}>Create instrument</button>
        </div>
      )}

      <div className="sg-panel sg-desk-list">
        <table className="sg-desk-table text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left">Instrument</th>
              <th className="text-left">Class</th>
              <th className="text-left">Status</th>
              <th className="text-left">Landing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.slug} className="border-t sg-row-border">
                <td>
                  <button type="button" className="text-left" onClick={() => { setSelected(i); setPreviewStep(0); setPreviewTab('landing'); }}>
                    <span className="block sg-text-main">{i.name}</span>
                    <span className="text-xs sg-text-muted">{i.slug}</span>
                  </button>
                </td>
                <td>{ASSET_CLASS_LABELS[i.assetClass]}</td>
                <td>{i.status}</td>
                <td><a className="text-xs" style={{ color: 'var(--sg-teal)' }} href={landingUrl(i.slug)} target="_blank" rel="noreferrer">Open page</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="sg-panel p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[12rem]">
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Name</label>
              <input className="sg-input" value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Class</label>
              <select className="sg-input" value={selected.assetClass} onChange={(e) => setSelected({ ...selected, assetClass: e.target.value as InstrumentAssetClass })}>
                {CLASSES.map((c) => <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Status</label>
              <select className="sg-input" value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value as CrmInstrument['status'] })}>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <button type="button" className="sg-btn-primary" onClick={saveSelected}>Save</button>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Landing headline</label>
            <input className="sg-input" value={selected.landing.headline} onChange={(e) => setLanding({ headline: e.target.value })} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Subhead</label>
            <textarea className="sg-input min-h-[64px]" value={selected.landing.subhead} onChange={(e) => setLanding({ subhead: e.target.value })} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Risk disclosure</label>
            <textarea className="sg-input min-h-[88px]" value={selected.riskDisclosure} onChange={(e) => setSelected({ ...selected, riskDisclosure: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Appointment URL</label>
              <input className="sg-input" value={selected.defaultAppointmentUrl} onChange={(e) => setSelected({ ...selected, defaultAppointmentUrl: e.target.value })} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Demo URL</label>
              <input className="sg-input" value={selected.defaultDemoUrl} onChange={(e) => setSelected({ ...selected, defaultDemoUrl: e.target.value })} />
            </div>
          </div>
          {(selected.landing.bullets ?? []).map((b, i) => (
            <div key={i} className="grid sm:grid-cols-2 gap-2">
              <input className="sg-input" placeholder="Bullet title" value={b.title}
                onChange={(e) => {
                  const bullets = selected.landing.bullets.map((x, j) => j === i ? { ...x, title: e.target.value } : x);
                  setLanding({ bullets });
                }} />
              <input className="sg-input" placeholder="Bullet body" value={b.body}
                onChange={(e) => {
                  const bullets = selected.landing.bullets.map((x, j) => j === i ? { ...x, body: e.target.value } : x);
                  setLanding({ bullets });
                }} />
            </div>
          ))}
          <div>
            {selected.defaultSteps.map((s, i) => (
              <div key={s.key} className="mb-2">
                <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Email {i + 1} subject</label>
                <input className="sg-input" value={s.subject}
                  onChange={(e) => {
                    const defaultSteps = selected.defaultSteps.map((st, j) => j === i ? { ...st, subject: e.target.value } : st);
                    setSelected({ ...selected, defaultSteps });
                    setPreviewStep(i);
                    setPreviewTab('email');
                  }} />
              </div>
            ))}
          </div>
          <p className="text-xs sg-text-muted">
            Public landing (after functions deploy): <a href={landingUrl(selected.slug)} target="_blank" rel="noreferrer" style={{ color: 'var(--sg-teal)' }}>{landingUrl(selected.slug)}</a>
          </p>
          <div className="flex gap-2">
            <button type="button" className={previewTab === 'landing' ? 'sg-btn-primary' : 'sg-btn-ghost'} onClick={() => setPreviewTab('landing')}>Landing preview</button>
            <button type="button" className={previewTab === 'email' ? 'sg-btn-primary' : 'sg-btn-ghost'} onClick={() => setPreviewTab('email')}>Email preview</button>
          </div>
          <InstrumentPreview instrument={selected} tab={previewTab} step={previewStep} onStep={setPreviewStep} />
        </div>
      )}
    </div>
  );
}

function InstrumentPreview({
  instrument, tab, step, onStep,
}: {
  instrument: CrmInstrument;
  tab: 'landing' | 'email';
  step: number;
  onStep: (n: number) => void;
}) {
  const emailHtml = useMemo(() => {
    const s = instrument.defaultSteps[step];
    if (!s) return '';
    return renderMerge(s.html, {
      firstName: 'Ana',
      appointmentUrl: instrument.defaultAppointmentUrl,
      demoUrl: instrument.defaultDemoUrl,
      companyName: 'SafeGuard Securities',
      companyAddress: '[postal address — set on the campaign before activate]',
      unsubscribeUrl: '#unsubscribe-preview',
    });
  }, [instrument, step]);

  if (tab === 'landing') {
    return (
      <iframe title="Landing preview" srcDoc={renderInstrumentLandingPreview(instrument)} sandbox=""
        style={{ width: '100%', height: 520, border: '1px solid var(--sg-border)', borderRadius: 12, background: '#f6f8f9' }} />
    );
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {instrument.defaultSteps.map((s, i) => (
          <button key={s.key} type="button" className={i === step ? 'sg-btn-primary' : 'sg-btn-ghost'}
            onClick={() => onStep(i)}>Email {i + 1}</button>
        ))}
      </div>
      <iframe title="Email preview" srcDoc={emailHtml} sandbox=""
        style={{ width: '100%', height: 520, border: '1px solid var(--sg-border)', borderRadius: 12, background: '#eef1f4' }} />
    </div>
  );
}
