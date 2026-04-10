import { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, X, Check } from 'lucide-react';

const EMPTY = { title: '', author: '', isbn: '', category: '', description: '', total_copies: 1, location: '', tags: '' };

export default function AdminBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState(null); // null | 'create' | bookObj
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(search), 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [debouncedQ]);

  const load = () => {
    setLoading(true);
    api.get('/books', { params: { page, limit: 15, ...(debouncedQ && { q: debouncedQ }) } }).then(r => {
      setBooks(r.data.books);
      setTotalPages(r.data.totalPages);
    }).finally(() => setLoading(false));
  };
  useEffect(load, [page, debouncedQ]);

  const openCreate = () => { 
    setForm({ ...EMPTY, isbn: `978-${Math.floor(1000000000 + Math.random() * 9000000000)}` }); 
    setModal('create'); 
  };
  const openEdit = (book) => { setForm({ ...book, total_copies: book.total_copies }); setModal(book); };
  const closeModal = () => { setModal(null); setForm(EMPTY); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (modal === 'create') {
        const { data } = await api.post('/books', payload);
        toast.success('Libro creado');
      } else {
        await api.put(`/books/${modal.id}`, payload);
        toast.success('Libro actualizado');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const del = async (book) => {
    if (!confirm(`¿Eliminar "${book.title}"?`)) return;
    try {
      await api.delete(`/books/${book.id}`);
      toast.success('Libro eliminado');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const F = (field) => ({ value: form[field] ?? '', onChange: e => setForm(f => ({ ...f, [field]: e.target.value })) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gestión de Libros</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nuevo libro</button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input {...F('x')} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar libros..." className="input pl-9" id="admin-book-search" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Título / Autor</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-center">Disponible</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? Array.from({length:6}).map((_,i)=>(
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" /></td></tr>
              )) : books.map(book => (
                <tr key={book.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{book.title}</p>
                    <p className="text-gray-500 text-xs">{book.author}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{book.category}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${book.available_copies > 0 ? 'badge-available' : 'badge-overdue'}`}>{book.available_copies}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">{book.total_copies}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{book.location || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(book)} className="text-gray-400 hover:text-indigo-400 p-1"><Pencil size={15} /></button>
                      <button onClick={() => del(book)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 size={15} /></button>
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
            <span className="text-xs text-gray-500 self-center">Pág {page} de {totalPages}</span>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Siguiente</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">{modal === 'create' ? 'Nuevo libro' : 'Editar libro'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-300"><X size={20}/></button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs text-gray-400 mb-1 block">Título *</label><input {...F('title')} required className="input"/></div>
                <div className="col-span-2"><label className="text-xs text-gray-400 mb-1 block">Autor *</label><input {...F('author')} required className="input"/></div>
                <div><label className="text-xs text-gray-400 mb-1 block">ISBN</label><input {...F('isbn')} className="input"/></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Categoría *</label><input {...F('category')} required className="input"/></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Copias totales</label><input type="number" min={1} {...F('total_copies')} className="input"/></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Ubicación</label><input {...F('location')} placeholder="Estante A-1" className="input"/></div>
                <div className="col-span-2"><label className="text-xs text-gray-400 mb-1 block">Descripción</label><textarea {...F('description')} rows={3} className="input resize-none"/></div>
                <div className="col-span-2"><label className="text-xs text-gray-400 mb-1 block">Tags (separados por coma)</label><input {...F('tags')} placeholder="ficcion,clasico" className="input"/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
