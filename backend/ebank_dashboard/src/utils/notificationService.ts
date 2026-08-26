import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AdminNotification {
  type: 'password_reset' | 'account_created' | 'security_alert' | 'system_info';
  title: string;
  message: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  adminId?: string;
  adminEmail?: string;
  read: boolean;
  timestamp: any;
}

/**
 * Creates a notification for password reset actions
 */
export const createPasswordResetNotification = async (
  userInfo: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  },
  adminInfo: {
    id?: string;
    email?: string;
  },
  temporaryPassword: string
): Promise<void> => {
  try {
    const notification: AdminNotification = {
      type: 'password_reset',
      title: 'Password Reset Completed',
      message: `Password reset for ${userInfo.firstName} ${userInfo.lastName} (${userInfo.username}). Temporary password generated. User must change password on next login.`,
      userId: userInfo.id,
      userName: `${userInfo.firstName} ${userInfo.lastName}`,
      userEmail: userInfo.email,
      priority: 'medium',
      adminId: adminInfo.id,
      adminEmail: adminInfo.email,
      read: false,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'admin_notifications'), notification);
    
    // Also log for audit trail
    console.log('📧 Password Reset Notification Created');
    console.log('User:', userInfo.firstName, userInfo.lastName);
    console.log('Username:', userInfo.username);
    console.log('Email:', userInfo.email);
    console.log('Reset by:', adminInfo.email);
    console.log('Temporary Password:', temporaryPassword);
    
  } catch (error) {
    console.error('Failed to create password reset notification:', error);
  }
};

/**
 * Creates a notification for new account creation
 */
export const createAccountCreationNotification = async (
  userInfo: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    role: string;
  },
  adminInfo: {
    id?: string;
    email?: string;
  },
  temporaryPassword: string
): Promise<void> => {
  try {
    const notification: AdminNotification = {
      type: 'account_created',
      title: 'New Account Created',
      message: `New ${userInfo.role} account created for ${userInfo.firstName} ${userInfo.lastName} (${userInfo.username}). Temporary password provided.`,
      userId: userInfo.id,
      userName: `${userInfo.firstName} ${userInfo.lastName}`,
      userEmail: userInfo.email,
      priority: 'low',
      adminId: adminInfo.id,
      adminEmail: adminInfo.email,
      read: false,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'admin_notifications'), notification);
    
  } catch (error) {
    console.error('Failed to create account creation notification:', error);
  }
};

/**
 * Creates a security alert notification
 */
export const createSecurityNotification = async (
  message: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'high'
): Promise<void> => {
  try {
    const notification: AdminNotification = {
      type: 'security_alert',
      title: 'Security Alert',
      message,
      priority,
      read: false,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'admin_notifications'), notification);
    
  } catch (error) {
    console.error('Failed to create security notification:', error);
  }
};

/**
 * Creates a notification for new password reset request submissions
 */
export const createPasswordResetRequestNotification = async (
  requestData: {
    requestId: string;
    firstName: string;
    lastName: string;
    username: string;
    reason: string;
  }
): Promise<void> => {
  try {
    const notification: AdminNotification = {
      type: 'password_reset',
      title: 'New Password Reset Request',
      message: `${requestData.firstName} ${requestData.lastName} (@${requestData.username}) has requested a password reset. Reason: ${requestData.reason.replace(/_/g, ' ')}. Request ID: ${requestData.requestId}`,
      priority: 'medium',
      read: false,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'admin_notifications'), notification);
    
    console.log('📧 Password Reset Request Notification Created');
    console.log('User:', requestData.firstName, requestData.lastName);
    console.log('Username:', requestData.username);
    console.log('Request ID:', requestData.requestId);
    console.log('Reason:', requestData.reason);
    
  } catch (error) {
    console.error('Failed to create password reset request notification:', error);
  }
};