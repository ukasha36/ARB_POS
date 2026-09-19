const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const fs = require('fs');

const candidates = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'arb-pos-erp', 'arb_pos.db'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'arb-pos-erp', 'database.db'),
  path.join(os.homedir(), 'AppData', 'Local', 'arb-pos-erp', 'arb_pos.db'),
  path.join(__dirname, 'arb_pos.db'),
  path.join(__dirname, 'database.db'),
];

let dbPath = candidates.find(p => fs.existsSync(p));
if (!dbPath) {
  console.log('Could not find DB. Searched:');
  candidates.forEach(p => console.log(' -', p));
  process.exit(1);
}
console.log('Found DB at:', dbPath);

const db = new Database(dbPath);
const user = db.prepare("SELECT id, username, password FROM users WHERE username = 'admin'").get();
if (!user) {
  console.log('No admin user found.');
  db.close();
  process.exit(1);
}

console.log('Current stored password (first 30 chars):', user.password.substring(0, 30));
const isHashed = user.password.startsWith('$2');
console.log('Is bcrypt hash already:', isHashed);

if (isHashed) {
  const ok = bcrypt.compareSync('admin123', user.password);
  console.log('admin123 matches existing hash:', ok);
  if (ok) {
    console.log('No fix needed - password is already correct!');
    db.close();
    process.exit(0);
  }
  console.log('Hash does not match admin123, re-hashing...');
}

const hashed = bcrypt.hashSync('admin123', 10);
db.prepare("UPDATE users SET password = ?, force_password_change = 0 WHERE id = ?").run(hashed, user.id);
const verify = bcrypt.compareSync('admin123', hashed);
console.log('Password reset successfully. Verification check:', verify ? 'PASS' : 'FAIL');
console.log('You can now login with: admin / admin123');
db.close();
