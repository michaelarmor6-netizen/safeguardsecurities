const elements = {
  resendStatus: document.getElementById("resendStatus"),
  contactCount: document.getElementById("contactCount"),
  lastCampaign: document.getElementById("lastCampaign"),
  settingsForm: document.getElementById("settingsForm"),
  contactsTableBody: document.getElementById("contactsTableBody"),
  csvFileInput: document.getElementById("csvFileInput"),
  csvTextInput: document.getElementById("csvTextInput"),
  previewFrame: document.getElementById("previewFrame"),
  templateEditor: document.getElementById("templateEditor"),
  flashMessage: document.getElementById("flashMessage"),
  toast: document.getElementById("toast"),
  campaignHistory: document.getElementById("campaignHistory"),
  testRecipientInput: document.getElementById("testRecipientInput"),
  sendLimitInput: document.getElementById("sendLimitInput"),
  sendDelayInput: document.getElementById("sendDelayInput"),
  saveSettingsButton: document.getElementById("saveSettingsButton"),
  saveTemplateButton: document.getElementById("saveTemplateButton"),
  replaceContactsButton: document.getElementById("replaceContactsButton"),
  appendContactsButton: document.getElementById("appendContactsButton"),
  previewButtons: [document.getElementById("previewButton"), document.getElementById("previewButtonSecondary")],
  sendTestButtons: [document.getElementById("sendTestButton"), document.getElementById("sendTestButtonSecondary")],
  sendCampaignButtons: [document.getElementById("sendCampaignButton"), document.getElementById("sendCampaignButtonSecondary")],
};

let state = {
  settings: null,
  contacts: [],
  campaigns: [],
};

let toastTimer = null;

init().catch((error) => showFlash(error.message, "error"));

async function init() {
  bindEvents();
  await loadBootstrap();
  await refreshPreview();
}

function bindEvents() {
  elements.saveSettingsButton.addEventListener("click", saveSettings);
  elements.replaceContactsButton.addEventListener("click", () => importContacts("replace"));
  elements.appendContactsButton.addEventListener("click", () => importContacts("append"));
  elements.saveTemplateButton.addEventListener("click", saveTemplate);
  elements.csvFileInput.addEventListener("change", onCsvFileSelected);
  elements.previewButtons.forEach((button) => button.addEventListener("click", refreshPreview));
  elements.sendTestButtons.forEach((button) => button.addEventListener("click", sendTestEmail));
  elements.sendCampaignButtons.forEach((button) => button.addEventListener("click", sendCampaign));
}

async function loadBootstrap() {
  const response = await request("/api/bootstrap");
  state.settings = response.settings;
  state.contacts = response.contacts || [];
  state.campaigns = response.campaigns || [];

  populateSettingsForm(response.settings);
  renderContactsTable(state.contacts, response.contactCount);
  renderHistory(state.campaigns);
  await loadTemplateEditor();

  elements.resendStatus.textContent = response.resendConfigured ? "Configured" : "Missing API key";
  elements.contactCount.textContent = String(response.contactCount || 0);
  elements.lastCampaign.textContent = state.campaigns[0] ? `${state.campaigns[0].sent}/${state.campaigns[0].total} sent` : "None yet";
}

function populateSettingsForm(settings) {
  Object.entries(settings).forEach(([key, value]) => {
    const input = elements.settingsForm.elements.namedItem(key);
    if (input) {
      input.value = value;
    }
  });
}

function collectSettingsForm() {
  const formData = new FormData(elements.settingsForm);
  return Object.fromEntries(formData.entries());
}

async function saveSettings() {
  const payload = collectSettingsForm();
  const response = await request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  state.settings = response.settings;
  showFlash("Settings saved.", "success");
  await refreshPreview();
}

