const express = require('express');
const { db } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');


const router = express.Router();
const LOAN_DAYS = 14;
const PICKUP_DEADLINE_DAYS = 3;

// GET /api/loans/my — user's own loans
router.get('/my', authenticateToken, (req, res) => {
  const loans = db.prepare(`
    SELECT l.*, b.title as book_title, b.author as book_author, b.category as book_category, b.cover_url
    FROM loans l JOIN books b ON l.book_id = b.id
    WHERE l.user_id = ?
    ORDER BY l.created_at DESC
  `).all(req.user.id);
  res.json({ loans });
});

// GET /api/loans — admin: all loans with full info
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  const params = [];
  if (status && status !== 'all') { where += ' AND l.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM loans l WHERE ${where}`).get(...params).c;
  const loans = db.prepare(`
    SELECT l.*, b.title as book_title, b.author as book_author, b.cover_url,
           u.full_name as user_name, u.email as user_email, u.username
    FROM loans l JOIN books b ON l.book_id = b.id JOIN users u ON l.user_id = u.id
    WHERE ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ loans, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/loans/:id
router.get('/:id', authenticateToken, (req, res) => {
  const loan = db.prepare(`
    SELECT l.*, b.title as book_title, b.author as book_author, b.cover_url, b.location,
           u.full_name as user_name, u.email as user_email
    FROM loans l JOIN books b ON l.book_id = b.id JOIN users u ON l.user_id = u.id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
  if (req.user.role !== 'admin' && loan.user_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' });
  res.json({ loan });
});

// POST /api/loans — reserve a book
router.post('/', authenticateToken, (req, res) => {
  const { book_id } = req.body;
  if (!book_id) return res.status(400).json({ error: 'book_id es requerido' });

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Libro no encontrado' });
  if (book.available_copies <= 0) return res.status(409).json({ error: 'No hay ejemplares disponibles' });

  const activeUserLoan = db.prepare(`SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status IN ('reserved','active')`).get(req.user.id, book_id);
  if (activeUserLoan) return res.status(409).json({ error: 'Ya tenés un préstamo activo de este libro' });

  const qrToken = uuidv4();
  const pickupDeadline = new Date(Date.now() + PICKUP_DEADLINE_DAYS * 86400000).toISOString();

  const result = db.prepare(`
    INSERT INTO loans (user_id, book_id, status, pickup_deadline, qr_token)
    VALUES (?, ?, 'reserved', ?, ?)
  `).run(req.user.id, book_id, pickupDeadline, qrToken);

  db.prepare('UPDATE books SET available_copies = available_copies - 1, updated_at = datetime("now") WHERE id = ?').run(book_id);

  // Notification to user
  db.prepare(`INSERT INTO notifications (user_id, type, title, message, loan_id) VALUES (?, ?, ?, ?, ?)`).run(
    req.user.id, 'reservation', '¡Reserva confirmada!',
    `Tu reserva de "${book.title}" fue registrada. Tenés ${PICKUP_DEADLINE_DAYS} días para retirarlo.`,
    result.lastInsertRowid
  );

  // Notification to admins
  const admins = db.prepare('SELECT id FROM users WHERE role = "admin"').all();
  for (const admin of admins) {
    db.prepare(`INSERT INTO notifications (user_id, type, title, message, loan_id) VALUES (?, ?, ?, ?, ?)`).run(
      admin.id, 'new_reservation', 'Nueva reserva',
      `${req.user.full_name} reservó "${book.title}".`, result.lastInsertRowid
    );
  }

  db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'reserve', ?)`).run(req.user.id, `Reserva: libro ${book_id}`);

  const loan = db.prepare(`
    SELECT l.*, b.title as book_title, b.author as book_author FROM loans l JOIN books b ON l.book_id = b.id WHERE l.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json({ loan });
});

