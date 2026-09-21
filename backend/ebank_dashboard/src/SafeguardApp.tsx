import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { InvestorAuthProvider, useInvestorAuth } from './contexts/InvestorAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import InvestorAdminLayout from './components/Layout/InvestorAdminLayout';
import InvestorWorkspaceLayout from './components/Layout/InvestorWorkspaceLayout';
import InvestorLoginPage from './pages/investor/InvestorLoginPage';
import InvestorSignupPage from './pages/investor/InvestorSignupPage';
import InvestorAdminLoginPage from './pages/investor/InvestorAdminLoginPage';
import InvestorActivationPage from './pages/investor/InvestorActivationPage';
import InvestorOnboardingPage from './pages/investor/InvestorOnboardingPage';
import InvestorDashboardPage from './pages/investor/workspace/InvestorDashboardPage';
import InvestorAiInsightsPage from './pages/investor/workspace/InvestorAiInsightsPage';
import InvestorPortfolioPage from './pages/investor/workspace/InvestorPortfolioPage';
import InvestorWalletPage from './pages/investor/workspace/InvestorWalletPage';
import InvestorTradeHistoryPage from './pages/investor/workspace/InvestorTradeHistoryPage';
import InvestorPerformancePage from './pages/investor/workspace/InvestorPerformancePage';
import InvestorSettingsPage from './pages/investor/workspace/InvestorSettingsPage';
import InvestorSupportPage from './pages/investor/workspace/InvestorSupportPage';
import InvestorStatementPage from './pages/investor/workspace/InvestorStatementPage';
import InvestorKycPage from './pages/investor/workspace/InvestorKycPage';
import InvestorAiEnginePage from './pages/investor/workspace/InvestorAiEnginePage';
import InvestorPlanPage from './pages/investor/workspace/InvestorPlanPage';
import InvestorTradeDeskPage from './pages/investor/tradedesk/InvestorTradeDeskPage';
import FundingInvoicePage from './pages/investor/FundingInvoicePage';
import FundingEmailPreviewPage from './pages/investor/FundingEmailPreviewPage';
import StaffInvoicePage from './pages/investor/StaffInvoicePage';
import InvoiceEmailPreviewPage from './pages/investor/InvoiceEmailPreviewPage';
import InvestorInvoicesPage from './pages/investor/workspace/InvestorInvoicesPage';
import InvestorAdminInvoicesPage from './pages/investor/admin/InvestorAdminInvoicesPage';
import InvestorNewsPage from './pages/investor/workspace/InvestorNewsPage';
import InvestorResearchPage from './pages/investor/workspace/InvestorResearchPage';
import InvestorWatchlistPage from './pages/investor/workspace/InvestorWatchlistPage';
import InvestorAlertsPage from './pages/investor/workspace/InvestorAlertsPage';
import InvestorAdminOverviewPage from './pages/investor/admin/InvestorAdminOverviewPage';
import InvestorAdminApplicantsPage from './pages/investor/admin/InvestorAdminApplicantsPage';
import InvestorAdminCreateUserPage from './pages/investor/admin/InvestorAdminCreateUserPage';
import InvestorAdminUsersPage from './pages/investor/admin/InvestorAdminUsersPage';
import InvestorAdminOrdersPage from './pages/investor/admin/InvestorAdminOrdersPage';
import InvestorAdminWalletSetupPage from './pages/investor/admin/InvestorAdminWalletSetupPage';
import InvestorAdminWalletsPage from './pages/investor/admin/InvestorAdminWalletsPage';
import InvestorAdminFundingPage from './pages/investor/admin/InvestorAdminFundingPage';
import InvestorAdminTransactionsPage from './pages/investor/admin/InvestorAdminTransactionsPage';
import InvestorAdminEmailTemplatePage from './pages/investor/admin/InvestorAdminEmailTemplatePage';
import InvestorAdminAssetsPage from './pages/investor/admin/InvestorAdminAssetsPage';
import InvestorAdminSupportPage from './pages/investor/admin/InvestorAdminSupportPage';
import InvestorAdminKycPage from './pages/investor/admin/InvestorAdminKycPage';
import InvestorAdminStrategiesPage from './pages/investor/admin/InvestorAdminStrategiesPage';
import InvestorAdminRiskPage from './pages/investor/admin/InvestorAdminRiskPage';
import InvestorAdminAuditPage from './pages/investor/admin/InvestorAdminAuditPage';
import InvestorAdminSettingsPage from './pages/investor/admin/InvestorAdminSettingsPage';
import InvestorAdminCrmLeadsPage from './pages/investor/admin/crm/InvestorAdminCrmLeadsPage';
import InvestorAdminCrmImportsPage from './pages/investor/admin/crm/InvestorAdminCrmImportsPage';
import InvestorAdminCrmCampaignsPage from './pages/investor/admin/crm/InvestorAdminCrmCampaignsPage';
import { useApplyBrandColors } from './hooks/useApplyBrandColors';
import './styles/safeguardTheme.css';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, user, isAdmin } = useInvestorAuth();
  if (loading) {
    return (
      <div className="sg-shell flex items-center justify-center" style={{ color: 'var(--sg-muted)' }}>
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/admin-login" replace />;
  if (!isAdmin) return <Navigate to="/workspace" replace />;
  return <>{children}</>;
}

function SafeguardRoutes() {
  useApplyBrandColors();
  const { loading, user, isAdmin } = useInvestorAuth();
  if (loading) {
    return (
      <div className="sg-shell flex items-center justify-center" style={{ color: 'var(--sg-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<InvestorLoginPage />} />
      <Route path="/signup" element={<InvestorSignupPage />} />
      <Route path="/admin-login" element={<InvestorAdminLoginPage />} />
      <Route path="/activation" element={user ? <InvestorActivationPage /> : <Navigate to="/login" replace />} />
      <Route path="/onboarding" element={user ? <InvestorOnboardingPage /> : <Navigate to="/login" replace />} />
      <Route path="/trade-desk" element={<InvestorTradeDeskPage />} />
      <Route path="/funding-invoice/:requestId" element={<FundingInvoicePage />} />
      <Route path="/funding-email/:requestId" element={<FundingEmailPreviewPage />} />
      <Route path="/invoice/:invoiceId" element={<StaffInvoicePage />} />
      <Route path="/invoice-email/:invoiceId" element={<InvoiceEmailPreviewPage />} />
      <Route path="/workspace" element={<InvestorWorkspaceLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<InvestorDashboardPage />} />
        <Route path="trades" element={<InvestorTradeHistoryPage />} />
        <Route path="portfolio" element={<InvestorPortfolioPage />} />
        <Route path="wallet" element={<InvestorWalletPage />} />
        <Route path="performance" element={<InvestorPerformancePage />} />
        <Route path="statement" element={<InvestorStatementPage />} />
        <Route path="invoices" element={<InvestorInvoicesPage />} />
        <Route path="ai-insights" element={<InvestorAiInsightsPage />} />
        <Route path="ai-engine" element={<InvestorAiEnginePage />} />
        <Route path="kyc" element={<InvestorKycPage />} />
        <Route path="plan" element={<InvestorPlanPage />} />
        <Route path="settings" element={<InvestorSettingsPage />} />
        <Route path="settings/:section" element={<InvestorSettingsPage />} />
        <Route path="support" element={<InvestorSupportPage />} />
        <Route path="alerts" element={<InvestorAlertsPage />} />
        <Route path="watchlist" element={<InvestorWatchlistPage />} />
        <Route path="news" element={<InvestorNewsPage />} />
        <Route path="research" element={<InvestorResearchPage />} />
      </Route>
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <InvestorAdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<InvestorAdminOverviewPage />} />
        <Route path="applicants" element={<InvestorAdminApplicantsPage />} />
        <Route path="create-user" element={<InvestorAdminCreateUserPage />} />
        <Route path="users" element={<InvestorAdminUsersPage />} />
        <Route path="orders" element={<InvestorAdminOrdersPage />} />
        <Route path="wallet-setup" element={<InvestorAdminWalletSetupPage />} />
        <Route path="wallets" element={<InvestorAdminWalletsPage />} />
        <Route path="funding" element={<InvestorAdminFundingPage />} />
        <Route path="invoices" element={<InvestorAdminInvoicesPage />} />
        <Route path="transactions" element={<InvestorAdminTransactionsPage />} />
        <Route path="email-templates" element={<InvestorAdminEmailTemplatePage />} />
        <Route path="assets" element={<InvestorAdminAssetsPage />} />
        <Route path="support" element={<InvestorAdminSupportPage />} />
        <Route path="kyc" element={<InvestorAdminKycPage />} />
        <Route path="strategies" element={<InvestorAdminStrategiesPage />} />
        <Route path="risk" element={<InvestorAdminRiskPage />} />
        <Route path="crm-leads" element={<InvestorAdminCrmLeadsPage />} />
        <Route path="crm-imports" element={<InvestorAdminCrmImportsPage />} />
        <Route path="crm-campaigns" element={<InvestorAdminCrmCampaignsPage />} />
        <Route path="audit" element={<InvestorAdminAuditPage />} />
        <Route path="settings" element={<InvestorAdminSettingsPage />} />
      </Route>
      <Route
        path="/"
        element={
          user ? (
            isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/workspace/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function SafeguardApp() {
  return (
    <ThemeProvider>
      <InvestorAuthProvider>
        <SafeguardRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--sg-bg-elevated)',
              color: 'var(--sg-text)',
              border: '1px solid var(--sg-border)',
              fontFamily: 'var(--sg-font-body)',
            },
          }}
        />
      </InvestorAuthProvider>
    </ThemeProvider>
  );
}
