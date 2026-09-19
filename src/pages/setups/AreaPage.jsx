import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '../../services/api';

export function AreaPage() {
  const [areas, setAreas] = useState([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  // Confirm deactivate state
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const res = await api.setups.areas.list({ search, includeInactive });
      if (res.success) {
        setAreas(res.data || []);
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to load areas.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const handleOpenAddModal = () => {
    setEditingArea(null);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (area) => {
    setEditingArea(area);
    setFormData({ name: area.name || '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setStatus({ type: 'error', text: 'Area Name is required.' });
      return;
    }
    setSaving(true);
    try {
      let res;
      if (editingArea) {
        res = await api.setups.areas.update(editingArea.id, { name: formData.name.trim() });
      } else {
        res = await api.setups.areas.create({ name: formData.name.trim() });
      }
      if (res.success) {
        setStatus({
          type: 'success',
          text: `Area "${formData.name.trim()}" ${editingArea ? 'updated' : 'created'} successfully!`,
        });
        setIsModalOpen(false);
        loadAreas();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to save area.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateConfirm = (area) => {
    setConfirmTarget(area);
  };

  const handleDeactivateExecute = async () => {
    if (!confirmTarget) return;
    try {
      const res = await api.setups.areas.deactivate(confirmTarget.id);
      if (res.success) {
        setStatus({ type: 'success', text: `Area "${confirmTarget.name}" deactivated.` });
        loadAreas();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to deactivate area.' });
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
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              AREA SETUP
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Manage geographic areas for customer and supplier classification
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white rounded-[3px] text-xs font-semibold hover:bg-[#1D4ED8] transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Area</span>
        </button>
      </div>

      {/* Status Banner */}
      {status && (
        <div
          className={`p-2.5 rounded-[3px] text-xs font-semibold border flex items-center justify-between gap-2 ${
            status.type === 'success'
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

      {/* Filter / Search Bar */}
      <div className="bg-white p-2.5 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadAreas();
          }}
          className="flex-1 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search areas by name..."
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
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] w-20">
                  ID
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Area Name
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] text-center w-28">
                  Status
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider text-center w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[#94A3B8]">
                    Loading areas...
                  </td>
                </tr>
              ) : areas.length > 0 ? (
                areas.map((area) => (
                  <tr key={area.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-mono text-[#64748B]">
                      {area.id}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-bold text-[#1E293B]">
                      {area.name}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          area.status === 'Active'
                            ? 'bg-[#DCFCE7] text-[#16A34A]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {area.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(area)}
                          className="p-1 hover:bg-[#EFF6FF] text-[#2563EB] rounded"
                          title="Edit Area"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeactivateConfirm(area)}
                          className="p-1 hover:bg-[#FEF2F2] text-[#DC2626] rounded"
                          title="Deactivate Area"
                          disabled={area.status === 'Inactive'}
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[#94A3B8]">
                    No areas found. Click &quot;Add Area&quot; to create one.
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
          <div className="bg-white rounded-[4px] border border-[#CBD5E1] shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#2563EB] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {editingArea ? 'Edit Area' : 'Add New Area'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Area Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="e.g. North Zone, City Area"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

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
                  {saving ? 'Saving...' : editingArea ? 'Update Area' : 'Save Area'}
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
                Are you sure you want to deactivate area{' '}
                <strong>"{confirmTarget.name}"</strong>? This will hide it from active selections.
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
