import { SAFEGUARD_LOGO_DATA_URI } from './safeguardLogoDataUri';

const COMPANY_NAME = 'SafeGuard Securities';
const SUPPORT_EMAIL = 'support@safeguardsecurities.us';
const SUPPORT_PHONE = '+1 216 250-7891';
const SUPPORT_PHONE_TEL = '+12162507891';
const COMPANY_ADDRESS_LINES = ['6060 Parkland Boulevard, Suite 200', 'Mayfield Heights, OH 44124'];
const WEBSITE_URL = 'https://safeguardsecurities.us';

export interface InvestorAccountEmailVariables {
  firstName: string;
  lastName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  logoUrl?: string;
  uid?: string;
  accountManager?: {
    name: string;
    email: string;
    phone?: string;
  };
  // Admin-configurable via Settings -> Email Templates. Empty string means
  // "use the built-in default" - both generators below fall back that way.
  subjectOverride?: string;
  introOverride?: string;
}

export function generateInvestorWelcomeEmail(v: InvestorAccountEmailVariables): {
  subject: string;
  message: string;
} {
  const subject = v.subjectOverride?.trim() || `Welcome to ${COMPANY_NAME} - Your Investor Workspace is Ready`;
  const intro = v.introOverride?.trim() || `Welcome to ${COMPANY_NAME}! Your investor workspace account has been created and is ready for use.`;

  const message = `
Dear ${v.firstName} ${v.lastName},

${intro}

ACCOUNT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Name: ${v.firstName} ${v.lastName}
• Email Address: ${v.email}
• Temporary Password: ${v.temporaryPassword}

SECURE ACCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sign in at:
${v.loginUrl}

IMPORTANT SECURITY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Please change your temporary password immediately after signing in
• Never share your login credentials with anyone
• Contact us immediately if you suspect any unauthorized access

Need help? Contact us at ${SUPPORT_EMAIL}.

Thank you for choosing ${COMPANY_NAME}.
`.trim();

  return { subject, message };
}

