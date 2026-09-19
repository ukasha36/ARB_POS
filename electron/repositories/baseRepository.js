const { getDb } = require('../database');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  get db() {
    return getDb();
  }

  findById(id) {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    return stmt.get(id);
  }

  findAll() {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName}`);
    return stmt.all();
  }

  runTransaction(fn) {
    const transaction = this.db.transaction(fn);
    return transaction();
  }
}

module.exports = BaseRepository;
