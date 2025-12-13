import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Moon, Droplet, Star, LogOut, Calendar as CalendarIcon, Sparkles, BookOpen, Sun, MessageSquare, X } from 'lucide-react';
import { getMoonPhase, calculateCycleStatus } from '../utils/mysticMath';

interface UserProfile {
  id: string;
  full_name: string;
  last_period_date: string | null;
  cycle_duration?: number;
  sign_sun?: string;
}

export default function Temple() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados Místicos
  const [moon, setMoon] = useState<any>(null);
  const [cycle, setCycle] = useState<any>(null);
  
  // Dados do Admin (Raquel)
  const [horoscope, setHoroscope] = useState<{ sky: string, sign: string }>({ sky: '', sign: '' });
  
  // ATUALIZADO: Estado do Insight Diário
  const [dailyInsight, setDailyInsight] = useState<{ 
    tarot: string, 
    bath: string, 
    image: string,
    meaning: string
  }>({ tarot: '', bath: '', image: '', meaning: '' });

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArcanoModalOpen, setIsArcanoModalOpen] = useState(false);
  const [newPeriodDate, setNewPeriodDate] = useState('');

  useEffect(() => {
    setMoon(getMoonPhase());
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');

    // 1. Busca Perfil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      
      // Calcula Ciclo
      if (profileData.last_period_date) {
        setCycle(calculateCycleStatus(profileData.last_period_date, profileData.cycle_duration || 28));
      }

      // 2. Busca Céu da Semana (Geral)
      const { data: skyData } = await supabase
        .from('horoscopes')
        .select('content')
        .or('sign.eq.Geral,sign.eq.geral,sign.eq.ceu_semana')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // 3. Busca Previsão do Signo
      let signData = null;
      if (profileData.sign_sun) {
        const { data } = await supabase
            .from('horoscopes')
            .select('content')
            .eq('sign', profileData.sign_sun.toLowerCase())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        signData = data;
      }

      setHoroscope({
        sky: skyData?.content || '',
        sign: signData?.content || ''
      });

      // 4. Busca Insight do Dia (Arcano e Banho) - ATUALIZADO
      const { data: insightData } = await supabase
        .from('daily_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (insightData) {
        setDailyInsight({
            tarot: insightData.tarot_card_id || 'O Mistério',
            bath: insightData.recommended_bath || 'Banho de Ervas',
            image: insightData.card_image_url || '',
            meaning: insightData.card_meaning || 'A Sacerdotisa ainda está interpretando as cartas...'
        });
      }
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
      const updatedCycle = calculateCycleStatus(newPeriodDate, profile.cycle_duration || 28);
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
    <div className="min-h-screen bg-netzach-bg text-netzach-text pb-24 relative overflow-hidden font-sans">
      
      <div className="absolute inset-0 bg-stars opacity-50 pointer-events-none"></div>

      {/* HEADER */}
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
        
        {/* MANDALA (Lua + Ciclo) */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-netzach-card border border-netzach-border p-5 rounded-2xl flex flex-col items-center text-center shadow-[0_0_20px_rgba(112,11,151,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity"><Sparkles size={16}/></div>
            <Moon size={32} className="text-netzach-gold mb-3 animate-pulse" strokeWidth={1.5} />
            <h3 className="font-mystic text-lg text-white">Lua {moon?.phase}</h3>
            <p className="text-xs text-netzach-muted mt-1">{moon?.label}</p>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-netzach-card border border-netzach-border p-5 rounded-2xl flex flex-col items-center text-center shadow-[0_0_20px_rgba(112,11,151,0.15)] hover:border-netzach-gold transition-colors relative">
            {cycle ? (
              <>
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${cycle.isLate ? 'bg-red-500 animate-pulse' : 'bg-green-500'} shadow-[0_0_8px_rgba(34,197,94,0.8)]`}></div>
                <Droplet size={32} className="text-rose-400 mb-3" strokeWidth={1.5} />
                <h3 className="font-mystic text-lg text-white">{cycle.phaseName}</h3>
                <p className="text-xs text-netzach-muted mt-1">Dia {cycle.dayOfCycle}</p>
                <p className={`text-[10px] uppercase tracking-wider mt-2 ${cycle.isLate ? 'text-red-400' : 'text-netzach-gold'}`}>{cycle.statusText}</p>
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

        {/* INSIGHT DO DIA (Arcano) - ATUALIZADO */}
        <section className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-border rounded-2xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-netzach-gold font-bold">Arcano da Semana</span>
              <h3 className="font-mystic text-2xl text-white mt-1">{dailyInsight.tarot}</h3>
            </div>
            <button onClick={() => setIsArcanoModalOpen(true)} className="text-netzach-gold hover:text-white transition-colors">
                <Star size={24}/>
            </button>
          </div>
          
          <div className="flex gap-4">
            {dailyInsight.image ? (
                <img 
                    src={dailyInsight.image} 
                    alt={dailyInsight.tarot} 
                    className="w-24 h-36 object-cover rounded border border-netzach-border shadow-md cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setIsArcanoModalOpen(true)}
                />
            ) : (
                <div className="w-24 h-36 bg-black/30 rounded border border-netzach-border shrink-0 flex items-center justify-center">
                    <span className="text-xs text-netzach-muted">Carta</span>
                </div>
            )}
            
            <div className="text-sm text-netzach-text/80 leading-relaxed font-light flex flex-col justify-between">
              <p className="line-clamp-4">{dailyInsight.meaning}</p>
              
              <button 
                onClick={() => setIsArcanoModalOpen(true)}
                className="mt-2 flex items-center gap-2 text-netzach-gold text-xs font-bold uppercase tracking-wider cursor-pointer hover:underline"
              >
                <BookOpen size={12}/> Ler interpretação
              </button>
            </div>
          </div>
        </section>

        {/* ASTROLOGIA (Céu e Pessoal) */}
        {(horoscope.sky || horoscope.sign) && (
            <section className="space-y-4">
                {horoscope.sky && (
                    <div className="bg-netzach-card border border-netzach-border rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><Sun size={48}/></div>
                        <h4 className="font-mystic text-netzach-gold mb-3 flex items-center gap-2 relative z-10"><Sun size={18}/> Céu da Semana</h4>
                        <p className="text-sm text-netzach-text/90 leading-relaxed relative z-10 font-light whitespace-pre-wrap">{horoscope.sky}</p>
                    </div>
                )}
                
                {profile?.sign_sun && (
                    <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-border rounded-xl p-5 relative">
                        <h4 className="font-mystic text-white mb-3 flex items-center gap-2"><Star size={18} className="text-netzach-gold"/> Horóscopo: {profile.sign_sun}</h4>
                        {horoscope.sign ? (
                            <p className="text-sm text-netzach-text/90 leading-relaxed font-light whitespace-pre-wrap">{horoscope.sign}</p>
                        ) : (
                            <p className="text-netzach-muted text-xs italic">Ainda sem previsão específica para seu signo.</p>
                        )}
                    </div>
                )}
            </section>
        )}

        {/* RITUAL SUGERIDO */}
        <section className="bg-netzach-card border border-netzach-border rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-netzach-gold/50 transition-colors" onClick={() => navigate('/rituais')}>
            <div className="w-12 h-12 rounded-full bg-netzach-bg border border-netzach-border flex items-center justify-center text-2xl">🌿</div>
            <div>
                <h4 className="font-mystic text-netzach-gold">Ritual Sugerido</h4>
                <p className="text-sm text-netzach-muted">{dailyInsight.bath}</p>
            </div>
        </section>

      </main>

      {/* MENU INFERIOR */}
      <nav className="fixed bottom-0 w-full bg-[#0F0518]/95 backdrop-blur-md border-t border-netzach-border p-4 flex justify-around items-center z-30 pb-6 safe-area-pb">
        <button onClick={() => navigate('/templo')} className="flex flex-col items-center gap-1 text-netzach-gold"><Moon size={20}/><span className="text-[10px] uppercase tracking-wider font-bold">Templo</span></button>
        <button onClick={() => navigate('/servicos')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors"><MessageSquare size={20}/><span className="text-[10px] uppercase tracking-wider">Serviços</span></button>
        <button onClick={() => navigate('/rituais')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors"><BookOpen size={20}/><span className="text-[10px] uppercase tracking-wider">Grimório</span></button>
      </nav>

      {/* MODAL CICLO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-netzach-card border border-netzach-gold/30 p-6 rounded-2xl w-full max-w-sm relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-netzach-muted hover:text-white"><LogOut className="rotate-180" size={20}/></button>
                <h3 className="font-mystic text-xl text-netzach-gold mb-2 text-center">Sintonizar Ciclo</h3>
                <p className="text-center text-sm text-netzach-muted mb-6">Quando foi o primeiro dia da sua última menstruação?</p>
                <input type="date" className="w-full p-4 bg-netzach-bg border border-netzach-border rounded-xl text-white text-center text-lg outline-none focus:border-netzach-gold mb-6" value={newPeriodDate} onChange={(e) => setNewPeriodDate(e.target.value)} />
                <button onClick={handleUpdateCycle} className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-3 rounded-xl hover:bg-white transition-colors">Confirmar</button>
            </div>
        </div>
      )}

      {/* MODAL DO ARCANO - NOVO */}
      {isArcanoModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-netzach-card border border-netzach-gold/30 p-0 rounded-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {dailyInsight.image && (
                    <div className="h-64 w-full relative">
                        <img src={dailyInsight.image} alt={dailyInsight.tarot} className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-netzach-card to-transparent"></div>
                        <button onClick={() => setIsArcanoModalOpen(false)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black transition-colors"><X size={20}/></button>
                    </div>
                )}
                
                {!dailyInsight.image && (
                     <div className="p-4 flex justify-end"><button onClick={() => setIsArcanoModalOpen(false)}><X size={24} className="text-white"/></button></div>
                )}

                <div className="p-8 pt-4 overflow-y-auto">
                    <span className="text-xs font-bold text-netzach-gold uppercase tracking-widest mb-2 block">Interpretação</span>
                    <h2 className="text-3xl font-mystic text-white mb-6">{dailyInsight.tarot}</h2>
                    
                    <div className="prose prose-invert prose-p:text-netzach-text/90 prose-p:font-light prose-p:leading-loose">
                        <p className="whitespace-pre-wrap">{dailyInsight.meaning}</p>
                    </div>

                    <button 
                        onClick={() => setIsArcanoModalOpen(false)}
                        className="w-full mt-8 border border-netzach-border text-netzach-muted py-3 rounded-lg hover:text-white hover:border-white transition-colors uppercase text-xs tracking-widest"
                    >
                        Fechar Oráculo
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}