const BaseRepository = require('./baseRepository');

class LedgerRepository extends BaseRepository {
  constructor() {
    super('master_entries');
  }

  createMasterEntry(entry, dbConn = null) {
    const conn = dbConn || this.db;
    const { entry_type, date, description = '', reference_no = '', status = 'POSTED' } = entry;
    const stmt = conn.prepare(`
      INSERT INTO master_entries (entry_type, date, description, reference_no, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(entry_type, date, description, reference_no, status);
    return info.lastInsertRowid;
  }

  insertLedgerLine(line, dbConn = null) {
    const conn = dbConn || this.db;
    const { entry_id, account_id, type, amount } = line;
    const roundedAmount = Math.round(Number(amount) * 100) / 100;
    const stmt = conn.prepare(`
      INSERT INTO ledger_lines (entry_id, account_id, type, amount)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(entry_id, account_id, type.toLowerCase(), roundedAmount);
  }

  insertInventoryTransaction(invLine, dbConn = null) {
    const conn = dbConn || this.db;
    const {
      entry_id,
      item_id,
      transaction_type,
      qty,
      unit_price,
      total_price,
      cost_price = 0.00,
      total_cost = 0.00,
    } = invLine;
    const stmt = conn.prepare(`
      INSERT INTO inventory_transactions (
        entry_id, item_id, transaction_type, qty, unit_price, total_price, cost_price, total_cost
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry_id,
      item_id,
      transaction_type,
      qty,
      Math.round(Number(unit_price) * 100) / 100,
      Math.round(Number(total_price) * 100) / 100,
      Math.round(Number(cost_price) * 100) / 100,
      Math.round(Number(total_cost) * 100) / 100
    );
  }
}

module.exports = new LedgerRepository();
