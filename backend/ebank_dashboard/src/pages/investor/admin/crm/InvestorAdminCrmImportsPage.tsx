import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp } from 'lucide-react';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';
import { commitLeads, findExisting } from '../../../../services/investor/crm/crmLeadService';
import { findSuppressed } from '../../../../services/investor/crm/crmSuppressionService';
import {
  autoMap, buildReviewRows, listImportBatches, parseLeadFile, recordImportBatch, type ParsedFile,
} from '../../../../services/investor/crm/crmImportService';
import {
  CONSENT_BASIS_LABELS, CRM_FIELD_LABELS,
  type ConsentBasis, type CrmField, type CrmImportBatch, type ReviewRow,
} from '../../../../services/investor/crm/crmTypes';
import {
  acceptGiLeads, declineGiLeads, listGiInbox, type GiInboundLead,
} from '../../../../services/investor/crm/crmGiInboxService';

// The import wizard. Four steps, and the whole point is step 3: nothing
// reaches Firestore until an admin has seen every row, every rejection
// reason, every duplicate and every suppression hit, and pressed Commit.
// AI-powered, human-led - the machine does the parsing, the person decides.

type Step = 1 | 2 | 3 | 4;
const FIELD_OPTIONS: (CrmField | '')[] = ['', 'firstName', 'lastName', 'fullName', 'company', 'phone', 'altPhone', 'email', 'country', 'notes', 'tag'];

