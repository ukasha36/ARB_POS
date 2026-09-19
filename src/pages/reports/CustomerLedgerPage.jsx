import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function CustomerLedgerPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [ledgerData, setLedgerData] = useState({
    customer: {},
    openingBalance: 0,
    closingBalance: 0,
    summary: { sales: 0, returns: 0, receipts: 0 },
    records: [],
  });
  const [loading, setLoading] = useState(false);

  const loadCustomers = async () => {
    try {
      const res = await api.accounts.list({ account_type: 'CUSTOMER' });
      if (res.success && res.data?.length > 0) {
        setCustomers(res.data);
        setSelectedCustomerId(String(res.data[0].id));
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadCustomerLedger = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    try {
      const res = await api.reports.customerLedger(
        selectedCustomerId,
        dateFrom || null,
        dateTo || null
      );
      if (res.success && res.data) {
        setLedgerData(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerLedger();
    }
  }, [selectedCustomerId]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadCustomerLedger();
  };

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
        header: 'Ref / Invoice #',
        cell: (info) => (
          <span className="font-mono font-bold text-[#0F172A]">{info.getValue() || '—'}</span>
        ),
      },
      {
        accessorKey: 'entry_type',
        header: 'Transaction Type',
        cell: (info) => (
          <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-[10px] font-bold">
            {info.getValue()?.replace(/_/g, ' ')}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: (info) => (
          <span className="text-[#475569] text-[11px] block max-w-sm truncate">
            {info.getValue() || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'debit',
        header: 'Sales / Debit (PKR)',
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
        header: 'Receipts / Credit (PKR)',
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
        header: 'Outstanding Balance (PKR)',
        cell: (info) => {
          const val = Number(info.getValue()) || 0;
          return (
            <span className={`font-mono text-right block font-bold ${val > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
              {formatCurrency(val)}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: ledgerData.records || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              CUSTOMER LEDGER (RECEIVABLES STATEMENT)
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Authoritative transaction history, credit sales, cash receipts, and current outstanding receivable balance
            </p>
          </div>
        </div>
        <button
          onClick={loadCustomerLedger}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[3px] text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Customer Selection & Date Filter */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-end gap-3"
      >
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">
            Select Customer Account
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
          />
        </div>

        <div className="w-40">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8]"
        >
          View Statement
        </button>
      </form>

      {/* Customer Profile & Statement Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
          <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Opening Balance</div>
          <div className="text-base font-bold font-mono text-[#0F172A]">
            {formatCurrency(ledgerData.openingBalance)}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Prior to period start</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
          <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Period Invoiced Sales</div>
          <div className="text-base font-bold font-mono text-[#2563EB]">
            {formatCurrency(ledgerData.summary?.sales || 0)}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Total sales debits</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
          <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Period Receipts & Returns</div>
          <div className="text-base font-bold font-mono text-[#16A34A]">
            {formatCurrency((ledgerData.summary?.receipts || 0) + (ledgerData.summary?.returns || 0))}
          </div>
          <span className="text-[10px] text-[#94A3B8]">
            Receipts: {formatCurrency(ledgerData.summary?.receipts || 0)} | Ret: {formatCurrency(ledgerData.summary?.returns || 0)}
          </span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] bg-[#EFF6FF]/40">
          <div className="text-[10px] font-bold uppercase text-[#2563EB] mb-1">Closing Outstanding Receivable</div>
          <div className="text-base font-bold font-mono text-[#DC2626]">
            {formatCurrency(ledgerData.closingBalance)}
          </div>
          <span className="text-[10px] text-[#64748B]">Authoritative balance due</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto max-h-[480px]">
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
                    {loading ? 'Loading customer ledger...' : 'No transactions recorded for this customer in selected period.'}
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
