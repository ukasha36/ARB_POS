import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function SupplierPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filteredSubAreas, setFilteredSubAreas] = useState([]);

  const defaultForm = {
    code: '',
    title: '',
    mobile: '',
    telephone_1: '',
    address_1: '',
    address_2: '',
    area_id: '',
    sub_area_id: '',
    opening_balance: '0',
    opening_balance_type: 'Cr',
  };
  const [formData, setFormData] = useState(defaultForm);

  // Confirm deactivate
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadAreas = async () => {
    try {
      const res = await api.setups.areas.list({ includeInactive: false });
      if (res.success) setAreas(res.data || []);
    } catch (err) {
      console.error('Failed to load areas:', err);
    }
  };

  const loadSubAreasByArea = async (areaId) => {
    if (!areaId) {
      setFilteredSubAreas([]);
      return;
    }
    try {
      const res = await api.setups.subAreas.listByArea(areaId);
      if (res.success) setFilteredSubAreas(res.data || []);
      else setFilteredSubAreas([]);
    } catch (err) {
      setFilteredSubAreas([]);
    }
  };

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.setups.suppliers.list({ search, includeInactive });
      if (res.success) {
        setSuppliers(res.data || []);
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to load suppliers.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const handleAreaChange = async (areaId) => {
    setFormData((prev) => ({ ...prev, area_id: areaId, sub_area_id: '' }));
    await loadSubAreasByArea(areaId);
  };

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormData(defaultForm);
    setFilteredSubAreas([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code || '',
      title: supplier.title || '',
      mobile: supplier.mobile || '',
      telephone_1: supplier.telephone_1 || '',
      address_1: supplier.address_1 || '',
      address_2: supplier.address_2 || '',
      area_id: supplier.area_id ? String(supplier.area_id) : '',
      sub_area_id: supplier.sub_area_id ? String(supplier.sub_area_id) : '',
      opening_balance: supplier.opening_balance ? String(supplier.opening_balance) : '0',
      opening_balance_type: supplier.opening_balance_type || 'Cr',
    });
    if (supplier.area_id) {
      await loadSubAreasByArea(supplier.area_id);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.code.trim()) {
      setStatus({ type: 'error', text: 'Supplier Code is required.' });
      return;
    }
    if (!formData.title || !formData.title.trim()) {
      setStatus({ type: 'error', text: 'Company Name is required.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.trim(),
        title: formData.title.trim(),
        account_type: 'SUPPLIER',
      };
      let res;
      if (editingSupplier) {
        res = await api.setups.suppliers.update(editingSupplier.id, payload);
      } else {
        res = await api.setups.suppliers.create(payload);
      }
      if (res.success) {
        setStatus({
          type: 'success',
          text: `Supplier "${formData.title.trim()}" [${formData.code}] ${editingSupplier ? 'updated' : 'created'} successfully!`,
        });
        setIsModalOpen(false);
        loadSuppliers();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to save supplier.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateConfirm = (supplier) => {
    setConfirmTarget(supplier);
  };

  const handleDeactivateExecute = async () => {
    if (!confirmTarget) return;
    try {
      const res = await api.setups.suppliers.deactivate(confirmTarget.id);
      if (res.success) {
        setStatus({ type: 'success', text: `Supplier "${confirmTarget.title}" deactivated.` });
        loadSuppliers();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to deactivate.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setConfirmTarget(null);
    }
  };

  return (
    <div className="space-y-3 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              SUPPLIER SETUP
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Manage supplier accounts, contact details, and payable balances
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white rounded-[3px] text-xs font-semibold hover:bg-[#1D4ED8] transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Status Banner */}
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

      {/* Filter Bar */}
      <div className="bg-white p-2.5 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadSuppliers();
          }}
          className="flex-1 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search suppliers by code or name..."
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
          <span>Show Inactive</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] w-28">
                  Code
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Company Name
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] w-32">
                  Mobile
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] w-28">
                  Area
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-right w-36">
                  Payable (PKR)
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-center w-24">
                  Status
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider text-center w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[#94A3B8]">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length > 0 ? (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-mono font-semibold text-[#0F172A]">
                      {s.code}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-bold text-[#1E293B]">
                      {s.title}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-[#475569] font-mono">
                      {s.mobile || '—'}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-[#475569]">
                      {s.area_name || '—'}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-right font-mono font-semibold">
                      <span
                        className={
                          Number(s.payable_balance || 0) > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
                        }
                      >
                        {formatCurrency(s.payable_balance || 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'Active'
                            ? 'bg-[#DCFCE7] text-[#16A34A]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                      >
                        {s.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="p-1 hover:bg-[#EFF6FF] text-[#2563EB] rounded"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeactivateConfirm(s)}
                          className="p-1 hover:bg-[#FEF2F2] text-[#DC2626] rounded"
                          title="Deactivate Supplier"
                          disabled={s.status === 'Inactive'}
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[#94A3B8]">
                    No suppliers found. Click &quot;Add Supplier&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[4px] border border-[#CBD5E1] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#2563EB] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
              {/* Code & Company Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Supplier Code <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. SUP-001"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Company Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Al-Madina Traders"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              {/* Mobile & Telephone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Mobile
                  </label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="e.g. 0321-1234567"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Telephone
                  </label>
                  <input
                    type="text"
                    value={formData.telephone_1}
                    onChange={(e) => setFormData({ ...formData, telephone_1: e.target.value })}
                    placeholder="e.g. 042-1234567"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.address_1}
                  onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
                  placeholder="Street address"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.address_2}
                  onChange={(e) => setFormData({ ...formData, address_2: e.target.value })}
                  placeholder="Area / City"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              {/* Area & Sub Area */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Area
                  </label>
                  <select
                    value={formData.area_id}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="">— Select Area —</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Sub Area
                  </label>
                  <select
                    value={formData.sub_area_id}
                    onChange={(e) => setFormData({ ...formData, sub_area_id: e.target.value })}
                    disabled={!formData.area_id}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                  >
                    <option value="">— Select Sub Area —</option>
                    {filteredSubAreas.map((sa) => (
                      <option key={sa.id} value={sa.id}>
                        {sa.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opening Balance — only for new records */}
              {!editingSupplier && (
                <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
                      Opening Balance (PKR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
                      Balance Type
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      <label className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="opening_balance_type"
                          value="Dr"
                          checked={formData.opening_balance_type === 'Dr'}
                          onChange={(e) =>
                            setFormData({ ...formData, opening_balance_type: e.target.value })
                          }
                        />
                        <span>Dr</span>
                      </label>
                      <label className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="opening_balance_type"
                          value="Cr"
                          checked={formData.opening_balance_type === 'Cr'}
                          onChange={(e) =>
                            setFormData({ ...formData, opening_balance_type: e.target.value })
                          }
                        />
                        <span>Cr</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-[#CBD5E1] text-[#475569] text-xs font-semibold rounded-[3px] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8] disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirm Dialog */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[4px] border border-[#CBD5E1] shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#DC2626] text-white px-4 py-2.5 flex items-center gap-2">
              <PowerOff className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Confirm Deactivate</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-[#1E293B]">
                Are you sure you want to deactivate supplier{' '}
                <strong>"{confirmTarget.title}"</strong> [{confirmTarget.code}]? This will hide
                them from active supplier selections.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  onClick={() => setConfirmTarget(null)}
                  className="px-3 py-1.5 border border-[#CBD5E1] text-[#475569] text-xs font-semibold rounded-[3px] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivateExecute}
                  className="px-4 py-1.5 bg-[#DC2626] text-white text-xs font-bold rounded-[3px] hover:bg-[#B91C1C]"
                >
                  Yes, Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
