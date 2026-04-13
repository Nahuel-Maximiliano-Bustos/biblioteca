const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

// POST /api/contact — Public route for contact messages
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const result = await db.prepare(`
    INSERT INTO contact_messages (name, email, subject, message)
    VALUES (?, ?, ?, ?)
  `).run(name, email, subject, message);

  // Send a high-priority notification to the admins
  const admins = await db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  for (const admin of admins) {
    await db.prepare(`INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)`).run(
      admin.id, 'new_contact', '📢 Nuevo Mensaje Público',
      `Consulta de ${name} (${email}): ${subject}.`
    );
  }

  res.status(201).json({ message: 'Mensaje enviado exitosamente, te contactaremos pronto.', id: result.lastInsertRowid });
});

module.exports = router;
