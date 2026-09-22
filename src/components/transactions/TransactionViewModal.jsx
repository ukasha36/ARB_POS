import React from 'react';
import { formatCurrency, entryTypeLabel } from '../../utils/formatters';

export function TransactionViewModal({ transaction, onEdit }) {
  if (!transaction) return null;

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <label className="text-[10px] font-bold text-[#64748B] uppercase">Date</label>
          <p className="text-[#0F172A] font-mono mt-0.5">{transaction.date}</p>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#64748B] uppercase">Type</label>
          <p className="mt-0.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              {entryTypeLabel(transaction.entry_type)}
            </span>
          </p>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#64748B] uppercase">Reference #</label>
          <p className="text-[#0F172A] font-mono mt-0.5">{transaction.reference_no || '—'}</p>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#64748B] uppercase">Amount</label>
          <p className="text-[#0F172A] font-mono font-bold mt-0.5">{formatCurrency(transaction.total_amount)}</p>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-[#64748B] uppercase">Description</label>
          <p className="text-[#0F172A] mt-0.5">{transaction.description || '—'}</p>
        </div>
        {transaction.notes && (
          <div className="col-span-2">
            <label className="text-[10px] font-bold text-[#64748B] uppercase">Notes</label>
            <p className="text-[#0F172A] mt-0.5">{transaction.notes}</p>
          </div>
        )}
      </div>
      {onEdit && (
        <div className="flex justify-end mt-4 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => onEdit(transaction)}
            className="px-3 py-1.5 text-[11px] font-medium text-[#2563EB] hover:bg-[#EFF6FF] rounded"
          >
            Edit Transaction
          </button>
        </div>
      )}
    </div>
  );
}
