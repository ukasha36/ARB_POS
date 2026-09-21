import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { api } from '../../services/api';
import { formatCurrency, entryTypeLabel } from '../../utils/formatters';

export function GeneralLedgerPage() {
  const [records, setRecords] = useState([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState('');
  const [selectedEntryType, setSelectedEntryType] = useState('');

  const loadAccounts = async () => {
    try {
      const res = await api.accounts.list();
      if (res.success) {
        setAccounts(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await api.reports.generalLedger({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        accountId: selectedAccountId || undefined,
        accountType: selectedAccountType || undefined,
        entryType: selectedEntryType || undefined,
      });
      if (res.success && res.data) {
        setRecords(res.data.records || []);
        setTotalDebit(res.data.totalDebit || 0);
        setTotalCredit(res.data.totalCredit || 0);
      }
    } catch (err) {
      console.error('Failed to load general ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadLedger();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadLedger();
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedAccountId('');
    setSelectedAccountType('');
    setSelectedEntryType('');
    setTimeout(loadLedger, 0);
  };

  const isBalanced = Math.round(totalDebit * 100) === Math.round(totalCredit * 100);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => (
          <span className="font-mono text-[#475569]">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: 'reference_no',
        header: 'Bill / Ref #',
        cell: (info) => (
          <span className="font-mono font-bold text-[#0F172A]">{info.getValue() || '—'}</span>
        ),
      },
      {
        accessorKey: 'entry_type',
        header: 'Type',
        cell: (info) => (
          <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-[10px] font-bold">
            {entryTypeLabel(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'account_title',
        header: 'Account / Party',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <span className="font-mono font-semibold text-[#2563EB] mr-1.5">
                [{row.account_code}]
              </span>
              <span className="font-bold text-[#1E293B]">{info.getValue()}</span>
              <span className="text-[10px] text-[#64748B] block">
                Type: {row.account_type}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Details',
        cell: (info) => (
          <span className="text-[#475569] text-[11px] block max-w-xs truncate">
            {info.getValue() || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'debit',
        header: 'Debit (Rs.)',
        cell: (info) => {
          const val = Number(info.getValue()) || 0;
          return val > 0 ? (
            <span className="font-mono text-right block font-bold text-[#2563EB]">
              {formatCurrency(val)}
            </span>
          ) : (
            <span className="text-right block text-[#94A3B8]">—</span>
          );
        },
      },
      {
        accessorKey: 'credit',
        header: 'Credit (Rs.)',
        cell: (info) => {
          const val = Number(info.getValue()) || 0;
          return val > 0 ? (
            <span className="font-mono text-right block font-bold text-[#16A34A]">
              {formatCurrency(val)}
            </span>
          ) : (
            <span className="text-right block text-[#94A3B8]">—</span>
          );
        },
      },
      {
        accessorKey: 'running_balance',
        header: 'Balance (Rs.)',
        cell: (info) => {
          const val = Number(info.getValue()) || 0;
          return (
            <span className={`font-mono text-right block font-bold ${val < 0 ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>
              {formatCurrency(val)}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              All Transactions (General Ledger)
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Har sale, purchase, wasool, payment ka poora hisaab — date ke sath.
              Yeh list sirf dekhne ke liye hai; yahan se edit nahi hota.
            </p>
          </div>
        </div>
      </div>

      {/* Help Box */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[4px] p-3">
        <p className="text-[11px] font-bold text-[#2563EB] mb-1">
          Yeh page kya hai?
        </p>
        <ul className="text-[11px] text-[#475569] space-y-0.5 list-disc list-inside">
          <li>App mein jo bhi entry hui (sale, purchase, wasool, payment) woh yahan dikhti hai</li>
          <li>Har line ek hisaab ki entry hai</li>
          <li>Total Debits = Total Credits hona chahiye (BALANCED = theek)</li>
        </ul>
        <div className="mt-2 text-[10px] text-[#475569]">
          <p className="font-semibold mb-0.5">Simple words:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Sale / Purchase / Receipt / Payment = transaction type</li>
            <li>Debit column = "In" side ki amount</li>
            <li>Credit column = "Out" side ki amount</li>
            <li>Running Balance = us account ka chalta balance (advanced users ke liye)</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={loadLedger}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[3px] text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Verification Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Debit (In side)
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-base font-bold text-[#2563EB] font-mono">
            {formatCurrency(totalDebit)}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Sum of debit lines in range</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Credit (Out side)
            </span>
            <ArrowDownLeft className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-base font-bold text-[#16A34A] font-mono">
            {formatCurrency(totalCredit)}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Sum of credit lines in range</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Double-Entry Balance
            </span>
            {isBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#DC2626]" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                isBalanced
                  ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                  : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]'
              }`}
            >
              {isBalanced ? 'BALANCED' : 'UNBALANCED'}
            </span>
          </div>
          <span className="text-[10px] text-[#94A3B8] block mt-1">
            Agar Balanced hai to entries theek hain. Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] grid grid-cols-6 gap-2.5 items-end"
      >
        <div>
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">Account / Party</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">-- All Accounts --</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} [{a.code}]
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">Account Type</label>
          <select
            value={selectedAccountType}
            onChange={(e) => setSelectedAccountType(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">-- All Types --</option>
            <option value="CASH">CASH</option>
            <option value="BANK">BANK</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="SUPPLIER">SUPPLIER</option>
            <option value="EXPENSE">EXPENSE</option>
            <option value="REVENUE">REVENUE</option>
            <option value="PURCHASES">PURCHASES</option>
            <option value="CAPITAL">CAPITAL</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">Entry Type (Sale, Purchase, Receipt...)</label>
          <select
            value={selectedEntryType}
            onChange={(e) => setSelectedEntryType(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">-- All Entries --</option>
            <option value="SALE">Sale</option>
            <option value="SALES_RETURN">Sale Return</option>
            <option value="PURCHASE">Purchase</option>
            <option value="PURCHASE_RETURN">Purchase Return</option>
            <option value="HO_INCOMING">Receipt</option>
            <option value="HO_OUTGOING">Payment</option>
            <option value="CAPITAL">Capital</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="submit"
            className="flex-1 px-3 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8] transition"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-2.5 py-1.5 border border-[#CBD5E1] text-[#475569] text-xs font-semibold rounded-[3px] hover:bg-[#F1F5F9]"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Ledger Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-2 border-r border-[#E2E8F0] last:border-r-0 text-[#0F172A]"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-[#94A3B8]">
                    {loading
                      ? 'Loading ledger entries...'
                      : 'Abhi koi transaction nahi. Pehle Sales, Purchase, Wasool ya Payment se entry karein.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
