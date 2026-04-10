import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Users, Database, ChevronRight, MonitorPlay, Globe, Brush, BrainCircuit, GraduationCap, HeartHandshake, ChevronDown, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-white/5 hover:border-indigo-500/30 rounded-3xl bg-white/5 backdrop-blur-md overflow-hidden transition-all duration-500">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none group">
        <h4 className="text-lg md:text-xl font-semibold text-white group-hover:text-indigo-300 transition-colors">{question}</h4>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 transition-all duration-500 ${isOpen ? 'rotate-180 bg-indigo-500/20' : 'group-hover:bg-white/10'}`}>
           <ChevronDown className={`text-indigo-400`} />
        </div>
      </button>
      <div className={`px-6 md:px-8 transition-all duration-500 ease-in-out ${isOpen ? 'pb-8 opacity-100 max-h-96' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <p className="text-gray-400 text-lg leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post('/contact', contactForm);
      toast.success(data.message);
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Navbar con blur dinámico */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-white/5 ${scrolled ? 'bg-[#050505]/80 backdrop-blur-xl shadow-2xl py-2' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollTo('hero')}>
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-300">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-white text-lg tracking-tight leading-none group-hover:text-indigo-300 transition-colors">Biblioteca</p>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-1">Participativa</p>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-10 bg-white/5 px-8 py-3 rounded-full border border-white/10 backdrop-blur-md">
            <button onClick={() => scrollTo('hero')} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Inicio</button>
            <button onClick={() => scrollTo('about')} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Identidad</button>
            <button onClick={() => scrollTo('operativa')} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Programa</button>
            <button onClick={() => scrollTo('faq')} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">FAQ</button>
            <button onClick={() => scrollTo('contacto')} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Contacto</button>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link to={user.role === 'admin' ? '/admin' : '/catalog'} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full px-6 py-2.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:shadow-indigo-600/40 hover:scale-105">
                <MonitorPlay size={18} /> Ir a la biblioteca
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:flex text-gray-300 hover:text-white text-sm font-bold items-center gap-2 px-4 transition-colors">
                   Ingresar
                </Link>
                <Link to="/register" className="bg-white text-black hover:bg-gray-200 rounded-full px-7 py-2.5 text-sm font-bold shadow-xl transition-transform hover:scale-105">
                  Sumarse a la biblioteca
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section id="hero" className="relative pt-40 pb-32 md:pt-56 md:pb-40 overflow-hidden min-h-screen flex items-center justify-center text-center">
          <div className="absolute inset-0 z-0">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] mix-blend-screen pointer-events-none"></div>
            <img src="/images/hero.png" alt="Library Background" className="w-full h-full object-cover opacity-[0.15] mix-blend-screen" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full flex flex-col items-center">
            <div className="max-w-4xl space-y-10 animate-fade-in flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-xl shadow-lg">
                <Globe size={16} /> Beta Launch 2026
              </div>
              <h1 className="text-6xl md:text-[5.5rem] font-black tracking-tighter leading-[1.05]">
                Más que una biblioteca, un <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 drop-shadow-lg">
                  ecosistema de talento.
                </span>
              </h1>
              <p className="text-lg md:text-2xl text-gray-400 max-w-3xl leading-relaxed font-light">
                La Biblioteca Participativa nace de una idea simple: el conocimiento crece cuando se comparte. Surgió como un programa de liderazgo ad honorem para transformar nuestra terraza en un entorno cultural activo. Queremos visibilizar que somos lectores y mentes curiosas con ganas de conectar a través de los libros.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5 pt-8 w-full sm:w-auto">
                <Link to="/catalog" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 flex items-center justify-center gap-3 py-4 px-10 rounded-full text-lg font-bold shadow-2xl shadow-indigo-600/20 transition-all hover:scale-105 hover:shadow-indigo-600/40 w-full sm:w-auto">
                  Visitar la biblioteca <ChevronRight size={20} />
                </Link>
                {!user && (
                  <Link to="/register" className="bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 flex items-center justify-center py-4 px-10 rounded-full text-lg font-bold transition-all w-full sm:w-auto">
                    Sumarse Ahora
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* IDENTIDAD INSTITUCIONAL SECTION */}
        <section id="about" className="py-32 relative overflow-hidden">
          {/* Subtle separator */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-14">
                <div className="space-y-6">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest uppercase text-gray-300">
                    Propósito Institucional
                  </div>
                  <h3 className="text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">Nuestra esencia <br/>y proyecciones.</h3>
                </div>
                
                <div className="space-y-10 relative z-10">
                  <div className="flex gap-6 group">
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-indigo-600/20 group-hover:border-indigo-500/50 group-hover:scale-110 transition-all duration-500 shadow-xl">
                      <Search className="text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.8)]" size={30} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-white mb-3">Misión</h4>
                      <p className="text-gray-400 text-lg leading-relaxed">Activar la circulación de conocimiento y talento dentro de nuestra comunidad, transformando espacios físicos y digitales en nodos de aprendizaje, arte y pensamiento crítico.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-6 group">
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-purple-600/20 group-hover:border-purple-500/50 group-hover:scale-110 transition-all duration-500 shadow-xl">
                      <Globe className="text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]" size={30} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-white mb-3">Visión</h4>
                      <p className="text-gray-400 text-lg leading-relaxed">Ser el sistema cultural de referencia en el entorno laboral, logrando una infraestructura escalable donde cada colaborador sea protagonista de su propio desarrollo y el de sus pares.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative order-first lg:order-last mb-16 lg:mb-0 group cursor-default">
                {/* Glowing aesthetic backplate */}
                <div className="absolute -inset-8 bg-gradient-to-tr from-indigo-600/40 to-pink-600/40 rounded-[3rem] blur-3xl group-hover:opacity-100 opacity-60 transition-opacity duration-700"></div>
                <div className="relative rounded-[2.5rem] p-3 bg-white/5 border border-white/10 backdrop-blur-sm">
                  <img src="/images/vision.png" alt="Vision del futuro" className="rounded-[2rem] w-full object-cover aspect-square md:aspect-auto shadow-2xl transition-transform duration-700" />
                </div>
              </div>
            </div>

            <div className="mt-40">
              <div className="text-center mb-16">
                 <h3 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">Nuestros <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 drop-shadow-md">Valores</span></h3>
                 <p className="text-xl text-gray-400 max-w-2xl mx-auto">Cuatro pilares inquebrantables que sostienen y dan vida a nuestro ecosistema de intercambio cultural.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="p-10 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:border-indigo-500/50 transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.3)] group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
                  <Brush className="text-indigo-400 mb-8 drop-shadow-[0_0_15px_rgba(129,140,248,0.8)] relative z-10" size={40} />
                  <h4 className="text-3xl font-black text-white mb-4 tracking-tighter relative z-10">Arte</h4>
                  <p className="text-gray-400 text-lg leading-relaxed relative z-10 font-light">Reconocemos la creación estética como una forma vital de saber.</p>
                </div>
                
                <div className="p-10 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_40px_-15px_rgba(168,85,247,0.3)] group relative overflow-hidden lg:translate-y-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-500"></div>
                  <BrainCircuit className="text-purple-400 mb-8 drop-shadow-[0_0_15px_rgba(192,132,252,0.8)] relative z-10" size={40} />
                  <h4 className="text-3xl font-black text-white mb-4 tracking-tighter relative z-10">Pensamiento</h4>
                  <p className="text-gray-400 text-lg leading-relaxed relative z-10 font-light">Fomentamos la reflexión crítica y la creatividad constante.</p>
                </div>
                
                <div className="p-10 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:border-pink-500/50 transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_40px_-15px_rgba(236,72,153,0.3)] group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl group-hover:bg-pink-500/20 transition-colors duration-500"></div>
                  <GraduationCap className="text-pink-400 mb-8 drop-shadow-[0_0_15px_rgba(244,114,182,0.8)] relative z-10" size={40} />
                  <h4 className="text-3xl font-black text-white mb-4 tracking-tighter relative z-10">Educación</h4>
                  <p className="text-gray-400 text-lg leading-relaxed relative z-10 font-light">Creemos en la transmisión directa y generosa de saberes.</p>
                </div>
                
                <div className="p-10 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:border-emerald-500/50 transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)] group relative overflow-hidden lg:translate-y-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
                  <HeartHandshake className="text-emerald-400 mb-8 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)] relative z-10" size={40} />
                  <h4 className="text-3xl font-black text-white mb-4 tracking-tighter relative z-10">Xenofilia</h4>
                  <p className="text-gray-400 text-lg leading-relaxed relative z-10 font-light">Cultivamos el interés por lo diverso y lo nuevo como pilar comunitario.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECCION OPERATIVA */}
        <section id="operativa" className="py-32 relative">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
           <div className="max-w-7xl mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-20">
                 <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest uppercase text-gray-300 mb-6">Mecánica</div>
                 <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">¿Cómo funciona el programa?</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all duration-500 group">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                     <MonitorPlay className="text-indigo-400" size={30} />
                  </div>
                  <h4 className="text-2xl font-bold mb-4 text-white">Gestión Digital</h4>
                  <p className="text-gray-400 text-lg leading-relaxed font-light">Usamos herramientas ágiles y esta propia Landing inteligente para que pedir un libro, o registrarte en el sistema, sea cuestión de segundos.</p>
                </div>
                
                <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all duration-500 group">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                     <Users className="text-emerald-400" size={30} />
                  </div>
                  <h4 className="text-2xl font-bold mb-4 text-white">Espacios Activos</h4>
                  <p className="text-gray-400 text-lg leading-relaxed font-light">Una biblioteca vibrante para cuidar y rotar nuestros más de 400 libros, pensada estructuralmente para el intercambio ágil de saberes y la lectura.</p>
                </div>
                
                <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all duration-500 group">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                     <Database className="text-pink-400" size={30} />
                  </div>
                  <h4 className="text-2xl font-bold mb-4 text-white">Sostenibilidad</h4>
                  <p className="text-gray-400 text-lg leading-relaxed font-light">Impulsamos un modelo colaborativo dedicado fervientemente al mantenimiento, crecimiento y cuidado de ejemplares físicos al alcance de tu mano.</p>
                </div>
              </div>
           </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-32 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
          
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <div className="text-center mb-20">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest uppercase text-gray-300 mb-6">Claridad ante todo</div>
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">Preguntas Frecuentes</h3>
            </div>
            
            <div className="space-y-6">
              <FAQItem 
                question="¿Quiénes pueden participar?" 
                answer="Cualquier miembro de la comunidad es libre de sumarse. Ya sea como lectores dedicados o mentes curiosas, el espacio está abierto para fomentar el conocimiento colectivo."
              />
              <FAQItem 
                question="¿Cómo retiro un libro?" 
                answer="Es 100% digital. Escaneas el QR en la biblioteca al pasar a retirar o realizas tu reserva directo en el catálogo, y ¡listo! El panel del administrador automatiza el flujo del ejemplar."
              />
              <FAQItem 
                question="¿Cómo me sumo?" 
                answer="Sólo hace falta que le des click al botón de Registrarte y llenes una breve información de la cuenta para tu ingreso oficial al catálogo. Desde allí adentro operás todo el flujo."
              />
            </div>
          </div>
        </section>

        {/* CONTACT FORM & CTA */}
        <section id="contacto" className="py-32 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10 text-center lg:text-left">
                <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest uppercase text-gray-300">
                  Desplega tus alas
                </div>
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05]">
                  Sumate a la <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">comunidad</span>
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed font-light">
                  El futuro del conocimiento es participativo. Si tenés dudas, ideas para dar una clase o querés donar material, escribinos y te contactaremos a la brevedad.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start pt-4 w-full sm:w-auto">
                  <Link to="/register" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center justify-center gap-3 py-4 px-10 rounded-full text-lg font-bold shadow-2xl shadow-indigo-600/20 transition-all hover:scale-105 hover:shadow-indigo-600/40">
                    Sumarse Ahora
                  </Link>
                  <Link to="/catalog" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all duration-300 flex items-center justify-center py-4 px-10 rounded-full text-lg font-bold">
                    Visitar la biblioteca
                  </Link>
                </div>
              </div>

              {/* Formulario Glassmorphism */}
              <div className="relative group">
                {/* Glowing border effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="bg-[#0a0a0a] border border-white/10 p-10 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden backdrop-blur-2xl">
                  {/* Decorative internal shapes */}
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                  
                  <h3 className="text-3xl font-extrabold mb-8 flex items-center gap-4 text-white">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <Send size={20} className="text-indigo-400"/>
                    </div>
                    Consultas
                  </h3>
                  
                  <form onSubmit={handleContactSubmit} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Asunto / Área</label>
                        <input type="text" required value={contactForm.subject} onChange={e=>setContactForm({...contactForm, subject: e.target.value})} placeholder="Ej: Donación de libros" className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Tu Nombre</label>
                        <input type="text" required value={contactForm.name} onChange={e=>setContactForm({...contactForm, name: e.target.value})} placeholder="Nombre completo" className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Correo de Contacto</label>
                      <input type="email" required value={contactForm.email} onChange={e=>setContactForm({...contactForm, email: e.target.value})} placeholder="tu@email.com" className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Mensaje</label>
                      <textarea required rows={4} value={contactForm.message} onChange={e=>setContactForm({...contactForm, message: e.target.value})} placeholder="Compartí tu idea con la administración..." className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"></textarea>
                    </div>
                    <button type="submit" disabled={sending} className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-2xl text-lg font-bold transition-transform hover:scale-[1.02] shadow-xl mt-4">
                      {sending ? 'Procesando envío...' : 'Enviar Mensaje Seguro'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-black py-12 border-t border-white/5 text-center text-sm text-gray-500 relative z-10">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center border border-indigo-500/20">
                  <BookOpen size={16} className="text-indigo-400" />
               </div>
               <span className="font-bold text-gray-300 tracking-widest text-[11px] uppercase">Biblioteca Participativa © 2026</span>
            </div>
            <div className="flex gap-8 font-medium">
               <span className="hover:text-white cursor-pointer transition-colors">Términos del Catálogo</span>
               <span className="hover:text-white cursor-pointer transition-colors">Normas del Rooftop</span>
            </div>
         </div>
      </footer>
    </div>
  );
}
