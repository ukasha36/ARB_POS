const BaseRepository = require('./baseRepository');

class AuthRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  findByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
    return stmt.get(username);
  }

  findById(userId) {
    const stmt = this.db.prepare(
      'SELECT id, username, display_name, role, is_active, created_at, last_login FROM users WHERE id = ?'
    );
    return stmt.get(userId);
  }

  getUserWithPassword(userId) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId);
  }

  findByUsernameExcluding(username, userId) {
    const stmt = this.db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?');
    return stmt.get(username, userId);
  }

  updateProfile(userId, { username, displayName, password, forcePasswordChange = false }) {
    const forceFlag = forcePasswordChange ? 1 : 0;
    if (password) {
      const stmt = this.db.prepare(
        'UPDATE users SET username = ?, display_name = ?, password = ?, force_password_change = ? WHERE id = ?'
      );
      return stmt.run(username, displayName, password, forceFlag, userId);
    } else {
      const stmt = this.db.prepare(
        'UPDATE users SET username = ?, display_name = ?, force_password_change = ? WHERE id = ?'
      );
      return stmt.run(username, displayName, forceFlag, userId);
    }
  }

  updatePassword(userId, hashedPassword) {
    const stmt = this.db.prepare('UPDATE users SET password = ? WHERE id = ?');
    return stmt.run(hashedPassword, userId);
  }

  updateLastLogin(userId) {
    const stmt = this.db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(userId);
  }
}

module.exports = new AuthRepository();
