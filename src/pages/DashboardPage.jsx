import React, { useState, useEffect } from "react";
import {
  DollarSign,
  FileCheck,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "../components/common/Card";
import { TableWrapper } from "../components/common/TableWrapper";
import { Button } from "../components/common/Button";
import { api } from "../services/api";
import { formatCurrency } from "../utils/formatters";
import logo from "../assets/logo.png";

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [showValues, setShowValues] = useState(false);
  const [customVisibility, setCustomVisibility] = useState({});

  const isValueVisible = (key) =>
    customVisibility[key] !== undefined ? customVisibility[key] : showValues;

  const toggleCard = (key) =>
    setCustomVisibility((prev) => ({
      ...prev,
      [key]: !isValueVisible(key),
    }));

  const toggleAllValues = () => {
    const next = !showValues;
    setShowValues(next);
    setCustomVisibility({});
  };

  // Start at zero — no demo/fake figures for client delivery
  const [data, setData] = useState({
    metrics: {
      totalStockValue: 0,
      postDatedChequesPending: { count: 0, amount: 0 },
      accountsReceivable: 0,
      accountsPayable: 0,
    },
    recentTransactions: [],
    generalLedger: [],
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.getOverview();
      if (res.success && res.data) {
        const m = res.data.metrics || {};
        setData({
          metrics: {
            totalStockValue: Number(m.totalStockValue) || 0,
            postDatedChequesPending: {
              count: Number(m.postDatedChequesPending?.count) || 0,
              amount: Number(m.postDatedChequesPending?.amount) || 0,
            },
            accountsReceivable: Number(m.accountsReceivable) || 0,
            accountsPayable: Number(m.accountsPayable) || 0,
          },
          recentTransactions: res.data.recentTransactions || [],
          generalLedger: res.data.generalLedger || [],
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard overview", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Simple desi-friendly labels for transaction types
  const typeLabel = (type) => {
    const map = {
      SALE: "Sale",
      PURCHASE: "Purchase  ",
      HO_INCOMING: "Receipt (Customer se paise)",
      HO_OUTGOING: "Payment (Supplier ko paise)",
      CAPITAL: "Capital (Owner investment)",
      SALES_RETURN: "Sale Return",
      PURCHASE_RETURN: "Purchase Return",
      RECEIPT: "Receipt (Customer se paise)",
      PAYMENT: "Payment (Supplier ko paise)",
    };
    return map[type] || type || "—";
  };

  const statusLabel = (status) => {
    if (!status) return "—";
    const s = String(status).toLowerCase();
    if (s === "posted" || s === "completed") return "Done";
    if (s === "draft") return "Draft";
    return status;
  };

  const transactionColumns = [
    {
      header: "Bill / Ref #",
      accessorKey: "id",
      cell: (info) => (
        <span className="font-mono text-[#2563EB] font-bold">
          {info.row.original.reference_no || info.getValue() || "—"}
        </span>
      ),
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: (info) => (
        <span className="text-[#0F172A]">{info.getValue() || "—"}</span>
      ),
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: (info) => (
        <span className="font-semibold text-[#0F172A]">
          {typeLabel(info.getValue())}
        </span>
      ),
    },
    {
      header: "Party Name",
      accessorKey: "account",
      cell: (info) => (
        <span className="text-[#334155]">{info.getValue() || "—"}</span>
      ),
    },
    {
      header: "Amount (Rs.)",
      accessorKey: "amount",
      cell: (info) => (
        <span className="font-mono font-semibold text-[#0F172A]">
          {showValues ? formatCurrency(info.getValue()) : "Rs. ••••••••"}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (info) => {
        const val = info.getValue();
        const label = statusLabel(val);
        const isDone =
          String(val || "").toLowerCase() === "posted" ||
          String(val || "").toLowerCase() === "completed" ||
          label === "Done";
        const badgeColor = isDone
          ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
          : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}
          >
            {label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 select-none">
      {/* Header */}
      <div className="bg-white p-3.5 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="bg-[#EFF6FF] p-2 rounded-md border border-[#BFDBFE] shrink-0">
            <img
              src={logo}
              alt="ARB Communication Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">
              ARB Communication
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAllValues}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-semibold border transition-all cursor-pointer ${
              showValues
                ? "bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]"
                : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]"
            }`}
            title={
              showValues
                ? "Hide sensitive values from view"
                : "Reveal sensitive financial values"
            }
          >
            {showValues ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Hide Values</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[#64748B]" />
                <span>See Values</span>
              </>
            )}
          </button>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Stock Value */}
        <div className="bg-white p-3.5 rounded-[4px] border border-[#E2E8F0] border-l-4 border-l-[#2563EB] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Total Stock Value (PKR)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleCard("stock")}
                className="p-1 rounded text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                title={
                  isValueVisible("stock")
                    ? "Hide stock value"
                    : "See stock value"
                }
              >
                {isValueVisible("stock") ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="p-1.5 bg-[#EFF6FF] rounded text-[#2563EB]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold font-mono text-[#0F172A]">
              {isValueVisible("stock") ? (
                formatCurrency(data.metrics.totalStockValue)
              ) : (
                <span className="text-[#94A3B8] tracking-widest text-base">
                  Rs. ••••••••
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#16A34A] mt-0.5 font-medium">
              ● Active Inventory Valuation
            </p>
          </div>
        </div>

        {/* Post-Dated Cheques */}
        <div className="bg-white p-3.5 rounded-[4px] border border-[#E2E8F0] border-l-4 border-l-[#D97706] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Post-Dated Cheques
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleCard("cheques")}
                className="p-1 rounded text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FEF3C7] transition-colors cursor-pointer"
                title={
                  isValueVisible("cheques")
                    ? "Hide cheques amount"
                    : "See cheques amount"
                }
              >
                {isValueVisible("cheques") ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="p-1.5 bg-[#FEF3C7] rounded text-[#D97706]">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold font-mono text-[#0F172A]">
              {isValueVisible("cheques") ? (
                formatCurrency(
                  data.metrics?.postDatedChequesPending?.amount ?? 0,
                )
              ) : (
                <span className="text-[#94A3B8] tracking-widest text-base">
                  Rs. ••••••••
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#D97706] mt-0.5 font-medium">
              {data.metrics?.postDatedChequesPending?.count ?? 0} Pending
              Cheques Cleared Soon
            </p>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div className="bg-white p-3.5 rounded-[4px] border border-[#E2E8F0] border-l-4 border-l-[#16A34A] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Accounts Receivable
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleCard("receivable")}
                className="p-1 rounded text-[#94A3B8] hover:text-[#16A34A] hover:bg-[#DCFCE7] transition-colors cursor-pointer"
                title={
                  isValueVisible("receivable")
                    ? "Hide receivable amount"
                    : "See receivable amount"
                }
              >
                {isValueVisible("receivable") ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="p-1.5 bg-[#DCFCE7] rounded text-[#16A34A]">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold font-mono text-[#0F172A]">
              {isValueVisible("receivable") ? (
                formatCurrency(data.metrics.accountsReceivable)
              ) : (
                <span className="text-[#94A3B8] tracking-widest text-base">
                  Rs. ••••••••
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#16A34A] mt-0.5 font-medium">
              Customer Outstanding Balances
            </p>
          </div>
        </div>

        {/* Accounts Payable */}
        <div className="bg-white p-3.5 rounded-[4px] border border-[#E2E8F0] border-l-4 border-l-[#DC2626] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Accounts Payable
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleCard("payable")}
                className="p-1 rounded text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                title={
                  isValueVisible("payable")
                    ? "Hide payable amount"
                    : "See payable amount"
                }
              >
                {isValueVisible("payable") ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="p-1.5 bg-[#FEE2E2] rounded text-[#DC2626]">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold font-mono text-[#0F172A]">
              {isValueVisible("payable") ? (
                formatCurrency(data.metrics.accountsPayable)
              ) : (
                <span className="text-[#94A3B8] tracking-widest text-base">
                  Rs. ••••••••
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#DC2626] mt-0.5 font-medium">
              Supplier Outstanding Liabilities
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-2">
        <Card
          title="Recent Transactions"
          subtitle="Short Record of Sale, purchase, receipt and payment"
        >
          <TableWrapper
            data={data.recentTransactions}
            columns={transactionColumns}
            height="max-h-[320px]"
          />
        </Card>
      </div>
    </div>
  );
}
