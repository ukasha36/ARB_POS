const BaseRepository = require('./baseRepository');

function sanitizeFk(val) {
  if (val === null || val === undefined || val === '' || val === '0' || val === 0) return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}

class AccountRepository extends BaseRepository {
  constructor() {
    super('accounts');
  }

  findAll(filters = {}) {
    let sql = 'SELECT * FROM accounts WHERE 1=1';
    const params = [];

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      sql += ' AND (code LIKE ? OR title LIKE ? OR short_name LIKE ? OR mobile LIKE ? OR account_type LIKE ?)';
      params.push(term, term, term, term, term);
    }

    if (filters.account_type) {
      sql += ' AND account_type = ?';
      params.push(filters.account_type);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY code ASC';
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  listWithBalances(accountType) {
    const sql = `
      SELECT 
        a.*,
        COALESCE(SUM(CASE WHEN me.status = 'POSTED' AND ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN me.status = 'POSTED' AND ll.type = 'credit' THEN ll.amount ELSE 0 END), 0) as total_credit
      FROM accounts a
      LEFT JOIN ledger_lines ll ON a.id = ll.account_id
      LEFT JOIN master_entries me ON ll.entry_id = me.id
      WHERE a.account_type = ?
      GROUP BY a.id
      ORDER BY a.title ASC
    `;
    const rows = this.db.prepare(sql).all(accountType);

    return rows.map((row) => {
      const opening = row.opening_balance_type === 'Dr'
        ? Number(row.opening_balance)
        : -Number(row.opening_balance);
      const balance = opening + Number(row.total_debit) - Number(row.total_credit);
      return {
        id: row.id,
        code: row.code,
        title: row.title,
        account_type: row.account_type,
        opening_balance: row.opening_balance,
        opening_balance_type: row.opening_balance_type,
        balance: Math.round(balance * 100) / 100,
        mobile: row.mobile,
        remarks: row.remarks,
        status: row.status,
        salesman_id: row.salesman_id,
        short_name: row.short_name,
      };
    });
  }

  findByCode(code) {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE code = ?');
    return stmt.get(code);
  }

  getNextCode() {
    const maxAccount = this.db.prepare("SELECT code FROM accounts WHERE code GLOB '[0-9]*' ORDER BY CAST(code AS INTEGER) DESC LIMIT 1").get();
    if (maxAccount && !isNaN(parseInt(maxAccount.code, 10))) {
      return (parseInt(maxAccount.code, 10) + 1).toString();
    }
    return '1003';
  }

  getQuickNavRecord(currentCode, direction) {
    let sql = '';
    if (direction === 'first') {
      sql = 'SELECT * FROM accounts ORDER BY code ASC LIMIT 1';
      return this.db.prepare(sql).get();
    } else if (direction === 'last') {
      sql = 'SELECT * FROM accounts ORDER BY code DESC LIMIT 1';
      return this.db.prepare(sql).get();
    } else if (direction === 'prev') {
      sql = 'SELECT * FROM accounts WHERE code < ? ORDER BY code DESC LIMIT 1';
      const record = this.db.prepare(sql).get(currentCode || '');
      return record || this.db.prepare('SELECT * FROM accounts ORDER BY code ASC LIMIT 1').get();
    } else if (direction === 'next') {
      sql = 'SELECT * FROM accounts WHERE code > ? ORDER BY code ASC LIMIT 1';
      const record = this.db.prepare(sql).get(currentCode || '');
      return record || this.db.prepare('SELECT * FROM accounts ORDER BY code DESC LIMIT 1').get();
    }
    return null;
  }

  saveAccount(data) {
    const {
      id,
      code,
      title,
      account_type,
      purchase_enabled = 0,
      sale_enabled = 0,
      opening_balance = 0.00,
      opening_balance_type = 'Dr',
      opening_date = null,
      address_1 = '',
      address_2 = '',
      telephone_1 = '',
      telephone_2 = '',
      fax = '',
      mobile = '',
      gst_number = '',
      ntn_number = '',
      remarks = '',
      area_id = null,
      sub_area_id = null,
      note_head_id = null,
      salesman_id = null,
      booker_id = null,
      item_category_id = null,
      category_id = null,
      credit_limit = 0.00,
      aging_days = 0,
      status = 'Active',
      short_name = '',
    } = data;

    if (id) {
      // Update
      const stmt = this.db.prepare(`
        UPDATE accounts SET
          code = ?, title = ?, account_type = ?, purchase_enabled = ?, sale_enabled = ?,
          opening_balance = ?, opening_balance_type = ?, opening_date = ?,
          address_1 = ?, address_2 = ?, telephone_1 = ?, telephone_2 = ?, fax = ?, mobile = ?,
          gst_number = ?, ntn_number = ?, remarks = ?, area_id = ?, sub_area_id = ?,
          note_head_id = ?, salesman_id = ?, booker_id = ?, item_category_id = ?, category_id = ?,
          credit_limit = ?, aging_days = ?, status = ?, short_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        code, title, account_type, purchase_enabled ? 1 : 0, sale_enabled ? 1 : 0,
        opening_balance, opening_balance_type, opening_date,
        address_1, address_2, telephone_1, telephone_2, fax, mobile,
        gst_number, ntn_number, remarks, sanitizeFk(area_id), sanitizeFk(sub_area_id),
        sanitizeFk(note_head_id), sanitizeFk(salesman_id), sanitizeFk(booker_id), sanitizeFk(item_category_id), sanitizeFk(category_id),
        credit_limit, aging_days, status, short_name,
        id
      );
      return this.findById(id);
    } else {
      // Insert
      const stmt = this.db.prepare(`
        INSERT INTO accounts (
          code, title, account_type, purchase_enabled, sale_enabled,
          opening_balance, opening_balance_type, opening_date,
          address_1, address_2, telephone_1, telephone_2, fax, mobile,
          gst_number, ntn_number, remarks, area_id, sub_area_id,
          note_head_id, salesman_id, booker_id, item_category_id, category_id,
          credit_limit, aging_days, status, short_name
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);
      const info = stmt.run(
        code, title, account_type, purchase_enabled ? 1 : 0, sale_enabled ? 1 : 0,
        opening_balance, opening_balance_type, opening_date,
        address_1, address_2, telephone_1, telephone_2, fax, mobile,
        gst_number, ntn_number, remarks, sanitizeFk(area_id), sanitizeFk(sub_area_id),
        sanitizeFk(note_head_id), sanitizeFk(salesman_id), sanitizeFk(booker_id), sanitizeFk(item_category_id), sanitizeFk(category_id),
        credit_limit, aging_days, status, short_name
      );
      return this.findById(info.lastInsertRowid);
    }
  }

  checkDependencies(accountId) {
    const id = parseInt(accountId, 10);
    if (isNaN(id)) {
      throw new Error('Invalid account ID');
    }

    const account = this.db.prepare('SELECT id, code, title, account_type, status, opening_balance, opening_balance_type FROM accounts WHERE id = ?').get(id);
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    // Total ledger lines for this account
    const lineResult = this.db.prepare('SELECT COUNT(*) as count FROM ledger_lines WHERE account_id = ?').get(id);
    const totalLedgerLines = lineResult ? Number(lineResult.count) : 0;

    // Distinct master entries (transactions)
    const entryResult = this.db.prepare('SELECT COUNT(DISTINCT entry_id) as count FROM ledger_lines WHERE account_id = ?').get(id);
    const totalEntries = entryResult ? Number(entryResult.count) : 0;

    // Breakdown by entry_type
    const byTypeRows = this.db.prepare(`
      SELECT me.entry_type, COUNT(*) as count
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED'
      GROUP BY me.entry_type
    `).all(id);

    const byEntryType = {};
    for (const row of byTypeRows) {
      byEntryType[row.entry_type] = Number(row.count);
    }

    // Check for meaningful opening balance
    const openingBalance = Number(account.opening_balance || 0);
    const hasOpeningBalance = openingBalance !== 0;

    // Can hard delete only if zero ledger lines AND no meaningful opening balance
    const canHardDelete = totalLedgerLines === 0 && !hasOpeningBalance;

    return {
      canHardDelete,
      totalLedgerLines,
      totalEntries,
      byEntryType,
      hasOpeningBalance,
      account: {
        id: account.id,
        code: account.code,
        title: account.title,
        account_type: account.account_type,
        status: account.status,
      },
    };
  }

  deleteOrDeactivate(id) {
    const dep = this.checkDependencies(id);

    if (dep.canHardDelete) {
      this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
      return { success: true, action: 'deleted', message: 'Account deleted successfully.', dependencies: dep };
    } else {
      this.db.prepare("UPDATE accounts SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      return { 
        success: true, 
        action: 'deactivated', 
        message: 'Account has historical transactions or opening balance; status updated to Inactive.', 
        dependencies: dep 
      };
    }
  }

  getLookups() {
    const areas = this.db.prepare('SELECT * FROM setup_areas ORDER BY name ASC').all();
    const subAreas = this.db.prepare('SELECT * FROM setup_sub_areas ORDER BY name ASC').all();
    const salesmen = this.db.prepare('SELECT * FROM setup_salesmen ORDER BY name ASC').all();
    const categories = this.db.prepare('SELECT * FROM setup_categories ORDER BY name ASC').all();

    return { areas, subAreas, salesmen, categories };
  }

  getAccountBalance(accountId) {
    const account = this.findById(accountId);
    if (!account) return 0.00;

    let balance = account.opening_balance_type === 'Dr' ? account.opening_balance : -account.opening_balance;

     const totals = this.db.prepare(`
       SELECT 
         SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END) as total_debit,
         SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END) as total_credit
       FROM ledger_lines ll
       INNER JOIN master_entries me ON me.id = ll.entry_id AND me.status = 'POSTED'
       WHERE ll.account_id = ?
     `).get(accountId);

    if (totals) {
      balance += (totals.total_debit || 0) - (totals.total_credit || 0);
    }

    return balance;
  }
}

module.exports = new AccountRepository();
