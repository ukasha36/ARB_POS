const path = require('path');
const fs = require('fs');
const { initConnection, closeConnection, getDb, getDatabasePath } = require('./electron/database/connection');
const { runMigrations, loadPhase3Migrations } = require('./electron/database/schema');
const accountingService = require('./electron/services/accountingService');
const ledgerRepository = require('./electron/repositories/ledgerRepository');
const reportRepository = require('./electron/repositories/reportRepository');

const DB_PATH = path.join(process.cwd(), 'test_integration.db');
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');

initConnection(DB_PATH);
runMigrations();
loadPhase3Migrations();
const db = getDb();

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS:', msg); }
  else { failed++; console.log('  FAIL:', msg); }
}

// --- Setup accounts ---
db.prepare(`INSERT INTO accounts (code,title,account_type,purchase_enabled,sale_enabled,opening_balance,opening_balance_type,status) VALUES ('CUST-A','ABC Mobile Shop','CUSTOMER',0,1,0,'Dr','Active')`).run();
db.prepare(`INSERT INTO accounts (code,title,account_type,purchase_enabled,sale_enabled,opening_balance,opening_balance_type,status) VALUES ('SUP-B','XYZ Traders','SUPPLIER',1,0,0,'Cr','Active')`).run();
const custId = db.prepare("SELECT id FROM accounts WHERE code='CUST-A'").get().id;
const suppId = db.prepare("SELECT id FROM accounts WHERE code='SUP-B'").get().id;
const cashId = db.prepare("SELECT id FROM accounts WHERE code='1001'").get().id;
const revId = db.prepare("SELECT id FROM accounts WHERE code='4001'").get().id;
const purchId = db.prepare("SELECT id FROM accounts WHERE code='5001'").get().id;
const cogsId = db.prepare("SELECT id FROM accounts WHERE code='5003'").get().id;
assert(custId && suppId && cashId && revId && purchId && cogsId, 'system+party accounts seeded');

// --- Test 1: Post a SALE ---
const saleRes = accountingService.postTransaction({
  entry_type: 'SALE',
  date: '2026-09-23',
  description: 'Sale to ABC',
  reference_no: 'SL-000001',
  party_account_id: custId,
  debit_lines: [
    { account_id: cashId, amount: 50000 },
  ],
  credit_lines: [
    { account_id: revId, amount: 50000 },
  ],
  inventory_lines: [],
});
assert(saleRes.success, 'SALE posted');
const saleEntryId = saleRes.entryId;
const master = db.prepare('SELECT * FROM master_entries WHERE id = ?').get(saleEntryId);
assert(master.party_account_id === custId, `SALE party_account_id=${master.party_account_id} == customer ${custId}`);
assert(master.transaction_amount === 50000, `SALE transaction_amount=${master.transaction_amount} == 50000`);

// --- Test 2: Post a PURCHASE ---
const purchRes = accountingService.postTransaction({
  entry_type: 'PURCHASE',
  date: '2026-09-23',
  description: 'Purchase from XYZ',
  reference_no: 'PR-000001',
  party_account_id: suppId,
  debit_lines: [{ account_id: purchId, amount: 30000 }],
  credit_lines: [{ account_id: cashId, amount: 30000 }],
  inventory_lines: [],
});
assert(purchRes.success, 'PURCHASE posted');
const purchMaster = db.prepare('SELECT * FROM master_entries WHERE id = ?').get(purchRes.entryId);
assert(purchMaster.party_account_id === suppId, `PURCHASE party_account_id=${purchMaster.party_account_id} == supplier ${suppId}`);
assert(purchMaster.transaction_amount === 30000, `PURCHASE transaction_amount=${purchMaster.transaction_amount} == 30000`);

// --- Test 3: SALES RETURN ---
const retRes = accountingService.postTransaction({
  entry_type: 'SALES_RETURN',
  date: '2026-09-24',
  description: 'Return from ABC',
  reference_no: 'SR-000001',
  party_account_id: custId,
  debit_lines: [{ account_id: revId, amount: 12500 }],
  credit_lines: [{ account_id: custId, amount: 12500 }],
  inventory_lines: [],
});
assert(retRes.success, 'SALES_RETURN posted');
const retMaster = db.prepare('SELECT * FROM master_entries WHERE id = ?').get(retRes.entryId);
assert(retMaster.party_account_id === custId, `RETURN party_account_id=${retMaster.party_account_id} == customer`);
assert(retMaster.transaction_amount === 12500, `RETURN transaction_amount=${retMaster.transaction_amount} == 12500`);

