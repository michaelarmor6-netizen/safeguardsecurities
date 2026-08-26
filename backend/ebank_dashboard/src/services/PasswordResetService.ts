import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createPasswordResetRequestNotification } from '../utils/notificationService';

export interface PasswordResetRequest {
  id?: string;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  reason: string;
  additionalInfo?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  adminNotes?: string;
  requestId: string; // Unique identifier for tracking
}

/**
 * Submit a new password reset request
 */
export const submitPasswordResetRequest = async (
  requestData: Omit<PasswordResetRequest, 'id' | 'submittedAt' | 'status' | 'requestId'>
): Promise<string> => {
  try {
    // Generate a unique request ID
    const requestId = `PWR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const request: Omit<PasswordResetRequest, 'id'> = {
      ...requestData,
      status: 'pending',
      submittedAt: serverTimestamp(),
      requestId
    };

    const docRef = await addDoc(collection(db, 'password_reset_requests'), request);
    console.log('Password reset request submitted:', requestId);
    
    // Create notification for admins
    await createPasswordResetRequestNotification({
      requestId,
      firstName: requestData.firstName,
      lastName: requestData.lastName,
      username: requestData.username,
      reason: requestData.reason
    });
    
    return requestId;
  } catch (error) {
    console.error('Error submitting password reset request:', error);
    throw new Error('Failed to submit password reset request. Please try again.');
  }
};

/**
 * Get all password reset requests (for admin)
 */
export const getPasswordResetRequests = async (): Promise<PasswordResetRequest[]> => {
  try {
    const requestsQuery = query(
      collection(db, 'password_reset_requests'),
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(requestsQuery);
    const requests: PasswordResetRequest[] = [];
    
    querySnapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data()
      } as PasswordResetRequest);
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching password reset requests:', error);
    throw new Error('Failed to fetch password reset requests.');
  }
};

/**
 * Update password reset request status
 */
export const updatePasswordResetRequest = async (
  requestId: string,
  updates: Partial<PasswordResetRequest>,
  adminEmail?: string
): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      reviewedAt: serverTimestamp(),
      reviewedBy: adminEmail
    };
    
    await updateDoc(doc(db, 'password_reset_requests', requestId), updateData);
    console.log('Password reset request updated:', requestId);
  } catch (error) {
    console.error('Error updating password reset request:', error);
    throw new Error('Failed to update password reset request.');
  }
};

/**
 * Find user by username to get their email for password reset request validation
 */
export const findUserByUsername = async (username: string): Promise<any | null> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('username', '==', username)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error finding user by username:', error);
    return null;
  }
};