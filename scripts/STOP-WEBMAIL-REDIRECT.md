# Still opening webmail.safeguardsecurities.us? — stop it

You want **https://mail.safeguardsecurities.us:2096** (has SSL).  
**webmail.** has no cert → red “Not secure”.

Something is still sending you to **webmail.** — fix **all** of these:

---

## 1. cPanel → Redirects (most common)

**Redirects** → look for any rule:

| Remove or edit |
|----------------|
| `mail.safeguardsecurities.us` → `webmail.safeguardsecurities.us` |
| `https://mail...` → `https://webmail...` |

**Add** (optional, helps old bookmarks):

| Type | From | To |
|------|------|-----|
| Permanent 301 | `https://webmail.safeguardsecurities.us` | `https://mail.safeguardsecurities.us:2096/` |

---

## 2. File Manager — both folders

### `mail.safeguardsecurities.us/`

- **Delete** any `index.html` that mentions `webmail.safeguardsecurities.us`
- **Upload** repo file: `cpanel-upload/mail.safeguardsecurities.us/index.html`  
  (links to **:2096** only)

### `webmail.safeguardsecurities.us/`

- **Upload** both:
  - `cpanel-upload/webmail.safeguardsecurities.us/index.html`
  - `cpanel-upload/webmail.safeguardsecurities.us/.htaccess`  
  (sends **webmail.** → **mail.:2096**)

---

## 3. Bookmark / address bar

**Stop using:** `https://webmail.safeguardsecurities.us`  

**Use:** `https://mail.safeguardsecurities.us:2096/`

cPanel **Email Accounts → Check Email** may still open **webmail.** — after step 2, that should redirect to **mail.:2096**.

---

## 4. Marketing site (already deployed)

`https://safeguardsecurities.us/webmail` → `https://mail.safeguardsecurities.us:2096`

---

## 5. Do not use yet

- **Force HTTPS** on **webmail** (no cert there)
- Let’s Encrypt on **webmail** until you want that hostname again

---

## Test

1. Incognito window  
2. Open **https://mail.safeguardsecurities.us:2096/** → padlock + login  
3. Open **https://webmail.safeguardsecurities.us** → should jump to **mail.:2096** (after step 2)
