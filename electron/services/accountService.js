const accountRepository = require('../repositories/accountRepository');

function sanitizeFk(val) {
  if (val === null || val === undefined || val === '' || val === '0' || val === 0) return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}

const FK_FIELDS = ['area_id', 'sub_area_id', 'note_head_id', 'salesman_id', 'booker_id', 'item_category_id', 'category_id'];

class AccountService {
  getAccounts(filters) {
    return accountRepository.findAll(filters);
  }

  getAccountsWithBalances(accountType) {
    return accountRepository.listWithBalances(accountType);
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

    const sanitizedData = { ...data };
    for (const field of FK_FIELDS) {
      if (sanitizedData[field] !== undefined) {
        sanitizedData[field] = sanitizeFk(sanitizedData[field]);
      }
    }

    return accountRepository.saveAccount(sanitizedData);
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
