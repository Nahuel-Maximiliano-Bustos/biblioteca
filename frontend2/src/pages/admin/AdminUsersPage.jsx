import { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Search, CheckCircle, XCircle, UserCheck, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [selectedLoans, setSelectedLoans] = useState([]);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(search), 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [debouncedQ]);

  const load = () => {
    setLoading(true);
    api.get('/users', { params: { page, limit: 20, ...(debouncedQ && { q: debouncedQ }) } }).then(r => {
      setUsers(r.data.users);
      setTotalPages(r.data.totalPages);
    }).finally(() => setLoading(false));
  };
  useEffect(load, [page, debouncedQ]);

  const openUser = async (user) => {
    setSelected(user);
    try {
      const { data } = await api.get(`/users/${user.id}`);
      setSelectedLoans(data.loans || []);
    } catch {}
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active, banned_until: null });
      toast.success(user.is_active ? 'Baneo permanente aplicado' : 'Usuario desbaneado');
      load();
      if (selected?.id === user.id) setSelected(u => ({ ...u, is_active: !u.is_active, banned_until: null }));
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const banUser = async (user, days) => {
    try {
      const banned_until = new Date(Date.now() + days * 86400000).toISOString();
      await api.put(`/users/${user.id}`, { banned_until, is_active: 1 });
      toast.success(`Suspendido por ${days} días`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const deleteUser = async (user) => {
    if (!confirm(`¿Eliminar definitivamente a ${user.username}? Esto no se puede deshacer.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Usuario eliminado');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al eliminar'); }
  };

  const STATUS_LABELS = { reserved: 'Reservado', active: 'Prestado', returned: 'Devuelto', overdue: 'Atrasado', cancelled: 'Cancelado' };
  const STATUS_BADGE = { reserved: 'badge-reserved', active: 'badge-active', returned: 'badge-returned', overdue: 'badge-overdue', cancelled: 'badge-cancelled' };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario..." className="input pl-9" id="admin-user-search" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-xs uppercase tracking-wider text-gray-500 text-left">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Registrado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-gray-800 animate-pulse rounded w-2/3"/></td></tr>
              )) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => openUser(u)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.full_name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.role === 'admin' ? 'badge-active' : 'badge-returned'}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`badge ${u.is_active ? (u.banned_until && new Date(u.banned_until) > new Date() ? 'badge-overdue' : 'badge-available') : 'badge-overdue'}`}>
                        {u.is_active ? (u.banned_until && new Date(u.banned_until) > new Date() ? 'Suspendido (Temp)' : 'Activo') : 'Baneado'}
                      </span>
                      {u.banned_until && new Date(u.banned_until) > new Date() && (
                         <span className="text-xs text-red-400">hasta: {new Date(u.banned_until).toLocaleDateString('es-AR')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                      {u.role !== 'admin' && (
                        <>
                          <button onClick={() => banUser(u, 7)} className="text-xs px-2 py-1 bg-amber-900/40 text-amber-500 rounded hover:bg-amber-900/60">Susp. 7d</button>
                          <button onClick={() => banUser(u, 30)} className="text-xs px-2 py-1 bg-amber-900/40 text-amber-500 rounded hover:bg-amber-900/60">Susp. 30d</button>
                          <button onClick={() => toggleActive(u)} className={`text-xs px-2 py-1 rounded ${u.is_active ? 'bg-red-900/40 text-red-500 hover:bg-red-900/60' : 'bg-emerald-900/40 text-emerald-500 hover:bg-emerald-900/60'}`}>
                            {u.is_active ? 'Ban Perm.' : 'Desbanear'}
                          </button>
                          <button onClick={() => deleteUser(u)} className="text-xs px-2 py-1 bg-red-900/40 text-red-500 rounded hover:bg-red-900/60"><Trash2 size={14}/></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelected(null)}>
          <div className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center font-bold text-white">{selected.full_name[0]}</div>
                <div>
                  <p className="font-semibold text-white">{selected.full_name}</p>
                  <p className="text-xs text-gray-500">{selected.email}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300 text-xl">×</button>
            </div>

            <h3 className="text-sm font-medium text-gray-400 mb-3">Historial de préstamos</h3>
            {selectedLoans.length === 0 ? <p className="text-gray-600 text-sm">Sin préstamos</p> : (
              <div className="space-y-2">
                {selectedLoans.map(l => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm text-white">{l.book_title}</p>
                      <p className="text-xs text-gray-500">{new Date(l.created_at).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className={`badge ${STATUS_BADGE[l.status]}`}>{STATUS_LABELS[l.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
