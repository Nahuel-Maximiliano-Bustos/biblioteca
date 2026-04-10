import { useState, useEffect } from 'react';
import api from '../api/client';
import { BookMarked, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_LABEL = { reserved: 'Reservado', active: 'Prestado', returned: 'Devuelto', overdue: 'Atrasado', cancelled: 'Cancelado' };
const STATUS_BADGE = { reserved: 'badge-reserved', active: 'badge-active', returned: 'badge-returned', overdue: 'badge-overdue', cancelled: 'badge-cancelled' };

export default function MyLoansPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    api.get('/loans/my').then(r => setLoans(r.data.loans)).finally(() => setLoading(false));
  }, []);

  const cancel = async (loan) => {
    if (!confirm('¿Cancelar la reserva?')) return;
    try {
      await api.put(`/loans/${loan.id}/cancel`);
      setLoans(l => l.map(x => x.id === loan.id ? { ...x, status: 'cancelled' } : x));
      toast.success('Reserva cancelada');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al cancelar'); }
  };

  const loadQr = async (loanId) => {
    try {
      const { data } = await api.get(`/qr/${loanId}`);
      setQr(data.qr);
    } catch { toast.error('Error al generar QR'); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Mis Préstamos</h1>

      {loans.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <BookMarked size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No tenés préstamos registrados</p>
          <a href="/catalog" className="btn-primary mt-4 inline-block">Explorar catálogo</a>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map(loan => (
            <div key={loan.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white truncate">{loan.book_title}</h3>
                  <span className={`badge shrink-0 ${STATUS_BADGE[loan.status]}`}>{STATUS_LABEL[loan.status]}</span>
                </div>
                <p className="text-sm text-indigo-400 mt-0.5">{loan.book_author}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                  <span>Reservado: {new Date(loan.reserved_at).toLocaleDateString('es-AR')}</span>
                  {loan.pickup_deadline && loan.status === 'reserved' && <span className="text-amber-400">Retiro hasta: {new Date(loan.pickup_deadline).toLocaleDateString('es-AR')}</span>}
                  {loan.due_date && <span className="text-blue-400">Devolución: {new Date(loan.due_date).toLocaleDateString('es-AR')}</span>}
                  {loan.returned_at && <span className="text-emerald-400">Devuelto: {new Date(loan.returned_at).toLocaleDateString('es-AR')}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {['reserved', 'active'].includes(loan.status) && (
                  <button onClick={() => loadQr(loan.id)} className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5"><QrCode size={14} /> QR</button>
                )}
                {loan.status === 'reserved' && (
                  <button onClick={() => cancel(loan)} className="btn-danger text-sm px-3 py-1.5">Cancelar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setQr(null)}>
          <div className="card p-6 text-center space-y-4 max-w-xs" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-white">Código QR</h3>
            <img src={qr} alt="QR" className="mx-auto rounded-xl" />
            <p className="text-xs text-gray-500">Presentá este QR al retirar el libro</p>
            <button onClick={() => setQr(null)} className="btn-secondary w-full">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
