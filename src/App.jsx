import React, { Suspense, lazy } from "react";
import { ConfigProvider, Spin } from "antd";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginModal } from "./components/auth/LoginModal";
import { EditProfileModal } from "./components/auth/EditProfileModal";
import { WelcomePage } from "./pages/WelcomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

// Lazy load all Setup pages
const ChartOfAccountsPage = lazy(() => import("./pages/setups/ChartOfAccountsPage").then(m => ({ default: m.ChartOfAccountsPage })));
const ItemManagementPage = lazy(() => import("./pages/setups/ItemManagementPage").then(m => ({ default: m.ItemManagementPage })));
const AreaPage = lazy(() => import("./pages/setups/AreaPage").then(m => ({ default: m.AreaPage })));
const SubAreaPage = lazy(() => import("./pages/setups/SubAreaPage").then(m => ({ default: m.SubAreaPage })));
const SupplierPage = lazy(() => import("./pages/setups/SupplierPage").then(m => ({ default: m.SupplierPage })));
const SalesmanPage = lazy(() => import("./pages/setups/SalesmanPage").then(m => ({ default: m.SalesmanPage })));
const WeightedAverageSettingsPage = lazy(() => import("./pages/setups/WeightedAverageSettingsPage").then(m => ({ default: m.WeightedAverageSettingsPage })));

// Lazy load all Operational pages
const CapitalEntryPage = lazy(() => import("./pages/operations/CapitalEntryPage").then(m => ({ default: m.CapitalEntryPage })));
const PurchaseEntryPage = lazy(() => import("./pages/operations/PurchaseEntryPage").then(m => ({ default: m.PurchaseEntryPage })));
const PurchaseReturnPage = lazy(() => import("./pages/operations/PurchaseReturnPage").then(m => ({ default: m.PurchaseReturnPage })));
const SalesBillingPage = lazy(() => import("./pages/operations/SalesBillingPage").then(m => ({ default: m.SalesBillingPage })));
const SalesReturnPage = lazy(() => import("./pages/operations/SalesReturnPage").then(m => ({ default: m.SalesReturnPage })));
const IncomingTransactionPage = lazy(() => import("./pages/operations/IncomingTransactionPage").then(m => ({ default: m.IncomingTransactionPage })));
const OutgoingTransactionPage = lazy(() => import("./pages/operations/OutgoingTransactionPage").then(m => ({ default: m.OutgoingTransactionPage })));

// Lazy load all Report pages
const ProfitReportPage = lazy(() => import("./pages/reports/ProfitReportPage").then(m => ({ default: m.ProfitReportPage })));
const PurchaseReportPage = lazy(() => import("./pages/reports/PurchaseReportPage").then(m => ({ default: m.PurchaseReportPage })));
const PurchaseReturnReportPage = lazy(() => import("./pages/reports/PurchaseReturnReportPage").then(m => ({ default: m.PurchaseReturnReportPage })));
const SalesReportPage = lazy(() => import("./pages/reports/SalesReportPage").then(m => ({ default: m.SalesReportPage })));
const SalesReturnReportPage = lazy(() => import("./pages/reports/SalesReturnReportPage").then(m => ({ default: m.SalesReturnReportPage })));
const StockAnalyticsPage = lazy(() => import("./pages/reports/StockAnalyticsPage").then(m => ({ default: m.StockAnalyticsPage })));
const GeneralLedgerPage = lazy(() => import("./pages/reports/GeneralLedgerPage").then(m => ({ default: m.GeneralLedgerPage })));
const CustomerLedgerPage = lazy(() => import("./pages/reports/CustomerLedgerPage").then(m => ({ default: m.CustomerLedgerPage })));
const SupplierLedgerPage = lazy(() => import("./pages/reports/SupplierLedgerPage").then(m => ({ default: m.SupplierLedgerPage })));
const AccountStatementPage = lazy(() => import("./pages/reports/AccountStatementPage").then(m => ({ default: m.AccountStatementPage })));

import { useNavigationStore } from "./store/useNavigationStore";
import { useAuthStore } from "./store/useAuthStore";

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <Spin size="large" tip="Loading..." />
  </div>
);

// Ant Design Light Blue Theme customization
const antdTheme = {
  token: {
    colorPrimary: "#40403E",
    colorSuccess: "#16A34A",
    colorWarning: "#D97706",
    colorError: "#DC2626",
    colorInfo: "#3B82F6",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#F8FAFC",
    borderRadius: 3,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: 13,
  },
};

export default function App() {
  const { activeModuleId } = useNavigationStore();
  const { isAuthenticated } = useAuthStore();

  const renderActiveModule = () => {
    switch (activeModuleId) {
      // ── General ────────────────────────────────────────────
      case "welcome":
        return <WelcomePage />;
      case "dashboard":
        return <DashboardPage />;

      // ── Setups ─────────────────────────────────────────────
      case "setup-accounts":
        return <ChartOfAccountsPage />;
      case "setup-items":
        return <ItemManagementPage />;
      case "setup-area":
        return <AreaPage />;
      case "setup-sub-area":
        return <SubAreaPage />;
      case "setup-firm-suppliers":
        return <SupplierPage />;
      case "setup-salesmen":
        return <SalesmanPage />;
      case "setup-weighted-average":
        return <WeightedAverageSettingsPage />;

      // ── Daily Operations ───────────────────────────────────
      case "ops-capital-entry":
        return <CapitalEntryPage />;
      case "ops-purchase-entry":
        return <PurchaseEntryPage />;
      case "ops-purchase-return":
        return <PurchaseReturnPage />;
      case "ops-sales-billing":
        return <SalesBillingPage />;
      case "ops-sales-return":
        return <SalesReturnPage />;
      case "ops-receipt-voucher":
        return <IncomingTransactionPage />;
      case "ops-payment-voucher":
        return <OutgoingTransactionPage />;

      // ── Reports ────────────────────────────────────────────
      case "rep-profit":
        return <ProfitReportPage />;
      case "rep-purchase":
        return <PurchaseReportPage />;
      case "rep-purchase-return":
        return <PurchaseReturnReportPage />;
      case "rep-sales":
        return <SalesReportPage />;
      case "rep-sales-return":
        return <SalesReturnReportPage />;
      case "rep-stock-analytics":
        return <StockAnalyticsPage />;
      case "rep-accounts":
        return <GeneralLedgerPage />;
      case "rep-general-ledger":
        return <GeneralLedgerPage />;
      case "rep-customer-ledger":
        return <CustomerLedgerPage />;
      case "rep-supplier-ledger":
        return <SupplierLedgerPage />;
      case "rep-account-statement":
        return <AccountStatementPage />;

      default:
        return <PlaceholderPage />;
    }
  };


  return (
    <ConfigProvider theme={antdTheme}>
      {!isAuthenticated ? (
        /* Render ONLY the isolated Login screen when unauthenticated */
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center">
          <LoginModal isOpen={true} />
        </div>
      ) : (
        /* Render Application Layout ONLY after successful login */
        <>
          <AppLayout>
            <Suspense fallback={<PageLoadingFallback />}>
              {renderActiveModule()}
            </Suspense>
          </AppLayout>
          <EditProfileModal />
        </>
      )}
    </ConfigProvider>
  );
}
