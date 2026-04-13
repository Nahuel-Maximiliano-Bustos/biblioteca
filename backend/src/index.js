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
app.set('trust proxy', 1);
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

const path = require('path');

// Integración de Frontend para Producción (Render)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.resolve(__dirname, '../../frontend2/dist');
  console.log(`📂 Sirviendo frontend desde: ${frontendPath}`);
  app.use(express.static(frontendPath));

  app.get('*', (req, res, next) => {
    // Si la ruta empieza con /api, no servir el index.html
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta de API no encontrada' }));
}

app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Start server immediately for health checks
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize database in background
  initDb()
    .then(() => console.log('✅ Base de datos inicializada correctamente'))
    .catch(err => {
      console.error('❌ Error crítico al iniciar base de datos:', err);
      // No cerramos el proceso para que Render no lo reinicie infinitamente
      // Pero las rutas de la DB fallarán con un error 500 controlado
    });
});

module.exports = app;
