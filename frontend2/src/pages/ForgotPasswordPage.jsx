import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { BookOpen, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Instrucciones enviadas (ver demo token en respuesta)');
    } catch {
      toast.error('Error al procesar la solicitud');
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
          <h1 className="text-3xl font-bold text-white">Recuperar contraseña</h1>
          <p className="text-gray-400 mt-2">Te enviaremos instrucciones por email</p>
        </div>
        <div className="card p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <p className="text-gray-300">Revisá tu email para las instrucciones de recuperación.</p>
              <Link to="/login" className="btn-primary inline-block">Volver al login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="input" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>
          )}
          <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mt-4">
            <ArrowLeft size={16} /> Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
