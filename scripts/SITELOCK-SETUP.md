# SiteLock setup (Namecheap) — safeguardsecurities.us

## Will SiteLock fix webmail “Not secure”?

| Problem | Fix |
|---------|-----|
| **Webmail / mail SSL** (`webmail.safeguardsecurities.us`) | **cPanel → SSL/TLS Status → Run AutoSSL** (or Let’s Encrypt). SiteLock does **not** replace this. |
| **Malware / reputation scanning** | **SiteLock** (this setup) |
| **Main marketing site** | Hosted on **Firebase**, not cPanel files — SiteLock SFTP only sees **cPanel** folders |

Some SiteLock plans include extra SSL or a firewall; check your plan in the SiteLock dashboard. Even then, **webmail** certs are still issued on **cPanel** for `webmail` / `mail` hostnames.

---

## SiteLock: Configure Server Access (SFTP)

Use your **Namecheap hosting (cPanel)** credentials, not Firebase.

### Where to find them

1. Namecheap → **Hosting List** → **Manage** (premium313).
2. **Go to cPanel** → **General Information** or **FTP Accounts**.
3. Note:
   - **Username** (cPanel username, often like `sggwexxx`)
   - **Server / hostname:** `premium313.web-hosting.com`
   - **SFTP port:** often **21098** on Namecheap shared (not always 22). If 22 fails, use **21098**.

### Form values (SiteLock wizard)

| Field | Value |
|-------|--------|
| Credential type | **Same Credentials** |
| Connection type | **SFTP** |
| Host | `premium313.web-hosting.com` |
| Port | `21098` (try `22` only if 21098 fails) |
| Username | Your **cPanel username** (from hosting panel) |
| Password | Your **cPanel password** (hosting login, not email mailbox) |
| Transfer speed | Normal (default) |
| Max download time | 30 min/day (default) |

Click **Save and Continue**.

### If connection fails

- Confirm password by logging into **https://premium313.web-hosting.com:2083** (cPanel).
- In cPanel → **FTP Accounts** → use the main account or create an FTP user with **full home directory** access.
- Namecheap chat: “SFTP port and hostname for premium313.”

---

## SiteLock: Database step

Your public site on **Firebase** has **no cPanel MySQL** for that copy.

- If SiteLock **requires** a database: use cPanel → **MySQL Databases** only if you have WordPress/apps **on the server** (e.g. under `sggwebs.com`).
- If optional: **skip** or mark N/A — Firebase hosting does not use this database.

---

## What SiteLock can scan in your setup

On the server you likely have folders such as:

- `sggwebs.com` / `public_html` (main cPanel domain)
- `safeguardsecurities.us`, `webmail.safeguardsecurities.us`, `mail.safeguardsecurities.us` (addon domains)

SiteLock **cannot** scan files deployed only on **Firebase Hosting** (GitHub/repo deploy). It scans **disk** on premium313.

---

## Still fix webmail SSL (parallel task)

1. Namecheap DNS: **A** `webmail` and **mail` → `63.250.38.111` ✓
2. cPanel → **SSL/TLS Status** → check `webmail.safeguardsecurities.us` → **Run AutoSSL**
3. **Domains** → **Force HTTPS** ON for webmail after cert shows a date

See `scripts/WEBMAIL-SSL.md`.

---

## SiteLock support

SiteLock panel → **Help** / **Submit Ticket** — ask whether your plan includes **SSL for subdomains** and how that interacts with **Firebase** for the main site.
