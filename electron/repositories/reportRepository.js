const BaseRepository = require('./baseRepository');

class ReportRepository extends BaseRepository {
  constructor() {
    super('master_entries');
  }

  // 1. Unified Dashboard Metrics Query (Single Source of Truth)
  getDashboardMetrics() {
    const db = this.db;

    // Total Stock Valuation: Sum of (stock_qty * current_wac) for items with positive stock
    const stockRow = db.prepare(`
      SELECT 
        COALESCE(SUM(ROUND(stock_qty * current_wac, 2)), 0.00) as total_stock_value,
        COUNT(id) as total_items,
        COALESCE(SUM(CASE WHEN stock_qty <= min_stock AND stock_qty > 0 THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(CASE WHEN stock_qty <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count
      FROM items
      WHERE status = 'Active'
    `).get();

    // Accounts Receivable: Sum of outstanding net balances of all CUSTOMER accounts (EXCLUDE 1101 / CUST_GEN)
    const customerAccounts = db.prepare(`
      SELECT 
        a.id,
        a.code,
        a.short_name,
        a.opening_balance,
        a.opening_balance_type,
        COALESCE(SUM(CASE WHEN ll.type = 'debit' AND me.status = 'POSTED' THEN ll.amount ELSE 0 END), 0) as debits,
        COALESCE(SUM(CASE WHEN ll.type = 'credit' AND me.status = 'POSTED' THEN ll.amount ELSE 0 END), 0) as credits
      FROM accounts a
      LEFT JOIN ledger_lines ll ON a.id = ll.account_id
      LEFT JOIN master_entries me ON ll.entry_id = me.id
      WHERE a.account_type = 'CUSTOMER' AND a.code != '1101' AND COALESCE(a.short_name, '') != 'CUST_GEN'
      GROUP BY a.id
    `).all();

    let totalReceivables = 0.00;
    for (const c of customerAccounts) {
      const opening = c.opening_balance_type === 'Dr' ? Number(c.opening_balance) : -Number(c.opening_balance);
      const balance = opening + Number(c.debits) - Number(c.credits);
      if (balance > 0) {
        totalReceivables += balance;
      }
    }
    totalReceivables = Math.round(totalReceivables * 100) / 100;

    // Accounts Payable: Sum of outstanding net balances of all SUPPLIER accounts (EXCLUDE 2001 / SUPP_GEN)
    const supplierAccounts = db.prepare(`
      SELECT 
        a.id,
        a.code,
        a.short_name,
        a.opening_balance,
        a.opening_balance_type,
        COALESCE(SUM(CASE WHEN ll.type = 'credit' AND me.status = 'POSTED' THEN ll.amount ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN ll.type = 'debit' AND me.status = 'POSTED' THEN ll.amount ELSE 0 END), 0) as debits
      FROM accounts a
      LEFT JOIN ledger_lines ll ON a.id = ll.account_id
      LEFT JOIN master_entries me ON ll.entry_id = me.id
      WHERE a.account_type = 'SUPPLIER' AND a.code != '2001' AND COALESCE(a.short_name, '') != 'SUPP_GEN'
      GROUP BY a.id
    `).all();

    let totalPayables = 0.00;
    for (const s of supplierAccounts) {
      const opening = s.opening_balance_type === 'Cr' ? Number(s.opening_balance) : -Number(s.opening_balance);
      const balance = opening + Number(s.credits) - Number(s.debits);
      if (balance > 0) {
        totalPayables += balance;
      }
    }
    totalPayables = Math.round(totalPayables * 100) / 100;

    // Cash in Hand
    const cashAccounts = db.prepare(`
      SELECT 
        a.id,
        a.opening_balance,
        a.opening_balance_type,
        COALESCE(SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) as debits,
        COALESCE(SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END), 0) as credits
      FROM accounts a
      LEFT JOIN ledger_lines ll ON a.id = ll.account_id
      LEFT JOIN master_entries me ON ll.entry_id = me.id AND me.status = 'POSTED'
      WHERE a.account_type = 'CASH'
      GROUP BY a.id
    `).all();

    let totalCash = 0.00;
    for (const c of cashAccounts) {
      const opening = c.opening_balance_type === 'Dr' ? Number(c.opening_balance) : -Number(c.opening_balance);
      totalCash += (opening + Number(c.debits) - Number(c.credits));
    }
    totalCash = Math.round(totalCash * 100) / 100;

    // Bank Balances
    const bankAccounts = db.prepare(`
      SELECT 
        a.id,
        a.opening_balance,
        a.opening_balance_type,
        COALESCE(SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) as debits,
        COALESCE(SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END), 0) as credits
      FROM accounts a
      LEFT JOIN ledger_lines ll ON a.id = ll.account_id
      LEFT JOIN master_entries me ON ll.entry_id = me.id AND me.status = 'POSTED'
      WHERE a.account_type = 'BANK'
      GROUP BY a.id
    `).all();

    let totalBank = 0.00;
    for (const b of bankAccounts) {
      const opening = b.opening_balance_type === 'Dr' ? Number(b.opening_balance) : -Number(b.opening_balance);
      totalBank += (opening + Number(b.debits) - Number(b.credits));
    }
    totalBank = Math.round(totalBank * 100) / 100;

    // Today's summary aggregations (using local server date)
    const today = new Date().toISOString().split('T')[0];

    const todaySalesRow = db.prepare(`
      SELECT COALESCE(SUM(ll.amount), 0.00) as total_sales
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.status = 'POSTED' AND me.date = ? AND me.entry_type = 'SALE' AND ll.type = 'credit' AND a.account_type = 'REVENUE'
    `).get(today);

    const todayReturnsRow = db.prepare(`
      SELECT COALESCE(SUM(ll.amount), 0.00) as total_returns
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.status = 'POSTED' AND me.date = ? AND me.entry_type = 'SALES_RETURN' AND ll.type = 'debit' AND a.account_type = 'REVENUE'
    `).get(today);

    const todayPurchasesRow = db.prepare(`
      SELECT COALESCE(SUM(ll.amount), 0.00) as total_purchases
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.status = 'POSTED' AND me.date = ? AND me.entry_type = 'PURCHASE' AND ll.type = 'debit' AND a.account_type = 'PURCHASES'
    `).get(today);

    const todayReceiptsRow = db.prepare(`
      SELECT COALESCE(SUM(ll.amount), 0.00) as total_receipts
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.status = 'POSTED' AND me.date = ? AND me.entry_type IN ('RECEIPT', 'HO_INCOMING') AND ll.type = 'credit' AND a.account_type = 'CUSTOMER'
    `).get(today);

    const todayPaymentsRow = db.prepare(`
      SELECT COALESCE(SUM(ll.amount), 0.00) as total_payments
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.status = 'POSTED' AND me.date = ? AND me.entry_type IN ('PAYMENT', 'HO_OUTGOING') AND ll.type = 'debit' AND a.account_type IN ('SUPPLIER', 'EXPENSE')
    `).get(today);

    // Recent Transactions (top 8 posted transactions)
    const recentTxns = db.prepare(`
      SELECT 
        me.id,
        me.reference_no,
        me.entry_type,
        me.date,
        me.description,
        me.status,
        (SELECT ROUND(SUM(amount), 2) FROM ledger_lines WHERE entry_id = me.id AND type = 'debit') as total_amount
      FROM master_entries me
      WHERE me.status = 'POSTED'
      ORDER BY me.id DESC
      LIMIT 8
    `).all();

    return {
      totalStockValue: Math.round(Number(stockRow.total_stock_value || 0) * 100) / 100,
      totalItems: stockRow.total_items || 0,
      lowStockCount: stockRow.low_stock_count || 0,
      outOfStockCount: stockRow.out_of_stock_count || 0,
      accountsReceivable: totalReceivables,
      accountsPayable: totalPayables,
      cashInHand: totalCash,
      bankBalance: totalBank,
      postDatedChequesPending: {
        count: 0,
        amount: 0.00,
      },
      today: {
        date: today,
        netSales: Math.round((Number(todaySalesRow.total_sales || 0) - Number(todayReturnsRow.total_returns || 0)) * 100) / 100,
        purchases: Math.round(Number(todayPurchasesRow.total_purchases || 0) * 100) / 100,
        receipts: Math.round(Number(todayReceiptsRow.total_receipts || 0) * 100) / 100,
        payments: Math.round(Number(todayPaymentsRow.total_payments || 0) * 100) / 100,
      },
      recentTransactions: recentTxns.map((t) => ({
        id: t.reference_no || `TXN-${t.id}`,
        date: t.date,
        type: t.entry_type.replace(/_/g, ' '),
        account: t.description || 'General Ledger Posting',
        amount: Number(t.total_amount) || 0.00,
        status: t.status === 'POSTED' ? 'Posted' : t.status,
      })),
    };
  }