export default function InvestorAdminCrmImportsPage() {
  const { user } = useInvestorAuth();
  const [batches, setBatches] = useState<CrmImportBatch[]>([]);
  const [tab, setTab] = useState<'files' | 'gi'>('files');
  const [giItems, setGiItems] = useState<GiInboundLead[]>([]);
  const [giSelected, setGiSelected] = useState<Set<string>>(new Set());
  const loadGi = () => listGiInbox('pending').then(setGiItems).catch(() => setGiItems([]));
  useEffect(() => { loadGi(); }, []);
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<ParsedFile[]>([]);
  const [mapping, setMapping] = useState<Record<string, CrmField | null>>({});
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [consentBasis, setConsentBasis] = useState<ConsentBasis | ''>('');
  const [busy, setBusy] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const loadBatches = () => listImportBatches().then(setBatches).catch(() => {});
  useEffect(() => { loadBatches(); }, []);

  const headers = useMemo(() => [...new Set(parsed.flatMap((p) => p.headers))], [parsed]);
  const allRawRows = useMemo(() => parsed.flatMap((p) => p.rows), [parsed]);

  // ---- step 1: files ----
  const onFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    try {
      const picked = [...list];
      const results: ParsedFile[] = [];
      for (const f of picked) results.push(await parseLeadFile(f));
      setFiles(picked);
      setParsed(results);
      setMapping(autoMap([...new Set(results.flatMap((r) => r.headers))]));
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read the file');
    } finally {
      setBusy(false);
    }
  };

  // ---- step 2 -> 3: build the review grid, check store + suppression ----
  const toReview = async () => {
    if (!Object.values(mapping).some((f) => f === 'phone' || f === 'email')) {
      toast.error('Map at least one column to Phone or Email — leads need a way to be contacted.');
      return;
    }
    setBusy(true);
    try {
      const built = buildReviewRows(allRawRows, mapping);
      const [existing, suppressed] = await Promise.all([
        findExisting(built.map((r) => r.phoneE164 ?? ''), built.map((r) => r.email ?? '')),
        findSuppressed(built.flatMap((r) => [r.phoneE164 ?? '', r.email ?? ''])),
      ]);
      for (const r of built) {
        if (r.phoneE164 && existing.has(r.phoneE164)) r.duplicateOfLeadId = existing.get(r.phoneE164);
        else if (r.email && existing.has(r.email)) r.duplicateOfLeadId = existing.get(r.email);
        if ((r.phoneE164 && suppressed.has(r.phoneE164)) || (r.email && suppressed.has(r.email))) {
          r.suppressed = true;
          r.include = false;
        }
        if (r.duplicateOfLeadId) r.include = false;
      }
      setRows(built);
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setBusy(false);
    }
  };

  // ---- step 3 -> 4: commit ----
  const eligible = rows.filter((r) => r.include && !r.suppressed && !r.duplicateOfLeadId && !r.duplicateInBatch && r.problems.length === 0);
  const commit = async () => {
    if (!consentBasis) { toast.error('Pick a consent basis for this batch — it is the answer to "why are we allowed to contact these people".'); return; }
    if (eligible.length === 0) { toast.error('No rows left to import'); return; }
    setBusy(true);
    try {
      const batchId = await recordImportBatch({
        files: files.map((f) => ({ name: f.name, size: f.size })),
        mapping,
        consentBasis,
        counts: {
          parsed: rows.length,
          kept: eligible.length,
          rejected: rows.filter((r) => r.problems.length > 0).length,
          deduped: rows.filter((r) => r.duplicateOfLeadId || r.duplicateInBatch).length,
          suppressed: rows.filter((r) => r.suppressed).length,
        },
        confirmedBy: user?.uid ?? '',
        confirmedByEmail: user?.email ?? '',
      }, files);
      const n = await commitLeads(eligible, { kind: 'file', batchId, file: files.map((f) => f.name).join(', ') }, consentBasis);
      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.import',
        `${n} leads imported from ${files.map((f) => f.name).join(', ')} (consent: ${consentBasis})`);
      setCommittedCount(n);
      setStep(4);
      loadBatches();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1); setFiles([]); setParsed([]); setMapping({}); setRows([]); setConsentBasis(''); setCommittedCount(0);
  };

  const rowClass = (r: ReviewRow) =>
    r.suppressed ? 'opacity-50 line-through' : r.problems.length > 0 ? 'opacity-70' : '';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="sg-page-title">CRM — Import Leads</h1>
        <p className="sg-page-sub mt-1">
          Step {step} of 4 — {step === 1 ? 'choose files' : step === 2 ? 'map columns' : step === 3 ? 'review every row before anything is saved' : 'done'}.
          Today: CSV / Excel / TSV. Word, PDF and scans arrive in phase 2. GI webhook batches will appear below as their own source.
        </p>
      </div>

      <div className="flex gap-2">
        <button className={tab === 'files' ? 'sg-btn-primary' : 'sg-btn-secondary'} onClick={() => setTab('files')}>
          File imports
        </button>
        <button className={tab === 'gi' ? 'sg-btn-primary' : 'sg-btn-secondary'} onClick={() => { setTab('gi'); loadGi(); }}>
          GI Inbox{giItems.length > 0 ? ` (${giItems.length})` : ''}
        </button>
      </div>

      {tab === 'gi' && (
        <div className="sg-panel p-4 space-y-3">
          <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>
            Curated investor-prospect leads pushed by Guma Intelligence. Same rule as every other
            intake: nothing enters the CRM until a person accepts it here. Suppressed and duplicate
            contacts were already refused at the door and reported back to GI.
          </p>
          {giItems.length === 0 ? (
            <p className="text-sm">Inbox is empty — pending GI batches will appear here.</p>
          ) : (
            <>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-sm">
                  {giItems.length} pending{giSelected.size > 0 ? ` · ${giSelected.size} selected` : ''} — actions apply to the selection, or to everything when nothing is selected.
                </span>
                <div className="ml-auto flex gap-2">
                  <button className="sg-btn-secondary" disabled={busy} onClick={async () => {
                    const items = giSelected.size > 0 ? giItems.filter((i) => giSelected.has(i.id)) : giItems;
                    const reason = window.prompt('Decline reason (goes in the record and can inform GI later):', 'not a fit');
                    if (reason === null) return;
                    setBusy(true);
                    try {
                      const n = await declineGiLeads(items, user?.email ?? '', reason || 'declined');
                      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.gi.decline', `${n} GI leads declined: ${reason}`);
                      toast.success(`${n} declined`);
                      setGiSelected(new Set()); loadGi();
                    } catch (e) { toast.error(e instanceof Error ? e.message : 'Decline failed'); }
                    finally { setBusy(false); }
                  }}>Decline</button>
                  <button className="sg-btn-primary" disabled={busy} onClick={async () => {
                    const items = giSelected.size > 0 ? giItems.filter((i) => giSelected.has(i.id)) : giItems;
                    setBusy(true);
                    try {
                      const r = await acceptGiLeads(items, user?.email ?? '');
                      await logAction(user?.uid ?? '', user?.email ?? '', 'crm.gi.accept',
                        `${r.accepted} GI leads accepted, ${r.duplicates} were already in the CRM`);
                      toast.success(`${r.accepted} accepted into the CRM${r.duplicates ? ` · ${r.duplicates} already existed` : ''}`);
                      setGiSelected(new Set()); loadGi();
                    } catch (e) { toast.error(e instanceof Error ? e.message : 'Accept failed'); }
                    finally { setBusy(false); }
                  }}>Accept into CRM</button>
                </div>
              </div>
              <div className="overflow-x-auto" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b" style={{ borderColor: 'var(--sg-border)' }}>
                      <th className="p-2"><input type="checkbox"
                        checked={giSelected.size > 0 && giItems.every((i) => giSelected.has(i.id))}
                        onChange={() => setGiSelected(giSelected.size === giItems.length ? new Set() : new Set(giItems.map((i) => i.id)))} /></th>
                      <th className="p-2">Mission</th><th className="p-2">Name</th><th className="p-2">Company</th>
                      <th className="p-2">Phone</th><th className="p-2">Email</th>
                      <th className="p-2">Consent</th><th className="p-2">Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giItems.map((i) => (
                      <tr key={i.id} className="border-b align-top" style={{ borderColor: 'var(--sg-border)' }}>
                        <td className="p-2"><input type="checkbox" checked={giSelected.has(i.id)}
                          onChange={() => setGiSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(i.id)) next.delete(i.id); else next.add(i.id);
                            return next;
                          })} /></td>
                        <td className="p-2 whitespace-nowrap">{i.mission}</td>
                        <td className="p-2">{`${i.lead.firstName} ${i.lead.lastName}`.trim() || '—'}</td>
                        <td className="p-2">{i.lead.company ?? '—'}</td>
                        <td className="p-2 whitespace-nowrap">{i.lead.phoneE164 ?? '—'}</td>
                        <td className="p-2">{i.lead.email ?? '—'}</td>
                        <td className="p-2">{CONSENT_BASIS_LABELS[i.lead.consentBasis]}<div className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>{i.lead.consentSource}</div></td>
                        <td className="p-2 text-xs" style={{ color: 'var(--sg-muted-2)', maxWidth: 260 }}>
                          {Object.entries(i.dossier).slice(0, 4).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'files' && step === 1 && (
        <label
          className="sg-panel p-10 flex flex-col items-center gap-3 cursor-pointer border-dashed"
          style={{ borderWidth: 2, ...(dragOver ? { borderColor: 'var(--sg-accent, #d4a944)', background: 'rgba(212,169,68,0.06)' } : {}) }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!busy) setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (!busy) setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            if (!busy) void onFiles(e.dataTransfer.files);
          }}
        >
          <FileUp size={32} />
          <span className="text-sm">{dragOver ? 'Release to add files' : 'Drop lead files here or click to choose (.csv, .xlsx, .xls, .tsv, .txt)'}</span>
          <input type="file" multiple hidden accept=".csv,.xlsx,.xls,.tsv,.txt"
            onChange={(e) => onFiles(e.target.files)} disabled={busy} />
        </label>
      )}

      {tab === 'files' && step === 2 && (
        <div className="sg-panel p-4 space-y-3">
          <p className="text-sm">
            {allRawRows.length} row(s) across {parsed.length} file(s). Column guesses below — correct anything wrong; unmapped columns are kept in the raw record but not used.
          </p>
          <table className="text-sm w-full max-w-2xl">
            <tbody>
              {headers.map((h) => (
                <tr key={h}>
                  <td className="p-1.5 pr-4 font-medium">{h}</td>
                  <td className="p-1.5">
                    <select className="sg-input" value={mapping[h] ?? ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [h]: (e.target.value || null) as CrmField | null }))}>
                      {FIELD_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f === '' ? '— ignore —' : CRM_FIELD_LABELS[f]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5 text-xs" style={{ color: 'var(--sg-muted-2)' }}>
                    e.g. {allRawRows.slice(0, 2).map((r) => r[h]).filter(Boolean).join(' · ') || '(empty)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button className="sg-btn-secondary inline-flex items-center gap-1.5" onClick={reset}><ArrowLeft size={16} /> Start over</button>
            <button className="sg-btn-primary inline-flex items-center gap-1.5" disabled={busy} onClick={toReview}>
              Validate & review <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {tab === 'files' && step === 3 && (
        <div className="space-y-3">
          <div className="sg-panel p-4 flex items-center gap-4 flex-wrap">
            <div className="text-sm">
              <b>{eligible.length}</b> will import · {rows.filter((r) => r.problems.length > 0).length} rejected ·{' '}
              {rows.filter((r) => r.duplicateOfLeadId || r.duplicateInBatch).length} duplicate ·{' '}
              {rows.filter((r) => r.suppressed).length} suppressed (do-not-contact)
            </div>
            <select className="sg-input w-64" value={consentBasis} onChange={(e) => setConsentBasis(e.target.value as ConsentBasis)}>
              <option value="">Consent basis for this batch — required</option>
              {Object.entries(CONSENT_BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-2 ml-auto">
              <button className="sg-btn-secondary inline-flex items-center gap-1.5" onClick={() => setStep(2)}><ArrowLeft size={16} /> Mapping</button>
              <button className="sg-btn-primary inline-flex items-center gap-1.5" disabled={busy || eligible.length === 0} onClick={commit}>
                <CheckCircle2 size={16} /> Commit {eligible.length} lead(s)
              </button>
            </div>
          </div>
          <div className="sg-panel overflow-x-auto" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: 'var(--sg-border)' }}>
                  <th className="p-2">In</th><th className="p-2">Name</th><th className="p-2">Company</th>
                  <th className="p-2">Phone (E.164)</th><th className="p-2">Email</th><th className="p-2">Why not</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.index} className={`border-b ${rowClass(r)}`} style={{ borderColor: 'var(--sg-border)' }}>
                    <td className="p-2">
                      <input type="checkbox" checked={r.include}
                        disabled={!!r.suppressed || !!r.duplicateOfLeadId || r.duplicateInBatch || r.problems.length > 0}
                        onChange={(e) => setRows((prev) => prev.map((x) => x.index === r.index ? { ...x, include: e.target.checked } : x))} />
                    </td>
                    <td className="p-2">{`${r.firstName} ${r.lastName}`.trim() || '—'}</td>
                    <td className="p-2">{r.company ?? '—'}</td>
                    <td className="p-2 whitespace-nowrap">{r.phoneE164 ?? '—'}</td>
                    <td className="p-2">{r.email ?? '—'}</td>
                    <td className="p-2 text-xs" style={{ color: 'var(--sg-muted-2)' }}>
                      {r.suppressed ? 'on the do-not-contact list'
                        : r.duplicateOfLeadId ? 'already in the CRM'
                        : r.duplicateInBatch ? 'duplicate within this file'
                        : r.problems.join('; ') || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'files' && step === 4 && (
        <div className="sg-panel p-6 space-y-3">
          <p className="text-sm"><b>{committedCount}</b> lead(s) imported. They are on the Leads page, ready to filter, export to Vicidial, or (phase 3) add to a campaign.</p>
          <button className="sg-btn-primary" onClick={reset}>Import more</button>
        </div>
      )}

      {tab === 'files' && (
      <div className="sg-panel p-4">
        <h2 className="font-semibold text-sm mb-2">Import history</h2>
        {batches.length === 0 ? <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>No batches yet.</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--sg-border)' }}>
                <th className="p-2">When</th><th className="p-2">Files</th><th className="p-2">Kept</th>
                <th className="p-2">Rejected</th><th className="p-2">Duplicates</th><th className="p-2">Suppressed</th>
                <th className="p-2">Consent</th><th className="p-2">By</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b" style={{ borderColor: 'var(--sg-border)' }}>
                  <td className="p-2 whitespace-nowrap">{b.createdAt?.toLocaleString() ?? '—'}</td>
                  <td className="p-2">{b.files.map((f) => f.name).join(', ')}</td>
                  <td className="p-2">{b.counts.kept}</td>
                  <td className="p-2">{b.counts.rejected}</td>
                  <td className="p-2">{b.counts.deduped}</td>
                  <td className="p-2">{b.counts.suppressed}</td>
                  <td className="p-2">{CONSENT_BASIS_LABELS[b.consentBasis]}</td>
                  <td className="p-2">{b.confirmedByEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}
    </div>
  );
}
