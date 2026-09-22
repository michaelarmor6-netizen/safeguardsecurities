type Landing = {
  tag: string;
  headline: string;
  subhead: string;
  bullets: { title: string; body: string }[];
  quote: string;
  formTitle: string;
  formBody: string;
  submitLabel: string;
  consentLabel: string;
};

export function renderCampaignLanding(opts: {
  slug: string;
  name: string;
  landing: Landing;
  riskDisclosure: string;
  captureUrl: string;
}): string {
  const { slug, name, landing, riskDisclosure, captureUrl } = opts;
  const cards = (landing.bullets || []).map((b) =>
    `<div class="card"><h3>${esc(b.title)}</h3><p>${esc(b.body)}</p></div>`).join('');
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} — SafeGuard Securities</title>
<style>
  :root { --navy:#0e2a3a; --teal:#2a9d8f; --teal-soft:#f1f8f7; --ink:#243037;
          --muted:#5d6a72; --line:#e2e7ea; --bg:#f6f8f9; }
  * { box-sizing:border-box; margin:0; }
  body { font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
         color:var(--ink); background:var(--bg); line-height:1.6; }
  .wrap { max-width:1040px; margin:0 auto; padding:0 24px; }
  header { background:var(--navy); color:#fff; }
  .nav { display:flex; align-items:center; justify-content:space-between; padding:18px 0; }
  .brand { font-weight:800; font-size:18px; }
  .hero { padding:64px 0 72px; }
  .tag { color:#7fc4bd; font-size:12px; letter-spacing:2.5px; font-weight:700; }
  h1 { font-size:clamp(30px,5vw,46px); line-height:1.15; margin:14px 0 16px; color:#fff; }
  .hero p { font-size:18px; max-width:640px; color:#c8d4da; }
  .hero-ctas { margin-top:28px; display:flex; gap:12px; flex-wrap:wrap; }
  .btn { display:inline-block; padding:14px 28px; border-radius:8px; font-weight:700;
         font-size:15px; text-decoration:none; }
  .btn-primary { background:var(--teal); color:#fff; }
  .btn-ghost { color:#fff; border:1px solid rgba(255,255,255,.4); }
  section { padding:56px 0; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:26px; }
  .card h3 { font-size:17px; margin-bottom:10px; color:var(--navy); }
  .card p { font-size:14.5px; color:var(--muted); }
  .quote { background:var(--teal-soft); border-left:4px solid var(--teal);
           border-radius:0 10px 10px 0; padding:24px 28px; font-size:17px;
           font-weight:600; color:var(--navy); max-width:760px; margin:0 auto; }
  .form-panel { background:#fff; border:1px solid var(--line); border-radius:12px;
                padding:36px; max-width:560px; margin:0 auto; }
  .form-panel h2 { color:var(--navy); font-size:24px; margin-bottom:8px; }
  label { display:block; font-size:13px; font-weight:600; margin:14px 0 5px; }
  input[type=text],input[type=email],input[type=tel] { width:100%; padding:11px 13px;
    border:1px solid var(--line); border-radius:7px; font-size:15px; }
  .consent { display:flex; gap:9px; align-items:flex-start; margin:16px 0 4px;
             font-size:13px; color:var(--muted); }
  .submit { width:100%; margin-top:16px; padding:14px; background:var(--teal); color:#fff;
            border:0; border-radius:8px; font-size:16px; font-weight:700; cursor:pointer; }
  .ok,.err { display:none; margin-top:14px; padding:12px 14px; border-radius:8px; font-size:14px; }
  .ok { background:var(--teal-soft); color:var(--navy); }
  .err { background:#fdecea; color:#8c2f28; }
  .hp { position:absolute; left:-6000px; top:-6000px; }
  footer { background:var(--navy); color:#9fb2bc; padding:36px 0 44px; font-size:12px; }
</style>
</head>
<body>
<header>
  <div class="wrap">
    <div class="nav"><div class="brand">SafeGuard Securities</div>
      <a class="btn btn-ghost" href="#register">Register</a></div>
    <div class="hero">
      <div class="tag">${esc(landing.tag || name)}</div>
      <h1>${esc(landing.headline)}</h1>
      <p>${esc(landing.subhead)}</p>
      <div class="hero-ctas">
        <a class="btn btn-primary" href="#register">${esc(landing.submitLabel || 'Get started')}</a>
      </div>
    </div>
  </div>
</header>
<section><div class="wrap cards">${cards}</div></section>
<section style="padding-top:0"><div class="wrap"><div class="quote">${esc(landing.quote)}</div></div></section>
<section id="register" style="padding-top:8px">
  <div class="wrap">
    <div class="form-panel">
      <h2>${esc(landing.formTitle)}</h2>
      <p style="color:var(--muted);font-size:14.5px;margin-bottom:22px;">${esc(landing.formBody)}</p>
      <form id="lead-form" novalidate>
        <label for="name">Full name</label>
        <input type="text" id="name" name="name" autocomplete="name" required maxlength="120">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" autocomplete="email" required maxlength="160">
        <label for="phone">Phone (optional)</label>
        <input type="tel" id="phone" name="phone" autocomplete="tel" maxlength="24">
        <div class="hp" aria-hidden="true"><label>Website</label>
          <input type="text" id="website" name="website" tabindex="-1" autocomplete="off"></div>
        <div class="consent">
          <input type="checkbox" id="consent" required>
          <span>${esc(landing.consentLabel)}</span>
        </div>
        <button class="submit" type="submit" id="submit-btn">${esc(landing.submitLabel)}</button>
        <div class="ok" id="ok-msg">Thank you — check your inbox for the first email.</div>
        <div class="err" id="err-msg"></div>
      </form>
    </div>
  </div>
</section>
<footer><div class="wrap"><p>${esc(riskDisclosure)}</p>
  <p>&copy; SafeGuard Securities</p></div></footer>
<script>
(function () {
  var t0 = Date.now();
  var form = document.getElementById('lead-form');
  var btn = document.getElementById('submit-btn');
  var ok = document.getElementById('ok-msg');
  var err = document.getElementById('err-msg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.style.display = 'none';
    var name = document.getElementById('name').value.trim();
    var email = document.getElementById('email').value.trim();
    if (!name || !email || !document.getElementById('consent').checked) {
      err.textContent = 'Please fill in your name and email, and tick the consent box.';
      err.style.display = 'block';
      return;
    }
    btn.disabled = true;
    fetch(${JSON.stringify(captureUrl)}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track: ${JSON.stringify(slug)},
        name: name, email: email,
        phone: document.getElementById('phone').value.trim(),
        website: document.getElementById('website').value,
        dwellMs: Date.now() - t0,
        page: location.href
      })
    }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        if (res.s === 200) { form.style.display = 'none'; ok.style.display = 'block'; }
        else { err.textContent = (res.j && res.j.error) || 'Something went wrong.'; err.style.display = 'block'; btn.disabled = false; }
      })
      .catch(function () {
        err.textContent = 'Could not reach the server.'; err.style.display = 'block'; btn.disabled = false;
      });
  });
})();
</script>
</body></html>`;
}

function esc(v: string): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
