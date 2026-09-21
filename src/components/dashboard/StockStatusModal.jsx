import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../common/Modal";
import { Search, Package } from "lucide-react";
import { api } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export function StockStatusModal({ isOpen, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.items.list("", false);
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch stock on hand", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (item) =>
        (item.name || "").toLowerCase().includes(term) ||
        (item.category || "").toLowerCase().includes(term),
    );
  }, [items, search]);

  const totalStockValue = filtered.reduce(
    (sum, item) =>
      sum + (Number(item.stock_qty) || 0) * (Number(item.current_wac) || 0),
    0,
  );
  const totalItems = filtered.length;
  const inStockCount = filtered.filter(
    (item) => (Number(item.stock_qty) || 0) > 0,
  ).length;

  const columns = [
    {
      header: "Item Name",
      accessorKey: "name",
      cell: (info) => (
        <span className="font-semibold text-[#0F172A]">
          {info.getValue() || "—"}
        </span>
      ),
    },
    {
      header: "Full",
      accessorKey: "stock_qty",
      cell: (info) => {
        const val = Number(info.getValue()) || 0;
        const color = val > 0 ? "text-[#16A34A]" : "text-[#DC2626]";
        return (
          <span className={`font-mono font-bold text-right ${color}`}>
            {val.toFixed(val % 1 === 0 ? 0 : 2)}
          </span>
        );
      },
    },
    {
      header: "Brand",
      accessorKey: "category",
      cell: (info) => (
        <span className="text-xs text-[#475569]">{info.getValue() || "—"}</span>
      ),
    },
    {
      header: "Short",
      accessorKey: "code",
      cell: (info) => (
        <span className="font-mono text-[#2563EB] font-bold">
          {info.getValue() || "—"}
        </span>
      ),
    },
    {
      header: "Type",
      accessorKey: "category",
      cell: (info) => (
        <span className="text-xs text-[#475569] uppercase">
          {info.getValue() || "GENERAL"}
        </span>
      ),
    },
    {
      header: "Godown",
      cell: () => <span className="text-xs text-[#64748B]">MAIN</span>,
    },
    {
      header: "Retail (PKR)",
      accessorKey: "unit_price",
      cell: (info) => (
        <span className="font-mono text-[#0F172A]">
          {formatCurrency(info.getValue() || 0)}
        </span>
      ),
    },
    {
      header: "Pac",
      cell: () => <span className="font-mono text-xs text-[#64748B]">1</span>,
    },
    {
      header: "Formation",
      cell: () => <span className="text-xs text-[#64748B]">MIX</span>,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock On-Hand Status"
      width="max-w-6xl"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find by item name or brand/category..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* <div className="grid grid-cols-4 gap-2 mb-2">
          <div className="bg-[#EFF6FF] p-2 border border-[#BFDBFE] rounded-[3px]">
            <span className="text-[10px] font-bold uppercase text-[#64748B]">Total Items</span>
            <div className="text-lg font-bold font-mono text-[#0F172A]">{totalItems}</div>
          </div>
          <div className="bg-[#DCFCE7] p-2 border border-[#86EFAC] rounded-[3px]">
            <span className="text-[10px] font-bold uppercase text-[#64748B]">In Stock</span>
            <div className="text-lg font-bold font-mono text-[#16A34A]">{inStockCount}</div>
          </div>
          <div className="bg-[#FEE2E2] p-2 border border-[#FCA5A5] rounded-[3px]">
            <span className="text-[10px] font-bold uppercase text-[#64748B]">Out of Stock</span>
            <div className="text-lg font-bold font-mono text-[#DC2626]">{totalItems - inStockCount}</div>
          </div>
          <div className="bg-[#FEF3C7] p-2 border border-[#FDE68A] rounded-[3px]">
            <span className="text-[10px] font-bold uppercase text-[#64748B]">Total Value</span>
            <div className="text-lg font-bold font-mono text-[#92400E]">
              {formatCurrency(totalStockValue)}
            </div>
          </div>
        </div> */}

        <div className="overflow-x-auto max-h-[340px] border border-[#E2E8F0] rounded-[3px]">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.header}
                    className="px-3 py-1.5 font-bold text-[#475569] text-[10px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0 text-center"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.header}
                        className="px-3 py-1 border-r border-[#E2E8F0] last:border-r-0 text-center"
                      >
                        {col.cell({
                          getValue: () => item[col.accessorKey],
                          row: { original: item },
                        })}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-6 text-center text-[#94A3B8]"
                  >
                    {loading ? "Loading items..." : "No items found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
