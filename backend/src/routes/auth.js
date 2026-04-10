const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const { authLimiter } = require('../middleware/security');


const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'biblioteca_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validate password strength
function validatePassword(password) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula';
  if (!/[0-9]/.test(password)) return 'Debe contener al menos un número';
  if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(password)) return 'Debe contener al menos un carácter especial';
  return null;
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { full_name, username, email, password } = req.body;

  if (!full_name || !username || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'El nombre de usuario debe tener 3-20 caracteres alfanuméricos' });
  }

  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) return res.status(409).json({ error: 'El email ya está registrado' });

  const existingUsername = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUsername) return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });

  try {
    const password_hash = await bcrypt.hash(password, 12);
    const result = await db.prepare(`
      INSERT INTO users (full_name, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'user')
    `).run(full_name.trim(), username.trim(), email.toLowerCase().trim(), password_hash);

    await db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'register', 'Nuevo usuario registrado')`).run(result.lastInsertRowid);

    const user = await db.prepare('SELECT id, full_name, username, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
  if (!user.is_active) return res.status(403).json({ error: 'Cuenta desactivada' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

  await db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, 'login', 'Inicio de sesión')`).run(user.id);

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/forgot-password (simplified — returns reset token in response for demo)
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  // Always return success to prevent email enumeration
  if (!user) return res.json({ message: 'Si el email existe, recibirás instrucciones de recuperación' });

  const resetToken = jwt.sign({ id: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Si el email existe, recibirás instrucciones de recuperación', resetToken });
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' });

  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Token inválido' });
    const hash = await bcrypt.hash(password, 12);
    await db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, payload.id);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch {
    res.status(400).json({ error: 'Token inválido o expirado' });
  }
});

module.exports = router;
