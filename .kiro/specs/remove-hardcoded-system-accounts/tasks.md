# Tasks: Remove Hard-Coded System Accounts

## Overview
This task list breaks the fix into discrete, executable units for implementation. **Execute tasks in order.**

---

## Task 1: Audit and Verify Current State

**Task ID:** `1.0-audit-current-state`  
**Status:** Pending  
**Effort:** ~30 min  

### Description
Audit the codebase to confirm the current status of all four frontend pages and the backend, then verify schema is correct.

### Sub-Tasks

1.1. **Read and Verify Frontend Pages**
   - [ ] Read `PurchaseEntryPage.jsx` — confirm `purchasesAccountId` state and dropdown exist
   - [ ] Read `SalesBillingPage.jsx` — confirm `salesRevenueAccountId` state and dropdown exist
   - [ ] Read `SalesReturnPage.jsx` — confirm `salesRevenueAccountId` state and dropdown exist
   - [ ] Read `PurchaseReturnPage.jsx` — **identify the bug**: confirm `purchasesAccount` is undefined (should be `purchasesAccountId`)

1.2. **Verify PurchaseEntryPage Implementation**
   - [ ] Check: `availablePurchasesAccounts` state exists
   - [ ] Check: dropdown filters by `account_type === 'PURCHASES' || account_type === 'INVENTORY'`
   - [ ] Check: validation before posting: `if (!purchasesAccountId) throw error`
   - [ ] Check: payload includes `debit_lines: [{ account_id: parseInt(purchasesAccountId, 10), amount: ... }]`
   - [ ] Check: uses `safeId()`, `safeStr()`, `safeNum()` helpers

1.3. **Verify SalesEntryPage Implementation**
   - [ ] Check: `availableRevenueAccounts` state exists
   - [ ] Check: dropdown filters by `account_type === 'REVENUE' || account_type === 'SALES'`
   - [ ] Check: validation before posting: `if (!salesRevenueAccountId) throw error`
   - [ ] Check: payload includes `credit_lines: [{ account_id: parseInt(salesRevenueAccountId, 10), amount: ... }]`

1.4. **Verify PurchaseReturnPage Status (Broken)**
   - [ ] Confirm: line 81 uses undefined `purchasesAccount` variable
   - [ ] Confirm: state `purchasesAccountId` does NOT exist
   - [ ] Confirm: state `availablePurchasesAccounts` exists but is never used to populate dropdown
   - [ ] Document: the exact error that occurs when trying to post (should be "Cannot read property 'id' of undefined")

1.5. **Verify Backend accountingService.js**
   - [ ] Search for hard-coded account code queries: find all occurrences of `WHERE code = '5001'` or `WHERE code = '5003'`
   - [ ] Confirm these queries throw error if accounts missing
   - [ ] Verify COGS posting is mandatory (no way to skip)
   - [ ] Check `postTransaction()` method
   - [ ] Check `postTransactionWithDb()` internal method
   - [ ] Check `editTransaction()` method

1.6. **Verify schema.js**
   - [ ] Confirm: only Cash (1001) and Bank (1002) are seeded
   - [ ] Confirm: no hard-coded 4001, 5001, 5003, or 3001 in seeding
   - [ ] Verify `accountCount === 0` block contains only two inserts
   - [ ] Confirm no `ensureSystemAccount()` calls for 5001 or 5003

1.7. **Document Findings**
   - [ ] Create audit report (as comment in task history or in console)
   - [ ] List all files that need changes
   - [ ] List all hard-coded account code references found

### Success Criteria
- PurchaseEntryPage confirmed working with `purchasesAccountId`
- SalesBillingPage confirmed working with `salesRevenueAccountId`
- SalesReturnPage confirmed working with `salesRevenueAccountId`
- PurchaseReturnPage identified as broken (uses undefined `purchasesAccount`)
- All hard-coded account code queries in accountingService.js identified
- schema.js confirmed to be correct (no changes needed)

### Related Files
- `src/pages/operations/PurchaseEntryPage.jsx`
- `src/pages/operations/SalesBillingPage.jsx`
- `src/pages/operations/SalesReturnPage.jsx`
- `src/pages/operations/PurchaseReturnPage.jsx`
- `electron/services/accountingService.js`
- `electron/database/schema.js`

---

## Task 2: Fix Backend — accountingService.js (Make COGS Optional)

**Task ID:** `2.0-fix-backend-cogs-optional`  
**Status:** Pending (depends on Task 1)  
**Effort:** ~1–1.5 hrs  
**Files:** `electron/services/accountingService.js`

