// supplierRepository.js
// Repository wrapping the accounts table for SUPPLIER account_type.
// Payable balance = opening_balance (Cr positive) + posted Cr lines - posted Dr lines.

const { getDb } = require('../database/connection');

const ACCOUNT_TYPE = 'SUPPLIER';

/**
 * Compute payable balance for a supplier account.
 * For a SUPPLIER:
 *   - opening_balance with type 'Cr' is a positive payable (we owe them)
 *   - opening_balance with type 'Dr' reduces the payable
 *   - Posted ledger Credits increase payable, Debits decrease payable
 * Returns a positive number when the business owes money to the supplier.
 * @param {number} id - account id
 * @returns {number}
 */
function getPayableBalance(id) {
  const db = getDb();

  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND account_type = ?').get(id, ACCOUNT_TYPE);
  if (!account) throw new Error('Supplier not found');

  // Opening balance: Cr = payable (positive), Dr = receivable (negative) for a supplier
  let balance =
    account.opening_balance_type === 'Cr'
      ? Number(account.opening_balance)
      : -Number(account.opening_balance);

  // Posted ledger lines: Cr increases payable, Dr decreases payable
  const totals = db
    .prepare(`
      SELECT
        SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END) AS total_credit,
        SUM(CASE WHEN ll.type = 'debit'  THEN ll.amount ELSE 0 END) AS total_debit
      FROM ledger_lines ll
      INNER JOIN master_entries me ON me.id = ll.entry_id AND me.status = 'POSTED'
      WHERE ll.account_id = ?
    `)
    .get(id);

  if (totals) {
    balance += (totals.total_credit || 0) - (totals.total_debit || 0);
  }

  return balance;
}

/**
 * List suppliers with their computed payable balance.
 * @param {Object} [options]
 * @param {string}  [options.search] - partial match on code or title
 * @param {boolean} [options.active] - filter by status
 * @returns {Array}
 */
function list(options = {}) {
  const db = getDb();
  const { search, active } = options;

  let sql = `
    SELECT
      a.id, a.code, a.title, a.mobile, a.telephone_1,
      a.address_1, a.address_2, a.area_id, a.sub_area_id,
      a.salesman_id, a.opening_balance, a.opening_balance_type,
      a.status, a.created_at
    FROM accounts a
    WHERE a.account_type = ?
  `;
  const params = [ACCOUNT_TYPE];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (a.code LIKE ? OR a.title LIKE ? OR a.mobile LIKE ?)';
    params.push(term, term, term);
  }

  if (active !== undefined) {
    sql += ' AND a.status = ?';
    params.push(active ? 'Active' : 'Inactive');
  }

  sql += ' ORDER BY a.code ASC';

  const rows = db.prepare(sql).all(...params);

  // Attach payable balance to each row
  return rows.map((row) => {
    try {
      return { ...row, payable_balance: getPayableBalance(row.id) };
    } catch (_) {
      return { ...row, payable_balance: 0 };
    }
  });
}

/**
 * Get a single supplier by id, including payable balance.
 * @param {number} id
 * @returns {Object}
 */
function getById(id) {
  const db = getDb();

  const row = db
    .prepare('SELECT * FROM accounts WHERE id = ? AND account_type = ?')
    .get(id, ACCOUNT_TYPE);
  if (!row) throw new Error('Supplier not found');

  return { ...row, payable_balance: getPayableBalance(id) };
}

/**
 * Create a new supplier account.
 * @param {Object} data - { code, title, mobile?, telephone_1?, address_1?, address_2?,
 *                          area_id?, sub_area_id?, salesman_id?,
 *                          opening_balance?, opening_balance_type? }
 */
