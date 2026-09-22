/**
 * Formats a numeric amount as PKR currency for Pakistan POS & ERP software.
 * Example: 1245800.5 -> "Rs. 1,245,800.50"
 */
export function formatCurrency(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "Rs. 0.00";
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

export function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function safeStr(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function safeId(v) {
  if (v === null || v === undefined || v === "") return "";
  return String(v);
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
  CAPITAL: "Capital Investment",
  CAPITAL_WITHDRAWAL: "Capital Withdrawal",
};

export function entryTypeLabel(type) {
  if (!type) return "—";
  return ENTRY_TYPE_LABELS[type] || type.replace(/_/g, " ");
}
