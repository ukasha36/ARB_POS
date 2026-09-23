import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Search, ArrowDownLeft } from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency, safeNum } from '../../utils/formatters';
import { hasOutstandingReceivable } from '../../utils/accountFilters';

export function ReceivablesModal({ isOpen, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.accounts.listWithBalances('CUSTOMER');
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch receivables', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const term = search.toLowerCase();
    return customers.filter((c) =>
      (c.title || '').toLowerCase().includes(term) ||
      (c.code || '').toLowerCase().includes(term)
    );
  }, [customers, search]);

  const receivables = useMemo(() => {
    return filtered
      .filter(hasOutstandingReceivable)
      .sort((a, b) => safeNum(b.balance) - safeNum(a.balance));
  }, [filtered]);
  const totalReceivable = receivables.reduce((sum, c) => sum + safeNum(c.balance), 0);

  const columns = [
    {
      header: 'Customer Name',
      accessorKey: 'title',
      cell: (info) => (
        <span className="font-semibold text-[#0F172A]">{info.getValue() || '—'}</span>
      ),
    },
    {
      header: 'Type',
      accessorKey: 'account_type',
      cell: () => <span className="text-xs font-medium text-[#475569]">CUSTOMER</span>,
    },
    {
      header: 'Balance (PKR)',
      accessorKey: 'balance',
      cell: (info) => {
        const val = safeNum(info.getValue(), 0);
        const color = val >= 0 ? 'text-[#DC2626]' : 'text-[#16A34A]';
        return (
          <span className={`font-mono font-bold text-right ${color}`}>
            {formatCurrency(val)}
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
    {
      header: 'Salesman',
      accessorKey: 'salesman_id',
      cell: () => <span className="text-xs text-[#64748B]">COUNTER</span>,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receivables - Customer Outstanding Balances"
      width="max-w-4xl"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find by customer name or code..."
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
              {receivables.length > 0 ? (
                receivables.map((c) => (
                  <tr key={c.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    {columns.map((col) => (
                      <td key={col.header} className="px-3 py-1.5 border-r border-[#E2E8F0] last:border-r-0">
                        {col.cell({ getValue: () => c[col.accessorKey], row: { original: c } })}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-6 text-center text-[#94A3B8]">
                    {loading ? 'Loading customers...' : 'No customers with outstanding receivables found.'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#EFF6FF]/30 border-t-2 border-[#BFDBFE]">
                <td colSpan={2} className="px-3 py-2 font-bold text-[#0F172A] text-[10px] uppercase">
                  Total Receivable
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono font-bold text-[#DC2626] text-right">
                    {formatCurrency(totalReceivable)}
                  </span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  );
}
