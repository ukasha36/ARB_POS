# Outstanding Balance Not Updating — Bugfix Design

## Overview

After posting an `HO_INCOMING` (customer receipt) or `HO_OUTGOING` (supplier payment) voucher, the
right-panel mini-ledger (**LENA BAQI** / **DENA BAQI**) does not decrease. The voucher is correctly
written to the database and appears in the history table, but the closing balance is never
recalculated to include the new voucher.

**Two independent defects compound to produce this symptom:**

1. **Frontend payload defect** — `IncomingTransactionPage` and `OutgoingTransactionPage` post
   transactions without a `party_account_id` field, so every `HO_INCOMING`/`HO_OUTGOING` row in
   `master_entries` has `party_account_id = NULL`.

2. **Backend query defect** — `getCustomerLedger` and `getSupplierLedger` in `reportRepository.js`
   join `ledger_lines` via `ll.account_id = me.party_account_id` and filter with
   `WHERE me.party_account_id = ?`. When `party_account_id` is NULL both conditions silently
   exclude the voucher.

**Fix strategy:**

- **Frontend**: add `party_account_id: parseInt(sourceAccountId/targetAccountId, 10)` to the
  transaction payload on both pages.
- **Backend**: replace the `LEFT JOIN ... ON ll.account_id = me.party_account_id` / `WHERE
  me.party_account_id = ?` pattern in both ledger queries with the authoritative pattern already
  used by `getAccountStatement`: `FROM ledger_lines ll JOIN master_entries me ON ll.entry_id =
  me.id WHERE ll.account_id = ?`.
- **UI re-fetch**: after every successful post / edit / void both pages already call
  `loadCustomerLedger` / `loadSupplierLedger` — no additional change needed here.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the stale-balance symptom — an `HO_INCOMING`
  or `HO_OUTGOING` row whose `party_account_id` is NULL, combined with a ledger query that filters
  by `party_account_id` instead of by the actual double-entry line.
- **Property (P)**: After fixing both defects, `getCustomerLedger(customerId).closingBalance`
  SHALL decrease by the receipt amount and `getSupplierLedger(supplierId).closingBalance` SHALL
  decrease by the payment amount immediately after posting.
- **Preservation**: All existing SALE / PURCHASE / SALES_RETURN / PURCHASE_RETURN ledger behaviour,
  double-entry integrity, history table display, and VOID exclusion must remain completely
  unchanged.
- **`getCustomerLedger(customerId)`**: Function in `electron/repositories/reportRepository.js`
  (line ~287) that builds the customer ledger and returns `openingBalance`, `closingBalance`,
  `records[]`, and a `summary` — used to render LENA BAQI.
- **`getSupplierLedger(supplierId)`**: Function in `electron/repositories/reportRepository.js`
  (line ~412) that builds the supplier ledger and returns the same shape — used to render
  DENA BAQI.
- **`getAccountStatement(accountId)`**: The **reference implementation** in the same file
  (line ~536) that correctly joins `ledger_lines` on `ll.account_id = ?` without relying on
  `party_account_id` — both ledger queries must be refactored to match this pattern.
- **`party_account_id`**: A denormalisation column on `master_entries` used to link a voucher to
  its primary party. Currently written for SALE / PURCHASE vouchers but not for
  `HO_INCOMING` / `HO_OUTGOING`.
- **LENA BAQI**: Outstanding receivable balance shown on `IncomingTransactionPage` right panel.
- **DENA BAQI**: Outstanding payable balance shown on `OutgoingTransactionPage` right panel.

---

## Bug Details

### Bug Condition

The stale-balance bug manifests in two layers that must both be true for the symptom to appear:

**Layer A — Frontend (payload missing `party_account_id`)**

Both `IncomingTransactionPage.handlePostIncoming` and `OutgoingTransactionPage.handlePostOutgoing`
build a `transactionData` object that contains `debit_lines` and `credit_lines` but omits
`party_account_id`. The backend `transactionIpc` / accounting service therefore writes the row with
`party_account_id = NULL`.

