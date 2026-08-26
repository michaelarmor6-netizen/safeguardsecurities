# mail.safeguardsecurities.us shows “Index of /” — fix

## Why

| Host | Purpose |
|------|---------|
| **webmail.safeguardsecurities.us** | Browser login (Roundcube / cPanel webmail) |
| **mail.safeguardsecurities.us** | Usually **email server hostname** (IMAP/SMTP), not a website |

Your SSL on `mail.` works, but the folder `/mail.safeguardsecurities.us` is empty (only `cgi-bin`), so LiteSpeed shows a **directory listing**.

## Fix A — cPanel redirect (recommended, 2 minutes)

1. cPanel → **Domains** → **Redirects** (or **Domain Redirects**).
2. **Type:** Permanent (301)
3. **https://mail.safeguardsecurities.us** → redirect to **https://webmail.safeguardsecurities.us**
4. Save.

Test: open **https://mail.safeguardsecurities.us** → should land on webmail login.

## Fix B — upload index.html (if redirects are awkward)

**Use ONLY the small redirect file** (~12 lines).  
**Do not** upload the main site `index.html` from the repo root — that shows an unstyled homepage and broken images on `mail.`.

1. cPanel → **File Manager**
2. Open folder **`mail.safeguardsecurities.us`**
3. **Delete** the large wrong `index.html` (if present)
4. **Upload** this file only:  
   `cpanel-upload/mail.safeguardsecurities.us/index.html`  
   (entire file should be ~400 bytes, title “Redirect to Webmail”)
5. Visit **https://mail.safeguardsecurities.us** — should jump to webmail login instantly

## Fix C — use the correct URL

Bookmark **https://webmail.safeguardsecurities.us** for browser mail.  
Keep **mail.safeguardsecurities.us** for phone **Mail** app server settings (IMAP/SMTP host), not the browser.

## After redirect

1. **Domains** → turn **Force HTTPS Redirect** **ON** for **mail** if you want HTTP→HTTPS on that host too.
2. Ensure **webmail** still has a valid certificate (Let’s Encrypt / AutoSSL).
