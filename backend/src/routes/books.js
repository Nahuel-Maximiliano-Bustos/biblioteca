const express = require('express');
const { db } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');


const router = express.Router();
const LOAN_DAYS = 14; // 2 weeks default loan period
const PICKUP_DEADLINE_DAYS = 3; // 3 days to pick up after reservation

// GET /api/books — list with search, filter, pagination
router.get('/', (req, res) => {
  const { q, category, status, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = '1=1';
  const params = [];

  if (q) {
    where += ' AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(tags) LIKE ?)';
    const term = `%${q.toLowerCase()}%`;
    params.push(term, term, term);
  }

  if (category && category !== 'all') {
    where += ' AND LOWER(category) = ?';
    params.push(category.toLowerCase());
  }

  if (status === 'available') {
    where += ' AND available_copies > 0';
  } else if (status === 'unavailable') {
    where += ' AND available_copies = 0';
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM books WHERE ${where}`).get(...params).count;
  const books = db.prepare(`SELECT * FROM books WHERE ${where} ORDER BY title LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);

  res.json({ books, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/books/categories
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM books ORDER BY category').all().map(r => r.category);
  res.json({ categories });
});

// GET /api/books/:id
router.get('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Libro no encontrado' });
  res.json({ book });
});

// POST /api/books — admin only
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { title, author, isbn, category, description, cover_url, total_copies = 1, location, tags } = req.body;
  if (!title || !author || !category) return res.status(400).json({ error: 'Título, autor y categoría son requeridos' });

  try {
    const result = db.prepare(`
      INSERT INTO books (title, author, isbn, category, description, cover_url, total_copies, available_copies, location, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, author, isbn || null, category, description || null, cover_url || null, total_copies, total_copies, location || null, tags || null);

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'book_create', ?)`).run(req.user.id, `Libro creado: ${title}`);
    res.status(201).json({ book });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'ISBN ya registrado' });
    res.status(500).json({ error: 'Error al crear libro' });
  }
});

// PUT /api/books/:id — admin only
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Libro no encontrado' });

  const { title, author, isbn, category, description, cover_url, total_copies, location, tags } = req.body;

  const newTotal = total_copies !== undefined ? parseInt(total_copies) : book.total_copies;
  const diff = newTotal - book.total_copies;
  const newAvail = Math.max(0, book.available_copies + diff);

  try {
    db.prepare(`
      UPDATE books SET title=?, author=?, isbn=?, category=?, description=?, cover_url=?,
      total_copies=?, available_copies=?, location=?, tags=?, updated_at=datetime('now') WHERE id=?
    `).run(
      title || book.title, author || book.author, isbn !== undefined ? isbn : book.isbn,
      category || book.category, description !== undefined ? description : book.description,
      cover_url !== undefined ? cover_url : book.cover_url,
      newTotal, newAvail, location !== undefined ? location : book.location,
      tags !== undefined ? tags : book.tags, req.params.id
    );
    db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'book_update', ?)`).run(req.user.id, `Libro actualizado: ${req.params.id}`);
    res.json({ book: db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id) });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'ISBN ya registrado' });
    res.status(500).json({ error: 'Error al actualizar libro' });
  }
});

// DELETE /api/books/:id — admin only
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Libro no encontrado' });

  const activeLoans = db.prepare(`SELECT COUNT(*) as c FROM loans WHERE book_id = ? AND status IN ('reserved','active')`).get(req.params.id).c;
  if (activeLoans > 0) return res.status(409).json({ error: 'No se puede eliminar un libro con préstamos activos' });

  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'book_delete', ?)`).run(req.user.id, `Libro eliminado: ${book.title}`);
  res.json({ message: 'Libro eliminado' });
});

module.exports = router;
module.exports.LOAN_DAYS = LOAN_DAYS;
module.exports.PICKUP_DEADLINE_DAYS = PICKUP_DEADLINE_DAYS;
