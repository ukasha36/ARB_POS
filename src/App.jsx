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
import { CapitalEntryPage } from "./pages/operations/CapitalEntryPage";
import { PurchaseEntryPage } from "./pages/operations/PurchaseEntryPage";
import { PurchaseReturnPage } from "./pages/operations/PurchaseReturnPage";
import { SalesBillingPage } from "./pages/operations/SalesBillingPage";
import { SalesReturnPage } from "./pages/operations/SalesReturnPage";
import { IncomingTransactionPage } from "./pages/operations/IncomingTransactionPage";
import { OutgoingTransactionPage } from "./pages/operations/OutgoingTransactionPage";

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
      case "welcome":
        return <WelcomePage />;
      case "dashboard":
        return <DashboardPage />;
      case "setup-accounts":
        return <ChartOfAccountsPage />;
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
