import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserRole } from '../types';

/**
 * Migration utility to fix user roles from uppercase to lowercase
 * Run this once to fix existing users with incorrect role casing
 */
export const migrateUserRoles = async () => {
  try {
    console.log('🔄 Starting user role migration...');
    
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    let updatedCount = 0;
    const updates: Promise<void>[] = [];
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      let newRole = userData.role;
      
      // Fix role casing
      switch (userData.role) {
        case 'CLIENT':
          newRole = UserRole.CLIENT; // 'client'
          break;
        case 'ADMIN':
          newRole = UserRole.ADMIN; // 'admin'
          break;
        case 'SUPER_ADMIN':
          newRole = UserRole.SUPER_ADMIN; // 'super_admin'
          break;
        default:
          // Role is already correct or unknown
          return;
      }
      
      if (newRole !== userData.role) {
        console.log(`📝 Updating user ${userDoc.id}: ${userData.role} → ${newRole}`);
        const updatePromise = updateDoc(doc(db, 'users', userDoc.id), {
          role: newRole,
          updatedAt: new Date()
        });
        updates.push(updatePromise);
        updatedCount++;
      }
    });
    
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ Migration complete! Updated ${updatedCount} users.`);
    } else {
      console.log('✅ No users need migration - all roles are correct.');
    }
    
    return { success: true, updatedCount };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error };
  }
};

/**
 * Quick fix for a single user by UID
 */
export const fixUserRole = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      role: UserRole.CLIENT, // Set to correct client role
      updatedAt: new Date()
    });
    console.log(`✅ Fixed role for user ${uid}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to fix user ${uid}:`, error);
    return false;
  }
};