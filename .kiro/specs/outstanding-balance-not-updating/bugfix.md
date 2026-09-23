# Bugfix Requirements Document

## Introduction

After posting an `HO_INCOMING` (receipt from customer) or `HO_OUTGOING` (payment to supplier) voucher, the outstanding balance panel — **LENA BAQI** for customers and **DENA BAQI** for suppliers — does not decrease. The voucher is correctly written to the database and appears in the history table, but the right-panel mini-ledger and closing balance are not recalculated to include the new voucher.

Root cause (for reference only): `getCustomerLedger` and `getSupplierLedger` in `reportRepository.js` filter transactions by `WHERE me.party_account_id = ?`. The `IncomingTransactionPage` and `OutgoingTransactionPage` components post vouchers **without** a `party_account_id`, so those voucher rows have `party_account_id = NULL` in `master_entries` and are invisible to both ledger queries. As a result, the closing balance returned never reflects the receipt or payment, and the UI panel stays stale.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a customer receipt (`HO_INCOMING`) is posted without a `party_account_id` field THEN the `getCustomerLedger` query does not include that receipt row, causing LENA BAQI to remain unchanged after posting.

1.2 WHEN a supplier payment (`HO_OUTGOING`) is posted without a `party_account_id` field THEN the `getSupplierLedger` query does not include that payment row, causing DENA BAQI to remain unchanged after posting.

1.3 WHEN a customer receipt is edited or voided THEN the LENA BAQI panel does not reflect the updated ledger state, continuing to show the stale pre-edit or pre-void balance.

1.4 WHEN a supplier payment is edited or voided THEN the DENA BAQI panel does not reflect the updated ledger state, continuing to show the stale pre-edit or pre-void balance.

1.5 WHEN the `getCustomerLedger` query runs for a given customer THEN it aggregates only transactions where `me.party_account_id = customerId`, silently skipping `HO_INCOMING` vouchers where `party_account_id IS NULL`.

1.6 WHEN the `getSupplierLedger` query runs for a given supplier THEN it aggregates only transactions where `me.party_account_id = supplierId`, silently skipping `HO_OUTGOING` vouchers where `party_account_id IS NULL`.

---

### Expected Behavior (Correct)

2.1 WHEN a customer receipt (`HO_INCOMING`) is posted, edited, or voided AND the selected customer account is the credit-side party of that voucher THEN the system SHALL include that voucher in `getCustomerLedger` so that LENA BAQI decreases by the receipt amount immediately after the operation.

2.2 WHEN a supplier payment (`HO_OUTGOING`) is posted, edited, or voided AND the selected supplier account is the debit-side party of that voucher THEN the system SHALL include that voucher in `getSupplierLedger` so that DENA BAQI decreases by the payment amount immediately after the operation.

2.3 WHEN `IncomingTransactionPage` posts or edits an `HO_INCOMING` transaction THEN the system SHALL include `party_account_id` set to the selected customer account ID in the transaction payload so that the voucher is linkable to that customer.

2.4 WHEN `OutgoingTransactionPage` posts or edits an `HO_OUTGOING` transaction THEN the system SHALL include `party_account_id` set to the selected supplier account ID (when the target is a SUPPLIER) in the transaction payload so that the voucher is linkable to that supplier.

2.5 WHEN `getCustomerLedger` builds the ledger for a customer THEN the system SHALL retrieve all POSTED ledger lines touching that customer's account (by `ll.account_id = customerId`) rather than filtering only by `me.party_account_id`, so that `HO_INCOMING`, `SALE`, and `SALES_RETURN` entries are all included.

2.6 WHEN `getSupplierLedger` builds the ledger for a supplier THEN the system SHALL retrieve all POSTED ledger lines touching that supplier's account (by `ll.account_id = supplierId`) rather than filtering only by `me.party_account_id`, so that `HO_OUTGOING`, `PURCHASE`, and `PURCHASE_RETURN` entries are all included.

2.7 WHEN a full receipt equals the total outstanding sale amount THEN the system SHALL return a closing balance of 0 for LENA BAQI.

2.8 WHEN a partial receipt is less than the total outstanding sale amount THEN the system SHALL return a closing balance equal to `(total sales + opening balance) − total receipts − total returns` for LENA BAQI.

