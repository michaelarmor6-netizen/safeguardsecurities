// API Endpoint Documentation for Support System
// This file provides the structure for implementing backend endpoints

/*
===========================================
BACKEND API ENDPOINTS TO IMPLEMENT
===========================================

1. POST /api/send-support-email
   - Sends email notification to support team when new request is created
   - Body: { supportRequest, firestoreId }
   - Returns: { success: boolean, messageId?: string }

2. GET /api/support-requests
   - Retrieves all support requests (admin only)
   - Query params: ?status=new&priority=high&page=1&limit=10
   - Returns: { requests: [], total: number, page: number }

3. PUT /api/support-requests/:id
   - Updates support request status, assignments, etc.
   - Body: { status, assignedTo, notes }
   - Returns: { success: boolean, updated: object }

4. POST /api/support-requests/:id/response
   - Adds admin response to support request
   - Body: { message, isPublic, respondentId }
   - Returns: { success: boolean, response: object }

5. POST /api/send-email
   - Sends email responses to customers
   - Body: { to, subject, message, ticketId }
   - Returns: { success: boolean, messageId }

===========================================
FIRESTORE COLLECTIONS STRUCTURE
===========================================

Collection: 'support_requests'
Document Structure:
{
  ticketId: "SUP-123456",
  subject: "Request to Open Account", 
  category: "account_opening",
  priority: "medium",
  message: "I would like to open a new account...",
  contactMethod: "email",
  user: {
    email: "user@example.com",
    uid: "firebase-uid", 
    name: "John Doe"
  },
  status: "new", // new, in-progress, resolved, closed
  timestamp: "2024-11-07T...",
  assignedTo: "admin-uid", // optional
  responses: [], // array of responses
  updatedAt: "2024-11-07T...",
  resolvedAt: null, // timestamp when resolved
  tags: [], // optional tags for categorization
}

Collection: 'support_responses' (subcollection of support_requests)
Document Structure:
{
  message: "Thank you for your request...",
  respondent: {
    uid: "admin-uid",
    name: "Support Agent",
    email: "support@bank.com"
  },
  timestamp: "2024-11-07T...",
  isPublic: true, // visible to customer
  type: "admin_response" // or "internal_note"
}

===========================================
EMAIL TEMPLATES
===========================================

New Support Request Notification (to admins):
Subject: New Support Request #{ticketId} - {priority}
Body:
"
New support request received:

Ticket ID: #{ticketId}
Priority: {priority}
Category: {category}
Customer: {user.name} ({user.email})
Subject: {subject}

Message:
{message}

View in admin panel: {adminUrl}/admin/support

Contact method preferred: {contactMethod}
"

Customer Confirmation Email:
Subject: Support Request Received - #{ticketId}
Body:
"
Dear {user.name},

Thank you for contacting our support team. We have received your request:

Ticket ID: #{ticketId}
Subject: {subject}
Status: New

We will review your request and respond within our standard timeframes:
- Account Opening: 2-4 business hours
- General Inquiries: 24 hours  
- Technical Issues: 4-8 hours
- Critical/Security: 1 hour

You can check the status of your request by logging into your account.

Best regards,
Customer Support Team
"

===========================================
INTEGRATION EXAMPLES
===========================================

Example 1: Node.js with Express and Nodemailer
```javascript
const express = require('express');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const app = express();

// Email transporter setup
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send support email notification
app.post('/api/send-support-email', async (req, res) => {
  try {
    const { supportRequest } = req.body;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'support@yourbank.com',
      subject: `New Support Request #${supportRequest.ticketId} - ${supportRequest.priority}`,
      html: generateSupportEmailTemplate(supportRequest)
    };
    
    await transporter.sendMail(mailOptions);
    
    // Send confirmation to customer
    const customerMail = {
      from: process.env.EMAIL_USER,
      to: supportRequest.user.email,
      subject: `Support Request Received - #${supportRequest.ticketId}`,
      html: generateCustomerConfirmationTemplate(supportRequest)
    };
    
    await transporter.sendMail(customerMail);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

Example 2: Using EmailJS (Client-side)
```javascript
import emailjs from 'emailjs-com';

const sendSupportNotification = async (supportRequest) => {
  try {
    await emailjs.send(
      'your_service_id',
      'support_notification_template',
      {
        ticket_id: supportRequest.ticketId,
        subject: supportRequest.subject,
        priority: supportRequest.priority,
        customer_name: supportRequest.user.name,
        customer_email: supportRequest.user.email,
        message: supportRequest.message,
        category: supportRequest.category
      },
      'your_public_key'
    );
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
};
```

Example 3: Firebase Functions
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

exports.onSupportRequestCreated = functions.firestore
  .document('support_requests/{requestId}')
  .onCreate(async (snap, context) => {
    const supportRequest = snap.data();
    
    // Send email notification
    await sendSupportNotification(supportRequest);
    
    // Update request with notification status
    await snap.ref.update({
      emailSent: true,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
```

===========================================
SECURITY CONSIDERATIONS
===========================================

1. Authentication:
   - All admin endpoints require authentication
   - Use Firebase Auth for user verification
   - Implement role-based access control

2. Data Validation:
   - Validate all input data
   - Sanitize email content
   - Rate limiting for support requests

3. Privacy:
   - Encrypt sensitive data in Firestore
   - Implement data retention policies
   - GDPR compliance for user data

4. Email Security:
   - Use authenticated SMTP
   - Implement SPF, DKIM records
   - Monitor for spam/abuse

===========================================
MONITORING & ANALYTICS
===========================================

1. Track support metrics:
   - Response times
   - Resolution rates
   - Customer satisfaction
   - Common issues/categories

2. Set up alerts:
   - Critical priority requests
   - High volume periods
   - System failures

3. Generate reports:
   - Weekly support summaries
   - Agent performance metrics
   - Trend analysis

*/

export default {};