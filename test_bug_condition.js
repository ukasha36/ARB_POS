/**
 * Task 1 — Bug Condition Exploration Test
 *
 * Purpose: Demonstrate that getCustomerLedger / getSupplierLedger silently
 *          skip HO_INCOMING / HO_OUTGOING vouchers when party_account_id IS NULL
 *          (the exact bug condition described in the spec).
 *
 * EXPECTED OUTCOME: All four assertions FAIL on unfixed code.
 *   That failure is the SUCCESS condition for this task — it confirms the bug exists.
 *
 * After the fix (tasks 3.1–3.4) these same assertions must all PASS.
 *
 * Requirements validated: 1.1, 1.2, 1.5, 1.6
 */

'use strict';

const path = require('path');
const fs   = require('fs');

const { initConnection, closeConnection, getDb } = require('./electron/database/connection');
const { runMigrations, loadPhase3Migrations }    = require('./electron/database/schema');
const accountingService = require('./electron/services/accountingService');
const reportRepository  = require('./electron/repositories/reportRepository');

// ── DB setup ──────────────────────────────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), 'test_bug_condition.db');
[DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm'].forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });

initConnection(DB_PATH);
runMigrations();
loadPhase3Migrations();
const db = getDb();

// ── Assertion helpers ─────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const counterExamples = [];

function assert(cond, msg, counterExample = null) {
  if (cond) {
    passed++;
    console.log('  PASS:', msg);
  } else {
    failed++;
    console.log('  FAIL:', msg);
    if (counterExample) {
      counterExamples.push(counterExample);
      console.log('        CounterExample:', counterExample);
    }
  }
}

// ── Account seeding ───────────────────────────────────────────────────────────
const cashId = db.prepare("SELECT id FROM accounts WHERE code='1001'").get().id;
const revId  = db.prepare("SELECT id FROM accounts WHERE code='4001'").get().id;
const purchId = db.prepare("SELECT id FROM accounts WHERE code='5001'").get().id;

db.prepare(`
  INSERT INTO accounts (code,title,account_type,purchase_enabled,sale_enabled,opening_balance,opening_balance_type,status)
  VALUES ('BUG-CUST','Bug Test Customer','CUSTOMER',0,1,0,'Dr','Active')
`).run();
db.prepare(`
  INSERT INTO accounts (code,title,account_type,purchase_enabled,sale_enabled,opening_balance,opening_balance_type,status)
  VALUES ('BUG-SUPP','Bug Test Supplier','SUPPLIER',1,0,0,'Cr','Active')
`).run();

const custId = db.prepare("SELECT id FROM accounts WHERE code='BUG-CUST'").get().id;
const suppId = db.prepare("SELECT id FROM accounts WHERE code='BUG-SUPP'").get().id;

console.log('\n=== TASK 1: Bug Condition Exploration Tests ===\n');
console.log('NOTE: All four cases below are EXPECTED TO FAIL on unfixed code.');
console.log('      Failure here CONFIRMS the bug exists.\n');

// ─────────────────────────────────────────────────────────────────────────────
// Case 1 — Full customer receipt (HO_INCOMING without party_account_id)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- Case 1: Full customer receipt ---');

// Post SALE with party_account_id set (this works correctly)
accountingService.postTransaction({
  entry_type:       'SALE',
  date:             '2026-01-01',
  description:      'Bug Test Sale 10000',
  reference_no:     'SL-BUG-001',
  party_account_id: custId,
  debit_lines:  [{ account_id: custId,  amount: 10000 }],
  credit_lines: [{ account_id: revId,   amount: 10000 }],
  inventory_lines: [],
});

// Post HO_INCOMING WITHOUT party_account_id (simulating current frontend payload)
accountingService.postTransaction({
  entry_type:   'HO_INCOMING',
  date:         '2026-01-02',
  description:  'Bug Test Receipt 10000',
  reference_no: 'RV-BUG-001',
  // party_account_id intentionally omitted — this is the bug condition
  debit_lines:  [{ account_id: cashId, amount: 10000 }],
  credit_lines: [{ account_id: custId, amount: 10000 }],
  inventory_lines: [],
});

const case1 = reportRepository.getCustomerLedger(custId);
const case1Balance = case1.closingBalance;
assert(
  case1Balance === 0,
  `Case 1: closingBalance should be 0 after full receipt, got ${case1Balance}`,
  `getCustomerLedger returns ${case1Balance} instead of 0 — HO_INCOMING with party_account_id=NULL is invisible`
);

// ─────────────────────────────────────────────────────────────────────────────
// Case 2 — Partial customer receipt
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- Case 2: Partial customer receipt ---');

// New isolated customer
db.prepare(`
  INSERT INTO accounts (code,title,account_type,purchase_enabled,sale_enabled,opening_balance,opening_balance_type,status)
  VALUES ('BUG-CUST2','Bug Test Customer 2','CUSTOMER',0,1,0,'Dr','Active')
`).run();
const custId2 = db.prepare("SELECT id FROM accounts WHERE code='BUG-CUST2'").get().id;

accountingService.postTransaction({
  entry_type:       'SALE',
  date:             '2026-01-01',
  description:      'Bug Test Sale 10000 (C2)',
  reference_no:     'SL-BUG-002',
  party_account_id: custId2,
  debit_lines:  [{ account_id: custId2, amount: 10000 }],
  credit_lines: [{ account_id: revId,   amount: 10000 }],
  inventory_lines: [],
});

accountingService.postTransaction({
  entry_type:   'HO_INCOMING',
  date:         '2026-01-02',
  description:  'Bug Test Partial Receipt 4000',
  reference_no: 'RV-BUG-002',
  // party_account_id intentionally omitted
  debit_lines:  [{ account_id: cashId,  amount: 4000 }],
  credit_lines: [{ account_id: custId2, amount: 4000 }],
  inventory_lines: [],
});

const case2 = reportRepository.getCustomerLedger(custId2);
const case2Balance = case2.closingBalance;
assert(
  case2Balance === 6000,
  `Case 2: closingBalance should be 6000 after partial receipt, got ${case2Balance}`,
  `getCustomerLedger returns ${case2Balance} instead of 6000 — HO_INCOMING with party_account_id=NULL is invisible`
);

// ─────────────────────────────────────────────────────────────────────────────
// Case 3 — Full supplier payment (HO_OUTGOING without party_account_id)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- Case 3: Full supplier payment ---');

accountingService.postTransaction({
  entry_type:       'PURCHASE',
  date:             '2026-01-01',
  description:      'Bug Test Purchase 8000',
  reference_no:     'PR-BUG-001',
  party_account_id: suppId,
  debit_lines:  [{ account_id: purchId, amount: 8000 }],
  credit_lines: [{ account_id: suppId,  amount: 8000 }],
  inventory_lines: [],
});

accountingService.postTransaction({
  entry_type:   'HO_OUTGOING',
  date:         '2026-01-02',
  description:  'Bug Test Payment 8000',
  reference_no: 'PV-BUG-001',
  // party_account_id intentionally omitted
  debit_lines:  [{ account_id: suppId,  amount: 8000 }],
  credit_lines: [{ account_id: cashId,  amount: 8000 }],
  inventory_lines: [],
});

const case3 = reportRepository.getSupplierLedger(suppId);
const case3Balance = case3.closingBalance;
assert(
  case3Balance === 0,
  `Case 3: closingBalance should be 0 after full payment, got ${case3Balance}`,
  `getSupplierLedger returns ${case3Balance} instead of 0 — HO_OUTGOING with party_account_id=NULL is invisible`
);

// ─────────────────────────────────────────────────────────────────────────────
// Case 4 — Partial supplier payment
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- Case 4: Partial supplier payment ---');

db.prepare(`
  INSERT INTO accounts (code,title,account_type,purchase_enabled,sale_enabled,opening_balance,opening_balance_type,status)
  VALUES ('BUG-SUPP2','Bug Test Supplier 2','SUPPLIER',1,0,0,'Cr','Active')
`).run();
const suppId2 = db.prepare("SELECT id FROM accounts WHERE code='BUG-SUPP2'").get().id;

accountingService.postTransaction({
  entry_type:       'PURCHASE',
  date:             '2026-01-01',
  description:      'Bug Test Purchase 8000 (S2)',
  reference_no:     'PR-BUG-002',
  party_account_id: suppId2,
  debit_lines:  [{ account_id: purchId, amount: 8000 }],
  credit_lines: [{ account_id: suppId2, amount: 8000 }],
  inventory_lines: [],
});

accountingService.postTransaction({
  entry_type:   'HO_OUTGOING',
  date:         '2026-01-02',
  description:  'Bug Test Partial Payment 3000',
  reference_no: 'PV-BUG-002',
  // party_account_id intentionally omitted
  debit_lines:  [{ account_id: suppId2, amount: 3000 }],
  credit_lines: [{ account_id: cashId,  amount: 3000 }],
  inventory_lines: [],
});

const case4 = reportRepository.getSupplierLedger(suppId2);
const case4Balance = case4.closingBalance;
assert(
  case4Balance === 5000,
  `Case 4: closingBalance should be 5000 after partial payment, got ${case4Balance}`,
  `getSupplierLedger returns ${case4Balance} instead of 5000 — HO_OUTGOING with party_account_id=NULL is invisible`
);

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n=== TASK 1 RESULT: ${passed} passed, ${failed} failed ===`);

if (counterExamples.length > 0) {
  console.log('\n--- Documented CounterExamples (confirming bug exists) ---');
  counterExamples.forEach((ex, i) => console.log(`  [${i + 1}] ${ex}`));
  console.log('\nAll failures above are EXPECTED on unfixed code.');
  console.log('These counterexamples confirm Bug Condition is real.');
}

// Cleanup
closeConnection();
[DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm'].forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });

// Exit 0 even on assertion failures — the test is expected to fail.
// (The orchestrator reads the output to determine pass/fail status.)
process.exit(0);