**Layer B — Backend (query relies on `party_account_id`)**

`getCustomerLedger` and `getSupplierLedger` both use:

```sql
FROM master_entries me
LEFT JOIN ledger_lines ll ON ll.entry_id = me.id AND ll.account_id = me.party_account_id
WHERE me.party_account_id = ?
```

When `party_account_id` is NULL the `WHERE` clause filters the row out entirely. Even if Layer A
were fixed alone (payload includes `party_account_id`), the JOIN condition `ll.account_id =
me.party_account_id` is fragile because it creates a circular reference through a denormalised
column rather than using the actual double-entry lines as the source of truth.

**Formal Specification:**

```
FUNCTION isBugCondition(entry)
  INPUT:  entry — a row from master_entries
  OUTPUT: boolean

  RETURN (entry.entry_type IN ['HO_INCOMING', 'HO_OUTGOING'])
    AND  (entry.party_account_id IS NULL)
    AND  (getCustomerLedger / getSupplierLedger filters by party_account_id)
END FUNCTION
```

### Examples

| Scenario | Expected LENA BAQI | Actual LENA BAQI (Buggy) |
|---|---|---|
| Sale of Rs 10,000 then receipt of Rs 10,000 | **0** | **10,000** (receipt invisible) |
| Sale of Rs 10,000 then receipt of Rs 4,000 | **6,000** | **10,000** (receipt invisible) |
| No transactions, opening balance Rs 5,000 | **5,000** | **5,000** (correct — no HO voucher) |
| Purchase Rs 8,000 then payment Rs 8,000 | **0** | **8,000** (payment invisible) |
| Purchase Rs 8,000 then payment Rs 3,000 | **5,000** | **8,000** (payment invisible) |

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Mouse clicks, keyboard input, and all non-receipt/payment interactions must behave identically.
- SALE and PURCHASE transactions must continue to appear in the ledger and affect closing balance
  exactly as before.
- SALES_RETURN and PURCHASE_RETURN must continue to reduce the respective closing balances.
- VOID vouchers must continue to be excluded from all balance calculations.
- The double-entry journal recording for `HO_INCOMING` (Dr Cash/Bank, Cr Customer) and
  `HO_OUTGOING` (Dr Supplier/Expense, Cr Cash/Bank) must remain unchanged.
- History table on both pages must continue to show all posted vouchers.
- Selecting a different party in the dropdown must continue to reload the ledger for the new party.
- EXPENSE-type accounts on `OutgoingTransactionPage` must continue to function as before — the
  `party_account_id` fix should only apply to SUPPLIER accounts on that page.
- `getSalesReport`, `getPurchaseReport`, and `getGeneralLedger` must return identical results.

**Scope:**

All inputs that do NOT involve `HO_INCOMING` or `HO_OUTGOING` vouchers are completely unaffected
by this fix.

---

## Hypothesized Root Cause

Based on code inspection, both root causes are **confirmed** (not merely hypothesised):

1. **Missing `party_account_id` in frontend payloads** — `IncomingTransactionPage.jsx` line ~137
   and `OutgoingTransactionPage.jsx` line ~149: the `transactionData` object has no
   `party_account_id` key. The accounting service does not infer it from `debit_lines`/
   `credit_lines`, so `master_entries.party_account_id` is written as NULL.

2. **Wrong SQL join pattern in `getCustomerLedger`** (line ~317) — uses
   `LEFT JOIN ledger_lines ll ON ll.entry_id = me.id AND ll.account_id = me.party_account_id` and
   `WHERE me.party_account_id = ?`. When `party_account_id` is NULL the entire row is excluded from
   both the opening-balance sub-query **and** the period rows query. The opening-balance
   sub-query is already correct (it joins on `ll.account_id = ?`), but the period-rows query is
   not.

3. **Wrong SQL join pattern in `getSupplierLedger`** (line ~445) — exactly the same structural
   defect as `getCustomerLedger`.

