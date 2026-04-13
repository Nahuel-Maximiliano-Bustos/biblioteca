import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { BookOpen, ArrowLeft, MapPin, Tag, BookMarked, QrCode, Download } from 'lucide-react';

const STATUS_LABEL = { reserved: 'Reservado', active: 'Prestado', returned: 'Devuelto', overdue: 'Atrasado', cancelled: 'Cancelado' };
const STATUS_BADGE = { reserved: 'badge-reserved', active: 'badge-active', returned: 'badge-returned', overdue: 'badge-overdue', cancelled: 'badge-cancelled' };

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [userLoan, setUserLoan] = useState(null);
  const [qr, setQr] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const ticketRef = useRef(null);

  useEffect(() => {
    api.get(`/books/${id}`).then(r => {
      setBook(r.data.book);
      if (user) {
        return api.get('/loans/my').then(r2 => {
          const loan = r2.data.loans.find(l => l.book_id == id && ['reserved', 'active', 'overdue'].includes(l.status));
          setUserLoan(loan || null);
        }).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      navigate('/catalog')
    });
  }, [id, user]);

  const reserve = async () => {
    if (!user) {
      toast('Debes iniciar sesión o registrarte para pedir préstamos', { icon: '🔒' });
      navigate('/register');
      return;
    }
    
    setReserving(true);
    
    const reservationPromise = api.post('/loans', { book_id: id })
      .then((res) => {
        // Atomic state updates
        setUserLoan(res.data.loan);
        setBook(prev => ({ ...prev, available_copies: Math.max(0, prev.available_copies - 1) }));
        return res.data;
      })
      .finally(() => {
        setReserving(false);
      });

    toast.promise(reservationPromise, {
      loading: 'Procesando reserva...',
      success: '¡Libro reservado! Tenés 3 días para retirarlo.',
      error: (err) => err.response?.data?.error || 'Error al procesar la reserva'
    });
  };

  const cancelReservation = async () => {
    if (!confirm('¿Cancelar la reserva?')) return;
    try {
      await api.put(`/loans/${userLoan.id}/cancel`);
      setUserLoan(null);
      setBook(b => ({ ...b, available_copies: b.available_copies + 1 }));
      toast.success('Reserva cancelada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cancelar');
    }
  };

  const loadQr = async () => {
    if (!userLoan) return;
    try {
      const { data } = await api.get(`/qr/${userLoan.id}`);
      setQr(data.qr);
      setShowQr(true);
    } catch { toast.error('Error al generar QR'); }
  };

  const downloadQr = async () => {
    if (!qr || !ticketRef.current) return;
    
    // Mostramos un toast mientras se procesa la captura
    const loadingToast = toast.loading('Generando imagen...');
    try {
      const dataUrl = await toPng(ticketRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        style: {
          backgroundColor: '#111827' // Para evitar fondos transparentes
        }
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `credencial-${userLoan?.status === 'reserved' ? 'reserva' : 'prestamo'}-${book.title.replace(/\\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('¡Imagen descargada exitosamente!', { id: loadingToast });
    } catch (err) {
      console.error("Error al generar imagen con html-to-image:", err);
      toast.error('Error al generar la imagen', { id: loadingToast });
    }
  };

  const colors = ['from-indigo-600 to-purple-700', 'from-blue-600 to-cyan-700', 'from-emerald-600 to-teal-700', 'from-pink-600 to-rose-700', 'from-amber-500 to-orange-600'];

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!book) return null;

  const color = colors[book.id % colors.length];
  const tags = book.tags ? book.tags.split(',') : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/catalog" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al catálogo
      </Link>

      <div className="card overflow-hidden">
        {/* Cover */}
        <div className={`h-48 bg-gradient-to-br ${color} flex items-center justify-center`}>
          <BookOpen size={64} className="text-white/60" />
        </div>

        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">{book.title}</h1>
                <p className="text-indigo-400 mt-1 font-medium">{book.author}</p>
              </div>
              <span className={`badge shrink-0 mt-1 ${book.available_copies > 0 ? 'badge-available' : 'badge-overdue'}`}>
                {book.available_copies > 0 ? `${book.available_copies} disponible${book.available_copies > 1 ? 's' : ''}` : 'Sin stock'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{book.category}</p>
          </div>

          {book.description && <p className="text-gray-300 text-sm leading-relaxed">{book.description}</p>}

          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            {book.location && <span className="flex items-center gap-1.5"><MapPin size={14} />{book.location}</span>}
            {book.isbn && <span className="flex items-center gap-1.5"><BookMarked size={14} />ISBN: {book.isbn}</span>}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
                  <Tag size={10} />{t.trim()}
                </span>
              ))}
            </div>
          )}

          {/* User loan status */}
          {userLoan && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Tu préstamo</span>
                <span className={`badge ${STATUS_BADGE[userLoan.status]}`}>{STATUS_LABEL[userLoan.status]}</span>
              </div>
              {userLoan.pickup_deadline && userLoan.status === 'reserved' && (
                <p className="text-xs text-gray-500">Retirá antes del: <span className="text-amber-400">{new Date(userLoan.pickup_deadline).toLocaleDateString('es-AR')}</span></p>
              )}
              {userLoan.due_date && <p className="text-xs text-gray-500">Fecha de devolución: <span className="text-blue-400">{new Date(userLoan.due_date).toLocaleDateString('es-AR')}</span></p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!userLoan && (
              <button onClick={reserve} disabled={reserving || book.available_copies === 0} className="btn-primary flex-1 py-3">
                {reserving ? 'Reservando...' : book.available_copies === 0 ? 'Sin stock disponible' : 'Reservar libro'}
              </button>
            )}
            {userLoan?.status === 'reserved' && (
              <>
                <button onClick={loadQr} className="btn-secondary flex items-center gap-2 px-4">
                  <QrCode size={18} /> Ver QR
                </button>
                <button onClick={cancelReservation} className="btn-danger flex-1">Cancelar reserva</button>
              </>
            )}
            {userLoan?.status === 'active' && (
              <button onClick={loadQr} className="btn-secondary flex items-center gap-2 px-4">
                <QrCode size={18} /> Ver QR del préstamo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Modal - Ticket Redesign */}
      {showQr && qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowQr(false)}>
          <div className="relative w-full max-w-sm transition-transform flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            
            {/* Contenedor principal que será capturado */}
            <div ref={ticketRef} className="bg-gray-900 border border-gray-700/50 rounded-[2rem] overflow-hidden shadow-2xl pb-6">
              {/* Ticket Header */}
              <div className={`p-6 bg-gradient-to-br ${color} text-center`}>
                 <BookOpen size={36} className="text-white/80 mx-auto mb-2" />
                 <h3 className="font-bold text-white text-xl leading-tight line-clamp-2">{book.title}</h3>
                 <p className="text-white/80 text-sm mt-1 uppercase tracking-wider font-semibold">Credencial de {userLoan?.status === 'reserved' ? 'Reserva' : 'Préstamo'}</p>
                 <div className="mt-4 pt-3 border-t border-white/20">
                   <p className="text-white/90 text-xs font-bold uppercase tracking-[0.2em] drop-shadow-md">Biblioteca Participativa</p>
                 </div>
              </div>

              {/* Ticket Body */}
              <div className="relative bg-gray-900 px-6 py-6 flex flex-col items-center border-t-2 border-dashed border-gray-700/50">
                 {/* Left/Right cutouts for realistic ticket look */}
                 <div className="absolute -top-4 -left-4 w-8 h-8 bg-gray-900 rounded-full border border-gray-700/50"></div>
                 <div className="absolute -top-4 -right-4 w-8 h-8 bg-gray-900 rounded-full border border-gray-700/50"></div>

                 <div className="bg-white p-3.5 rounded-2xl shadow-lg shadow-black/40 mb-5 border border-gray-200">
                   <img src={qr} alt="QR Code" className="w-52 h-52 mx-auto" />
                 </div>
                 
                 <div className="text-left w-full space-y-4">
                   <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-700/50">
                     <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Titular</p>
                     <p className="text-base font-medium text-white truncate">{user?.full_name}</p>
                   </div>
                   <div className="flex gap-3">
                     <div className="flex-1 bg-gray-800/40 rounded-xl p-3 border border-gray-700/50 text-center flex flex-col justify-center">
                       <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{userLoan?.status === 'reserved' ? 'Vence res.' : 'Devolución'}</p>
                       <p className="text-base font-bold text-white">{new Date(userLoan?.status === 'reserved' ? userLoan?.pickup_deadline : userLoan?.due_date).toLocaleDateString('es-AR')}</p>
                     </div>
                     <div className="flex-1 bg-gray-800/40 rounded-xl p-3 border border-gray-700/50 text-center flex flex-col justify-center">
                       <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
                       <span className={`text-base font-bold block ${userLoan?.status === 'reserved' ? 'text-amber-400' : 'text-emerald-400'}`}>{userLoan?.status === 'reserved' ? 'Pendiente' : 'Activo'}</span>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
            
            {/* Footer independiente de la captura */}
            <div className="flex gap-3 w-full">
              <button onClick={downloadQr} className="btn-primary flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                <Download size={18} /> Descargar QR
              </button>
              <button onClick={() => setShowQr(false)} className="btn-secondary flex-1 border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 py-3.5 rounded-xl shadow-lg">
                Cerrar ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
