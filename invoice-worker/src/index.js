/**
 * Sends official invoices via Resend. Called from the finance desk with a
 * Firebase ID token — no Resend key in the browser, no Firebase Blaze needed.
 *
 * POST /  { invoiceId }  Authorization: Bearer <idToken>
 */

const FINANCE_ROLES = new Set(['finance', 'admin', 'super_admin']);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(env, origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method === 'GET') {
      return json({ ok: true, service: 'safeguard-invoice-mail' }, 200, cors);
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    try {
      const apiKey = (env.RESEND_API_KEY || '').trim();
      if (!apiKey) return json({ error: 'Mail is not configured (RESEND_API_KEY)' }, 503, cors);

      const token = bearer(request);
      if (!token) return json({ error: 'Sign in required' }, 401, cors);

      const account = await lookupAccount(env, token);
      if (!account?.localId) return json({ error: 'Invalid session' }, 401, cors);

      const role = await readRole(env, token, account.localId);
      if (!FINANCE_ROLES.has(role)) return json({ error: 'Finance desk only' }, 403, cors);

      const body = await request.json().catch(() => ({}));
      const invoiceId = String(body.invoiceId || '').trim();
      if (!invoiceId) return json({ error: 'invoiceId is required' }, 400, cors);

      const raw = await firestoreGet(env, token, `invoices/${invoiceId}`);
      if (!raw) return json({ error: 'Invoice not found' }, 404, cors);
      const invoice = decodeDoc(raw);
      if (invoice.status === 'void') return json({ error: 'Invoice is void' }, 400, cors);

      const to = String(invoice.billToEmail || '').trim();
      if (!to.includes('@')) return json({ error: 'No bill-to email on the invoice' }, 400, cors);

      const [detailsDoc, settingsDoc] = await Promise.all([
        firestoreGet(env, token, 'platformSettings/fundingDetails'),
        firestoreGet(env, token, 'platformSettings/global'),
      ]);
      const details = detailsDoc ? decodeDoc(detailsDoc) : {};
      const platformName = String(settingsDoc ? decodeDoc(settingsDoc).platformName : '') || 'SafeGuard Securities';

      const { html, text, subject, amountFmt } = buildMail({
        invoice,
        invoiceId,
        details,
        platformName,
        appUrl: env.PUBLIC_APP_URL || 'https://app.safeguardsecurities.us',
      });

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.MAIL_FROM || 'SafeGuard Securities <finance@safeguardsecurities.us>',
          to: [to],
          subject,
          text,
          html,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.text()).slice(0, 300);
        await stampInvoice(env, token, invoiceId, {
          emailError: `Resend ${res.status}: ${errBody}`,
        });
        return json({ error: `Resend ${res.status}` }, 502, cors);
      }

      await stampInvoice(env, token, invoiceId, {
        emailSentAt: new Date().toISOString(),
        status: 'sent',
        clearError: true,
      });
      return json({ ok: true, to, amount: amountFmt }, 200, cors);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Send failed' }, 500, cors);
    }
  },
};

function corsHeaders(env, origin) {
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allow = allowed.includes(origin) ? origin : allowed[0] || 'https://app.safeguardsecurities.us';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function bearer(request) {
  const h = request.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

async function lookupAccount(env, idToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data.users) ? data.users[0] : null;
}

function firestoreUrl(env, path) {
  const project = env.FIREBASE_PROJECT_ID || 'e-bank-dashboard';
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}`;
}

async function firestoreGet(env, token, path) {
  const res = await fetch(firestoreUrl(env, path), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed (${res.status})`);
  return res.json();
}

async function readRole(env, token, uid) {
  const doc = await firestoreGet(env, token, `profiles/${uid}`);
  if (!doc) return '';
  return String(decodeDoc(doc).role || '');
}

async function stampInvoice(env, token, invoiceId, fields) {
  const payload = {
    fields: {
      updatedAt: { timestampValue: new Date().toISOString() },
      status: { stringValue: fields.status || 'sent' },
    },
  };
  const masks = ['updatedAt', 'status'];
  if (fields.emailSentAt) {
    payload.fields.emailSentAt = { timestampValue: fields.emailSentAt };
    masks.push('emailSentAt');
  }
  if (fields.clearError) {
    payload.fields.emailError = { nullValue: null };
    masks.push('emailError');
  } else if (fields.emailError) {
    payload.fields.emailError = { stringValue: String(fields.emailError).slice(0, 300) };
    payload.fields.status = { stringValue: 'issued' };
    masks.push('emailError');
  }
  const qs = masks.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');
  const res = await fetch(`${firestoreUrl(env, `invoices/${invoiceId}`)}?${qs}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Could not update invoice (${res.status})`);
}

function decodeValue(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return decodeDoc({ fields: v.mapValue.fields || {} });
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  return undefined;
}

