import { useState, useEffect } from 'react';
import api from '../../api/client';
import { BookCopy, Users, BookOpen, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/loans/stats/summary'),
      api.get('/loans', { params: { status: 'reserved', limit: 5 } }),
    ]).then(([statsRes, loansRes]) => {
      setStats(statsRes.data.stats);
      setLoans(loansRes.data.loans);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Panel Administrativo</h1>
        <p className="text-gray-400 text-sm mt-1">Vista general del sistema</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookCopy} label="Libros disponibles" value={stats?.availableBooks} color="bg-emerald-600" />
        <StatCard icon={BookOpen} label="Préstamos activos" value={stats?.activeLoans} color="bg-blue-600" />
        <StatCard icon={AlertTriangle} label="Atrasados" value={stats?.overdueLoans} color="bg-red-600" />
        <StatCard icon={Clock} label="Pendientes de retiro" value={stats?.pendingPickups} color="bg-amber-600" />
        <StatCard icon={Users} label="Usuarios registrados" value={stats?.totalUsers} color="bg-purple-600" />
        <StatCard icon={TrendingUp} label="Usuarios activos" value={stats?.activeUsers} color="bg-indigo-600" />
        <StatCard icon={BookCopy} label="Total libros" value={stats?.totalBooks} color="bg-teal-600" />
      </div>

      {/* Pending pickups */}
      <div className="card p-5">
        <h2 className="font-semibold text-white mb-4">Reservas pendientes de retiro</h2>
        {loans.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay reservas pendientes</p>
        ) : (
          <div className="space-y-3">
            {loans.map(loan => (
              <div key={loan.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{loan.book_title}</p>
                  <p className="text-xs text-gray-400">{loan.user_name} · {loan.user_email}</p>
                </div>
                <div className="text-right">
                  <span className="badge badge-reserved">Pendiente</span>
                  {loan.pickup_deadline && (
                    <p className="text-xs text-amber-400 mt-1">Hasta: {new Date(loan.pickup_deadline).toLocaleDateString('es-AR')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
