import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AccountSyncDebug: React.FC<{ userId?: string }> = ({ userId }) => {
  const [firestoreData, setFirestoreData] = useState<any>(null);
  const [localStorageData, setLocalStorageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkAccountData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      console.log('🔍 AccountSyncDebug: Checking account data for user:', userId);
      
      // Check Firestore
      const accountsQuery = query(
        collection(db, 'accounts'),
        where('userId', '==', userId)
      );
      
      const accountsSnapshot = await getDocs(accountsQuery);
      const firestoreAccounts = accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Check localStorage
      const localAccountKey = `temp_account_${userId}`;
      const localAccount = localStorage.getItem(localAccountKey);
      
      setFirestoreData(firestoreAccounts);
      setLocalStorageData(localAccount ? JSON.parse(localAccount) : null);
      
      console.log('🔍 Firestore accounts:', firestoreAccounts);
      console.log('🔍 LocalStorage account:', localAccount);
      
    } catch (error) {
      console.error('🔍 Error checking account data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      checkAccountData();
      
      // Auto-refresh every 10 seconds
      const interval = setInterval(checkAccountData, 10000);
      
      // Listen for account updates
      const handleAccountUpdate = () => {
        console.log('🔧 Account update event received, refreshing debug data...');
        checkAccountData();
      };
      
      window.addEventListener('accountUpdated', handleAccountUpdate);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('accountUpdated', handleAccountUpdate);
      };
    }
  }, [userId]);

  if (!userId) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'white',
      border: '2px solid #3B82F6',
      padding: '15px',
      borderRadius: '8px',
      maxWidth: '400px',
      zIndex: 9999,
      fontSize: '11px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#1F2937' }}>🔍 Account Sync Debug</h3>
        <button
          onClick={checkAccountData}
          disabled={loading}
          style={{
            padding: '4px 8px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          {loading ? '🔄' : 'Refresh'}
        </button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>User ID:</strong> {userId}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Firestore Accounts ({firestoreData?.length || 0}):</strong>
        {firestoreData && firestoreData.length > 0 ? (
          <div style={{ background: '#F3F4F6', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
            {firestoreData.map((account: any, index: number) => (
              <div key={account.id} style={{ marginBottom: '4px' }}>
                <div><strong>#{index + 1} Balance:</strong> ${account.balance || 0}</div>
                <div><strong>Type:</strong> {account.accountType}</div>
                <div><strong>Status:</strong> {account.status} / Active: {account.isActive ? 'Yes' : 'No'}</div>
                <div><strong>Updated:</strong> {account.updatedAt ? new Date(account.updatedAt.seconds * 1000).toLocaleString() : 'Never'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#EF4444', marginTop: '4px' }}>No Firestore accounts found</div>
        )}
      </div>
      
      <div>
        <strong>LocalStorage Account:</strong>
        {localStorageData ? (
          <div style={{ background: '#FEF3C7', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
            <div><strong>Balance:</strong> ${localStorageData.balance || 0}</div>
            <div><strong>Type:</strong> {localStorageData.accountType}</div>
            <div><strong>Status:</strong> {localStorageData.status}</div>
          </div>
        ) : (
          <div style={{ color: '#EF4444', marginTop: '4px' }}>No localStorage account found</div>
        )}
      </div>
      
      <div style={{ marginTop: '10px', padding: '8px', background: '#EFF6FF', borderRadius: '4px' }}>
        <div style={{ fontSize: '10px', color: '#1D4ED8' }}>
          <strong>📝 Admin Changes:</strong> Should appear in Firestore within seconds
        </div>
        <div style={{ fontSize: '10px', color: '#1D4ED8' }}>
          <strong>🔄 Client Updates:</strong> Should sync automatically or on refresh
        </div>
      </div>
    </div>
  );
};

export default AccountSyncDebug;