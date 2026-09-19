import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, RefreshCw, TrendingDown, Package, Hash } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function SalesReturnReportPage() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, totalQty: 0 });
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCustomers = async () => {
    try {
      const res = await api.accounts.list({ account_type: 'CUSTOMER' });
      if (res.success) setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.reports.salesReturns({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        customerId: selectedCustomerId || undefined,
      });
      if (res.success && res.data) {
        setRecords(res.data.records || []);
        setSummary(res.data.summary || { totalAmount: 0, totalQty: 0 });
      }
    } catch (err) {
      console.error('Failed to load sales returns report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadReport();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadReport();
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedCustomerId('');
    setTimeout(loadReport, 0);
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
        header: 'Return Ref #',
        cell: (info) => (
          <span className="font-mono font-bold text-[#0F172A]">{info.getValue() || '—'}</span>
        ),
      },
      {
        accessorKey: 'party_name',
        header: 'Customer',
        cell: (info) => (
          <span className="font-bold text-[#1E293B]">{info.getValue() || 'Cash Counter Customer'}</span>
        ),
      },
      {
        accessorKey: 'item_name',
        header: 'Item',
        cell: (info) => (
          <span className="text-[#1E293B]">{info.getValue() || '—'}</span>
        ),
      },
      {
        accessorKey: 'item_code',
        header: 'Item Code',
        cell: (info) => (
          <span className="font-mono text-[#64748B] text-[11px]">{info.getValue() || '—'}</span>
        ),
      },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: (info) => (
          <span className="font-mono text-right block font-semibold text-[#475569]">
            {Number(info.getValue() || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'unit_price',
        header: 'Sale Price (PKR)',
        cell: (info) => (
          <span className="font-mono text-right block font-semibold text-[#0F172A]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'cost_price',
        header: () => (
          <span>
            Historical Cost{' '}
            <span className="font-normal text-[#94A3B8] normal-case tracking-normal">(COGS reversal)</span>
          </span>
        ),
        cell: (info) => (
          <span className="font-mono text-right block font-semibold text-[#7C3AED]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'total_price',
        header: 'Total (PKR)',
        cell: (info) => (
          <span className="font-mono text-right block font-bold text-[#DC2626]">
            {formatCurrency(info.getValue())}
          </span>
        ),
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
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#FFF1F2] rounded text-[#DC2626]">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              SALES RETURN REGISTER
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Merchandise returned by customers — item-level detail with sale price and historical cost (COGS reversal)
            </p>
          </div>
        </div>
        <button
          onClick={loadReport}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF1F2] text-[#DC2626] border border-[#FECDD3] hover:bg-[#FFE4E6] rounded-[3px] text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Returns</span>
            <TrendingDown className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-base font-bold text-[#DC2626] font-mono">
            {formatCurrency(summary.totalAmount)}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Total return value from customers</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Qty Returned</span>
            <Package className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-base font-bold text-[#0F172A] font-mono">
            {Number(summary.totalQty || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Units returned by customers</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Line Items</span>
            <Hash className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="text-base font-bold text-[#0F172A] font-mono">
            {records.length.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Return line entries in period</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-end gap-3"
      >
        <div className="w-40">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div className="w-40">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">Filter by Customer</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">-- All Customers --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8]"
        >
          Apply Filter
        </button>
        <button
          type="button"
          onClick={handleResetFilters}
          className="px-3 py-1.5 border border-[#CBD5E1] text-[#475569] text-xs font-semibold rounded-[3px] hover:bg-[#F1F5F9]"
        >
          Reset
        </button>
      </form>

      {/* Historical Cost Note */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F3FF] border border-[#DDD6FE] rounded-[3px]">
        <span className="w-2 h-2 rounded-full bg-[#7C3AED] flex-shrink-0" />
        <span className="text-[11px] text-[#5B21B6]">
          <strong>Historical Cost</strong> (purple column) = WAC recorded at the time of the original sale — this
          is the authoritative COGS reversal cost. The inventory is re-stocked at this cost upon return.
        </span>
      </div>

      {/* Sales Returns Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0 whitespace-nowrap"
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
                      ? 'Loading sales returns...'
                      : 'No sales return records found for the selected period.'}
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