// PUT /api/loans/:id/pickup — admin confirms pickup
router.put('/:id/pickup', authenticateToken, requireAdmin, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
  if (loan.status !== 'reserved') return res.status(400).json({ error: `No se puede confirmar retiro en estado: ${loan.status}` });

  const dueDate = new Date(Date.now() + LOAN_DAYS * 86400000).toISOString();
  db.prepare(`
    UPDATE loans SET status='active', picked_up_at=datetime('now'), due_date=?, admin_notes=?, updated_at=datetime('now') WHERE id=?
  `).run(dueDate, req.body.notes || null, req.params.id);

  const book = db.prepare('SELECT title FROM books WHERE id = ?').get(loan.book_id);
  db.prepare(`INSERT INTO notifications (user_id, type, title, message, loan_id) VALUES (?, ?, ?, ?, ?)`).run(
    loan.user_id, 'pickup_confirmed', 'Retiro confirmado',
    `El retiro de "${book.title}" fue confirmado. Fecha de devolución: ${new Date(dueDate).toLocaleDateString('es-AR')}.`,
    loan.id
  );
  db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'pickup_confirm', ?)`).run(req.user.id, `Retiro confirmado: préstamo ${req.params.id}`);

  res.json({ loan: db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id) });
});

// PUT /api/loans/:id/return — admin confirms return
router.put('/:id/return', authenticateToken, requireAdmin, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
  if (!['active', 'overdue'].includes(loan.status)) return res.status(400).json({ error: `No se puede confirmar devolución en estado: ${loan.status}` });

  db.prepare(`
    UPDATE loans SET status='returned', returned_at=datetime('now'), admin_notes=?, updated_at=datetime('now') WHERE id=?
  `).run(req.body.notes || null, req.params.id);
  db.prepare('UPDATE books SET available_copies = available_copies + 1, updated_at = datetime("now") WHERE id = ?').run(loan.book_id);

  const book = db.prepare('SELECT title FROM books WHERE id = ?').get(loan.book_id);
  db.prepare(`INSERT INTO notifications (user_id, type, title, message, loan_id) VALUES (?, ?, ?, ?, ?)`).run(
    loan.user_id, 'returned', 'Devolución registrada',
    `La devolución de "${book.title}" fue registrada. ¡Gracias!`, loan.id
  );
  db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'return_confirm', ?)`).run(req.user.id, `Devolución: préstamo ${req.params.id}`);

  res.json({ loan: db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id) });
});

