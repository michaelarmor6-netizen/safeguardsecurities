import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface HealthCheckProps {
  className?: string;
}

const HealthCheck: React.FC<HealthCheckProps> = ({ className = '' }) => {
  const [status, setStatus] = React.useState<'checking' | 'healthy' | 'warning' | 'error'>('checking');
  const [details, setDetails] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const checkHealth = async () => {
      const checks = {
        firebase: await checkFirebaseConnection(),
        environment: checkEnvironmentVariables(),
        build: checkBuildConfiguration(),
        security: checkSecuritySettings(),
      };

      setDetails(checks);

      const allHealthy = Object.values(checks).every(check => check);
      const someIssues = Object.values(checks).some(check => !check);

      if (allHealthy) {
        setStatus('healthy');
      } else if (someIssues) {
        setStatus('warning');
      } else {
        setStatus('error');
      }
    };

    checkHealth();
  }, []);

  const checkFirebaseConnection = async (): Promise<boolean> => {
    try {
      const { auth } = await import('../config/firebase');
      return !!auth.app;
    } catch {
      return false;
    }
  };

  const checkEnvironmentVariables = (): boolean => {
    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ];

    return requiredVars.every(varName => 
      import.meta.env[varName] && 
      import.meta.env[varName].length > 0
    );
  };

  const checkBuildConfiguration = (): boolean => {
    return import.meta.env.PROD ? 
      import.meta.env.VITE_DEBUG_MODE === 'false' : 
      true;
  };

  const checkSecuritySettings = (): boolean => {
    return import.meta.env.PROD ? 
      import.meta.env.VITE_ENFORCE_HTTPS === 'true' : 
      true;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Only show in development or when there are issues
  if (import.meta.env.PROD && status === 'healthy') {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 border rounded-lg p-3 shadow-lg max-w-sm z-50 ${getStatusColor()} ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <h3 className="font-medium">System Health</h3>
      </div>
      
      <div className="space-y-1 text-xs">
        {Object.entries(details).map(([check, healthy]) => (
          <div key={check} className="flex items-center gap-2">
            {healthy ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : (
              <XCircle className="h-3 w-3 text-red-600" />
            )}
            <span className="capitalize">{check}</span>
          </div>
        ))}
      </div>

      {status === 'healthy' && (
        <div className="mt-2 text-xs font-medium text-green-700">
          🚀 Production Ready
        </div>
      )}

      {status !== 'healthy' && (
        <div className="mt-2 text-xs">
          Check PRODUCTION_DEPLOYMENT.md for guidance
        </div>
      )}
    </div>
  );
};

export default HealthCheck;