### Description
Remove hard-coded account code queries (5001, 5003) and make COGS posting optional. Backend should gracefully skip COGS if accounts are missing or not provided in payload.

### Sub-Tasks

2.1. **Fix postTransaction() Method**
   - [ ] Locate the section: "Record Missing COGS Entries automatically" (around line 180+)
   - [ ] Delete the hard-coded queries:
     ```javascript
     const invAccount = db.prepare("SELECT id FROM accounts WHERE code = '5001'...").get();
     const cogsAccount = db.prepare("SELECT id FROM accounts WHERE code = '5003'...").get();
     ```
   - [ ] Delete the error throw that checks if these accounts exist
   - [ ] Replace with: Optional lookup using account_type instead of code:
     ```javascript
     if (totalSaleCogs > 0 || totalReturnCogs > 0) {
       // Try to find accounts by type, but don't error if missing
       let invAccId = params.inventory_account_id;
       let cogsAccId = params.cogs_account_id;
       
       if (!invAccId) {
         const invAcc = db.prepare(
           "SELECT id FROM accounts WHERE (account_type = 'PURCHASES' OR account_type = 'INVENTORY') AND status = 'Active' LIMIT 1"
         ).get();
         invAccId = invAcc?.id;
       }
       if (!cogsAccId) {
         const cogsAcc = db.prepare(
           "SELECT id FROM accounts WHERE account_type = 'COGS' AND status = 'Active' LIMIT 1"
         ).get();
         cogsAccId = cogsAcc?.id;
       }
       
       // ONLY post COGS if both accounts are found
       if (invAccId && cogsAccId) {
         // insert ledger lines as before
       }
       // If either account missing, skip COGS (no error)
     }
     ```
   - [ ] Validate: COGS logic is now conditional (if accounts exist, post; otherwise, skip)

2.2. **Fix postTransactionWithDb() Internal Method**
   - [ ] Locate the same "Record Missing COGS Entries" section
   - [ ] Apply the same changes as 2.1
   - [ ] Ensure consistency between `postTransaction()` and `postTransactionWithDb()`

2.3. **Verify No Hard-Coded Code Lookups Remain**
   - [ ] Search entire `accountingService.js` for `code = '5001'` — should return 0 results
   - [ ] Search entire `accountingService.js` for `code = '5003'` — should return 0 results
   - [ ] Search for `code = '4001'` — should return 0 results
   - [ ] Search for `code = '3001'` — should return 0 results

2.4. **Preserve Existing Logic**
   - [ ] Verify double-entry validation still catches unbalanced transactions
   - [ ] Verify inventory stock updates unchanged
   - [ ] Verify WAC calculation unchanged
   - [ ] Verify ledger line insertion logic unchanged (except for optional COGS section)
   - [ ] Verify error messages for invalid account IDs still thrown

2.5. **Test postTransaction() Changes**
   - [ ] Build the project (npm run build or similar)
   - [ ] Verify no syntax errors
   - [ ] Run existing tests (if any) — should not break
   - [ ] Manual test: Post a PURCHASE transaction with selected account — should succeed
   - [ ] Manual test: Post a SALE transaction without COGS accounts — should succeed (COGS skipped)

### Success Criteria
- No hard-coded account code queries (5001, 5003, 4001, 3001) remain in file
- COGS posting is conditional: only if both inventory and COGS accounts are found
- Backend does not throw error if COGS accounts missing
- All existing transaction validation (double-entry, inventory, WAC) preserved
- Project builds without errors
- Manual test posts succeed

### Related Files
- `electron/services/accountingService.js`

---

## Task 3: Fix Frontend — PurchaseReturnPage.jsx

**Task ID:** `3.0-fix-purchase-return-page`  
**Status:** Pending (depends on Task 1)  
**Effort:** ~45 min  
**Files:** `src/pages/operations/PurchaseReturnPage.jsx`

### Description
Fix PurchaseReturnPage to use proper `purchasesAccountId` state instead of undefined `purchasesAccount`. Add dropdown for account selection and validate before posting.

### Sub-Tasks

3.1. **Add Missing State Variables**
   - [ ] Add state: `const [purchasesAccountId, setPurchasesAccountId] = useState('');`
   - [ ] Verify state `availablePurchasesAccounts` already exists (should be there from loadMasterData)

