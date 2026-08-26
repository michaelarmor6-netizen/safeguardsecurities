# Firebase Functions

## Email sender (`sendMarketEmail`)

Sends HTML email through your SMTP provider and is protected by a bearer token so it does not become an open relay.

## Voice IVR (`voice`)

Twilio webhook for receptionist greeting, keypad menu, and call routing. See **[VOICE-IVR.md](../VOICE-IVR.md)** for Twilio + Firebase setup.

```powershell
firebase deploy --only functions:voice --project e-bank-dashboard
```

---

## Email setup

## 1. Install dependencies

From the workspace root:

```powershell
Set-Location .\functions
npm install
```

## 2. Set Firebase function secrets

Run these once and enter the values when prompted:

```powershell
firebase functions:secrets:set EMAIL_API_KEY
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_SECURE
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set MAIL_FROM
```

Typical values:

- `SMTP_PORT`: `587`
- `SMTP_SECURE`: `false` for STARTTLS on port 587, `true` for SMTPS on port 465
- `MAIL_FROM`: `Safeguard Securities <alerts@yourdomain.com>`

## 3. Deploy the function

```powershell
firebase deploy --only functions
```

After deploy, Firebase will print the function URL. Keep that URL private.

## 4. Send a test email from PowerShell

Use the local HTML template as the message body and replace the placeholders before send time.

```powershell
$apiKey = "YOUR_EMAIL_API_KEY"
$functionUrl = "PASTE_DEPLOYED_FUNCTION_URL_HERE"
$html = Get-Content ..\email-template.html -Raw

$payload = @{
  to = "you@example.com"
  subject = "Gold Outlook: Institutional Forecast Through 2027"
  html = $html
  substitutions = @{
    first_name = "Client"
    company_address = "Safeguard Securities, Your Office Address"
    unsubscribe_url = "https://safeguardsecurities.us/unsubscribe"
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Method Post -Uri $functionUrl -Headers @{
  Authorization = "Bearer $apiKey"
  "Content-Type" = "application/json"
} -Body $payload
```

## Request format

```json
{
  "to": "client@example.com",
  "cc": ["advisor@example.com"],
  "bcc": ["archive@example.com"],
  "subject": "Gold Outlook: Institutional Forecast Through 2027",
  "html": "<html>...</html>",
  "text": "Optional plain text version",
  "from": "Optional override <sender@example.com>",
  "replyTo": "advisor@example.com",
  "substitutions": {
    "first_name": "Client",
    "company_address": "123 Example Street",
    "unsubscribe_url": "https://example.com/unsubscribe"
  }
}
```

## Security notes

- Do not call this function directly from a public browser page; that would expose the bearer token.
- Use it from your machine, a private admin tool, or another trusted backend.
- If you later want browser-triggered sending, add Firebase Authentication and verify an admin user before sending.