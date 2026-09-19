import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';

export function WeightedAverageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const defaultSettings = {
    rounding_precision: '2',
    low_stock_threshold: '10',
  };
  const [settings, setSettings] = useState(defaultSettings);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.setups.wac.get();
      if (res.success && res.data) {
        setSettings({
          rounding_precision: String(res.data.rounding_precision ?? '2'),
          low_stock_threshold: String(res.data.low_stock_threshold ?? '10'),
        });
        if (res.data.updated_at) {
          setLastUpdated(res.data.updated_at);
        }
      }
    } catch (err) {
      setStatus({ type: 'error', text: 'Failed to load WAC settings: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!settings.low_stock_threshold || Number(settings.low_stock_threshold) < 0) {
      setStatus({ type: 'error', text: 'Low Stock Threshold must be a non-negative number.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await api.setups.wac.update({
        rounding_precision: Number(settings.rounding_precision),
        low_stock_threshold: Number(settings.low_stock_threshold),
      });
      if (res.success) {
        setStatus({ type: 'success', text: 'WAC settings saved successfully!' });
        if (res.data?.updated_at) setLastUpdated(res.data.updated_at);
      } else {
        setStatus({ type: 'error', text: res.error || 'Failed to save settings.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 select-none">
      {/* Header Banner */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EFF6FF] rounded text-[#2563EB]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">
              WEIGHTED AVERAGE COST (WAC) SETTINGS
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Configure inventory costing parameters and stock alert thresholds
            </p>
          </div>
        </div>
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

      {/* Info Callout */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[4px] p-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-[#1E40AF]">
            WAC is the Authoritative Costing Method
          </p>
          <p className="text-[11px] text-[#3B82F6] mt-0.5">
            This system uses <strong>Weighted Average Cost (WAC)</strong> exclusively to value
            inventory. Every purchase receipt automatically recalculates the running WAC for each
            item. These settings control the precision of stored cost values and the threshold
            for low-stock alerts. Do not change Rounding Precision after live data entry has begun.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-8 text-center text-xs text-[#94A3B8]">
          Loading WAC settings...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4 space-y-4 max-w-lg">
            {/* Section Header */}
            <div className="bg-[#EFF6FF] px-2.5 py-1 rounded-[3px] border border-[#BFDBFE] text-[#1E40AF] font-bold text-xs">
              COSTING CONFIGURATION
            </div>

            {/* Costing Method — display only */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Costing Method
              </label>
              <div className="w-full px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-[3px] text-[#475569] font-semibold flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-[#DBEAFE] text-[#1D4ED8] rounded text-[10px] font-bold">
                  FIXED
                </span>
                WAC (Weighted Average Cost)
              </div>
              <p className="text-[10px] text-[#94A3B8] mt-1">
                This field is locked. WAC is the only supported costing method.
              </p>
            </div>

            {/* Rounding Precision */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Rounding Precision (Decimal Places)
              </label>
              <select
                value={settings.rounding_precision}
                onChange={(e) =>
                  setSettings({ ...settings, rounding_precision: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none"
              >
                <option value="2">2 decimal places (e.g. 125.50)</option>
                <option value="3">3 decimal places (e.g. 125.500)</option>
                <option value="4">4 decimal places (e.g. 125.5000)</option>
              </select>
              <p className="text-[10px] text-[#94A3B8] mt-1">
                Controls how many decimal places are stored for WAC unit cost calculations.
              </p>
            </div>

            {/* Low Stock Threshold */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                Global Low Stock Threshold (Units)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={settings.low_stock_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, low_stock_threshold: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[3px] focus:border-[#2563EB] focus:outline-none font-mono"
              />
              <p className="text-[10px] text-[#94A3B8] mt-1">
                Items with stock quantity at or below this value will be flagged as low stock.
                Individual item thresholds (min_stock) take precedence when set.
              </p>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-[10px] text-[#94A3B8] border-t border-[#E2E8F0] pt-2">
                Last updated:{' '}
                <span className="font-semibold text-[#64748B]">
                  {new Date(lastUpdated).toLocaleString('en-PK')}
                </span>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={loadSettings}
                disabled={loading}
                className="px-3 py-1.5 border border-[#CBD5E1] text-[#475569] text-xs font-semibold rounded-[3px] hover:bg-[#F1F5F9]"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-[3px] hover:bg-[#1D4ED8] disabled:opacity-60 transition"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
