import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Moon, Droplet, Star, LogOut, Calendar as CalendarIcon, Sparkles, BookOpen } from 'lucide-react';
import { getMoonPhase, getCyclePhase } from '../utils/mysticMath';

interface UserProfile {
  id: string;
  full_name: string;
  last_period_date: string | null;
}

export default function Temple() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Místicos
  const [moon, setMoon] = useState<any>(null);
  const [cycle, setCycle] = useState<any>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPeriodDate, setNewPeriodDate] = useState('');

  useEffect(() => {
    // 1. Calcula Lua
    setMoon(getMoonPhase());
    // 2. Carrega Dados
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (data) {
      setProfile(data);
      // Calcula ciclo baseado no dado do banco
      setCycle(getCyclePhase(data.last_period_date));
    }
    setLoading(false);
  };

  const handleUpdateCycle = async () => {
    if (!profile || !newPeriodDate) return;

    const { error } = await supabase
      .from('profiles')
      .update({ last_period_date: newPeriodDate })
      .eq('id', profile.id);

    if (!error) {
      // Atualiza localmente
      const updatedCycle = getCyclePhase(newPeriodDate);
      setCycle(updatedCycle);
      setProfile({ ...profile, last_period_date: newPeriodDate });
      setIsModalOpen(false);
    } else {
      alert("Erro ao sintonizar ciclo.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/portal');
  };

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse">Sintonizando energias...</div>;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text pb-20 relative overflow-hidden font-sans">
      
      {/* Background Stars */}
      <div className="absolute inset-0 bg-stars opacity-50 pointer-events-none"></div>

      {/* --- HEADER --- */}
      <header className="p-6 flex justify-between items-center border-b border-netzach-border bg-netzach-bg/80 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-mystic text-netzach-gold">Olá, {profile?.full_name?.split(' ')[0]}</h2>
          <p className="text-xs text-netzach-muted tracking-widest uppercase">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <button onClick={handleLogout} className="text-netzach-muted hover:text-netzach-gold transition-colors">
          <LogOut size={20}/>
        </button>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-8 relative z-10">
        
        {/* --- MANDALA (Lua + Ciclo) --- */}
        <section className="grid grid-cols-2 gap-4">
          {/* Card Lua */}
          <div className="bg-netzach-card border border-netzach-border p-5 rounded-2xl flex flex-col items-center text-center shadow-[0_0_20px_rgba(112,11,151,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity"><Sparkles size={16}/></div>
            <Moon size={32} className="text-netzach-gold mb-3 animate-pulse" strokeWidth={1.5} />
            <h3 className="font-mystic text-lg text-white">Lua {moon?.phase}</h3>
            <p className="text-xs text-netzach-muted mt-1">{moon?.label}</p>
          </div>

          {/* Card Ciclo */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-netzach-card border border-netzach-border p-5 rounded-2xl flex flex-col items-center text-center shadow-[0_0_20px_rgba(112,11,151,0.15)] hover:border-netzach-gold transition-colors relative"
          >
            {cycle ? (
              <>
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                <Droplet size={32} className="text-rose-400 mb-3" strokeWidth={1.5} />
                <h3 className="font-mystic text-lg text-white">{cycle.name}</h3>
                <p className="text-xs text-netzach-muted mt-1">Dia {cycle.day} • {cycle.season}</p>
              </>
            ) : (
              <>
                <CalendarIcon size={32} className="text-netzach-muted mb-3" strokeWidth={1.5} />
                <h3 className="font-mystic text-lg text-netzach-muted">Meu Ciclo</h3>
                <p className="text-xs text-netzach-gold mt-1 underline">Configurar Início</p>
              </>
            )}
          </button>
        </section>

        {/* --- INSIGHT DO DIA (Tarô) --- */}
        <section className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-border rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-netzach-gold font-bold">Arcano da Semana</span>
              <h3 className="font-mystic text-2xl text-white mt-1">A Sacerdotisa</h3>
            </div>
            <Star className="text-netzach-gold opacity-50" size={24}/>
          </div>
          
          <div className="flex gap-4">
            {/* Placeholder da Carta */}
            <div className="w-24 h-36 bg-black/30 rounded border border-netzach-border shrink-0 flex items-center justify-center">
                <span className="text-xs text-netzach-muted">Carta</span>
            </div>
            <div className="text-sm text-netzach-text/80 leading-relaxed font-light">
              <p>Esta semana pede silêncio e intuição. Não force respostas externas; a verdade já reside em seu templo interior. Observe seus sonhos.</p>
              <div className="mt-3 flex items-center gap-2 text-netzach-gold text-xs font-bold uppercase tracking-wider cursor-pointer hover:underline">
                <BookOpen size={12}/> Ler interpretação completa
              </div>
            </div>
          </div>
        </section>

        {/* --- RECOMENDAÇÃO (Banho/Cristal) --- */}
        <section className="bg-netzach-card border border-netzach-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-netzach-bg border border-netzach-border flex items-center justify-center text-2xl">
                🌿
            </div>
            <div>
                <h4 className="font-mystic text-netzach-gold">Ritual Sugerido</h4>
                <p className="text-sm text-netzach-muted">Banho de <strong>Artemísia</strong> para potencializar a intuição da Lua {moon?.phase}.</p>
            </div>
        </section>

      </main>

      {/* --- MENU INFERIOR (PWA STYLE) --- */}
      <nav className="fixed bottom-0 w-full bg-[#0F0518]/95 backdrop-blur-md border-t border-netzach-border p-4 flex justify-around items-center z-30 pb-6 safe-area-pb">
        <button className="flex flex-col items-center gap-1 text-netzach-gold">
            <Moon size={20}/>
            <span className="text-[10px] uppercase tracking-wider font-bold">Templo</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors">
            <BookOpen size={20}/>
            <span className="text-[10px] uppercase tracking-wider">Aulas</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors">
            <Sparkles size={20}/>
            <span className="text-[10px] uppercase tracking-wider">Oráculo</span>
        </button>
      </nav>

      {/* --- MODAL DE CICLO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-netzach-card border border-netzach-gold/30 p-6 rounded-2xl w-full max-w-sm relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-netzach-muted hover:text-white"><LogOut className="rotate-180" size={20}/></button>
                
                <h3 className="font-mystic text-xl text-netzach-gold mb-2 text-center">Sintonizar Ciclo</h3>
                <p className="text-center text-sm text-netzach-muted mb-6">Quando foi o primeiro dia da sua última menstruação?</p>
                
                <input 
                    type="date" 
                    className="w-full p-4 bg-netzach-bg border border-netzach-border rounded-xl text-white text-center text-lg outline-none focus:border-netzach-gold mb-6"
                    value={newPeriodDate}
                    onChange={(e) => setNewPeriodDate(e.target.value)}
                />

                <button 
                    onClick={handleUpdateCycle}
                    className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-3 rounded-xl hover:bg-white transition-colors"
                >
                    Confirmar
                </button>
            </div>
        </div>
      )}

    </div>
  );
}