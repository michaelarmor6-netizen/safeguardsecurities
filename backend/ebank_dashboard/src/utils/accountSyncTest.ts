/**
 * Quick test utility to verify admin → client account synchronization
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const testAccountSync = async (userId: string, newBalance: number) => {
  try {
    console.log('🧪 Testing account sync for user:', userId);
    console.log('🧪 Setting balance to:', newBalance);
    
    // Find the user's account document
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const accountsQuery = query(
      collection(db, 'accounts'),
      where('userId', '==', userId)
    );
    
    const accountsSnapshot = await getDocs(accountsQuery);
    
    if (accountsSnapshot.empty) {
      console.error('🧪 No accounts found for user:', userId);
      return false;
    }
    
    const accountDoc = accountsSnapshot.docs[0];
    console.log('🧪 Found account:', accountDoc.id);
    
    // Update the balance
    await updateDoc(doc(db, 'accounts', accountDoc.id), {
      balance: newBalance,
      updatedAt: new Date().toISOString(),
      testUpdate: Date.now() // Add a test field to verify update
    });
    
    console.log('🧪 ✅ Account balance updated successfully');
    
    // Verify the update
    const updatedDoc = await getDoc(doc(db, 'accounts', accountDoc.id));
    const updatedData = updatedDoc.data();
    console.log('🧪 📋 Updated account data:', updatedData);
    
    return true;
  } catch (error) {
    console.error('🧪 ❌ Test failed:', error);
    return false;
  }
};

export const getAccountData = async (userId: string) => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const accountsQuery = query(
      collection(db, 'accounts'),
      where('userId', '==', userId)
    );
    
    const accountsSnapshot = await getDocs(accountsQuery);
    
    if (accountsSnapshot.empty) {
      console.log('🧪 No Firestore accounts found for user:', userId);
      return null;
    }
    
    const accounts = accountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('🧪 Current Firestore accounts:', accounts);
    return accounts;
  } catch (error) {
    console.error('🧪 Error getting account data:', error);
    return null;
  }
};