# Requirements: Remove Hard-Coded System Accounts

## Objective
Fix ARB_POS accounting system to eliminate all hard-coded system account dependencies on codes 4001, 5001, 5003, and 3001. Replace hard-coded account lookups with user-driven account selection through frontend dropdowns and backend payload validation.

---

## Current State Assessment

### Frontend Status
| Component | Status | Issue |
|-----------|--------|-------|
| **PurchaseEntryPage.jsx** | ✅ PARTIALLY FIXED | Has `purchasesAccountId` dropdown; selects from PURCHASES/INVENTORY accounts |
| **SalesBillingPage.jsx** | ✅ PARTIALLY FIXED | Has `salesRevenueAccountId` dropdown; selects from REVENUE/SALES accounts |
| **SalesReturnPage.jsx** | ✅ PARTIALLY FIXED | Has `salesRevenueAccountId` dropdown; selects from REVENUE/SALES accounts |
| **PurchaseReturnPage.jsx** | ❌ BROKEN | References `purchasesAccount` (undefined); should use `purchasesAccountId` |

### Backend Status
| Component | Status | Issue |
|-----------|--------|-------|
| **accountingService.js** | ❌ CRITICAL | Hard-codes queries for accounts 5001 (Purchases) and 5003 (COGS); throws error if missing; assumes COGS is mandatory |
| **COGS Logic** | ❌ CRITICAL | Auto-posts COGS lines on SALE/SALES_RETURN; dies if accounts 5001/5003 don't exist |

### Database Status
| Component | Status | Issue |
|-----------|--------|-------|
| **schema.js** | ✅ CORRECT | Only seeds Cash (1001) and Bank (1002); no hard-coded 4001, 5001, 5003 seeding |

---

## Requirements (R1–R6)

### R1: Frontend Account Dropdowns for All Transaction Types
**Applies to:** PurchaseEntryPage, SalesReturnPage, PurchaseReturnPage, SalesBillingPage

- All four transaction type pages **MUST** load and display user-selectable account dropdowns for required accounting posting.
- **PurchaseEntryPage**: Show dropdown for PURCHASES/INVENTORY accounts (currently working).
- **SalesBillingPage**: Show dropdown for REVENUE/SALES accounts (currently working).
- **SalesReturnPage**: Show dropdown for REVENUE/SALES accounts (currently working).
- **PurchaseReturnPage**: Show dropdown for PURCHASES/INVENTORY accounts (currently broken — uses undefined `purchasesAccount`).
- Dropdowns **MUST** be populated from actual database accounts via API (not hard-coded).
- Dropdowns **MUST** filter by account type and status ('Active').
- When no accounts of required type exist, display clear error message instead of crashing.
- User-selected account ID **MUST** be included in the transaction payload sent to backend.
- Field label **MUST** indicate it is required (e.g., `"Purchases Account *"`).

### R2: Backend Must Make COGS Optional and Safe
**Applies to:** `accountingService.js` — `postTransaction()` and `editTransaction()`

- Backend **MUST NOT** hard-code queries for account codes '5001' or '5003'.
- Backend **MUST NOT** throw an error if COGS accounts (5001, 5003) do not exist in the chart of accounts.
- Backend **MUST** accept optional `inventory_account_id` and `cogs_account_id` in the transaction payload.
  - If provided (non-null, > 0), use them to post COGS auto-lines.
  - If not provided (null, 0, or missing), skip COGS posting gracefully (no error).
- Backend **MUST** validate that any account ID provided in payload exists in `accounts` table before posting.
- COGS posting logic **MUST** remain unchanged when accounts are provided:
  - SALE: Debit COGS, Credit Inventory.
  - SALES_RETURN: Debit Inventory, Credit COGS.
- Double-entry validation, inventory stock updates, and WAC calculations **MUST NOT** be affected by COGS optionality.

### R3: Database Must Not Seed Hard-Coded Accounts
**Applies to:** `schema.js`

- Schema **MUST** only seed Cash (1001) and Bank (1002) on first run.
- Schema **MUST NOT** seed Revenue (4001), Purchases (5001), COGS (5003), or Capital accounts (3001).
- Clients/users **MUST** create these accounts explicitly in Setups → Chart of Accounts.
- Schema **MUST NOT** create missing accounts on startup or auto-migrate to create hard-coded accounts.

### R4: User-Facing Error Messages Must Be Clear and Actionable
**Applies to:** All frontend pages and backend responses

- When no account of required type exists, error message **MUST** guide user to create it.
  - Example: `"No PURCHASES accounts found. Create one in Setups → Accounts."`
- When user tries to post a transaction without selecting required account, error **MUST** state which account is missing.
  - Example: `"Please select a Sales Revenue Account from the dropdown."`
