# 📚 Biblioteca Virtual

Sistema web completo de gestión de biblioteca física con catálogo digital, reservas, préstamos y panel de administración.

## ✨ Características

- **Autenticación** — Registro, login, recuperación de contraseña con JWT + bcrypt
- **Catálogo** — Búsqueda por título/autor/etiqueta, filtros, paginación
- **Reservas y préstamos** — Flujo completo: reserva → retiro → devolución
- **QR de retiro** — Código QR único por préstamo para verificación física
- **Panel Admin** — Dashboard con métricas, CRUD de libros, gestión de usuarios y préstamos
- **Mensajería** — Chat interno entre usuarios y administración
- **Notificaciones** — Alertas automáticas por reserva, retiro, devolución y retrasos
- **Seguridad** — Helmet, CORS, rate limiting, sanitización de inputs

## 🚀 Instalación

### Prerrequisitos
- Node.js >= 18

### 1. Backend

```bash
cd backend
npm install --ignore-scripts
node src/db/seed.js   # Carga datos de prueba
npm run dev           # Servidor en http://localhost:3001
```

### 2. Frontend

```bash
cd frontend2
npm install
npm run dev           # App en http://localhost:5173
```

## 🔐 Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@biblioteca.com | Admin1234! |
| Usuario | juan@email.com | User1234! |
| Usuario | maria@email.com | Maria1234! |

## 📁 Estructura

```
BibliotecaVirtual/
├── backend/
│   ├── src/
│   │   ├── db/          # database.js (sql.js), seed.js
│   │   ├── middleware/  # auth.js, security.js
│   │   ├── routes/      # auth, books, loans, users, messages, notifications, qr
│   │   └── index.js     # Express app
│   └── package.json
├── frontend2/
│   ├── src/
│   │   ├── api/         # axios client
│   │   ├── context/     # AuthContext
│   │   ├── components/  # Layout
│   │   └── pages/       # Auth, Catalog, MyLoans, Messages, Notifs + /admin/*
│   └── package.json
└── README.md
```

## 🗄️ Base de datos

SQLite via `sql.js` (puro WebAssembly, sin compilación nativa).
Tablas: `users`, `books`, `loans`, `messages`, `notifications`, `activity_logs`.
Archivo: `backend/src/db/biblioteca.db`

## 🌐 Deploy

### Variables de entorno (backend/.env)
```
PORT=3001
JWT_SECRET=tu_clave_secreta_segura
JWT_EXPIRES_IN=7d
DB_PATH=./src/db/biblioteca.db
FRONTEND_URL=https://tu-dominio.com
```

### Vercel / Railway
- Backend: deploy como Node.js app con `npm start`
- Frontend: `npm run build` genera `/dist` para Vercel/Netlify
