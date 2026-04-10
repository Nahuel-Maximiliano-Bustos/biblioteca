import { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { CheckCircle, RotateCcw, AlertOctagon, QrCode, Trash2, Eraser } from 'lucide-react';

const STATUS_BADGE = { reserved: 'badge-reserved', active: 'badge-active', returned: 'badge-returned', overdue: 'badge-overdue', cancelled: 'badge-cancelled' };
const STATUS_LABEL = { reserved: 'Reservado', active: 'Prestado', returned: 'Devuelto', overdue: 'Atrasado', cancelled: 'Cancelado' };

export default function AdminLoansPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [qr, setQr] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/loans', { params: { status: statusFilter, page, limit: 15 } }).then(r => {
      setLoans(r.data.loans);
      setTotalPages(r.data.totalPages);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(load, [page, statusFilter]);

  const action = async (loanId, endpoint, msg) => {
    try {
      if (endpoint === 'delete') {
        if (!confirm('¿Eliminar registro permanentemente?')) return;
        await api.delete(`/loans/${loanId}`);
      } else {
        await api.put(`/loans/${loanId}/${endpoint}`);
      }
      toast.success(msg);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const clearInactive = async () => {
    if (!confirm('¿Limpiar todo el historial de préstamos devueltos y cancelados? Esta acción no se puede deshacer.')) return;
    try {
      const { data } = await api.delete('/loans/clear-inactive');
      toast.success(data.message);
      load();
    } catch (err) { toast.error('Error al limpiar el historial'); }
  };

  const loadQr = async (loanId) => {
    try {
      const { data } = await api.get(`/qr/${loanId}`);
      setQr(data.qr);
    } catch { toast.error('Error al generar QR'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Gestión de Préstamos</h1>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {['all','reserved','active','overdue','returned','cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        
        <button onClick={clearInactive} className="btn-danger flex items-center gap-2 px-3 py-1.5 text-sm w-fit shrink-0">
          <Eraser size={16} /> Organizar Inactivos
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-xs uppercase tracking-wider text-gray-500 text-left">
                <th className="px-4 py-3">Libro</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fechas</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-gray-800 animate-pulse rounded w-3/4"/></td></tr>
              )) : loans.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No hay préstamos</td></tr>
              ) : loans.map(loan => (
                <tr key={loan.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{loan.book_title}</p>
                    <p className="text-xs text-gray-500">{loan.book_author}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{loan.user_name}</p>
                    <p className="text-xs text-gray-500">{loan.user_email}</p>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_BADGE[loan.status]}`}>{STATUS_LABEL[loan.status]}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500 space-y-0.5">
                    <p>Reserva: {new Date(loan.reserved_at || loan.created_at).toLocaleDateString('es-AR')}</p>
                    {loan.pickup_deadline && loan.status === 'reserved' && <p className="text-amber-400">Retiro hasta: {new Date(loan.pickup_deadline).toLocaleDateString('es-AR')}</p>}
                    {loan.due_date && <p className="text-blue-400">Devol.: {new Date(loan.due_date).toLocaleDateString('es-AR')}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {loan.status === 'reserved' && (
                        <button onClick={() => action(loan.id, 'pickup', 'Retiro confirmado')} className="btn-success text-xs px-2.5 py-1.5 flex items-center gap-1"><CheckCircle size={13}/> Confirmar retiro</button>
                      )}
                      {['active','overdue'].includes(loan.status) && (
                        <>
                          <button onClick={() => action(loan.id, 'return', 'Devolución registrada')} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"><RotateCcw size={13}/> Devuelto</button>
                          <button onClick={() => action(loan.id, 'renew', 'Préstamo renovado por 14 días')} className="btn-primary text-xs px-2.5 py-1.5 flex items-center gap-1"><RotateCcw size={13}/> Renovar</button>
                        </>
                      )}
                      {loan.status === 'active' && (
                        <button onClick={() => action(loan.id, 'overdue', 'Marcado como atrasado')} className="btn-danger text-xs px-2.5 py-1.5 flex items-center gap-1"><AlertOctagon size={13}/> Atrasado</button>
                      )}
                      {['reserved','active'].includes(loan.status) && (
                        <button onClick={() => loadQr(loan.id)} className="btn-secondary text-xs px-2 py-1.5" title="Ver QR"><QrCode size={13}/></button>
                      )}
                      {['returned', 'cancelled'].includes(loan.status) && (
                        <button onClick={() => action(loan.id, 'delete', 'Registro eliminado')} className="bg-red-900/50 hover:bg-red-900 text-red-200 transition-colors rounded text-xs px-2 py-1.5" title="Eliminar registro"><Trash2 size={13}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center gap-3 py-3 border-t border-gray-800">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Anterior</button>
            <span className="text-xs text-gray-500 self-center">Pág {page}/{totalPages}</span>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Siguiente</button>
          </div>
        )}
      </div>

      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setQr(null)}>
          <div className="card p-6 text-center space-y-4 max-w-xs" onClick={e=>e.stopPropagation()}>
            <h3 className="font-semibold text-white">Código QR</h3>
            <img src={qr} alt="QR" className="mx-auto rounded-xl" />
            <button onClick={() => setQr(null)} className="btn-secondary w-full">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