4. **`getAccountStatement` (line ~572) is the correct reference** — it drives the join from
   `ledger_lines` (`FROM ledger_lines ll JOIN master_entries me ON ll.entry_id = me.id WHERE
   ll.account_id = ?`), which is the authoritative double-entry source and requires no
   `party_account_id` at all. Both customer and supplier ledger queries must be refactored to match
   this pattern.

---

## Correctness Properties

Property 1: Bug Condition — Receipt/Payment Reduces Outstanding Balance

_For any_ `HO_INCOMING` transaction where the customer's account appears as a credit line AND
`isBugCondition` previously returned true, the fixed `getCustomerLedger` SHALL return a
`closingBalance` equal to `priorBalance − receiptAmount`, i.e. the receipt reduces LENA BAQI by
exactly the posted amount.

**Validates: Requirements 2.1, 2.3, 2.5, 2.7, 2.8**

Property 2: Bug Condition — Payment Reduces Supplier Outstanding Balance

_For any_ `HO_OUTGOING` transaction where the supplier's account appears as a debit line AND
`isBugCondition` previously returned true, the fixed `getSupplierLedger` SHALL return a
`closingBalance` equal to `priorBalance − paymentAmount`, i.e. the payment reduces DENA BAQI by
exactly the posted amount.

**Validates: Requirements 2.2, 2.4, 2.6, 2.9, 2.10**

Property 3: Preservation — Non-HO Ledger Behaviour Is Unchanged

_For any_ input that does NOT involve an `HO_INCOMING` or `HO_OUTGOING` voucher (i.e.,
`isBugCondition` returns false), the fixed `getCustomerLedger` and `getSupplierLedger` SHALL
produce the same `closingBalance`, `records[]`, `openingBalance`, and `summary` as the original
functions, preserving all SALE, PURCHASE, RETURN, and VOID behaviour.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.12**

---

## Fix Implementation

### Changes Required

#### File 1: `src/pages/operations/IncomingTransactionPage.jsx`

**Function**: `handlePostIncoming` (~line 137)

**Specific Changes**:

1. **Add `party_account_id` to the payload** — inside the `transactionData` object, add:
   ```js
   party_account_id: parseInt(sourceAccountId, 10),
   ```
   `sourceAccountId` is the selected CUSTOMER account and is already validated as required by the
   form. This ensures every new `HO_INCOMING` row in `master_entries` has the correct
   `party_account_id`.

2. **No other changes needed** — the post-save re-fetch of `loadCustomerLedger(sourceAccountId)`
   is already present and will immediately reflect the updated balance once the backend query is
   fixed.

#### File 2: `src/pages/operations/OutgoingTransactionPage.jsx`

**Function**: `handlePostOutgoing` (~line 149)

**Specific Changes**:

1. **Add `party_account_id` to the payload — SUPPLIER accounts only** — add:
   ```js
   party_account_id: parseInt(targetAccountId, 10),
   ```
   `targetAccountId` may be a SUPPLIER or an EXPENSE account. Since EXPENSE accounts have no
   payable ledger, this field is harmless for EXPENSE rows but needed for SUPPLIER rows.
   The backend query fix (File 3) drives from `ll.account_id` and does not rely on this field, but
   storing it maintains consistency and supports future reporting.

2. **No other changes needed** — the post-save re-fetch of `loadSupplierLedger(targetAccountId)` is
   already present.

#### File 3: `electron/repositories/reportRepository.js`

**Function**: `getCustomerLedger` (~line 287)

**Specific Changes**:

1. **Replace the period-rows SQL** — change the query from the `party_account_id`-driven pattern:

   ```sql
   -- BEFORE (broken)
   FROM master_entries me
   LEFT JOIN ledger_lines ll ON ll.entry_id = me.id AND ll.account_id = me.party_account_id
   WHERE me.party_account_id = ?
   ```

   to the `ledger_lines`-driven pattern matching `getAccountStatement`:

   ```sql
   -- AFTER (fixed)
   FROM ledger_lines ll
   JOIN master_entries me ON ll.entry_id = me.id
   WHERE ll.account_id = ? AND me.status = 'POSTED'
   ```

   The query parameter is `cid` (customer account ID), same value, just moved from `WHERE
   me.party_account_id` to `WHERE ll.account_id`.

