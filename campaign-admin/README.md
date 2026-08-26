# Campaign Admin

Local admin app for managing contacts, previewing campaigns, and sending bulk email through Resend without using PowerShell.

## Features

- Edit campaign settings in a web UI
- Upload or paste mailing lists as CSV
- Preview the existing HTML email template with personalization
- Send a test email to yourself
- Send bulk campaigns through the Resend API
- Persist contacts, settings, and campaign history locally in JSON

## Requirements

- Node.js 18+
- A verified Resend sending domain
- A Resend API key with send permissions

## Setup

1. Open a terminal in this folder.
2. Install dependencies:
   npm install
3. Copy `.env.example` to `.env`
4. Set `RESEND_API_KEY` in `.env`
5. Start the app:
   npm start
6. Open:
   http://localhost:8787

## CSV format

Use these columns:

email,first_name,advisor_name
jane@example.com,Jane,Emma Carter
john@example.com,John,David Lin

## Storage

The app stores local state in `campaign-admin/data/`:

- `settings.json`
- `contacts.json`
- `campaigns.json`

On first run, it bootstraps from the existing root files when available:

- `recipients.csv`
- `company-details.json`
- `email-template.html`

## Notes

- The Resend API key stays server-side.
- This is suitable for your internal Phase 1 workflow.
- For SaaS later, move JSON storage to a database and add authentication, teams, billing, and rate controls.
