# SSL priority fix — webmail.safeguardsecurities.us

**Goal:** trusted HTTPS (padlock) on phone and PC. **~20–60 minutes** in cPanel. SiteLock can wait.

DNS is already correct (`webmail` + `mail` → `63.250.38.111`). Skip DNS unless you changed something.

---

## Step 1 — Manual Let’s Encrypt (try this first)

AutoSSL often fails on `www.mail.*`; manual issue for **webmail** is faster.

1. Log in: **https://premium313.web-hosting.com:2083**
2. Search cPanel for: **`Let's Encrypt`** or open **SSL/TLS** → **Manage SSL sites**
3. Select domain: **`webmail.safeguardsecurities.us`**
4. Click **Issue** / **Install** / **Run** (wording varies)
5. Wait until success message
6. Go to **SSL/TLS Status** → confirm **expiry date** for `webmail.safeguardsecurities.us` (not “No certificate available”)

If **Let’s Encrypt** is not in cPanel, use **Step 2** only.

---

## Step 2 — AutoSSL (only for webmail + mail)

1. **SSL/TLS Status**
2. Search **`webmail`** → tick **`webmail.safeguardsecurities.us`** only
3. Search **`mail`** → tick **`mail.safeguardsecurities.us`** only  
   **Do not** worry about **`www.mail.safeguardsecurities.us`** for now (optional host; often breaks batch).
4. **Run AutoSSL**
5. Wait **20 min** → refresh

---

## Step 3 — If still “No certificate available”

Click **`webmail.safeguardsecurities.us`** in the list and read the error:

| Message | Action |
|---------|--------|
| Does not point to this server | Wait 1–2 hr after DNS change; confirm A → `63.250.38.111` |
| DCV / HTTP validation failed | cPanel → **IP Blocker** / **ModSecurity** — ensure nothing blocks `/.well-known/acme-challenge/`; Namecheap support |
| DNS validation required | Add the **TXT** record cPanel shows in Namecheap Advanced DNS |
| Rate limit | Wait 1 hour, run **once** |

**Optional:** Namecheap Advanced DNS → add **A** `www.mail` → `63.250.38.111`, then Run AutoSSL again.

---

## Step 4 — Turn on HTTPS redirect

Only after Step 1 or 2 shows a **certificate date**:

1. cPanel → **Domains**
2. **`webmail.safeguardsecurities.us`** → **Force HTTPS Redirect** → **ON**

---

## Step 5 — Test

| Device | URL | Expect |
|--------|-----|--------|
| PC | https://webmail.safeguardsecurities.us | Padlock, Roundcube login |
| Phone | Same | No “connection is not private” |

If PC works but phone does not: phone **Settings → clear Safari/Chrome cache** or use private tab.

---

## Step 6 — Namecheap (if still failing after 2 hours)

Live chat script:

> I need a Let’s Encrypt certificate for **webmail.safeguardsecurities.us** on **premium313** (63.250.38.111). SSL/TLS Status shows “No certificate available.” DNS A records for webmail and mail point to this server. Main website is on Firebase; only need SSL for webmail and mail subdomains. Please run AutoSSL or install the cert.

---

## Ignore for SSL (normal)

- `safeguardsecurities.us` on cPanel — **no cert** while apex uses Firebase
- SiteLock SFTP setup — **not** required for webmail SSL
- Firebase console — **not** where webmail certs live

---

## Phone email while waiting

**Email Accounts** → **Connect Devices** — Mail app with SSL IMAP/SMTP works without webmail website SSL.