2. **Update `transaction_amount` reference** — the original query selected `me.transaction_amount`
   and used it in the `else` branch (no receivable line). Under the new join pattern every returned
   row IS a ledger line, so the `else` branch (null `line_type`) is unreachable. Remove the
   `transaction_amount` column from the SELECT and remove the `else` branch in the record-mapping
   loop.

3. **Preserve `me.entry_type` classification** — keep SALE, SALES_RETURN, HO_INCOMING routing in
   the `if/else if` block; add `HO_INCOMING` credit line to `periodReceipts` accumulation
   (currently only checks `entry_type === 'RECEIPT'` which is a different voucher type — update to
   also include `'HO_INCOMING'` for consistency with the new routing).

**Function**: `getSupplierLedger` (~line 412)

**Specific Changes**: Mirror the exact same pattern change as `getCustomerLedger`:

1. Replace the `FROM master_entries me LEFT JOIN ledger_lines ll ON ... WHERE me.party_account_id
   = ?` with `FROM ledger_lines ll JOIN master_entries me ON ll.entry_id = me.id WHERE
   ll.account_id = ?`.
2. Remove `me.transaction_amount` from SELECT and the `else` fallback branch.
3. Add `'HO_OUTGOING'` to the `periodPayments` debit-line check alongside the existing `'PAYMENT'`
   entry_type.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
the bug on unfixed code, then verify the fix works correctly and preserves existing behaviour.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm
both root causes. If the tests reveal a different failure mode, re-hypothesise.

**Test Plan**: Write unit tests that:

1. Post an `HO_INCOMING` voucher **without** `party_account_id` (simulating the current frontend).
2. Call `getCustomerLedger(customerId)` and assert the closing balance has decreased.
3. Observe the assertion fail — confirming the ledger query silently skips NULL rows.

Repeat the same sequence for `HO_OUTGOING` / `getSupplierLedger`.

**Test Cases**:

1. **Incoming — full receipt** (will fail on unfixed code): Post sale Rs 10,000, post receipt
   Rs 10,000 without `party_account_id`, assert LENA BAQI = 0 → currently returns 10,000.
2. **Incoming — partial receipt** (will fail on unfixed code): Post sale Rs 10,000, post receipt
   Rs 4,000 without `party_account_id`, assert LENA BAQI = 6,000 → currently returns 10,000.
3. **Outgoing — full payment** (will fail on unfixed code): Post purchase Rs 8,000, post payment
   Rs 8,000 without `party_account_id`, assert DENA BAQI = 0 → currently returns 8,000.
4. **Outgoing — partial payment** (will fail on unfixed code): Post purchase Rs 8,000, post payment
   Rs 3,000 without `party_account_id`, assert DENA BAQI = 5,000 → currently returns 8,000.

**Expected Counterexamples**:

- `getCustomerLedger` returns the same closing balance before and after posting a receipt — the
  receipt row is entirely invisible.
- `getSupplierLedger` returns the same closing balance before and after posting a payment — the
  payment row is entirely invisible.

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the
expected behaviour.

**Pseudocode:**

