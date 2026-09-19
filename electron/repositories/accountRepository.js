const BaseRepository = require('./baseRepository');

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
        gst_number, ntn_number, remarks, area_id || null, sub_area_id || null,
        note_head_id || null, salesman_id || null, booker_id || null, item_category_id || null, category_id || null,
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
        gst_number, ntn_number, remarks, area_id || null, sub_area_id || null,
        note_head_id || null, salesman_id || null, booker_id || null, item_category_id || null, category_id || null,
        credit_limit, aging_days, status, short_name
      );
      return this.findById(info.lastInsertRowid);
    }
  }

  deleteOrDeactivate(id) {
    // Check if account has ledger lines posted
    const lineCount = this.db.prepare('SELECT COUNT(*) as count FROM ledger_lines WHERE account_id = ?').get(id).count;
    if (lineCount > 0) {
      // Deactivate
      this.db.prepare("UPDATE accounts SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      return { success: true, action: 'deactivated', message: 'Account has historical transactions; status updated to Inactive.' };
    } else {
      // Hard delete safely
      this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
      return { success: true, action: 'deleted', message: 'Account deleted successfully.' };
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
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debit,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credit
      FROM ledger_lines
      WHERE account_id = ?
    `).get(accountId);

    if (totals) {
      balance += (totals.total_debit || 0) - (totals.total_credit || 0);
    }

    return balance;
  }
}

module.exports = new AccountRepository();
