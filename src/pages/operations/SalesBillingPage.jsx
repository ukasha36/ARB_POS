import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Trash2, Save, Search, CheckCircle2, AlertCircle, Barcode, History, RefreshCw } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { TransactionHistoryTable } from '../../components/transactions/TransactionHistoryTable';
import { api } from '../../services/api';
import { formatCurrency, safeNum, safeStr, safeId } from '../../utils/formatters';

export function SalesBillingPage() {
  const [customers, setCustomers] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [salesRevenueAccountId, setSalesRevenueAccountId] = useState('');
  const [availableRevenueAccounts, setAvailableRevenueAccounts] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-5)}`);
  const [customerId, setCustomerId] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [remarks, setRemarks] = useState('');

  const [lineItems, setLineItems] = useState([
    { item_id: '', qty: 1, unit_price: 0, discount: 0, total: 0 }
  ]);

  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);
  const [sales, setSales] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);

  useEffect(() => {
    loadMasterData();
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const res = await api.transactions.list({ entry_type: 'SALE' });
      if (res.success) setSales(res.data);
    } catch (err) {
      console.error('Failed to load sales', err);
    }
  };

  const loadMasterData = async () => {
    try {
      const accRes = await api.accounts.list({});
      if (accRes.success && accRes.data) {
        const custs = accRes.data.filter((a) => a.account_type === 'CUSTOMER' || a.sale_enabled);
        const cb = accRes.data.filter((a) => a.account_type === 'CASH' || a.account_type === 'BANK');
        // Get all active REVENUE/SALES accounts for user to choose from
        const revenueAccounts = accRes.data.filter((a) => a.status === 'Active' && (a.account_type === 'REVENUE' || a.account_type === 'SALES'));

        setCustomers(custs);
        setCashBankAccounts(cb);
        setAvailableRevenueAccounts(revenueAccounts);
        if (revenueAccounts.length) setSalesRevenueAccountId(safeId(revenueAccounts[0]?.id) || '');

        if (custs.length) setCustomerId(custs[0].id);
        if (cb.length) setDepositAccountId(cb[0].id);
      }

      const itemRes = await api.items.list('');
      if (itemRes.success && itemRes.data) {
        setAvailableItems(itemRes.data);
        if (itemRes.data.length) {
          setLineItems([{
            item_id: itemRes.data[0].id,
            qty: 1,
            unit_price: itemRes.data[0].unit_price || 0,
            discount: 0,
            total: itemRes.data[0].unit_price || 0,
          }]);
          setPaidAmount((itemRes.data[0].unit_price || 0).toString());
        }
      }
    } catch (err) {
      console.error('Failed to load sales billing data', err);
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    const row = { ...updated[index], [field]: value };

    if (field === 'item_id') {
      const selectedItem = availableItems.find((i) => i.id === parseInt(value, 10));
      if (selectedItem) {
        row.unit_price = selectedItem.unit_price || 0;
      }
    }

    const qty = parseFloat(row.qty) || 0;
    const price = parseFloat(row.unit_price) || 0;
    const disc = parseFloat(row.discount) || 0;
    row.total = Math.max(0, Math.round((qty * price - disc) * 100) / 100);

    updated[index] = row;
    setLineItems(updated);
  };

  const handleBarcodeSearch = (e) => {
    e.preventDefault();
    if (!barcodeQuery || !barcodeQuery.trim()) return;

    const matchedItem = availableItems.find(
      (i) => i.barcode === barcodeQuery.trim() || i.code.toLowerCase() === barcodeQuery.trim().toLowerCase()
    );

    if (matchedItem) {
      // Check if item already in line items -> increment qty
      const existingIdx = lineItems.findIndex((li) => li.item_id === matchedItem.id);
      if (existingIdx >= 0) {
        handleLineItemChange(existingIdx, 'qty', lineItems[existingIdx].qty + 1);
      } else {
        setLineItems([
          ...lineItems,
          {
            item_id: matchedItem.id,
            qty: 1,
            unit_price: matchedItem.unit_price || 0,
            discount: 0,
            total: matchedItem.unit_price || 0,
          },
        ]);
      }
      setBarcodeQuery('');
    } else {
      setStatus({ type: 'error', text: `Item barcode/code '${barcodeQuery}' not found.` });
    }
  };

  const addLineItem = () => {
    const firstItem = availableItems[0] || { id: '', unit_price: 0 };
    setLineItems([
      ...lineItems,
      { item_id: firstItem.id, qty: 1, unit_price: firstItem.unit_price || 0, discount: 0, total: firstItem.unit_price || 0 }
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Calculations
  const grandTotal = Math.round(lineItems.reduce((sum, item) => sum + (item.total || 0), 0) * 100) / 100;
  const numPaid = Math.min(grandTotal, Math.max(0, parseFloat(paidAmount) || 0));
  const creditBalance = Math.round((grandTotal - numPaid) * 100) / 100;

  const handlePostSale = async (e) => {
    e.preventDefault();

    if (!customerId || !depositAccountId) {
      setStatus({ type: 'error', text: 'Please select Customer and Cash/Bank Account.' });
      return;
    }

    if (!salesRevenueAccountId) {
      setStatus({ type: 'error', text: 'Please select a Sales Revenue Account from the dropdown.' });
      return;
    }

    if (grandTotal <= 0) {
      setStatus({ type: 'error', text: 'Invoice total must be greater than zero.' });
      return;
    }

    // Check Credit Limit (Client-side block for UX)
    const cust = customers.find(c => c.id === parseInt(customerId, 10));
    if (cust && creditBalance > 0 && cust.credit_limit > 0) {
      // We should ideally check DB balance, but checking limit vs just this invoice is a start
      // if we assume their existing balance + this credit exceeds it.
      // Without an async check here, we'll just check if this invoice alone exceeds it
      if (creditBalance > cust.credit_limit) {
        setStatus({ type: 'error', text: `Credit sale of ${formatCurrency(creditBalance)} exceeds customer's credit limit of ${formatCurrency(cust.credit_limit)}.` });
        return;
      }
    }

    setPosting(true);
    setStatus(null);

    try {
      const debit_lines = [];

      // 1. Debit line: Cash/Bank Account for received amount (if paid > 0)
      if (numPaid > 0) {
        debit_lines.push({
          account_id: parseInt(depositAccountId, 10),
          amount: numPaid,
        });
      }

      // 2. Debit line: Customer Receivable Account for unpaid balance (if credit > 0)
      if (creditBalance > 0) {
        debit_lines.push({
          account_id: parseInt(customerId, 10),
          amount: creditBalance,
        });
      }

      // 3. Credit line: Sales Revenue Account for Grand Total
      const credit_lines = [
        {
          account_id: parseInt(salesRevenueAccountId, 10),
          amount: grandTotal,
        }
      ];

      // 4. Inventory transactions to reduce stock quantities
      const inventory_lines = lineItems.map((li) => ({
        item_id: parseInt(li.item_id, 10),
        transaction_type: 'SALE',
        qty: parseFloat(li.qty),
        unit_price: parseFloat(li.unit_price),
        total_price: parseFloat(li.total),
      }));

      const transactionData = {
        entry_type: 'SALE',
        date,
        description: `Sales Counter Invoice #${invoiceNo} ${remarks ? '- ' + remarks : ''}`,
        reference_no: invoiceNo,
        party_account_id: customerId ? parseInt(customerId, 10) : null,
        debit_lines,
        credit_lines,
        inventory_lines,
      };

      const res = editingEntryId
        ? await api.transactions.edit(editingEntryId, transactionData)
        : await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: 'success',
          text: editingEntryId
            ? `Sales invoice updated! #${invoiceNo} (Total: ${formatCurrency(grandTotal)})`
            : `Sales Invoice #${res.referenceNo || invoiceNo} completed! Total: ${formatCurrency(grandTotal)} (Cash Recv: ${formatCurrency(numPaid)}, Customer Credit: ${formatCurrency(creditBalance)}). Stock reduced.`,
        });
        setEditingEntryId(null);
        setInvoiceNo(`INV-${Date.now().toString().slice(-5)}`);
        setPaidAmount('0');
        setRemarks('');
        loadMasterData();
        loadTransactions();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to post sales billing' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setPosting(false);
    }
  };

  const [voidConfirm, setVoidConfirm] = useState({ isOpen: false, tx: null });

  const handleEditSale = async (tx) => {
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

        const salesCredit = creditLines.find(l => l.account_type === 'REVENUE' || l.account_type === 'SALES' || l.account_type === 'INCOME');
        if (salesCredit) setSalesRevenueAccountId(safeId(salesCredit.account_id));

        const cashDebit = debitLines.find(l => l.account_type === 'CASH' || l.account_type === 'BANK');
        if (cashDebit) setDepositAccountId(safeId(cashDebit.account_id));

        const customerDebit = debitLines.find(l => l.account_type === 'CUSTOMER');
        if (customerDebit) setCustomerId(safeId(customerDebit.account_id));

        if (inventoryLines.length > 0) {
          const newLineItems = inventoryLines.map(il => ({
            item_id: safeId(il.item_id),
            qty: safeStr(safeNum(il.qty, 1)),
            unit_price: safeStr(safeNum(il.unit_price, 0)),
            discount: 0,
            total: safeStr(safeNum(il.total_price, 0)),
          }));
          setLineItems(newLineItems);
        }

        const cashPayment = debitLines.find(l => l.account_type === 'CASH' || l.account_type === 'BANK');
        if (cashPayment) setPaidAmount(safeStr(safeNum(cashPayment.amount)));

        setStatus({ type: "success", text: "Transaction loaded for editing. Modify fields and re-post." });
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
        setStatus({ type: "error", text: res.error || "Failed to void transaction" });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    }
  };

  const handleVoidSale = (tx) => {
    setVoidConfirm({ isOpen: true, tx });
  };

  const resetForm = () => {
    setEditingEntryId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setInvoiceNo(`INV-${Date.now().toString().slice(-5)}`);
    setCustomerId('');
    setDepositAccountId('');
    setPaidAmount('0');
    setBarcodeQuery('');
    setRemarks('');
    setLineItems([{ item_id: '', qty: 1, unit_price: 0, discount: 0, total: 0 }]);
    setStatus({ type: 'success', text: 'Form cleared. Ready for a new sale.' });
    loadTransactions();
  };

  return (
    <div className="space-y-4 select-none">
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">SALES COUNTER POS BILLING</h3>
            <p className="text-[11px] text-[#64748B]">Fast cashier billing screen with barcode support, cash receipt, and stock deduction</p>
          </div>
        </div>

      </div>

      {status && (
        <div className={`p-3 rounded-[3px] text-xs font-semibold border flex items-center gap-2 ${status.type === 'success' ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]' : 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]'
          }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> : <AlertCircle className="w-4 h-4 text-[#DC2626]" />}
          <span>{status.text}</span>
        </div>
      )}

      <form onSubmit={handlePostSale} className="space-y-3">
        {/* Header Form Grid */}
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Customer Account</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-2 py-1 text-xs font-bold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title} {c.credit_limit > 0 ? `(Limit: ${c.credit_limit})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Invoice / Receipt #</label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              required
              className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Billing Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div className="col-span-3">
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Deposit Cash / Bank Account</label>
            <select
              value={depositAccountId}
              onChange={(e) => setDepositAccountId(e.target.value)}
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
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Sales Revenue Account *</label>
            {availableRevenueAccounts.length === 0 ? (
              <p className="text-[10px] text-[#DC2626]">
                No REVENUE accounts found. Create one in Setups → Accounts.
              </p>
            ) : (
              <select
                value={salesRevenueAccountId}
                onChange={(e) => setSalesRevenueAccountId(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
              >
                <option value="">[ SELECT SALES REVENUE ACCOUNT ]</option>
                {availableRevenueAccounts.filter(Boolean).map((acc, index) => acc && (
                  <option key={safeId(acc?.id) || `rev-${index}`} value={safeId(acc?.id)}>
                    {safeStr(acc?.title, '—')} [{safeStr(acc?.code, '?')}]
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Multi-line Sales Items Grid */}
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
          <div className="bg-[#EFF6FF] px-3 py-1.5 border-b border-[#BFDBFE] flex items-center justify-between">
            <span className="font-bold text-[#1E40AF] text-xs uppercase tracking-wider">Sales Counter Line Items</span>
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addLineItem}>
              Add Line Item
            </Button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0] text-[11px] font-bold text-[#475569] uppercase">
                <th className="p-2 border-r border-[#E2E8F0] w-12">#</th>
                <th className="p-2 border-r border-[#E2E8F0]">Item Name & Stock</th>
                <th className="p-2 border-r border-[#E2E8F0] w-24">Qty</th>
                <th className="p-2 border-r border-[#E2E8F0] w-28">Unit Price</th>
                <th className="p-2 border-r border-[#E2E8F0] w-28">Discount</th>
                <th className="p-2 border-r border-[#E2E8F0] w-36">Total</th>
                <th className="p-2 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => {
                const selectedItem = availableItems.find(ai => ai.id === parseInt(item.item_id, 10));
                return (
                  <tr key={idx} className="border-b border-[#E2E8F0]">
                    <td className="p-2 font-mono text-xs text-[#64748B] border-r border-[#E2E8F0]">{idx + 1}</td>
                    <td className="p-1 border-r border-[#E2E8F0]">
                      <select
                        value={item.item_id}
                        onChange={(e) => handleLineItemChange(idx, 'item_id', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] mb-1"
                      >
                        {availableItems.map((ai) => (
                          <option key={ai.id} value={ai.id}>
                            {ai.code} - {ai.name}
                          </option>
                        ))}
                      </select>
                      {selectedItem && (
                        <div className={`text-[10px] font-bold px-2 ${selectedItem.stock_qty <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Available Stock: {selectedItem.stock_qty}
                        </div>
                      )}
                    </td>
                    <td className="p-1 border-r border-[#E2E8F0]">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleLineItemChange(idx, 'qty', e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded-[3px]"
                      />
                    </td>
                    <td className="p-1 border-r border-[#E2E8F0]">
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(idx, 'unit_price', e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono bg-white border border-[#CBD5E1] rounded-[3px]"
                      />
                    </td>
                    <td className="p-1 border-r border-[#E2E8F0]">
                      <input
                        type="number"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => handleLineItemChange(idx, 'discount', e.target.value)}
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
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Payment Calculation Card */}
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] grid grid-cols-12 gap-3 items-center">
          <div className="col-span-5">
            <label className="block text-[10px] font-semibold text-[#64748B]">Counter Notes / Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Sale notes..."
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div className="col-span-7 bg-[#F8FAFC] p-2 border border-[#E2E8F0] rounded-[3px] grid grid-cols-3 gap-2 text-right">
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#64748B]">Total Bill</span>
              <span className="font-mono text-base font-bold text-[#2563EB]">{formatCurrency(grandTotal)}</span>
            </div>

            <div>
              <div className="flex items-center justify-end gap-1 mb-0.5">
                <span className="text-[10px] uppercase font-bold text-[#16A34A]">Cash Paid</span>
                <button
                  type="button"
                  onClick={() => setPaidAmount(grandTotal.toString())}
                  className="text-[9px] bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] px-1 rounded hover:bg-[#BBF7D0]"
                >
                  FULL
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-2 py-0.5 text-xs font-mono font-bold text-right bg-white border border-[#CBD5E1] rounded-[3px]"
              />
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-[#DC2626]">Customer Credit</span>
              <span className="font-mono text-base font-bold text-[#DC2626]">{formatCurrency(creditBalance)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="md" icon={RefreshCw} onClick={resetForm}>
            Clear
          </Button>
          <Button type="submit" variant="primary" size="md" icon={Save} disabled={posting}>
            {posting ? 'Processing Sale...' : 'Complete & Post Sales Bill'}
          </Button>
        </div>
      </form>

      {/* Transaction History */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#64748B]" />
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              SALES INVOICES
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
          records={sales}
          onEdit={handleEditSale}
          onVoid={handleVoidSale}
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
              Void sales invoice #{voidConfirm.tx.reference_no}? This reverses all ledger and inventory effects and cannot be undone.
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