// PUT /api/loans/:id/renew — admin extends due_date by 14 days
router.put('/:id/renew', authenticateToken, requireAdmin, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
  if (!['active', 'overdue'].includes(loan.status)) return res.status(400).json({ error: `No se puede renovar en estado: ${loan.status}` });

  const currentDueDate = new Date(loan.due_date || Date.now());
  const newDueDate = new Date(currentDueDate.getTime() + LOAN_DAYS * 86400000).toISOString();
  // If it was overdue, it becomes active again
  db.prepare(`UPDATE loans SET due_date = ?, status = 'active', updated_at = datetime('now') WHERE id = ?`).run(newDueDate, req.params.id);

  const book = db.prepare('SELECT title FROM books WHERE id = ?').get(loan.book_id);
  db.prepare(`INSERT INTO notifications (user_id, type, title, message, loan_id) VALUES (?, ?, ?, ?, ?)`).run(
    loan.user_id, 'pickup_confirmed', 'Préstamo renovado',
    `Tu préstamo de "${book.title}" ha sido renovado. Nueva fecha de devolución: ${new Date(newDueDate).toLocaleDateString('es-AR')}.`, loan.id
  );
  db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'renew', ?)`).run(req.user.id, `Renovación: préstamo ${req.params.id}`);

  res.json({ loan: db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id) });
});

// PUT /api/loans/:id/overdue — admin marks as overdue
router.put('/:id/overdue', authenticateToken, requireAdmin, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
  if (loan.status !== 'active') return res.status(400).json({ error: 'Solo préstamos activos pueden marcarse como atrasados' });

  db.prepare(`UPDATE loans SET status='overdue', updated_at=datetime('now') WHERE id=?`).run(req.params.id);

  const book = db.prepare('SELECT title FROM books WHERE id = ?').get(loan.book_id);
  db.prepare(`INSERT INTO notifications (user_id, type, title, message, loan_id) VALUES (?, ?, ?, ?, ?)`).run(
    loan.user_id, 'overdue', '⚠️ Préstamo vencido',
    `Tu préstamo de "${book.title}" está vencido. Por favor devolvelo a la brevedad.`, loan.id
  );
  res.json({ loan: db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id) });
});

// PUT /api/loans/:id/cancel — user cancels reservation
router.put('/:id/cancel', authenticateToken, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
  if (req.user.role !== 'admin' && loan.user_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' });
  if (loan.status !== 'reserved') return res.status(400).json({ error: 'Solo reservas pueden cancelarse' });

  db.prepare(`UPDATE loans SET status='cancelled', updated_at=datetime('now') WHERE id=?`).run(req.params.id);
  db.prepare('UPDATE books SET available_copies = available_copies + 1, updated_at = datetime("now") WHERE id = ?').run(loan.book_id);
  res.json({ message: 'Reserva cancelada', loan: db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id) });
});

// DELETE /api/loans/clear-inactive — bulk delete old loans
router.delete('/clear-inactive', authenticateToken, requireAdmin, (req, res) => {
  const result = db.prepare(`DELETE FROM loans WHERE status IN ('returned', 'cancelled')`).run();
  res.json({ message: `Historial organizado: ${result.changes} préstamos inactivos limpiados` });
});

// DELETE /api/loans/:id — admin completely deletes a loan
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
  db.prepare('DELETE FROM loans WHERE id = ?').run(req.params.id);
  res.json({ message: 'Préstamo eliminado permanentemente' });
});

// Stats for admin dashboard
router.get('/stats/summary', authenticateToken, requireAdmin, (req, res) => {
  const stats = {
    totalBooks: db.prepare('SELECT COUNT(*) as c FROM books').get().c,
    availableBooks: db.prepare('SELECT SUM(available_copies) as c FROM books').get().c || 0,
    activeLoans: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status IN ('active')").get().c,
    overdueLoans: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'overdue'").get().c,
    pendingPickups: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'reserved'").get().c,
    totalUsers: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'user'").get().c,
    activeUsers: db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM loans WHERE status IN ('active','overdue')").get().c,
  };
  res.json({ stats });
});

// POST /api/loans/scan — admin scans QR token 
router.post('/scan', authenticateToken, requireAdmin, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token QR requerido' });

  const loan = db.prepare(`SELECT * FROM loans WHERE qr_token = ?`).get(token);
  if (!loan) return res.status(404).json({ error: 'Token inválido o expirado' });

  if (loan.status === 'reserved') {
    // Deliver the book (pickup)
    const dueDate = new Date(Date.now() + LOAN_DAYS * 86400000).toISOString();
    db.prepare(`UPDATE loans SET status='active', picked_up_at=datetime('now'), due_date=?, updated_at=datetime('now') WHERE id=?`).run(dueDate, loan.id);
    
    const book = db.prepare('SELECT title FROM books WHERE id = ?').get(loan.book_id);
    db.prepare(`INSERT INTO notifications (user_id, type, title, message, loan_id) VALUES (?, ?, ?, ?, ?)`).run(
      loan.user_id, 'pickup_confirmed', 'Retiro confirmado',
      `El retiro de "${book.title}" fue confirmado en mostrador.`, loan.id
    );
    
    // Provide complete loan obj for frontend scanner
    const updatedLoan = db.prepare(`SELECT l.*, b.title as book_title, u.full_name as user_name FROM loans l JOIN books b ON l.book_id = b.id JOIN users u ON l.user_id = u.id WHERE l.id = ?`).get(loan.id);
    return res.json({ message: 'Libro entregado exitosamente', loan: updatedLoan });
  } 
  else if (loan.status === 'active' || loan.status === 'overdue') {
    // Return the book
    db.prepare(`UPDATE loans SET status='returned', returned_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(loan.id);
    db.prepare('UPDATE books SET available_copies = available_copies + 1, updated_at = datetime("now") WHERE id = ?').run(loan.book_id);
    
    const book = db.prepare('SELECT title FROM books WHERE id = ?').get(loan.book_id);
    db.prepare(`INSERT INTO notifications (user_id, type, title, message, loan_id) VALUES (?, ?, ?, ?, ?)`).run(
      loan.user_id, 'returned', 'Devolución registrada',
      `La devolución de "${book.title}" fue registrada exitosamente por escáner.`, loan.id
    );
    
    const updatedLoan = db.prepare(`SELECT l.*, b.title as book_title, u.full_name as user_name FROM loans l JOIN books b ON l.book_id = b.id JOIN users u ON l.user_id = u.id WHERE l.id = ?`).get(loan.id);
    return res.json({ message: 'Libro devuelto a inventario', loan: updatedLoan });
  } 
  else {
    return res.status(400).json({ error: `El préstamo activo está en estado ${loan.status} y no puede operarse` });
  }
});

module.exports = router;
