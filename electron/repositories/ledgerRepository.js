const BaseRepository = require('./baseRepository');

class LedgerRepository extends BaseRepository {
  constructor() {
    super('master_entries');
  }

  createMasterEntry(entry, dbConn = null) {
    const conn = dbConn || this.db;
    const {
      entry_type, date, description = '', reference_no = '', status = 'POSTED',
      party_account_id = null, transaction_amount = 0, source_entry_id = null,
    } = entry;
    const stmt = conn.prepare(`
      INSERT INTO master_entries (entry_type, date, description, reference_no, status, party_account_id, transaction_amount, source_entry_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      entry_type, date, description, reference_no, status,
      party_account_id || null,
      Number(transaction_amount) || 0,
      source_entry_id || null,
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
      source_entry_id = null,
    } = invLine;
    const stmt = conn.prepare(`
      INSERT INTO inventory_transactions (
        entry_id, item_id, transaction_type, qty, unit_price, total_price, cost_price, total_cost, source_entry_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry_id,
      item_id,
      transaction_type,
      qty,
      Math.round(Number(unit_price) * 100) / 100,
      Math.round(Number(total_price) * 100) / 100,
      Math.round(Number(cost_price) * 100) / 100,
      Math.round(Number(total_cost) * 100) / 100,
      source_entry_id || null
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
      item_name: il.item_name || '',
      item_code: il.item_code || '',
      qty: Number(il.qty) || 0,
      unit_price: Number(il.unit_price) || 0,
      total_price: Number(il.total_price) || 0,
      transaction_type: il.transaction_type,
      source_entry_id: il.source_entry_id || null,
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
      source_entry_id: master.source_entry_id || null,
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
        paymentAccountId,
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
        me.source_entry_id,
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
        ) as account_name,
        (SELECT a_exp.title FROM ledger_lines ll_exp
         JOIN accounts a_exp ON ll_exp.account_id = a_exp.id
         WHERE ll_exp.entry_id = me.id AND a_exp.account_type = 'EXPENSE'
         LIMIT 1) as expense_account_name,
        (SELECT a_exp.id FROM ledger_lines ll_exp
         JOIN accounts a_exp ON ll_exp.account_id = a_exp.id
         WHERE ll_exp.entry_id = me.id AND a_exp.account_type = 'EXPENSE'
         LIMIT 1) as expense_account_id,
        (SELECT a_cb.title FROM ledger_lines ll_cb
         JOIN accounts a_cb ON ll_cb.account_id = a_cb.id
         WHERE ll_cb.entry_id = me.id AND a_cb.account_type IN ('CASH','BANK')
         LIMIT 1) as payment_account_name,
        (SELECT a_cb.id FROM ledger_lines ll_cb
         JOIN accounts a_cb ON ll_cb.account_id = a_cb.id
         WHERE ll_cb.entry_id = me.id AND a_cb.account_type IN ('CASH','BANK')
         LIMIT 1) as payment_account_id,
        (SELECT GROUP_CONCAT(i_sub.iname, ', ')
         FROM (
           SELECT DISTINCT COALESCE(i2.name, '') as iname
           FROM inventory_transactions it2
           JOIN items i2 ON it2.item_id = i2.id
           WHERE it2.entry_id = me.id
           ORDER BY it2.id ASC
         ) i_sub
        ) as item_names
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
      if (paymentAccountId) {
        sql += ' AND EXISTS (SELECT 1 FROM ledger_lines WHERE entry_id = me.id AND account_id = ?)';
        params.push(parseInt(paymentAccountId, 10));
      }
      if (search) {
        sql += ' AND (me.reference_no LIKE ? OR me.description LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term);
      }

      sql += ' ORDER BY me.date DESC, me.id DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const rows = this.db.prepare(sql).all(...params);

      return rows.map((r) => ({
        entry_id: r.entry_id,
        entry_type: r.entry_type,
        date: r.date,
        description: r.description,
        reference_no: r.reference_no,
        status: r.status,
        party_account_id: r.party_account_id || null,
        source_entry_id: r.source_entry_id || null,
        total_amount: Number(r.total_amount) || 0,
        account_name: r.account_name || null,
        expense_account_name: r.expense_account_name || null,
        expense_account_id: r.expense_account_id || null,
        payment_account_name: r.payment_account_name || null,
        payment_account_id: r.payment_account_id || null,
        item_names: r.item_names || null,
      }));
    }

  /**
   * Get posted source transactions for return processing.
   * For PURCHASE_RETURN: find actual posted purchases for supplier + item.
   * For SALES_RETURN: find actual posted sales for customer + item.
   * Computes returnable_qty = purchased/sold qty - already returned qty.
   */
  getReturnSources(params, dbConn = null) {
    const conn = dbConn || this.db;
    const {
      entry_type, // 'PURCHASE_RETURN' or 'SALES_RETURN'
      party_account_id,
      item_id,
      exclude_entry_id = null,
    } = params;

    if (!party_account_id || !item_id) {
      return [];
    }

    const isPurchase = entry_type === 'PURCHASE_RETURN';
    const sourceTxType = isPurchase ? 'PURCHASE' : 'SALE';
    const returnTxType = isPurchase ? 'PURCHASE_RETURN' : 'SALES_RETURN';

    const pId = parseInt(party_account_id, 10);
    const iId = parseInt(item_id, 10);
    const exclId = exclude_entry_id ? parseInt(exclude_entry_id, 10) : null;

    // Find all POSTED source transactions for this party and item
    const sql = `
      SELECT
        me.id as entry_id,
        me.reference_no,
        me.date,
        it.unit_price,
        it.cost_price,
        SUM(it.qty) as original_qty
      FROM master_entries me
      JOIN inventory_transactions it ON it.entry_id = me.id
      WHERE me.entry_type = ?
        AND me.status = 'POSTED'
        AND me.party_account_id = ?
        AND it.item_id = ?
        AND it.transaction_type = ?
      GROUP BY me.id, it.unit_price
      ORDER BY me.date DESC, me.id DESC
    `;

    const sources = conn.prepare(sql).all(sourceTxType, pId, iId, sourceTxType);

    const results = [];
    for (const src of sources) {
      // Calculate previously returned qty for this source entry and item
      let retSql = `
        SELECT COALESCE(SUM(it.qty), 0) as returned_qty
        FROM inventory_transactions it
        JOIN master_entries me ON it.entry_id = me.id
        WHERE me.status = 'POSTED'
          AND it.transaction_type = ?
          AND it.item_id = ?
          AND (it.source_entry_id = ? OR me.source_entry_id = ?)
      `;
      const retParams = [returnTxType, iId, src.entry_id, src.entry_id];
      if (exclId) {
        retSql += ' AND me.id != ?';
        retParams.push(exclId);
      }

      const retRow = conn.prepare(retSql).get(...retParams);
      const previouslyReturned = Number(retRow?.returned_qty || 0);
      const returnableQty = Math.max(0, Math.round((Number(src.original_qty) - previouslyReturned) * 1000) / 1000);

      results.push({
        entry_id: src.entry_id,
        reference_no: src.reference_no,
        date: src.date,
        unit_price: Number(src.unit_price),
        cost_price: Number(src.cost_price || src.unit_price),
        purchased_qty: Number(src.original_qty),
        sold_qty: Number(src.original_qty),
        previously_returned_qty: previouslyReturned,
        returnable_qty: returnableQty,
      });
    }

    return results;
  }
}

module.exports = new LedgerRepository();
