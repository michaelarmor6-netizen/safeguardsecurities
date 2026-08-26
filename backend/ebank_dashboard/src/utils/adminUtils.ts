import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserRole } from '../types';

// This is a development utility to create admin users
// In production, this should be done through a secure admin interface or database directly

export const createAdminUser = async (userId: string, role: UserRole = UserRole.ADMIN) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: role,
      updatedAt: new Date()
    });
    const roleLabel = role === UserRole.SUPER_ADMIN ? 'super admin' : 'admin';
    console.log(`User ${userId} has been granted ${roleLabel} privileges`);
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
};

// For development: Create a default admin user
// This should be removed in production
export const createDefaultAdmin = async () => {
  // This is for development only
  // In production, admins should be created through proper channels
  console.log('Admin user creation should be handled through proper administrative channels');
};