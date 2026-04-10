import { useState, useEffect } from 'react';
import api from '../api/client';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_STYLES = {
  reservation: 'text-indigo-400',
  pickup_confirmed: 'text-emerald-400',
  returned: 'text-gray-400',
  overdue: 'text-red-400',
  new_message: 'text-blue-400',
  new_reservation: 'text-amber-400',
  default: 'text-gray-400'
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/notifications').then(r => setNotifications(r.data.notifications)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(n => n.map(x => ({ ...x, is_read: 1 })));
      toast.success('Todas marcadas como leídas');
    } catch { toast.error('Error'); }
  };

  const clearAll = async () => {
    if (!confirm('¿Deseás eliminar permanentemente todas las notificaciones?')) return;
    try {
      await api.delete('/notifications/clear');
      setNotifications([]);
      toast.success('Bandeja limpiada');
    } catch { toast.error('Error al limpiar bandeja'); }
  };

  const markOne = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: 1 } : x));
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
          {unread > 0 && <p className="text-sm text-gray-400 mt-0.5">{unread} sin leer</p>}
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAll} className="btn-secondary flex items-center gap-2 text-sm">
              <CheckCheck size={16} /> Marcar todas
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="btn-secondary text-red-400 hover:bg-red-900/30 flex items-center gap-2 text-sm">
              Limpiar bandeja
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Bell size={48} className="mx-auto mb-4 opacity-30" />
          <p>No tenés notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markOne(n.id)}
              className={`card p-4 cursor-pointer transition-colors ${!n.is_read ? 'border-indigo-800 bg-indigo-950/30' : 'opacity-60'} hover:border-gray-700`}
            >
              <div className="flex items-start gap-3">
                {!n.is_read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0" />}
                <div className={`flex-1 ${n.is_read ? 'ml-5' : ''}`}>
                  <p className={`font-medium text-sm ${TYPE_STYLES[n.type] || TYPE_STYLES.default}`}>{n.title}</p>
                  <p className="text-gray-300 text-sm mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(n.created_at).toLocaleString('es-AR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
