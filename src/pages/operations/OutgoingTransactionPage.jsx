import React, { useState, useEffect } from "react";
import {
  Receipt,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  History,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { TransactionHistoryTable } from "../../components/transactions/TransactionHistoryTable";
import { api } from "../../services/api";
import { formatCurrency, entryTypeLabel, safeNum, safeStr, safeId } from "../../utils/formatters";

export function OutgoingTransactionPage() {
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [targetAccounts, setTargetAccounts] = useState([]);
  const [hasAccountsLoaded, setHasAccountsLoaded] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState(
    "Supplier Payment / Expense Payment Voucher",
  );

  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);
  const [outgoingTxns, setOutgoingTxns] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [voidConfirm, setVoidConfirm] = useState({ isOpen: false, tx: null });

  useEffect(() => {
    loadAccounts();
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const res = await api.transactions.list({ entry_type: "HO_OUTGOING" });
      if (res.success) setOutgoingTxns(res.data);
    } catch (err) {
      console.error("Failed to load outgoing transactions", err);
    }
  };

  // Party ledger side panel
  const [ledgerRecords, setLedgerRecords] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (targetAccountId) {
      loadSupplierLedger(targetAccountId);
    } else {
      setLedgerRecords([]);
      setOpeningBalance(0);
      setClosingBalance(0);
      setLedgerError(null);
    }
  }, [targetAccountId]);

  const loadAccounts = async () => {
    try {
      const res = await api.accounts.list({});
      if (res.success && res.data) {
        const cb = res.data.filter(
          (a) => a.account_type === "CASH" || a.account_type === "BANK",
        );
        const targets = res.data.filter(
          (a) =>
            a.account_type === "SUPPLIER" ||
            a.account_type === "EXPENSE" ||
            a.account_type === "PURCHASES",
        );

        setCashBankAccounts(cb);
        setTargetAccounts(targets);
        setHasAccountsLoaded(true);

        if (cb.length) setPaymentAccountId(cb[0].id);
        if (targets.length) setTargetAccountId(targets[0].id);
      }
    } catch (err) {
      console.error("Failed to load accounts for Outgoing Transaction", err);
    }
  };

  const loadSupplierLedger = async (accountId) => {
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const res = await api.reports.supplierLedger(accountId);
      if (res.success && res.data) {
        setLedgerRecords(res.data.records || []);
        setOpeningBalance(res.data.openingBalance || 0);
        setClosingBalance(res.data.closingBalance || 0);
      } else {
        setLedgerError(res.error || "Record load nahi hua");
      }
    } catch (err) {
      setLedgerError("Record load nahi hua");
    } finally {
      setLedgerLoading(false);
    }
  };

  const handlePostOutgoing = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setStatus({
        type: "error",
        text: "Please enter a valid positive payment amount.",
      });
      return;
    }

    if (!paymentAccountId || !targetAccountId) {
      setStatus({
        type: "error",
        text: "Please select Payment Cash/Bank Account and Supplier/Expense Account.",
      });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      const transactionData = {
        entry_type: "HO_OUTGOING",
        date,
        description,
        reference_no: reference || `PV-${Date.now().toString().slice(-4)}`,
        debit_lines: [
          { account_id: parseInt(targetAccountId, 10), amount: numAmount },
        ],
        credit_lines: [
          { account_id: parseInt(paymentAccountId, 10), amount: numAmount },
        ],
      };

      const res = editingEntryId
        ? await api.transactions.edit(editingEntryId, transactionData)
        : await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: "success",
          text: editingEntryId
            ? `Payment updated! ${formatCurrency(numAmount)} (Ref: ${transactionData.reference_no})`
            : `Payment save ho gaya. ${formatCurrency(numAmount)} Cash/Bank se kam. Supplier ka dena kam. Check: Supplier Ledger`,
        });
        setEditingEntryId(null);
        setAmount("");
        setReference("");
        // Refresh the party ledger
        if (targetAccountId) {
          loadSupplierLedger(targetAccountId);
        }
        loadTransactions();
      } else {
        setStatus({
          type: "error",
          text: res.error || "Failed to post payment voucher",
        });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setPosting(false);
    }
  };

  const confirmVoid = async () => {
    const tx = voidConfirm.tx;
    setVoidConfirm({ isOpen: false, tx: null });
    try {
      const res = await api.transactions.void(tx.entry_id);
      if (res.success) {
        setStatus({ type: "success", text: res.message });
        loadTransactions();
        if (targetAccountId) loadSupplierLedger(targetAccountId);
      } else {
        setStatus({ type: "error", text: res.error || "Failed to void transaction" });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    }
  };

  const handleVoidOutgoing = (tx) => {
    setVoidConfirm({ isOpen: true, tx });
  };

  const handleEditOutgoing = async (tx) => {
    try {
      const res = await api.transactions.get(tx.entry_id);
      if (res.success && res.data) {
        const fullTx = res.data;
        const debitLines = fullTx.debit_lines || [];
        const creditLines = fullTx.credit_lines || [];

        setEditingEntryId(tx.entry_id);
        setDate(safeStr(fullTx.date));
        setReference(safeStr(fullTx.reference_no));
        setDescription(safeStr(fullTx.description));

        const supplierDebit = debitLines.find(l => l.account_type === 'SUPPLIER' || l.account_type === 'EXPENSE');
        if (supplierDebit) setTargetAccountId(safeId(supplierDebit.account_id));

        const cashCredit = creditLines.find(l => l.account_type === 'CASH' || l.account_type === 'BANK');
        if (cashCredit) setPaymentAccountId(safeId(cashCredit.account_id));

        if (cashCredit) setAmount(safeStr(safeNum(cashCredit.amount)));

        setStatus({ type: "success", text: "Transaction loaded for editing. Modify fields and re-post." });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    }
  };

  const outstandingLabel =
    closingBalance >= 0 ? "Dena baqi" : "Jama hua (Overpaid)";

  return (
    <div className="space-y-4 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#FEF2F2] rounded text-[#DC2626]">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">Pay Money</h3>
            <p className="text-[11px] text-[#64748B]">
              Supplier ko paise dena ho ya expense deni ho — yahan save karein.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box: Kab use karein */}
      <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-[4px] p-3">
        <p className="text-[11px] font-bold text-[#DC2626] mb-1">
          Kab use karein?
        </p>
        <ul className="text-[11px] text-[#475569] space-y-0.5">
          <li>• Supplier ka udhaar ada karna</li>
          <li>• Rent, bill, salary, expense</li>
          <li>• Supplier ko advance</li>
        </ul>
        <p className="text-[10px] text-[#64748B] mt-1 italic">
          Full cash purchase pe ho to Purchase screen use karein.
        </p>
      </div>

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

      {/* Two-column layout: Form (left) + Party Ledger (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handlePostOutgoing}
            className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Date — Kis din paise diye
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Voucher / Cheque No. (optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. PV-2026-501"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Paise kis ko diye? (Supplier / Expense)
              </label>
              {!hasAccountsLoaded && (
                <p className="text-[10px] text-[#64748B]">
                  Loading accounts...
                </p>
              )}
              {hasAccountsLoaded && targetAccounts.length === 0 && (
                <p className="text-[10px] text-[#DC2626]">
                  No suppliers/expenses found. Pehle Setups → Accounts mein
                  banaye.
                </p>
              )}
              {targetAccounts.length > 0 && (
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
                >
                  <option value="">[ SELECT SUPPLIER / EXPENSE ]</option>
                  {targetAccounts.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} [{t.code}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Paise kahan se diye? (Cash / Bank)
              </label>
              {!hasAccountsLoaded && (
                <p className="text-[10px] text-[#64748B]">
                  Loading cash/bank accounts...
                </p>
              )}
              {hasAccountsLoaded && cashBankAccounts.length === 0 && (
                <p className="text-[10px] text-[#DC2626]">
                  No cash/bank accounts found. Setups → Accounts se banaye.
                </p>
              )}
              {cashBankAccounts.length > 0 && (
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
                >
                  {cashBankAccounts.map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.title} [{cb.code}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Amount (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-white border border-[#CBD5E1] rounded-[3px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Save}
                disabled={posting}
              >
                {posting ? "Saving..." : "Save Payment (Paise Do)"}
              </Button>
            </div>
          </form>
        </div>

        {/* RIGHT: Party Ledger */}
        <div className="lg:col-span-3">
          <div className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] h-full flex flex-col">
            {!targetAccountId ? (
              <div className="text-center py-10 text-[#94A3B8]">
                <p className="text-[12px]">
                  Account select karein taake uska khata yahan dikhe.
                </p>
              </div>
            ) : ledgerLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                <span className="ml-2 text-[11px] text-[#64748B]">
                  Ledger load ho raha hai...
                </span>
              </div>
            ) : ledgerError ? (
              <div className="text-center py-6 text-[#DC2626] text-[11px]">
                {ledgerError}
              </div>
            ) : (
              <>
                {/* Outstanding Summary */}
                <div className="mb-3 pb-2 border-b border-[#E2E8F0]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">
                      {outstandingLabel}
                    </span>
                    <span
                      className={`text-lg font-bold font-mono ${
                        closingBalance >= 0
                          ? "text-[#DC2626]"
                          : "text-[#2563EB]"
                      }`}
                    >
                      {formatCurrency(closingBalance)}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block mt-0.5">
                    Iska matlab hai — itna lena/dena baqi hai is supplier se.
                  </span>
                </div>

                {/* Ledger Table */}
                {ledgerRecords.length === 0 ? (
                  <p className="text-center text-[11px] text-[#94A3B8] py-6">
                    Is account ki abhi koi entry nahi.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-[320px] flex-1">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 font-bold text-[#475569] uppercase">
                            Date
                          </th>
                          <th className="px-2 py-1.5 font-bold text-[#475569] uppercase">
                            Type
                          </th>
                          <th className="px-2 py-1.5 font-bold text-[#475569] uppercase">
                            Bill / Ref #
                          </th>
                          <th className="px-2 py-1.5 font-bold text-[#475569] uppercase text-right">
                            Debit (Rs.)
                          </th>
                          <th className="px-2 py-1.5 font-bold text-[#475569] uppercase text-right">
                            Credit (Rs.)
                          </th>
                          <th className="px-2 py-1.5 font-bold text-[#475569] uppercase text-right">
                            Balance (Rs.)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {ledgerRecords.map((r) => (
                          <tr key={r.entry_id} className="hover:bg-[#F8FAFC]">
                            <td className="px-2 py-1 font-mono text-[#475569]">
                              {r.date}
                            </td>
                            <td className="px-2 py-1">
                              <span className="px-1 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[9px] font-bold">
                                {entryTypeLabel(r.entry_type)}
                              </span>
                            </td>
                            <td className="px-2 py-1 font-mono text-[#0F172A]">
                              {r.reference_no || "—"}
                            </td>
                            <td className="px-2 py-1 text-right font-mono text-[#DC2626]">
                              {r.debit > 0 ? formatCurrency(r.debit) : "—"}
                            </td>
                            <td className="px-2 py-1 text-right font-mono text-[#16A34A]">
                              {r.credit > 0 ? formatCurrency(r.credit) : "—"}
                            </td>
                            <td className="px-2 py-1 text-right font-mono font-bold">
                              {formatCurrency(r.running_balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
      </div>
    </div>

    {/* Transaction History */}
    <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#64748B]" />
          <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            PAYMENT VOUCHERS
          </h4>
        </div>
        <button
          onClick={loadTransactions}
          className="text-[11px] text-[#64748B] hover:text-[#2563EB] font-medium"
          title="Refresh"
        >
          Refresh
        </button>
      </div>
        <TransactionHistoryTable
          records={outgoingTxns}
          onEdit={handleEditOutgoing}
          onVoid={handleVoidOutgoing}
        />
    </div>

    {voidConfirm.isOpen && voidConfirm.tx && (
      <Modal
        title="Confirm Void"
        isOpen={voidConfirm.isOpen}
        onClose={() => setVoidConfirm({ isOpen: false, tx: null })}
        size="md"
      >
        <div className="p-4">
          <p className="text-xs text-[#475569] mb-2">
            Void payment #{voidConfirm.tx.reference_no}? This reverses all ledger effects and cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoidConfirm({ isOpen: false, tx: null })}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={confirmVoid}
            >
              Void
            </Button>
          </div>
        </div>
      </Modal>
    )}
  </div>
  );
}
