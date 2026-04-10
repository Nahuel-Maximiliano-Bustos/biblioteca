const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_PATH = path.resolve(process.env.DB_PATH || './src/db/biblioteca.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let _db = null;

function saveDb() {
  if (!_db) return;
  try { fs.writeFileSync(DB_PATH, Buffer.from(_db.export())); } catch {}
}

process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(0); });
process.on('SIGUSR1', () => { saveDb(); process.exit(0); });
process.on('SIGUSR2', () => { saveDb(); process.exit(0); });
setInterval(saveDb, 5000).unref();

function getLastId() {
  const r = _db.exec('SELECT last_insert_rowid()');
  return r.length ? r[0].values[0][0] : null;
}

function rowsFromResult(result) {
  if (!result.length) return [];
  return result[0].values.map(row => {
    const obj = {};
    result[0].columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// prepared statement helper using sql.js native bind
function stmtRun(sql, params = []) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  const id = getLastId();
  saveDb();
  return { lastInsertRowid: id };
}

function stmtGet(sql, params = []) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  let row = undefined;
  if (stmt.step()) {
    const obj = {};
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    cols.forEach((c, i) => { obj[c] = vals[i]; });
    row = obj;
  }
  stmt.free();
  return row;
}

function stmtAll(sql, params = []) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    const obj = {};
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    cols.forEach((c, i) => { obj[c] = vals[i]; });
    rows.push(obj);
  }
  stmt.free();
  return rows;
}

// better-sqlite3-compatible synchronous API
const db = {
  prepare(sql) {
    return {
      run(...params) {
        const p = params.flat();
        return stmtRun(sql, p);
      },
      get(...params) {
        const p = params.flat();
        return stmtGet(sql, p);
      },
      all(...params) {
        const p = params.flat();
        return stmtAll(sql, p);
      },
    };
  },
  run(sql, params = []) { return stmtRun(sql, params); },
  exec(sql) { _db.run(sql); saveDb(); },
  pragma(p) { _db.run(`PRAGMA ${p}`); },
};

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA foreign_keys = ON');

  _db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  try {
    _db.run(`ALTER TABLE users ADD COLUMN banned_until TEXT`);
  } catch (e) {
    // Column might already exist
  }

  _db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT NOT NULL,
    isbn TEXT UNIQUE, category TEXT NOT NULL, description TEXT, cover_url TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1, available_copies INTEGER NOT NULL DEFAULT 1,
    location TEXT, tags TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  _db.run(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
    book_id INTEGER NOT NULL REFERENCES books(id),
    status TEXT NOT NULL DEFAULT 'reserved', reserved_at TEXT NOT NULL DEFAULT (datetime('now')),
    pickup_deadline TEXT, picked_up_at TEXT, due_date TEXT, returned_at TEXT,
    admin_notes TEXT, qr_token TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  _db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0, category TEXT DEFAULT 'General', is_archived INTEGER NOT NULL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  try { _db.run(`ALTER TABLE messages ADD COLUMN category TEXT DEFAULT 'General'`); } catch(e){}
  try { _db.run(`ALTER TABLE messages ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`); } catch(e){}
  try { _db.run(`ALTER TABLE messages ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`); } catch(e){}

  _db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0, loan_id INTEGER REFERENCES loans(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  _db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL, details TEXT, ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  _db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT NOT NULL, email TEXT NOT NULL, 
    subject TEXT NOT NULL, message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  saveDb();
  return db;
}

module.exports = { initDb, db };
