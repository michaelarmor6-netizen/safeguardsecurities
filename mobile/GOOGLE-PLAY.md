# Google Play deployment — Safeguard Securities Android

Capacitor **WebView shell** loads **https://safeguardsecurities.us**.  
Most content updates ship via **website deploy** (Firebase Hosting); Play updates are needed when you change native config, icons, `appId`, or Capacitor plugins.

---

## Architecture recap

| Layer | Where | Notes |
|-------|--------|--------|
| **Play app** | `mobile/android/` | Package `us.safeguardsecurities.app`, version in `app/build.gradle` |
| **Web content** | `https://safeguardsecurities.us` | Marketing site + links to client portal |
| **Client login / register** | `https://app.safeguardsecurities.us` | Firebase auth pages (separate Hosting target) |
| **Email webmail** | `https://webmail.safeguardsecurities.us` | Namecheap cPanel — not inside the app shell |
| **Account deletion (Play URL)** | `https://safeguardsecurities.us/delete-account/` | Must stay public |
| **Privacy policy (Play URL)** | `https://safeguardsecurities.us/privacy-policy/` | Must stay public |
| **Offline fallback** | `mobile/www/error.html` | Bundled; shown when remote site unreachable |

---

## Repo layout (mobile)

```
mobile/
  capacitor.config.ts      # Remote URL + offline errorPath
  package.json             # npm scripts (setup, aab, icons, cap sync)
  www/                     # Splash + offline page (synced into APK)
  android/                 # Gradle project — open in Android Studio
  build-aab.ps1            # Release AAB (JDK 21 + TLS fix for Windows)
  setup.ps1                # npm install + cap sync + icons
  GOOGLE-PLAY.md           # This checklist
```

**Never commit:** `keystore.properties`, `*.jks`, `node_modules/`, `android/app/build/`.

---

## Phase A — Website & policy (before Play upload)

Deploy marketing hosting so these URLs work in a **phone browser**:

| URL | Purpose |
|-----|---------|
| https://safeguardsecurities.us/privacy-policy/ | Play Console privacy policy |
| https://safeguardsecurities.us/delete-account/ | Play **Delete account URL** |
| https://safeguardsecurities.us/terms-of-service/ | Optional support link |
| https://app.safeguardsecurities.us/login | Login from site CTAs |
| https://app.safeguardsecurities.us/register | Registration |

From repo root (Firebase logged in):

```powershell
firebase deploy --only hosting:marketing --project e-bank-dashboard
```

Also deploy **app** hosting if login/register changed (separate Firebase site for `app.` subdomain — confirm in Firebase Console).

**Firestore:** deploy rules to `e-bank-dashboard` when your account has permission:

```powershell
firebase deploy --only firestore:rules --project e-bank-dashboard
```

**Test on a real Android device (Chrome):** open the URLs above; exercise login → dashboard if applicable.

---

## Phase B — Prepare the Android project

```powershell
cd D:\safeguardsecurities
$env:NODE_OPTIONS = "--use-system-ca"
.\mobile\setup.ps1
```

1. **Icons** — `npm run icons --prefix mobile` (uses `mobile/app-icon.png`)
2. **Version** — edit `mobile/android/app/build.gradle`:
   - `versionCode` — integer, **increment every Play upload**
   - `versionName` — user-visible, e.g. `"1.0.0"`
3. **Review** `capacitor.config.ts` — production `server.url` should stay `https://safeguardsecurities.us`

Open in Android Studio:

```powershell
npm run cap:open:android --prefix mobile
```

Run on device/emulator once; confirm site loads, login link works, back button acceptable.

---

## Phase C — Release signing (one time)

```powershell
cd D:\safeguardsecurities\mobile\android
keytool -genkeypair -v -keystore safeguard-release.jks `
  -alias safeguard -keyalg RSA -keysize 2048 -validity 10000
```

```powershell
copy keystore.properties.example keystore.properties
# Edit keystore.properties — storeFile, passwords, keyAlias
```

Back up `.jks` + passwords offline. **Losing the keystore blocks future updates** for the same Play listing.

---

## Phase D — Build the AAB

```powershell
cd D:\safeguardsecurities
.\mobile\build-aab.ps1
```

Output:

`mobile/android/app/build/outputs/bundle/release/app-release.aab`

If build fails: use Android Studio **Build → Generate Signed Bundle / APK → Android App Bundle**.

---

## Phase E — Google Play Console

Create app (if new) with package name **`us.safeguardsecurities.app`** (must match exactly).

### Store listing

- **App name:** Safeguard Securities  
- **Category:** Finance (expect extra review)  
- **Privacy policy:** `https://safeguardsecurities.us/privacy-policy/`  
- **Screenshots:** phone 16:9 or 9:16, min 2; capture WebView on device  
- **Feature graphic:** upload `mobile/play-store/feature-graphic-1024x500.png` (1024×500, logo centered — do not crop the square icon)  
- **Icon:** upload `mobile/play-store/icon-512.png` (512×512 with safe padding)

### App content

| Section | Guidance |
|---------|----------|
| **Data safety** | Collects account/email if users register; encrypted in transit (HTTPS). Link delete-account URL. No selling data (per privacy policy). |
| **Delete account URL** | `https://safeguardsecurities.us/delete-account/` |
| **Financial features** | Declare brokerage/investment features; have registration/disclaimer text ready |
| **Target audience** | Adults; not primarily children |
| **Ads** | No, unless you add ads later |

### Data safety — account creation (typical for this app)

- Users can create account: **Yes** (username/password on app subdomain)  
- Delete account URL: **https://safeguardsecurities.us/delete-account/**  
- Data encrypted in transit: **Yes** (HTTPS)  
- Optional: data deletion without account deletion — email **privacy@safeguardsecurities.us**

### Release

1. **Internal testing** track first → upload AAB → add testers  
2. Fix crashes / WebView issues  
3. **Production** → staged rollout recommended  

---

## Phase F — After first publish

| Change type | Action |
|-------------|--------|
| Website copy, CSS, most HTML | Deploy Firebase only — no new AAB |
| `capacitor.config.ts`, plugins, icons, package, permissions | Bump `versionCode`, new AAB, Play release |
| Privacy / delete-account text | Deploy site + update Play listing if URLs change |

---

## Known gaps / follow-ups

| Item | Status |
|------|--------|
| SSL on `webmail.` subdomain | Optional; app uses main site + `app.` login |
| SSL on `mail.:2096` | Install cert on mail **services** in cPanel (see `scripts/MAIL-2096-SSL-FIX.md`) |
| Firestore rules on `e-bank-dashboard` | Deploy when Firebase IAM allows |
| SiteLock SFTP | Optional; not required for Play |
| `google-services.json` | Not in repo; add only if you add FCM/push later |

---

## Quick command reference

```powershell
# Setup
$env:NODE_OPTIONS = "--use-system-ca"
.\mobile\setup.ps1

# Open Android Studio
npm run cap:open:android --prefix mobile

# Release bundle
.\mobile\build-aab.ps1

# Site deploy (policy pages)
firebase deploy --only hosting:marketing --project e-bank-dashboard
```

---

## Support contacts (store listing)

- **Email:** info@safeguardsecurities.us  
- **Phone:** +1 (216) 250-7891  
- **Address:** 6060 Parkland Blvd, Mayfield Heights, OH 44124  

(From `company-details.json` — keep Play listing in sync.)
