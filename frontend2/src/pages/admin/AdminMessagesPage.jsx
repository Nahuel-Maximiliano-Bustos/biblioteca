import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Send, ChevronRight, Archive, ArchiveRestore, Tag, Trash2, CheckCircle2, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [filterTab, setFilterTab] = useState('active'); // active | archived | deleted
  const [isComposing, setIsComposing] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [composeUserId, setComposeUserId] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const messagesEndRef = useRef(null);

  const loadThreads = () => api.get('/messages').then(r => setThreads(r.data.threads || [])).catch(() => {});
  const loadConversation = (uid) => api.get(`/messages/${uid}`).then(r => setMessages(r.data.messages || [])).catch(() => {});

  useEffect(() => { loadThreads(); const i = setInterval(loadThreads, 10000); return () => clearInterval(i); }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadConversation(selectedUserId);
      const i = setInterval(() => loadConversation(selectedUserId), 5000);
      return () => clearInterval(i);
    }
  }, [selectedUserId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!content.trim() || !selectedUserId) return;
    setSending(true);
    try {
      const { data } = await api.post('/messages', { receiver_id: selectedUserId, content: content.trim() });
      setMessages(m => [...m, { ...data.message, sender_name: user.full_name, sender_role: 'admin' }]);
      setContent('');
      loadThreads();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar');
    } finally { setSending(false); }
  };

  const currentThread = threads.find(t => t.other_user_id === selectedUserId);

  const actOnThread = async (endpoint, payload = {}, msgSuccess) => {
    try {
      await (payload ? api.put(`/messages/thread/${selectedUserId}/${endpoint}`, payload) : api.delete(`/messages/thread/${selectedUserId}/${endpoint}`));
      toast.success(msgSuccess);
      loadThreads();
      if (endpoint === 'clear' || endpoint === 'hard-delete') {
        setSelectedUserId(null);
        setMessages([]);
      }
    } catch { toast.error('Error al realizar la acción'); }
  };

  const filteredThreads = threads.filter(t => {
    if (filterTab === 'deleted') return t.is_deleted === 1;
    if (t.is_deleted === 1) return false;
    return filterTab === 'archived' ? t.is_archived === 1 : t.is_archived !== 1;
  });

  const openCompose = async () => {
    setIsComposing(true);
    setSelectedUserId(null);
    try {
      const res = await api.get('/users?limit=1000');
      setUsersList(res.data.users);
    } catch { toast.error('Error al cargar usuarios'); }
  };

  const sendNewMessage = async (e) => {
    e.preventDefault();
    if (!composeContent.trim() || !composeUserId) return;
    setSending(true);
    try {
      await api.post('/messages', { receiver_id: composeUserId, content: composeContent.trim() });
      toast.success('Mensaje enviado');
      setIsComposing(false);
      setComposeContent('');
      loadThreads();
      setSelectedUserId(parseInt(composeUserId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar');
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Mensajería</h1>

      <div className="card flex overflow-hidden" style={{ height: '65vh' }}>
        {/* Thread list */}
        <div className="w-64 border-r border-gray-800 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
               <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Bandejas</div>
               <button onClick={openCompose} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1.5 rounded flex items-center gap-1 shadow-md transition-colors">
                 <Plus size={14} /> Nuevo
               </button>
            </div>
            <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
               <button onClick={() => setFilterTab('active')} className={`flex-1 py-1.5 text-xs rounded-md transition-all ${filterTab === 'active' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Activos</button>
               <button onClick={() => setFilterTab('archived')} className={`flex-1 py-1.5 text-xs rounded-md transition-all ${filterTab === 'archived' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Archivo</button>
               <button onClick={() => setFilterTab('deleted')} className={`flex-1 py-1.5 text-xs rounded-md transition-all ${filterTab === 'deleted' ? 'bg-red-900/50 text-red-100 shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Papelera</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? <p className="text-gray-600 text-sm text-center mt-6">Bandeja vacía</p> : filteredThreads.map(t => (
              <button key={t.other_user_id} onClick={() => { setSelectedUserId(t.other_user_id); setIsComposing(false); }} className={`w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors flex items-center gap-3 ${selectedUserId === t.other_user_id && !isComposing ? 'bg-gray-800' : ''}`}>
                <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">{t.other_user_name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-white truncate">{t.other_user_name}</p>
                    {t.is_archived === 1 && <Archive size={10} className="text-gray-500" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{t.last_message || '—'}</p>
                  <p className="text-[10px] text-indigo-400 mt-0.5">{t.category || 'General'}</p>
                </div>
                {t.unread_count > 0 && <span className="bg-indigo-600 text-white text-xs px-1.5 rounded-full shrink-0">{t.unread_count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {isComposing ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900 border-l border-gray-800 relative">
              <button onClick={() => setIsComposing(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">&times; Cancelar</button>
              <div className="w-full max-w-lg space-y-4 bg-[#0a0a0a] p-8 rounded-2xl border border-gray-800 shadow-2xl">
                 <h2 className="text-2xl font-bold text-white mb-6">Nuevo Mensaje</h2>
                 
                 <div>
                   <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Destinatario</label>
                   <div className="relative">
                     <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                     <input type="text" placeholder="Buscar por nombre..." value={userSearch} onChange={e=>setUserSearch(e.target.value)} className="w-full mb-2 bg-[#111] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                   </div>
                   <div className="max-h-48 overflow-y-auto bg-[#111] border border-gray-800 rounded-lg slim-scroll p-2 space-y-1">
                     {usersList.filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase())).length === 0 ? (
                       <p className="text-gray-500 text-sm text-center py-4">No se encontraron usuarios</p>
                     ) : (
                       usersList.filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                         <button key={u.id} onClick={() => setComposeUserId(u.id)} className={`w-full text-left px-4 py-2.5 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-3 ${composeUserId == u.id ? 'bg-indigo-600/20 shadow-[inset_2px_0_0_#6366f1]' : 'text-gray-300'}`}>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${composeUserId == u.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{u.full_name[0]}</div>
                           <div className="min-w-0 flex-1">
                             <p className={`text-sm font-semibold truncate ${composeUserId == u.id ? 'text-indigo-400' : 'text-gray-200'}`}>{u.full_name}</p>
                             <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                           </div>
                           {composeUserId == u.id && <CheckCircle2 size={16} className="text-indigo-500 shrink-0"/>}
                         </button>
                       ))
                     )}
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Mensaje</label>
                   <textarea rows={4} value={composeContent} onChange={e=>setComposeContent(e.target.value)} placeholder="Escribí el cuerpo del mensaje..." className="w-full bg-[#111] border border-gray-800 rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"></textarea>
                 </div>
                 
                 <button onClick={sendNewMessage} disabled={sending || !composeContent.trim() || !composeUserId} className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-4 rounded-xl">
                   {sending ? 'Enviando...' : <><Send size={18} /> Iniciar Conversación</>}
                 </button>
              </div>
            </div>
          ) : !selectedUserId ? (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              <div className="text-center"><ChevronRight size={36} className="mx-auto mb-2 rotate-180 opacity-30" /><p className="text-sm">Seleccioná una conversación</p></div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">{currentThread?.other_user_name?.[0]}</div>
                  <div>
                    <span className="font-semibold text-white text-sm">{currentThread?.other_user_name}</span>
                    <p className="text-xs text-gray-500">
                      {currentThread?.category || 'General'} {currentThread?.is_archived === 1 && '(Archivado)'}
                    </p>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {currentThread?.is_deleted === 1 ? (
                    <>
                      <button onClick={() => actOnThread('restore', null, 'Hilo restaurado')} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded" title="Restaurar hilo">
                        Restaurar
                      </button>
                      <button onClick={() => { if(confirm('¿Destruir hilo permanentemente? Esta acción es irreversible.')) actOnThread('hard-delete', null, 'Hilo destruido de la base de datos'); }} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded" title="Eliminación permanente">
                        Eliminar final
                      </button>
                    </>
                  ) : (
                    <>
                      <select 
                        value={currentThread?.category || 'General'} 
                        onChange={e => actOnThread('category', { category: e.target.value }, 'Categoría actualizada')} 
                        className="text-xs bg-gray-800 border-none rounded px-2 py-1.5 focus:ring-1 outline-none text-gray-300"
                      >
                        <option value="General">General</option>
                        <option value="Soporte">Soporte</option>
                        <option value="Sugerencia">Sugerencia</option>
                        <option value="Queja">Queja</option>
                      </select>

                      <button onClick={() => actOnThread('archive', { is_archived: currentThread?.is_archived ? 0 : 1 }, 'Estado de archivo actualizado')} className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded" title={currentThread?.is_archived ? 'Desarchivar' : 'Archivar'}>
                        {currentThread?.is_archived ? <ArchiveRestore size={16}/> : <Archive size={16}/>}
                      </button>

                      <button onClick={() => actOnThread('read', {}, 'Marcado como leído')} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded" title="Marcar como leído">
                        <CheckCircle2 size={16}/>
                      </button>

                      <button onClick={() => actOnThread('clear', null, 'Enviado a papelera')} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded" title="Enviar a papelera">
                        <Trash2 size={16}/>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={msg.id || i} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm ${msg.sender_id === user.id ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm'}`}>
                      {msg.sender_id !== user.id && <p className="text-xs font-medium text-indigo-400 mb-0.5">{msg.sender_name}</p>}
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-indigo-300' : 'text-gray-500'}`}>{new Date(msg.created_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={send} className="px-4 py-3 border-t border-gray-800 flex gap-2">
                <input value={content} onChange={e => setContent(e.target.value)} placeholder="Escribí un mensaje..." className="input flex-1 py-2" id="admin-message-input" />
                <button type="submit" disabled={sending || !content.trim()} className="btn-primary px-4 py-2"><Send size={16}/></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
