import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  PowerOff,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function ItemManagementPage() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    barcode: '',
    category: 'General',
    supplier_id: '',
    purchase_price: '',
    unit_price: '',
    min_stock: '5',
    opening_stock_qty: '0',
    opening_cost_price: '0',
    status: 'Active',
  });

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await api.items.list(search, includeInactive);
      if (res.success) {
        setItems(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    loadItems();
    loadSuppliers();
  }, [includeInactive]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      code: `ITM-${Date.now().toString().slice(-4)}`,
      name: '',
      barcode: '',
      category: 'General',
      supplier_id: suppliers[0]?.id || '',
      purchase_price: '0',
      unit_price: '0',
      min_stock: '5',
      opening_stock_qty: '0',
      opening_cost_price: '0',
      stock_qty: '0',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      barcode: item.barcode || '',
      category: item.category || 'General',
      supplier_id: item.supplier_id || '',
      purchase_price: item.purchase_price ? String(item.purchase_price) : '0',
      unit_price: item.unit_price ? String(item.unit_price) : '0',
      min_stock: item.min_stock ? String(item.min_stock) : '5',
      opening_stock_qty: item.opening_stock_qty ? String(item.opening_stock_qty) : '0',
      opening_cost_price: item.opening_cost_price ? String(item.opening_cost_price) : '0',
      stock_qty: item.stock_qty !== undefined ? String(item.stock_qty) : '0',
      status: item.status || 'Active',
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      setStatus({ type: 'error', text: 'Item Code and Name are required.' });
      return;
    }

    try {
      const payload = {
        ...formData,
        id: editingItem ? editingItem.id : undefined,
      };
      const res = await api.items.save(payload);
      if (res.success) {
        setStatus({
          type: 'success',
          text: `Item [${formData.code}] saved successfully!`,
        });
        setIsModalOpen(false);
        loadItems();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to save item' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete/deactivate "${item.name}"?`)) {
      return;
    }

    try {
      const res = await api.items.delete(item.id);
      if (res.success) {
        setStatus({
          type: 'success',
          text: res.message || 'Item removed successfully.',
        });
        loadItems();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to remove item.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

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
              ITEM MASTER CATALOG SETUP
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Configure products, SKUs, barcode tracking, pricing rules, and suppliers
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white rounded-[3px] text-xs font-semibold hover:bg-[#1D4ED8] transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Item</span>
        </button>
      </div>

      {status && (
        <div
          className={`p-2.5 rounded-[3px] text-xs font-semibold border flex items-center justify-between gap-2 ${status.type === 'success'
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
      <div className="bg-white p-2.5 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadItems();
          }}
          className="flex-1 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search items by Code, Name, or Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[3px] text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <label className="flex items-center gap-1.5 text-xs text-[#475569] font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded text-[#2563EB]"
          />
          <span>Show Inactive Items</span>
        </label>
      </div>

      {/* Item Master Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Code / SKU
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Item Description
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Category
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Supplier
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  In Stock
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  Current WAC (PKR)
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right">
                  Sale Price (PKR)
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-center">
                  Status
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-mono font-semibold text-[#0F172A]">
                      {item.code}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0]">
                      <div className="font-bold text-[#1E293B]">{item.name}</div>
                      {item.barcode && (
                        <div className="text-[10px] text-[#64748B] font-mono">Barcode: {item.barcode}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0]">
                      <span className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] text-[11px]">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-[#475569]">
                      {item.supplier_name || '—'}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono font-bold text-[#0F172A]">
                      {Number(item.stock_qty || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#2563EB] font-semibold">
                      {formatCurrency(item.current_wac || item.purchase_price)}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono text-[#0F172A]">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'Active'
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                      >
                        {item.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 hover:bg-[#EFF6FF] text-[#2563EB] rounded"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 hover:bg-[#FEF2F2] text-[#DC2626] rounded"
                          title="Delete / Deactivate Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-[#94A3B8]">
                    {loading ? 'Loading items...' : 'No catalog items found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[4px] border border-[#CBD5E1] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#2563EB] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {editingItem ? 'Edit Item' : 'Create New Item'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Item Code / SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Item Description / Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Default Supplier
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="">-- None Selected --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Purchase Price (PKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Sale Price / Unit Price (PKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              {!editingItem && (
                <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
                      Stock quantity
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.opening_stock_qty}
                      onChange={(e) => setFormData({ ...formData, opening_stock_qty: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                    />
                  </div>
                </div>
              )}

              {editingItem && (
                <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
                      Stock quantity
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.stock_qty}
                      onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-[#CBD5E1] text-[#475569] text-xs font-semibold rounded-[3px] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8]"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
