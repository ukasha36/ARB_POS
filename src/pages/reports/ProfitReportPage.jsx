import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Printer, Info } from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function ProfitReportPage() {
  const [data, setData] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.reports.profitLoss({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load P&L report:', err);
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
    setDateFrom('');
    setDateTo('');
    setTimeout(loadReport, 0);
  };

  // Shorthand helpers — values always come from backend, never calculated here
  const rev = data?.revenue || {};
  const cogs = data?.costOfGoodsSold || {};
  const opEx = data?.operatingExpenses || { items: [], totalExpenses: 0 };
  const grossProfit = data?.grossProfit ?? 0;
  const netProfit = data?.netProfit ?? 0;
  const closingStock = data?.closingStockValuation ?? 0;

  const isPositiveGP = Number(grossProfit) >= 0;
  const isPositiveNP = Number(netProfit) >= 0;

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
              PROFIT &amp; LOSS STATEMENT
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Income statement showing revenue, cost of goods sold, operating expenses and net profit
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
            onClick={loadReport}
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

      {/* P&L Statement Body */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-[#94A3B8]">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-xs">Loading P&amp;L statement...</span>
          </div>
        </div>
      ) : !data ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-12 flex items-center justify-center">
          <span className="text-xs text-[#94A3B8]">No data available. Apply a date filter and refresh.</span>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
          <div className="max-w-2xl mx-auto p-6 space-y-0">

            {/* ── REVENUE ─────────────────────────────────────────── */}
            <div className="mb-1">
              <div className="px-3 py-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Revenue</span>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                <PLRow label="Gross Sales" value={rev.grossSales} />
                <PLRow label="Less: Sales Returns" value={rev.salesReturns} isDeduction />
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-[#EFF6FF] border-t border-[#BFDBFE]">
                <span className="text-xs font-bold text-[#1E40AF]">Net Sales</span>
                <span className="font-mono text-sm font-bold text-[#2563EB]">
                  {formatCurrency(rev.netSales)}
                </span>
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] my-3" />

            {/* ── COST OF GOODS SOLD ───────────────────────────────── */}
            <div className="mb-1">
              <div className="px-3 py-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Cost of Goods Sold</span>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                <PLRow label="Cost of Goods Sold" value={cogs.cogsSold} />
                <PLRow label="Less: COGS Returned" value={cogs.cogsReturned} isDeduction />
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-[#FFF7ED] border-t border-[#FED7AA]">
                <span className="text-xs font-bold text-[#9A3412]">Net COGS</span>
                <span className="font-mono text-sm font-bold text-[#C2410C]">
                  {formatCurrency(cogs.cogs)}
                </span>
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] my-3" />

            {/* ── GROSS PROFIT ─────────────────────────────────────── */}
            <div
              className={`flex items-center justify-between px-3 py-3 rounded-[3px] border ${
                isPositiveGP
                  ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                  : 'bg-[#FFF1F2] border-[#FECDD3]'
              }`}
            >
              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Gross Profit</span>
              <span
                className={`font-mono text-base font-bold ${
                  isPositiveGP ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {formatCurrency(grossProfit)}
              </span>
            </div>

            <div className="border-t border-[#E2E8F0] my-3" />

            {/* ── OPERATING EXPENSES ───────────────────────────────── */}
            <div className="mb-1">
              <div className="px-3 py-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Operating Expenses</span>
              </div>
              {opEx.items && opEx.items.length > 0 ? (
                <div className="divide-y divide-[#F1F5F9]">
                  {opEx.items.map((item) => (
                    <PLRow key={item.id} label={item.title} subLabel={item.code} value={item.amount} />
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-[11px] text-[#94A3B8]">
                  No operating expense accounts recorded
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2 bg-[#FFF7ED] border-t border-[#FED7AA]">
                <span className="text-xs font-bold text-[#9A3412]">Total Expenses</span>
                <span className="font-mono text-sm font-bold text-[#C2410C]">
                  {formatCurrency(opEx.totalExpenses)}
                </span>
              </div>
            </div>

            <div className="border-t-2 border-[#0F172A] my-3" />

            {/* ── NET PROFIT / LOSS ────────────────────────────────── */}
            <div
              className={`flex items-center justify-between px-4 py-4 rounded-[3px] border-2 ${
                isPositiveNP
                  ? 'bg-[#F0FDF4] border-[#16A34A]'
                  : 'bg-[#FFF1F2] border-[#DC2626]'
              }`}
            >
              <div>
                <span className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                  {isPositiveNP ? 'Net Profit' : 'Net Loss'}
                </span>
                <p className="text-[10px] text-[#64748B] mt-0.5">Gross Profit less Total Operating Expenses</p>
              </div>
              <span
                className={`font-mono text-xl font-bold ${
                  isPositiveNP ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {formatCurrency(netProfit)}
              </span>
            </div>

            {/* ── CLOSING STOCK VALUATION (info) ───────────────────── */}
            <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[3px]">
              <Info className="w-3.5 h-3.5 text-[#64748B] mt-0.5 flex-shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">
                  Closing Stock Valuation (at WAC) — informational only, not included in P&amp;L above
                </span>
                <span className="font-mono text-xs font-bold text-[#475569] ml-4">
                  {formatCurrency(closingStock)}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-component: single P&L line row ───────────────────────── */
function PLRow({ label, subLabel, value, isDeduction = false }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div>
        <span className="text-xs text-[#1E293B]">{label}</span>
        {subLabel && (
          <span className="ml-1.5 text-[10px] font-mono text-[#94A3B8]">[{subLabel}]</span>
        )}
      </div>
      <span
        className={`font-mono text-xs font-semibold ${
          isDeduction ? 'text-[#DC2626]' : 'text-[#0F172A]'
        }`}
      >
        {isDeduction && value > 0 ? '(' : ''}
        {formatCurrency(value)}
        {isDeduction && value > 0 ? ')' : ''}
      </span>
    </div>
  );
}
