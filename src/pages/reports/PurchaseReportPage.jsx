import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  TrendingDown,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function PurchaseReportPage() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    grossPurchases: 0,
    returns: 0,
    netPurchases: 0,
    cashPaid: 0,
    creditPayable: 0,
    totalItemsPurchased: 0,
  });
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSuppliers = async () => {
    try {
      const res = await api.accounts.list({ account_type: 'SUPPLIER' });
      if (res.success) {
        setSuppliers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.reports.purchases({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        supplierId: selectedSupplierId || undefined,
      });
      if (res.success && res.data) {
        setRecords(res.data.records || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load purchase report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadReport();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadReport();
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedSupplierId('');
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
        header: 'Bill / Invoice #',
        cell: (info) => (
          <span className="font-mono font-bold text-[#0F172A]">{info.getValue() || '—'}</span>
        ),
      },
      {
        accessorKey: 'supplier_name',
        header: 'Supplier / Vendor',
        cell: (info) => (
          <span className="font-bold text-[#1E293B]">{info.getValue() || 'General Supplier'}</span>
        ),
      },
      {
        accessorKey: 'total_qty',
        header: 'Items Qty',
        cell: (info) => (
          <span className="font-mono text-right block font-semibold text-[#475569]">
            {Number(info.getValue() || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'gross_amount',
        header: 'Gross Total (PKR)',
        cell: (info) => (
          <span className="font-mono text-right block font-bold text-[#0F172A]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'cash_paid',
        header: 'Cash / Bank Paid (PKR)',
        cell: (info) => (
          <span className="font-mono text-right block font-semibold text-[#16A34A]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'credit_payable',
        header: 'Credit / Payable (PKR)',
        cell: (info) => {
          const val = Number(info.getValue()) || 0;
          return val > 0 ? (
            <span className="font-mono text-right block font-bold text-[#DC2626]">
              {formatCurrency(val)}
            </span>
          ) : (
            <span className="text-right block text-[#94A3B8]">—</span>
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
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              PURCHASE REGISTER & VENDOR BILLS REPORT
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Authoritative purchase records, supplier bills, cash paid, and trade payables
            </p>
          </div>
        </div>
        <button
          onClick={loadReport}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[3px] text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Verification Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Purchases</span>
            <TrendingDown className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-base font-bold text-[#0F172A] font-mono">
            {formatCurrency(summary.grossPurchases)}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Total vendor bills</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Purchase Returns</span>
            <span className="text-xs font-bold text-[#DC2626]">Ret</span>
          </div>
          <div className="text-base font-bold text-[#DC2626] font-mono">
            {formatCurrency(summary.returns)}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Returned to supplier</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm bg-[#EFF6FF]/40">
          <div className="flex items-center justify-between text-[#2563EB] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Net Purchases</span>
            <DollarSign className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-base font-bold text-[#2563EB] font-mono">
            {formatCurrency(summary.netPurchases)}
          </div>
          <span className="text-[10px] text-[#64748B]">Gross purchases minus returns</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cash vs Payable</span>
            <Package className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-xs font-mono font-bold text-[#16A34A]">
            Paid: {formatCurrency(summary.cashPaid)}
          </div>
          <div className="text-xs font-mono font-bold text-[#DC2626]">
            Payable: {formatCurrency(summary.creditPayable)}
          </div>
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
          <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">Filter by Supplier</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">-- All Suppliers --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.title}
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

      {/* Purchase Invoices Table */}
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
                    {loading ? 'Loading purchase report...' : 'No purchase records found for the selected period.'}
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
