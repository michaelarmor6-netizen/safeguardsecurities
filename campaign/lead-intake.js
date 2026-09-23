(function (global) {
  var KEY = 'AIzaSyCbAQrQEyETkBw_1nMlDwEnkn4jqt1uPpo';
  var URL = 'https://firestore.googleapis.com/v1/projects/e-bank-dashboard/databases/(default)/documents/crmLeads?key=' + KEY;

  function captureLead(opts) {
    var website = String(opts.website || '');
    var dwellMs = Number(opts.dwellMs || 0);
    if (website || (dwellMs > 0 && dwellMs < 2500)) {
      return Promise.resolve({ ok: true });
    }
    var name = String(opts.name || '').trim().slice(0, 120);
    var email = String(opts.email || '').trim().toLowerCase().slice(0, 160);
    var track = String(opts.track || 'gold').slice(0, 40);
    var parts = name.split(/\s+/);
    var firstName = (parts[0] || '').slice(0, 80);
    var lastName = parts.slice(1).join(' ').slice(0, 80);
    var now = new Date().toISOString();
    var body = {
      fields: {
        firstName: { stringValue: firstName },
        lastName: { stringValue: lastName },
        company: { nullValue: null },
        phoneE164: { nullValue: null },
        email: { stringValue: email },
        country: { nullValue: null },
        tags: { arrayValue: { values: [{ stringValue: track + '-landing' }] } },
        status: { stringValue: 'new' },
        source: {
          mapValue: {
            fields: {
              kind: { stringValue: 'manual' },
              file: { stringValue: 'landing:' + track },
              page: { stringValue: String(opts.page || '').slice(0, 300) },
            },
          },
        },
        consentBasis: { stringValue: 'inquiry' },
        consentNote: { stringValue: 'self-submitted on landing page' },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    };
    return fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error('save-failed');
      return { ok: true };
    });
  }

  global.safeguardCaptureLead = captureLead;
})(window);
