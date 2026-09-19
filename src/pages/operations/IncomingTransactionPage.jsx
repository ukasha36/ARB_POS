import React, { useState, useEffect } from 'react';
import { CreditCard, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function IncomingTransactionPage() {
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [sourceAccounts, setSourceAccounts] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositAccountId, setDepositAccountId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('Customer Receipt Payment Voucher');

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
        const sources = res.data.filter((a) => a.account_type === 'CUSTOMER' || a.account_type === 'REVENUE' || a.account_type === 'OTHER_INCOME');

        setCashBankAccounts(cb);
        setSourceAccounts(sources);

        if (cb.length) setDepositAccountId(cb[0].id);
        if (sources.length) setSourceAccountId(sources[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts for Incoming Transaction', err);
    }
  };

  const handlePostIncoming = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setStatus({ type: 'error', text: 'Please enter a valid positive payment amount.' });
      return;
    }

    if (!depositAccountId || !sourceAccountId) {
      setStatus({ type: 'error', text: 'Please select Deposit Cash/Bank Account and Customer/Source Account.' });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      // Debit: Cash/Bank Account, Credit: Customer / Income Account
      const transactionData = {
        entry_type: 'HO_INCOMING',
        date,
        description,
        reference_no: reference || `RV-${Date.now().toString().slice(-4)}`,
        debit_lines: [
          { account_id: parseInt(depositAccountId, 10), amount: numAmount },
        ],
        credit_lines: [
          { account_id: parseInt(sourceAccountId, 10), amount: numAmount },
        ],
      };

      const res = await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({
          type: 'success',
          text: `Receipt Voucher posted! Received ${formatCurrency(numAmount)} into cash/bank. Customer receivable balance reduced.`,
        });
        setAmount('');
        setReference('');
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to post receipt voucher' });
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
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">RECEIPT VOUCHER / INCOMING PAYMENTS</h3>
            <p className="text-[11px] text-[#64748B]">Record customer receipts & incoming cash (Dr: Cash/Bank, Cr: Customer/Revenue)</p>
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

      <form onSubmit={handlePostIncoming} className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Receipt Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Voucher / Receipt #</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. RV-2026-101"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Received From (Customer / Source)</label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
            >
              {sourceAccounts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.title} ({s.account_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Deposit To (Cash / Bank)</label>
            <select
              value={depositAccountId}
              onChange={(e) => setDepositAccountId(e.target.value)}
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
          <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">Receipt Amount (PKR)</label>
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
            {posting ? 'Posting Receipt...' : 'Post Receipt Voucher'}
          </Button>
        </div>
      </form>
    </div>
  );
}
