import React, { createContext, useContext, ReactNode } from 'react';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { SystemConfig } from '../types';

interface SystemConfigContextType {
  config: SystemConfig;
  loading: boolean;
  error: string | null;
  getCompanyName: () => string;
  getPrimaryLogo: () => string;
  getPrimaryColor: () => string;
  getContactEmail: () => string;
  getContactPhone: () => string;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

interface SystemConfigProviderProps {
  children: ReactNode;
}

export const SystemConfigProvider: React.FC<SystemConfigProviderProps> = ({ children }) => {
  const systemConfig = useSystemConfig();

  return (
    <SystemConfigContext.Provider value={systemConfig}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfigContext = () => {
  const context = useContext(SystemConfigContext);
  if (context === undefined) {
    throw new Error('useSystemConfigContext must be used within a SystemConfigProvider');
  }
  return context;
};