// --- Test 4: listEntries Amount + party ---
const entries = ledgerRepository.listEntries({ entry_type: 'SALE' });
assert(entries.length >= 1, 'listEntries returns sales');
const saleEntry = entries.find(e => e.entry_id === saleEntryId);
assert(saleEntry, 'sale entry in list');
assert(saleEntry.total_amount === 50000, `listEntries total_amount=${saleEntry.total_amount} == 50000 (not SUM-with-COGS)`);
assert(saleEntry.account_name === 'ABC Mobile Shop', `listEntries account_name="${saleEntry.account_name}" == customer`);
assert(saleEntry.party_account_id === custId, 'listEntries party_account_id set');

// --- Test 5: Customer ledger shows the sale ---
const custLedger = reportRepository.getCustomerLedger(custId);
const saleInLedger = custLedger.records.find(r => r.entry_id === saleEntryId);
assert(saleInLedger, 'SALE appears in customer ledger');
assert(saleInLedger.debit > 0, 'SALE shown as debit in customer ledger');
const returnInLedger = custLedger.records.find(r => r.entry_id === retMaster.entry_id);
assert(returnInLedger, 'RETURN appears in customer ledger');
// Supplier ledger shows purchase
const suppLedger = reportRepository.getSupplierLedger(suppId);
const purchInSuppLedger = suppLedger.records.find(r => r.entry_id === purchMaster.entry_id);
assert(purchInSuppLedger, 'PURCHASE appears in supplier ledger');

// --- Test 6: FK protection - fake account throws clear error ---
let threw = false;
try {
  accountingService.postTransaction({
    entry_type: 'SALE', date: '2026-09-24', description: 'bad', reference_no: 'SL-999999',
    party_account_id: custId,
    debit_lines: [{ account_id: 999999, amount: 1000 }],
    credit_lines: [{ account_id: revId, amount: 1000 }],
    inventory_lines: [],
  });
} catch (e) {
  threw = true;
  assert(/non-existent account ID 999999/.test(e.message), `clear error: "${e.message}"`);
}
assert(threw, 'fake account id throws');

// --- Test 7: Party isolation (customer B does not see A's sale) ---
db.prepare(`INSERT INTO accounts (code,title,account_type,purchase_enabled,sale_enabled,opening_balance,opening_balance_type,status) VALUES ('CUST-B','Customer B','CUSTOMER',0,1,0,'Dr','Active')`).run();
const custBId = db.prepare("SELECT id FROM accounts WHERE code='CUST-B'").get().id;
const custBLedger = reportRepository.getCustomerLedger(custBId);
const aSaleInB = custBLedger.records.find(r => r.entry_id === saleEntryId);
assert(!aSaleInB, "Customer B does NOT see Customer A's sale");

// --- Test 8: Edit preserves party + amount ---
const editRes = accountingService.editTransaction(saleEntryId, {
  entry_type: 'SALE', date: '2026-09-23', description: 'Sale to ABC (edited)', reference_no: 'SL-000001',
  party_account_id: custId,
  debit_lines: [{ account_id: cashId, amount: 60000 }],
  credit_lines: [{ account_id: revId, amount: 60000 }],
  inventory_lines: [],
});
assert(editRes.success, 'edit SALE succeeds');
const editedMaster = db.prepare('SELECT * FROM master_entries WHERE id = ?').get(saleEntryId);
assert(editedMaster.transaction_amount === 60000, `edited transaction_amount=${editedMaster.transaction_amount} == 60000`);
assert(editedMaster.party_account_id === custId, 'edited party_account_id preserved');

// --- Test 9: COGS seeding works (sale with inventory) ---
db.prepare(`INSERT INTO items (code,name,account_type,purchase_price,sale_price,stock_qty,current_wac,current_cost,opening_qty) VALUES ('ITEM-1','Test Item','INVENTORY',100,200,50,100,100,50)`).run();
const itemId = db.prepare("SELECT id FROM items WHERE code='ITEM-1'").get().id;
const sale2Res = accountingService.postTransaction({
  entry_type: 'SALE', date: '2026-09-25', description: 'Sale with item', reference_no: 'SL-000002',
  party_account_id: custId,
  debit_lines: [{ account_id: cashId, amount: 2000 }],
  credit_lines: [{ account_id: revId, amount: 2000 }],
  inventory_lines: [{ item_id: itemId, transaction_type: 'SALE', qty: 10, unit_price: 200, total_price: 2000 }],
});
assert(sale2Res.success, 'SALE with inventory posted (COGS seeded 5001/5003 found)');
const sale2Master = db.prepare('SELECT * FROM master_entries WHERE id = ?').get(sale2Res.entryId);
assert(sale2Master.transaction_amount === 2000, `sale2 transaction_amount=${sale2Master.transaction_amount} == 2000`);

// --- Test 10: Foreign keys still ON ---
const fkOn = db.pragma('foreign_keys');
assert(fkOn === true, `foreign_keys pragma = ${fkOn}`);

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
closeConnection();
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');
process.exit(failed > 0 ? 1 : 0);
