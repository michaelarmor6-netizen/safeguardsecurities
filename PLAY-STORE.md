# Play Store release (repo entry point)

Android app lives in **`mobile/`**. Full checklist:

**[mobile/GOOGLE-PLAY.md](mobile/GOOGLE-PLAY.md)**

## One-page recap

1. **App type:** Capacitor WebView → `https://safeguardsecurities.us` (`us.safeguardsecurities.app`)
2. **Policy URLs (must be live):** `/privacy-policy/`, `/delete-account/`
3. **Login/register:** `https://app.safeguardsecurities.us` (linked from the site)
4. **Build:** `.\mobile\setup.ps1` → signing keystore → `.\mobile\build-aab.ps1`
5. **Upload:** `app-release.aab` → Play Console → Data safety + Financial features + delete-account URL

## Related docs

| Topic | File |
|-------|------|
| Mail / SSL | `scripts/MAIL-2096-SSL-FIX.md`, `scripts/USE-MAIL-SUBDOMAIN.md` |
| Firebase deploy | `scripts/deploy-site.ps1` |
| Account deletion page | `delete-account/index.html` |
