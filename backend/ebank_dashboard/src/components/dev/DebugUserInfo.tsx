import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const DebugUserInfo: React.FC = () => {
  const { user, loading } = useAuth();

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="font-bold mb-2">🐛 Debug Info (Dev Only)</div>
      <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
      <div><strong>User:</strong> {user ? 'Signed In' : 'Not Signed In'}</div>
      {user && (
        <>
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>Role:</strong> {user.role}</div>
          <div className="bg-yellow-600 p-1 rounded mt-1">
            <strong>🆔 USER ID:</strong><br/>
            <span className="break-all">{user.uid}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default DebugUserInfo;