import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Boxes,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function StockManagementPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalValuation: 0,
    totalQty: 0,
    totalCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState(['ALL']);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState([]);

  const loadStockData = async () => {
    setLoading(true);
    try {
      const res = await api.reports.stockValuation(search, selectedCategory);
      if (res.success && res.data) {
        setItems(res.data.items || []);
        setSummary(res.data.summary || {});

        // Extract distinct categories
        const cats = new Set(['ALL']);
        (res.data.items || []).forEach((item) => {
          if (item.category) cats.add(item.category);
        });
        setCategories(Array.from(cats));
      }
    } catch (err) {
      console.error('Failed to load stock valuation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadStockData();
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Code / SKU',
        cell: (info) => (
          <span className="font-semibold text-[#0F172A]">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Item Description',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <span className="font-bold text-[#1E293B] block">{info.getValue()}</span>
              {row.supplier_name && (
                <span className="text-[10px] text-[#64748B]">Supplier: {row.supplier_name}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: (info) => (
          <span className="inline-block px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] text-[11px] font-medium">
            {info.getValue() || 'General'}
          </span>
        ),
      },
      {
        accessorKey: 'stock_qty',
        header: 'In Stock',
        cell: (info) => {
          const val = Number(info.getValue()) || 0;
          return (
            <span className={`font-mono font-bold text-right block ${val <= 0 ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>
              {val.toLocaleString()}
            </span>
          );
        },
      },
      {
        accessorKey: 'current_wac',
        header: 'WAC Cost (PKR)',
        cell: (info) => (
          <span className="font-mono text-right block text-[#2563EB] font-semibold">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'sale_price',
        header: 'Sale Price (PKR)',
        cell: (info) => (
          <span className="font-mono text-right block text-[#475569]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'stock_valuation',
        header: 'Total Valuation (PKR)',
        cell: (info) => (
          <span className="font-mono text-right block font-bold text-[#16A34A]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Stock Status',
        cell: (info) => {
          const row = info.row.original;
          const qty = Number(row.stock_qty) || 0;
          const min = Number(row.min_stock) || 0;

          if (qty <= 0) {
            return (
              <span className="px-2 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] text-[10px] font-bold">
                Out of Stock
              </span>
            );
          }
          if (qty <= min) {
            return (
              <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] text-[10px] font-bold">
                Low Stock ({qty}/{min})
              </span>
            );
          }
          return (
            <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC] text-[10px] font-bold">
              Available
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-3 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              STOCK MANAGEMENT & INVENTORY VALUATION
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Authoritative inventory quantities, Weighted Average Cost (WAC), and synchronized stock valuations
            </p>
          </div>
        </div>
        <button
          onClick={loadStockData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[3px] text-xs font-semibold transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Synchronized Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Stock Value</span>
            <DollarSign className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-base font-bold text-[#16A34A] font-mono">
            {formatCurrency(summary.totalValuation)}
          </div>
          <span className="text-[10px] text-[#94A3B8]">Authoritative closing stock value</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Stock Units</span>
            <Boxes className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-base font-bold text-[#0F172A] font-mono">
            {(summary.totalQty || 0).toLocaleString()} <span className="text-xs font-normal text-[#64748B]">Units</span>
          </div>
          <span className="text-[10px] text-[#94A3B8]">Across all warehouse items</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Catalog Items</span>
            <Layers className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-base font-bold text-[#0F172A] font-mono">
            {summary.totalCount || items.length} <span className="text-xs font-normal text-[#64748B]">SKUs</span>
          </div>
          <span className="text-[10px] text-[#94A3B8]">Active inventory catalog</span>
        </div>

        <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-base font-bold text-[#D97706] font-mono">
            {summary.lowStockCount || 0} <span className="text-xs font-normal text-[#64748B]">Items</span>
          </div>
          <span className="text-[10px] text-[#94A3B8]">At or below reorder threshold</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-2.5 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by Code, Item Name, or Barcode... (Press Enter)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8] transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="text-[11px] font-bold text-[#475569] uppercase">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Master Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0 cursor-pointer hover:bg-[#F1F5F9]"
                      onClick={header.column.getToggleSortingHandler()}
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
                    {loading ? 'Loading stock inventory...' : 'No inventory items found.'}
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
