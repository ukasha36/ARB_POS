const BaseRepository = require('./baseRepository');

class ItemRepository extends BaseRepository {
  constructor() {
    super('items');
  }

  findById(id, dbConn = null) {
    const conn = dbConn || this.db;
    const stmt = conn.prepare(`
      SELECT i.*, a.title as supplier_name
      FROM items i
      LEFT JOIN accounts a ON i.supplier_id = a.id
      WHERE i.id = ?
    `);
    return stmt.get(id);
  }

  findAll(search = '', includeInactive = false) {
    let sql = `
      SELECT i.*, a.title as supplier_name,
             ROUND(i.stock_qty * i.current_wac, 2) as stock_valuation
      FROM items i
      LEFT JOIN accounts a ON i.supplier_id = a.id
    `;
    const conditions = [];
    const params = [];

    if (!includeInactive) {
      conditions.push("i.status = 'Active'");
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push("(i.code LIKE ? OR i.name LIKE ? OR i.barcode LIKE ? OR i.category LIKE ?)");
      params.push(term, term, term, term);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY i.name ASC';
    return this.db.prepare(sql).all(...params);
  }

  saveItem(itemData) {
    const {
      id,
      code,
      name,
      barcode = '',
      category = 'General',
      unit_price = 0.00,
      purchase_price = 0.00,
      stock_qty,
      opening_stock_qty = 0.00,
      opening_cost_price = 0.00,
      min_stock = 5.00,
      status = 'Active',
      supplier_id = null,
    } = itemData;

    if (id) {
      // NOTE: Catalog edits do NOT alter current_wac or historical costs
      this.db.prepare(`
        UPDATE items 
        SET code = ?, name = ?, barcode = ?, category = ?, unit_price = ?, 
            purchase_price = ?, stock_qty = ?, min_stock = ?, status = ?, supplier_id = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        code,
        name,
        barcode,
        category,
        Math.round(Number(unit_price) * 100) / 100,
        Math.round(Number(purchase_price) * 100) / 100,
        Math.round(Number(stock_qty !== undefined ? stock_qty : (opening_stock_qty || 0)) * 100) / 100,
        Number(min_stock) || 0,
        status,
        supplier_id ? parseInt(supplier_id, 10) : null,
        id
      );
      return this.findById(id);
    } else {
      const numOpeningQty = Number(opening_stock_qty) || 0;
      const numOpeningCost = Math.round((Number(opening_cost_price) || Number(purchase_price) || 0) * 100) / 100;
      const initialWac = numOpeningCost > 0 ? numOpeningCost : (Math.round(Number(purchase_price) * 100) / 100);

      const info = this.db.prepare(`
        INSERT INTO items (
          code, name, barcode, category, unit_price, purchase_price, stock_qty,
          opening_stock_qty, opening_cost_price, current_wac, min_stock, status, supplier_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        code,
        name,
        barcode,
        category,
        Math.round(Number(unit_price) * 100) / 100,
        Math.round(Number(purchase_price) * 100) / 100,
        numOpeningQty,
        numOpeningQty,
        numOpeningCost,
        initialWac,
        Number(min_stock) || 5,
        status || 'Active',
        supplier_id ? parseInt(supplier_id, 10) : null
      );
      return this.findById(info.lastInsertRowid);
    }
  }

  hasTransactionHistory(itemId) {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM inventory_transactions WHERE item_id = ?
    `).get(itemId);
    return (row?.count || 0) > 0;
  }

  deactivateItem(itemId) {
    this.db.prepare(`
      UPDATE items SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(itemId);
    return this.findById(itemId);
  }

  deleteItem(itemId) {
    if (this.hasTransactionHistory(itemId)) {
      this.deactivateItem(itemId);
      return {
        success: true,
        deactivated: true,
        message: 'Item has historical transactions. It has been deactivated instead of permanently deleted to preserve audit trails.',
      };
    }
    this.db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
    return { success: true, deleted: true, message: 'Item deleted successfully.' };
  }

  updateWacAndStock(itemId, deltaQty, newWac, latestPurchasePrice = null, dbConn = null) {
    const conn = dbConn || this.db;
    const roundedWac = Math.round(Number(newWac) * 100) / 100;
    if (latestPurchasePrice !== null && latestPurchasePrice !== undefined) {
      const roundedPP = Math.round(Number(latestPurchasePrice) * 100) / 100;
      conn.prepare(`
        UPDATE items
        SET stock_qty = stock_qty + ?, current_wac = ?, purchase_price = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(deltaQty, roundedWac, roundedPP, itemId);
    } else {
      conn.prepare(`
        UPDATE items
        SET stock_qty = stock_qty + ?, current_wac = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(deltaQty, roundedWac, itemId);
    }
  }

  updateStockQty(itemId, deltaQty, dbConn = null) {
    const conn = dbConn || this.db;
    conn.prepare(`
      UPDATE items 
      SET stock_qty = stock_qty + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(deltaQty, itemId);
  }
}

module.exports = new ItemRepository();