function decodeDoc(doc) {
  const out = {};
  const fields = doc.fields || {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function money(n, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(n) || 0);
}

function buildMail({ invoice, invoiceId, details, platformName, appUrl }) {
  const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  const taxRate = Number(invoice.taxRate || 0);
  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  const tax = subtotal * taxRate / 100;
  const currency = invoice.currency || 'USD';
  const number = invoice.number || invoiceId;
  const amountFmt = money(subtotal + tax, currency);
  const issued = invoice.issuedAt ? String(invoice.issuedAt).replace('T', ' ').replace('Z', ' UTC') : '';
  const logoUrl = `${appUrl}/logo-email.png`;
  const portalUrl = `${appUrl}/invoice/${invoiceId}`;
  const name = invoice.billToName || invoice.billToEmail;

  const itemRows = items
    .map((i) => {
      const amt = Number(i.quantity || 0) * Number(i.unitPrice || 0);
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #dddddd;color:#003d82;font-size:14px;">${esc(i.description)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #dddddd;color:#003d82;font-size:14px;text-align:right;">${esc(i.quantity)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #dddddd;color:#003d82;font-size:14px;text-align:right;">${esc(money(amt, currency))}</td>
      </tr>`;
    })
    .join('');

  let pay = '';
  if (invoice.includePaymentInstructions === true && details.bankEnabled === true) {
    const reasonBase = String(details.paymentReason || '').trim();
    const reason = reasonBase ? `${reasonBase} — ${number}` : number;
    const rows = [
      ['Bank name', details.bankName],
      ['Bank address', details.bankAddress],
      ['Bank ID / SWIFT code', details.bankSwift],
      ['Beneficiary account', details.bankAccountName],
      ['Beneficiary account no.', details.bankAccountNumber],
      ['Beneficiary address', details.beneficiaryAddress],
      ['Routing / IBAN', details.bankRoutingOrIban],
      ['Reason for payment', reason],
    ].filter(([, v]) => v);
    pay = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;border:1px solid #dddddd;margin:24px 0;"><tr><td style="padding:18px;">
      <div style="font-size:13px;font-weight:700;color:#003d82;text-transform:uppercase;">Payment instructions</div>
      <table width="100%">${rows
        .map(
          ([l, v]) =>
            `<tr><td style="padding:6px 12px 6px 0;color:#003d82;font-weight:700;font-size:13px;">${esc(l)}</td><td style="padding:6px 0;font-family:'Courier New',monospace;font-size:13px;color:#003d82;">${esc(v)}</td></tr>`,
        )
        .join('')}</table></td></tr></table>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#f5f5f5;">
<table width="100%"><tr><td align="center" style="padding:20px 10px;">
<table width="600" style="max-width:600px;width:100%;background:#fff;font-family:Arial,Helvetica,sans-serif;">
  <tr><td style="padding:26px 30px;border-bottom:1px solid #e5e7eb;">
    <img src="${esc(logoUrl)}" alt="${esc(platformName)}" height="56" style="height:56px;width:auto;max-width:280px;border:0;" />
  </td></tr>
  <tr><td style="padding:36px 30px;color:#003d82;">
    <div style="font-size:18px;font-weight:600;">Invoice ${esc(number)}</div>
    <p style="font-size:14px;line-height:1.7;">Hello ${esc(name)}, please find your official ${esc(platformName)} invoice.</p>
    <p style="font-size:13px;color:#5b6472;">Issued: ${esc(issued)}</p>
    <table width="100%">${itemRows}
      <tr><td colspan="2" style="padding-top:12px;text-align:right;color:#5b6472;">Subtotal</td><td style="padding-top:12px;text-align:right;font-weight:600;">${esc(money(subtotal, currency))}</td></tr>
      ${taxRate > 0 ? `<tr><td colspan="2" style="padding-top:4px;text-align:right;color:#5b6472;">${esc(invoice.taxLabel || 'Tax')} (${esc(taxRate)}%)</td><td style="padding-top:4px;text-align:right;">${esc(money(tax, currency))}</td></tr>` : ''}
      <tr><td colspan="2" style="padding-top:8px;text-align:right;font-weight:700;">Total due</td><td style="padding-top:8px;text-align:right;font-size:20px;font-weight:800;">${esc(amountFmt)}</td></tr>
    </table>
    ${pay}
    ${invoice.notes ? `<p style="font-size:13px;white-space:pre-wrap;">${esc(invoice.notes)}</p>` : ''}
    <div style="text-align:center;padding:20px 0 8px;">
      <a href="${esc(portalUrl)}" style="display:inline-block;background:#003d82;color:#fff;padding:12px 32px;text-decoration:none;border-radius:4px;font-weight:600;">View invoice in portal</a>
    </div>
  </td></tr>
  <tr><td align="center" style="background:#f0f0f0;padding:24px;font-size:11px;color:#666;">
    <img src="${esc(logoUrl)}" alt="" height="32" /><br/>
    ${esc(platformName)} · Confidential invoice · Electronically issued
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Invoice ${number}`,
    `Issued: ${issued}`,
    `Amount due: ${amountFmt}`,
    '',
    `Billed to: ${name}`,
    ...items.map((i) => `  ${i.description}  ${i.quantity} × ${money(i.unitPrice, currency)}`),
    '',
    platformName,
  ].join('\n');

  return {
    html,
    text,
    subject: `${platformName} — Invoice ${number}`,
    amountFmt,
  };
}
