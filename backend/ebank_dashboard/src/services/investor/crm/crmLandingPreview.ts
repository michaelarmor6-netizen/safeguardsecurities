import type { CrmInstrument } from './crmInstrumentTypes';

function esc(v: string): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderInstrumentLandingPreview(instrument: CrmInstrument): string {
  const { name, landing, riskDisclosure } = instrument;
  const cards = (landing.bullets || []).map((b) =>
    `<div class="card"><h3>${esc(b.title)}</h3><p>${esc(b.body)}</p></div>`).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<style>
  :root { --navy:#0e2a3a; --teal:#2a9d8f; --teal-soft:#f1f8f7; --ink:#243037;
          --muted:#5d6a72; --line:#e2e7ea; --bg:#f6f8f9; }
  * { box-sizing:border-box; margin:0; }
  body { font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
         color:var(--ink); background:var(--bg); line-height:1.6; }
  .wrap { max-width:1040px; margin:0 auto; padding:0 24px; }
  header { background:var(--navy); color:#fff; }
  .nav { padding:18px 0; font-weight:800; }
  .hero { padding:48px 0 56px; }
  .tag { color:#7fc4bd; font-size:12px; letter-spacing:2.5px; font-weight:700; }
  h1 { font-size:clamp(26px,4vw,40px); line-height:1.15; margin:14px 0 16px; }
  .hero p { font-size:17px; max-width:640px; color:#c8d4da; }
  section { padding:40px 0; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:22px; }
  .card h3 { font-size:16px; margin-bottom:8px; color:var(--navy); }
  .card p { font-size:14px; color:var(--muted); }
  .quote { background:var(--teal-soft); border-left:4px solid var(--teal);
           border-radius:0 10px 10px 0; padding:20px 24px; font-weight:600; color:var(--navy); }
  .form-panel { background:#fff; border:1px solid var(--line); border-radius:12px; padding:28px; max-width:560px; margin:0 auto; }
  footer { background:var(--navy); color:#9fb2bc; padding:28px 0; font-size:12px; }
</style></head><body>
<header><div class="wrap"><div class="nav">SafeGuard Securities</div>
<div class="hero"><div class="tag">${esc(landing.tag || name)}</div>
<h1>${esc(landing.headline)}</h1><p>${esc(landing.subhead)}</p></div></div></header>
<section><div class="wrap cards">${cards}</div></section>
<section style="padding-top:0"><div class="wrap"><div class="quote">${esc(landing.quote)}</div></div></section>
<section><div class="wrap"><div class="form-panel">
<h2 style="color:#0e2a3a;margin-bottom:8px">${esc(landing.formTitle)}</h2>
<p style="color:#5d6a72;font-size:14px">${esc(landing.formBody)}</p>
<p style="margin-top:16px;font-size:13px;color:#5d6a72">${esc(landing.consentLabel)}</p>
<p style="margin-top:12px;font-weight:700;color:#2a9d8f">${esc(landing.submitLabel)}</p>
</div></div></section>
<footer><div class="wrap"><p>${esc(riskDisclosure)}</p></div></footer>
</body></html>`;
}
