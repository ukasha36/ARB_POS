import { safeNum } from "./formatters";

export const PARTY_ACCOUNT_TYPES = new Set(["CUSTOMER", "SUPPLIER"]);

export const SYSTEM_ACCOUNT_TYPES = new Set([
  "CASH",
  "BANK",
  "REVENUE",
  "SALES",
  "PURCHASES",
  "COGS",
  "CAPITAL",
  "EXPENSE",
  "OTHER_INCOME",
  "AGENT",
  "CHEQUE_IN_HAND",
  "INACTIVE_CUSTOMER",
  "INSURANCE_TRACKER",
  "HANDY_PAYABLE",
  "HANDY_RECEIVABLE",
]);

export function isPartyAccount(account) {
  return Boolean(account) && PARTY_ACCOUNT_TYPES.has(account.account_type);
}

export function isSystemAccount(account) {
  return Boolean(account) && SYSTEM_ACCOUNT_TYPES.has(account.account_type);
}

export function filterPartyAccounts(accounts) {
  return (accounts || []).filter((a) => PARTY_ACCOUNT_TYPES.has(a.account_type));
}

export function filterCustomerAccounts(accounts) {
  return (accounts || []).filter((a) => a.account_type === "CUSTOMER");
}

export function filterSupplierAccounts(accounts) {
  return (accounts || []).filter((a) => a.account_type === "SUPPLIER");
}

export function filterCashBankAccounts(accounts) {
  return (accounts || []).filter(
    (a) => a.account_type === "CASH" || a.account_type === "BANK",
  );
}

export function filterRevenueAccounts(accounts) {
  return (accounts || []).filter(
    (a) =>
      a.status === "Active" &&
      (a.account_type === "REVENUE" || a.account_type === "SALES"),
  );
}

export function filterPurchasesAccounts(accounts) {
  return (accounts || []).filter(
    (a) =>
      a.status === "Active" &&
      (a.account_type === "PURCHASES" || a.account_type === "INVENTORY"),
  );
}

export function hasOutstandingReceivable(account) {
  return Boolean(account) && account.account_type === "CUSTOMER" && safeNum(account.balance) > 0;
}

export function hasOutstandingPayable(account) {
  return Boolean(account) && account.account_type === "SUPPLIER" && safeNum(account.balance) < 0;
}
