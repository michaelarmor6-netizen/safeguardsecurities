import { generateInvestorWelcomeEmailHtml } from '../src/utils/investorAccountEmailService.ts';
import { writeFileSync } from 'node:fs';

const html = generateInvestorWelcomeEmailHtml({
  firstName: 'Sarah',
  lastName: 'Chen',
  email: 'sarah.chen@example.com',
  temporaryPassword: 'Kx7#mQ2p',
  loginUrl: 'https://app.safeguardsecurities.us/login',
  uid: 'aB3dE9fGhJkLmN0pQrStUvWxYz12',
  accountManager: {
    name: 'Jordan Lee',
    email: 'jlee.ffiecgov@gmail.com',
    phone: '+1 216 250-7891',
  },
});

writeFileSync('scripts/email-preview-output.html', html);
console.log('Wrote scripts/email-preview-output.html, length:', html.length);
