import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency, safeId } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';

function getCurrentMonthDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

function generateDefaultRef() {
  return `EXP-${String(Math.floor(10000 + Math.random() * 90000))}`;
}

export function ExpenseEntryPage() {
  const initialDates = getCurrentMonthDates();
  const [expenses, setExpenses] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(initialDates.dateFrom);
  const [dateTo, setDateTo] = useState(initialDates.dateTo);
  const [filterExpenseId, setFilterExpenseId] = useState('');
  const [filterPaymentId, setFilterPaymentId] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    expenseAccountId: '',
    cashBankAccountId: '',
    amount: '',
    description: '',
    reference: '',
  });

  // Void confirmation state
  const [voidConfirm, setVoidConfirm] = useState({ isOpen: false, tx: null });
  const [voiding, setVoiding] = useState(false);

  const loadAccounts = async () => {
    try {
      const res = await api.accounts.list({});
      if (res.success && res.data) {
        const exp = res.data.filter((a) => a.account_type === 'EXPENSE');
        const cb = res.data.filter(
          (a) => a.account_type === 'CASH' || a.account_type === 'BANK'
        );
        setExpenseAccounts(exp);
        setCashBankAccounts(cb);
      }
    } catch (err) {
      console.error('Failed to load accounts for expenses:', err);
    }
  };

  const loadExpenses = async (overrideFilters = {}) => {
    setLoading(true);
    try {
      const fFrom = overrideFilters.dateFrom !== undefined ? overrideFilters.dateFrom : dateFrom;
      const fTo = overrideFilters.dateTo !== undefined ? overrideFilters.dateTo : dateTo;
      const fExp = overrideFilters.expenseId !== undefined ? overrideFilters.expenseId : filterExpenseId;
      const fPay = overrideFilters.paymentId !== undefined ? overrideFilters.paymentId : filterPaymentId;
      const fSearch = overrideFilters.search !== undefined ? overrideFilters.search : search;

      const res = await api.transactions.list({
        entry_type: 'EXPENSE',
        dateFrom: fFrom || undefined,
        dateTo: fTo || undefined,
        accountId: fExp || undefined,
        paymentAccountId: fPay || undefined,
        search: fSearch || undefined,
        limit: 500,
      });

      if (res.success && res.data) {
        setExpenses(res.data);
      }
    } catch (err) {
      console.error('Failed to load expense transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadExpenses();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadExpenses();
  };

  const handleResetFilters = () => {
    const defaults = getCurrentMonthDates();
    setDateFrom(defaults.dateFrom);
    setDateTo(defaults.dateTo);
    setFilterExpenseId('');
    setFilterPaymentId('');
    setSearch('');
    loadExpenses({
      dateFrom: defaults.dateFrom,
      dateTo: defaults.dateTo,
      expenseId: '',
      paymentId: '',
      search: '',
    });
  };

  const handleOpenCreateModal = () => {
    setEditingEntryId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      expenseAccountId: expenseAccounts[0]?.id ? String(expenseAccounts[0].id) : '',
      cashBankAccountId: cashBankAccounts[0]?.id ? String(cashBankAccounts[0].id) : '',
      amount: '',
      description: '',
      reference: generateDefaultRef(),
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx) => {
    setEditingEntryId(tx.entry_id);
    setFormData({
      date: tx.date || new Date().toISOString().split('T')[0],
      expenseAccountId: tx.expense_account_id
        ? String(tx.expense_account_id)
        : tx.party_account_id
        ? String(tx.party_account_id)
        : '',
      cashBankAccountId: tx.payment_account_id ? String(tx.payment_account_id) : '',
      amount: String(tx.total_amount || ''),
      description: tx.description || '',
      reference: tx.reference_no || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();

    if (!formData.expenseAccountId) {
      setStatus({ type: 'error', text: 'Expense account select karein.' });
      return;
    }
    if (!formData.cashBankAccountId) {
      setStatus({ type: 'error', text: 'Cash/Bank account select karein.' });
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (!numAmount || numAmount <= 0) {
      setStatus({ type: 'error', text: 'Amount must be greater than 0.' });
      return;
    }

    setSaving(true);
    setStatus(null);

    const payload = {
      entry_type: 'EXPENSE',
      date: formData.date,
      description: formData.description || '',
      reference_no: formData.reference || generateDefaultRef(),
      party_account_id: parseInt(formData.expenseAccountId, 10),
      debit_lines: [
        {
          account_id: parseInt(formData.expenseAccountId, 10),
          amount: numAmount,
        },
      ],
      credit_lines: [
        {
          account_id: parseInt(formData.cashBankAccountId, 10),
          amount: numAmount,
        },
      ],
    };

    try {
      const res = editingEntryId
        ? await api.transactions.edit(editingEntryId, payload)
        : await api.transactions.post(payload);

      if (res.success) {
        setIsModalOpen(false);
        setEditingEntryId(null);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          expenseAccountId: '',
          cashBankAccountId: '',
          amount: '',
          description: '',
          reference: '',
        });
        setStatus({
          type: 'success',
          text: editingEntryId
            ? `Expense voucher updated successfully (Ref: ${payload.reference_no})`
            : `Expense voucher posted successfully! Rs. ${numAmount.toFixed(2)} (Ref: ${payload.reference_no})`,
        });
        await loadExpenses();
      } else {
        setStatus({
          type: 'error',
          text: res.error || 'Failed to post expense voucher.',
        });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidConfirm.tx) return;
    setVoiding(true);
    try {
      const res = await api.transactions.void(voidConfirm.tx.entry_id);
      if (res.success) {
        setStatus({
          type: 'success',
          text: `Expense voucher #${voidConfirm.tx.reference_no} voided successfully.`,
        });
        setVoidConfirm({ isOpen: false, tx: null });
        await loadExpenses();
      } else {
        setStatus({
          type: 'error',
          text: res.error || 'Failed to void transaction.',
        });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Failed to void.' });
    } finally {
      setVoiding(false);
    }
  };

  const hasNoExpenseHeads = expenseAccounts.length === 0;

  return (
    <div className="space-y-3 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              EXPENSE VOUCHERS
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Post expense payments against Chart of Accounts expense heads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadExpenses()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-[3px] text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white rounded-[3px] text-xs font-semibold hover:bg-[#1D4ED8] transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Expense</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {status && (
        <div
          className={`p-2.5 rounded-[3px] text-xs font-semibold border flex items-center justify-between gap-2 ${
            status.type === 'success'
              ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
              : 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]'
          }`}
        >
          <div className="flex items-center gap-2">
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#DC2626]" />
            )}
            <span>{status.text}</span>
          </div>
          <button onClick={() => setStatus(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-2.5 border border-[#E2E8F0] rounded-[4px] flex items-center gap-2 flex-wrap"
      >
        <div className="w-32">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-0.5">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div className="w-32">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-0.5">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div className="w-44">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-0.5">Expense Head</label>
          <select
            value={filterExpenseId}
            onChange={(e) => setFilterExpenseId(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">-- All Expense Heads --</option>
            {expenseAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} [{a.code}]
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-0.5">Paid From</label>
          <select
            value={filterPaymentId}
            onChange={(e) => setFilterPaymentId(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">-- All Cash/Bank --</option>
            {cashBankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} [{a.code}]
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-0.5">Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Ref # or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-4">
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8]"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 border border-[#CBD5E1] text-[#475569] text-xs font-semibold rounded-[3px] hover:bg-[#F1F5F9]"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Expenses Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Date
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Ref #
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Expense Head
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Paid From
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  Amount
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Description
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider text-center w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[#94A3B8]">
                    Loading expense vouchers...
                  </td>
                </tr>
              ) : expenses.length > 0 ? (
                expenses.map((tx) => (
                  <tr key={tx.entry_id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-mono text-[#475569]">
                      {tx.date}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-mono font-bold text-[#0F172A]">
                      {tx.reference_no || '—'}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-medium text-[#0F172A]">
                      {tx.expense_account_name || tx.account_name || '—'}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-[#475569]">
                      {tx.payment_account_name || '—'}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono font-bold text-[#DC2626]">
                      {formatCurrency(tx.total_amount)}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-[#64748B] max-w-xs truncate">
                      {tx.description || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(tx)}
                          title="Edit Expense"
                          className="p-1 hover:bg-[#EFF6FF] text-[#2563EB] rounded transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setVoidConfirm({ isOpen: true, tx })}
                          title="Void Expense"
                          className="p-1 hover:bg-[#FEF2F2] text-[#DC2626] rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[#94A3B8]">
                    No expense vouchers found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntryId ? 'Edit Expense Voucher' : 'New Expense Voucher'}
        width="max-w-lg"
      >
        <form onSubmit={handleSaveExpense} className="space-y-3.5">
          {hasNoExpenseHeads && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold rounded-[3px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Pehle Setups → Accounts mein EXPENSE account banao</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Reference No
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="EXP-xxxxx"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Expense Head (Account) <span className="text-red-500">*</span>
            </label>
            <select
              required
              disabled={hasNoExpenseHeads}
              value={formData.expenseAccountId}
              onChange={(e) => setFormData({ ...formData, expenseAccountId: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none disabled:bg-gray-100"
            >
              <option value="">-- Select Expense Head --</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} [{a.code}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Paid From (Cash / Bank) <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.cashBankAccountId}
                onChange={(e) => setFormData({ ...formData, cashBankAccountId: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
              >
                <option value="">-- Select Cash/Bank --</option>
                {cashBankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} [{a.code}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Amount (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. Office tea / generator fuel / shop rent"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] rounded-[3px] border border-[#CBD5E1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || hasNoExpenseHeads}
              className="px-4 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8] transition disabled:opacity-50"
            >
              {saving ? 'Posting...' : editingEntryId ? 'Update Expense' : 'Post Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Void Confirmation Modal */}
      {voidConfirm.isOpen && voidConfirm.tx && (
        <Modal
          title="Confirm Void Expense"
          isOpen={voidConfirm.isOpen}
          onClose={() => setVoidConfirm({ isOpen: false, tx: null })}
          width="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#475569]">
              Are you sure you want to void expense voucher{' '}
              <strong className="text-[#0F172A]">#{voidConfirm.tx.reference_no}</strong> for{' '}
              <strong className="text-[#DC2626] font-mono">
                {formatCurrency(voidConfirm.tx.total_amount)}
              </strong>
              ? This reverses the transaction in the ledger.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setVoidConfirm({ isOpen: false, tx: null })}
                className="px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] rounded-[3px] border border-[#CBD5E1]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={voiding}
                onClick={handleConfirmVoid}
                className="px-4 py-1.5 bg-[#DC2626] text-white text-xs font-bold rounded-[3px] hover:bg-[#B91C1C] transition disabled:opacity-50"
              >
                {voiding ? 'Voiding...' : 'Void'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