3.2. **Populate Available Accounts in loadMasterData()**
   - [ ] Locate the `loadMasterData()` function
   - [ ] Verify it loads and filters accounts:
     ```javascript
     const purchasesAccounts = accRes.data.filter(
       (a) => a.status === "Active" && 
              (a.account_type === "PURCHASES" || a.account_type === "INVENTORY")
     );
     ```
   - [ ] Verify it sets state: `setAvailablePurchasesAccounts(purchasesAccounts);`
   - [ ] Add default selection: `if (purchasesAccounts.length) setPurchasesAccountId(safeId(purchasesAccounts[0]?.id) || '');`

3.3. **Add Dropdown UI**
   - [ ] Find the form section (before the submit button)
   - [ ] Add dropdown for "Purchases Account *":
     ```javascript
     <div className="col-span-3">
       <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
         Purchases Account *
       </label>
       {availablePurchasesAccounts.length === 0 ? (
         <p className="text-[10px] text-[#DC2626]">
           No PURCHASES accounts found. Create one in Setups → Accounts.
         </p>
       ) : (
         <select
           value={purchasesAccountId}
           onChange={(e) => setPurchasesAccountId(e.target.value)}
           required
           className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[3px]"
         >
           <option value="">[ SELECT PURCHASES ACCOUNT ]</option>
           {availablePurchasesAccounts.filter(Boolean).map((acc, index) => acc && (
             <option key={safeId(acc?.id) || `purch-${index}`} value={safeId(acc?.id)}>
               {safeStr(acc?.title, '—')} [{safeStr(acc?.code, '?')}]
             </option>
           ))}
         </select>
       )}
     </div>
     ```

3.4. **Fix Validation in handlePostReturn()**
   - [ ] Add validation check:
     ```javascript
     if (!purchasesAccountId) {
       setStatus({
         type: "error",
         text: "Please select a Purchases Account from the dropdown.",
       });
       return;
     }
     ```
   - [ ] Ensure this check comes after checks for supplierId and itemId

3.5. **Fix Payload — Replace Undefined Reference**
   - [ ] Locate line 133 (or similar): `account_id: parseInt(purchasesAccount.id, 10)`
   - [ ] Change to: `account_id: parseInt(purchasesAccountId, 10)`
   - [ ] This is the critical fix that removes the undefined error

3.6. **Update Edit Flow (handleEditReturn)**
   - [ ] Locate `handleEditReturn()` function
   - [ ] When loading transaction for edit, extract the purchases account ID from debit_lines:
     ```javascript
     if (debitLines.length > 0) {
       const purchasesLine = debitLines.find((l) => l.account_type === "PURCHASES") || debitLines[0];
       if (purchasesLine) setPurchasesAccountId(safeId(purchasesLine.account_id));
     }
     ```

3.7. **Update Clear Form (handleClearForm or similar)**
   - [ ] Ensure `setPurchasesAccountId('')` is called when clearing
   - [ ] Or reset to first available account: `setPurchasesAccountId(availablePurchasesAccounts[0]?.id || '')`

3.8. **Test**
   - [ ] Open PurchaseReturnPage in UI
   - [ ] Verify "Purchases Account *" dropdown appears and is populated
   - [ ] Verify dropdown shows error if no PURCHASES accounts exist
   - [ ] Try posting without selecting account — should show error
   - [ ] Select account, fill other fields, post — should succeed
   - [ ] Verify inventory decreases correctly
   - [ ] Verify ledger lines posted to correct accounts

### Success Criteria
- PurchaseReturnPage has `purchasesAccountId` state
- Dropdown renders correctly and shows available PURCHASES accounts
- Error message shown if no accounts exist
- Validation error shown if account not selected
- Posting uses correct account ID from dropdown (not undefined)
- Edit and void workflows preserve account selection
- Transaction posts and updates inventory correctly

### Related Files
- `src/pages/operations/PurchaseReturnPage.jsx`

---

## Task 4: Verify SalesReturnPage.jsx (No Changes Expected)

**Task ID:** `4.0-verify-sales-return-page`  
**Status:** Pending (depends on Task 1)  
**Effort:** ~20 min  
**Files:** `src/pages/operations/SalesReturnPage.jsx`

### Description
Verify SalesReturnPage is already correctly implemented with `salesRevenueAccountId` dropdown. No changes should be needed, but confirm it matches the pattern.

### Sub-Tasks

4.1. **Verify State and Dropdown Exist**
   - [ ] Confirm state: `const [salesRevenueAccountId, setSalesRevenueAccountId] = useState('');`
   - [ ] Confirm state: `const [availableRevenueAccounts, setAvailableRevenueAccounts] = useState([]);`

