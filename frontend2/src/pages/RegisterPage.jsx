import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { BookOpen, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/catalog', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse');
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
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 hover:scale-105 transition-transform">
            <BookOpen size={28} className="text-white" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Crear cuenta</h1>
          <p className="text-gray-400 mt-2">Únete a la Biblioteca Virtual</p>
        </div>

        <div className="card p-8 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre completo</label>
              <input type="text" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Juan Pérez" className="input" id="reg-fullname" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre de usuario</label>
              <input type="text" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="juanp" className="input" id="reg-username" />
              <p className="text-xs text-gray-600 mt-1">3-20 caracteres alfanuméricos o guion bajo</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="tu@email.com" className="input" id="reg-email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mín. 8 chars, mayúsc., número y especial" className="input pr-11" id="reg-password" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 border-t border-gray-800 pt-4">
            ¿Ya tenés cuenta? <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
