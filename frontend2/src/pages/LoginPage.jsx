import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { BookOpen, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      toast.success(`¡Bienvenido, ${data.user.full_name}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/catalog', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md relative">
        <Link to="/" className="absolute -top-12 left-0 text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors font-medium">
          <ArrowLeft size={16} /> Volver al Inicio
        </Link>
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 hover:scale-105 transition-transform">
            <BookOpen size={28} className="text-white" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Biblioteca Virtual</h1>
          <p className="text-gray-400 mt-2">Iniciá sesión para continuar</p>
        </div>

        <div className="card p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@email.com"
                className="input"
                id="login-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="input pr-11"
                  id="login-password"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-1">
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="text-center space-y-2 text-sm text-gray-500 border-t border-gray-800 pt-4">
            <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300 block">¿Olvidaste tu contraseña?</Link>
            <p>¿No tenés cuenta? <Link to="/register" className="text-indigo-400 hover:text-indigo-300">Registrarse</Link></p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-400">Credenciales de prueba:</p>
          <p>Admin: <span className="text-gray-300">admin@biblioteca.com</span> / <span className="text-gray-300">Admin1234!</span></p>
          <p>Usuario: <span className="text-gray-300">juan@email.com</span> / <span className="text-gray-300">User1234!</span></p>
        </div>
      </div>
    </div>
  );
}
