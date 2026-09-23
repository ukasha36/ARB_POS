# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Receipt/Payment Invisible When party_account_id Is NULL
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both root causes
  - **Scoped PBT Approach**: Scope the property to the four concrete failing cases below to ensure reproducibility on deterministic in-process DB state
  - Set up an in-memory SQLite database (same schema as production) and seed with one CUSTOMER account and one SUPPLIER account
  - **Case 1 — Full customer receipt (Incoming)**:
    - Post a SALE entry of Rs 10,000 for the customer with `party_account_id` set
    - Post an `HO_INCOMING` entry of Rs 10,000 **without** `party_account_id` (simulating current frontend payload)
    - Call `getCustomerLedger(customerId)` and assert `closingBalance === 0`
    - **EXPECTED OUTCOME**: Assertion FAILS — `closingBalance` stays 10,000 (receipt row invisible)
  - **Case 2 — Partial customer receipt (Incoming)**:
    - Post a SALE of Rs 10,000, then post `HO_INCOMING` of Rs 4,000 without `party_account_id`
    - Assert `closingBalance === 6000`
    - **EXPECTED OUTCOME**: Assertion FAILS — `closingBalance` stays 10,000
  - **Case 3 — Full supplier payment (Outgoing)**:
    - Post a PURCHASE entry of Rs 8,000 for the supplier with `party_account_id` set
    - Post an `HO_OUTGOING` entry of Rs 8,000 **without** `party_account_id`
    - Call `getSupplierLedger(supplierId)` and assert `closingBalance === 0`
    - **EXPECTED OUTCOME**: Assertion FAILS — `closingBalance` stays 8,000
  - **Case 4 — Partial supplier payment (Outgoing)**:
    - Post a PURCHASE of Rs 8,000, then post `HO_OUTGOING` of Rs 3,000 without `party_account_id`
    - Assert `closingBalance === 5000`
    - **EXPECTED OUTCOME**: Assertion FAILS — `closingBalance` stays 8,000
  - Document counterexamples found (e.g., "getCustomerLedger returns 10000 instead of 0 when HO_INCOMING has party_account_id=NULL")
  - Mark task complete when tests are written, run on unfixed code, and all four failures are documented
  - _Requirements: 1.1, 1.2, 1.5, 1.6_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-HO-Voucher Ledger Behaviour Is Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run the UNFIXED code with non-buggy inputs first
  - Scope: inputs where `isBugCondition_Incoming` and `isBugCondition_Outgoing` both return false — i.e. transactions that are SALE, PURCHASE, SALES_RETURN, PURCHASE_RETURN, or VOID, with no `HO_INCOMING`/`HO_OUTGOING` rows
  - **Observation step — run on UNFIXED code**:
    - Customer with only SALE entries: observe `getCustomerLedger` returns `closingBalance = sum(sales) + openingBalance`
    - Customer with SALE + SALES_RETURN: observe `closingBalance = sales - returns + openingBalance`
    - Supplier with only PURCHASE entries: observe `getSupplierLedger` returns `closingBalance = sum(purchases) + openingBalance`
    - Supplier with PURCHASE + PURCHASE_RETURN: observe `closingBalance = purchases - returns + openingBalance`
    - VOID voucher: observe that voided entries are excluded from balance
    - Running balance: observe that the final row's `running_balance` equals `closingBalance`
  - **Property-based test** (generates many random non-HO transaction sets for stronger guarantees):
    - For all randomly-generated CUSTOMER account states with only SALE/SALES_RETURN/VOID entries (no HO vouchers): assert `closingBalance_fixed === closingBalance_original`
    - For all randomly-generated SUPPLIER account states with only PURCHASE/PURCHASE_RETURN/VOID entries: assert `closingBalance_fixed === closingBalance_original`
    - For multi-row ledger: assert last `records[n-1].running_balance === closingBalance`
  - Run these property tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behaviour to preserve)
  - Mark task complete when tests are written, run on unfixed code, and all pass
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.12_

