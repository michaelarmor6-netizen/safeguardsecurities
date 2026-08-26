import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import toast from 'react-hot-toast';

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorCode?: string;
}

export interface PasswordStrength {
  score: number;
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    specialChars: boolean;
    notCommon: boolean;
  };
}

export class PasswordSecurityService {
  
  /**
   * Validate password strength according to banking industry standards
   */
  static validatePasswordStrength(password: string): PasswordStrength {
    const requirements = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      specialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      notCommon: !this.isCommonPassword(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    const feedback: string[] = [];

    if (!requirements.length) feedback.push('Password must be at least 12 characters long');
    if (!requirements.uppercase) feedback.push('Add at least one uppercase letter');
    if (!requirements.lowercase) feedback.push('Add at least one lowercase letter');
    if (!requirements.numbers) feedback.push('Add at least one number');
    if (!requirements.specialChars) feedback.push('Add at least one special character (!@#$%^&*)');
    if (!requirements.notCommon) feedback.push('Avoid common passwords');

    return { score, feedback, requirements };
  }

  /**
   * Check if password is in common passwords list
   */
  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'shadow', 'baseball', 'football'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Change temporary password without requiring current password verification
   */
  static async changeTemporaryPassword(newPassword: string, confirmPassword: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      // Validate new password strength
      const strength = this.validatePasswordStrength(newPassword);
      if (strength.score < 6) {
        throw new Error(`Password too weak: ${strength.feedback.join(', ')}`);
      }

      // Confirm password match
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Check if user has mustChangePassword flag
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.mustChangePassword) {
        throw new Error('This function is only for temporary password changes. Use regular password change instead.');
      }

      // Update password in Firebase Auth directly (no re-authentication needed for temporary passwords)
      await updatePassword(user, newPassword);

      // Get current IP for logging
      const currentIP = await this.getCurrentIP();

      // Update user document
      await updateDoc(doc(db, 'users', user.uid), {
        lastPasswordChange: serverTimestamp(),
        mustChangePassword: false,
        security: {
          ...userData?.security,
          passwordChangedAt: serverTimestamp(),
          temporaryPasswordUsed: true,
          passwordHistory: [
            ...(userData?.security?.passwordHistory || []).slice(-4),
            {
              timestamp: new Date(),
              ip: currentIP,
              type: 'temporary_password_change'
            }
          ]
        },
        updatedAt: serverTimestamp()
      });

      // Log security event
      await this.logSecurityEvent(user.uid, 'temporary_password_changed', {
        timestamp: new Date(),
        ip: currentIP,
        userAgent: navigator.userAgent
      });

      // Force user to re-authenticate by signing them out
      // This ensures the new password takes effect immediately and clears any cached auth tokens
      try {
        const { signOut } = await import('firebase/auth');
        
        // Clear any browser caches and persistent storage
        if (typeof window !== 'undefined' && window.localStorage) {
          // Clear Firebase persistence data
          Object.keys(window.localStorage).forEach(key => {
            if (key.startsWith('firebase:')) {
              window.localStorage.removeItem(key);
            }
          });
        }
        
        await signOut(auth);
        console.log('User signed out after temporary password change to force re-authentication');
      } catch (signOutError) {
        console.warn('Failed to sign out user after temporary password change:', signOutError);
        // Continue anyway - the password was changed successfully
      }

      toast.success('Password changed successfully! You can now use your new password to log in.');
      return true;

    } catch (error: any) {
      console.error('Temporary password change error:', error);
      
      let errorMessage = 'Failed to change password';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return false;
    }
  }

  /**
   * Change user password with enhanced security
   */
  static async changePassword(request: PasswordChangeRequest): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      // Validate new password strength
      const strength = this.validatePasswordStrength(request.newPassword);
      if (strength.score < 6) {
        throw new Error(`Password too weak: ${strength.feedback.join(', ')}`);
      }

      // Confirm password match
      if (request.newPassword !== request.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Check if 2FA is enabled and validate code
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.security?.twoFactorEnabled && !request.twoFactorCode) {
        throw new Error('Two-factor authentication code required');
      }

      if (userData?.security?.twoFactorEnabled && request.twoFactorCode) {
        const isValidCode = await this.verify2FACode(user.uid, request.twoFactorCode);
        if (!isValidCode) {
          throw new Error('Invalid two-factor authentication code');
        }
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, request.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password in Firebase Auth
      await updatePassword(user, request.newPassword);

      // Get current IP for logging
      const currentIP = await this.getCurrentIP();

      // Update user document with password change timestamp
      await updateDoc(doc(db, 'users', user.uid), {
        lastPasswordChange: serverTimestamp(),
        mustChangePassword: false,
        security: {
          ...userData?.security,
          passwordChangedAt: serverTimestamp(),
          passwordHistory: [
            ...(userData?.security?.passwordHistory || []).slice(-4), // Keep last 5 passwords
            {
              timestamp: new Date(),
              ip: currentIP
            }
          ]
        },
        updatedAt: serverTimestamp()
      });

      // Log security event
      await this.logSecurityEvent(user.uid, 'password_changed', {
        timestamp: new Date(),
        ip: currentIP,
        userAgent: navigator.userAgent
      });

      // Force user to re-authenticate by signing them out
      // This ensures the new password takes effect immediately and clears any cached auth tokens
      try {
        const { signOut } = await import('firebase/auth');
        
        // Clear any browser caches and persistent storage
        if (typeof window !== 'undefined' && window.localStorage) {
          // Clear Firebase persistence data
          Object.keys(window.localStorage).forEach(key => {
            if (key.startsWith('firebase:')) {
              window.localStorage.removeItem(key);
            }
          });
        }
        
        await signOut(auth);
        console.log('User signed out after password change to force re-authentication');
      } catch (signOutError) {
        console.warn('Failed to sign out user after password change:', signOutError);
        // Continue anyway - the password was changed successfully
      }

      toast.success('Password changed successfully! Please log in with your new password.');
      return true;

    } catch (error: any) {
      console.error('Password change error:', error);
      
      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return false;
    }
  }

  /**
   * Generate 2FA setup QR code and secret
   */
  static async setup2FA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    try {
      // Generate a secret key for TOTP
      const secret = this.generateTOTPSecret();
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Create QR code URL for authenticator apps
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const appName = 'Digital Banking Platform';
      const accountName = userData?.email || 'user';
      
      const qrCodeUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;
      
      // Store 2FA setup in database (not activated yet)
      await updateDoc(doc(db, 'users', userId), {
        security: {
          ...userData?.security,
          twoFactorSetup: {
            secret,
            backupCodes: backupCodes.map(code => ({ code, used: false })),
            setupAt: serverTimestamp(),
            activated: false
          }
        },
        updatedAt: serverTimestamp()
      });

      return {
        secret,
        qrCode: qrCodeUrl,
        backupCodes
      };

    } catch (error) {
      console.error('2FA setup error:', error);
      throw new Error('Failed to setup two-factor authentication');
    }
  }

  /**
   * Enable 2FA after user confirms setup
   */
  static async enable2FA(userId: string, verificationCode: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      if (!userData?.security?.twoFactorSetup?.secret) {
        throw new Error('2FA not set up. Please complete setup first.');
      }

      // Verify the code using the secret
      const isValid = this.verifyTOTPCode(userData.security.twoFactorSetup.secret, verificationCode);
      
      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Activate 2FA
      await updateDoc(doc(db, 'users', userId), {
        security: {
          ...userData.security,
          twoFactorEnabled: true,
          twoFactorActivatedAt: serverTimestamp(),
          twoFactorSetup: {
            ...userData.security.twoFactorSetup,
            activated: true
          }
        },
        updatedAt: serverTimestamp()
      });

      // Log security event
      await this.logSecurityEvent(userId, '2fa_enabled', {
        timestamp: new Date(),
        ip: await this.getCurrentIP()
      });

      toast.success('Two-factor authentication enabled successfully!');
      return true;

    } catch (error: any) {
      console.error('2FA enable error:', error);
      toast.error(error.message || 'Failed to enable two-factor authentication');
      return false;
    }
  }

  /**
   * Disable 2FA
   */
  static async disable2FA(userId: string, password: string, verificationCode: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      // Re-authenticate with password
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Verify 2FA code
      const isValid = await this.verify2FACode(userId, verificationCode);
      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Disable 2FA
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();

      await updateDoc(doc(db, 'users', userId), {
        security: {
          ...userData?.security,
          twoFactorEnabled: false,
          twoFactorDisabledAt: serverTimestamp(),
          twoFactorSetup: null // Remove setup data
        },
        updatedAt: serverTimestamp()
      });

      // Log security event
      await this.logSecurityEvent(userId, '2fa_disabled', {
        timestamp: new Date(),
        ip: await this.getCurrentIP()
      });

      toast.success('Two-factor authentication disabled successfully!');
      return true;

    } catch (error: any) {
      console.error('2FA disable error:', error);
      toast.error(error.message || 'Failed to disable two-factor authentication');
      return false;
    }
  }

  /**
   * Verify 2FA code
   */
  static async verify2FACode(userId: string, code: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      if (!userData?.security?.twoFactorEnabled) {
        return true; // 2FA not enabled, skip verification
      }

      const secret = userData.security.twoFactorSetup?.secret;
      if (!secret) {
        throw new Error('2FA secret not found');
      }

      // Check if it's a backup code
      const backupCodes = userData.security.twoFactorSetup?.backupCodes || [];
      const backupCodeMatch = backupCodes.find((bc: any) => bc.code === code && !bc.used);
      
      if (backupCodeMatch) {
        // Mark backup code as used
        const updatedBackupCodes = backupCodes.map((bc: any) => 
          bc.code === code ? { ...bc, used: true, usedAt: serverTimestamp() } : bc
        );
        
        await updateDoc(doc(db, 'users', userId), {
          security: {
            ...userData.security,
            twoFactorSetup: {
              ...userData.security.twoFactorSetup,
              backupCodes: updatedBackupCodes
            }
          },
          updatedAt: serverTimestamp()
        });

        return true;
      }

      // Verify TOTP code
      return this.verifyTOTPCode(secret, code);

    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  }

  /**
   * Generate TOTP secret
   */
  private static generateTOTPSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substr(2, 8).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify TOTP code (simplified implementation)
   */
  private static verifyTOTPCode(secret: string, code: string): boolean {
    // This is a simplified implementation
    // In production, use a proper TOTP library like 'otplib'
    const timeSlice = Math.floor(Date.now() / 30000);
    const expectedCode = this.generateTOTPCode(secret, timeSlice);
    const previousCode = this.generateTOTPCode(secret, timeSlice - 1);
    const nextCode = this.generateTOTPCode(secret, timeSlice + 1);
    
    return code === expectedCode || code === previousCode || code === nextCode;
  }

  /**
   * Generate TOTP code (simplified)
   */
  private static generateTOTPCode(secret: string, timeSlice: number): string {
    // Simplified implementation - use proper TOTP library in production
    const hash = this.simpleHash(secret + timeSlice.toString());
    return (hash % 1000000).toString().padStart(6, '0');
  }

  /**
   * Simple hash function (replace with proper implementation)
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Log security events
   */
  private static async logSecurityEvent(userId: string, event: string, details: any): Promise<void> {
    try {
      const currentIP = details.ip || await this.getCurrentIP();
      await addDoc(collection(db, 'security_logs'), {
        userId,
        event,
        details,
        timestamp: serverTimestamp(),
        ip: currentIP,
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get current user IP (simplified)
   */
  private static async getCurrentIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<boolean> {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
      return true;
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send password reset email';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      
      toast.error(errorMessage);
      return false;
    }
  }
}

export default PasswordSecurityService;