async function importContacts(mode) {
  const csvText = elements.csvTextInput.value.trim();
  if (!csvText) {
    showFlash("Paste CSV or choose a CSV file first.", "error");
    return;
  }

  try {
    const response = await request("/api/contacts/import", {
      method: "POST",
      body: JSON.stringify({ csvText, mode }),
    });

    state.contacts = response.contacts || [];
    elements.contactCount.textContent = String(response.count || 0);
    renderContactsTable(state.contacts, response.count);
    showFlash(`${response.count} contact(s) ${mode === "append" ? "loaded into the list" : "saved to the list"}.`, "success");
    await refreshPreview();
  } catch (err) {
    showFlash(err.message || "Import failed. Check your CSV format.", "error");
  }
}

async function refreshPreview() {
  const response = await request("/api/campaigns/preview", {
    method: "POST",
    body: JSON.stringify({}),
  });

  elements.previewFrame.srcdoc = response.html;
}

async function loadTemplateEditor() {
  const response = await request("/api/template");
  elements.templateEditor.value = response.html;
}

async function saveTemplate() {
  const html = elements.templateEditor.value.trim();
  if (!html) {
    showFlash("Template HTML cannot be empty.", "error");
    return;
  }

  await request("/api/template", {
    method: "PUT",
    body: JSON.stringify({ html }),
  });

  showFlash("Template saved.", "success");
  await refreshPreview();
}

async function sendTestEmail() {
  const to = elements.testRecipientInput.value.trim();
  if (!to) {
    showFlash("Enter a test recipient email first.", "error");
    return;
  }

  await saveSettingsSilently();

  const response = await request("/api/campaigns/test", {
    method: "POST",
    body: JSON.stringify({ to }),
  });

  showFlash(`Test email sent. Message id: ${response.result.id}`, "success");
}

async function sendCampaign() {
  await saveSettingsSilently();

  const limit = elements.sendLimitInput.value.trim();
  const delayMs = elements.sendDelayInput.value.trim();

  const confirmed = window.confirm("Send the current campaign to the selected contact set now?");
  if (!confirmed) return;

  const response = await request("/api/campaigns/send", {
    method: "POST",
    body: JSON.stringify({
      limit: limit ? Number(limit) : undefined,
      delayMs: delayMs ? Number(delayMs) : undefined,
    }),
  });

  showFlash(`Campaign finished. Sent: ${response.campaign.sent}. Failed: ${response.campaign.failed}.`, "success");
  state.campaigns.unshift(response.campaign);
  renderHistory(state.campaigns);
  elements.lastCampaign.textContent = `${response.campaign.sent}/${response.campaign.total} sent`;
}

async function saveSettingsSilently() {
  const payload = collectSettingsForm();
  const response = await request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  state.settings = response.settings;
}

function renderContactsTable(contacts, count) {
  const rows = (contacts || []).slice(0, 12).map((contact) => `
    <tr>
      <td>${escapeHtml(contact.email)}</td>
      <td>${escapeHtml(contact.first_name || "")}</td>
      <td>${escapeHtml(contact.advisor_name || state.settings?.defaultAdvisorName || "")}</td>
    </tr>
  `).join("");

  elements.contactsTableBody.innerHTML = rows || '<tr><td colspan="3">No contacts loaded yet.</td></tr>';
  elements.contactCount.textContent = String(count || contacts.length || 0);
}

function renderHistory(campaigns) {
  if (!campaigns.length) {
    elements.campaignHistory.innerHTML = '<div class="history-card"><strong>No campaigns sent yet</strong><p>Your first run will appear here with totals and status counts.</p></div>';
    return;
  }

  elements.campaignHistory.innerHTML = campaigns.map((campaign) => `
    <div class="history-card">
      <strong>${escapeHtml(campaign.subject)}</strong>
      <p>${new Date(campaign.createdAt).toLocaleString()}</p>
      <p>Total: ${campaign.total} | Sent: ${campaign.sent} | Failed: ${campaign.failed}</p>
    </div>
  `).join("");
}

function onCsvFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    elements.csvTextInput.value = String(reader.result || "");
  };
  reader.readAsText(file);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function showFlash(message, type) {
  elements.flashMessage.textContent = message;
  elements.flashMessage.className = `flash ${type}`;

  if (!elements.toast) return;

  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} visible`;

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    elements.toast.className = "toast hidden";
  }, 3200);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
