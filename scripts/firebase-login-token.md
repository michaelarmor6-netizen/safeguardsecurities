# Deploy with a Firebase CI token (when `firebase login` fails)

Use this if `auth.firebase.tools/attest` fails on your PC (antivirus/proxy TLS).

## On a computer where login works

```bash
firebase login:ci
```

Copy the token (long string). **Treat it like a password.**

## On this PC

```powershell
cd D:\safeguardsecurities
$env:NODE_OPTIONS = "--use-system-ca"
$env:FIREBASE_TOKEN = "PASTE_TOKEN_HERE"
.\scripts\deploy-site.ps1
```

Remove the token afterward:

```powershell
Remove-Item Env:FIREBASE_TOKEN
```

## Revoke a leaked token

```bash
firebase logout
```

Or revoke in [Google Account → Security → Third-party access](https://myaccount.google.com/permissions).
