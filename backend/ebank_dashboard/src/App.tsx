import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import { UserRole } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { isSafeguardMode } from './config/liveCollections';
import SafeguardApp from './SafeguardApp';

// Auth pages - bank-standard separation
import ClientLoginPage from './pages/auth/ClientLoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
// SignupPage removed - admin-only account creation system
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Client pages
import ClientDashboard from './pages/client/Dashboard';
import AccountOverview from './pages/client/AccountOverview';
import TransactionHistory from './pages/client/TransactionHistory';
import DepositFunds from './pages/client/DepositFunds';
import WithdrawFunds from './pages/client/WithdrawFunds';
import TransferFunds from './pages/client/TransferFunds';
import EWalletManagement from './pages/client/EWalletManagement';
import Profile from './pages/client/Profile';
import ReportsAnalytics from './pages/client/ReportsAnalytics';
import Statements from './pages/client/Statements';
import HelpSupport from './pages/client/HelpSupport';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminAnalytics from './pages/admin/Analytics';
import ClientAccountOpening from './pages/admin/ClientAccountOpening';
import ManageUsers from './pages/admin/ManageUsers';
import ManagePasswordResets from './pages/admin/ManagePasswordResets';
import ManageAccounts from './pages/admin/ManageAccounts';
import ManageTransactions from './pages/admin/ManageTransactions';
import ManageDeposits from './pages/admin/ManageDeposits';
import ManageWithdrawals from './pages/admin/ManageWithdrawals';
import ManageCountries from './pages/admin/ManageCountries';
import ManageFAQs from './pages/admin/ManageFAQs';
import ManageSupportRequests from './pages/admin/ManageSupportRequests';
import SystemSettings from './pages/admin/SystemSettings';

// Admin Access
import AdminAccessPage from './pages/auth/AdminAccessPage';

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
  </div>
);

// Protected Route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Redirect based on the required role for proper separation
    if (requiredRole && (requiredRole === UserRole.ADMIN || requiredRole === UserRole.SUPER_ADMIN)) {
      return <Navigate to="/admin-access" replace />;
    } else {
      // For client routes, redirect to client login
      return <Navigate to="/client-login" replace />;
    }
  }

  if (requiredRole) {
    // Check role hierarchy: SUPER_ADMIN can access ADMIN routes, ADMIN can access ADMIN routes
    // Also handle case-insensitive role matching for backward compatibility
    const userRole = user.role?.toLowerCase();
    const reqRole = requiredRole.toLowerCase();
    
    const hasAccess = 
      userRole === reqRole || 
      user.role === requiredRole ||
      (reqRole === UserRole.ADMIN && (userRole === UserRole.SUPER_ADMIN || user.role === UserRole.SUPER_ADMIN));
    
    if (!hasAccess) {
      return <Navigate to={user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN ? '/admin' : '/dashboard'} replace />;
    }
  }

  return <>{children}</>;
};

// Public Route wrapper (redirects to dashboard if authenticated)
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    // Route based on user role (handle both uppercase and lowercase roles)
    const userRole = user.role?.toLowerCase();
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN || 
        user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        {/* Old login removed - using admin-access and client-login instead */}
        <Route
          path="/client-login"
          element={
            <PublicRoute>
              <ClientLoginPage />
            </PublicRoute>
          }
        />
        {/* Signup disabled - accounts created by admin only */}
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/admin-access"
          element={
            <PublicRoute>
              <AdminAccessPage />
            </PublicRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ChangePasswordPage />
          }
        />

        {/* Client routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <AccountOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <TransactionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deposit"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <DepositFunds />
            </ProtectedRoute>
          }
        />
        <Route
          path="/withdraw"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <WithdrawFunds />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <TransferFunds />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ewallets"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <EWalletManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <ReportsAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statements"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <Statements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <HelpSupport />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/client-onboarding"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ClientAccountOpening />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/password-resets"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManagePasswordResets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/deposits"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageDeposits />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/withdrawals"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageWithdrawals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageSupportRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faqs"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageFAQs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/countries"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageCountries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredRole={UserRole.SUPER_ADMIN}>
              <SystemSettings />
            </ProtectedRoute>
          }
        />

        {/* Default redirect to admin access - bank staff entrance */}
        <Route path="/" element={<Navigate to="/admin-access" replace />} />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/admin-access" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  if (isSafeguardMode) {
    return (
      <ErrorBoundary>
        <Router>
          <SafeguardApp />
        </Router>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SystemConfigProvider>
            <AppContent />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </SystemConfigProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