- Backend error when account ID does not exist **MUST** identify which account ID failed.
  - Example: `"Ledger line references non-existent account ID 999. Transaction aborted."`
- Do NOT use cryptic SQL errors or foreign-key constraint messages in user-facing errors.

### R5: Defensive Coding With Safe Formatters
**Applies to:** All frontend pages

- All user input and loaded data **MUST** be validated using `safeId()`, `safeNum()`, `safeStr()` formatters before use.
- All account IDs, amounts, and descriptions **MUST** be sanitized when building transaction payloads.
- Null or undefined account IDs **MUST** be caught before posting, not after.
- Amount calculations **MUST** use `Math.round(value * 100) / 100` to avoid floating-point precision errors.

### R6: Complete Data Flow for All Transaction Types
**Applies to:** PurchaseEntryPage, SalesBillingPage, SalesReturnPage, PurchaseReturnPage

- Each page **MUST** follow this data flow:
  1. User loads page → `loadMasterData()` fetches available accounts/items from database.
  2. User selects accounts and line items → state is updated.
  3. User clicks Post/Save → validation checks required fields (including account dropdown).
  4. Validation **MUST** confirm account ID is selected and non-empty.
  5. Frontend sends transaction payload with selected account IDs to backend.
  6. Backend validates account IDs exist, then posts transaction.
  7. Response shows success or clear error message.
- Edit and Void workflows **MUST** also preserve and use selected account IDs.

---

## Verification Checklist

✅ **No Remaining Hard-Coded Account Code Lookups**
- [ ] Grep search for `'4001'`, `'5001'`, `'5003'`, `'3001'` in all frontend and backend code returns no hard-coded queries.
- [ ] No `db.prepare("SELECT id FROM accounts WHERE code = '5001'")` patterns remain except in optional COGS logic.
- [ ] Accounts are referenced only by `account_id` passed in payload, never by hard-coded code.

✅ **All Pages Require and Use Proper Account Selection**
- [ ] PurchaseEntryPage has working purchasesAccountId dropdown and includes it in payload.
- [ ] SalesBillingPage has working salesRevenueAccountId dropdown and includes it in payload.
- [ ] SalesReturnPage has working salesRevenueAccountId dropdown and includes it in payload.
- [ ] PurchaseReturnPage has working purchasesAccountId dropdown and includes it in payload (not undefined).
- [ ] All pages show error message if required account dropdown is not selected before posting.

✅ **COGS Posting Is Optional and Graceful**
- [ ] Backend does not throw error when accounts 5001 or 5003 don't exist.
- [ ] COGS auto-lines are only posted if inventory has non-zero cost AND accounts are available.
- [ ] Transaction posts successfully without COGS accounts if no inventory was moved.
- [ ] If COGS accounts provided in payload, they are used; if not provided, COGS posting is skipped.

✅ **No Crashes on Null Account IDs**
- [ ] Posting a transaction with null/undefined account ID shows clear error message, not a crash.
- [ ] Backend validation catches invalid account IDs before inserting ledger lines.
- [ ] Foreign-key constraint violations never reach user (caught by defensive checks first).

✅ **Database Is Safe and Correct**
- [ ] On fresh database, only Cash (1001) and Bank (1002) are seeded.
- [ ] No migration auto-creates 4001, 5001, 5003, or 3001.
- [ ] Existing databases with these accounts are not harmed; they remain for backward compatibility.

---

## Non-Goals (Do NOT Change)

- ❌ Do NOT modify transaction double-entry validation logic.
- ❌ Do NOT change inventory stock movement or WAC (Weighted Average Cost) calculations.
- ❌ Do NOT alter financial reports, trial balance, or ledger views.
- ❌ Do NOT modify user authentication, permissions, or role-based access.
- ❌ Do NOT change the structure of master_entries, ledger_lines, or inventory_transactions tables.
- ❌ Do NOT remove audit trails or void/edit history.

---

## Acceptance Criteria Summary

1. All four frontend pages (PurchaseEntry, SalesBilling, SalesReturn, PurchaseReturn) display account dropdowns.
2. PurchaseReturnPage uses `purchasesAccountId` state variable correctly (not undefined).
3. All pages validate that a required account is selected before posting.
4. All pages include selected account ID in transaction payload.
5. Backend does not query for hard-coded account codes (5001, 5003, etc.).
6. Backend makes COGS posting conditional: only post if accounts are provided AND exist.
7. Backend does not crash or throw error when COGS accounts are missing.
8. Grep for hard-coded account codes returns zero results (except in optional COGS logic).
9. Schema only seeds Cash and Bank on first run.
10. Clear, actionable error messages guide users to create missing accounts.