4.2. **Verify loadMasterData() Populates Accounts**
   - [ ] Confirm it filters: `account_type === 'REVENUE' || account_type === 'SALES'`
   - [ ] Confirm it sets state: `setAvailableRevenueAccounts(revenueAccounts);`
   - [ ] Confirm default selection: `if (revenueAccounts.length) setSalesRevenueAccountId(...)`

4.3. **Verify Dropdown UI**
   - [ ] Confirm dropdown exists in form
   - [ ] Confirm label: "Sales Revenue Account *"
   - [ ] Confirm error message if no accounts exist
   - [ ] Confirm uses `safeId()`, `safeStr()`, `safeNum()` helpers

4.4. **Verify Validation in handlePostSalesReturn()**
   - [ ] Confirm check: `if (!salesRevenueAccountId) { throw error }`
   - [ ] Confirm error message is clear

4.5. **Verify Payload**
   - [ ] Confirm payload includes: `debit_lines: [{ account_id: parseInt(salesRevenueAccountId, 10), amount: ... }]`

4.6. **Verify Edit and Void Workflows**
   - [ ] Confirm edit flow preserves account ID from transaction
   - [ ] Confirm void flow works correctly

### Success Criteria
- SalesReturnPage is correctly implemented (no changes needed)
- Dropdown population and validation work as expected
- Edit and void flows preserve account selection

### Related Files
- `src/pages/operations/SalesReturnPage.jsx`

---

## Task 5: Verification and Testing

**Task ID:** `5.0-verification-and-testing`  
**Status:** Pending (depends on Tasks 2, 3, 4)  
**Effort:** ~1 hr  
**Files:** All modified files; entire project

### Description
Run comprehensive verification to ensure no hard-coded accounts remain, all pages work correctly, and transactions post successfully.

### Sub-Tasks

5.1. **Grep Search for Hard-Coded Account Codes**
   - [ ] Search entire codebase for `'4001'` — should return 0 results (except this spec)
   - [ ] Search entire codebase for `'5001'` — should return 0 results (except this spec)
   - [ ] Search entire codebase for `'5003'` — should return 0 results (except this spec)
   - [ ] Search entire codebase for `'3001'` — should return 0 results (except this spec)
   - [ ] Document any remaining occurrences (should be none)

5.2. **Verify schema.js Is Correct**
   - [ ] Confirm seeding section only inserts Cash (1001) and Bank (1002)
   - [ ] Confirm no other accounts auto-created
   - [ ] Grep for `'4001'`, `'5001'`, `'5003'` in schema.js — should return 0

5.3. **Build Project**
   - [ ] Run: `npm run build` or equivalent
   - [ ] Verify no errors
   - [ ] Verify no warnings related to undefined variables

5.4. **Manual Test: Fresh Database (COGS Skipping)**
   - [ ] Delete existing database (if any)
   - [ ] Start app with fresh database
   - [ ] Verify only Cash (1001) and Bank (1002) seeded
   - [ ] Create one PURCHASES account (e.g., 5050)
   - [ ] Create one REVENUE account (e.g., 4100)
   - [ ] Do NOT create COGS account (5003)
   - [ ] Create an item and supplier
   - [ ] Post a PURCHASE transaction — should succeed
   - [ ] Post a SALE transaction — should succeed (COGS skipped, no error)
   - [ ] Verify ledger lines posted correctly (no COGS lines)
   - [ ] Verify inventory updated correctly

5.5. **Manual Test: With COGS Accounts**
   - [ ] Create COGS account (e.g., 5100)
   - [ ] Post a SALE transaction — should succeed
   - [ ] Verify COGS ledger lines are posted (debit COGS, credit Inventory)
   - [ ] Verify inventory updated correctly

5.6. **Manual Test: All Four Entry Pages**
   - [ ] PurchaseEntryPage: Post transaction, verify dropdown works, verify account used in ledger
   - [ ] SalesBillingPage: Post transaction, verify dropdown works, verify account used in ledger
   - [ ] SalesReturnPage: Post transaction, verify dropdown works, verify account used in ledger
   - [ ] PurchaseReturnPage: Post transaction, verify dropdown works, verify account ID used (not undefined)

5.7. **Manual Test: Error Cases**
   - [ ] Try posting without selecting account — should show clear error
   - [ ] Try posting with no valid accounts in dropdown — should show error message
   - [ ] Try posting with unbalanced lines — should show error
   - [ ] Try posting with insufficient stock (SALE) — should show error

