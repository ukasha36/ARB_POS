import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Save,
  RefreshCw,
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
import {
  formatCurrency,
  entryTypeLabel,
  safeNum,
  safeStr,
  safeId,
} from "../../utils/formatters";

export function IncomingTransactionPage() {
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [sourceAccounts, setSourceAccounts] = useState([]);
  const [hasAccountsLoaded, setHasAccountsLoaded] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [depositAccountId, setDepositAccountId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState(
    "Customer Receipt Payment Voucher",
  );

  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);
  const [incomingTxns, setIncomingTxns] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [voidConfirm, setVoidConfirm] = useState({ isOpen: false, tx: null });

  useEffect(() => {
    loadAccounts();
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const res = await api.transactions.list({ entry_type: "HO_INCOMING" });
      if (res.success) setIncomingTxns(res.data);
    } catch (err) {
      console.error("Failed to load incoming transactions", err);
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
    if (sourceAccountId) {
      loadCustomerLedger(sourceAccountId);
    } else {
      setLedgerRecords([]);
      setOpeningBalance(0);
      setClosingBalance(0);
      setLedgerError(null);
    }
  }, [sourceAccountId]);

  const loadAccounts = async () => {
    try {
      const res = await api.accounts.list({});
      if (res.success && res.data) {
        const cb = res.data.filter(
          (a) => a.account_type === "CASH" || a.account_type === "BANK",
        );
        const sources = res.data.filter(
          (a) =>
            a.account_type === "CUSTOMER" ||
            a.account_type === "REVENUE" ||
            a.account_type === "OTHER_INCOME",
        );

        setCashBankAccounts(cb);
        setSourceAccounts(sources);
        setHasAccountsLoaded(true);

        if (cb.length) setDepositAccountId(cb[0].id);
        if (sources.length) setSourceAccountId(sources[0].id);
      }
    } catch (err) {
      console.error("Failed to load accounts for Incoming Transaction", err);
    }
  };

  const loadCustomerLedger = async (accountId) => {
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const res = await api.reports.customerLedger(accountId);
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

  const handleClearForm = () => {
    setEditingEntryId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setReference("");
    setDescription("Customer Receipt Payment Voucher");
    setStatus(null);
    // Reset dropdowns to first available account
    if (cashBankAccounts.length) setDepositAccountId(cashBankAccounts[0].id);
    if (sourceAccounts.length) setSourceAccountId(sourceAccounts[0].id);
  };

  const handlePostIncoming = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setStatus({
        type: "error",
        text: "Please enter a valid positive payment amount.",
      });
      return;
    }

    if (!depositAccountId || !sourceAccountId) {
      setStatus({
        type: "error",
        text: "Please select Deposit Cash/Bank Account and Customer/Source Account.",
      });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      const transactionData = {
        entry_type: "HO_INCOMING",
        date,
        description,
        reference_no: reference || `RV-${Date.now().toString().slice(-4)}`,
        debit_lines: [
          { account_id: parseInt(depositAccountId, 10), amount: numAmount },
        ],
        credit_lines: [
          { account_id: parseInt(sourceAccountId, 10), amount: numAmount },
        ],
        party_account_id: parseInt(sourceAccountId, 10),
      };

      const res = editingEntryId
        ? await api.transactions.edit(editingEntryId, transactionData)
        : await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: "success",
          text: editingEntryId
            ? `Receipt updated! ${formatCurrency(numAmount)} (Ref: ${transactionData.reference_no})`
            : `Wasool save ho gaya. ${formatCurrency(numAmount)} add. Customer ka lena kam. Check: Customer Ledger`,
        });
        setEditingEntryId(null);
        setAmount("");
        setReference("");
        // Refresh the party ledger
        if (sourceAccountId) {
          loadCustomerLedger(sourceAccountId);
        }
        loadTransactions();
      } else {
        setStatus({
          type: "error",
          text: res.error || "Failed to post receipt voucher",
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
        if (sourceAccountId) loadCustomerLedger(sourceAccountId);
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

  const handleVoidIncoming = (tx) => {
    setVoidConfirm({ isOpen: true, tx });
  };

  const handleEditIncoming = async (tx) => {
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

        const cashDebit = debitLines.find(
          (l) => l.account_type === "CASH" || l.account_type === "BANK",
        );
        if (cashDebit) setDepositAccountId(safeId(cashDebit.account_id));

        const sourceCredit = creditLines.find(
          (l) =>
            l.account_type === "CUSTOMER" ||
            l.account_type === "REVENUE" ||
            l.account_type === "OTHER_INCOME",
        );
        if (sourceCredit) setSourceAccountId(safeId(sourceCredit.account_id));

        const cashLine = debitLines.find(
          (l) => l.account_type === "CASH" || l.account_type === "BANK",
        );
        if (cashLine) setAmount(safeStr(safeNum(cashLine.amount)));

        setStatus({
          type: "success",
          text: "Transaction loaded for editing. Modify fields and re-post.",
        });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    }
  };

  const outstandingLabel =
    closingBalance >= 0 ? "Lena baqi" : "Jama hua (Overpaid)";

  return (
    <div className="space-y-4 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#DCFCE7] rounded text-[#16A34A]">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">Receive Money</h3>
            <p className="text-[11px] text-[#64748B]">
              Kab customer se paise aayein — udhaar recovery bhi yahi se.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box: Kab use karein */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[4px] p-3">
        <p className="text-[11px] font-bold text-[#2563EB] mb-1">
          Kab use karein?
        </p>
        <ul className="text-[11px] text-[#475569] space-y-0.5">
          <li>• Customer ne udhaar pe liya tha, ab paise de raha hai</li>
          <li>• Advance wasool</li>
          <li>• Koi aur cash/bank mein paise aa rahe hain</li>
        </ul>
        <p className="text-[10px] text-[#64748B] mt-1 italic">
          Full cash sale counter pe ho to Sales screen use karein.
        </p>
      </div>

      {status && (
        <div
          className={`p-3 rounded-[3px] text-xs font-semibold border flex items-center gap-2 ${status.type === "success"
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
            onSubmit={handlePostIncoming}
            className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Date — Kis din paise aaye
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
                  Receipt No. (optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. RV-2026-101"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Paise kis se aaye? (Customer)
              </label>
              {!hasAccountsLoaded && (
                <p className="text-[10px] text-[#64748B]">
                  Loading accounts...
                </p>
              )}
              {hasAccountsLoaded && sourceAccounts.length === 0 && (
                <p className="text-[10px] text-[#DC2626]">
                  No customers found. Pehle Setups → Accounts mein Customer
                  banaein.
                </p>
              )}
              {sourceAccounts.length > 0 && (
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
                >
                  <option value="">[ SELECT CUSTOMER ]</option>
                  {sourceAccounts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} [{s.code}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Paise kahan rakhe? (Cash / Bank)
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
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(e.target.value)}
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

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                icon={RefreshCw}
                onClick={handleClearForm}
                disabled={posting}
              >
                Clear
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Save}
                disabled={posting}
              >
                {posting ? "Saving..." : "Save "}
              </Button>
            </div>
          </form>
        </div>

        {/* RIGHT: Party Ledger */}
        <div className="lg:col-span-3">
          <div className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] h-full flex flex-col">
            {!sourceAccountId ? (
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
                      className={`text-lg font-bold font-mono ${closingBalance >= 0
                        ? "text-[#2563EB]"
                        : "text-[#DC2626]"
                        }`}
                    >
                      {formatCurrency(closingBalance)}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block mt-0.5">
                    Iska matlab hai — itna lena/dena baqi hai is customer se.
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
                              <span className="px-1 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-[9px] font-bold">
                                {entryTypeLabel(r.entry_type)}
                              </span>
                            </td>
                            <td className="px-2 py-1 font-mono text-[#0F172A]">
                              {r.reference_no || "—"}
                            </td>
                            <td className="px-2 py-1 text-right font-mono text-[#2563EB]">
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
              RECEIPT VOUCHERS
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
          records={incomingTxns}
          onEdit={handleEditIncoming}
          onVoid={handleVoidIncoming}
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
              Void receipt #{voidConfirm.tx.reference_no}? This reverses all
              ledger effects and cannot be undone.
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