function create(data) {
  const db = getDb();
  const {
    code,
    title,
    mobile = '',
    telephone_1 = '',
    address_1 = '',
    address_2 = '',
    area_id = null,
    sub_area_id = null,
    salesman_id = null,
    opening_balance = 0.0,
    opening_balance_type = 'Cr',
    status = 'Active',
  } = data;

  if (!code || !code.trim()) throw new Error('Supplier code is required');
  if (!title || !title.trim()) throw new Error('Supplier title/name is required');

  // Code uniqueness check across all accounts
  const dup = db.prepare('SELECT 1 FROM accounts WHERE LOWER(code) = LOWER(?)').get(code.trim());
  if (dup) throw new Error(`Account code '${code.trim()}' is already in use`);

  const info = db
    .prepare(`
      INSERT INTO accounts (
        code, title, account_type, purchase_enabled, sale_enabled,
        mobile, telephone_1, address_1, address_2,
        area_id, sub_area_id, salesman_id,
        opening_balance, opening_balance_type, status
      ) VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      code.trim(), title.trim(), ACCOUNT_TYPE,
      mobile, telephone_1, address_1, address_2,
      area_id || null, sub_area_id || null, salesman_id || null,
      Number(opening_balance), opening_balance_type,
      status
    );

  return { id: info.lastInsertRowid };
}

/**
 * Update an existing supplier account.
 * @param {number} id
 * @param {Object} data - same fields as create (all optional)
 */
function update(id, data) {
  const db = getDb();
  const {
    code, title, mobile, telephone_1, address_1, address_2,
    area_id, sub_area_id, salesman_id,
    opening_balance, opening_balance_type, status,
  } = data;

  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND account_type = ?').get(id, ACCOUNT_TYPE);
  if (!existing) throw new Error('Supplier not found');

  // Re-check code uniqueness if changing code
  if (code !== undefined && code.trim() && code.trim().toLowerCase() !== existing.code.toLowerCase()) {
    const dup = db.prepare('SELECT 1 FROM accounts WHERE LOWER(code) = LOWER(?) AND id <> ?').get(code.trim(), id);
    if (dup) throw new Error(`Account code '${code.trim()}' is already in use`);
  }

  const setClauses = [];
  const params = [];

  if (code !== undefined)                { setClauses.push('code = ?');                 params.push(code.trim()); }
  if (title !== undefined)               { setClauses.push('title = ?');                params.push(title.trim()); }
  if (mobile !== undefined)              { setClauses.push('mobile = ?');               params.push(mobile); }
  if (telephone_1 !== undefined)         { setClauses.push('telephone_1 = ?');          params.push(telephone_1); }
  if (address_1 !== undefined)           { setClauses.push('address_1 = ?');            params.push(address_1); }
  if (address_2 !== undefined)           { setClauses.push('address_2 = ?');            params.push(address_2); }
  if (area_id !== undefined)             { setClauses.push('area_id = ?');              params.push(area_id || null); }
  if (sub_area_id !== undefined)         { setClauses.push('sub_area_id = ?');          params.push(sub_area_id || null); }
  if (salesman_id !== undefined)         { setClauses.push('salesman_id = ?');          params.push(salesman_id || null); }
  if (opening_balance !== undefined)     { setClauses.push('opening_balance = ?');      params.push(Number(opening_balance)); }
  if (opening_balance_type !== undefined){ setClauses.push('opening_balance_type = ?'); params.push(opening_balance_type); }
  if (status !== undefined)             { setClauses.push('status = ?');               params.push(status); }

  if (setClauses.length === 0) return; // nothing to update

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  db.prepare(`UPDATE accounts SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Deactivate a supplier account.
 * Prevents deactivation if any POSTED master_entries reference this supplier.
 * @param {number} id
 */
function deactivate(id) {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND account_type = ?').get(id, ACCOUNT_TYPE);
  if (!existing) throw new Error('Supplier not found');

  // Check for any POSTED ledger lines referencing this supplier
  const postedCount = db
    .prepare(`
      SELECT COUNT(*) AS cnt
      FROM ledger_lines ll
      INNER JOIN master_entries me ON me.id = ll.entry_id AND me.status = 'POSTED'
      WHERE ll.account_id = ?
    `)
    .get(id).cnt;

  if (postedCount > 0) {
    throw new Error('Cannot deactivate supplier: it has posted transaction history');
  }

  db.prepare("UPDATE accounts SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

module.exports = {
  list,
  getById,
  create,
  update,
  deactivate,
  getPayableBalance,
};
