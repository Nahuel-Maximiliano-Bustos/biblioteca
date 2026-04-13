const { createClient } = require('@libsql/client');
require('dotenv').config();

async function run() {
  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    console.log('🚀 Starting inventory recalibration...');
    const books = await db.execute('SELECT id, title, total_copies FROM books');
    let fixed = 0;

    for (const book of books.rows) {
      // Count active loans (reserved, active, overdue)
      const res = await db.execute({
        sql: "SELECT COUNT(*) as count FROM loans WHERE book_id = ? AND status IN ('reserved', 'active', 'overdue')",
        args: [book.id]
      });
      
      const count = Number(res.rows[0].count);
      const total = Number(book.total_copies);
      const newAvailable = Math.max(0, total - count);
      
      console.log(`- Updating "${book.title}": Total=${total}, Active=${count} -> New Available=${newAvailable}`);
      
      await db.execute({
        sql: 'UPDATE books SET available_copies = ? WHERE id = ?',
        args: [newAvailable, book.id]
      });
      fixed++;
    }

    console.log(`✅ Recalibration complete. ${fixed} books updated.`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error during recalibration:', e);
    process.exit(1);
  }
}

run();
