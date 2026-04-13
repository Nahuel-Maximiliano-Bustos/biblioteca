const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_PATH = path.resolve(process.env.DB_PATH || './src/db/biblioteca.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db;

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  // Conexión Remota a Turso
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log("Conexión remota a Turso establecida.");
} else {
  // Conexión Local usando libsql client compatible (SQLite)
  db = createClient({
    url: `file:${DB_PATH}`,
  });
  console.log("Conexión local a SQLite (vía libsql) establecida.");
}

async function initDb() {
  await db.execute('PRAGMA foreign_keys = ON');

  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  try { await db.execute(`ALTER TABLE users ADD COLUMN banned_until TEXT`); } catch (e) {}

  await db.execute(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT NOT NULL,
    isbn TEXT UNIQUE, category TEXT NOT NULL, description TEXT, cover_url TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1, available_copies INTEGER NOT NULL DEFAULT 1,
    location TEXT, tags TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  await db.execute(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
    book_id INTEGER NOT NULL REFERENCES books(id),
    status TEXT NOT NULL DEFAULT 'reserved', reserved_at TEXT NOT NULL DEFAULT (datetime('now')),
    pickup_deadline TEXT, picked_up_at TEXT, due_date TEXT, returned_at TEXT,
    admin_notes TEXT, qr_token TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  await db.execute(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0, category TEXT DEFAULT 'General', is_archived INTEGER NOT NULL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  try { await db.execute(`ALTER TABLE messages ADD COLUMN category TEXT DEFAULT 'General'`); } catch(e){}
  try { await db.execute(`ALTER TABLE messages ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`); } catch(e){}
  try { await db.execute(`ALTER TABLE messages ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`); } catch(e){}

  await db.execute(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0, loan_id INTEGER REFERENCES loans(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  await db.execute(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL, details TEXT, ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  await db.execute(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT NOT NULL, email TEXT NOT NULL, 
    subject TEXT NOT NULL, message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  return dbWrapper;
}

const dbWrapper = {
  prepare(sql) {
    return {
      async run(...params) {
        try {
          const p = params.flat();
          const res = await db.execute({ sql, args: p });
          // Turso returns lastInsertRowid as BigInt or undefined
          let lastId = res.lastInsertRowid;
          if (typeof lastId === 'bigint') lastId = Number(lastId);
          return { lastInsertRowid: lastId || null, changes: res.rowsAffected || 0 };
        } catch (err) {
          console.error(`DB Run Error [${sql}]:`, err.message);
          throw err;
        }
      },
      async get(...params) {
        try {
          const p = params.flat();
          const res = await db.execute({ sql, args: p });
          if (!res.rows || res.rows.length === 0) return undefined;
          
          // Convert any BigInt in the row to Number for JSON compatibility
          const row = res.rows[0];
          for (const key in row) {
            if (typeof row[key] === 'bigint') row[key] = Number(row[key]);
          }
          return row;
        } catch (err) {
          console.error(`DB Get Error [${sql}]:`, err.message);
          throw err;
        }
      },
      async all(...params) {
        try {
          const p = params.flat();
          const res = await db.execute({ sql, args: p });
          
          return res.rows.map(row => {
            for (const key in row) {
              if (typeof row[key] === 'bigint') row[key] = Number(row[key]);
            }
            return row;
          });
        } catch (err) {
          console.error(`DB All Error [${sql}]:`, err.message);
          throw err;
        }
      }
    };
  },
  async run(sql, params = []) {
    return await this.prepare(sql).run(...params);
  },
  async exec(sql) {
    try {
      await db.execute(sql);
    } catch (err) {
      console.error(`DB Exec Error [${sql}]:`, err.message);
      throw err;
    }
  }
};

module.exports = { initDb, db: dbWrapper };
