const accountRepository = require('../repositories/accountRepository');

class AccountService {
  getAccounts(filters) {
    return accountRepository.findAll(filters);
  }

  getAccountById(id) {
    return accountRepository.findById(id);
  }

  getAccountByCode(code) {
    return accountRepository.findByCode(code);
  }

  getNextCode() {
    return accountRepository.getNextCode();
  }

  getQuickNav(currentCode, direction) {
    return accountRepository.getQuickNavRecord(currentCode, direction);
  }

  saveAccount(data) {
    if (!data.code || !data.title || !data.account_type) {
      throw new Error('Account Code, Title, and Type are required fields.');
    }

    // Check code uniqueness for new records
    if (!data.id) {
      const existing = accountRepository.findByCode(data.code.trim());
      if (existing) {
        throw new Error(`Account Code '${data.code}' already exists. Please use a unique code.`);
      }
    }

    return accountRepository.saveAccount(data);
  }

  deleteAccount(id) {
    return accountRepository.deleteOrDeactivate(id);
  }

  getLookups() {
    return accountRepository.getLookups();
  }

  getAccountBalance(id) {
    return accountRepository.getAccountBalance(id);
  }
}

module.exports = new AccountService();