2.9 WHEN a full payment equals the total outstanding purchase amount THEN the system SHALL return a closing balance of 0 for DENA BAQI.

2.10 WHEN a partial payment is less than the total outstanding purchase amount THEN the system SHALL return a closing balance equal to `(total purchases + opening balance) − total payments − total returns` for DENA BAQI.

2.11 WHEN the right-panel mini-ledger is displayed THEN the system SHALL show a running balance column whose final row value equals the closing balance (LENA BAQI or DENA BAQI) shown in the summary header.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a customer account has only SALE transactions and no receipts THEN the system SHALL CONTINUE TO calculate LENA BAQI as the sum of all sale amounts plus any opening balance.

3.2 WHEN a supplier account has only PURCHASE transactions and no payments THEN the system SHALL CONTINUE TO calculate DENA BAQI as the sum of all purchase amounts plus any opening balance.

3.3 WHEN a SALES_RETURN is posted for a customer THEN the system SHALL CONTINUE TO reduce LENA BAQI by the return amount.

3.4 WHEN a PURCHASE_RETURN is posted for a supplier THEN the system SHALL CONTINUE TO reduce DENA BAQI by the return amount.

3.5 WHEN a voucher has status `VOID` THEN the system SHALL CONTINUE TO exclude it from all balance calculations for both LENA BAQI and DENA BAQI.

3.6 WHEN an `HO_INCOMING` or `HO_OUTGOING` voucher is posted THEN the system SHALL CONTINUE TO record it in the history table and display it in the history panel on the respective page.

3.7 WHEN an `HO_INCOMING` voucher is posted THEN the system SHALL CONTINUE TO record the accounting entry as Dr Cash/Bank, Cr Customer (double-entry unchanged).

3.8 WHEN an `HO_OUTGOING` voucher is posted THEN the system SHALL CONTINUE TO record the accounting entry as Dr Supplier/Expense, Cr Cash/Bank (double-entry unchanged).

3.9 WHEN the user selects a different customer in the dropdown on `IncomingTransactionPage` THEN the system SHALL CONTINUE TO reload LENA BAQI and the mini-ledger for the newly selected customer.

3.10 WHEN the user selects a different supplier in the dropdown on `OutgoingTransactionPage` THEN the system SHALL CONTINUE TO reload DENA BAQI and the mini-ledger for the newly selected supplier.

3.11 WHEN the party is EXPENSE type on `OutgoingTransactionPage` THEN the system SHALL CONTINUE TO behave as before (supplier-specific baqi logic does not apply to EXPENSE accounts).

3.12 WHEN SALE or PURCHASE ledger report pages call `getCustomerLedger` or `getSupplierLedger` THEN the system SHALL CONTINUE TO return identical results for SALE, SALES_RETURN, PURCHASE, and PURCHASE_RETURN rows as before the fix.

---

## Bug Condition Pseudocode

```pascal
FUNCTION isBugCondition_Incoming(entry)
  INPUT: entry — a master_entries row
  OUTPUT: boolean

  RETURN entry.entry_type = 'HO_INCOMING'
    AND entry.party_account_id IS NULL
END FUNCTION

FUNCTION isBugCondition_Outgoing(entry)
  INPUT: entry — a master_entries row
  OUTPUT: boolean

  RETURN entry.entry_type = 'HO_OUTGOING'
    AND entry.party_account_id IS NULL
END FUNCTION
```

```pascal
// Property: Fix Checking — Incoming
FOR ALL entry WHERE isBugCondition_Incoming(entry) DO
  balance ← getCustomerLedger'(entry.customer_account_id).closingBalance
  ASSERT balance = priorBalance − entry.amount
END FOR

// Property: Fix Checking — Outgoing
FOR ALL entry WHERE isBugCondition_Outgoing(entry) DO
  balance ← getSupplierLedger'(entry.supplier_account_id).closingBalance
  ASSERT balance = priorBalance − entry.amount
END FOR

// Property: Preservation Checking
FOR ALL entry WHERE NOT isBugCondition_Incoming(entry)
                AND NOT isBugCondition_Outgoing(entry) DO
  ASSERT getCustomerLedger(entry) = getCustomerLedger'(entry)
  ASSERT getSupplierLedger(entry) = getSupplierLedger'(entry)
END FOR
```
