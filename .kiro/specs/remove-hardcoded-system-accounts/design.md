# Design: Remove Hard-Coded System Accounts

## Architecture Overview

The fix replaces hard-coded account code queries with a **data-driven account selection pattern**. The SQLite database is the single source of truth for account existence and properties. Users select accounts via frontend dropdowns, and the backend uses selected account IDs directly from the payload — no additional lookups by code.

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Account Selection Dropdowns                        │
│ (PurchaseEntryPage, SalesBillingPage, etc.)                 │
│                                                               │
│  User selects: Purchases Account → ID stored in state        │
├─────────────────────────────────────────────────────────────┤
│ Transaction Payload (sent to backend)                        │
│ {                                                             │
│   entry_type: "PURCHASE",                                    │
│   debit_lines: [{ account_id: 42, amount: 1000 }],          │
│   credit_lines: [...],                                       │
│   inventory_lines: [...],                                    │
│   cogs_account_id: null  // optional; from user or omitted   │
│ }                                                             │
├─────────────────────────────────────────────────────────────┤
│ Backend: accountingService.postTransaction()                 │
│                                                               │
│ 1. Validate account IDs exist in database                    │
│ 2. Validate debit = credit (double-entry)                    │
│ 3. Post ledger lines using provided IDs (no code lookups)    │
│ 4. Update inventory + WAC                                    │
│ 5. [OPTIONAL] Post COGS lines IF cogs_account_id provided    │
│    AND both account IDs exist                                │
├─────────────────────────────────────────────────────────────┤
│ SQLite: Single Source of Truth                              │
│ ✅ accounts table: all user-created and seeded accounts      │
│ ✅ master_entries: transaction headers with party_account_id │
│ ✅ ledger_lines: debit/credit postings (no code lookups)     │
│ ✅ inventory_transactions: WAC + stock audit                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles
1. **No Hard-Coded Lookups**: Backend never queries `WHERE code = '5001'` or `'5003'`.
2. **User-Driven Selection**: Frontend dropdowns populated from database; user picks account.
3. **Graceful Degradation**: COGS posting skipped if accounts missing (no error).
4. **Defensive Validation**: Backend checks account IDs exist before posting; clear error if not.
5. **Immutable Core Logic**: Double-entry, inventory updates, WAC calculations unchanged.

---

## Component Details

### 1. Frontend Components

#### 1.1 Account Dropdown UI Pattern (All Four Pages)

**Common Implementation (applies to all four entry pages):**

```javascript
// State management
const [availableRevenueAccounts, setAvailableRevenueAccounts] = useState([]);
const [salesRevenueAccountId, setSalesRevenueAccountId] = useState('');

// Load during useEffect(() => { loadMasterData(); }, [])
const loadMasterData = async () => {
  const accRes = await api.accounts.list({});
  if (accRes.success && accRes.data) {
    // Filter by account type and status
    const revenueAccounts = accRes.data.filter(
      a => a.status === 'Active' && 
           (a.account_type === 'REVENUE' || a.account_type === 'SALES')
    );
    setAvailableRevenueAccounts(revenueAccounts);
    // Auto-select first available
    if (revenueAccounts.length) {
      setSalesRevenueAccountId(safeId(revenueAccounts[0]?.id) || '');
    }
  }
};

// Render: dropdown with validation
<select
  value={salesRevenueAccountId}
  onChange={e => setSalesRevenueAccountId(e.target.value)}
  required
  className="w-full px-2.5 py-1.5 text-xs font-semibold"
>
  <option value="">[ SELECT SALES REVENUE ACCOUNT ]</option>
  {availableRevenueAccounts.filter(Boolean).map(acc => (
    <option key={safeId(acc?.id)} value={safeId(acc?.id)}>
      {safeStr(acc?.title, '—')} [{safeStr(acc?.code, '?')}]
    </option>
  ))}
</select>
```

