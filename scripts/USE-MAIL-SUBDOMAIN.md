# Using mail.safeguardsecurities.us (no webmail redirect)

## OK for now?

**Yes.** You have a valid SSL cert on **mail.safeguardsecurities.us** until Dec 2026.  
**webmail.safeguardsecurities.us** can wait until you issue a cert there later.

## URLs to use

| Use | URL |
|-----|-----|
| **Browser webmail (secure)** | **https://mail.safeguardsecurities.us:2096/** |
| **Phone Mail app (IMAP/SMTP host)** | **mail.safeguardsecurities.us** (ports 993 / 465 from cPanel Connect Devices) |
| **Marketing site shortcut** | https://safeguardsecurities.us/webmail → redirects to `:2096` |

Port **2096** is cPanel webmail over HTTPS with your **mail.** certificate.

## cPanel cleanup

1. **Redirects** — remove any redirect **mail → webmail** (if you added one).
2. **File Manager** → `mail.safeguardsecurities.us` — replace `index.html` with  
   `cpanel-upload/mail.safeguardsecurities.us/index.html` (links to `:2096`, not webmail host).
3. **Domains** → **mail** → **Force HTTPS** ON (port 443 landing page optional).

## Later (optional)

Issue Let’s Encrypt for **webmail.safeguardsecurities.us** if you want  
`https://webmail.safeguardsecurities.us` without `:2096`.

## Do not change

- Firebase DNS (`@`, `www`, `app`)
- **mail** / **webmail** A → `63.250.38.111`
