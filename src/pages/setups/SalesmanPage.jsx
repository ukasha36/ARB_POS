import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';

export function SalesmanPage() {
  const [salesmen, setSalesmen] = useState([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState(null);
  const [saving, setSaving] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '' });

  // Confirm deactivate
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadSalesmen = async () => {
    setLoading(true);
    try {
      const res = await api.setups.salesmen.list({ search, includeInactive });
      if (res.success) {
        setSalesmen(res.data || []);
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to load salesmen.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchNextCode = async () => {
    setCodeLoading(true);
    try {
      const res = await api.setups.salesmen.getNextCode();
      if (res.success && res.code) {
        setFormData((prev) => ({ ...prev, code: res.code }));
      }
    } catch (err) {
      console.error('Failed to fetch next code:', err);
    } finally {
      setCodeLoading(false);
    }
  };

  useEffect(() => {
    loadSalesmen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const handleOpenAddModal = async () => {
    setEditingSalesman(null);
    setFormData({ code: '', name: '' });
    setIsModalOpen(true);
    // Auto-fetch code after opening
    setCodeLoading(true);
    try {
      const res = await api.setups.salesmen.getNextCode();
      if (res.success && res.code) {
        setFormData({ code: res.code, name: '' });
      }
    } catch (err) {
      console.error('Failed to fetch next code:', err);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleOpenEditModal = (salesman) => {
    setEditingSalesman(salesman);
    setFormData({
      code: salesman.code || '',
      name: salesman.name || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setStatus({ type: 'error', text: 'Salesman Name is required.' });
      return;
    }
    if (!formData.code || !formData.code.trim()) {
      setStatus({ type: 'error', text: 'Salesman Code is required.' });
      return;
    }
    setSaving(true);
    try {
      const payload = { code: formData.code.trim(), name: formData.name.trim() };
      let res;
      if (editingSalesman) {
        res = await api.setups.salesmen.update(editingSalesman.id, payload);
      } else {
        res = await api.setups.salesmen.create(payload);
      }
      if (res.success) {
        setStatus({
          type: 'success',
          text: `Salesman "${formData.name.trim()}" [${formData.code}] ${editingSalesman ? 'updated' : 'created'} successfully!`,
        });
        setIsModalOpen(false);
        loadSalesmen();
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to save salesman.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateConfirm = (salesman) => {
    setConfirmTarget(salesman);
  };

  const handleDeactivateExecute = async () => {
    if (!confirmTarget) return;
    try {
      const res = await api.setups.salesmen.deactivate(confirmTarget.id);
      if (res.success) {
        setStatus({ type: 'success', text: `Salesman "${confirmTarget.name}" deactivated.` });
        loadSalesmen();
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
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              SALESMAN SETUP
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Manage sales representatives and field agents
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white rounded-[3px] text-xs font-semibold hover:bg-[#1D4ED8] transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Salesman</span>
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

      {/* Filter Bar */}
      <div className="bg-white p-2.5 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadSalesmen();
          }}
          className="flex-1 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search salesmen by code or name..."
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
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0] w-32">
                  Code
                </th>
                <th className="px-3 py-2 font-bold text-[#475569] text-[11px] uppercase tracking-wider border-r border-[#E2E8F0]">
                  Salesman Name
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
                    Loading salesmen...
                  </td>
                </tr>
              ) : salesmen.length > 0 ? (
                salesmen.map((sm) => (
                  <tr key={sm.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-mono font-semibold text-[#0F172A]">
                      {sm.code}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] font-bold text-[#1E293B]">
                      {sm.name}
                    </td>
                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sm.status === 'Active'
                            ? 'bg-[#DCFCE7] text-[#16A34A]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {sm.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(sm)}
                          className="p-1 hover:bg-[#EFF6FF] text-[#2563EB] rounded"
                          title="Edit Salesman"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeactivateConfirm(sm)}
                          className="p-1 hover:bg-[#FEF2F2] text-[#DC2626] rounded"
                          title="Deactivate Salesman"
                          disabled={sm.status === 'Inactive'}
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
                    No salesmen found. Click &quot;Add Salesman&quot; to create one.
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
                <UserCheck className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {editingSalesman ? 'Edit Salesman' : 'Add New Salesman'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1 flex items-center justify-between">
                  <span>
                    Salesman Code <span className="text-[#DC2626]">*</span>
                  </span>
                  {!editingSalesman && (
                    <button
                      type="button"
                      onClick={fetchNextCode}
                      disabled={codeLoading}
                      className="flex items-center gap-1 text-[10px] text-[#2563EB] hover:underline"
                    >
                      <RefreshCw className={`w-3 h-3 ${codeLoading ? 'animate-spin' : ''}`} />
                      Auto
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder={codeLoading ? 'Generating...' : 'e.g. SM-001'}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Full Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Muhammad Saleem"
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
                  {saving ? 'Saving...' : editingSalesman ? 'Update Salesman' : 'Save Salesman'}
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
                Are you sure you want to deactivate salesman{' '}
                <strong>"{confirmTarget.name}"</strong> [{confirmTarget.code}]?
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
