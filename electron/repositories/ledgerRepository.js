const BaseRepository = require('./baseRepository');

class LedgerRepository extends BaseRepository {
  constructor() {
    super('master_entries');
  }

  createMasterEntry(entry, dbConn = null) {
    const conn = dbConn || this.db;
    const {
      entry_type, date, description = '', reference_no = '', status = 'POSTED',
      party_account_id = null, transaction_amount = 0,
    } = entry;
    const stmt = conn.prepare(`
      INSERT INTO master_entries (entry_type, date, description, reference_no, status, party_account_id, transaction_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      entry_type, date, description, reference_no, status,
      party_account_id || null,
      Number(transaction_amount) || 0,
    );
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
        me.status,
        ll.type as line_type,
        ll.amount,
        ROUND(COALESCE((
          SELECT SUM(l2.amount) FROM ledger_lines l2 WHERE l2.entry_id = me.id AND lower(l2.type) = 'debit'
        ), 0), 2) as total_amount,
        COALESCE((
          SELECT a2.title FROM ledger_lines l2
          JOIN accounts a2 ON l2.account_id = a2.id
          WHERE l2.entry_id = me.id AND a2.account_type NOT IN ('CASH','BANK')
          ORDER BY l2.id LIMIT 1
        ), (
          SELECT a2.title FROM ledger_lines l2
          JOIN accounts a2 ON l2.account_id = a2.id
          WHERE l2.entry_id = me.id ORDER BY l2.id LIMIT 1
        )) as account_name
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
        status: r.status || 'POSTED',
        amount: Math.round(signedAmount * 100) / 100,
        total_amount: Number(r.total_amount) || 0,
        running_balance: runningBalance,
        account_name: r.account_name || null,
      };
    });

    return records;
  }

  // --- Phase 3: Reverse / Void / Edit support ---

  getMasterEntryById(entryId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(entryId, 10);
    return conn.prepare(
      'SELECT * FROM master_entries WHERE id = ?'
    ).get(id);
  }

  getLedgerLinesByEntryId(entryId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(entryId, 10);
    return conn.prepare(
      `SELECT ll.*, a.code as account_code, a.title as account_title, a.account_type
       FROM ledger_lines ll
       LEFT JOIN accounts a ON ll.account_id = a.id
       WHERE ll.entry_id = ?
       ORDER BY ll.id ASC`
    ).all(id);
  }

  getInventoryByEntryId(entryId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(entryId, 10);
    return conn.prepare(
      `SELECT it.*, i.code as item_code, i.name as item_name
       FROM inventory_transactions it
       LEFT JOIN items i ON it.item_id = i.id
       WHERE it.entry_id = ?
       ORDER BY it.id ASC`
    ).all(id);
  }

  getTransaction(entryId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(entryId, 10);
    const master = this.getMasterEntryById(id, conn);
    if (!master) return null;
    const ledgerLines = this.getLedgerLinesByEntryId(id, conn) || [];
    const inventoryLines = this.getInventoryByEntryId(id, conn) || [];

    const debit_lines = ledgerLines
      .filter((l) => l.type === 'debit')
      .map((l) => ({
        account_id: l.account_id,
        amount: Number(l.amount) || 0,
        account_title: l.account_title,
        account_type: l.account_type,
      }));

    const credit_lines = ledgerLines
      .filter((l) => l.type === 'credit')
      .map((l) => ({
        account_id: l.account_id,
        amount: Number(l.amount) || 0,
        account_title: l.account_title,
        account_type: l.account_type,
      }));

    const inv_lines = inventoryLines.map((il) => ({
      item_id: il.item_id,
      qty: Number(il.qty) || 0,
      unit_price: Number(il.unit_price) || 0,
      total_price: Number(il.total_price) || 0,
      transaction_type: il.transaction_type,
    }));

    const total_amount = master.transaction_amount
      ? Number(master.transaction_amount)
      : Math.max(
          debit_lines.reduce((s, l) => s + l.amount, 0),
          credit_lines.reduce((s, l) => s + l.amount, 0),
        );

    return {
      entry_id: master.id,
      entry_type: master.entry_type,
      date: master.date,
      description: master.description,
      reference_no: master.reference_no,
      status: master.status,
      party_account_id: master.party_account_id || null,
      total_amount: Math.round(total_amount * 100) / 100,
      debit_lines,
      credit_lines,
      inventory_lines: inv_lines,
    };
  }

  setMasterEntryStatus(entryId, status, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(entryId, 10);
    conn.prepare(
      'UPDATE master_entries SET status = ? WHERE id = ?'
    ).run(status, id);
    return this.getMasterEntryById(id, conn);
  }

  deleteLedgerLinesByEntryId(entryId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(entryId, 10);
    conn.prepare('DELETE FROM ledger_lines WHERE entry_id = ?').run(id);
  }

  deleteInventoryByEntryId(entryId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(entryId, 10);
    conn.prepare('DELETE FROM inventory_transactions WHERE entry_id = ?').run(id);
  }

  deleteMasterEntry(entryId, dbConn = null) {
    const conn = dbConn || this.db;
    const id = parseInt(entryId, 10);
    conn.prepare('DELETE FROM master_entries WHERE id = ?').run(id);
  }

   listEntries(filters = {}) {
      const {
        entry_type,
        status = 'POSTED',
        dateFrom,
        dateTo,
        accountId,
        search,
        limit = 100,
        offset = 0,
      } = filters;

    let sql = `
      SELECT
        me.id as entry_id,
        me.entry_type,
        me.date,
        me.description,
        me.reference_no,
        me.status,
        me.party_account_id,
        COALESCE(NULLIF(me.transaction_amount, 0),
          ROUND(COALESCE(
            (SELECT SUM(ll2.amount) FROM ledger_lines ll2 WHERE ll2.entry_id = me.id AND lower(ll2.type) = 'debit'), 0), 2)
        ) as total_amount,
        COALESCE(
          (SELECT a2.title FROM accounts a2 WHERE a2.id = me.party_account_id),
          (SELECT a2.title FROM ledger_lines ll2
           JOIN accounts a2 ON ll2.account_id = a2.id
           WHERE ll2.entry_id = me.id AND a2.account_type NOT IN ('CASH','BANK')
           ORDER BY ll2.id LIMIT 1),
          (SELECT a2.title FROM ledger_lines ll2
           JOIN accounts a2 ON ll2.account_id = a2.id
           WHERE ll2.entry_id = me.id ORDER BY ll2.id LIMIT 1)
        ) as account_name
      FROM master_entries me
      WHERE 1=1
      `;
      const params = [];

      if (status) {
        sql += ' AND me.status = ?';
        params.push(status);
      }
      if (entry_type) {
        sql += ' AND me.entry_type = ?';
        params.push(entry_type);
      }
      if (dateFrom) {
        sql += ' AND me.date >= ?';
        params.push(dateFrom);
      }
      if (dateTo) {
        sql += ' AND me.date <= ?';
        params.push(dateTo);
      }
      if (accountId) {
        sql += ' AND EXISTS (SELECT 1 FROM ledger_lines WHERE entry_id = me.id AND account_id = ?)';
        params.push(parseInt(accountId, 10));
      }
      if (search) {
        sql += ' AND (me.reference_no LIKE ? OR me.description LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term);
      }

      sql += ' ORDER BY me.date DESC, me.id DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const rows = this.db.prepare(sql).all(...params);

      console.log('[listEntries]', { entry_type, status, count: rows.length });

      return rows.map((r) => ({
        entry_id: r.entry_id,
        entry_type: r.entry_type,
        date: r.date,
        description: r.description,
        reference_no: r.reference_no,
        status: r.status,
        party_account_id: r.party_account_id || null,
        total_amount: Number(r.total_amount) || 0,
        account_name: r.account_name || null,
      }));
      }
   }

module.exports = new LedgerRepository();
