import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { ScanFace, CheckCircle2, History, RotateCcw } from 'lucide-react';

export default function AdminScannerPage() {
  const [logs, setLogs] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);

  const handleScan = async (result) => {
    if (processing) return;
    
    // Support both the array of results and a single result string
    let tokenValue = '';
    if (Array.isArray(result) && result.length > 0) {
      tokenValue = result[0]?.rawValue || result[0]?.text;
    } else if (typeof result === 'string') {
      tokenValue = result;
    } else if (result && typeof result === 'object') {
      tokenValue = result.rawValue || result.text;
    }

    if (!tokenValue) return;

    setProcessing(true);
    try {
      let token = tokenValue;
      // If it's a JSON string, extract the token
      if (tokenValue.startsWith('{')) {
        try {
          const parsed = JSON.parse(tokenValue);
          token = parsed.token || tokenValue;
        } catch (e) {
          // Fallback to raw value if parse fails
        }
      }

      const response = await api.post('/loans/scan', { token });
      toast.success(response.data.message);
      
      const newLog = {
        time: new Date(),
        loan: response.data.loan,
        msg: response.data.message
      };
      
      setLogs(prev => [newLog, ...prev].slice(0, 50));
      setScannedResult(newLog);
      
    } catch (e) {
      toast.error(e.response?.data?.error || 'Código QR no válido o irreconocible');
    } finally {
      setTimeout(() => setProcessing(false), 3000); // Wait before allowing next scan
    }
  };

  const resetScanner = () => setScannedResult(null);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScanFace className="text-indigo-500" /> Control de Escáner
          </h1>
          <p className="text-gray-400 text-sm mt-1">Escaneá el Boleto QR del usuario para Entregar o Devolver libros</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Column */}
        <div className="space-y-4">
          <div className="card p-4 overflow-hidden relative min-h-[400px] flex flex-col items-center justify-center bg-gray-900 border-dashed border-2 border-gray-700/50">
             {scannedResult ? (
               <div className="text-center w-full animate-fade-in space-y-6 py-8">
                 <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                   <CheckCircle2 size={40} />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-xl font-bold text-white">¡Módulo Aprobado!</h3>
                   <p className="text-gray-400">{scannedResult.msg}</p>
                 </div>
                 <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 max-w-xs mx-auto text-left space-y-2">
                   <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Titular</p>
                   <p className="text-sm text-white font-medium">{scannedResult.loan.user_name}</p>
                   <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-2">Libro</p>
                   <p className="text-sm text-white font-medium">{scannedResult.loan.book_title}</p>
                 </div>
                 <button onClick={resetScanner} className="btn-primary inline-flex items-center gap-2 mt-4">
                   <RotateCcw size={16} /> Escanear otro
                 </button>
               </div>
             ) : (
               <div className="w-full max-w-md mx-auto aspect-square overflow-hidden rounded-2xl border-2 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                  <Scanner onScan={handleScan} allowMultiple={true} />
               </div>
             )}
          </div>
          
          <div className="bg-amber-900/20 border border-amber-800/30 p-4 rounded-xl">
             <h4 className="text-amber-400 font-semibold mb-1 text-sm">¿Cómo funciona?</h4>
             <p className="text-xs text-amber-200/70">Si el cliente reservó, al escanear se entregará el libro. Si el cliente lo tiene retirado, al escanear regresará el libro al stock automáticamente.</p>
          </div>
        </div>

        {/* Logs Column */}
        <div className="card flex flex-col" style={{ maxHeight: '70vh' }}>
          <div className="px-5 py-4 border-b border-gray-800 font-semibold text-white flex items-center gap-2">
            <History size={18} className="text-indigo-400" /> Registro de Operaciones (Logs)
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 relative">
            {logs.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                No hay escaneos recientes
              </div>
            ) : logs.map((log, i) => (
              <div key={i} className="p-3 bg-gray-800/30 hover:bg-gray-800/50 transition-colors border border-gray-800 rounded-xl flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.loan.status === 'active' ? 'bg-amber-900/30 text-amber-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                  <CheckCircle2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{log.loan.book_title}</p>
                  <p className="text-xs text-gray-500 truncate">{log.loan.user_name} • {log.msg}</p>
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  {log.time.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