export function generateInvestorAccountMailtoUrl(v: InvestorAccountEmailVariables): string {
  const { subject, message } = generateInvestorWelcomeEmail(v);
  return `mailto:${v.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

// Table/inline-style-free CSS is fine here since this is previewed in an
// iframe and copied as rich text, not sent through mailto: (which cannot
// carry HTML). Structure and copy come from the client-supplied template;
// only real data is substituted in and sections with no backing data
// (username, generic "features") are adapted to fields this app actually has.
export function generateInvestorWelcomeEmailHtml(v: InvestorAccountEmailVariables): string {
  const fullName = `${v.firstName} ${v.lastName}`.trim();
  const logo = v.logoUrl ?? SAFEGUARD_LOGO_DATA_URI;
  const accountManagerName = v.accountManager?.name || `${COMPANY_NAME} Team`;
  const accountManagerEmail = v.accountManager?.email || SUPPORT_EMAIL;
  const accountManagerPhone = v.accountManager?.phone;
  const createdDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const introText =
    v.introOverride?.trim() ||
    `Thank you for opening a trading account with ${COMPANY_NAME}. Your account has been successfully created and is ready to use. This email contains all the information you need to get started.`;

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${COMPANY_NAME}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            overflow: hidden;
        }
        .header {
            background-color: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            padding: 26px 30px;
            text-align: left;
            display: flex;
            align-items: center;
        }
        .header-left {
            display: flex;
            align-items: center;
        }
        .logo-img {
            height: 48px;
            width: auto;
            object-fit: contain;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #003d82;
            margin-bottom: 20px;
        }
        .intro-text {
            color: #003d82;
            margin-bottom: 30px;
            font-size: 14px;
            line-height: 1.8;
        }
        .account-info-section {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #003d82;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        .section-title::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 4px;
            background-color: #00cc00;
            border-radius: 50%;
            margin-right: 10px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
            color: #003d82;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #003d82;
        }
        .info-value {
            color: #003d82;
            text-align: right;
            word-break: break-all;
        }
        .highlight-box {
            background-color: #e8f4f8;
            border: 2px solid #003d82;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 13px;
            color: #003d82;
        }
        .highlight-box strong {
            color: #003d82;
        }
        .cta-section {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
            font-size: 14px;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .next-steps {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .steps-list {
            list-style: none;
            margin-top: 15px;
        }
        .steps-list li {
            padding: 8px 0 8px 30px;
            position: relative;
            font-size: 14px;
            color: #003d82;
        }
        .steps-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            font-weight: bold;
            color: #00cc00;
        }
        .security-notice {
            background-color: #ffe8e8;
            border-left: 4px solid #e74c3c;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 13px;
            color: #003d82;
        }
        .security-notice strong {
            color: #c0392b;
        }
        .footer {
            background-color: #f0f0f0;
            color: #003d82;
            padding: 30px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #ddd;
        }
        .footer-section {
            margin-bottom: 15px;
        }
        .footer-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: #003d82;
        }
        .footer-link {
            color: #003d82;
            text-decoration: none;
        }
        .footer-link:hover {
            text-decoration: underline;
        }
        .divider {
            height: 1px;
            background-color: #ddd;
            margin: 15px 0;
        }
        .footer-note {
            font-size: 10px;
            color: #666;
            margin-top: 15px;
        }
        a {
            color: #003d82;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <img src="${logo}" alt="${COMPANY_NAME}" class="logo-img" />
            </div>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Greeting -->
            <div class="greeting">Welcome, ${v.firstName}!</div>

            <p class="intro-text">
                ${introText}
            </p>

            <!-- Account Access Information -->
            <div class="account-info-section">
                <div class="section-title">Account Access Information</div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${fullName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email Address:</span>
                    <span class="info-value">${v.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Temporary Password:</span>
                    <span class="info-value">${v.temporaryPassword}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Portal URL:</span>
                    <span class="info-value"><a href="${v.loginUrl}" style="color: #3498db;">Access Portal</a></span>
                </div>
            </div>

            <!-- Trading Account Details -->
            <div class="account-info-section">
                <div class="section-title">Trading Account Details</div>
                <div class="info-row">
                    <span class="info-label">Account ID:</span>
                    <span class="info-value">${v.uid ?? '—'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Type:</span>
                    <span class="info-value">Investor Workspace</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Status:</span>
                    <span class="info-value" style="color: #27ae60; font-weight: 600;">Active</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Creation Date:</span>
                    <span class="info-value">${createdDate}</span>
                </div>
            </div>

            <!-- Call to Action -->
            <div class="cta-section">
                <a href="${v.loginUrl}" class="cta-button">Login to Your Account</a>
            </div>

            <!-- Important Security Notice -->
            <div class="highlight-box">
                <strong>⚠️ Important Security Notice</strong><br>
                For your security, you <strong>must change your temporary password</strong> on your first login. Your account has been configured with enhanced security features to protect your trading activity.
            </div>

            <!-- Security Best Practices -->
            <div class="security-notice">
                <strong>Security Best Practices:</strong><br>
                • Never share your login credentials with anyone<br>
                • Use a strong, unique password<br>
                • Enable two-factor authentication for added security<br>
                • Be cautious of phishing emails requesting your account information<br>
                • Always access ${COMPANY_NAME} through our official portal
            </div>

            <!-- Next Steps -->
            <div class="next-steps">
                <div class="section-title">Next Steps to Get Started</div>
                <ul class="steps-list">
                    <li>Log in to your trading account using the credentials above</li>
                    <li>Change your temporary password immediately</li>
                    <li>Enable two-factor authentication in account settings</li>
                    <li>Complete your profile information</li>
                    <li>Fund your account to start trading</li>
                    <li>Review our trading guide and compliance documentation</li>
                </ul>
            </div>

            <!-- Account Manager Info -->
            <div class="account-info-section">
                <div class="section-title">Your Account Manager</div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${accountManagerName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${accountManagerEmail}</span>
                </div>
                ${accountManagerPhone ? `<div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${accountManagerPhone}</span>
                </div>` : ''}
            </div>

            <!-- Support Section -->
            <p style="text-align: center; margin-top: 30px; font-size: 14px; color: #555;">
                Questions or need assistance? Our support team is here to help!
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-section">
                <div class="footer-title">Contact Information</div>
                <div style="margin: 8px 0; font-size: 13px;">
                    <strong>Address:</strong><br>
                    ${COMPANY_ADDRESS_LINES[0]}<br>
                    ${COMPANY_ADDRESS_LINES[1]}<br><br>
                    <strong>Phone:</strong> <a href="tel:${SUPPORT_PHONE_TEL}" class="footer-link">${SUPPORT_PHONE}</a><br>
                    <strong>Email:</strong> <a href="mailto:${SUPPORT_EMAIL}" class="footer-link">${SUPPORT_EMAIL}</a><br>
                    <strong>Website:</strong> <a href="${WEBSITE_URL}" class="footer-link">safeguardsecurities.us</a>
                </div>
            </div>

            <div class="divider"></div>

            <div class="footer-section">
                <div class="footer-title">Support & Resources</div>
                <div style="font-size: 12px;">
                    <a href="${v.loginUrl}" class="footer-link">Client Portal</a> |
                    <a href="${WEBSITE_URL}/contact" class="footer-link">Contact Support</a>
                </div>
            </div>

            <div class="divider"></div>

            <div class="footer-note">
                ${COMPANY_NAME}, Inc. | Professional Trading Platform<br>
                © 2026 ${COMPANY_NAME}. All rights reserved.<br><br>
                This is an automated message. Please do not reply to this email.<br>
                Account Manager: <strong>${accountManagerName}</strong><br>
                Account created on: ${createdDate}
            </div>
        </div>
    </div>
</body>
</html>`;
}
