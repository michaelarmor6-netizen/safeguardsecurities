import { SystemConfig } from '../types';

export interface TemplateVariables {
  ticketId: string;
  customerName: string;
  category: string;
  priority: string;
  subject: string;
  supportEmail: string;
  supportPhone: string;
  companyPhone: string;
  message?: string;
}

export class EmailTemplateProcessor {
  private config: SystemConfig;

  constructor(config: SystemConfig) {
    this.config = config;
  }

  processTemplate(template: string, variables: TemplateVariables): string {
    let processed = template;

    // Replace all template variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), value || '');
    });

    return processed;
  }

  getAutoReplyTemplate(variables: TemplateVariables): { subject: string; message: string } | null {
    const templates = this.config.supportEmailTemplates;
    if (!templates?.autoReply?.enabled) {
      return null;
    }

    return {
      subject: this.processTemplate(templates.autoReply.subject, variables),
      message: this.processTemplate(templates.autoReply.message, variables)
    };
  }

  getAccountOpeningTemplate(
    type: 'acknowledgment' | 'approved' | 'requiresDocuments',
    variables: TemplateVariables
  ): { subject: string; message: string } {
    const templates = this.config.supportEmailTemplates?.accountOpening?.[type];
    
    return {
      subject: this.processTemplate(templates?.subject || '', variables),
      message: this.processTemplate(templates?.message || '', variables)
    };
  }

  getGeneralTemplate(
    type: 'received' | 'resolved' | 'followUp',
    variables: TemplateVariables
  ): { subject: string; message: string } {
    const templates = this.config.supportEmailTemplates?.general?.[type];
    
    return {
      subject: this.processTemplate(templates?.subject || '', variables),
      message: this.processTemplate(templates?.message || '', variables)
    };
  }

  // Generate email for client auto-reply
  generateAutoReply(supportRequest: any, config: SystemConfig): string | null {
    const templates = config.supportEmailTemplates;
    if (!templates?.autoReply?.enabled) {
      return null;
    }

    const variables: TemplateVariables = {
      ticketId: supportRequest.ticketId,
      customerName: supportRequest.user.name,
      category: supportRequest.category,
      priority: supportRequest.priority,
      subject: supportRequest.subject,
      supportEmail: config.contact.email.support || config.contact.email.primary,
      supportPhone: config.contact.phone.support || config.contact.phone.primary,
      companyPhone: config.contact.phone.primary
    };

    const autoReply = this.getAutoReplyTemplate(variables);
    if (!autoReply) return null;

    // Format as mailto URL
    const subject = encodeURIComponent(autoReply.subject);
    const body = encodeURIComponent(autoReply.message);
    const toEmail = supportRequest.user.email;

    return `mailto:${toEmail}?subject=${subject}&body=${body}`;
  }
}

export default EmailTemplateProcessor;