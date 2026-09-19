const reportRepository = require('../repositories/reportRepository');

class ReportService {
  getDashboardOverview() {
    return reportRepository.getDashboardMetrics();
  }

  getGeneralLedger(filters = {}) {
    return reportRepository.getGeneralLedger(filters);
  }

  getCustomerLedger(customerId, dateFrom, dateTo) {
    if (!customerId) {
      throw new Error('Customer ID is required for Customer Ledger');
    }
    return reportRepository.getCustomerLedger(customerId, dateFrom, dateTo);
  }

  getSupplierLedger(supplierId, dateFrom, dateTo) {
    if (!supplierId) {
      throw new Error('Supplier ID is required for Supplier Ledger');
    }
    return reportRepository.getSupplierLedger(supplierId, dateFrom, dateTo);
  }

  getAccountStatement(accountId, dateFrom, dateTo) {
    if (!accountId) {
      throw new Error('Account ID is required for Account Statement');
    }
    return reportRepository.getAccountStatement(accountId, dateFrom, dateTo);
  }

  getSalesReport(filters = {}) {
    return reportRepository.getSalesReport(filters);
  }

  getPurchaseReport(filters = {}) {
    return reportRepository.getPurchaseReport(filters);
  }

  getSalesReturnReport(filters = {}) {
    return reportRepository.getReturnReport('SALES_RETURN', filters);
  }

  getPurchaseReturnReport(filters = {}) {
    return reportRepository.getReturnReport('PURCHASE_RETURN', filters);
  }

  getProfitLoss(dateFrom, dateTo) {
    return reportRepository.getProfitLossStatement(dateFrom, dateTo);
  }

  getStockValuation(search = '', category = '') {
    return reportRepository.getStockValuationReport(search, category);
  }

  getStockAnalytics() {
    return reportRepository.getStockAnalytics();
  }
}

module.exports = new ReportService();
