import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, User, LogOut, Bell, MessageSquare, BookMarked,
  LayoutDashboard, Users, BookCopy, ClipboardList, ChevronRight, Menu, X, ScanFace, Home
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Layout({ admin }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifs = () => api.get('/notifications').then(r => setUnreadCount(r.data.unreadCount)).catch(() => {});
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const userNav = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/catalog', label: 'Catálogo', icon: BookOpen },
    { to: '/my-loans', label: 'Mis Préstamos', icon: BookMarked },
    { to: '/messages', label: 'Mensajes', icon: MessageSquare },
    { to: '/notifications', label: 'Notificaciones', icon: Bell, badge: unreadCount },
  ];

  const adminNav = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/books', label: 'Libros', icon: BookCopy },
    { to: '/admin/users', label: 'Usuarios', icon: Users },
    { to: '/admin/loans', label: 'Préstamos', icon: ClipboardList },
    { to: '/admin/messages', label: 'Mensajes', icon: MessageSquare },
    { to: '/admin/scanner', label: 'Escáner', icon: ScanFace },
  ];

  const publicNav = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/catalog', label: 'Catálogo', icon: BookOpen },
  ];

  const nav = admin || user?.role === 'admin' ? adminNav : (user ? userNav : publicNav);

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">Biblioteca</p>
              <p className="text-xs text-gray-400">Virtual</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon, badge }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(to)
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {badge > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{badge}</span>}
            </Link>
          ))}
        </nav>

        {/* User & role switch / Login */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-1">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to={admin ? '/catalog' : '/admin'}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  {admin ? <BookOpen size={18} /> : <LayoutDashboard size={18} />}
                  <span>{admin ? 'Ver catálogo' : 'Panel admin'}</span>
                </Link>
              )}
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {user.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 w-full">
                <LogOut size={18} />
                <span>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="flex items-center justify-center py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="flex items-center justify-center py-2.5 mt-2 rounded-xl text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-white">Biblioteca Virtual</span>
          <Link to="/notifications" className="relative text-gray-400">
            <Bell size={22} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">{unreadCount}</span>}
          </Link>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
