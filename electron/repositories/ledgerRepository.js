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

  // Capital Account Summary
  // Total Invested = SUM of credits from entry_type='CAPITAL' (POSTED)
  // Total Withdrawn = SUM of debits from entry_type='CAPITAL_WITHDRAWAL' (POSTED)
  // Current Capital = opening equity effect + credits - debits from POSTED lines
  getCapitalSummary(capitalAccountId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(capitalAccountId, 10);

    // Get account info for opening balance
    const account = conn.prepare('SELECT opening_balance, opening_balance_type FROM accounts WHERE id = ?').get(id);
    if (!account) {
      throw new Error(`Capital account ${capitalAccountId} not found`);
    }

    // Opening equity effect: Cr increases capital, Dr decreases
    let openingEquity = 0;
    const openingBalance = Number(account.opening_balance || 0);
    if (account.opening_balance_type === 'Cr') {
      openingEquity = openingBalance;
    } else if (account.opening_balance_type === 'Dr') {
      openingEquity = -openingBalance;
    }

    // Total Invested (credits from CAPITAL entries)
    const investedResult = conn.prepare(`
      SELECT COALESCE(SUM(ll.amount), 0) as total
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED' AND me.entry_type = 'CAPITAL' AND ll.type = 'credit'
    `).get(id);
    const totalInvested = Math.round((investedResult?.total || 0) * 100) / 100;

    // Total Withdrawn (debits from CAPITAL_WITHDRAWAL entries)
    const withdrawnResult = conn.prepare(`
      SELECT COALESCE(SUM(ll.amount), 0) as total
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED' AND me.entry_type = 'CAPITAL_WITHDRAWAL' AND ll.type = 'debit'
    `).get(id);
    const totalWithdrawn = Math.round((withdrawnResult?.total || 0) * 100) / 100;

    // Current Capital = opening + invested - withdrawn
    const currentCapital = Math.round((openingEquity + totalInvested - totalWithdrawn) * 100) / 100;

    return {
      accountId: id,
      openingEquity,
      totalInvested,
      totalWithdrawn,
      currentCapital,
    };
  }

  // List Capital Transactions for a capital account
  listCapitalTransactions(capitalAccountId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(capitalAccountId, 10);

    // Get account for opening balance
    const account = conn.prepare('SELECT opening_balance, opening_balance_type FROM accounts WHERE id = ?').get(id);
    if (!account) {
      throw new Error(`Capital account ${capitalAccountId} not found`);
    }

    let openingEquity = 0;
    const openingBalance = Number(account.opening_balance || 0);
    if (account.opening_balance_type === 'Cr') {
      openingEquity = openingBalance;
    } else if (account.opening_balance_type === 'Dr') {
      openingEquity = -openingBalance;
    }

    // Get all POSTED ledger lines for this capital account, ordered by date
    const rows = conn.prepare(`
      SELECT 
        me.id as entry_id,
        me.date,
        me.entry_type,
        me.description,
        me.reference_no,
        ll.type as line_type,
        ll.amount
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED' 
        AND me.entry_type IN ('CAPITAL', 'CAPITAL_WITHDRAWAL')
      ORDER BY me.date ASC, me.id ASC, ll.id ASC
    `).all(id);

    let runningBalance = openingEquity;
    const records = rows.map((r) => {
      const amount = Number(r.amount) || 0;
      let signedAmount = 0;
      let displayType = r.entry_type;

      if (r.entry_type === 'CAPITAL' && r.line_type === 'credit') {
        signedAmount = amount; // Investment increases capital
        runningBalance += amount;
      } else if (r.entry_type === 'CAPITAL_WITHDRAWAL' && r.line_type === 'debit') {
        signedAmount = -amount; // Withdrawal decreases capital
        runningBalance -= amount;
      } else {
        // Other line types for this account (shouldn't normally happen for capital accounts in these entry types)
        signedAmount = r.line_type === 'credit' ? amount : -amount;
        runningBalance += signedAmount;
      }
      runningBalance = Math.round(runningBalance * 100) / 100;

      return {
        entry_id: r.entry_id,
        date: r.date,
        entry_type: r.entry_type,
        description: r.description,
        reference_no: r.reference_no,
        amount: Math.round(signedAmount * 100) / 100,
        running_balance: runningBalance,
      };
    });

    return records;
  }
}

module.exports = new LedgerRepository();