**Empty State Handling:**
```javascript
{availableRevenueAccounts.length === 0 ? (
  <p className="text-[10px] text-[#DC2626]">
    No REVENUE accounts found. Create one in Setups → Accounts.
  </p>
) : (
  // show dropdown
)}
```

#### 1.2 PurchaseEntryPage
- **Dropdown:** "Purchases Account *" (PURCHASES/INVENTORY types)
- **State:** `purchasesAccountId`
- **Filter:** `account_type === 'PURCHASES' || account_type === 'INVENTORY'`
- **Validation:** Error if not selected before posting
- **Payload:** `debit_lines: [{ account_id: parseInt(purchasesAccountId, 10), amount: grandTotal }]`
- **Status:** ✅ Already working; no changes needed

#### 1.3 SalesBillingPage
- **Dropdown:** "Sales Revenue Account *" (REVENUE/SALES types)
- **State:** `salesRevenueAccountId`
- **Filter:** `account_type === 'REVENUE' || account_type === 'SALES'`
- **Validation:** Error if not selected before posting
- **Payload:** `credit_lines: [{ account_id: parseInt(salesRevenueAccountId, 10), amount: totalRevenue }]`
- **Status:** ✅ Already working; no changes needed

#### 1.4 SalesReturnPage
- **Dropdown:** "Sales Revenue Account *" (REVENUE/SALES types)
- **State:** `salesRevenueAccountId`
- **Filter:** `account_type === 'REVENUE' || account_type === 'SALES'`
- **Validation:** Error if not selected before posting
- **Payload:** `debit_lines: [{ account_id: parseInt(salesRevenueAccountId, 10), amount: numAmount }]`
- **Status:** ✅ Already working; no changes needed

#### 1.5 PurchaseReturnPage (❌ BROKEN — Needs Fix)
- **Issue:** References undefined `purchasesAccount` variable; should use `purchasesAccountId` state
- **Fix:**
  1. Add state: `const [purchasesAccountId, setPurchasesAccountId] = useState('');`
  2. Add state: `const [availablePurchasesAccounts, setAvailablePurchasesAccounts] = useState([]);`
  3. In `loadMasterData()`, load PURCHASES/INVENTORY accounts into `availablePurchasesAccounts`
  4. Set default: `if (purchasesAccounts.length) setPurchasesAccountId(safeId(purchasesAccounts[0]?.id) || '');`
  5. Render dropdown for "Purchases Account *"
  6. In `handlePostReturn()`, validate `if (!purchasesAccountId)` and include in payload
  7. Change line 133: from `account_id: parseInt(purchasesAccount.id, 10)` to `account_id: parseInt(purchasesAccountId, 10)`

#### Common Validation (All Pages)
```javascript
if (!purchasesAccountId) {  // or salesRevenueAccountId
  setStatus({
    type: "error",
    text: "Please select a [ACCOUNT TYPE] Account from the dropdown.",
  });
  return;
}
```

---

### 2. Backend Services

#### 2.1 accountingService.js — postTransaction()

**Current Problem:**
```javascript
// CURRENT (BROKEN): hard-coded code lookups
const invAccount = db.prepare("SELECT id FROM accounts WHERE code = '5001' AND status = 'Active'").get();
const cogsAccount = db.prepare("SELECT id FROM accounts WHERE code = '5003' AND status = 'Active'").get();
if (!invAccount || !cogsAccount) {
  throw new Error(`Cannot post transaction: account ${missing} not found...`);
}
```

