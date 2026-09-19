import React, { useState, useEffect } from 'react';
import { RotateCcw, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function SalesReturnPage() {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [salesAccount, setSalesAccount] = useState(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [returnAmount, setReturnAmount] = useState('');
  const [reason, setReason] = useState('Customer product exchange / return');
  const [reference, setReference] = useState('');

  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const accRes = await api.accounts.list({});
      if (accRes.success && accRes.data) {
        const custs = accRes.data.filter((a) => a.account_type === 'CUSTOMER' || a.sale_enabled);
        const salesAcc = accRes.data.find((a) => a.code === '4001' || a.account_type === 'REVENUE' || a.account_type === 'SALES');
        setCustomers(custs);
        setSalesAccount(salesAcc || { id: 6, code: '4001', title: 'Sales Revenue Account' });
        if (custs.length) setCustomerId(custs[0].id);
      }

      const itemRes = await api.items.list('');
      if (itemRes.success && itemRes.data) {
        setItems(itemRes.data);
        if (itemRes.data.length) {
          setItemId(itemRes.data[0].id);
          setReturnAmount((itemRes.data[0].unit_price || 0).toString());
        }
      }
    } catch (err) {
      console.error('Failed to load sales return data', err);
    }
  };

  const handleItemSelect = (e) => {
    const idVal = e.target.value;
    setItemId(idVal);
    const sel = items.find((i) => i.id === parseInt(idVal, 10));
    if (sel) {
      const q = parseFloat(qty) || 1;
      setReturnAmount((q * (sel.unit_price || 0)).toFixed(2));
    }
  };

  const handleQtyChange = (e) => {
    const qVal = e.target.value;
    setQty(qVal);
    const sel = items.find((i) => i.id === parseInt(itemId, 10));
    if (sel) {
      const q = parseFloat(qVal) || 0;
      setReturnAmount((q * (sel.unit_price || 0)).toFixed(2));
    }
  };

  const handlePostSalesReturn = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(returnAmount);
    const numQty = parseFloat(qty);

    if (!numAmount || numAmount <= 0 || !numQty || numQty <= 0) {
      setStatus({ type: 'error', text: 'Please enter valid positive quantity and return amount.' });
      return;
    }

    if (!customerId || !itemId) {
      setStatus({ type: 'error', text: 'Please select Customer and Return Item.' });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      // Debit: Sales Revenue Account (reduces revenue), Credit: Customer Account (reduces customer balance)
      const transactionData = {
        entry_type: 'SALES_RETURN',
        date,
        description: `Sales Return - ${reason}`,
        reference_no: reference || `SRET-${Date.now().toString().slice(-4)}`,
        debit_lines: [
          { account_id: parseInt(salesAccount.id, 10), amount: numAmount },
        ],
        credit_lines: [
          { account_id: parseInt(customerId, 10), amount: numAmount },
        ],
        inventory_lines: [
          {
            item_id: parseInt(itemId, 10),
            transaction_type: 'SALES_RETURN',
            qty: numQty,
            unit_price: numAmount / numQty,
            total_price: numAmount,
          },
        ],
      };

      const res = await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: 'success',
          text: `Sales Return posted! Amount: ${formatCurrency(numAmount)}. Stock restored by ${numQty} units.`,
        });
        setQty('1');
        setReference('');
        loadMasterData();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to post sales return' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl select-none">
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">SALES RETURN / CREDIT NOTE</h3>
            <p className="text-[11px] text-[#64748B]">Process customer sales returns, adjust customer receivable balance, and restore stock</p>
          </div>
        </div>
      </div>

      {status && (
        <div className={`p-3 rounded-[3px] text-xs font-semibold border flex items-center gap-2 ${
          status.type === 'success' ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]' : 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> : <AlertCircle className="w-4 h-4 text-[#DC2626]" />}
          <span>{status.text}</span>
        </div>
      )}

      <form onSubmit={handlePostSalesReturn} className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Customer Account</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Original Invoice Ref</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. INV-9041"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Returned Item</label>
            <select
              value={itemId}
              onChange={handleItemSelect}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} - {i.name} (Stock: {i.stock_qty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Return Quantity</label>
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
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Credit Note Amount (PKR)</label>
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
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Return Date</label>
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
          <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Reason for Return</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button type="submit" variant="primary" size="md" icon={Save} disabled={posting}>
            {posting ? 'Processing Return...' : 'Post Sales Return / Credit Note'}
          </Button>
        </div>
      </form>
    </div>
  );
}
