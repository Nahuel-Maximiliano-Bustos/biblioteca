require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');
const { globalLimiter, sanitizeInput, helmetMiddleware } = require('./middleware/security');

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const loansRoutes = require('./routes/loans');
const usersRoutes = require('./routes/users');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const qrRoutes = require('./routes/qr');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmetMiddleware);
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/contact', contactRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Initialize database then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📚 Biblioteca Virtual API v1.0`);
  });
}).catch(err => {
  console.error('Error iniciando base de datos:', err);
  process.exit(1);
});

module.exports = app;
