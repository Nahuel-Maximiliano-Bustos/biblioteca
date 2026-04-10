import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [adminId, setAdminId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Get all users to find an admin
    api.get('/auth/me').catch(() => {});
    // Load messages with admin
    const load = () => api.get('/messages').then(r => {
      if (user.role === 'user') {
        setMessages(r.data.messages || []);
      }
    }).catch(() => {});
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      // Find admin id from first message or use 1 (default admin)
      const receiverId = messages.find(m => m.sender_role === 'admin')?.sender_id || 1;
      const { data } = await api.post('/messages', { receiver_id: receiverId, content: content.trim() });
      setMessages(m => [...m, { ...data.message, sender_name: user.full_name, sender_role: 'user' }]);
      setContent('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const clearMessages = async () => {
    if (!confirm('¿Borrar definitivamente todo tu historial de mensajes?')) return;
    try {
      await api.delete('/messages/clear');
      setMessages([]);
      toast.success('Bandeja de mensajes limpiada');
    } catch { toast.error('Error al limpiar mensajes'); }
  };

  const isMyMsg = (msg) => msg.sender_id === user.id;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">Mensajes</h1>
      <div className="card flex flex-col" style={{ height: '60vh' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">A</div>
            <div>
              <p className="text-sm font-medium text-white">Administración</p>
              <p className="text-xs text-gray-500">Soporte de biblioteca</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearMessages} className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-colors">
              Limpiar chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 py-10">
              <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay mensajes. ¡Iniciá la conversación!</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={msg.id || i} className={`flex ${isMyMsg(msg) ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm ${isMyMsg(msg) ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm'}`}>
                {!isMyMsg(msg) && <p className="text-xs font-medium text-indigo-400 mb-0.5">{msg.sender_name}</p>}
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isMyMsg(msg) ? 'text-indigo-300' : 'text-gray-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={send} className="px-4 py-3 border-t border-gray-800 flex gap-2">
          <input
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="Escribí un mensaje..."
            className="input flex-1 py-2"
            id="message-input"
          />
          <button type="submit" disabled={sending || !content.trim()} className="btn-primary px-4 py-2">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
