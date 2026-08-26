const express = require("express");
const fs = require("fs/promises");
const path = require("path");

loadEnv();

const app = express();
const PORT = Number(process.env.PORT || 8787);

const APP_DIR = __dirname;
const ROOT_DIR = path.resolve(APP_DIR, "..");
const PUBLIC_DIR = path.join(APP_DIR, "public");
const DATA_DIR = path.join(APP_DIR, "data");

const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");

const LEGACY_CONTACTS_FILE = path.join(ROOT_DIR, "recipients.csv");
const LEGACY_COMPANY_FILE = path.join(ROOT_DIR, "company-details.json");
const LEGACY_TEMPLATE_FILE = path.join(ROOT_DIR, "email-template.html");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(PUBLIC_DIR));

app.get("/api/bootstrap", async (req, res) => {
  try {
    await ensureDataFiles();
    const settings = await readJson(SETTINGS_FILE);
    const contacts = await readJson(CONTACTS_FILE);
    const campaigns = await readJson(CAMPAIGNS_FILE);

    res.json({
      ok: true,
      settings,
      contactCount: contacts.length,
      contacts: contacts.slice(0, 50),
      campaigns: campaigns.slice(-10).reverse(),
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    await ensureDataFiles();
    res.json({ ok: true, settings: await readJson(SETTINGS_FILE) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    await ensureDataFiles();
    const next = normalizeSettings(req.body || {});
    await writeJson(SETTINGS_FILE, next);
    res.json({ ok: true, settings: next });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.get("/api/contacts", async (req, res) => {
  try {
    await ensureDataFiles();
    const contacts = await readJson(CONTACTS_FILE);
    res.json({ ok: true, contacts, count: contacts.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/contacts/import", async (req, res) => {
  try {
    await ensureDataFiles();
    const csvText = String(req.body.csvText || "");
    const mode = req.body.mode === "append" ? "append" : "replace";
    const imported = normalizeContacts(parseCsv(csvText));

    if (!imported.length) {
      res.status(400).json({ ok: false, error: "No valid contacts found in CSV." });
      return;
    }

    const existing = await readJson(CONTACTS_FILE);
    const merged = mode === "append"
      ? dedupeContacts(existing.concat(imported))
      : dedupeContacts(imported);

    await writeJson(CONTACTS_FILE, merged);
    res.json({ ok: true, count: merged.length, contacts: merged.slice(0, 50) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/campaigns/preview", async (req, res) => {
  try {
    await ensureDataFiles();
    const settings = await readJson(SETTINGS_FILE);
    const contacts = await readJson(CONTACTS_FILE);
    const template = await readTemplate();
    const contact = req.body.contact || contacts[0] || {};
    const html = renderTemplate(template, settings, contact);
    res.json({ ok: true, html });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/template", async (req, res) => {
  try {
    await ensureDataFiles();
    const html = await readTemplate();
    res.json({ ok: true, html });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.put("/api/template", async (req, res) => {
  try {
    const html = String(req.body.html || "").trim();
    if (!html) {
      res.status(400).json({ ok: false, error: "Template HTML is required." });
      return;
    }

    await fs.writeFile(LEGACY_TEMPLATE_FILE, `${html}\n`, "utf8");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/campaigns/test", async (req, res) => {
  try {
    await ensureDataFiles();
    requireResend();

    const to = String(req.body.to || "").trim();
    if (!to) {
      res.status(400).json({ ok: false, error: "Test recipient email is required." });
      return;
    }

    const settings = await readJson(SETTINGS_FILE);
    const contacts = await readJson(CONTACTS_FILE);
    const template = await readTemplate();
    const fallbackContact = contacts[0] || { email: to, first_name: "Valued Client", advisor_name: settings.defaultAdvisorName };
    const testContact = {
      email: to,
      first_name: req.body.firstName || fallbackContact.first_name,
      advisor_name: req.body.advisorName || fallbackContact.advisor_name,
    };

    const html = renderTemplate(template, settings, testContact);
    const response = await sendEmail({
      from: formatFrom(settings.fromName, settings.fromEmail),
      to,
      reply_to: settings.replyTo,
      subject: settings.defaultSubject,
      html,
    });

    res.json({ ok: true, result: response });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/campaigns/send", async (req, res) => {
  try {
    await ensureDataFiles();
    requireResend();

    const settings = await readJson(SETTINGS_FILE);
    const contacts = await readJson(CONTACTS_FILE);
    const template = await readTemplate();

    if (!contacts.length) {
      res.status(400).json({ ok: false, error: "No contacts available to send." });
      return;
    }

    const limit = Math.max(1, Number(req.body.limit || contacts.length));
    const delayMs = Math.max(0, Number(req.body.delayMs || settings.sendDelayMs || 750));
    const selectedContacts = contacts.slice(0, limit);
    const results = [];

    for (const contact of selectedContacts) {
      const html = renderTemplate(template, settings, contact);

      try {
        const apiResponse = await sendEmail({
          from: formatFrom(settings.fromName, settings.fromEmail),
          to: contact.email,
          reply_to: settings.replyTo,
          subject: settings.defaultSubject,
          html,
        });

        results.push({
          email: contact.email,
          first_name: contact.first_name || "",
          advisor_name: contact.advisor_name || settings.defaultAdvisorName,
          status: "sent",
          messageId: apiResponse.id,
        });
      } catch (error) {
        results.push({
          email: contact.email,
          first_name: contact.first_name || "",
          advisor_name: contact.advisor_name || settings.defaultAdvisorName,
          status: "failed",
          error: error.message,
        });
      }

      if (delayMs > 0) {
        await wait(delayMs);
      }
    }

    const campaigns = await readJson(CAMPAIGNS_FILE);
    const record = {
      id: `cmp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      subject: settings.defaultSubject,
      total: selectedContacts.length,
      sent: results.filter((item) => item.status === "sent").length,
      failed: results.filter((item) => item.status === "failed").length,
      results,
    };

    campaigns.push(record);
    await writeJson(CAMPAIGNS_FILE, campaigns);

    res.json({ ok: true, campaign: record });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/campaigns/history", async (req, res) => {
  try {
    await ensureDataFiles();
    const campaigns = await readJson(CAMPAIGNS_FILE);
    res.json({ ok: true, campaigns: campaigns.slice().reverse() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, async () => {
  await ensureDataFiles();
  console.log(`Campaign admin running on http://localhost:${PORT}`);
});

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  require("fs").existsSync(envPath) && require("fs").readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  if (!(await exists(SETTINGS_FILE))) {
    await writeJson(SETTINGS_FILE, await buildInitialSettings());
  }

  if (!(await exists(CONTACTS_FILE))) {
    await writeJson(CONTACTS_FILE, await buildInitialContacts());
  }

  if (!(await exists(CAMPAIGNS_FILE))) {
    await writeJson(CAMPAIGNS_FILE, []);
  }
}

async function buildInitialSettings() {
  const fallback = {
    fromName: "Safeguard Securities",
    fromEmail: "info@safeguardsecurities.us",
    replyTo: "info@safeguardsecurities.us",
    defaultSubject: "Gold Outlook: Institutional Forecast Through 2027",
    companyName: "Safeguard Securities",
    companyAddress: "6060 Parkland Blvd, Mayfield Heights, OH 44124",
    companyPhone: "+1 (216) 250-7891",
    companyWebsiteUrl: "https://safeguardsecurities.us",
    companyWebsiteText: "safeguardsecurities.us",
    defaultAdvisorName: "Safeguard Advisory Team",
    unsubscribeUrl: "https://safeguardsecurities.us",
    sendDelayMs: 750,
  };

  if (!(await exists(LEGACY_COMPANY_FILE))) {
    return fallback;
  }

  try {
    const company = JSON.parse(await fs.readFile(LEGACY_COMPANY_FILE, "utf8"));
    return normalizeSettings({
      ...fallback,
      companyName: company.name || fallback.companyName,
      companyAddress: company.address || fallback.companyAddress,
      companyPhone: company.phone || fallback.companyPhone,
      companyWebsiteUrl: company.website_url || fallback.companyWebsiteUrl,
      companyWebsiteText: company.website_text || fallback.companyWebsiteText,
      defaultAdvisorName: company.default_advisor_name || fallback.defaultAdvisorName,
    });
  } catch {
    return fallback;
  }
}

async function buildInitialContacts() {
  if (!(await exists(LEGACY_CONTACTS_FILE))) {
    return [];
  }

  const csvText = await fs.readFile(LEGACY_CONTACTS_FILE, "utf8");
  return normalizeContacts(parseCsv(csvText));
}

function normalizeSettings(input) {
  const value = input || {};
  return {
    fromName: requiredString(value.fromName || value.companyName || "Safeguard Securities", "fromName"),
    fromEmail: requiredString(value.fromEmail || "info@safeguardsecurities.us", "fromEmail"),
    replyTo: requiredString(value.replyTo || value.fromEmail || "info@safeguardsecurities.us", "replyTo"),
    defaultSubject: requiredString(value.defaultSubject || "Gold Outlook: Institutional Forecast Through 2027", "defaultSubject"),
    companyName: requiredString(value.companyName || value.name || "Safeguard Securities", "companyName"),
    companyAddress: requiredString(value.companyAddress || value.address || "", "companyAddress"),
    companyPhone: requiredString(value.companyPhone || value.phone || "", "companyPhone"),
    companyWebsiteUrl: requiredString(value.companyWebsiteUrl || value.website_url || "https://safeguardsecurities.us", "companyWebsiteUrl"),
    companyWebsiteText: requiredString(value.companyWebsiteText || value.website_text || "safeguardsecurities.us", "companyWebsiteText"),
    defaultAdvisorName: requiredString(value.defaultAdvisorName || value.default_advisor_name || "Safeguard Advisory Team", "defaultAdvisorName"),
    unsubscribeUrl: requiredString(value.unsubscribeUrl || "https://safeguardsecurities.us", "unsubscribeUrl"),
    sendDelayMs: Math.max(0, Number(value.sendDelayMs || 750)),
  };
}

function normalizeContacts(rows) {
  return dedupeContacts(
    rows
      .map((row) => ({
        email: String(row.email || "").trim(),
        first_name: String(row.first_name || row.firstName || "Valued Client").trim() || "Valued Client",
        advisor_name: String(row.advisor_name || row.advisorName || "").trim(),
      }))
      .filter((row) => row.email)
  );
}

function dedupeContacts(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((item) => item.trim());

  // Auto-detect header-less CSV: if first column of first line looks like an email, prepend standard headers
  const firstCols = headers.map((h) => h.toLowerCase());
  const hasHeader = firstCols[0] === "email" || firstCols[0] === "e-mail";
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const resolvedHeaders = hasHeader ? headers : ["email", "first_name", "advisor_name"];

  return dataLines.map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    resolvedHeaders.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return row;
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

async function readTemplate() {
  if (!(await exists(LEGACY_TEMPLATE_FILE))) {
    throw new Error("Root email-template.html was not found.");
  }
  return fs.readFile(LEGACY_TEMPLATE_FILE, "utf8");
}

function renderTemplate(template, settings, contact) {
  const map = {
    first_name: contact.first_name || "Valued Client",
    advisor_name: contact.advisor_name || settings.defaultAdvisorName,
    company_name: settings.companyName,
    company_address: settings.companyAddress,
    company_phone: settings.companyPhone,
    company_website_url: settings.companyWebsiteUrl,
    company_website_text: settings.companyWebsiteText,
    unsubscribe_url: settings.unsubscribeUrl,
  };

  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(map, key) ? String(map[key] ?? "") : match;
  });
}

async function sendEmail(payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    throw new Error(parsed.message || `Resend request failed with status ${response.status}`);
  }

  return parsed;
}

function formatFrom(name, email) {
  return `${name} <${email}>`;
}

function requireResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing. Add it to campaign-admin/.env first.");
  }
}

function requiredString(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