  // 2. Universal General Ledger Query
  getGeneralLedger(filters = {}) {
    const db = this.db;
    const { dateFrom, dateTo, accountId, accountType, entryType } = filters;

    let sql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.reference_no,
        me.entry_type,
        me.description,
        me.status,
        ll.id as line_id,
        ll.account_id,
        a.code as account_code,
        a.title as account_title,
        a.account_type,
        ll.type as line_type,
        ll.amount
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.status = 'POSTED'
    `;
    const params = [];

    if (dateFrom) {
      sql += ' AND me.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND me.date <= ?';
      params.push(dateTo);
    }
    if (accountId) {
      sql += ' AND ll.account_id = ?';
      params.push(parseInt(accountId, 10));
    }
    if (accountType) {
      sql += ' AND a.account_type = ?';
      params.push(accountType);
    }
    if (entryType) {
      sql += ' AND me.entry_type = ?';
      params.push(entryType);
    }

    sql += ' ORDER BY me.date ASC, me.id ASC, ll.id ASC';
    const rows = db.prepare(sql).all(...params);

    // Compute running balance
    let runningBalance = 0.00;
    const records = rows.map((r) => {
      const debit = r.line_type === 'debit' ? Number(r.amount) : 0.00;
      const credit = r.line_type === 'credit' ? Number(r.amount) : 0.00;

      // Dr is positive, Cr is negative for general ledger running delta
      runningBalance += (debit - credit);
      runningBalance = Math.round(runningBalance * 100) / 100;

      return {
        ...r,
        debit,
        credit,
        running_balance: runningBalance,
      };
    });

    const totalDebit = records.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = records.reduce((sum, r) => sum + r.credit, 0);

    return {
      records,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
    };
  }

  // 3. Customer Ledger Query
  getCustomerLedger(customerId, dateFrom = null, dateTo = null) {
    const db = this.db;
    const cid = parseInt(customerId, 10);
    const customer = db.prepare('SELECT * FROM accounts WHERE id = ?').get(cid);
    if (!customer) {
      throw new Error(`Customer with account ID ${customerId} does not exist.`);
    }

    // Opening balance before dateFrom
    let initialBalance = customer.opening_balance_type === 'Dr'
      ? Number(customer.opening_balance)
      : -Number(customer.opening_balance);

    if (dateFrom) {
      const priorLines = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) as debits,
          COALESCE(SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END), 0) as credits
        FROM ledger_lines ll
        JOIN master_entries me ON ll.entry_id = me.id
        WHERE ll.account_id = ? AND me.status = 'POSTED' AND me.date < ?
      `).get(cid, dateFrom);

