import React from "react";
import {
  Calculator,
  ShoppingCart,
  Receipt,
  CreditCard,
  Users,
  LayoutDashboard,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Package,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useAuthStore } from "../store/useAuthStore";
import logo from "../assets/logo.png";

export function WelcomePage() {
  const { setActiveModule } = useNavigationStore();
  const { currentUser } = useAuthStore();

  const quickActions = [
    {
      id: "ops-sales-billing",
      title: "Sales Counter POS Billing",
      desc: "Fast retail and wholesale cashier billing with barcode scanner",
      icon: Calculator,
      category: "DAILY OPERATIONS",
      badge: "Cashier POS",
      color: "from-blue-600 to-indigo-600",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: "ops-purchase-entry",
      title: "Purchase Invoice Entry",
      desc: "Record incoming supplier stock, invoices, and payment terms",
      icon: ShoppingCart,
      category: "DAILY OPERATIONS",
      badge: "Inventory In",
      color: "from-emerald-600 to-teal-600",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      id: "ops-receipt-voucher",
      title: "Receipt Voucher (Incoming)",
      desc: "Record customer receipt payments and incoming cash/bank",
      icon: CreditCard,
      category: "DAILY OPERATIONS",
      badge: "Receivables",
      color: "from-sky-600 to-cyan-600",
      textColor: "text-sky-700",
      bgColor: "bg-sky-50",
      borderColor: "border-sky-200",
    },
    {
      id: "ops-payment-voucher",
      title: "Payment Voucher (Outgoing)",
      desc: "Record supplier payments, expenses, and outgoing cash/bank",
      icon: Receipt,
      category: "DAILY OPERATIONS",
      badge: "Payables",
      color: "from-amber-600 to-orange-600",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      id: "setup-accounts",
      title: "Chart of Accounts",
      desc: "Manage Customer, Supplier, Bank, Expense, and General Ledger accounts",
      icon: Users,
      category: "SETUPS",
      badge: "Master Setup",
      color: "from-purple-600 to-pink-600",
      textColor: "text-purple-700",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      id: "dashboard",
      title: "Financial Dashboard",
      desc: "View protected financial reports, stock valuation, and live metrics",
      icon: LayoutDashboard,
      category: "GENERAL",
      badge: "Protected",
      color: "from-slate-700 to-slate-900",
      textColor: "text-slate-700",
      bgColor: "bg-slate-100",
      borderColor: "border-slate-300",
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-between p-4 md:p-8 select-none overflow-y-auto">
      <div className="w-full max-w-4xl flex flex-col items-center text-center space-y-6 my-auto">
        {/* Big Client Logo & Hero Card */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-[#BFDBFE] shadow-sm flex flex-col items-center w-full relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#EFF6FF] rounded-full filter blur-xl opacity-70 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#EFF6FF] rounded-full filter blur-xl opacity-70 pointer-events-none" />

          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] shadow-xs mb-4">
            <img
              src={logo}
              alt="ARB Communication Logo"
              className="h-24 md:h-32 w-auto object-contain transition-transform hover:scale-105 duration-200"
            />
          </div>

          <div className="space-y-1.5 z-10">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Welcome to ARB Communication POS
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] max-w-xl mx-auto">
              Secure, double-entry synchronized inventory and accounting engine.
              Select an operation below or use the sidebar menu to begin.
            </p>
          </div>

          {/* Quick System Badge */}
          <div className="mt-5 pt-4 border-t border-[#F1F5F9] w-full flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[#475569]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              <span>
                Operator:{" "}
                <strong className="text-[#0F172A] font-semibold">
                  {currentUser?.displayName || "ARB Communication"}
                </strong>
              </span>
            </div>
            <span className="text-[#CBD5E1] hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span>
                Database:{" "}
                <strong className="text-[#0F172A] font-semibold">
                  SQLite WAL (Local)
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Launch Action Tiles */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              Quick Launch Operations
            </h2>
            <span className="text-[11px] text-[#64748B]">
              Click any card to start working
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() =>
                    setActiveModule(action.id, action.title, action.category)
                  }
                  className="group bg-white p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:shadow-md transition-all duration-150 flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div
                        className={`p-2 rounded-md ${action.bgColor} ${action.textColor} border ${action.borderColor}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] group-hover:bg-[#EFF6FF] group-hover:text-[#1D4ED8] transition-colors">
                        {action.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-[11px] text-[#64748B] line-clamp-2 mt-0.5">
                        {action.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-[#F8FAFC] flex items-center justify-between text-[11px] font-semibold text-[#2563EB] opacity-90 group-hover:opacity-100">
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer copyright note */}
      <footer className="mt-4 text-center text-[11px] text-[#94A3B8]">
        ARB Communication POS & ERP System • Production Release
      </footer>
    </div>
  );
}
