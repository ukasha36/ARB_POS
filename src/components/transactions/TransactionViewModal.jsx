import React, { useState, useEffect } from 'react';
import { formatCurrency, entryTypeLabel } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export function TransactionViewModal({ isOpen, onClose, entryId, transaction: propTransaction }) {
  const [transaction, setTransaction] = useState(propTransaction || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      if (!propTransaction) setTransaction(null);
      setError(null);
      return;
    }

    if (entryId) {
      setLoading(true);
      setError(null);
      api.transactions.get(entryId)
        .then((res) => {
          if (res.success && res.data) {
            setTransaction(res.data);
          } else {
            setError(res.error || 'Failed to load transaction');
          }
        })
        .catch((err) => {
          setError(err.message || 'Error loading transaction');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (propTransaction) {
      setTransaction(propTransaction);
    }
  }, [isOpen, entryId, propTransaction]);

  const tx = transaction;
  const debitLines = tx?.debit_lines || [];
  const creditLines = tx?.credit_lines || [];
  const inventoryLines = tx?.inventory_lines || [];

  // Modal grand total = sum(debit_lines) of that voucher
  const grandTotal = debitLines.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0
  );

  const totalCredit = creditLines.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0
  );

  const totalInventoryQty = inventoryLines.reduce(
    (sum, inv) => sum + (Number(inv.qty) || 0),
    0
  );

  const totalInventoryAmount = inventoryLines.reduce(
    (sum, inv) => sum + (Number(inv.total_price) || (Number(inv.qty || 0) * Number(inv.unit_price || 0))),
    0
  );

  const modalTitle = tx?.reference_no
    ? `Voucher: ${tx.reference_no}`
    : 'Voucher Details';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      width="max-w-2xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] text-xs font-semibold rounded-[3px] transition"
        >
          Close
        </button>
      }
    >
      {loading ? (
        <div className="p-8 flex flex-col items-center justify-center gap-2 text-[#94A3B8]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
          <span className="text-xs">Loading voucher details...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-[3px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#DC2626]" />
          <span>{error}</span>
        </div>
      ) : !tx ? (
        <div className="p-6 text-center text-[#94A3B8] text-xs">
          No transaction details found.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Voucher Details */}
          <div className="grid grid-cols-3 gap-3 bg-[#F8FAFC] p-3 rounded-[3px] border border-[#E2E8F0] text-[12px]">
            <div>
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">Date</label>
              <p className="text-[#0F172A] font-mono font-medium mt-0.5">{tx.date || '—'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">Type</label>
              <p className="mt-0.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  {entryTypeLabel(tx.entry_type)}
                </span>
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">Reference #</label>
              <p className="text-[#0F172A] font-mono font-bold mt-0.5">{tx.reference_no || '—'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">Status</label>
              <p className="mt-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    tx.status === 'POSTED'
                      ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                      : 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]'
                  }`}
                >
                  {tx.status || 'POSTED'}
                </span>
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">Grand Total</label>
              <p className="text-[#0F172A] font-mono font-bold text-sm mt-0.5 text-[#2563EB]">
                {formatCurrency(grandTotal)}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">Description</label>
              <p className="text-[#0F172A] mt-0.5 truncate" title={tx.description}>
                {tx.description || '—'}
              </p>
            </div>
          </div>

          {/* Mini Ledger */}
          <div>
            <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">
              Ledger Distribution (Double Entry)
            </div>
            <div className="border border-[#E2E8F0] rounded-[3px] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-3 py-1.5 font-bold text-[#475569] text-[11px] uppercase border-r border-[#E2E8F0]">
                      Account Title
                    </th>
                    <th className="px-3 py-1.5 font-bold text-[#475569] text-[11px] uppercase border-r border-[#E2E8F0] text-right w-36">
                      Debit (Rs.)
                    </th>
                    <th className="px-3 py-1.5 font-bold text-[#475569] text-[11px] uppercase text-right w-36">
                      Credit (Rs.)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {debitLines.map((l, idx) => (
                    <tr key={`dr-${idx}`} className="hover:bg-[#F8FAFC]">
                      <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-[#0F172A] font-medium">
                        {l.account_title || l.account_name || 'Account'}
                      </td>
                      <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-right font-mono text-[#2563EB] font-semibold">
                        {formatCurrency(l.amount)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[#94A3B8]">
                        —
                      </td>
                    </tr>
                  ))}
                  {creditLines.map((l, idx) => (
                    <tr key={`cr-${idx}`} className="hover:bg-[#F8FAFC]">
                      <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-[#0F172A] font-medium">
                        {l.account_title || l.account_name || 'Account'}
                      </td>
                      <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-right font-mono text-[#94A3B8]">
                        —
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[#16A34A] font-semibold">
                        {formatCurrency(l.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F8FAFC] border-t border-[#CBD5E1] font-bold">
                  <tr>
                    <td className="px-3 py-1.5 border-r border-[#E2E8F0] uppercase tracking-wider text-[#0F172A]">
                      Total
                    </td>
                    <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-right font-mono text-[#2563EB]">
                      {formatCurrency(grandTotal)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[#16A34A]">
                      {formatCurrency(totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Inventory Items (ONLY if inventory_lines.length > 0) */}
          {inventoryLines.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">
                Inventory Items
              </div>
              <div className="border border-[#E2E8F0] rounded-[3px] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-3 py-1.5 font-bold text-[#475569] text-[11px] uppercase border-r border-[#E2E8F0]">
                        Item Name
                      </th>
                      <th className="px-3 py-1.5 font-bold text-[#475569] text-[11px] uppercase border-r border-[#E2E8F0] text-right w-24">
                        Qty
                      </th>
                      <th className="px-3 py-1.5 font-bold text-[#475569] text-[11px] uppercase border-r border-[#E2E8F0] text-right w-28">
                        Unit Price
                      </th>
                      <th className="px-3 py-1.5 font-bold text-[#475569] text-[11px] uppercase text-right w-32">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {inventoryLines.map((inv, idx) => {
                      const lineTotal = Number(inv.total_price) || (Number(inv.qty || 0) * Number(inv.unit_price || 0));
                      return (
                        <tr key={`inv-${idx}`} className="hover:bg-[#F8FAFC]">
                          <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-[#0F172A] font-medium">
                            {inv.item_name || (inv.item_code ? `${inv.item_name} [${inv.item_code}]` : `Item #${inv.item_id}`)}
                          </td>
                          <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-right font-mono text-[#0F172A]">
                            {inv.qty}
                          </td>
                          <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-right font-mono text-[#0F172A]">
                            {formatCurrency(inv.unit_price)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-[#0F172A]">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#F8FAFC] border-t border-[#CBD5E1] font-bold">
                    <tr>
                      <td className="px-3 py-1.5 border-r border-[#E2E8F0] uppercase tracking-wider text-[#0F172A]">
                        Total Items
                      </td>
                      <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-right font-mono text-[#0F172A]">
                        {totalInventoryQty}
                      </td>
                      <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-right text-[#64748B]">
                        —
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[#2563EB]">
                        {formatCurrency(totalInventoryAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