      initialBalance += (Number(priorLines.debits) - Number(priorLines.credits));
    }
    initialBalance = Math.round(initialBalance * 100) / 100;

    // Period Transactions
    let sql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.reference_no,
        me.entry_type,
        me.description,
        ll.type as line_type,
        ll.amount as amount
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED'
    `;
    const params = [cid];

    if (dateFrom) {
      sql += ' AND me.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND me.date <= ?';
      params.push(dateTo);
    }

    sql += ' ORDER BY me.date ASC, me.id ASC, ll.id ASC';
    const rows = db.prepare(sql).all(...params);

    let runningBalance = initialBalance;
    let periodSales = 0.00;
    let periodReturns = 0.00;
    let periodReceipts = 0.00;

    const records = rows.map((r) => {
      const amount = Number(r.amount) || 0;
      let debit = 0.00;
      let credit = 0.00;
      let balanceImpact = 0.00;

      if (r.line_type === 'debit') {
        // Receivable increases (credit sale) -> normal Dr balance goes up
        debit = amount;
        balanceImpact = amount;
        if (r.entry_type === 'SALE') periodSales += amount;
      } else if (r.line_type === 'credit') {
        // Receivable decreases (receipt / return / HO_INCOMING)
        credit = amount;
        balanceImpact = -amount;
        if (r.entry_type === 'SALES_RETURN') periodReturns += amount;
        if (r.entry_type === 'RECEIPT' || r.entry_type === 'HO_INCOMING') periodReceipts += amount;
      }

      runningBalance = Math.round((runningBalance + balanceImpact) * 100) / 100;

      return {
        entry_id: r.entry_id,
        date: r.date,
        reference_no: r.reference_no,
        entry_type: r.entry_type,
        description: r.description,
        debit,
        credit,
        running_balance: runningBalance,
      };
    });

    return {
      customer: {
        id: customer.id,
        code: customer.code,
        title: customer.title,
        credit_limit: customer.credit_limit,
        mobile: customer.mobile,
      },
      openingBalance: initialBalance,
      closingBalance: runningBalance,
      summary: {
        sales: Math.round(periodSales * 100) / 100,
        returns: Math.round(periodReturns * 100) / 100,
        receipts: Math.round(periodReceipts * 100) / 100,
      },
      records,
    };
  }

  // 4. Supplier Ledger Query
  getSupplierLedger(supplierId, dateFrom = null, dateTo = null) {
    const db = this.db;
    const sid = parseInt(supplierId, 10);
    const supplier = db.prepare('SELECT * FROM accounts WHERE id = ?').get(sid);
    if (!supplier) {
      throw new Error(`Supplier with account ID ${supplierId} does not exist.`);
    }

    // Supplier balance is Credit normal (Credits increase payable, Debits decrease payable)
    let initialBalance = supplier.opening_balance_type === 'Cr'
      ? Number(supplier.opening_balance)
      : -Number(supplier.opening_balance);

    if (dateFrom) {
      const priorLines = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END), 0) as credits,
          COALESCE(SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) as debits
        FROM ledger_lines ll
        JOIN master_entries me ON ll.entry_id = me.id
        WHERE ll.account_id = ? AND me.status = 'POSTED' AND me.date < ?
      `).get(sid, dateFrom);

      initialBalance += (Number(priorLines.credits) - Number(priorLines.debits));
    }
    initialBalance = Math.round(initialBalance * 100) / 100;

    let sql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.reference_no,
        me.entry_type,
        me.description,
        ll.type as line_type,
        ll.amount as amount
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED'
    `;
    const params = [sid];

    if (dateFrom) {
      sql += ' AND me.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND me.date <= ?';
      params.push(dateTo);
    }

    sql += ' ORDER BY me.date ASC, me.id ASC, ll.id ASC';
    const rows = db.prepare(sql).all(...params);

    let runningBalance = initialBalance;
    let periodPurchases = 0.00;
    let periodReturns = 0.00;
    let periodPayments = 0.00;

    const records = rows.map((r) => {
      const amount = Number(r.amount) || 0;
      let debit = 0.00;
      let credit = 0.00;
      let balanceImpact = 0.00;

      if (r.line_type === 'credit') {
        // Payable increases (credit purchase) -> normal Cr balance goes up
        credit = amount;
        balanceImpact = amount;
        if (r.entry_type === 'PURCHASE') periodPurchases += amount;
      } else if (r.line_type === 'debit') {
        // Payable decreases (return / payment / HO_OUTGOING)
        debit = amount;
        balanceImpact = -amount;
        if (r.entry_type === 'PURCHASE_RETURN') periodReturns += amount;
        if (r.entry_type === 'PAYMENT' || r.entry_type === 'HO_OUTGOING') periodPayments += amount;
      }

      // Credit increases payable, debit decreases payable
      runningBalance = Math.round((runningBalance + balanceImpact) * 100) / 100;

      return {
        entry_id: r.entry_id,
        date: r.date,
        reference_no: r.reference_no,
        entry_type: r.entry_type,
        description: r.description,
        debit,
        credit,
        running_balance: runningBalance,
      };
    });

    return {
      supplier: {
        id: supplier.id,
        code: supplier.code,
        title: supplier.title,
        mobile: supplier.mobile,
      },
      openingBalance: initialBalance,
      closingBalance: runningBalance,
      summary: {
        purchases: Math.round(periodPurchases * 100) / 100,
        returns: Math.round(periodReturns * 100) / 100,
        payments: Math.round(periodPayments * 100) / 100,
      },
      records,
    };
  }

  // 5. Universal Account Statement (for ANY account in Chart of Accounts)
  getAccountStatement(accountId, dateFrom = null, dateTo = null) {
    const db = this.db;
    const aid = parseInt(accountId, 10);
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(aid);
    if (!account) {
      throw new Error(`Account ID ${accountId} does not exist.`);
    }

    // Determine normal balance orientation
    // Assets, Expenses, Purchases, Customer -> Debit normal
    // Liabilities, Equity, Revenue, Supplier, Capital -> Credit normal
    const isCreditNormal = ['SUPPLIER', 'CAPITAL', 'REVENUE', 'LIABILITIES', 'EQUITY'].includes(account.account_type);

    let initialBalance = 0.00;
    if (account.opening_balance_type === 'Dr') {
      initialBalance = isCreditNormal ? -Number(account.opening_balance) : Number(account.opening_balance);
    } else {
      initialBalance = isCreditNormal ? Number(account.opening_balance) : -Number(account.opening_balance);
    }

    if (dateFrom) {
      const prior = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) as debits,
          COALESCE(SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END), 0) as credits
        FROM ledger_lines ll
        JOIN master_entries me ON ll.entry_id = me.id
        WHERE ll.account_id = ? AND me.status = 'POSTED' AND me.date < ?
      `).get(aid, dateFrom);

      const d = Number(prior.debits);
      const c = Number(prior.credits);
      initialBalance += isCreditNormal ? (c - d) : (d - c);
    }
    initialBalance = Math.round(initialBalance * 100) / 100;

    let sql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.reference_no,
        me.entry_type,
        me.description,
        ll.type as line_type,
        ll.amount
      FROM ledger_lines ll
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE ll.account_id = ? AND me.status = 'POSTED'
    `;
    const params = [aid];

    if (dateFrom) {
      sql += ' AND me.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND me.date <= ?';
      params.push(dateTo);
    }

    sql += ' ORDER BY me.date ASC, me.id ASC, ll.id ASC';
    const rows = db.prepare(sql).all(...params);

    let running = initialBalance;
    let totalDebit = 0.00;
    let totalCredit = 0.00;

    const records = rows.map((r) => {
      const debit = r.line_type === 'debit' ? Number(r.amount) : 0.00;
      const credit = r.line_type === 'credit' ? Number(r.amount) : 0.00;

      totalDebit += debit;
      totalCredit += credit;

      running = isCreditNormal
        ? Math.round((running + credit - debit) * 100) / 100
        : Math.round((running + debit - credit) * 100) / 100;

      return {
        entry_id: r.entry_id,
        date: r.date,
        reference_no: r.reference_no,
        entry_type: r.entry_type,
        description: r.description,
        debit,
        credit,
        running_balance: running,
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        title: account.title,
        account_type: account.account_type,
        normalBalance: isCreditNormal ? 'Credit' : 'Debit',
      },
      openingBalance: initialBalance,
      closingBalance: running,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      records,
    };
  }

  // 6. Authoritative Sales Report with FIFO Outstanding Calculation
  getSalesReport(filters = {}) {
    const db = this.db;
    const { dateFrom, dateTo, customerId } = filters;

    let sql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.reference_no,
        me.description,
        me.party_account_id,
        (
          SELECT COALESCE(SUM(it.qty), 0)
          FROM inventory_transactions it
          WHERE it.entry_id = me.id AND it.transaction_type = 'SALE'
        ) as total_qty,
        (
          SELECT a.title
          FROM accounts a
          WHERE a.id = me.party_account_id
          LIMIT 1
        ) as customer_name,
        (
          SELECT COALESCE(SUM(ll.amount), 0)
          FROM ledger_lines ll
          JOIN accounts a ON ll.account_id = a.id
          WHERE ll.entry_id = me.id AND a.account_type = 'REVENUE' AND ll.type = 'credit'
        ) as gross_amount,
        (
          SELECT COALESCE(SUM(ll.amount), 0)
          FROM ledger_lines ll
          JOIN accounts a ON ll.account_id = a.id
          WHERE ll.entry_id = me.id AND a.account_type IN ('CASH', 'BANK') AND ll.type = 'debit'
        ) as cash_received
      FROM master_entries me
      WHERE me.entry_type = 'SALE' AND me.status = 'POSTED'
    `;
    const params = [];

    if (dateFrom) {
      sql += ' AND me.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND me.date <= ?';
      params.push(dateTo);
    }
    if (customerId) {
      sql += ' AND me.party_account_id = ?';
      params.push(parseInt(customerId, 10));
    }

    sql += ' ORDER BY me.date ASC, me.id ASC';
    const saleRecords = db.prepare(sql).all(...params);

    // Build map of customer ID -> list of open sales
    const customerSalesMap = {};
    for (const sale of saleRecords) {
      const custId = sale.party_account_id || 0;
      if (!customerSalesMap[custId]) {
        customerSalesMap[custId] = [];
      }
      customerSalesMap[custId].push({
        entry_id: sale.entry_id,
        date: sale.date,
        reference_no: sale.reference_no,
        description: sale.description,
        total_qty: sale.total_qty,
        customer_name: sale.customer_name,
        gross_amount: Number(sale.gross_amount),
        cash_received: Number(sale.cash_received),
        outstanding: Number(sale.gross_amount) - Number(sale.cash_received), // initial outstanding
      });
    }

    // Get all POSTED receipts/HO_INCOMING in the period
    let receiptSql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.party_account_id,
        (
          SELECT COALESCE(SUM(ll.amount), 0)
          FROM ledger_lines ll
          JOIN accounts a ON ll.account_id = a.id
          WHERE ll.entry_id = me.id AND a.account_type = 'CUSTOMER' AND ll.type = 'credit'
        ) as receipt_amount
      FROM master_entries me
      WHERE me.entry_type IN ('RECEIPT', 'HO_INCOMING') AND me.status = 'POSTED'
    `;
    const receiptParams = [];
    if (dateFrom) {
      receiptSql += ' AND me.date >= ?';
      receiptParams.push(dateFrom);
    }
    if (dateTo) {
      receiptSql += ' AND me.date <= ?';
      receiptParams.push(dateTo);
    }
    receiptSql += ' ORDER BY me.date ASC, me.id ASC';
    const receipts = db.prepare(receiptSql).all(...receiptParams);

    // Apply receipts FIFO to each customer's sales
    for (const receipt of receipts) {
      const custId = receipt.party_account_id || 0;
      if (!customerSalesMap[custId]) continue;

      let remaining = Number(receipt.receipt_amount);
      const sales = customerSalesMap[custId];
      for (let i = 0; i < sales.length && remaining > 0; i++) {
        if (sales[i].outstanding > 0) {
          const applied = Math.min(sales[i].outstanding, remaining);
          sales[i].outstanding -= applied;
          remaining -= applied;
        }
      }
    }

    // Get sales returns in the period
    let returnSql = `
      SELECT COALESCE(SUM(ll.amount), 0.00) as total_returns
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.entry_type = 'SALES_RETURN' AND me.status = 'POSTED' AND a.account_type = 'REVENUE' AND ll.type = 'debit'
    `;
    const returnParams = [];
    if (dateFrom) {
      returnSql += ' AND me.date >= ?';
      returnParams.push(dateFrom);
    }
    if (dateTo) {
      returnSql += ' AND me.date <= ?';
      returnParams.push(dateTo);
    }
    const returnRow = db.prepare(returnSql).get(...returnParams);
    const totalReturns = Number(returnRow?.total_returns || 0);

    // Flatten and compute summary
    const records = [];
    for (const custId in customerSalesMap) {
      records.push(...customerSalesMap[custId]);
    }

    const totalGross = records.reduce((s, r) => s + r.gross_amount, 0);
    const totalCash = records.reduce((s, r) => s + r.cash_received, 0);
    const totalOutstanding = records.reduce((s, r) => s + r.outstanding, 0);
    const totalItems = records.reduce((s, r) => s + Number(r.total_qty), 0);

    return {
      records: records.map(r => ({
        ...r,
        credit_amount: r.outstanding, // Use FIFO-computed outstanding
      })),
      summary: {
        grossSales: Math.round(totalGross * 100) / 100,
        returns: Math.round(totalReturns * 100) / 100,
        netSales: Math.round((totalGross - totalReturns) * 100) / 100,
        cashReceived: Math.round(totalCash * 100) / 100,
        creditSales: Math.round(totalOutstanding * 100) / 100,
        totalItemsSold: totalItems,
      },
    };
  }

  // 7. Authoritative Purchase Report with FIFO Outstanding Calculation
  getPurchaseReport(filters = {}) {
    const db = this.db;
    const { dateFrom, dateTo, supplierId } = filters;

    let sql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.reference_no,
        me.description,
        me.party_account_id,
        (
          SELECT COALESCE(SUM(it.qty), 0)
          FROM inventory_transactions it
          WHERE it.entry_id = me.id AND it.transaction_type = 'PURCHASE'
        ) as total_qty,
        (
          SELECT a.title
          FROM accounts a
          WHERE a.id = me.party_account_id
          LIMIT 1
        ) as supplier_name,
        (
          SELECT COALESCE(SUM(ll.amount), 0)
          FROM ledger_lines ll
          JOIN accounts a ON ll.account_id = a.id
          WHERE ll.entry_id = me.id AND a.account_type = 'PURCHASES' AND ll.type = 'debit'
        ) as gross_amount,
        (
          SELECT COALESCE(SUM(ll.amount), 0)
          FROM ledger_lines ll
          JOIN accounts a ON ll.account_id = a.id
          WHERE ll.entry_id = me.id AND a.account_type IN ('CASH', 'BANK') AND ll.type = 'credit'
        ) as cash_paid
      FROM master_entries me
      WHERE me.entry_type = 'PURCHASE' AND me.status = 'POSTED'
    `;
    const params = [];

    if (dateFrom) {
      sql += ' AND me.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND me.date <= ?';
      params.push(dateTo);
    }
    if (supplierId) {
      sql += ' AND me.party_account_id = ?';
      params.push(parseInt(supplierId, 10));
    }

    sql += ' ORDER BY me.date ASC, me.id ASC';
    const purchaseRecords = db.prepare(sql).all(...params);

    // Build map of supplier ID -> list of open purchases
    const supplierPurchasesMap = {};
    for (const purchase of purchaseRecords) {
      const suppId = purchase.party_account_id || 0;
      if (!supplierPurchasesMap[suppId]) {
        supplierPurchasesMap[suppId] = [];
      }
      supplierPurchasesMap[suppId].push({
        entry_id: purchase.entry_id,
        date: purchase.date,
        reference_no: purchase.reference_no,
        description: purchase.description,
        total_qty: purchase.total_qty,
        supplier_name: purchase.supplier_name,
        gross_amount: Number(purchase.gross_amount),
        cash_paid: Number(purchase.cash_paid),
        outstanding: Number(purchase.gross_amount) - Number(purchase.cash_paid), // initial outstanding
      });
    }

    // Get all POSTED payments/HO_OUTGOING in the period
    let paymentSql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.party_account_id,
        (
          SELECT COALESCE(SUM(ll.amount), 0)
          FROM ledger_lines ll
          JOIN accounts a ON ll.account_id = a.id
          WHERE ll.entry_id = me.id AND a.account_type = 'SUPPLIER' AND ll.type = 'debit'
        ) as payment_amount
      FROM master_entries me
      WHERE me.entry_type IN ('PAYMENT', 'HO_OUTGOING') AND me.status = 'POSTED'
    `;
    const paymentParams = [];
    if (dateFrom) {
      paymentSql += ' AND me.date >= ?';
      paymentParams.push(dateFrom);
    }
    if (dateTo) {
      paymentSql += ' AND me.date <= ?';
      paymentParams.push(dateTo);
    }
    paymentSql += ' ORDER BY me.date ASC, me.id ASC';
    const payments = db.prepare(paymentSql).all(...paymentParams);

    // Apply payments FIFO to each supplier's purchases
    for (const payment of payments) {
      const suppId = payment.party_account_id || 0;
      if (!supplierPurchasesMap[suppId]) continue;

      let remaining = Number(payment.payment_amount);
      const purchases = supplierPurchasesMap[suppId];
      for (let i = 0; i < purchases.length && remaining > 0; i++) {
        if (purchases[i].outstanding > 0) {
          const applied = Math.min(purchases[i].outstanding, remaining);
          purchases[i].outstanding -= applied;
          remaining -= applied;
        }
      }
    }

    // Get purchase returns in the period
    let returnSql = `
      SELECT COALESCE(SUM(ll.amount), 0.00) as total_returns
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.entry_type = 'PURCHASE_RETURN' AND me.status = 'POSTED' AND a.account_type = 'PURCHASES' AND ll.type = 'credit'
    `;
    const returnParams = [];
    if (dateFrom) {
      returnSql += ' AND me.date >= ?';
      returnParams.push(dateFrom);
    }
    if (dateTo) {
      returnSql += ' AND me.date <= ?';
      returnParams.push(dateTo);
    }
    const returnRow = db.prepare(returnSql).get(...returnParams);
    const totalReturns = Number(returnRow?.total_returns || 0);

    // Flatten and compute summary
    const records = [];
    for (const suppId in supplierPurchasesMap) {
      records.push(...supplierPurchasesMap[suppId]);
    }

    const totalGross = records.reduce((s, r) => s + r.gross_amount, 0);
    const totalCash = records.reduce((s, r) => s + r.cash_paid, 0);
    const totalOutstanding = records.reduce((s, r) => s + r.outstanding, 0);
    const totalItems = records.reduce((s, r) => s + Number(r.total_qty), 0);

    return {
      records: records.map(r => ({
        ...r,
        credit_payable: r.outstanding, // Use FIFO-computed outstanding
      })),
      summary: {
        grossPurchases: Math.round(totalGross * 100) / 100,
        returns: Math.round(totalReturns * 100) / 100,
        netPurchases: Math.round((totalGross - totalReturns) * 100) / 100,
        cashPaid: Math.round(totalCash * 100) / 100,
        creditPayable: Math.round(totalOutstanding * 100) / 100,
        totalItemsPurchased: totalItems,
      },
    };
  }

  // 8. Sales Return & Purchase Return Reports
  getReturnReport(type, filters = {}) {
    const db = this.db;
    const { dateFrom, dateTo } = filters;
    const isSales = type === 'SALES_RETURN';

    let sql = `
      SELECT 
        me.id as entry_id,
        me.date,
        me.reference_no,
        me.description,
        it.item_id,
        i.name as item_name,
        i.code as item_code,
        it.qty,
        it.unit_price,
        it.total_price,
        it.cost_price,
        (
          SELECT a.title 
          FROM accounts a 
          WHERE a.id = me.party_account_id
          LIMIT 1
        ) as party_name
      FROM master_entries me
      JOIN inventory_transactions it ON me.id = it.entry_id
      JOIN items i ON it.item_id = i.id
      WHERE me.entry_type = ? AND me.status = 'POSTED'
    `;
    const params = [isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN'];

    if (dateFrom) {
      sql += ' AND me.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND me.date <= ?';
      params.push(dateTo);
    }

    sql += ' ORDER BY me.date DESC, me.id DESC';
    const records = db.prepare(sql).all(...params);
    const totalAmount = records.reduce((s, r) => s + Number(r.total_price), 0);
    const totalQty = records.reduce((s, r) => s + Number(r.qty), 0);

    return {
      records,
      summary: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalQty,
      },
    };
  }

  // 9. Synchronized Profit & Loss Statement (Strict Invariant Guarantee)
  getProfitLossStatement(dateFrom = null, dateTo = null) {
    const db = this.db;

    // 1. Gross Sales: Credit lines to REVENUE accounts from SALE
    let salesSql = `
      SELECT COALESCE(SUM(ll.amount), 0.00) as gross_sales
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.entry_type = 'SALE' AND me.status = 'POSTED' AND a.account_type = 'REVENUE' AND ll.type = 'credit'
    `;
    const salesParams = [];
    if (dateFrom) {
      salesSql += ' AND me.date >= ?';
      salesParams.push(dateFrom);
    }
    if (dateTo) {
      salesSql += ' AND me.date <= ?';
      salesParams.push(dateTo);
    }
    const grossSales = Number(db.prepare(salesSql).get(...salesParams)?.gross_sales || 0);

    // 2. Sales Returns: Debit lines to REVENUE accounts from SALES_RETURN
    let returnSql = `
      SELECT ABS(COALESCE(SUM(ll.amount), 0.00)) as sales_returns
      FROM master_entries me
      JOIN ledger_lines ll ON me.id = ll.entry_id
      JOIN accounts a ON ll.account_id = a.id
      WHERE me.entry_type = 'SALES_RETURN' AND me.status = 'POSTED' AND a.account_type = 'REVENUE' AND ll.type = 'debit'
    `;
    const returnParams = [];
    if (dateFrom) {
      returnSql += ' AND me.date >= ?';
      returnParams.push(dateFrom);
    }
    if (dateTo) {
      returnSql += ' AND me.date <= ?';
      returnParams.push(dateTo);
    }
    const salesReturns = Number(db.prepare(returnSql).get(...returnParams)?.sales_returns || 0);
    const netSales = Math.round((grossSales - salesReturns) * 100) / 100;

    // 3. COGS Calculation via Authoritative Inventory Transactions
    // COGS = (Authoritative cost of items sold) - (Authoritative cost of items returned by customer)
    let cogsSoldSql = `
      SELECT COALESCE(SUM(it.total_cost), 0.00) as cogs_sold
      FROM master_entries me
      JOIN inventory_transactions it ON me.id = it.entry_id
      WHERE me.entry_type = 'SALE' AND me.status = 'POSTED' AND it.transaction_type = 'SALE'
    `;
    const cogsSoldParams = [];
    if (dateFrom) {
      cogsSoldSql += ' AND me.date >= ?';
      cogsSoldParams.push(dateFrom);
    }
    if (dateTo) {
      cogsSoldSql += ' AND me.date <= ?';
      cogsSoldParams.push(dateTo);
    }
    const cogsSold = Number(db.prepare(cogsSoldSql).get(...cogsSoldParams)?.cogs_sold || 0);

    let cogsReturnSql = `
      SELECT ABS(COALESCE(SUM(it.total_cost), 0.00)) as cogs_returned
      FROM master_entries me
      JOIN inventory_transactions it ON me.id = it.entry_id
      WHERE me.entry_type = 'SALES_RETURN' AND me.status = 'POSTED' AND it.transaction_type = 'SALES_RETURN'
    `;
    const cogsReturnParams = [];
    if (dateFrom) {
      cogsReturnSql += ' AND me.date >= ?';
      cogsReturnParams.push(dateFrom);
    }
    if (dateTo) {
      cogsReturnSql += ' AND me.date <= ?';
      cogsReturnParams.push(dateTo);
    }
    const cogsReturned = Number(db.prepare(cogsReturnSql).get(...cogsReturnParams)?.cogs_returned || 0);
    const cogs = Math.round((cogsSold - cogsReturned) * 100) / 100;

    const grossProfit = Math.round((netSales - cogs) * 100) / 100;

    // 4. Operating Expenses: Net debits to EXPENSE accounts
    let expenseSql = `
      SELECT 
        a.id,
        a.code,
        a.title,
        COALESCE(SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END), 0) as net_expense
      FROM accounts a
      JOIN ledger_lines ll ON a.id = ll.account_id
      JOIN master_entries me ON ll.entry_id = me.id
      WHERE a.account_type = 'EXPENSE' AND me.status = 'POSTED'
    `;
    const expenseParams = [];
    if (dateFrom) {
      expenseSql += ' AND me.date >= ?';
      expenseParams.push(dateFrom);
    }
    if (dateTo) {
      expenseSql += ' AND me.date <= ?';
      expenseParams.push(dateTo);
    }
    expenseSql += ' GROUP BY a.id HAVING net_expense > 0 ORDER BY net_expense DESC';
    const expenseRows = db.prepare(expenseSql).all(...expenseParams);

    const totalExpenses = Math.round(expenseRows.reduce((s, e) => s + Number(e.net_expense), 0) * 100) / 100;
    const netProfit = Math.round((grossProfit - totalExpenses) * 100) / 100;

    // Closing inventory valuation at current snapshot for cross-reconciliation
    const closingValRow = db.prepare(`
      SELECT COALESCE(SUM(ROUND(stock_qty * current_wac, 2)), 0.00) as closing_valuation
      FROM items
      WHERE status = 'Active' AND stock_qty > 0
    `).get();
    const closingStockValuation = Number(closingValRow?.closing_valuation || 0);

    return {
      revenue: {
        grossSales: Math.round(grossSales * 100) / 100,
        salesReturns: Math.round(salesReturns * 100) / 100,
        netSales,
      },
      costOfGoodsSold: {
        cogsSold: Math.round(cogsSold * 100) / 100,
        cogsReturned: Math.round(cogsReturned * 100) / 100,
        cogs,
      },
      grossProfit,
      operatingExpenses: {
        items: expenseRows.map((e) => ({
          id: e.id,
          code: e.code,
          title: e.title,
          amount: Math.round(Number(e.net_expense) * 100) / 100,
        })),
        totalExpenses,
      },
      netProfit,
      closingStockValuation: Math.round(closingStockValuation * 100) / 100,
    };
  }

  // 10. Authoritative Stock Valuation & Item Status
  getStockValuationReport(search = '', category = '') {
    const db = this.db;
    let sql = `
      SELECT 
        i.id,
        i.code,
        i.name,
        i.barcode,
        i.category,
        i.stock_qty,
        i.current_wac,
        i.purchase_price,
        i.unit_price as sale_price,
        ROUND(i.stock_qty * i.current_wac, 2) as stock_valuation,
        i.min_stock,
        i.status,
        a.title as supplier_name
      FROM items i
      LEFT JOIN accounts a ON i.supplier_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (i.code LIKE ? OR i.name LIKE ? OR i.barcode LIKE ?)';
      params.push(term, term, term);
    }

    if (category && category !== 'ALL') {
      sql += ' AND i.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY i.name ASC';
    const items = db.prepare(sql).all(...params);

    const totalValuation = items.reduce((sum, item) => sum + (Number(item.stock_valuation) || 0), 0);
    const totalQty = items.reduce((sum, item) => sum + (Number(item.stock_qty) || 0), 0);
    const lowStockCount = items.filter((item) => item.stock_qty <= item.min_stock && item.stock_qty > 0).length;
    const outOfStockCount = items.filter((item) => item.stock_qty <= 0).length;

    return {
      items,
      summary: {
        totalValuation: Math.round(totalValuation * 100) / 100,
        totalQty,
        totalCount: items.length,
        lowStockCount,
        outOfStockCount,
      },
    };
  }

  // 11. Authoritative Stock Analytics
  getStockAnalytics() {
    const db = this.db;

    // Valuation by category
    const categoryRows = db.prepare(`
      SELECT 
        category,
        COUNT(id) as item_count,
        COALESCE(SUM(stock_qty), 0) as total_qty,
        COALESCE(SUM(ROUND(stock_qty * current_wac, 2)), 0.00) as total_value
      FROM items
      WHERE status = 'Active'
      GROUP BY category
      ORDER BY total_value DESC
    `).all();

    // Fast moving items (based on sales volume)
    const fastMoving = db.prepare(`
      SELECT 
        i.id,
        i.code,
        i.name,
        i.category,
        i.current_wac,
        COALESCE(SUM(it.qty), 0) as sold_qty,
        COALESCE(SUM(it.total_price), 0.00) as revenue
      FROM items i
      JOIN inventory_transactions it ON i.id = it.item_id
      JOIN master_entries me ON it.entry_id = me.id
      WHERE it.transaction_type = 'SALE' AND me.status = 'POSTED'
      GROUP BY i.id
      ORDER BY sold_qty DESC
      LIMIT 6
    `).all();

    // Critical low stock items
    const lowStockItems = db.prepare(`
      SELECT id, code, name, category, stock_qty, min_stock, current_wac
      FROM items
      WHERE status = 'Active' AND stock_qty <= min_stock
      ORDER BY stock_qty ASC
      LIMIT 10
    `).all();

    return {
      categoryValuation: categoryRows.map((c) => ({
        ...c,
        total_value: Math.round(Number(c.total_value) * 100) / 100,
      })),
      fastMovingItems: fastMoving.map((m) => ({
        ...m,
        revenue: Math.round(Number(m.revenue) * 100) / 100,
      })),
      lowStockItems,
    };
  }
}

module.exports = new ReportRepository();
