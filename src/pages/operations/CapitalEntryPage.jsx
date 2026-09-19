import React, { useState, useEffect } from 'react';
import { DollarSign, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function CapitalEntryPage() {
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [capitalAccounts, setCapitalAccounts] = useState([]);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [capitalAccountId, setCapitalAccountId] = useState('');
  const [cashBankAccountId, setCashBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('Capital Investment Contribution');

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
        const cap = res.data.filter((a) => a.account_type === 'CAPITAL');
        setCashBankAccounts(cb);
        setCapitalAccounts(cap);
        if (cb.length) setCashBankAccountId(cb[0].id);
        if (cap.length) setCapitalAccountId(cap[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts for Capital Entry', err);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setStatus({ type: 'error', text: 'Please enter a valid positive capital amount.' });
      return;
    }
    if (!capitalAccountId || !cashBankAccountId) {
      setStatus({ type: 'error', text: 'Please select both Capital Account and Cash/Bank Account.' });
      return;
    }

    setPosting(true);
    setStatus(null);

    try {
      const transactionData = {
        entry_type: 'CAPITAL',
        date,
        description,
        reference_no: reference || `CAP-${Date.now().toString().slice(-4)}`,
        debit_lines: [
          { account_id: parseInt(cashBankAccountId, 10), amount: numericAmount },
        ],
        credit_lines: [
          { account_id: parseInt(capitalAccountId, 10), amount: numericAmount },
        ],
      };

      const res = await api.transactions.post(transactionData);
      if (res.success) {
        setStatus({ type: 'success', text: `Capital transaction posted! ${formatCurrency(numericAmount)} (Ref: ${transactionData.reference_no})` });
        setAmount('');
        setReference('');
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to post transaction' });
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
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">CAPITAL INVESTMENT ENTRY</h3>
            <p className="text-[11px] text-[#64748B]">Post owner capital contribution in PKR (Dr: Cash/Bank, Cr: Capital)</p>
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

      <form onSubmit={handlePost} className="bg-white p-4 border border-[#E2E8F0] rounded-[4px] space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
              Transaction Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. CAP-2026-01"
              className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
              Deposit Account (Debit)
            </label>
            <select
              value={cashBankAccountId}
              onChange={(e) => setCashBankAccountId(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
            >
              {cashBankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.title} ({a.account_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
              Capital Account (Credit)
            </label>
            <select
              value={capitalAccountId}
              onChange={(e) => setCapitalAccountId(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
            >
              {capitalAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
            Capital Amount (PKR / Rs.)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button type="submit" variant="primary" size="md" icon={Save} disabled={posting}>
            {posting ? 'Posting...' : 'Post Capital Transaction'}
          </Button>
        </div>
      </form>
    </div>
  );
}
