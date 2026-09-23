import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
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

export function PurchaseEntryPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [purchasesAccountId, setPurchasesAccountId] = useState('');
  const [availablePurchasesAccounts, setAvailablePurchasesAccounts] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNo, setInvoiceNo] = useState(
    `PUR-${Date.now().toString().slice(-5)}`,
  );
  const [supplierId, setSupplierId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [remarks, setRemarks] = useState("");

  const [lineItems, setLineItems] = useState([
    { item_id: "", qty: 1, unit_price: 0, total: 0 },
  ]);

  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);

  useEffect(() => {
    loadMasterData();
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const res = await api.transactions.list({ entry_type: "PURCHASE" });
      if (res.success) setPurchases(res.data);
    } catch (err) {
      console.error("Failed to load purchases", err);
    }
  };

  const loadMasterData = async () => {
    try {
      const accRes = await api.accounts.list({});
      if (accRes.success && accRes.data) {
        const supps = accRes.data.filter(
          (a) => a.account_type === "SUPPLIER" || a.purchase_enabled,
        );
        const cb = accRes.data.filter(
          (a) => a.account_type === "CASH" || a.account_type === "BANK",
        );
        const purchasesAccounts = accRes.data.filter(
          (a) => a.status === "Active" && (a.account_type === "PURCHASES" || a.account_type === "INVENTORY"),
        );

        setSuppliers(supps);
        setCashBankAccounts(cb);
        setAvailablePurchasesAccounts(purchasesAccounts);
        if (purchasesAccounts.length) setPurchasesAccountId(safeId(purchasesAccounts[0]?.id) || '');

        if (supps.length) setSupplierId(supps[0].id);
        if (cb.length) setPaymentAccountId(cb[0].id);
      }

      const itemRes = await api.items.list("");
      if (itemRes.success && itemRes.data) {
        setAvailableItems(itemRes.data);
        if (itemRes.data.length) {
          setLineItems([
            {
              item_id: itemRes.data[0].id,
              qty: 1,
              unit_price: itemRes.data[0].purchase_price || 0,
              total: itemRes.data[0].purchase_price || 0,
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to load purchase master data", err);
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    const row = { ...updated[index], [field]: value };

    if (field === "item_id") {
      const selectedItem = availableItems.find(
        (i) => i.id === parseInt(value, 10),
      );
      if (selectedItem) {
        row.unit_price = selectedItem.purchase_price || 0;
      }
    }

    const qty = parseFloat(row.qty) || 0;
    const price = parseFloat(row.unit_price) || 0;
    row.total = Math.round(qty * price * 100) / 100;

    updated[index] = row;
    setLineItems(updated);
  };

  const addLineItem = () => {
    const firstItem = availableItems[0] || { id: "", purchase_price: 0 };
    setLineItems([
      ...lineItems,
      {
        item_id: firstItem.id,
        qty: 1,
        unit_price: firstItem.purchase_price || 0,
        total: firstItem.purchase_price || 0,
      },
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const grandTotal =
    Math.round(
      lineItems.reduce((sum, item) => sum + (item.total || 0), 0) * 100,
    ) / 100;
  const numPaid = Math.min(
    grandTotal,
    Math.max(0, parseFloat(paidAmount) || 0),
  );
  const creditAmount = Math.round((grandTotal - numPaid) * 100) / 100;

  const handlePostPurchase = async (e) => {
    e.preventDefault();

    if (!supplierId || !paymentAccountId) {
      setStatus({
        type: "error",
        text: "Please select Supplier and Payment Account.",
      });
      return;
    }

    if (!purchasesAccountId) {
      setStatus({
        type: "error",
        text: "Please select a Purchases Account from the dropdown.",
      });
      return;
    }

    if (grandTotal <= 0) {
      setStatus({
        type: "error",
        text: "Invoice total must be greater than zero.",
      });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      const credit_lines = [];
      if (numPaid > 0) {
        credit_lines.push({
          account_id: parseInt(paymentAccountId, 10),
          amount: numPaid,
        });
      }
      if (creditAmount > 0) {
        credit_lines.push({
          account_id: parseInt(supplierId, 10),
          amount: creditAmount,
        });
      }

      const debit_lines = [
        { account_id: parseInt(purchasesAccountId, 10), amount: grandTotal },
      ];

      const inventory_lines = lineItems.map((li) => ({
        item_id: parseInt(li.item_id, 10),
        transaction_type: "PURCHASE",
        qty: parseFloat(li.qty),
        unit_price: parseFloat(li.unit_price),
        total_price: parseFloat(li.total),
      }));

      const transactionData = {
        entry_type: "PURCHASE",
        date,
        description: `Purchase Invoice #${invoiceNo} ${remarks ? "- " + remarks : ""}`,
        reference_no: invoiceNo,
        party_account_id: supplierId ? parseInt(supplierId, 10) : null,
        debit_lines,
        credit_lines,
        inventory_lines,
      };

      const res = editingEntryId
        ? await api.transactions.edit(editingEntryId, transactionData)
        : await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: "success",
          text: `Purchase Invoice #${invoiceNo} posted! Total: ${formatCurrency(grandTotal)} (Paid: ${formatCurrency(numPaid)}, Credit: ${formatCurrency(creditAmount)}). Stock quantities updated.`,
        });
        setInvoiceNo(`PUR-${Date.now().toString().slice(-5)}`);
        setPaidAmount("0");
        setRemarks("");
        loadMasterData();
        loadTransactions();
      } else {
        setStatus({
          type: "error",
          text: res.error || "Failed to post purchase entry",
        });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setPosting(false);
    }
  };

  const [voidConfirm, setVoidConfirm] = useState({ isOpen: false, tx: null });

  const handleEditPurchase = async (tx) => {
    try {
      const res = await api.transactions.get(tx.entry_id);
      if (res.success && res.data) {
        const fullTx = res.data;
        const debitLines = fullTx.debit_lines || [];
        const creditLines = fullTx.credit_lines || [];
        const inventoryLines = fullTx.inventory_lines || [];

        setEditingEntryId(tx.entry_id);
        setDate(safeStr(fullTx.date));
        setInvoiceNo(safeStr(fullTx.reference_no));
        setRemarks(safeStr(fullTx.description));

        if (debitLines.length > 0) {
          const purchasesLine =
            debitLines.find((l) => l.account_type === "PURCHASES") ||
            debitLines[0];
          if (purchasesLine)
            setPurchasesAccountId(safeId(purchasesLine.account_id));
        }

        if (creditLines.length > 0) {
          const paymentLine = creditLines.find(
            (l) => l.account_type === "CASH" || l.account_type === "BANK",
          );
          if (paymentLine) setPaymentAccountId(safeId(paymentLine.account_id));

          const supplierLine = creditLines.find(
            (l) => l.account_type === "SUPPLIER",
          );
          if (supplierLine) setSupplierId(safeId(supplierLine.account_id));
        }

        if (inventoryLines.length > 0) {
          const newLineItems = inventoryLines.map((il) => ({
            item_id: safeId(il.item_id),
            qty: safeStr(safeNum(il.qty, 1)),
            unit_price: safeStr(safeNum(il.unit_price, 0)),
            total: safeStr(safeNum(il.total_price, 0)),
          }));
          setLineItems(newLineItems);
        }

        const cashPayment = creditLines.find(
          (l) => l.account_type === "CASH" || l.account_type === "BANK",
        );
        if (cashPayment) setPaidAmount(safeStr(safeNum(cashPayment.amount)));

        setStatus({
          type: "success",
          text: "Transaction loaded for editing. Modify fields and re-post.",
        });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
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
        loadMasterData();
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

  const handleVoidPurchase = (tx) => {
    setVoidConfirm({ isOpen: true, tx });
  };

  const handleClearForm = () => {
    setEditingEntryId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setInvoiceNo(`PUR-${Date.now().toString().slice(-5)}`);
    setSupplierId(suppliers[0]?.id || "");
    setPaymentAccountId(cashBankAccounts[0]?.id || "");
    setPaidAmount("0");
    setRemarks("");
    setStatus(null);
    const firstItem = availableItems[0];
    setLineItems([
      firstItem
        ? { item_id: firstItem.id, qty: 1, unit_price: firstItem.purchase_price || 0, total: firstItem.purchase_price || 0 }
        : { item_id: "", qty: 1, unit_price: 0, total: 0 },
    ]);
  };

  return (
    <div className="space-y-4 select-none">
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">
              PURCHASE ENTRY (PKR)
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Record supplier purchases in PKR, update stock quantities, and
              calculate payable balance
            </p>
          </div>
        </div>
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

      <form onSubmit={handlePostPurchase} className="space-y-3">
        {/* Header Form Card */}
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Supplier / Firm
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full px-2 py-1 text-xs font-bold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px]"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.title}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Invoice #
            </label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              required
              className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div className="col-span-3">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div className="col-span-3">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Payment Method Account
            </label>
            <select
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            >
              {cashBankAccounts.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.title} ({cb.code})
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Purchases Account *
            </label>
            {availablePurchasesAccounts.length === 0 ? (
              <p className="text-[10px] text-[#DC2626]">
                No PURCHASES accounts found. Create one in Setups → Accounts.
              </p>
            ) : (
              <select
                value={purchasesAccountId}
                onChange={(e) => setPurchasesAccountId(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
              >
                <option value="">[ SELECT PURCHASES ACCOUNT ]</option>
                {availablePurchasesAccounts.filter(Boolean).map((acc, index) => acc && (
                  <option key={safeId(acc?.id) || `purch-${index}`} value={safeId(acc?.id)}>
                    {safeStr(acc?.title, '—')} [{safeStr(acc?.code, '?')}]
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Multi-line Items Grid */}
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
          <div className="bg-[#EFF6FF] px-3 py-1.5 border-b border-[#BFDBFE] flex items-center justify-between">
            <span className="font-bold text-[#1E40AF] text-xs uppercase tracking-wider">
              Purchase Items Line Items
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={addLineItem}
            >
              Add Item Line
            </Button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0] text-[11px] font-bold text-[#475569] uppercase">
                <th className="p-2 border-r border-[#E2E8F0] w-12">#</th>
                <th className="p-2 border-r border-[#E2E8F0]">
                  Inventory Item
                </th>
                <th className="p-2 border-r border-[#E2E8F0] w-28">Quantity</th>
                <th className="p-2 border-r border-[#E2E8F0] w-32">
                  Purchase Price (PKR)
                </th>
                <th className="p-2 border-r border-[#E2E8F0] w-36">
                  Total (PKR)
                </th>
                <th className="p-2 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx} className="border-b border-[#E2E8F0]">
                  <td className="p-2 font-mono text-xs text-[#64748B] border-r border-[#E2E8F0]">
                    {idx + 1}
                  </td>
                  <td className="p-1 border-r border-[#E2E8F0]">
                    <select
                      value={item.item_id}
                      onChange={(e) =>
                        handleLineItemChange(idx, "item_id", e.target.value)
                      }
                      className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                    >
                      {availableItems.map((ai) => (
                        <option key={ai.id} value={ai.id}>
                          {ai.code} - {ai.name} (Stock: {ai.stock_qty})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 border-r border-[#E2E8F0]">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) =>
                        handleLineItemChange(idx, "qty", e.target.value)
                      }
                      className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded-[3px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#E2E8F0]">
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleLineItemChange(idx, "unit_price", e.target.value)
                      }
                      className="w-full px-2 py-1 text-xs font-mono bg-white border border-[#CBD5E1] rounded-[3px]"
                    />
                  </td>
                  <td className="p-2 border-r border-[#E2E8F0] font-mono font-bold text-xs text-[#0F172A]">
                    {formatCurrency(item.total)}
                  </td>
                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      disabled={lineItems.length === 1}
                      className="text-[#DC2626] hover:bg-[#FEE2E2] p-1 rounded disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Payment Summary */}
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] grid grid-cols-12 gap-3 items-center">
          <div className="col-span-5">
            <label className="block text-[10px] font-semibold text-[#64748B]">
              Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Purchase invoice notes..."
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div className="col-span-7 bg-[#F8FAFC] p-2 border border-[#E2E8F0] rounded-[3px] grid grid-cols-3 gap-2 text-right">
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#64748B]">
                Grand Total
              </span>
              <span className="font-mono text-sm font-bold text-[#2563EB]">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-[#475569]">
                Paid Amount (Rs.)
              </span>
              <input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-2 py-0.5 text-xs font-mono font-bold text-right bg-white border border-[#CBD5E1] rounded-[3px]"
              />
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-[#DC2626]">
                Credit Payable
              </span>
              <span className="font-mono text-sm font-bold text-[#DC2626]">
                {formatCurrency(creditAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={RefreshCw}
            onClick={handleClearForm}
            disabled={posting}
          >
            Clear / New
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            disabled={posting}
          >
            {posting ? "Posting Purchase..." : "Post Purchase Invoice"}
          </Button>
        </div>
      </form>

      {/* Transaction History */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#64748B]" />
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              PURCHASE INVOICES
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
          records={purchases}
          onEdit={handleEditPurchase}
          onVoid={handleVoidPurchase}
        />
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
              Void purchase invoice #{voidConfirm.tx.reference_no}? This
              reverses all ledger and inventory effects and cannot be undone.
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
