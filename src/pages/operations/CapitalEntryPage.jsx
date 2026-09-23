import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Save,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  History,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { TransactionHistoryTable } from "../../components/transactions/TransactionHistoryTable";
import { api } from "../../services/api";
import {
  formatCurrency,
  safeNum,
  safeStr,
  safeId,
} from "../../utils/formatters";

export function CapitalEntryPage() {
  const [capitalAccounts, setCapitalAccounts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [selectedCapitalAccountId, setSelectedCapitalAccountId] = useState("");
  const [activeTab, setActiveTab] = useState("investment");

  // Investment form
  const [invDate, setInvDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [invAmount, setInvAmount] = useState("");
  const [invCashBankAccountId, setInvCashBankAccountId] = useState("");
  const [invReference, setInvReference] = useState("");
  const [invDescription, setInvDescription] = useState(
    "Capital Investment Contribution",
  );

  // Withdrawal form
  const [wdDate, setWdDate] = useState(new Date().toISOString().split("T")[0]);
  const [wdAmount, setWdAmount] = useState("");
  const [wdCashBankAccountId, setWdCashBankAccountId] = useState("");
  const [wdReference, setWdReference] = useState("");
  const [wdDescription, setWdDescription] = useState("Capital Withdrawal");

  // Capital summary and transactions
  const [capitalSummary, setCapitalSummary] = useState(null);
  const [capitalTransactions, setCapitalTransactions] = useState([]);
  const [capitalLoading, setCapitalLoading] = useState(false);

  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedCapitalAccountId) {
      loadCapitalData(selectedCapitalAccountId);
    }
  }, [selectedCapitalAccountId]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await api.accounts.list({});
      if (res.success && res.data) {
        const cb = res.data.filter(
          (a) => a.account_type === "CASH" || a.account_type === "BANK",
        );
        const cap = res.data.filter((a) => a.account_type === "CAPITAL");
        setCashBankAccounts(cb);
        setCapitalAccounts(cap);
        if (cb.length) setInvCashBankAccountId(cb[0].id);
        if (cap.length) setSelectedCapitalAccountId(cap[0].id);
        if (cb.length) setWdCashBankAccountId(cb[0].id);
      }
    } catch (err) {
      console.error("Failed to load accounts for Capital Entry", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadCapitalData = async (capitalAccountId) => {
    setCapitalLoading(true);
    try {
      const [summaryRes, transactionsRes] = await Promise.all([
        api.accounts.getCapitalSummary(capitalAccountId),
        api.accounts.listCapitalTransactions(capitalAccountId),
      ]);
      if (summaryRes.success) setCapitalSummary(summaryRes.data);
      if (transactionsRes.success) setCapitalTransactions(transactionsRes.data);
    } catch (err) {
      console.error("Failed to load capital data:", err);
    } finally {
      setCapitalLoading(false);
    }
  };

  const handlePostInvestment = async (e) => {
    e.preventDefault();
    if (!selectedCapitalAccountId) {
      setStatus({ type: "error", text: "Please select a Capital Account." });
      return;
    }
    const numAmount = parseFloat(invAmount);
    if (!numAmount || numAmount <= 0) {
      setStatus({
        type: "error",
        text: "Please enter a valid positive amount.",
      });
      return;
    }
    if (!invCashBankAccountId) {
      setStatus({ type: "error", text: "Please select a Cash/Bank account." });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      const transactionData = {
        entry_type: "CAPITAL",
        date: invDate,
        description: invDescription,
        reference_no: invReference || `CAP-${Date.now().toString().slice(-4)}`,
        debit_lines: [
          {
            account_id: parseInt(invCashBankAccountId, 10),
            amount: numAmount,
          },
        ],
        credit_lines: [
          {
            account_id: parseInt(selectedCapitalAccountId, 10),
            amount: numAmount,
          },
        ],
      };

      const res = editingEntryId
        ? await api.transactions.edit(editingEntryId, transactionData)
        : await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: "success",
          text: editingEntryId
            ? `Capital entry updated! ${formatCurrency(numAmount)} (Ref: ${transactionData.reference_no})`
            : `Capital investment posted! ${formatCurrency(numAmount)} added. (Ref: ${transactionData.reference_no})`,
        });
        setEditingEntryId(null);
        setInvAmount("");
        setInvReference("");
        await loadCapitalData(selectedCapitalAccountId);
      } else {
        setStatus({
          type: "error",
          text: res.error || "Failed to post capital investment",
        });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setPosting(false);
    }
  };

  const handlePostWithdrawal = async (e) => {
    e.preventDefault();
    if (!selectedCapitalAccountId) {
      setStatus({ type: "error", text: "Please select a Capital Account." });
      return;
    }
    const numAmount = parseFloat(wdAmount);
    if (!numAmount || numAmount <= 0) {
      setStatus({
        type: "error",
        text: "Please enter a valid positive amount.",
      });
      return;
    }
    if (!wdCashBankAccountId) {
      setStatus({ type: "error", text: "Please select a Cash/Bank account." });
      return;
    }
    if (capitalSummary && numAmount > capitalSummary.currentCapital) {
      setStatus({
        type: "error",
        text: `Withdrawal amount exceeds current capital of ${formatCurrency(capitalSummary.currentCapital)}.`,
      });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      const transactionData = {
        entry_type: "CAPITAL_WITHDRAWAL",
        date: wdDate,
        description: wdDescription,
        reference_no: wdReference || `CW-${Date.now().toString().slice(-4)}`,
        debit_lines: [
          {
            account_id: parseInt(selectedCapitalAccountId, 10),
            amount: numAmount,
          },
        ],
        credit_lines: [
          {
            account_id: parseInt(wdCashBankAccountId, 10),
            amount: numAmount,
          },
        ],
      };

      const res = editingEntryId
        ? await api.transactions.edit(editingEntryId, transactionData)
        : await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: "success",
          text: editingEntryId
            ? `Capital entry updated! ${formatCurrency(numAmount)} withdrawn. (Ref: ${transactionData.reference_no})`
            : `Capital withdrawal posted! ${formatCurrency(numAmount)} withdrawn. (Ref: ${transactionData.reference_no})`,
        });
        setEditingEntryId(null);
        setWdAmount("");
        setWdReference("");
        await loadCapitalData(selectedCapitalAccountId);
      } else {
        setStatus({
          type: "error",
          text: res.error || "Failed to post capital withdrawal",
        });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setPosting(false);
    }
  };

  const selectedCapitalAccount = capitalAccounts.find(
    (a) => a.id === selectedCapitalAccountId,
  );

  const [voidConfirm, setVoidConfirm] = useState({ isOpen: false, tx: null });

  const handleEditTransaction = async (tx) => {
    try {
      const res = await api.transactions.get(tx.entry_id);
      if (res.success && res.data) {
        const fullTx = res.data;
        const debitLines = fullTx.debit_lines || [];
        const creditLines = fullTx.credit_lines || [];
        const amount = safeNum(fullTx.total_amount);

        setEditingEntryId(tx.entry_id);

        if (fullTx.entry_type === "CAPITAL") {
          setActiveTab("investment");
          setInvDate(safeStr(fullTx.date));
          setInvAmount(amount > 0 ? amount.toString() : "");
          setInvReference(safeStr(fullTx.reference_no));
          setInvDescription(safeStr(fullTx.description));
          if (creditLines.length > 0) {
            setSelectedCapitalAccountId(safeId(creditLines[0].account_id));
          }
          if (debitLines.length > 0) {
            setInvCashBankAccountId(safeId(debitLines[0].account_id));
          }
        } else if (fullTx.entry_type === "CAPITAL_WITHDRAWAL") {
          setActiveTab("withdrawal");
          setWdDate(safeStr(fullTx.date));
          setWdAmount(amount > 0 ? amount.toString() : "");
          setWdReference(safeStr(fullTx.reference_no));
          setWdDescription(safeStr(fullTx.description));
          if (debitLines.length > 0) {
            setSelectedCapitalAccountId(safeId(debitLines[0].account_id));
          }
          if (creditLines.length > 0) {
            setWdCashBankAccountId(safeId(creditLines[0].account_id));
          }
        }
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    }
  };

  const handleVoidTransaction = (tx) => {
    setVoidConfirm({ isOpen: true, tx });
  };

  const confirmVoid = async () => {
    const tx = voidConfirm.tx;
    setVoidConfirm({ isOpen: false, tx: null });
    try {
      const res = await api.transactions.void(tx.entry_id);
      if (res.success) {
        setStatus({ type: "success", text: res.message });
        if (selectedCapitalAccountId) loadCapitalData(selectedCapitalAccountId);
      } else {
        setStatus({
          type: "error",
          text: res.error || "Failed to void transaction",
        });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-4 max-w-6xl select-none">
      {/* Header */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">CAPITAL ENTRY</h3>
            <p className="text-[11px] text-[#64748B]">
              Manage capital investments, withdrawals, and view capital account
              summary
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={() => {
            loadAccounts();
            if (selectedCapitalAccountId)
              loadCapitalData(selectedCapitalAccountId);
          }}
          disabled={loadingAccounts || capitalLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Account Selector */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
              Capital Account
            </label>
            {loadingAccounts ? (
              <div className="text-[11px] text-[#64748B]">
                Loading accounts...
              </div>
            ) : (
              <select
                value={selectedCapitalAccountId}
                onChange={(e) => setSelectedCapitalAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
              >
                {capitalAccounts.length === 0 ? (
                  <option value="">No capital accounts found</option>
                ) : (
                  capitalAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.title}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
              Cash/Bank Accounts
            </label>
            {loadingAccounts ? (
              <div className="text-[11px] text-[#64748B]">
                Loading accounts...
              </div>
            ) : (
              <select
                value={
                  activeTab === "investment"
                    ? invCashBankAccountId
                    : wdCashBankAccountId
                }
                onChange={(e) => {
                  if (activeTab === "investment")
                    setInvCashBankAccountId(e.target.value);
                  else setWdCashBankAccountId(e.target.value);
                }}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
              >
                {cashBankAccounts.length === 0 ? (
                  <option value="">No cash/bank accounts found</option>
                ) : (
                  cashBankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.title} ({a.account_type})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div
          className={`p-3 rounded-[3px] text-xs font-semibold border flex items-center gap-2 ${
            status.type === "success"
              ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
              : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#DC2626]" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Investment & Withdrawal Forms */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-[#F8FAFC] p-1 rounded-[3px] border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setActiveTab("investment")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-[3px] transition-colors flex items-center justify-center gap-1 ${
                activeTab === "investment"
                  ? "bg-[#2563EB] text-white"
                  : "text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Investment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("withdrawal")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-[3px] transition-colors flex items-center justify-center gap-1 ${
                activeTab === "withdrawal"
                  ? "bg-[#DC2626] text-white"
                  : "text-[#64748B] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
              }`}
            >
              <TrendingDown className="w-3 h-3" />
              Withdrawal
            </button>
          </div>

          {/* Investment Form */}
          {activeTab === "investment" && (
            <form
              onSubmit={handlePostInvestment}
              className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                <h4 className="text-xs font-bold text-[#0F172A]">
                  CAPITAL INVESTMENT
                </h4>
                <p className="text-[10px] text-[#64748B] mt-0.5 block">
                  Dr: Cash/Bank, Cr: Capital
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={invDate}
                  onChange={(e) => setInvDate(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Reference / Voucher #
                </label>
                <input
                  type="text"
                  value={invReference}
                  onChange={(e) => setInvReference(e.target.value)}
                  placeholder="e.g. CAP-2026-01"
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Amount (PKR / Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Description / Memo
                </label>
                <input
                  type="text"
                  value={invDescription}
                  onChange={(e) => setInvDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={Save}
                  disabled={posting || !selectedCapitalAccountId}
                >
                  {posting ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          )}

          {/* Withdrawal Form */}
          {activeTab === "withdrawal" && (
            <form
              onSubmit={handlePostWithdrawal}
              className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                <TrendingDown className="w-4 h-4 text-[#DC2626]" />
                <h4 className="text-xs font-bold text-[#0F172A]">
                  CAPITAL WITHDRAWAL
                </h4>
                <p className="text-[10px] text-[#64748B] mt-0.5 block">
                  Dr: Capital, Cr: Cash/Bank
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={wdDate}
                  onChange={(e) => setWdDate(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Reference / Voucher #
                </label>
                <input
                  type="text"
                  value={wdReference}
                  onChange={(e) => setWdReference(e.target.value)}
                  placeholder="e.g. CW-2026-01"
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Amount (PKR / Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={wdAmount}
                  onChange={(e) => setWdAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {capitalSummary && (
                <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                  <div className="text-[10px] text-[#64748B]">
                    Current Capital
                  </div>
                  <div className="text-sm font-bold font-mono text-[#0F172A]">
                    {formatCurrency(capitalSummary.currentCapital)}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Description / Memo
                </label>
                <input
                  type="text"
                  value={wdDescription}
                  onChange={(e) => setWdDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  icon={Save}
                  disabled={posting || !selectedCapitalAccountId}
                >
                  {posting ? "Saving..." : "Save Withdrawal"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Capital Summary & Transaction History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#FEF3C7] rounded text-[#92400E]">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    CAPITAL SUMMARY
                  </h4>
                  {selectedCapitalAccount && (
                    <p className="text-[11px] text-[#64748B]">
                      {selectedCapitalAccount.title} [
                      {selectedCapitalAccount.code}]
                    </p>
                  )}
                </div>
              </div>
              {selectedCapitalAccountId && (
                <button
                  type="button"
                  onClick={() => loadCapitalData(selectedCapitalAccountId)}
                  className="p-1 text-[#64748B] hover:text-[#2563EB] rounded"
                  disabled={capitalLoading}
                >
                  <RefreshCw
                    className={`w-3 h-3 ${capitalLoading ? "animate-spin" : ""}`}
                  />
                </button>
              )}
            </div>

            {capitalLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#2563EB] border-t-transparent"></div>
                <span className="ml-2 text-[11px] text-[#64748B]">
                  Loading capital data...
                </span>
              </div>
            ) : capitalSummary ? (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#EFF6FF] p-3 rounded-[3px] border border-[#BFDBFE]">
                  <div className="text-[10px] font-bold uppercase text-[#2563EB] mb-0.5">
                    Opening Equity
                  </div>
                  <div className="text-sm font-bold font-mono text-[#0F172A]">
                    {formatCurrency(capitalSummary.openingEquity)}
                  </div>
                </div>
                <div className="bg-[#DCFCE7] p-3 rounded-[3px] border border-[#86EFAC]">
                  <div className="text-[10px] font-bold uppercase text-[#166534] mb-0.5">
                    Total Invested
                  </div>
                  <div className="text-sm font-bold font-mono text-[#16A34A]">
                    {formatCurrency(capitalSummary.totalInvested)}
                  </div>
                </div>
                <div className="bg-[#FEF2F2] p-3 rounded-[3px] border border-[#FCA5A5]">
                  <div className="text-[10px] font-bold uppercase text-[#DC2626] mb-0.5">
                    Total Withdrawn
                  </div>
                  <div className="text-sm font-bold font-mono text-[#DC2626]">
                    {formatCurrency(capitalSummary.totalWithdrawn)}
                  </div>
                </div>
                <div className="bg-[#F0FDF4] p-3 rounded-[3px] border border-[#86EFAC]">
                  <div className="text-[10px] font-bold uppercase text-[#16A34A] mb-0.5">
                    Current Capital
                  </div>
                  <div className="text-sm font-bold font-mono text-[#0F172A]">
                    {formatCurrency(capitalSummary.currentCapital)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-[11px] text-[#94A3B8] py-4">
                {selectedCapitalAccountId
                  ? "No capital data available for selected account"
                  : "Select a capital account to view summary"}
              </p>
            )}
          </div>

          {/* Transaction History */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-[#64748B]" />
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                CAPITAL TRANSACTIONS
              </h4>
            </div>

            {capitalLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2563EB] border-t-transparent"></div>
                <span className="ml-2 text-[11px] text-[#64748B]">
                  Loading transactions...
                </span>
              </div>
            ) : !selectedCapitalAccountId ? (
              <p className="text-center text-[11px] text-[#94A3B8] py-4">
                Select a capital account to view transactions
              </p>
            ) : (
              <TransactionHistoryTable
                records={capitalTransactions}
                loading={false}
                onEdit={handleEditTransaction}
                onVoid={handleVoidTransaction}
              />
            )}
          </div>
        </div>
      </div>

      {voidConfirm.isOpen && voidConfirm.tx && (
        <Modal
          title="Confirm Void"
          isOpen={voidConfirm.isOpen}
          onClose={() => setVoidConfirm({ isOpen: false, tx: null })}
          width="max-w-sm"
        >
          <div className="p-4">
            <p className="text-xs text-[#475569] mb-2">
              Void {voidConfirm.tx.entry_type} "{voidConfirm.tx.reference_no}"?
              This reverses all effects and cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVoidConfirm({ isOpen: false, tx: null })}
              >
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirmVoid}>
                Void Transaction
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
