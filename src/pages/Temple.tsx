import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Moon, Droplet, Star, LogOut, Calendar as CalendarIcon, 
  Sparkles, BookOpen, Sun, MessageSquare, X, ArrowRight, Flower, Lock, CloudMoon, ArrowUpCircle 
} from 'lucide-react';
import { getMoonPhase, calculateCycleStatus } from '../utils/mysticMath';
import NumerologySection from '../components/NumerologySection';
import type { Profile } from '../types';

export default function Temple() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados Místicos
  const [moon, setMoon] = useState<any>(null);
  const [cycle, setCycle] = useState<any>(null);
  
  // Conteúdos - AGORA COM LUA E ASCENDENTE
  const [horoscope, setHoroscope] = useState<{ 
    sky: string, 
    sun: string, 
    moon: string, 
    rising: string 
  }>({ sky: '', sun: '', moon: '', rising: '' });
  
  const [dailyInsight, setDailyInsight] = useState<{ tarot: string, bath: string, image: string, meaning: string }>({ tarot: '', bath: '', image: '', meaning: '' });

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);        
  const [isArcanoModalOpen, setIsArcanoModalOpen] = useState(false); 
  const [isSkyModalOpen, setIsSkyModalOpen] = useState(false);  
  
  // Modais de Horóscopo (Um estado para controlar qual texto mostrar)
  const [activeHoroscopeModal, setActiveHoroscopeModal] = useState<{title: string, sign: string, text: string} | null>(null);
  
  const [newPeriodDate, setNewPeriodDate] = useState('');

  useEffect(() => {
    setMoon(getMoonPhase());
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');

    const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).single();

    if (profileData) {
      setProfile(profileData as Profile);
      
      if (profileData.last_period_date) {
        setCycle(calculateCycleStatus(profileData.last_period_date, profileData.cycle_duration || 28));
      }

      // Conteúdos
      const newHoroscopes = { sky: '', sun: '', moon: '', rising: '' };

      // 1. Céu da Semana
      const { data: skyData } = await supabase.from('horoscopes').select('content').or('sign.eq.Geral,sign.eq.geral,sign.eq.ceu_semana').order('created_at', { ascending: false }).limit(1).single();
      if (skyData) newHoroscopes.sky = skyData.content;

      // 2. Solar
      if (profileData.sign_sun) {
        const { data } = await supabase.from('horoscopes').select('content').eq('sign', profileData.sign_sun.toLowerCase()).order('created_at', { ascending: false }).limit(1).single();
        if (data) newHoroscopes.sun = data.content;
      }

      // 3. Lunar (NOVO)
      if (profileData.sign_moon) {
        const { data } = await supabase.from('horoscopes').select('content').eq('sign', profileData.sign_moon.toLowerCase()).order('created_at', { ascending: false }).limit(1).single();
        if (data) newHoroscopes.moon = data.content;
      }

      // 4. Ascendente (NOVO)
      if (profileData.sign_rising) {
        const { data } = await supabase.from('horoscopes').select('content').eq('sign', profileData.sign_rising.toLowerCase()).order('created_at', { ascending: false }).limit(1).single();
        if (data) newHoroscopes.rising = data.content;
      }

      setHoroscope(newHoroscopes);

      const { data: insightData } = await supabase.from('daily_insights').select('*').order('created_at', { ascending: false }).limit(1).single();
      if (insightData) {
        setDailyInsight({ 
            tarot: insightData.tarot_card_id || 'O Mistério', 
            bath: insightData.recommended_bath || 'Banho de Ervas',
            image: insightData.card_image_url || '',
            meaning: insightData.card_meaning || '...'
        });
      }
    }
    setLoading(false);
  };

  const handleUpdateCycle = async () => {
    if (!profile || !newPeriodDate) return;
    await supabase.from('profiles').update({ last_period_date: newPeriodDate }).eq('id', profile.id);
    const updatedCycle = calculateCycleStatus(newPeriodDate, profile.cycle_duration || 28);
    setCycle(updatedCycle);
    setProfile({ ...profile, last_period_date: newPeriodDate });
    setIsModalOpen(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/portal'); };

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic">Sintonizando...</div>;

  // TELA DE BLOQUEIO
  if (profile?.subscription_status === 'inactive' && profile.role !== 'admin') {
    return (
        <div className="min-h-screen bg-netzach-bg flex flex-col items-center justify-center text-center p-6 font-sans">
            <div className="bg-netzach-card border border-netzach-border p-8 rounded-2xl shadow-2xl max-w-sm">
                <Lock size={48} className="text-netzach-muted mb-6 mx-auto"/>
                <h1 className="text-2xl font-mystic text-netzach-gold mb-4">Acesso Pausado</h1>
                <p className="text-netzach-text/80 text-sm mb-8 leading-relaxed">Renove sua assinatura para continuar.</p>
                <div className="space-y-3">
                    <button className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-lg hover:bg-white transition-colors">Renovar Agora</button>
                    <button onClick={handleLogout} className="w-full border border-netzach-border text-netzach-muted py-3 rounded-lg hover:text-white transition-colors">Sair</button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text pb-24 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-stars opacity-50 pointer-events-none"></div>

      {/* HEADER */}
      <header className="p-6 flex justify-between items-center border-b border-netzach-border bg-netzach-bg/80 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-mystic text-netzach-gold">Olá, {profile?.full_name?.split(' ')[0]}</h2>
          <div className="flex items-center gap-2 text-xs text-netzach-muted tracking-widest uppercase mt-1">
            <span>{format(new Date(), "d 'de' MMMM", { locale: ptBR })}</span>
            {profile?.sign_sun && (
                <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-netzach-gold"><Sun size={10}/> {profile.sign_sun}</span>
                </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            {profile?.role === 'admin' && (
                <button 
                    onClick={() => navigate('/admin')}
                    className="bg-netzach-gold/10 border border-netzach-gold text-netzach-gold p-2 rounded-lg hover:bg-netzach-gold hover:text-netzach-bg transition-colors"
                >
                    <img src="/logo.svg" className="w-5 h-5 invert brightness-0" alt="Admin"/> {/* Ícone Shield ou Logo */}
                </button>
            )}
            <button onClick={handleLogout} className="text-netzach-muted hover:text-netzach-gold transition-colors">
                <LogOut size={20}/>
            </button>
        </div>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-6 relative z-10">
        
        {/* 1. MANDALA (Lua + Ciclo) */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-netzach-card border border-netzach-border p-4 rounded-2xl flex flex-col items-center text-center shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20"><Sparkles size={16}/></div>
            <Moon size={28} className="text-netzach-gold mb-2" strokeWidth={1.5} />
            <h3 className="font-mystic text-base text-white">Lua {moon?.phase}</h3>
            <p className="text-[10px] text-netzach-muted mt-1 uppercase tracking-wider">{moon?.label}</p>
          </div>
          {profile?.last_period_date ? (
              <button onClick={() => setIsModalOpen(true)} className="bg-netzach-card border border-netzach-border p-4 rounded-2xl flex flex-col items-center text-center shadow-lg hover:border-netzach-gold transition-colors relative">
                {cycle ? (<><div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${cycle.isLate ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div><Droplet size={28} className="text-rose-400 mb-2" strokeWidth={1.5} /><h3 className="font-mystic text-base text-white">{cycle.phaseName}</h3><p className="text-[10px] text-netzach-muted mt-1 uppercase tracking-wider">Dia {cycle.dayOfCycle}</p></>) : (<><CalendarIcon size={28} className="text-netzach-muted mb-2" strokeWidth={1.5} /><h3 className="font-mystic text-base text-netzach-muted">Ciclo</h3><p className="text-[10px] text-netzach-gold mt-1 underline uppercase tracking-wider">Configurar</p></>)}
              </button>
          ) : (
              <div className="bg-netzach-card border border-netzach-border p-4 rounded-2xl flex flex-col items-center text-center"><Flower size={28} className="text-purple-400 mb-2" strokeWidth={1.5} /><h3 className="font-mystic text-base text-white">Sabedoria</h3><p className="text-[10px] text-netzach-muted mt-1 uppercase tracking-wider">Conexão Universal</p></div>
          )}
        </section>

        {/* 2. ASTROLOGIA (Céu + Solar + Lunar + Ascendente) - ATUALIZADO */}
        <div>
            <h3 className="text-xs text-netzach-gold uppercase font-bold mb-3 tracking-widest pl-1">Mapa Celeste</h3>
            <div className="grid grid-cols-2 gap-4">
                
                {/* Céu da Semana */}
                <button onClick={() => setIsSkyModalOpen(true)} className="bg-netzach-card border border-netzach-border p-4 rounded-2xl relative shadow-lg text-left hover:border-netzach-gold transition-colors group flex flex-col justify-between min-h-[120px]">
                    <div><div className="absolute top-2 right-2 opacity-20 group-hover:text-netzach-gold transition-colors"><CloudMoon size={16}/></div><p className="text-[10px] text-netzach-gold uppercase tracking-widest mb-1">Coletivo</p><h3 className="font-mystic text-lg text-white">Céu da Semana</h3></div>
                    <p className="text-xs text-netzach-muted underline mt-2">Ler orientações &rarr;</p>
                </button>

                {/* Signo Solar */}
                <button onClick={() => setActiveHoroscopeModal({title: 'Seu Sol', sign: profile?.sign_sun || '', text: horoscope.sun})} className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-border p-4 rounded-2xl relative shadow-lg text-left hover:border-netzach-gold transition-colors group flex flex-col justify-between min-h-[120px]">
                    <div><div className="absolute top-2 right-2 opacity-20 group-hover:text-netzach-gold transition-colors"><Sun size={16} className="text-netzach-gold"/></div><p className="text-[10px] text-netzach-muted uppercase tracking-widest mb-1">Sol (Essência)</p><h3 className="font-mystic text-lg text-white">{profile?.sign_sun || "..."}</h3></div>
                    <p className="text-xs text-netzach-muted underline mt-2">Ler previsões &rarr;</p>
                </button>

                {/* Signo Lunar (Se existir) */}
                {profile?.sign_moon && (
                     <button onClick={() => setActiveHoroscopeModal({title: 'Sua Lua', sign: profile.sign_moon || '', text: horoscope.moon})} className="bg-netzach-card border border-netzach-border p-4 rounded-2xl relative shadow-lg text-left hover:border-netzach-gold transition-colors group flex flex-col justify-between min-h-[120px]">
                        <div><div className="absolute top-2 right-2 opacity-20 group-hover:text-netzach-gold transition-colors"><Moon size={16}/></div><p className="text-[10px] text-netzach-muted uppercase tracking-widest mb-1">Lua (Emoção)</p><h3 className="font-mystic text-lg text-white">{profile.sign_moon}</h3></div>
                        <p className="text-xs text-netzach-muted underline mt-2">Ler previsões &rarr;</p>
                    </button>
                )}

                {/* Ascendente (Se existir) */}
                {profile?.sign_rising && (
                     <button onClick={() => setActiveHoroscopeModal({title: 'Seu Ascendente', sign: profile.sign_rising || '', text: horoscope.rising})} className="bg-netzach-card border border-netzach-border p-4 rounded-2xl relative shadow-lg text-left hover:border-netzach-gold transition-colors group flex flex-col justify-between min-h-[120px]">
                        <div><div className="absolute top-2 right-2 opacity-20 group-hover:text-netzach-gold transition-colors"><ArrowUpCircle size={16}/></div><p className="text-[10px] text-netzach-muted uppercase tracking-widest mb-1">Ascendente</p><h3 className="font-mystic text-lg text-white">{profile.sign_rising}</h3></div>
                        <p className="text-xs text-netzach-muted underline mt-2">Ler previsões &rarr;</p>
                    </button>
                )}
            </div>
        </div>

        {/* 3. ARCANO */}
        <section className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-border rounded-2xl p-6 relative overflow-hidden shadow-lg mt-6">
          <div className="flex justify-between mb-4"><div><span className="text-[10px] uppercase tracking-[0.2em] text-netzach-gold font-bold">Arcano da Semana</span><h3 className="font-mystic text-2xl text-white mt-1">{dailyInsight.tarot}</h3></div><button onClick={() => setIsArcanoModalOpen(true)} className="text-netzach-gold hover:text-white transition-colors"><Star size={24}/></button></div>
          <div className="flex gap-4">
            {dailyInsight.image ? (<img src={dailyInsight.image} alt={dailyInsight.tarot} className="w-24 h-36 object-cover rounded border border-netzach-border shadow-md cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsArcanoModalOpen(true)}/>) : (<div className="w-24 h-36 bg-black/30 rounded border border-netzach-border shrink-0 flex items-center justify-center"><span className="text-xs text-netzach-muted">Carta</span></div>)}
            <div className="text-sm text-netzach-text/80 font-light flex flex-col justify-between"><p className="line-clamp-4">{dailyInsight.meaning}</p><button onClick={() => setIsArcanoModalOpen(true)} className="mt-2 flex items-center gap-2 text-netzach-gold text-xs font-bold uppercase tracking-wider cursor-pointer hover:underline"><BookOpen size={12}/> Ler interpretação</button></div>
          </div>
        </section>

        {/* 4. RITUAL */}
        <section className="bg-netzach-card border border-netzach-border rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-netzach-gold/50 transition-colors" onClick={() => navigate('/rituais')}>
            <div className="w-12 h-12 rounded-full bg-netzach-bg border border-netzach-border flex items-center justify-center text-2xl">🌿</div>
            <div><h4 className="font-mystic text-netzach-gold">Ritual Sugerido</h4><p className="text-sm text-netzach-muted">{dailyInsight.bath || "Banho de Limpeza Energética"}</p></div>
        </section>

        {/* 5. NUMEROLOGIA */}
        {profile && <NumerologySection fullName={profile.full_name} birthDate={profile.birth_date} />}

        {/* 6. BOTÃO MATRIZ */}
        <button onClick={() => navigate('/matriz')} className="w-full bg-gradient-to-r from-netzach-card to-[#2a1245] border border-netzach-border p-6 rounded-xl flex items-center justify-between group hover:border-netzach-gold transition-all shadow-lg">
            <div className="text-left"><h3 className="font-mystic text-lg text-white group-hover:text-netzach-gold transition-colors flex items-center gap-2"><Sparkles size={18} className="text-netzach-gold"/> Matriz da Alma</h3><p className="text-xs text-netzach-muted mt-1">Sua mandala pessoal de propósito e carma.</p></div>
            <div className="w-8 h-8 rounded-full bg-netzach-bg border border-netzach-gold/30 flex items-center justify-center text-netzach-gold group-hover:bg-netzach-gold group-hover:text-netzach-bg transition-all"><ArrowRight size={16}/></div>
        </button>

      </main>

      {/* FOOTER */}
      <nav className="fixed bottom-0 w-full bg-[#0F0518]/95 backdrop-blur-md border-t border-netzach-border p-4 flex justify-around items-center z-30 pb-6 safe-area-pb">
        <button onClick={() => navigate('/templo')} className="flex flex-col items-center gap-1 text-netzach-gold"><Moon size={20}/><span className="text-[10px] uppercase tracking-wider font-bold">Templo</span></button>
        <button onClick={() => navigate('/servicos')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors"><MessageSquare size={20}/><span className="text-[10px] uppercase tracking-wider">Serviços</span></button>
        <button onClick={() => navigate('/rituais')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors"><BookOpen size={20}/><span className="text-[10px] uppercase tracking-wider">Grimório</span></button>
      </nav>

      {/* MODAL CÉU */}
      {isSkyModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-netzach-card border border-netzach-gold/30 p-8 rounded-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="absolute top-0 right-0 p-6 opacity-10"><CloudMoon size={100}/></div>
                <button onClick={() => setIsSkyModalOpen(false)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black transition-colors z-10"><X size={20}/></button>
                <div className="relative z-10 overflow-y-auto custom-scrollbar"><span className="text-xs font-bold text-netzach-gold uppercase tracking-widest mb-2 block">Energia Coletiva</span><h2 className="text-3xl font-mystic text-white mb-6">Céu da Semana</h2><div className="prose prose-invert prose-p:text-netzach-text/90 prose-p:font-light prose-p:leading-loose text-sm"><p className="whitespace-pre-wrap">{horoscope.sky || "Os astros estão silenciosos. Aguarde as previsões da Sacerdotisa."}</p></div></div>
                <button onClick={() => setIsSkyModalOpen(false)} className="w-full mt-8 border border-netzach-border text-netzach-muted py-3 rounded-lg hover:text-white hover:border-white transition-colors uppercase text-xs tracking-widest">Fechar Céu</button>
            </div>
        </div>
      )}

      {/* MODAL HORÓSCOPO PESSOAL (Solar/Lunar/Asc) - NOVO */}
      {activeHoroscopeModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-netzach-card border border-netzach-gold/30 p-8 rounded-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]">
                <button onClick={() => setActiveHoroscopeModal(null)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black transition-colors z-10"><X size={20}/></button>
                <div className="relative z-10 overflow-y-auto custom-scrollbar">
                    <span className="text-xs font-bold text-netzach-gold uppercase tracking-widest mb-2 block">{activeHoroscopeModal.title}</span>
                    <h2 className="text-3xl font-mystic text-white mb-6">{activeHoroscopeModal.sign}</h2>
                    <div className="prose prose-invert prose-p:text-netzach-text/90 prose-p:font-light prose-p:leading-loose text-sm">
                        <p className="whitespace-pre-wrap">{activeHoroscopeModal.text || `Aguardando a previsão para ${activeHoroscopeModal.sign}...`}</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL ARCANO */}
      {isArcanoModalOpen && dailyInsight.meaning && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-netzach-card border border-netzach-gold/30 p-0 rounded-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]">
                {dailyInsight.image && <div className="h-64 w-full relative shrink-0"><img src={dailyInsight.image} alt="Arcano" className="w-full h-full object-cover opacity-80" /><div className="absolute inset-0 bg-gradient-to-t from-netzach-card to-transparent"></div></div>}
                <button onClick={() => setIsArcanoModalOpen(false)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black transition-colors z-10"><X size={20}/></button>
                <div className="p-8 pt-4 overflow-y-auto"><span className="text-xs font-bold text-netzach-gold uppercase tracking-widest mb-2 block">Interpretação</span><h2 className="text-3xl font-mystic text-white mb-6">{dailyInsight.tarot}</h2><div className="prose prose-invert prose-p:text-netzach-text/90 prose-p:font-light prose-p:leading-loose"><p className="whitespace-pre-wrap">{dailyInsight.meaning}</p></div></div>
            </div>
        </div>
      )}

      {/* MODAL CICLO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-netzach-card border border-netzach-gold/30 p-6 rounded-2xl w-full max-w-sm relative"><button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-netzach-muted hover:text-white"><LogOut className="rotate-180" size={20}/></button><h3 className="font-mystic text-xl text-netzach-gold mb-2 text-center">Sintonizar Ciclo</h3><input type="date" className="w-full p-4 bg-netzach-bg border border-netzach-border rounded-xl text-white text-center text-lg outline-none focus:border-netzach-gold mb-6" value={newPeriodDate} onChange={(e) => setNewPeriodDate(e.target.value)} /><button onClick={handleUpdateCycle} className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-3 rounded-xl hover:bg-white transition-colors">Confirmar</button></div>
        </div>
      )}
    </div>
  );
}