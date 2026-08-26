# Webmail — Namecheap cPanel + Firebase (split setup)

## How your domain is split

| Service | Where | DNS examples |
|---------|--------|----------------|
| Website (www, app, apex) | **Firebase Hosting** | `www` → `safeguard-marketing.web.app`, `@` A → `199.36.158.100`, Firebase TXT |
| Email (info@, admin@, etc.) | **Namecheap cPanel** | MX + SPF with `web-hosting`, DKIM `default._domainkey` |

Firebase DNS records are **correct** for the website. They do **not** host your mailboxes.

## Fix webmail.safeguardsecurities.us (NXDOMAIN)

1. **Domain List** → **safeguardsecurities.us** → **Advanced DNS**.
2. **Add New Record** → **A Record**
   - **Host:** `webmail`
   - **Value:** `63.250.38.111` (cPanel server `premium313.web-hosting.com`)
   - **TTL:** Automatic
   - Do **not** use `199.36.158.100` (Firebase website)
4. Save. Propagation can take 15 minutes–48 hours.
5. Open **https://webmail.safeguardsecurities.us** (cPanel webmail on port 443).

## Sign in (correct URLs)

| Works | Does not work |
|-------|----------------|
| **https://webmail.safeguardsecurities.us** (after DNS + flushdns) | `https://premium313.web-hosting.com:2096` → often **401** |
| **https://premium313.web-hosting.com:2083** → cPanel → **Email Accounts** → **Check Email** | |

- **cPanel login** (:2083): Namecheap hosting username/password (from welcome email / hosting panel).
- **Webmail login**: full email (`info@safeguardsecurities.us`) + that mailbox’s password from cPanel → Email Accounts.

Firebase is unrelated to webmail 401 errors.

## Optional: redirect /webmail after DNS works

In `firebase.json` under `hosting.redirects`:

```json
{
  "source": "/webmail",
  "destination": "https://webmail.safeguardsecurities.us",
  "type": 302
}
```

Then: `firebase deploy --only hosting:marketing --project e-bank-dashboard`

## Do not delete

- Firebase CNAME/TXT (app, www, hosting-site, firebase=…)
- Firebase DKIM (firebase1/firebase2) if you use Firebase Auth email
- Namecheap MX / SPF / `default._domainkey` for cPanel mail
