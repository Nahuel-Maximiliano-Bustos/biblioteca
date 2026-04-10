const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');


const router = express.Router();

// GET /api/notifications — own notifications
router.get('/', authenticateToken, async (req, res) => {
  const notifications = await db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);
  const unreadCount = (await db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0`).get(req.user.id)).c;
  res.json({ notifications, unreadCount });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, async (req, res) => {
  const notif = await db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Notificación leída' });
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticateToken, async (req, res) => {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Todas las notificaciones marcadas como leídas' });
});

// DELETE /api/notifications/clear
router.delete('/clear', authenticateToken, async (req, res) => {
  await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Todas las notificaciones eliminadas' });
});

module.exports = router;
