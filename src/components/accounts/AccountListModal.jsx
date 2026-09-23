import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { TableWrapper } from "../common/TableWrapper";
import { api } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";
import { Search, Filter, Edit, Trash2 } from "lucide-react";

export function AccountListModal({
  isOpen,
  onClose,
  onSelectAccount,
  onRequestDelete,
}) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.accounts.list({ search, account_type: typeFilter });
      if (res.success) {
        const HIDDEN_CODES = new Set([
          "1101",
          "2001",
          "4001",
          "5001",
          "5002",
          "5003",
        ]);
        const visible = (res.data || []).filter((acc) => {
          const code = String(acc.code || "").trim();
          if (HIDDEN_CODES.has(code)) return false;
          return true;
        });
        setAccounts(visible);
      }
    } catch (err) {
      console.error("Failed to fetch accounts list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen, search, typeFilter]);

  const columns = [
    {
      header: "Code",
      accessorKey: "code",
      cell: (info) => (
        <span className="font-mono font-bold text-[#2563EB]">
          {info.getValue()}
        </span>
      ),
    },
    {
      header: "Title",
      accessorKey: "title",
      cell: (info) => (
        <span className="font-semibold text-[#0F172A]">{info.getValue()}</span>
      ),
    },
    {
      header: "Type",
      accessorKey: "account_type",
      cell: (info) => (
        <span className="text-[11px] font-medium text-[#475569]">
          {info.getValue()}
        </span>
      ),
    },
    {
      header: "Purch",
      accessorKey: "purchase_enabled",
      cell: (info) =>
        info.getValue() ? (
          <span className="text-[#16A34A] font-bold">✓</span>
        ) : (
          <span className="text-[#94A3B8]">--</span>
        ),
    },
    {
      header: "Sale",
      accessorKey: "sale_enabled",
      cell: (info) =>
        info.getValue() ? (
          <span className="text-[#16A34A] font-bold">✓</span>
        ) : (
          <span className="text-[#94A3B8]">--</span>
        ),
    },
    {
      header: "Opening Bal (PKR)",
      accessorKey: "opening_balance",
      cell: (info) => {
        const val = info.getValue() || 0;
        const type = info.row.original.opening_balance_type || "Dr";
        return (
          <span className="font-mono text-xs">
            {formatCurrency(val)} ({type})
          </span>
        );
      },
    },
    {
      header: "Credit Limit (PKR)",
      accessorKey: "credit_limit",
      cell: (info) => (
        <span className="font-mono text-xs">
          {formatCurrency(info.getValue() || 0)}
        </span>
      ),
    },
    {
      header: "Aging Days",
      accessorKey: "aging_days",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (info) => {
        const val = info.getValue();
        return (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
              val === "Active"
                ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
            }`}
          >
            {val}
          </span>
        );
      },
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (info) => {
        const record = info.row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (onSelectAccount) {
                  onSelectAccount(record);
                  onClose();
                }
              }}
              className="p-1 text-[#2563EB] hover:bg-[#EFF6FF] rounded transition-colors"
              title="View / Edit"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            {onRequestDelete && (
              <button
                type="button"
                onClick={() => onRequestDelete(record)}
                className="p-1 text-[#DC2626] hover:bg-[#FEF2F2] rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Master Chart of Accounts Directory (PKR)"
      width="max-w-4xl"
    >
      <div className="space-y-3">
        {/* Search and Filter Bar */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] p-2 border border-[#E2E8F0] rounded-[3px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by code, title, short name, or mobile..."
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#64748B]" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">All Account Types</option>
              <option value="CUSTOMER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
              <option value="EXPENSE">Expense</option>
              <option value="REVENUE">Revenue</option>
              <option value="CAPITAL">Capital</option>
              <option value="AGENT">Agent</option>
              <option value="CHEQUE_IN_HAND">Cheque in Hand</option>
              <option value="OTHER_INCOME">Other Income</option>
              <option value="INACTIVE_CUSTOMER">In Active Customer</option>
              <option value="INSURANCE_TRACKER">Insurance Tracker</option>
              <option value="SALES">Sales</option>
              <option value="PURCHASES">Purchases</option>
              <option value="HANDY_PAYABLE">Handy Payable</option>
              <option value="HANDY_RECEIVABLE">Handy Receivable</option>
            </select>
          </div>
        </div>

        {/* High Density Table */}
        <TableWrapper
          data={accounts}
          columns={columns}
          height="max-h-[400px]"
          emptyText={
            loading
              ? "Loading accounts directory..."
              : "No accounts found matching criteria"
          }
          onRowClick={(record) => {
            if (onSelectAccount) {
              onSelectAccount(record);
              onClose();
            }
          }}
        />

        <p className="text-[11px] text-[#64748B] italic text-right">
          Click any account row to load into master editor.
        </p>
      </div>
    </Modal>
  );
}
