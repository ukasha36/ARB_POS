import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Package,
  DollarSign,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { api } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export function StockAnalyticsPage() {
  // ── Stock Analytics state (category valuation, fast movers, low stock) ──
  const [analytics, setAnalytics] = useState({
    categoryValuation: [],
    fastMovingItems: [],
    lowStockItems: [],
  });

  // ── Stock Valuation state (full item list + summary) ──
  const [valuation, setValuation] = useState({ items: [], summary: {} });
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [valuationLoading, setValuationLoading] = useState(false);

  // ── Derived category list for the dropdown ──
  const categoryOptions = useMemo(() => {
    const cats = new Set(
      (analytics.categoryValuation || [])
        .map((c) => c.category)
        .filter(Boolean),
    );
    return Array.from(cats).sort();
  }, [analytics.categoryValuation]);

  // ── Load analytics (all three sub-datasets) ──
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.reports.stockAnalytics();
      if (res.success && res.data) {
        setAnalytics({
          categoryValuation: res.data.categoryValuation || [],
          fastMovingItems: res.data.fastMovingItems || [],
          lowStockItems: res.data.lowStockItems || [],
        });
      }
    } catch (err) {
      console.error("Failed to load stock analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Load full item valuation with search/category params ──
  const loadValuation = useCallback(
    async (search = searchText, category = categoryFilter) => {
      setValuationLoading(true);
      try {
        const res = await api.reports.stockValuation({
          search: search || undefined,
          category: category || undefined,
        });
        if (res.success && res.data) {
          setValuation({
            items: res.data.items || [],
            summary: res.data.summary || {},
          });
        }
      } catch (err) {
        console.error("Failed to load stock valuation:", err);
      } finally {
        setValuationLoading(false);
      }
    },
    [searchText, categoryFilter],
  );

  useEffect(() => {
    loadAnalytics();
    loadValuation("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshAll = () => {
    loadAnalytics();
    loadValuation();
  };

  const handleValuationSearch = (e) => {
    e.preventDefault();
    loadValuation(searchText, categoryFilter);
  };

  const handleValuationReset = () => {
    setSearchText("");
    setCategoryFilter("");
    loadValuation("", "");
  };

  // ── Category Valuation table ──
  const categoryColumns = useMemo(
    () => [
      {
        accessorKey: "category",
        header: "Category",
        cell: (info) => (
          <span className="font-semibold text-[#1E293B]">
            {info.getValue() || "Uncategorised"}
          </span>
        ),
      },
      {
        accessorKey: "item_count",
        header: "Items",
        cell: (info) => (
          <span className="font-mono text-right block text-[#475569]">
            {Number(info.getValue() || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "total_qty",
        header: "Total Qty",
        cell: (info) => (
          <span className="font-mono text-right block font-semibold text-[#0F172A]">
            {Number(info.getValue() || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "total_value",
        header: "Total Value (PKR)",
        cell: (info) => (
          <span className="font-mono text-right block font-bold text-[#2563EB]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
    ],
    [],
  );

  // ── Fast Moving Items table ──
  const fastMovingColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Item",
        cell: (info) => (
          <span className="font-semibold text-[#1E293B] leading-tight">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: (info) => (
          <span className="font-mono text-[11px] text-[#64748B]">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "sold_qty",
        header: "Qty Sold",
        cell: (info) => (
          <span className="font-mono text-right block font-bold text-[#16A34A]">
            {Number(info.getValue() || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "revenue",
        header: "Revenue (PKR)",
        cell: (info) => (
          <span className="font-mono text-right block font-bold text-[#0F172A]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
    ],
    [],
  );

  // ── Low Stock Alert table ──
  const lowStockColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Item",
        cell: (info) => (
          <span className="font-semibold text-[#1E293B] leading-tight">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "stock_qty",
        header: "Stock",
        cell: (info) => {
          const qty = Number(info.getValue() || 0);
          return (
            <span
              className={`font-mono text-right block font-bold ${
                qty <= 0 ? "text-[#DC2626]" : "text-[#D97706]"
              }`}
            >
              {qty.toLocaleString()}
            </span>
          );
        },
      },
      {
        accessorKey: "min_stock",
        header: "Min Stock",
        cell: (info) => (
          <span className="font-mono text-right block text-[#475569]">
            {Number(info.getValue() || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "current_wac",
        header: "WAC (PKR)",
        cell: (info) => (
          <span className="font-mono text-right block text-[#64748B]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
    ],
    [],
  );

  // ── Full valuation table columns ──
  const valuationColumns = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        cell: (info) => (
          <span className="font-mono text-[11px] text-[#64748B]">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Item Name",
        cell: (info) => (
          <span className="font-semibold text-[#1E293B]">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: (info) => (
          <span className="text-[#475569]">{info.getValue() || "—"}</span>
        ),
      },
      {
        accessorKey: "stock_qty",
        header: "Stock Qty",
        cell: (info) => {
          const qty = Number(info.getValue() || 0);
          return (
            <span
              className={`font-mono text-right block font-bold ${qty <= 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`}
            >
              {qty.toLocaleString()}
            </span>
          );
        },
      },
      {
        accessorKey: "current_wac",
        header: "WAC (PKR)",
        cell: (info) => (
          <span className="font-mono text-right block text-[#475569]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "stock_valuation",
        header: "Valuation (PKR)",
        cell: (info) => (
          <span className="font-mono text-right block font-bold text-[#2563EB]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "min_stock",
        header: "Min Stock",
        cell: (info) => (
          <span className="font-mono text-right block text-[#64748B]">
            {Number(info.getValue() || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const s = info.getValue();
          if (s === "OUT_OF_STOCK") {
            return (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#DC2626] bg-[#FFF1F2] px-1.5 py-0.5 rounded">
                <XCircle className="w-3 h-3" /> Out of Stock
              </span>
            );
          }
          if (s === "LOW_STOCK") {
            return (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D97706] bg-[#FFFBEB] px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" /> Low Stock
              </span>
            );
          }
          return (
            <span className="text-[10px] font-semibold text-[#16A34A]">OK</span>
          );
        },
      },
    ],
    [],
  );

  const categoryTable = useReactTable({
    data: analytics.categoryValuation,
    columns: categoryColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const fastMovingTable = useReactTable({
    data: analytics.fastMovingItems,
    columns: fastMovingColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const lowStockTable = useReactTable({
    data: analytics.lowStockItems,
    columns: lowStockColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const valuationTable = useReactTable({
    data: valuation.items,
    columns: valuationColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const sum = valuation.summary || {};

  return (
    <div className="space-y-3 select-none">
      {/* ── HEADER BANNER ─────────────────────────────────────── */}
      {/* <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              STOCK ANALYTICS &amp; VALUATION
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Category breakdown, fast movers, low stock alerts and full
              inventory valuation at WAC
            </p>
          </div>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={loading || valuationLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[3px] text-xs font-semibold"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading || valuationLoading ? "animate-spin" : ""}`}
          />
          <span>Refresh All</span>
        </button>
      </div> */}

      {/* ── SECTION 1: Summary Cards ────────────────────────────── */}
      {/* <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm bg-[#EFF6FF]/40">
          <div className="flex items-center justify-between text-[#2563EB] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Valuation
            </span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-base font-bold text-[#2563EB] font-mono">
            {formatCurrency(sum.totalValuation)}
          </div>
          <span className="text-[10px] text-[#64748B]">Inventory at WAC</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Items
            </span>
            <Package className="w-4 h-4" />
          </div>
          <div className="text-base font-bold text-[#0F172A] font-mono">
            {Number(sum.totalCount || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-[#94A3B8]">SKUs in inventory</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Low Stock
            </span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-base font-bold text-[#D97706] font-mono">
            {Number(sum.lowStockCount || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-[#94A3B8]">
            Below minimum level
          </span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Out of Stock
            </span>
            <XCircle className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-base font-bold text-[#DC2626] font-mono">
            {Number(sum.outOfStockCount || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-[#94A3B8]">
            Zero or negative qty
          </span>
        </div>
      </div> */}

      {/* ── SECTION 2: Category Breakdown ───────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-[#94A3B8]">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading analytics...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                {categoryTable.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {categoryTable.getRowModel().rows.length > 0 ? (
                  categoryTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F8FAFC] transition">
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-2 border-r border-[#E2E8F0] last:border-r-0 text-[#0F172A]"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-[#94A3B8] text-xs"
                    >
                      No category data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 3: Fast Movers + Low Stock side by side ──────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
          <div className="px-3 py-2 bg-[#F0FDF4] border-b border-[#BBF7D0]">
            <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-widest">
              Fast Moving Items
            </span>
          </div>
          {loading ? (
            <div className="p-6 flex items-center justify-center gap-2 text-[#94A3B8]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
                  {fastMovingTable.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <th key={h.id} className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {fastMovingTable.getRowModel().rows.length > 0 ? (
                    fastMovingTable.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F8FAFC] transition">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-2 border-r border-[#E2E8F0] last:border-r-0 text-[#0F172A]">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-[#94A3B8] text-xs">
                        No fast-moving items data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div> */}

        {/* Low Stock Alerts */}
        {/* <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
          <div className="px-3 py-2 bg-[#FFFBEB] border-b border-[#FDE68A]">
            <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-widest">
              Low Stock Alerts
            </span>
          </div>
          {loading ? (
            <div className="p-6 flex items-center justify-center gap-2 text-[#94A3B8]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
                  {lowStockTable.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0"
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {lowStockTable.getRowModel().rows.length > 0 ? (
                    lowStockTable.getRowModel().rows.map((row) => {
                      const qty = Number(row.original.stock_qty || 0);
                      const rowBg =
                        qty <= 0 ? "bg-[#FFF1F2]" : "bg-[#FFFBEB]/60";
                      return (
                        <tr
                          key={row.id}
                          className={`${rowBg} hover:brightness-[0.97] transition`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="px-3 py-2 border-r border-[#E2E8F0] last:border-r-0 text-[#0F172A]"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-[#94A3B8] text-xs"
                      >
                        No low-stock items — inventory levels are healthy
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div> */}
      </div>

      {/* ── SECTION 4: Full Item List with Search/Category Filter ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        {/* Sub-header + search filter */}
        <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">
            Full Inventory Valuation List
          </span>
        </div>
        <form
          onSubmit={handleValuationSearch}
          className="p-3 border-b border-[#E2E8F0] flex items-end gap-3"
        >
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">
              Search Item
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name or code..."
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <div className="w-48">
            <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="">-- All Categories --</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8]"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleValuationReset}
            className="px-3 py-1.5 border border-[#CBD5E1] text-[#475569] text-xs font-semibold rounded-[3px] hover:bg-[#F1F5F9]"
          >
            Reset
          </button>
        </form>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              {valuationTable.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0 whitespace-nowrap"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {valuationLoading ? (
                <tr>
                  <td
                    colSpan={valuationColumns.length}
                    className="px-3 py-8 text-center text-[#94A3B8]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : valuationTable.getRowModel().rows.length > 0 ? (
                valuationTable.getRowModel().rows.map((row) => {
                  const status = row.original.status;
                  const rowBg =
                    status === "OUT_OF_STOCK"
                      ? "bg-[#FFF1F2]"
                      : status === "LOW_STOCK"
                        ? "bg-[#FFFBEB]/60"
                        : "";
                  return (
                    <tr
                      key={row.id}
                      className={`${rowBg} hover:brightness-[0.97] transition`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-2 border-r border-[#E2E8F0] last:border-r-0 text-[#0F172A]"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={valuationColumns.length}
                    className="px-3 py-8 text-center text-[#94A3B8]"
                  >
                    No items match the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Row count footer */}
        {/* {!valuationLoading && valuation.items.length > 0 && (
          <div className="px-3 py-1.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <span className="text-[10px] text-[#94A3B8]">
              Showing {valuation.items.length.toLocaleString()} item
              {valuation.items.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] font-bold text-[#2563EB] font-mono">
              Total Valuation: {formatCurrency(sum.totalValuation)}
            </span>
          </div>
        )} */}
      </div>
    </div>
  );
}
