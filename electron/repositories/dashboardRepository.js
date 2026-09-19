const BaseRepository = require('./baseRepository');
const reportRepository = require('./reportRepository');

class DashboardRepository extends BaseRepository {
  constructor() {
    super('system_settings');
  }

  getDashboardMetrics() {
    return reportRepository.getDashboardMetrics();
  }

  getRecentTransactions() {
    const data = reportRepository.getDashboardMetrics();
    return data.recentTransactions || [];
  }

  getGeneralLedgerSummary() {
    // Return key real-time account balances from SQLite Chart of Accounts
    return this.db.prepare(`
      SELECT 
        a.code, 
        a.title, 
        a.account_type as category, 
        ROUND(
          (CASE WHEN a.opening_balance_type = 'Dr' THEN a.opening_balance ELSE -a.opening_balance END) +
          COALESCE(SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END), 0),
          2
        ) as balance,
        'Debit' as type
      FROM accounts a
      LEFT JOIN ledger_lines ll ON a.id = ll.account_id
      LEFT JOIN master_entries me ON ll.entry_id = me.id AND me.status = 'POSTED'
      WHERE a.account_type IN ('CASH', 'BANK', 'CAPITAL', 'SUPPLIER')
      GROUP BY a.id
      ORDER BY a.code ASC
      LIMIT 6
    `).all();
  }
}

module.exports = new DashboardRepository();