- [ ] 3. Fix: Receipt/Payment outstanding balance not updating

  - [ ] 3.1 Add `party_account_id` to the `HO_INCOMING` payload in `IncomingTransactionPage.jsx`
    - File: `src/pages/operations/IncomingTransactionPage.jsx`
    - In `handlePostIncoming`, inside the `transactionData` object (after `credit_lines`), add:
      ```js
      party_account_id: parseInt(sourceAccountId, 10),
      ```
    - `sourceAccountId` is already validated as required by the form — no additional guard needed
    - The existing post-save call to `loadCustomerLedger(sourceAccountId)` will automatically reflect the updated balance once the backend query is also fixed
    - _Bug_Condition: isBugCondition_Incoming(entry) — entry.entry_type = 'HO_INCOMING' AND entry.party_account_id IS NULL_
    - _Expected_Behavior: getCustomerLedger(customerId).closingBalance decreases by receipt amount after posting_
    - _Preservation: double-entry lines (Dr Cash/Bank, Cr Customer) remain unchanged; history table display unchanged_
    - _Requirements: 2.3, 2.1, 3.7_

  - [ ] 3.2 Add `party_account_id` to the `HO_OUTGOING` payload in `OutgoingTransactionPage.jsx`
    - File: `src/pages/operations/OutgoingTransactionPage.jsx`
    - In `handlePostOutgoing`, inside the `transactionData` object (after `credit_lines`), add:
      ```js
      party_account_id: parseInt(targetAccountId, 10),
      ```
    - `targetAccountId` may be SUPPLIER or EXPENSE — storing it is harmless for EXPENSE rows and required for SUPPLIER rows
    - The existing post-save call to `loadSupplierLedger(targetAccountId)` handles the UI re-fetch
    - _Bug_Condition: isBugCondition_Outgoing(entry) — entry.entry_type = 'HO_OUTGOING' AND entry.party_account_id IS NULL_
    - _Expected_Behavior: getSupplierLedger(supplierId).closingBalance decreases by payment amount after posting_
    - _Preservation: double-entry lines (Dr Supplier/Expense, Cr Cash/Bank) remain unchanged; EXPENSE accounts continue to function as before_
    - _Requirements: 2.4, 2.2, 3.8, 3.11_

  - [ ] 3.3 Refactor `getCustomerLedger` SQL to join via `ledger_lines` instead of `party_account_id`
    - File: `electron/repositories/reportRepository.js`, function `getCustomerLedger`
    - Replace the period-rows query:
      ```sql
      -- BEFORE (broken)
      FROM master_entries me
      LEFT JOIN ledger_lines ll ON ll.entry_id = me.id AND ll.account_id = me.party_account_id
      WHERE me.party_account_id = ? AND me.status = 'POSTED'
      ```
      with the `ledger_lines`-driven pattern (matching `getAccountStatement`):
      ```sql
      -- AFTER (fixed)
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED'
      ```
    - Query parameter remains `cid` (same value, moved from `WHERE me.party_account_id` to `WHERE ll.account_id`)
    - Remove `me.transaction_amount` from the SELECT — every returned row is now a direct ledger line, so the `else` (null `line_type`) branch is unreachable; remove it
    - Update `periodReceipts` accumulation to include `'HO_INCOMING'` alongside `'RECEIPT'` (if/else if block in record-mapping loop)
    - The opening-balance sub-query already uses `ll.account_id = ?` — no change needed there
    - _Bug_Condition: getCustomerLedger filters by me.party_account_id — NULL rows excluded_
    - _Expected_Behavior: getCustomerLedger returns closingBalance = priorBalance − receiptAmount for all HO_INCOMING entries_
    - _Preservation: SALE, SALES_RETURN, VOID exclusion, running balance, and summary.sales/returns/receipts fields produce identical results for non-HO inputs_
    - _Requirements: 2.5, 2.1, 2.7, 2.8, 2.11, 3.1, 3.3, 3.5, 3.12_

  - [ ] 3.4 Refactor `getSupplierLedger` SQL to join via `ledger_lines` instead of `party_account_id`
    - File: `electron/repositories/reportRepository.js`, function `getSupplierLedger`
    - Apply the exact same SQL pattern change as step 3.3 (mirror the fix):
      ```sql
      -- AFTER (fixed)
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED'
      ```
    - Query parameter is `sid` (supplier account ID)
    - Remove `me.transaction_amount` from SELECT and remove the `else` fallback branch in the record-mapping loop
    - Update `periodPayments` accumulation to include `'HO_OUTGOING'` alongside `'PAYMENT'`
    - _Bug_Condition: getSupplierLedger filters by me.party_account_id — NULL rows excluded_
    - _Expected_Behavior: getSupplierLedger returns closingBalance = priorBalance − paymentAmount for all HO_OUTGOING entries_
    - _Preservation: PURCHASE, PURCHASE_RETURN, VOID exclusion, running balance, and summary fields produce identical results for non-HO inputs_
    - _Requirements: 2.6, 2.2, 2.9, 2.10, 2.11, 3.2, 3.4, 3.5, 3.12_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Receipt/Payment Reduces Outstanding Balance After Fix
    - **IMPORTANT**: Re-run the SAME four test cases from task 1 — do NOT write new tests
    - The four cases from task 1 encode the expected behavior; when they pass, the fix is confirmed
    - Run all four cases against the fixed code (tasks 3.1–3.4 applied):
      - Case 1: SALE 10,000 + HO_INCOMING 10,000 with `party_account_id` set → `closingBalance === 0`
      - Case 2: SALE 10,000 + HO_INCOMING 4,000 with `party_account_id` set → `closingBalance === 6000`
      - Case 3: PURCHASE 8,000 + HO_OUTGOING 8,000 with `party_account_id` set → `closingBalance === 0`
      - Case 4: PURCHASE 8,000 + HO_OUTGOING 3,000 with `party_account_id` set → `closingBalance === 5000`
    - **EXPECTED OUTCOME**: All four assertions PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.7, 2.8, 2.9, 2.10_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-HO Ledger Behaviour Is Unchanged After Fix
    - **IMPORTANT**: Re-run the SAME property tests from task 2 — do NOT write new tests
    - Run the property-based preservation tests from task 2 against the fixed code
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions for SALE, PURCHASE, RETURN, VOID paths)
    - Confirm `getSalesReport`, `getPurchaseReport`, and `getGeneralLedger` return identical results (these functions were not changed)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.12_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Re-run the full test suite: exploration test (task 1), preservation property tests (task 2), and all sub-task verifications (3.5, 3.6)
  - Manually verify end-to-end in the running app:
    - Select a customer → post a credit sale → confirm LENA BAQI increases → post a receipt → confirm LENA BAQI decreases by receipt amount
    - Select a supplier → post a credit purchase → confirm DENA BAQI increases → post a payment → confirm DENA BAQI decreases by payment amount
    - Void the receipt → confirm LENA BAQI returns to pre-receipt value
    - Void the payment → confirm DENA BAQI returns to pre-payment value
  - Ensure all tests pass; ask the user if questions arise
