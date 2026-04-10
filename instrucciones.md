Quiero que desarrolles una plataforma web completa de Biblioteca Virtual con gestión de libros físicos, enfocada en autogestión de usuarios y control administrativo.

OBJETIVO:
Crear un sistema donde los usuarios puedan registrarse, explorar un catálogo digital de libros físicos disponibles, reservarlos y retirarlos en un espacio físico. El sistema debe permitir un control total por parte de administradores.

FUNCIONALIDADES PRINCIPALES:

1. AUTENTICACIÓN Y USUARIOS
- Registro de usuarios con:
  - Nombre completo
  - Nombre de usuario
  - Email (verificado)
  - Contraseña segura (hash + validación fuerte)
- Login / Logout
- Recuperación de contraseña
- Roles:
  - Usuario
  - Administrador

2. PANEL DE USUARIO (AUTOGESTIÓN)
- Visualización de catálogo de libros
- Búsqueda avanzada (por título, autor, categoría)
- Filtros (disponible, reservado, prestado)
- Reserva de libro
- Historial de reservas y préstamos
- Estado del libro:
  - Disponible
  - Reservado
  - Prestado
  - Atrasado
- Notificaciones internas (mensajería)

3. SISTEMA DE PRÉSTAMOS
- Flujo:
  - Usuario reserva libro
  - Usuario retira físicamente el libro
  - Admin confirma retiro
  - Sistema registra fecha de devolución
- Control de vencimientos
- Alertas automáticas por retraso
- Penalizaciones opcionales

4. PANEL ADMINISTRATIVO
- Dashboard con métricas:
  - Libros disponibles
  - Libros prestados
  - Usuarios activos
- Gestión de usuarios:
  - Ver perfil
  - Historial
  - Estado de préstamos
- Gestión de libros:
  - Alta / Baja / Edición
  - Stock físico
  - Estado
- Gestión de préstamos:
  - Confirmar retiros
  - Confirmar devoluciones
  - Marcar retrasos
- Mensajería interna con usuarios

5. SISTEMA DE MENSAJERÍA
- Chat interno entre admin y usuario
- Notificaciones en tiempo real
- Historial de mensajes

6. SEGURIDAD
- Autenticación segura (JWT o sesiones)
- Encriptación de contraseñas (bcrypt)
- Protección contra:
  - SQL Injection
  - XSS
  - CSRF
- Validaciones frontend y backend
- Rate limiting

7. UX/UI
- Diseño moderno, minimalista y responsive
- Enfoque en facilidad de uso
- Dashboard claro e intuitivo

8. TECNOLOGÍA (SUGERIDA)
- Frontend: React + TailwindCSS
- Backend: Node.js (Express)
- Base de datos: SQLite o PostgreSQL
- Deploy listo para Vercel o similar

9. EXTRAS (VALOR AGREGADO)
- Sistema de recomendaciones
- Etiquetas y categorías dinámicas
- Código QR para retiro físico
- Logs de actividad
- Exportación de datos

REQUISITOS CLAVE:
- Código limpio, modular y escalable
- Estructura profesional lista para producción
- Incluir instrucciones de instalación y despliegue
- Crear base de datos inicial con datos de prueba
- Interfaces completamente funcionales

RESULTADO ESPERADO:
Una aplicación web completamente funcional lista para ser usada como biblioteca híbrida (digital + física), con control total de préstamos y gestión eficiente de usuarios.

IMPORTANTE:
El sistema debe estar diseñado para escalar a múltiples sucursales en el futuro.
