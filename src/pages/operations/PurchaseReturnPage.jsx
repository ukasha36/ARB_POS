import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  History,
  Trash2,
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
import {
  filterSupplierAccounts,
  filterPurchasesAccounts,
} from "../../utils/accountFilters";

export function PurchaseReturnPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [purchasesAccountId, setPurchasesAccountId] = useState('');
  const [availablePurchasesAccounts, setAvailablePurchasesAccounts] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplierId, setSupplierId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [returnAmount, setReturnAmount] = useState("");
  const [reason, setReason] = useState("Defective item return");
  const [reference, setReference] = useState("");

  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);
  const [returns, setReturns] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);

  useEffect(() => {
    loadMasterData();
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const res = await api.transactions.list({
        entry_type: "PURCHASE_RETURN",
      });
      if (res.success) setReturns(res.data);
    } catch (err) {
      console.error("Failed to load purchase returns", err);
    }
  };

  const loadMasterData = async () => {
    try {
      const accRes = await api.accounts.list({});
      if (accRes.success && accRes.data) {
        const supps = filterSupplierAccounts(accRes.data);
        const purchasesAccounts = filterPurchasesAccounts(accRes.data);
        setSuppliers(supps);
        setAvailablePurchasesAccounts(purchasesAccounts);
        if (purchasesAccounts.length) setPurchasesAccountId(safeId(purchasesAccounts[0]?.id) || '');
        if (supps.length) setSupplierId(supps[0].id);
      }

      const itemRes = await api.items.list("");
      if (itemRes.success && itemRes.data) {
        setItems(itemRes.data);
        if (itemRes.data.length) {
          setItemId(itemRes.data[0].id);
          setReturnAmount((itemRes.data[0].purchase_price || 0).toString());
        }
      }
    } catch (err) {
      console.error("Failed to load purchase return data", err);
    }
  };

  const handleItemSelect = (e) => {
    const idVal = e.target.value;
    setItemId(idVal);
    const sel = items.find((i) => i.id === parseInt(idVal, 10));
    if (sel) {
      const q = parseFloat(qty) || 1;
      setReturnAmount((q * (sel.purchase_price || 0)).toFixed(2));
    }
  };

  const handleQtyChange = (e) => {
    const qVal = e.target.value;
    setQty(qVal);
    const sel = items.find((i) => i.id === parseInt(itemId, 10));
    if (sel) {
      const q = parseFloat(qVal) || 0;
      setReturnAmount((q * (sel.purchase_price || 0)).toFixed(2));
    }
  };

  const handlePostReturn = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(returnAmount);
    const numQty = parseFloat(qty);

    if (!numAmount || numAmount <= 0 || !numQty || numQty <= 0) {
      setStatus({
        type: "error",
        text: "Please enter valid positive quantity and return amount.",
      });
      return;
    }

    if (!supplierId || !itemId) {
      setStatus({
        type: "error",
        text: "Please select Supplier and Return Item.",
      });
      return;
    }

    if (!purchasesAccountId) {
      setStatus({
        type: "error",
        text: "Purchases account (5001) not found in the chart of accounts.",
      });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      // Debit: Supplier Account (reduces payable balance), Credit: Purchases Account (reduces purchases)
      const transactionData = {
        entry_type: "PURCHASE_RETURN",
        date,
        description: `Purchase Return - ${reason}`,
        reference_no: reference || `PRET-${Date.now().toString().slice(-4)}`,
        debit_lines: [
          { account_id: parseInt(supplierId, 10), amount: numAmount },
        ],
        credit_lines: [
          { account_id: parseInt(purchasesAccountId, 10), amount: numAmount },
        ],
        party_account_id: supplierId ? parseInt(supplierId, 10) : null,
        inventory_lines: [
          {
            item_id: parseInt(itemId, 10),
            transaction_type: "PURCHASE_RETURN",
            qty: numQty,
            unit_price: numAmount / numQty,
            total_price: numAmount,
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
            ? `Purchase return updated! Amount: ${formatCurrency(numAmount)}`
            : `Purchase Return posted! Amount: ${formatCurrency(numAmount)}. Stock reduced by ${numQty} units.`,
        });
        setEditingEntryId(null);
        setQty("1");
        setReference("");
        loadMasterData();
        loadTransactions();
      } else {
        setStatus({
          type: "error",
          text: res.error || "Failed to post purchase return",
        });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setPosting(false);
    }
  };

  const [voidConfirm, setVoidConfirm] = useState({ isOpen: false, tx: null });

  const handleEditReturn = async (tx) => {
    try {
      const res = await api.transactions.get(tx.entry_id);
      if (res.success && res.data) {
        const fullTx = res.data;
        const debitLines = fullTx.debit_lines || [];
        const creditLines = fullTx.credit_lines || [];
        const inventoryLines = fullTx.inventory_lines || [];

        setEditingEntryId(tx.entry_id);
        setDate(safeStr(fullTx.date));
        setReference(safeStr(fullTx.reference_no));
        setReason(safeStr(fullTx.description));

        const supplierLine =
          creditLines.find((l) => l.account_type === "SUPPLIER") ||
          creditLines[0];
        if (supplierLine) setSupplierId(safeId(supplierLine.account_id));

        if (inventoryLines.length > 0) {
          const inv = inventoryLines[0];
          setItemId(safeId(inv.item_id));
          setQty(safeStr(safeNum(inv.qty, 1)));
          setReturnAmount(safeStr(safeNum(inv.total_price)));
        }

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

  const handleVoidReturn = (tx) => {
    setVoidConfirm({ isOpen: true, tx });
  };

  const resetForm = () => {
    setEditingEntryId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setSupplierId('');
    setItemId('');
    setQty('1');
    setReturnAmount('');
    setReason('Defective item return');
    setReference('');
    setStatus({ type: 'success', text: 'Form cleared. Ready for a new purchase return.' });
    loadTransactions();
  };

  return (
    <div className="space-y-4 max-w-2xl select-none">
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">
              PURCHASE RETURN
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Process supplier returns, adjust payable balance, and reduce stock
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

      <form
        onSubmit={handlePostReturn}
        className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Supplier
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Original Invoice Ref
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. PUR-9041"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Item to Return
            </label>
            <select
              value={itemId}
              onChange={handleItemSelect}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} - {i.name} (Current Stock: {i.stock_qty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Return Quantity
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={handleQtyChange}
              required
              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Return Credit Amount (PKR)
            </label>
            <input
              type="number"
              step="0.01"
              value={returnAmount}
              onChange={(e) => setReturnAmount(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Return Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
            Return Reason
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" size="md" icon={RefreshCw} onClick={resetForm}>
            Clear
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            disabled={posting}
          >
            {posting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      {/* Transaction History */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#64748B]" />
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              PURCHASE RETURNS
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
          records={returns}
          onEdit={handleEditReturn}
          onVoid={handleVoidReturn}
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
              Void purchase return #{voidConfirm.tx.reference_no}? This reverses
              all ledger and inventory effects and cannot be undone.
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
