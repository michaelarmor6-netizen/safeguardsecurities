import { SystemConfig } from '../types';

export interface ClientAccountEmailVariables {
  customerName: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  temporaryPassword: string;
  accountNumber?: string;
  clientPortalUrl: string;
  supportEmail: string;
  supportPhone: string;
  companyName: string;
  adminName?: string;
  adminEmail?: string;
}

export class ClientAccountEmailService {
  private config: SystemConfig;

  constructor(config: SystemConfig) {
    this.config = config;
  }

  /**
   * Generate professional client account creation email
   */
  generateClientWelcomeEmail(variables: ClientAccountEmailVariables): { subject: string; message: string } {
    const subject = `Welcome to ${variables.companyName} - Your Digital Banking Account is Ready`;
    
    const message = `
Dear ${variables.firstName} ${variables.lastName},

Welcome to ${variables.companyName}! Your digital banking account has been successfully created and is now ready for use.

🏦 ACCOUNT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Customer Name: ${variables.customerName}
• Email Address: ${variables.email}
• Username: ${variables.username}
• Temporary Password: ${variables.temporaryPassword}
${variables.accountNumber ? `• Account Number: ${variables.accountNumber}` : ''}

🔐 SECURE ACCESS TO YOUR ACCOUNT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your exclusive client portal is available at:
${variables.clientPortalUrl}

This portal is secured with 256-bit SSL encryption and is exclusively designed for verified ${variables.companyName} clients.

⚠️ IMPORTANT SECURITY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Please change your temporary password immediately upon first login
• Never share your login credentials with anyone
• Always access your account through the official client portal link provided above
• Contact us immediately if you suspect any unauthorized access

🎯 GETTING STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Visit the client portal using the link above
2. Enter your username and temporary password
3. Follow the prompts to set up your secure password
4. Complete your profile setup for enhanced security
5. Begin managing your digital banking services

📞 NEED ASSISTANCE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Our dedicated client support team is ready to assist you:

• Email Support: ${variables.supportEmail}
• Phone Support: ${variables.supportPhone}
• Business Hours: Monday - Friday, 8:00 AM - 6:00 PM

For immediate assistance or security concerns, please contact us during business hours.

This account was created by our administrative staff to provide you with secure access to ${variables.companyName}'s digital banking platform. All account activities are monitored and secured according to banking industry standards.

Thank you for choosing ${variables.companyName} for your banking needs.

Best regards,
${variables.companyName} Digital Banking Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply directly to this email.
For support inquiries, please use the contact information provided above.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return { subject, message };
  }

  /**
   * Generate admin notification email for client account creation
   */
  generateAdminNotificationEmail(variables: ClientAccountEmailVariables): { subject: string; message: string } {
    const subject = `New Client Account Created - ${variables.customerName}`;
    
    const message = `
Admin Notification: New Client Account Created

Client Details:
• Name: ${variables.firstName} ${variables.lastName}
• Email: ${variables.email}
• Username: ${variables.username}
• Created: ${new Date().toLocaleString()}

${variables.adminName ? `Created by: ${variables.adminName} (${variables.adminEmail})` : ''}

Client portal access has been provided via automated email.

${variables.companyName} Admin System`;

    return { subject, message };
  }

  /**
   * Generate mailto URL for client account creation email
   */
  generateClientAccountMailtoUrl(variables: ClientAccountEmailVariables): string {
    const emailContent = this.generateClientWelcomeEmail(variables);
    
    const subject = encodeURIComponent(emailContent.subject);
    const body = encodeURIComponent(emailContent.message);
    const toEmail = variables.email;

    return `mailto:${toEmail}?subject=${subject}&body=${body}`;
  }

  /**
   * Generate admin notification mailto URL
   */
  generateAdminNotificationMailtoUrl(variables: ClientAccountEmailVariables, adminEmail: string): string {
    const emailContent = this.generateAdminNotificationEmail(variables);
    
    const subject = encodeURIComponent(emailContent.subject);
    const body = encodeURIComponent(emailContent.message);

    return `mailto:${adminEmail}?subject=${subject}&body=${body}`;
  }

  /**
   * Generate complete email package for client account creation
   */
  generateAccountCreationEmails(variables: ClientAccountEmailVariables, adminEmail?: string) {
    return {
      clientEmail: {
        ...this.generateClientWelcomeEmail(variables),
        mailtoUrl: this.generateClientAccountMailtoUrl(variables)
      },
      adminNotification: adminEmail ? {
        ...this.generateAdminNotificationEmail(variables),
        mailtoUrl: this.generateAdminNotificationMailtoUrl(variables, adminEmail)
      } : null
    };
  }
}

export default ClientAccountEmailService;