import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const FirebaseDebug: React.FC = () => {
  const [debugData, setDebugData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFirebaseData = async () => {
      try {
        console.log('🔍 FirebaseDebug: Starting comprehensive Firebase check...');
        
        const results: any = {};

        // Check if systemConfig document exists
        try {
          console.log('🔍 Checking systemConfig/main document...');
          const configRef = doc(db, 'systemConfig', 'main');
          const configSnap = await getDoc(configRef);
          
          results.systemConfig = {
            exists: configSnap.exists(),
            data: configSnap.exists() ? configSnap.data() : null
          };
          
          console.log('🔍 SystemConfig document exists:', configSnap.exists());
          if (configSnap.exists()) {
            const data = configSnap.data();
            console.log('🔍 SystemConfig data keys:', Object.keys(data));
            console.log('🔍 Branding section:', data.branding);
            console.log('🔍 Logo primary:', data.branding?.logo?.primary);
          }
        } catch (error) {
          console.error('🔍 Error checking systemConfig:', error);
          results.systemConfig = { error: error instanceof Error ? error.message : 'Unknown error' };
        }

        // Check all collections
        try {
          console.log('🔍 Checking available collections...');
          const collections = ['systemConfig', 'users', 'accounts', 'transactions'];
          
          for (const collectionName of collections) {
            try {
              const collectionRef = collection(db, collectionName);
              const snapshot = await getDocs(collectionRef);
              results[`collection_${collectionName}`] = {
                exists: !snapshot.empty,
                docCount: snapshot.size,
                docIds: snapshot.docs.map(doc => doc.id)
              };
              console.log(`🔍 Collection '${collectionName}': ${snapshot.size} documents`);
            } catch (error) {
              results[`collection_${collectionName}`] = { error: error instanceof Error ? error.message : 'Unknown error' };
            }
          }
        } catch (error) {
          console.error('🔍 Error checking collections:', error);
        }

        setDebugData(results);
        console.log('🔍 Firebase debug complete:', results);
        
      } catch (error) {
        console.error('🔍 Firebase debug failed:', error);
        setDebugData({ globalError: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    };

    fetchFirebaseData();
  }, []);

  if (loading) return <div style={{ position: 'fixed', top: '10px', left: '10px', background: 'yellow', padding: '10px', zIndex: 9999 }}>Loading Firebase Debug...</div>;

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      left: '10px', 
      background: 'white', 
      border: '2px solid #333', 
      padding: '15px', 
      borderRadius: '8px',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'auto',
      zIndex: 9999,
      fontSize: '11px'
    }}>
      <h3>🔍 Firebase Debug Panel</h3>
      
      {debugData.systemConfig && (
        <div style={{ marginBottom: '15px', border: '1px solid #ddd', padding: '10px' }}>
          <h4>SystemConfig Document</h4>
          <div><strong>Exists:</strong> {debugData.systemConfig.exists ? '✅ Yes' : '❌ No'}</div>
          
          {debugData.systemConfig.data && (
            <>
              <div><strong>Company Name:</strong> {debugData.systemConfig.data.companyInfo?.name || 'N/A'}</div>
              <div><strong>Logo Primary:</strong> 
                <div style={{ 
                  background: debugData.systemConfig.data.branding?.logo?.primary ? '#d4edda' : '#f8d7da', 
                  padding: '5px', 
                  wordBreak: 'break-all',
                  maxHeight: '100px',
                  overflow: 'auto'
                }}>
                  {debugData.systemConfig.data.branding?.logo?.primary || '(empty/null)'}
                </div>
              </div>
              <div><strong>Updated At:</strong> {debugData.systemConfig.data.updatedAt?.toDate?.()?.toLocaleString() || 'Never'}</div>
              <div><strong>Updated By:</strong> {debugData.systemConfig.data.updatedBy || 'N/A'}</div>
            </>
          )}
          
          {debugData.systemConfig.error && (
            <div style={{ color: 'red' }}><strong>Error:</strong> {debugData.systemConfig.error}</div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <h4>Collections Status</h4>
        {Object.entries(debugData).filter(([key]) => key.startsWith('collection_')).map(([key, value]: [string, any]) => (
          <div key={key} style={{ marginBottom: '5px' }}>
            <strong>{key.replace('collection_', '')}:</strong> 
            {value.error ? (
              <span style={{ color: 'red' }}> Error: {value.error}</span>
            ) : (
              <span> {value.docCount} docs {value.exists ? '✅' : '❌'}</span>
            )}
          </div>
        ))}
      </div>

      <details>
        <summary style={{ cursor: 'pointer' }}>Full Debug Data</summary>
        <pre style={{ 
          background: '#f8f8f8', 
          padding: '10px', 
          fontSize: '9px', 
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(debugData, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default FirebaseDebug;