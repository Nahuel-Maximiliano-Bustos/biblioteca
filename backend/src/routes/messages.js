const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');


const router = express.Router();

// GET /api/messages — get conversation threads for current user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (isAdmin) {
    // Admin sees all conversations grouped by user
    const threads = await db.prepare(`
      SELECT DISTINCT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
        u.full_name as other_user_name, u.username as other_user_username,
        (SELECT content FROM messages m2
         WHERE (m2.sender_id = u.id AND m2.receiver_id = ?)
            OR (m2.sender_id = ? AND m2.receiver_id = u.id)
         ORDER BY m2.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages m2
         WHERE (m2.sender_id = u.id AND m2.receiver_id = ?)
            OR (m2.sender_id = ? AND m2.receiver_id = u.id)
         ORDER BY m2.created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM messages m2
         WHERE m2.sender_id = u.id AND m2.receiver_id = ? AND m2.is_read = 0) as unread_count,
        (SELECT category FROM messages m2
         WHERE (m2.sender_id = u.id AND m2.receiver_id = ?)
            OR (m2.sender_id = ? AND m2.receiver_id = u.id)
         ORDER BY m2.created_at DESC LIMIT 1) as category,
        (SELECT is_archived FROM messages m2
         WHERE (m2.sender_id = u.id AND m2.receiver_id = ?)
            OR (m2.sender_id = ? AND m2.receiver_id = u.id)
         ORDER BY m2.created_at DESC LIMIT 1) as is_archived,
        (SELECT is_deleted FROM messages m2
         WHERE (m2.sender_id = u.id AND m2.receiver_id = ?)
            OR (m2.sender_id = ? AND m2.receiver_id = u.id)
         ORDER BY m2.created_at DESC LIMIT 1) as is_deleted
      FROM messages m
      JOIN users u ON u.id = CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY last_message_at DESC
    `).all(userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId);
    res.json({ threads });
  } else {
    // User sees their conversation with admins
    const messages = await db.prepare(`
      SELECT m.*, u.full_name as sender_name, u.username as sender_username, u.role as sender_role
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE ((m.sender_id = ? AND m.receiver_id IN (SELECT id FROM users WHERE role='admin'))
         OR (m.receiver_id = ? AND m.sender_id IN (SELECT id FROM users WHERE role='admin')))
         AND m.is_deleted = 0
      ORDER BY m.created_at ASC
    `).all(userId, userId);

    // Mark incoming as read
    await db.prepare(`
      UPDATE messages SET is_read = 1
      WHERE receiver_id = ? AND sender_id IN (SELECT id FROM users WHERE role='admin') AND is_read = 0
    `).run(userId);

    res.json({ messages });
  }
});

// GET /api/messages/:userId — admin: get thread with specific user
router.get('/:userId', authenticateToken, async (req, res) => {
  const myId = req.user.id;
  const otherId = parseInt(req.params.userId);

  const messages = await db.prepare(`
    SELECT m.*, u.full_name as sender_name, u.username as sender_username, u.role as sender_role
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(myId, otherId, otherId, myId);

  // Mark as read
  await db.prepare(`UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0`).run(myId, otherId);

  res.json({ messages });
});

// POST /api/messages — send message
router.post('/', authenticateToken, async (req, res) => {
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content?.trim()) return res.status(400).json({ error: 'Destinatario y mensaje son requeridos' });

  const receiver = await db.prepare('SELECT id, role FROM users WHERE id = ?').get(receiver_id);
  if (!receiver) return res.status(404).json({ error: 'Destinatario no encontrado' });

  // Users can only message admins
  if (req.user.role === 'user' && receiver.role !== 'admin') {
    return res.status(403).json({ error: 'Solo podés enviar mensajes a administradores' });
  }

  const result = await db.prepare(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`).run(req.user.id, receiver_id, content.trim());

  // Notification
  await db.prepare(`INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)`).run(
    receiver_id, 'new_message', 'Nuevo mensaje',
    `${req.user.full_name} te envió un mensaje.`
  );

  const message = await db.prepare(`SELECT m.*, u.full_name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ message });
});

// DELETE /api/messages/clear (Propio del usuario - Soft Delete)
router.delete('/clear', authenticateToken, async (req, res) => {
  await db.prepare('UPDATE messages SET is_deleted = 1 WHERE sender_id = ? OR receiver_id = ?').run(req.user.id, req.user.id);
  res.json({ message: 'Historial de mensajes enviado a papelera' });
});

// Admin Thread Actions
// PUT /api/messages/thread/:userId/archive
router.put('/thread/:userId/archive', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  const val = req.body.is_archived ? 1 : 0;
  await db.prepare('UPDATE messages SET is_archived = ? WHERE sender_id = ? OR receiver_id = ?').run(val, req.params.userId, req.params.userId);
  res.json({ message: val ? 'Hilo archivado' : 'Hilo desarchivado' });
});

// PUT /api/messages/thread/:userId/category
router.put('/thread/:userId/category', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  const category = req.body.category || 'General';
  await db.prepare('UPDATE messages SET category = ? WHERE sender_id = ? OR receiver_id = ?').run(category, req.params.userId, req.params.userId);
  res.json({ message: 'Categoría actualizada' });
});

// PUT /api/messages/thread/:userId/read
router.put('/thread/:userId/read', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  await db.prepare('UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?').run(req.user.id, req.params.userId);
  res.json({ message: 'Hilo marcado como leído' });
});

// DELETE /api/messages/thread/:userId/clear (Move to trash)
router.delete('/thread/:userId/clear', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  await db.prepare('UPDATE messages SET is_deleted = 1 WHERE sender_id = ? OR receiver_id = ?').run(req.params.userId, req.params.userId);
  res.json({ message: 'Hilo movido a la papelera' });
});

// PUT /api/messages/thread/:userId/restore
router.put('/thread/:userId/restore', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  await db.prepare('UPDATE messages SET is_deleted = 0 WHERE sender_id = ? OR receiver_id = ?').run(req.params.userId, req.params.userId);
  res.json({ message: 'Hilo restaurado con éxito' });
});

// DELETE /api/messages/thread/:userId/hard-delete (Destroy entirely)
router.delete('/thread/:userId/hard-delete', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  await db.prepare('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?').run(req.params.userId, req.params.userId);
  res.json({ message: 'Hilo eliminado permanentemente' });
});

module.exports = router;
