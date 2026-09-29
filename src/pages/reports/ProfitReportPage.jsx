import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Printer } from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const getCurrentMonthDates = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
};

export function ProfitReportPage() {
  const initialDates = getCurrentMonthDates();
  const [dateFrom, setDateFrom] = useState(initialDates.dateFrom);
  const [dateTo, setDateTo] = useState(initialDates.dateTo);
  const [data, setData] = useState({ rows: [], total: {} });
  const [loading, setLoading] = useState(false);

  const loadReport = async (overrideFrom, overrideTo) => {
    setLoading(true);
    const from = overrideFrom !== undefined ? overrideFrom : dateFrom;
    const to = overrideTo !== undefined ? overrideTo : dateTo;
    try {
      const res = await api.reports.profitLossMonthWise({
        dateFrom: from || undefined,
        dateTo: to || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load P&L month-wise report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadReport();
  };

  const handleResetFilters = () => {
    const defaults = getCurrentMonthDates();
    setDateFrom(defaults.dateFrom);
    setDateTo(defaults.dateTo);
    loadReport(defaults.dateFrom, defaults.dateTo);
  };

  const rows = data?.rows || [];
  const total = data?.total || {};

  return (
    <div className="space-y-3 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              PROFIT &amp; LOSS MONTH WISE
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Criteria: Dated From <span className="font-semibold text-[#0F172A]">{data?.dateFrom || dateFrom}</span> To <span className="font-semibold text-[#0F172A]">{data?.dateTo || dateTo}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9] rounded-[3px] text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={() => loadReport()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[3px] text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
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

      {/* Month-Wise Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-center w-12">
                  S.#
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Month
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  Sale Amount
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right" title="Total purchase invoices (informational only — not used in profit calculation)">
                  Pur Amount
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right" title="Cost of Goods Sold from inventory transactions">
                  COGS
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  Gross P&amp;L
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  %
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  Expense
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  Net P&amp;L
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  Other Income
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider text-right">
                  Total P&amp;L
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-[#94A3B8]">
                    Loading P&amp;L data...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row, idx) => (
                  <tr key={row.month} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-center font-mono text-[#64748B]">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-mono font-medium text-[#0F172A]">
                      {row.month}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono font-semibold text-[#0F172A]">
                      {formatCurrency(row.saleAmount)}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#64748B]" title="Purchase invoices — informational">
                      {formatCurrency(row.purAmount)}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono font-semibold text-[#7C3AED]">
                      {formatCurrency(row.cogs ?? 0)}
                    </td>
                    <td className={`px-3 py-2 border-r border-[#E2E8F0] text-right font-mono font-semibold ${row.grossPL < 0 ? 'text-[#DC2626]' : 'text-[#166534]'}`}>
                      {formatCurrency(row.grossPL)}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#475569]">
                      {Number(row.pct || 0).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#991B1B]">
                      {formatCurrency(row.expense)}
                    </td>
                    <td className={`px-3 py-2 border-r border-[#E2E8F0] text-right font-mono font-bold ${row.netPL < 0 ? 'text-[#DC2626]' : 'text-[#166534]'}`}>
                      {formatCurrency(row.netPL)}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#15803D]">
                      {formatCurrency(row.otherIncome)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono font-bold ${row.totalPL < 0 ? 'text-[#DC2626]' : 'text-[#166534]'}`}>
                      {formatCurrency(row.totalPL)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-[#94A3B8]">
                    No transactions found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Total Row */}
            <tfoot className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] font-bold sticky bottom-0">
              <tr>
                <td className="px-3 py-2 border-r border-[#E2E8F0] text-center text-[#475569] font-mono">
                  —
                </td>
                <td className="px-3 py-2 border-r border-[#E2E8F0] uppercase tracking-wider text-[#0F172A]">
                  Total
                </td>
                <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#0F172A]">
                  {formatCurrency(total.saleAmount || 0)}
                </td>
                <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#64748B]" title="Purchase invoices — informational">
                  {formatCurrency(total.purAmount || 0)}
                </td>
                <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#7C3AED] font-bold">
                  {formatCurrency(total.cogs || 0)}
                </td>
                <td className={`px-3 py-2 border-r border-[#E2E8F0] text-right font-mono ${(total.grossPL || 0) < 0 ? 'text-[#DC2626]' : 'text-[#166534]'}`}>
                  {formatCurrency(total.grossPL || 0)}
                </td>
                <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#475569]">
                  {Number(total.pct || 0).toFixed(2)}%
                </td>
                <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#991B1B]">
                  {formatCurrency(total.expense || 0)}
                </td>
                <td className={`px-3 py-2 border-r border-[#E2E8F0] text-right font-mono ${(total.netPL || 0) < 0 ? 'text-[#DC2626]' : 'text-[#166534]'}`}>
                  {formatCurrency(total.netPL || 0)}
                </td>
                <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#15803D]">
                  {formatCurrency(total.otherIncome || 0)}
                </td>
                <td className={`px-3 py-2 text-right font-mono ${(total.totalPL || 0) < 0 ? 'text-[#DC2626]' : 'text-[#166534]'}`}>
                  {formatCurrency(total.totalPL || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
