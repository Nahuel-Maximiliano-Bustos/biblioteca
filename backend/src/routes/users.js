const express = require('express');
const { db } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');


const router = express.Router();

// GET /api/users — admin: all users
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const { page = 1, limit = 20, q } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = "1=1";
  const params = [];
  if (q) {
    where += " AND (LOWER(full_name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(email) LIKE ?)";
    const t = `%${q.toLowerCase()}%`;
    params.push(t, t, t);
  }
  const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${where}`).get(...params).c;
  const users = db.prepare(`
    SELECT id, full_name, username, email, role, is_active, banned_until, created_at FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/users/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, full_name, username, email, role, is_active, banned_until, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// GET /api/users/:id — admin or own profile
router.get('/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const user = db.prepare('SELECT id, full_name, username, email, role, is_active, banned_until, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const loans = db.prepare(`
    SELECT l.*, b.title as book_title, b.author as book_author FROM loans l
    JOIN books b ON l.book_id = b.id WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT 10
  `).all(req.params.id);

  res.json({ user, loans });
});

// PUT /api/users/:id — admin: update role/status; own: update profile
router.put('/:id', authenticateToken, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.user.id === parseInt(req.params.id);
  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Acceso denegado' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { full_name, is_active, role, banned_until } = req.body;
  const newName = full_name || user.full_name;
  const newActive = isAdmin && is_active !== undefined ? (is_active ? 1 : 0) : user.is_active;
  const newRole = isAdmin && role ? role : user.role;
  const newBannedUntil = isAdmin && banned_until !== undefined ? banned_until : user.banned_until;

  // Let sql.js bind null directly if banned_until is null, otherwise string
  db.prepare(`UPDATE users SET full_name=?, is_active=?, role=?, banned_until=?, updated_at=datetime('now') WHERE id=?`)
    .run(newName, newActive, newRole, newBannedUntil, req.params.id);
  db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'user_update', ?)`).run(req.user.id, `Usuario ${req.params.id} actualizado`);
  const updated = db.prepare('SELECT id, full_name, username, email, role, is_active, banned_until, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json({ user: updated });
});

// DELETE /api/users/:id — admin only
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const activeLoans = db.prepare(`SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND status IN ('reserved','active','overdue')`).get(req.params.id).c;
  if (activeLoans > 0) return res.status(409).json({ error: 'El usuario tiene préstamos activos y no puede ser eliminado' });

  try {
    // Delete related
    db.prepare('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM loans WHERE user_id = ?').run(req.params.id);
    
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'user_delete', ?)`).run(req.user.id, `Usuario ${user.username} eliminado`);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
