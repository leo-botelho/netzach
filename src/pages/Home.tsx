import { Link } from 'react-router-dom';
import { Moon, Star, Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans selection:bg-netzach-gold selection:text-netzach-bg overflow-hidden relative">
      
      {/* Estrelas de Fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-netzach-gold opacity-30 animate-pulse"><Star size={12}/></div>
        <div className="absolute top-40 right-20 text-netzach-gold opacity-20 animate-pulse delay-100"><Star size={16}/></div>
        <div className="absolute bottom-20 left-1/3 text-netzach-gold opacity-20 animate-pulse delay-300"><Star size={10}/></div>
      </div>

      {/* Navbar Transparente */}
      <nav className="p-6 flex justify-between items-center relative z-10">
        <div className="text-netzach-gold font-mystic text-xl tracking-widest font-bold flex items-center gap-2">
            <Moon size={24}/> NETZACH
        </div>
        <Link to="/portal" className="text-netzach-text hover:text-netzach-gold transition-colors text-sm uppercase tracking-wider font-bold border border-transparent hover:border-netzach-gold px-4 py-2 rounded-full">
            Área da Iniciada
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-4 pt-20 pb-32 relative z-10">
        
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-netzach-border bg-netzach-card/50 backdrop-blur-md mb-8">
            <Sparkles size={14} className="text-netzach-gold"/>
            <span className="text-[10px] uppercase tracking-[0.2em] text-netzach-muted">Clube de Estudos Místicos</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-mystic font-bold text-netzach-gold mb-6 leading-tight drop-shadow-[0_0_15px_rgba(197,160,89,0.3)]">
          Desperte sua<br/>Deusa Interior
        </h1>

        <p className="text-lg text-netzach-text/70 max-w-xl mb-10 leading-relaxed font-light">
          Uma jornada diária de autoconhecimento através da Astrologia, Tarô e da sabedoria do seu Ciclo Menstrual.
        </p>

        <div className="flex flex-col md:flex-row gap-4">
            <Link to="/assinar" className="bg-netzach-gold text-netzach-bg px-8 py-4 rounded-lg font-mystic font-bold text-lg hover:bg-white transition-all shadow-[0_0_20px_rgba(197,160,89,0.2)] flex items-center justify-center gap-2">
                Iniciar Jornada <ArrowRight size={20}/>
            </Link>
            <a href="#detalhes" className="px-8 py-4 rounded-lg border border-netzach-border text-netzach-muted hover:text-netzach-gold hover:border-netzach-gold transition-all font-sans uppercase tracking-widest text-xs flex items-center justify-center">
                Saber Mais
            </a>
        </div>

      </main>

      {/* Faixa Decorativa */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-netzach-border to-transparent"></div>
      
      <footer className="p-8 text-center text-netzach-muted text-xs tracking-widest uppercase">
        &copy; {new Date().getFullYear()} Raquel Basan • Terapia Holística
      </footer>
    </div>
  );
}