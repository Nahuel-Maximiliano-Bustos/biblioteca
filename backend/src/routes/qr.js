const express = require('express');
const QRCode = require('qrcode');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');


const router = express.Router();

// GET /api/qr/:loanId — generate QR for loan pickup
router.get('/:loanId', authenticateToken, async (req, res) => {
  const loan = await db.prepare(`
    SELECT l.*, b.title as book_title, u.full_name as user_name, u.email
    FROM loans l JOIN books b ON l.book_id = b.id JOIN users u ON l.user_id = u.id
    WHERE l.id = ?
  `).get(req.params.loanId);

  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
  if (req.user.role !== 'admin' && loan.user_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' });

  const qrData = JSON.stringify({ token: loan.qr_token });

  try {
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
    res.json({ qr: qrDataUrl, loan });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar QR' });
  }
});

module.exports = router;