```
FOR ALL entry WHERE isBugCondition(entry) DO
  priorBalance ← getCustomerLedger_fixed(customerId).closingBalance  // before posting entry
  POST entry (HO_INCOMING with party_account_id set)
  result ← getCustomerLedger_fixed(customerId).closingBalance
  ASSERT result = priorBalance − entry.amount
END FOR

FOR ALL entry WHERE isBugCondition_Outgoing(entry) DO
  priorBalance ← getSupplierLedger_fixed(supplierId).closingBalance
  POST entry (HO_OUTGOING with party_account_id set)
  result ← getSupplierLedger_fixed(supplierId).closingBalance
  ASSERT result = priorBalance − entry.amount
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions
produce the same result as the original functions.

**Pseudocode:**

```
FOR ALL accountId, transactionSet WHERE NOT isBugCondition(any entry in transactionSet) DO
  ASSERT getCustomerLedger_original(accountId, transactionSet)
       = getCustomerLedger_fixed(accountId, transactionSet)

  ASSERT getSupplierLedger_original(accountId, transactionSet)
       = getSupplierLedger_fixed(accountId, transactionSet)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across the input domain (varying amounts, dates, entry
  types, opening balances).
- It catches edge cases that manual unit tests might miss (e.g., rounding at exact boundary
  amounts).
- It provides strong guarantees that behaviour is unchanged for all non-buggy inputs.

**Test Plan**: First snapshot the original `getCustomerLedger` / `getSupplierLedger` output for
known SALE and PURCHASE data sets (no HO vouchers). After applying the fix, assert the snapshots
are identical.

**Test Cases**:

1. **Sale-only customer**: A customer with only SALE entries and no receipts — closing balance must
   equal sum of all sale amounts plus opening balance.
2. **Return customer**: A customer with SALE + SALES_RETURN entries — closing balance must equal
   sales minus returns plus opening balance.
3. **VOID exclusion**: A VOID receipt must not affect the closing balance.
4. **Purchase-only supplier**: A supplier with only PURCHASE entries — closing balance equals sum
   of purchase amounts plus opening balance.
5. **Return supplier**: A supplier with PURCHASE + PURCHASE_RETURN — closing balance equals
   purchases minus returns plus opening balance.
6. **Running balance column**: For a multi-row ledger, the final row's `running_balance` must equal
   `closingBalance` for both customer and supplier (Requirement 2.11).

---

### Unit Tests

- Test `getCustomerLedger` with a sale entry only — assert correct debit row and closing balance.
- Test `getCustomerLedger` with sale + HO_INCOMING receipt (party_account_id set) — assert credit
  row appears and closing balance decreases.
- Test `getCustomerLedger` with sale + VOID receipt — assert VOID is excluded.
- Test `getSupplierLedger` with purchase entry only — assert correct credit row and closing
  balance.
- Test `getSupplierLedger` with purchase + HO_OUTGOING payment (party_account_id set) — assert
  debit row appears and closing balance decreases.
- Test edge case: `HO_INCOMING` amount exactly equals opening balance → closing balance = 0.
- Test edge case: multiple receipts summing to total sale amount → closing balance = 0.

### Property-Based Tests

- Generate random customer accounts with random SALE amounts (no receipts). Verify closing balance
  = sum of sales + opening balance for both original and fixed implementations.
- Generate random sale + receipt combinations. Verify closing balance = sales − receipts +
  opening balance for the fixed implementation, and that VOID receipts are excluded.
- Generate random supplier accounts with random PURCHASE amounts. Verify closing balance = sum of
  purchases + opening balance for both original and fixed implementations.
- Generate arbitrary transaction sets without any `HO_INCOMING`/`HO_OUTGOING` entries. Verify
  fixed and original `getCustomerLedger` / `getSupplierLedger` return bitwise-identical results
  (the preservation property).

### Integration Tests

- Full flow: select customer → post sale (from SalesPage) → verify LENA BAQI increases → post
  receipt (from IncomingTransactionPage) → verify LENA BAQI decreases by receipt amount.
- Full flow: select supplier → post purchase → verify DENA BAQI increases → post payment →
  verify DENA BAQI decreases by payment amount.
- Edit flow: post receipt → verify balance → edit receipt to different amount → verify balance
  updates correctly.
- Void flow: post receipt → verify balance decreases → void receipt → verify balance returns to
  pre-receipt value.
- Switching parties: post receipt for customer A → switch dropdown to customer B → verify customer
  A's balance is unaffected, customer B's ledger reloads independently.
