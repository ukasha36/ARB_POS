import React from "react";
import { ConfigProvider } from "antd";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginModal } from "./components/auth/LoginModal";
import { EditProfileModal } from "./components/auth/EditProfileModal";
import { WelcomePage } from "./pages/WelcomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

// Phase 2 Operational & Setup Screens
import { ChartOfAccountsPage } from "./pages/setups/ChartOfAccountsPage";
import { ItemManagementPage } from "./pages/setups/ItemManagementPage";
import { CapitalEntryPage } from "./pages/operations/CapitalEntryPage";
import { PurchaseEntryPage } from "./pages/operations/PurchaseEntryPage";
import { PurchaseReturnPage } from "./pages/operations/PurchaseReturnPage";
import { SalesBillingPage } from "./pages/operations/SalesBillingPage";
import { SalesReturnPage } from "./pages/operations/SalesReturnPage";
import { IncomingTransactionPage } from "./pages/operations/IncomingTransactionPage";
import { OutgoingTransactionPage } from "./pages/operations/OutgoingTransactionPage";

// Phase 3 Setup Screens
import { AreaPage } from "./pages/setups/AreaPage";
import { SubAreaPage } from "./pages/setups/SubAreaPage";
import { SupplierPage } from "./pages/setups/SupplierPage";
import { SalesmanPage } from "./pages/setups/SalesmanPage";
import { WeightedAverageSettingsPage } from "./pages/setups/WeightedAverageSettingsPage";

// Phase 3 Report Screens
import { ProfitReportPage } from "./pages/reports/ProfitReportPage";
import { PurchaseReportPage } from "./pages/reports/PurchaseReportPage";
import { PurchaseReturnReportPage } from "./pages/reports/PurchaseReturnReportPage";
import { SalesReportPage } from "./pages/reports/SalesReportPage";
import { SalesReturnReportPage } from "./pages/reports/SalesReturnReportPage";
import { StockAnalyticsPage } from "./pages/reports/StockAnalyticsPage";
import { GeneralLedgerPage } from "./pages/reports/GeneralLedgerPage";
import { CustomerLedgerPage } from "./pages/reports/CustomerLedgerPage";
import { SupplierLedgerPage } from "./pages/reports/SupplierLedgerPage";
import { AccountStatementPage } from "./pages/reports/AccountStatementPage";

import { useNavigationStore } from "./store/useNavigationStore";
import { useAuthStore } from "./store/useAuthStore";

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
          <AppLayout>{renderActiveModule()}</AppLayout>
          <EditProfileModal />
        </>
      )}
    </ConfigProvider>
  );
}
