import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Search, Filter, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_LABELS = {
  available: 'Disponibles',
  unavailable: 'Sin stock',
  all: 'Todos'
};

function BookCard({ book }) {
  const available = book.available_copies > 0;
  const colors = ['from-indigo-600 to-purple-700', 'from-blue-600 to-cyan-700', 'from-emerald-600 to-teal-700', 'from-pink-600 to-rose-700', 'from-amber-500 to-orange-600'];
  const color = colors[book.id % colors.length];

  return (
    <Link to={`/books/${book.id}`} className="card overflow-hidden hover:border-gray-700 hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
      <div className={`h-36 bg-gradient-to-br ${color} flex items-center justify-center`}>
        <BookOpen size={40} className="text-white/70" />
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div>
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">{book.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{book.author}</p>
        </div>
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-800">
          <span className="text-xs text-gray-500">{book.category}</span>
          <span className={`badge ${available ? 'badge-available' : 'badge-overdue'}`}>
            {available ? `${book.available_copies} disp.` : 'Sin stock'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CatalogPage() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, category, status]);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12, ...(debouncedSearch && { q: debouncedSearch }), ...(category !== 'all' && { category }), ...(status !== 'all' && { status }) };
    api.get('/books', { params }).then(r => {
      setBooks(r.data.books);
      setTotalPages(r.data.totalPages);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [page, debouncedSearch, category, status]);

  useEffect(() => {
    api.get('/books/categories').then(r => setCategories(r.data.categories));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Catálogo de Libros</h1>
        <p className="text-gray-400 text-sm mt-1">{total} libro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título, autor, etiqueta..." className="input pl-9" id="catalog-search" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input w-auto min-w-36">
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input w-auto">
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card h-56 animate-pulse">
              <div className="h-36 bg-gray-800 rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No se encontraron libros</p>
          <button onClick={() => { setSearch(''); setCategory('all'); setStatus('all'); }} className="btn-secondary mt-4">Limpiar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {books.map(book => <BookCard key={book.id} book={book} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary px-3 py-2 disabled:opacity-40">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-400">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="btn-secondary px-3 py-2 disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
