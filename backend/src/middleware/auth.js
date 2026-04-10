const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'biblioteca_secret';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    try {
      const dbUser = await db.prepare('SELECT id, username, email, full_name, role, is_active, banned_until FROM users WHERE id = ?').get(user.id);
      if (!dbUser || !dbUser.is_active) return res.status(403).json({ error: 'Usuario inactivo o baneado permanentemente' });
      if (dbUser.banned_until && new Date(dbUser.banned_until) > new Date()) {
        return res.status(403).json({ error: `Usuario suspendido hasta: ${new Date(dbUser.banned_until).toLocaleString('es-AR')}` });
      }
      req.user = dbUser;
      next();
    } catch (e) {
      console.error('Auth sync DB error:', e);
      return res.status(500).json({ error: 'Error del servidor en autenticación' });
    }
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin };
