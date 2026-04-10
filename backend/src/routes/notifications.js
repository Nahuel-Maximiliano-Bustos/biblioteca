const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');


const router = express.Router();

// GET /api/notifications — own notifications
router.get('/', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);
  const unreadCount = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0`).get(req.user.id).c;
  res.json({ notifications, unreadCount });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, (req, res) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Notificación leída' });
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Todas las notificaciones marcadas como leídas' });
});

// DELETE /api/notifications/clear
router.delete('/clear', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Todas las notificaciones eliminadas' });
});

module.exports = router;
