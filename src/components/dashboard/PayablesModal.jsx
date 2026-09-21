import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Search, ArrowUpRight } from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function PayablesModal({ isOpen, onClose }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.accounts.listWithBalances('SUPPLIER');
      if (res.success && res.data) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch payables', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const term = search.toLowerCase();
    return suppliers.filter((s) =>
      (s.title || '').toLowerCase().includes(term) ||
      (s.code || '').toLowerCase().includes(term)
    );
  }, [suppliers, search]);

  const payables = filtered.filter((s) => s.balance < 0);
  const totalPayable = payables.reduce((sum, s) => sum + Math.abs(s.balance), 0);

  const columns = [
    {
      header: 'Supplier Name',
      accessorKey: 'title',
      cell: (info) => (
        <span className="font-semibold text-[#0F172A]">{info.getValue() || '—'}</span>
      ),
    },
    {
      header: 'Type',
      accessorKey: 'account_type',
      cell: () => <span className="text-xs font-medium text-[#475569]">SUPPLIER</span>,
    },
    {
      header: 'Balance (PKR)',
      accessorKey: 'balance',
      cell: (info) => {
        const val = Number(info.getValue()) || 0;
        const displayVal = val < 0 ? Math.abs(val) : val;
        return (
          <span className="font-mono font-bold text-right text-[#DC2626]">
            {formatCurrency(displayVal)}
          </span>
        );
      },
    },
    {
      header: 'Remarks',
      accessorKey: 'remarks',
      cell: (info) => (
        <span className="text-[11px] text-[#64748B]">{info.getValue() || '—'}</span>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payables - Supplier Outstanding Liabilities"
      width="max-w-4xl"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find by supplier name or code..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="overflow-x-auto max-h-[400px] border border-[#E2E8F0] rounded-[3px]">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.header}
                    className="px-3 py-2 font-bold text-[#475569] text-[10px] uppercase tracking-wider border-r border-[#E2E8F0] last:border-r-0 text-left"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    {columns.map((col) => (
                      <td key={col.header} className="px-3 py-1.5 border-r border-[#E2E8F0] last:border-r-0">
                        {col.cell({ getValue: () => s[col.accessorKey], row: { original: s } })}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-6 text-center text-[#94A3B8]">
                    {loading ? 'Loading suppliers...' : 'No suppliers found.'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#FEF2F2]/50 border-t-2 border-[#FECACA]">
                <td colSpan={2} className="px-3 py-2 font-bold text-[#991B1B] text-[10px] uppercase">
                  Total Payable
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono font-bold text-[#DC2626] text-right">
                    {formatCurrency(Math.abs(totalPayable))}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  );
}
