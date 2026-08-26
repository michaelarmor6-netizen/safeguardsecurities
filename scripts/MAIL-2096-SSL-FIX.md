# “Not secure” on mail.safeguardsecurities.us:2096

You have a valid cert for **mail.safeguardsecurities.us** on the website (port **443**).  
**Webmail uses port 2096** — that service needs the **same certificate installed for mail services**.

Incognito still shows “Not secure” because **2096** is not using the trusted cert yet.

---

## Fix 1 — Install cert on mail services (try first)

1. cPanel → **SSL/TLS Status**
2. Find **mail.safeguardsecurities.us** (green, expires Dec 2026)
3. Click **View Certificate** (or the domain name)
4. Look for a button such as:
   - **Install on mail/exim/dovecot servers**
   - **Install Certificate on Mail Services**
   - **Proceed to install the certificate on mail servers**
5. Click it and wait for success

Then test again: **https://mail.safeguardsecurities.us:2096/** (incognito).

---

## Fix 2 — SSL/TLS → Manage SSL Sites

1. **SSL/TLS** → **Manage SSL Sites**
2. Select **mail.safeguardsecurities.us**
3. If you see **Install Certificate for mail services** or checkboxes for **Exim / Dovecot / Webmail**, enable them → **Install**

---

## Fix 3 — Try webmail on port 443 (same cert as mail)

Your cert already works on **443**. Try in incognito:

- **https://mail.safeguardsecurities.us/webmail**
- **https://mail.safeguardsecurities.us/cpsess…** (only if cPanel gives you that link)

If one of these shows a **padlock** and Roundcube login, bookmark that URL instead of `:2096`.

To avoid “Index of /” on **https://mail.safeguardsecurities.us**, keep the small `index.html` that links to webmail path or `:2096` after Fix 1.

---

## Fix 4 — Issue cert for webmail (long-term)

**Let’s Encrypt** → **webmail.safeguardsecurities.us**  
Then use **https://webmail.safeguardsecurities.us** (no port number).

---

## Fix 5 — Namecheap support

> SSL is valid for mail.safeguardsecurities.us on port 443, but **https://mail.safeguardsecurities.us:2096** shows “Not secure” in Chrome. Please install the same certificate on **webmail/cpsrvd/exim/dovecot** services for premium313.

---

## Safe to log in?

With “Not secure”, traffic may still be encrypted but the cert is **not trusted** (wrong name or self-signed on 2096).  
**Prefer Fix 1** before logging in on public Wi‑Fi. After the padlock appears on **:2096** or **443 webmail**, use that URL on your phone.
