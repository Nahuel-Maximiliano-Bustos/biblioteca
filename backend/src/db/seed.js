require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDb, db } = require('./database');

async function seed() {
  await initDb();
  console.log('🌱 Seeding database...');

  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const userHash = await bcrypt.hash('User1234!', 12);
  const user2Hash = await bcrypt.hash('Maria1234!', 12);

  await db.prepare(`INSERT OR IGNORE INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run('Administrador', 'admin', 'admin@biblioteca.com', adminHash, 'admin');
  await db.prepare(`INSERT OR IGNORE INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run('Juan Pérez', 'juanp', 'juan@email.com', userHash, 'user');
  await db.prepare(`INSERT OR IGNORE INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run('María García', 'mariag', 'maria@email.com', user2Hash, 'user');

  const books = [
    ['Cien Años de Soledad', 'Gabriel García Márquez', '978-0-06-088328-7', 'Literatura Latinoamericana', 'La historia de la familia Buendía a lo largo de siete generaciones en el pueblo mítico de Macondo.', 3, 3, 'Estante A-1', 'realismo magico,colombia,clasico'],
    ['El Principito', 'Antoine de Saint-Exupéry', '978-0-15-601219-5', 'Novela', 'Un clásico de la literatura universal que narra las aventuras de un pequeño príncipe que viaja por el universo.', 2, 2, 'Estante A-2', 'infantil,filosofia,clasico'],
    ['Don Quijote de la Mancha', 'Miguel de Cervantes', '978-84-663-2250-0', 'Literatura Clásica', 'La primera novela moderna de la literatura occidental.', 2, 2, 'Estante B-1', 'clasico,espanol,aventura'],
    ['1984', 'George Orwell', '978-0-452-28423-4', 'Distopía', 'Una novela distópica que describe una sociedad totalitaria controlada por el Gran Hermano.', 2, 2, 'Estante C-1', 'distopia,politica,clasico'],
    ['Brave New World', 'Aldous Huxley', '978-0-06-085052-4', 'Distopía', 'Un futuro en que el placer y el control social son los pilares de una civilización estable.', 1, 1, 'Estante C-2', 'distopia,ciencia ficcion,futuro'],
    ['El Señor de los Anillos', 'J.R.R. Tolkien', '978-0-618-64015-7', 'Fantasía', 'La gran epopeya de la Tierra Media y la guerra por el Anillo Único.', 2, 2, 'Estante D-1', 'fantasia,aventura,epico'],
    ['Harry Potter y la Piedra Filosofal', 'J.K. Rowling', '978-0-7475-3269-9', 'Fantasía', 'El inicio de la saga del joven mago Harry Potter y sus aventuras en Hogwarts.', 3, 3, 'Estante D-2', 'fantasia,magia,juvenil'],
    ['El Alquimista', 'Paulo Coelho', '978-0-06-112241-5', 'Autoayuda', 'La historia de Santiago, un joven pastor andaluz en busca de su leyenda personal.', 2, 2, 'Estante E-1', 'autoayuda,filosofia,viaje'],
    ['La Sombra del Viento', 'Carlos Ruiz Zafón', '978-84-08-04163-2', 'Novela', 'Un joven descubre un misterioso libro en el cementerio de los libros olvidados de Barcelona.', 2, 2, 'Estante E-2', 'misterio,barcelona,historica'],
    ['Sapiens: De animales a dioses', 'Yuval Noah Harari', '978-0-06-231609-7', 'Historia', 'Una breve historia de la humanidad que estudia cómo Homo sapiens llegó a dominar el mundo.', 2, 2, 'Estante F-1', 'historia,ciencia,humanidad'],
    ['El Código Da Vinci', 'Dan Brown', '978-0-385-51375-5', 'Thriller', 'Un thriller simbólico y de conspiración por los mayores museos europeos.', 2, 2, 'Estante G-1', 'thriller,misterio,arte'],
    ['To Kill a Mockingbird', 'Harper Lee', '978-0-06-112008-4', 'Literatura Clásica', 'Atticus Finch y su lucha contra la injusticia racial en el sur de Estados Unidos.', 1, 1, 'Estante H-1', 'clasico,derecho,racial'],
  ];

  for (const book of books) {
    await db.prepare(`
      INSERT OR IGNORE INTO books (title, author, isbn, category, description, total_copies, available_copies, location, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...book);
  }

  // Sample reservation for Juan
  const juan = await db.prepare('SELECT id FROM users WHERE username = ?').get('juanp');
  const book1 = await db.prepare('SELECT id FROM books WHERE isbn = ?').get('978-0-06-088328-7');
  if (juan && book1) {
    const existing = await db.prepare('SELECT id FROM loans WHERE user_id = ? AND book_id = ?').get(juan.id, book1.id);
    if (!existing) {
      const { v4: uuidv4 } = require('uuid');
      await db.prepare(`
        INSERT INTO loans (user_id, book_id, status, pickup_deadline, qr_token)
        VALUES (?, ?, 'reserved', datetime('now', '+3 days'), ?)
      `).run(juan.id, book1.id, uuidv4());
      await db.prepare(`UPDATE books SET available_copies = available_copies - 1 WHERE id = ?`).run(book1.id);
    }
  }

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📋 Credentials:');
  console.log('  Admin → email: admin@biblioteca.com  | password: Admin1234!');
  console.log('  User  → email: juan@email.com        | password: User1234!');
  console.log('  User  → email: maria@email.com       | password: Maria1234!');
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