5.8. **Manual Test: Edit and Void Workflows**
   - [ ] Edit a PURCHASE transaction — verify account selection preserved
   - [ ] Void a transaction — verify inventory reversed, WAC recalculated
   - [ ] Post new transaction after void — verify works correctly

### Success Criteria
- No hard-coded account code queries found in codebase
- Project builds without errors
- Fresh database only seeds Cash and Bank
- COGS posting skipped gracefully when accounts missing
- All four entry pages have working dropdowns
- Transactions post correctly to user-selected accounts
- Error messages are clear and actionable
- Edit and void workflows work correctly

### Related Files
- All files modified in Tasks 2, 3, 4
- `electron/database/schema.js`
- `electron/services/accountingService.js`
- `src/pages/operations/PurchaseEntryPage.jsx`
- `src/pages/operations/SalesBillingPage.jsx`
- `src/pages/operations/SalesReturnPage.jsx`
- `src/pages/operations/PurchaseReturnPage.jsx`

---

## Task 6: Final Audit Report

**Task ID:** `6.0-final-audit-report`  
**Status:** Pending (depends on Task 5)  
**Effort:** ~30 min  
**Files:** N/A (documentation only)

### Description
Document the complete fix: all files changed, verification results, and confirmation that no hard-coded accounts remain.

### Sub-Tasks

6.1. **List All Modified Files**
   - [ ] `electron/services/accountingService.js` — removed hard-coded COGS queries, made COGS optional
   - [ ] `src/pages/operations/PurchaseReturnPage.jsx` — fixed undefined purchasesAccount bug, added dropdown

6.2. **List Unchanged Files (Verified Correct)**
   - [ ] `src/pages/operations/PurchaseEntryPage.jsx` — already working correctly
   - [ ] `src/pages/operations/SalesBillingPage.jsx` — already working correctly
   - [ ] `src/pages/operations/SalesReturnPage.jsx` — already working correctly
   - [ ] `electron/database/schema.js` — already correct, no changes needed

6.3. **Verification Summary**
   - [ ] Grep results: 0 occurrences of hard-coded codes (4001, 5001, 5003, 3001)
   - [ ] All four entry pages have working account dropdowns
   - [ ] PurchaseReturnPage bug fixed (undefined → purchasesAccountId)
   - [ ] Backend makes COGS optional and graceful
   - [ ] Manual tests: all passed
   - [ ] Build: no errors or warnings

6.4. **Acceptance Criteria Checklist**
   - [ ] All four frontend pages display account dropdowns
   - [ ] PurchaseReturnPage uses purchasesAccountId correctly
   - [ ] All pages validate required account selection
   - [ ] All pages include account ID in payload
   - [ ] Backend no longer queries hard-coded account codes
   - [ ] Backend makes COGS optional (no error if missing)
   - [ ] Backend gracefully skips COGS when accounts not found
   - [ ] Grep for hard-coded codes returns 0 results
   - [ ] Schema only seeds Cash and Bank
   - [ ] Error messages are clear and actionable

6.5. **Document Known Limitations and Future Work (if any)**
   - [ ] Any edge cases not covered
   - [ ] Any future enhancements recommended
   - [ ] Any deprecations or tech debt addressed

### Success Criteria
- Comprehensive audit report completed
- All acceptance criteria verified
- All files correctly modified
- No regressions introduced

---

## Execution Order

**MUST execute in this order:**
1. Task 1: Audit current state
2. Task 2: Fix backend (accountingService.js)
3. Task 3: Fix frontend (PurchaseReturnPage.jsx)
4. Task 4: Verify frontend (SalesReturnPage.jsx — no changes)
5. Task 5: Comprehensive verification and testing
6. Task 6: Final audit report

---

## Time Estimate

- Task 1: 30 min
- Task 2: 60–90 min
- Task 3: 45 min
- Task 4: 20 min
- Task 5: 60 min
- Task 6: 30 min

**Total: ~4–5 hours**

---

## Definition of Done

✅ All tasks completed in order  
✅ No hard-coded account code queries remain  
✅ All four entry pages have working dropdowns  
✅ PurchaseReturnPage bug fixed  
✅ Backend COGS optional and graceful  
✅ All manual tests passed  
✅ Build succeeds without errors  
✅ Final audit report documented  
✅ Acceptance criteria verified  
✅ No regressions introduced  
