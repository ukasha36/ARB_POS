import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency, safeId, safeStr, safeNum, entryTypeLabel } from '../../utils/formatters';

const resolveAmount = (tx) => {
  const amount = Number(
    tx.total_amount ?? tx.totalAmount ?? tx.amount ?? tx.total ?? 0,
  );
  return Number.isFinite(amount) ? amount : 0;
};

const resolveAccountName = (tx) => {
  return tx.account_name ?? tx.accountName ?? tx.party_name ?? '';
};

export function TransactionHistoryTable({
  records = [],
  loading = false,
  onEdit,
  onVoid,
  entryTypeFilter,
}) {
  const filtered = entryTypeFilter
    ? records.filter((r) => r.entry_type === entryTypeFilter)
    : records;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-[#64748B]">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2563EB] border-t-transparent mr-2"></div>
        Loading transactions...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-center text-[11px] text-[#94A3B8] py-6">
        No transactions found
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[10px] border-collapse">
        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <tr>
            <th className="px-2 py-1.5  max-w-[100px] font-bold text-[#475569] uppercase">Date</th>
            <th className="px-2 py-1.5 font-bold text-[#475569]  max-w-[70px] uppercase">Type</th>
            <th className="px-2 py-1.5 font-bold text-[#475569]  max-w-[70px] uppercase">Account</th>
            <th className="px-2 py-1.5 font-bold text-[#475569] max-w-[150px]  uppercase">Item</th>
            <th className="px-2 py-1.5 font-bold text-[#475569] max-w-[100px] uppercase">Ref #</th>
            <th className="px-2 py-1.5 font-bold text-[#475569] text-left   max-w-[100px] uppercase ">Amount</th>
            <th className="px-2 py-1.5 font-bold text-[#475569] max-w-[100px] uppercase text-center w-20">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {filtered.filter(Boolean).map((tx, index) => {
            // Guard against null/undefined tx object
            if (!tx) return null;

            const isVoid = safeStr(tx?.status) === 'VOID';
            const amount = resolveAmount(tx);
            const accountName = resolveAccountName(tx);
            return (
              <tr key={safeId(tx?.entry_id) || `tx-${index}`} className={`hover:bg-[#F8FAFC] ${isVoid ? 'opacity-60' : ''} pt-3   `}>
                <td className="px-2 py-1 font-mono text-[#475569]">{safeStr(tx?.date, '—')}</td>
                <td className="px-2 py-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] max-w-[70px] font-bold text-[#2563EB] ">
                    {entryTypeLabel(safeStr(tx?.entry_type))}
                  </span>
                </td>
                <td className="px-2 py-1 font-mono text-[10px] max-w-[70px] font-bold text-[#0F172A]">{accountName || '—'}</td>
                <td className="px-2 py-1 text-[#0F172A] max-w-[150px] text-[10px] font-bold  truncate" title={tx?.item_names || ''}>
                  {tx?.item_names || '—'}
                </td>
                <td className="px-2 py-1 font-mono text-[#0F172A]">{safeStr(tx?.reference_no, '—')}</td>
                <td className="px-2 py-1   font-mono text-[11px] max-w-[100px]   font-bold text-[#2563EB]">
                  {formatCurrency(amount)}
                </td>

                <td className="px-2 py-1 text-center">
                  <div className="flex items-center justify-center max-w-[200px] gap-3">
                    {!isVoid && onEdit && (
                      <button
                        type="button"
                        onClick={() => tx && onEdit(tx)}
                        className="text-[#2563EB]   hover:bg-[#EFF6FF] p-0.75 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {!isVoid && onVoid && (
                      <button
                        type="button"
                        onClick={() => tx && onVoid(tx)}
                        className="text-[#DC2626] hover:bg-[#FEF2F2] p-0.75 rounded"
                        title="Void"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
