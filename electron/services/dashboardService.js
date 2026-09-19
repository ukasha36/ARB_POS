const dashboardRepository = require('../repositories/dashboardRepository');

class DashboardService {
  getOverview() {
    return {
      metrics: dashboardRepository.getDashboardMetrics(),
      recentTransactions: dashboardRepository.getRecentTransactions(),
      generalLedger: dashboardRepository.getGeneralLedgerSummary(),
    };
  }
}

module.exports = new DashboardService();
