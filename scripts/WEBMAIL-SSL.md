# Fix “No certificate available” (cPanel AutoSSL)

Firebase hosts the **website**. **SSL for webmail/mail** is only fixed in **Namecheap cPanel** on server `premium313` (`63.250.38.111`).

## 1. DNS must point mail hosts to cPanel

In **Namecheap → Advanced DNS**, confirm:

| Host | Type | Value |
|------|------|--------|
| `webmail` | A | `63.250.38.111` |
| `mail` | A | `63.250.38.111` |

Remove any **webmail** / **mail** CNAME to Firebase. Save and wait 15–60 minutes.

**Do not** change Firebase rows (`@` → `199.36.158.100`, `www` → `safeguard-marketing.web.app`, etc.).

> `safeguardsecurities.us` on cPanel will often stay **No certificate** while the live site uses Firebase — that is normal. You only need certs for **webmail** and **mail** subdomains.

## 2. Run AutoSSL

1. cPanel → **SSL/TLS Status**
2. Use search: type `webmail` or `mail`
3. Check boxes for:
   - `webmail.safeguardsecurities.us`
   - `mail.safeguardsecurities.us`
4. Click **Run AutoSSL** (top of page)
5. Wait 10–30 minutes → **Refresh**

Success = expiry date instead of “No certificate available”.

## 3. Read the failure reason (if still none)

On **SSL/TLS Status**, click the **domain name** or **View certificate** / log link. Common messages:

| Error | Fix |
|-------|-----|
| Domain does not point to this server | Fix A records (step 1) |
| HTTP DCV failed | Port 80 must reach cPanel; no Cloudflare proxy on `webmail`/`mail` |
| DNS DCV failed | Add TXT record AutoSSL shows (copy from log) |
| Rate limited | Wait 1 hour, run once again |

## 4. Manual Let’s Encrypt (if AutoSSL keeps failing)

1. cPanel → **Let’s Encrypt™ SSL** (or **SSL/TLS** → **Manage SSL sites**)
2. Choose **`webmail.safeguardsecurities.us`** → **Issue** / **Install**
3. Repeat for **`mail.safeguardsecurities.us`**

## 5. After certificate shows Active

1. cPanel → **Domains**
2. **webmail.safeguardsecurities.us** → turn **Force HTTPS Redirect** **ON**
3. Test phone: **https://webmail.safeguardsecurities.us**

## 6. Still stuck — Namecheap support

Open chat and say:

> Please enable AutoSSL / Let’s Encrypt for `webmail.safeguardsecurities.us` and `mail.safeguardsecurities.us` on hosting premium313 (IP 63.250.38.111). HTTP DCV fails or shows no certificate.

## Phone mail without waiting for webmail SSL

cPanel → **Email Accounts** → **Connect Devices** → add **Mail** app with IMAP **993** SSL and SMTP **465** SSL.
