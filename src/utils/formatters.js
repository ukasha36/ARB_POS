/**
 * Formats a numeric amount as PKR currency for Pakistan POS & ERP software.
 * Example: 1245800.5 -> "Rs. 1,245,800.50"
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

export function formatPKR(amount) {
  return formatCurrency(amount);
}

const ENTRY_TYPE_LABELS = {
  HO_INCOMING: "Receipt",
  HO_OUTGOING: "Payment",
  SALE: "Sale",
  PURCHASE: "Purchase",
  SALES_RETURN: "Sale Return",
  PURCHASE_RETURN: "Purchase Return",
  CAPITAL: "Capital",
};

export function entryTypeLabel(type) {
  if (!type) return "—";
  return ENTRY_TYPE_LABELS[type] || type.replace(/_/g, " ");
}