**Fix: Make COGS Optional**
```javascript
// FIXED: No hard-coded lookups; use payload-provided IDs
let totalSaleCogs = 0;
let totalReturnCogs = 0;

// Process inventory and calculate COGS totals (same as before)
for (const inv of inventory_lines) {
  // ... existing inventory logic ...
  if (txType === 'SALE') {
    totalSaleCogs += recordedTotalCost;
  } else if (txType === 'SALES_RETURN') {
    totalReturnCogs += recordedTotalCost;
  }
}

// NEW: Only post COGS if there's COGS to post AND accounts are provided
if (totalSaleCogs > 0 || totalReturnCogs > 0) {
  // Check if cogs_account_id and inventory_account_id are provided in payload
  const { cogs_account_id = null, inventory_account_id = null } = params;
  
  // If not in payload, try to look them up from the accounts table
  // BUT DO NOT error if they don't exist — just skip COGS posting
  let invAccId = inventory_account_id;
  let cogsAccId = cogs_account_id;
  
  // Attempt to find by ID if provided
  if (!invAccId) {
    const invAcc = db.prepare(
      "SELECT id FROM accounts WHERE account_type = 'PURCHASES' OR account_type = 'INVENTORY' LIMIT 1"
    ).get();
    invAccId = invAcc?.id;
  }
  if (!cogsAccId) {
    const cogsAcc = db.prepare(
      "SELECT id FROM accounts WHERE account_type = 'COGS' LIMIT 1"
    ).get();
    cogsAccId = cogsAcc?.id;
  }
  
  // ONLY post COGS if both accounts are found
  if (invAccId && cogsAccId) {
    if (totalSaleCogs > 0) {
      ledgerRepository.insertLedgerLine({ 
        entry_id: entryId, 
        account_id: cogsAccId, 
        type: 'debit', 
        amount: totalSaleCogs 
      }, db);
      ledgerRepository.insertLedgerLine({ 
        entry_id: entryId, 
        account_id: invAccId, 
        type: 'credit', 
        amount: totalSaleCogs 
      }, db);
    }
    if (totalReturnCogs > 0) {
      ledgerRepository.insertLedgerLine({ 
        entry_id: entryId, 
        account_id: invAccId, 
        type: 'debit', 
        amount: totalReturnCogs 
      }, db);
      ledgerRepository.insertLedgerLine({ 
        entry_id: entryId, 
        account_id: cogsAccId, 
        type: 'credit', 
        amount: totalReturnCogs 
      }, db);
    }
  }
  // If accounts not found, silently skip COGS posting (no error)
}
```

**Key Changes:**
1. Remove hard-coded `WHERE code = '5001'` and `WHERE code = '5003'` queries.
2. Do NOT throw error if COGS accounts missing.
3. Gracefully skip COGS auto-lines if accounts not found.
4. Double-entry validation still passes (COGS lines are balanced, or skipped).
5. Inventory + WAC logic unchanged.

#### 2.2 accountingService.js — editTransaction()

**Apply same COGS optional logic in `editTransaction()` → `postTransactionWithDb()` internal method.**
- No hard-coded code lookups.
- Graceful COGS skipping.

---

### 3. Data Flow Diagram

#### Purchase Entry Flow
```
User opens PurchaseEntryPage
  ↓
loadMasterData() fetches available accounts (PURCHASES/INVENTORY type, Active status)
  ↓
Dropdown populated: user selects "Purchases Account ABC [5050]"
  ↓
purchasesAccountId = 42 (the ID, not the code)
  ↓
User fills line items, clicks "Post Purchase"
  ↓
Frontend validation:
  - supplierId selected? ✓
  - paymentAccountId selected? ✓
  - purchasesAccountId selected? ✓ (NEW CHECK)
  - grandTotal > 0? ✓
  ↓
Build payload:
{
  entry_type: "PURCHASE",
  date: "2024-01-15",
  debit_lines: [{ account_id: 42, amount: 1000 }],  // selected account
  credit_lines: [
    { account_id: 5, amount: 500 },   // cash/bank payment
    { account_id: 8, amount: 500 }    // supplier credit
  ],
  inventory_lines: [{ item_id: 1, qty: 10, unit_price: 100, total_price: 1000 }],
  party_account_id: 8
}
  ↓
Backend: postTransaction(payload)
  - Validate account IDs 42, 5, 8 exist? ✓
  - Validate debit (1000) = credit (500+500)? ✓
  - Post ledger lines ✓
  - Update inventory + WAC ✓
  - Skip COGS (not applicable to PURCHASE) ✓
  ↓
Response: success
  ↓
Frontend: show success message, reload transactions
```

