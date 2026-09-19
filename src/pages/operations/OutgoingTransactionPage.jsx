import React, { useState, useEffect } from 'react';
import { Receipt, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function OutgoingTransactionPage() {
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [targetAccounts, setTargetAccounts] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('Supplier Payment / Expense Payment Voucher');

  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.accounts.list({});
      if (res.success && res.data) {
        const cb = res.data.filter((a) => a.account_type === 'CASH' || a.account_type === 'BANK');
        const targets = res.data.filter((a) => a.account_type === 'SUPPLIER' || a.account_type === 'EXPENSE' || a.account_type === 'PURCHASES');

        setCashBankAccounts(cb);
        setTargetAccounts(targets);

        if (cb.length) setPaymentAccountId(cb[0].id);
        if (targets.length) setTargetAccountId(targets[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts for Outgoing Transaction', err);
    }
  };

  const handlePostOutgoing = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setStatus({ type: 'error', text: 'Please enter a valid positive payment amount.' });
      return;
    }

    if (!paymentAccountId || !targetAccountId) {
      setStatus({ type: 'error', text: 'Please select Payment Cash/Bank Account and Supplier/Expense Account.' });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      // Debit: Supplier / Expense Account, Credit: Cash/Bank Account
      const transactionData = {
        entry_type: 'HO_OUTGOING',
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

      const res = await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: 'success',
          text: `Payment Voucher posted! Paid ${formatCurrency(numAmount)} from cash/bank. Supplier payable / expense recorded.`,
        });
        setAmount('');
        setReference('');
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to post payment voucher' });
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
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">PAYMENT VOUCHER / OUTGOING PAYMENTS</h3>
            <p className="text-[11px] text-[#64748B]">Record supplier payments & expense outgoing cash (Dr: Supplier/Expense, Cr: Cash/Bank)</p>
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

      <form onSubmit={handlePostOutgoing} className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Payment Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Voucher / Check #</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. PV-2026-501"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Paid To (Supplier / Expense)</label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
            >
              {targetAccounts.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} - {t.title} ({t.account_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Paid From (Cash / Bank)</label>
            <select
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
            >
              {cashBankAccounts.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.code} - {cb.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Payment Amount (PKR)</label>
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
          <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Description / Memo</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button type="submit" variant="primary" size="md" icon={Save} disabled={posting}>
            {posting ? 'Posting Payment...' : 'Post Payment Voucher'}
          </Button>
        </div>
      </form>
    </div>
  );
}
