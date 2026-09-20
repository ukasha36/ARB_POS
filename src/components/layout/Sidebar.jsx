import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  Package,
  UserCheck,
  Sliders,
  Tag,
  Receipt,
  ShoppingCart,
  RotateCcw,
  CreditCard,
  Calculator,
  TrendingUp,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  DollarSign,
  UserCog,
  Home,
} from "lucide-react";
import { useNavigationStore } from "../../store/useNavigationStore";
import { useAuthStore } from "../../store/useAuthStore";
import logo from "../../assets/logo.png";

export function Sidebar() {
  const { activeModuleId, expandedNodes, setActiveModule, toggleNodeExpand } =
    useNavigationStore();
  const { currentUser, setEditProfileOpen } = useAuthStore();

  const navTree = [
    {
      id: "welcome",
      title: "Welcome Page",
      category: "GENERAL",
      icon: Home,
      isRootPage: true,
    },
    {
      id: "dashboard",
      title: "Dashboard Overview",
      category: "GENERAL",
      icon: LayoutDashboard,
      isRootPage: true,
    },
    {
      key: "SETUPS",
      title: "SETUPS",
      items: [
        {
          id: "setup-accounts",
          title: "Accounts",
          category: "SETUPS",
          icon: Users,
        },
        { id: "setup-area", title: "Area", category: "SETUPS", icon: MapPin },
        {
          id: "setup-sub-area",
          title: "Sub Area",
          category: "SETUPS",
          icon: MapPin,
        },
        {
          id: "setup-firm-suppliers",
          title: "Firm / Suppliers",
          category: "SETUPS",
          icon: Building2,
        },
        {
          id: "setup-items",
          title: "Items",
          category: "SETUPS",
          icon: Package,
        },
        {
          id: "setup-salesmen",
          title: "Salesmen",
          category: "SETUPS",
          icon: UserCheck,
        },
        {
          id: "setup-weighted-average",
          title: "Weighted Average Settings",
          category: "SETUPS",
          icon: Sliders,
        },
      ],
    },
    {
      key: "DAILY_OPERATIONS",
      title: "DAILY OPERATIONS",
      items: [
        {
          id: "ops-capital-entry",
          title: "Capital Entry",
          category: "DAILY OPERATIONS",
          icon: DollarSign,
        },
        {
          id: "ops-purchase-entry",
          title: "Purchase Entry",
          category: "DAILY OPERATIONS",
          icon: ShoppingCart,
        },
        {
          id: "ops-purchase-return",
          title: "Purchase Return",
          category: "DAILY OPERATIONS",
          icon: RotateCcw,
        },
        {
          id: "ops-sales-billing",
          title: "Sales Counter Billing",
          category: "DAILY OPERATIONS",
          icon: Calculator,
        },
        {
          id: "ops-sales-return",
          title: "Sales Return / Credit Note",
          category: "DAILY OPERATIONS",
          icon: RotateCcw,
        },
        {
          id: "ops-receipt-voucher",
          title: "Receipt Voucher (Incoming)",
          category: "DAILY OPERATIONS",
          icon: CreditCard,
        },
        {
          id: "ops-payment-voucher",
          title: "Payment Voucher (Outgoing)",
          category: "DAILY OPERATIONS",
          icon: Receipt,
        },
        // {
        //   id: "ops-offer-list",
        //   title: "Offer List",
        //   category: "DAILY OPERATIONS",
        //   icon: Tag,
        // },
      ],
    },
    {
      key: "REPORTS",
      title: "REPORTS",
      items: [
        {
          id: "rep-accounts",
          title: "Accounts",
          category: "REPORTS",
          icon: FileSpreadsheet,
        },
        {
          id: "rep-general-ledger",
          title: "General Ledger",
          category: "REPORTS",
          icon: FileSpreadsheet,
        },
        {
          id: "rep-customer-ledger",
          title: "Customer Ledger (Receivable)",
          category: "REPORTS",
          icon: Users, // already imported
        },
        {
          id: "rep-supplier-ledger",
          title: "Supplier Ledger (Payable)",
          category: "REPORTS",
          icon: Building2, // already imported
        },
        {
          id: "rep-account-statement",
          title: "Account Statement",
          category: "REPORTS",
          icon: FileSpreadsheet,
        },
        {
          id: "rep-profit",
          title: "Profit",
          category: "REPORTS",
          icon: TrendingUp,
        },
        {
          id: "rep-purchase",
          title: "Purchase",
          category: "REPORTS",
          icon: BarChart3,
        },
        {
          id: "rep-purchase-return",
          title: "Purchase Return",
          category: "REPORTS",
          icon: RotateCcw,
        },
        {
          id: "rep-sales",
          title: "Sales",
          category: "REPORTS",
          icon: PieChart,
        },
        {
          id: "rep-sales-return",
          title: "Sales Return",
          category: "REPORTS",
          icon: RotateCcw,
        },
        {
          id: "rep-stock-analytics",
          title: "Stock Analytics",
          category: "REPORTS",
          icon: BarChart3,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col h-full select-none text-xs">
      {/* Sidebar Top Client Logo Banner */}
      <div className="bg-white px-3 py-2.5 border-b border-[#E2E8F0] flex items-center gap-2.5 shadow-2xs">
        <div className="bg-[#EFF6FF] p-1 rounded border border-[#BFDBFE] shrink-0">
          <img
            src={logo}
            alt="ARB Communication Logo"
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-[#0F172A] text-xs truncate leading-tight">
            ARB Communication
          </h1>
        </div>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {navTree.map((section) => {
          if (section.isRootPage) {
            const Icon = section.icon;
            const isActive = activeModuleId === section.id;
            return (
              <button
                key={section.id}
                onClick={() =>
                  setActiveModule(section.id, section.title, section.category)
                }
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] font-semibold text-xs transition-colors ${
                  isActive
                    ? "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] shadow-2xs"
                    : "text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-[#2563EB]" : "text-[#64748B]"}`}
                />
                <span>{section.title}</span>
              </button>
            );
          }

          const isExpanded = expandedNodes[section.key];

          return (
            <div key={section.key} className="mt-2">
              {/* Category Node */}
              <button
                onClick={() => toggleNodeExpand(section.key)}
                className="w-full flex items-center justify-between px-2 py-1.5 font-bold text-[11px] text-[#475569] uppercase tracking-wider bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-[3px] border border-[#E2E8F0] transition-colors"
              >
                <span className="flex items-center gap-1.5 text-[#1E293B]">
                  <Folder className="w-3.5 h-3.5 text-[#3B82F6]" />
                  {section.title}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                )}
              </button>

              {/* Child Leaf Nodes */}
              {isExpanded && (
                <div className="ml-3 pl-2 mt-1 space-y-0.5 border-l-2 border-[#E2E8F0]">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = activeModuleId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          setActiveModule(item.id, item.title, item.category)
                        }
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-[3px] text-xs transition-colors ${
                          isActive
                            ? "bg-[#EFF6FF] text-[#1D4ED8] font-bold border-l-2 border-[#2563EB]"
                            : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                        }`}
                      >
                        <ItemIcon
                          className={`w-3.5 h-3.5 ${isActive ? "text-[#2563EB]" : "text-[#94A3B8]"}`}
                        />
                        <span className="truncate">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: User Profile & Quick Edit */}
      <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center justify-between p-1.5 bg-white border border-[#E2E8F0] rounded-[4px] shadow-2xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0 border border-[#BFDBFE]">
              {currentUser?.displayName
                ? currentUser.displayName[0].toUpperCase()
                : "U"}
            </div>
            <div className="overflow-hidden leading-tight">
              <div className="text-[11px] font-bold text-[#0F172A] truncate">
                {currentUser?.displayName || "ARB Communication"}
              </div>
              <div className="text-[10px] text-[#64748B] truncate">
                @{currentUser?.username || "admin"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditProfileOpen(true)}
            title="Edit Profile (User, Username, Password)"
            className="flex items-center gap-1 px-1.5 py-1 rounded bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-[10px] font-semibold transition-colors cursor-pointer border border-[#BFDBFE]"
          >
            <UserCog className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Edit</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