---

## Key Changes Summary

| Component | Change | Type |
|-----------|--------|------|
| **PurchaseReturnPage.jsx** | Fix `purchasesAccount` → use `purchasesAccountId` state | Bug Fix |
| **accountingService.js** | Remove hard-coded account code queries (5001, 5003) | Feature |
| **accountingService.js** | Make COGS posting optional; skip if accounts missing | Feature |
| **schema.js** | No changes needed (already correct) | N/A |

---

## Preserved Behavior (Do NOT Change)

✅ **Double-Entry Validation**
- Debit lines total must equal credit lines total (per-transaction, rounded to 2 decimals).
- Error thrown if unbalanced; transaction rejected.

✅ **Inventory Updates**
- PURCHASE: Increase stock quantity, update WAC.
- SALE: Decrease stock quantity, verify sufficient stock.
- SALES_RETURN: Increase stock quantity.
- PURCHASE_RETURN: Decrease stock quantity, adjust WAC.

✅ **WAC Calculation**
- PURCHASE: WAC = (old_qty × old_WAC + new_qty × new_unit_price) / (old_qty + new_qty)
- All formulas unchanged.

✅ **Void & Edit Workflows**
- Void: Reverse inventory + WAC, mark entry VOID, keep ledger lines for audit.
- Edit: Void old, post new (in single transaction).
- Both use same COGS optional logic.

✅ **Ledger & Financial Reports**
- Trial balance, account balances, ledger views all query `ledger_lines` table.
- No queries by account code; all queries by account ID.
- COGS lines (if posted) appear in ledger like any other line.
- Reports unaffected by optional COGS.

---

## Error Handling & User Guidance

### Frontend Error Messages (Before Posting)

| Scenario | Message |
|----------|---------|
| No PURCHASES accounts exist | "No PURCHASES accounts found. Create one in Setups → Accounts." |
| No REVENUE accounts exist | "No REVENUE accounts found. Create one in Setups → Accounts." |
| Dropdown not selected | "Please select a [ACCOUNT TYPE] Account from the dropdown." |
| Invalid account ID in state | "Please try reloading the page." (safeId guard) |

### Backend Error Messages (During Posting)

| Scenario | Message |
|----------|---------|
| Account ID in ledger line doesn't exist | `Ledger line references non-existent account ID 999. Transaction aborted.` |
| Party account ID doesn't exist | `Party account ID 999 does not exist in accounts.` |
| Debit ≠ Credit | `Unbalanced double-entry transaction! Total Debits (Rs. 1000.00) does not equal Total Credits (Rs. 900.00).` |
| Insufficient stock for SALE | `Insufficient stock for item: Widget. Available: 5, Requested: 10.` |
| COGS accounts missing (SALE with inventory) | *No error*; COGS lines skipped silently. |

---

## Migration Path (Backward Compatibility)

**Existing Databases:**
- If database already has accounts with codes 5001, 5003, etc., they are preserved.
- No migration deletes or renames these accounts.
- Old transactions remain posted; new transactions use user-selected accounts.

**New Databases:**
- Only Cash (1001) and Bank (1002) seeded.
- Users create Revenue, Purchases, COGS, Capital accounts via UI.
- First SALE/PURCHASE with optional COGS: if accounts don't exist, COGS is skipped.

---

## Testing Strategy

**Unit Tests:**
- Test COGS skipping when accounts missing (no error thrown).
- Test double-entry validation (debit ≠ credit still fails).
- Test inventory updates (stock, WAC unchanged).

**Integration Tests:**
- Test frontend dropdown population and selection.
- Test transaction posting with user-selected accounts.
- Test null/invalid account ID rejection.

**Manual/E2E Tests:**
- Fresh database: create accounts, post transactions, verify COGS skipped if accounts missing.
- Existing database: verify old COGS logic still works if accounts exist.
- Edit/void workflows preserve account selection.
