import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Moon, Droplet, Star, LogOut, Calendar as CalendarIcon,
  Sparkles, BookOpen, Sun, MessageSquare, X, CloudMoon,
  ArrowUpCircle, Bell, BellOff, Smartphone, UserCircle
} from 'lucide-react';
import { getMoonPhase, calculateCycleStatus } from '../utils/mysticMath';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { InstallPWAModal } from '../components/InstallPWAModal';
import type { Profile } from '../types';

// ── Check-in card ──────────────────────────────────────────────
function CheckinCard({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [morning, setMorning] = useState(false);
  const [evening, setEvening] = useState(false);
  const [habits, setHabits] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    supabase.from('daily_checkins').select('period').eq('user_id', userId).eq('date', today)
      .then(({ data }) => {
        setMorning(data?.some(c => c.period === 'morning') ?? false);
        setEvening(data?.some(c => c.period === 'evening') ?? false);
      });
    supabase.from('habit_logs').select('habit', { count: 'exact', head: true }).eq('user_id', userId).eq('date', today)
      .then(({ count }) => setHabits(count ?? 0));
  }, [userId]);

  const allDone = morning && evening && habits >= 6;
  const doneParts = [morning, evening, habits >= 3].filter(Boolean).length;

  return (
    <button
      onClick={() => navigate('/checkin')}
      className="w-full bg-netzach-card border border-netzach-border rounded-2xl p-4 flex items-center justify-between hover:border-netzach-gold/50 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-lg transition-all ${allDone ? 'bg-netzach-gold border-netzach-gold text-netzach-bg' : 'border-netzach-border text-netzach-gold'}`}>
          {allDone ? '✓' : '✦'}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-white group-hover:text-netzach-gold transition-colors">Check-in Diário</p>
          <p className="text-[11px] text-netzach-muted">
            {allDone ? 'Tudo completo hoje ✦' : `${doneParts}/3 etapas concluídas`}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        {[morning, evening, habits >= 3].map((done, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${done ? 'bg-netzach-gold' : 'bg-netzach-border'}`} />
        ))}
      </div>
    </button>
  );
}

export default function Temple() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [moon, setMoon] = useState<any>(null);
  const [cycle, setCycle] = useState<any>(null);
  const [horoscope, setHoroscope] = useState<{ sky: string; sun: string; moon: string; rising: string }>({ sky: '', sun: '', moon: '', rising: '' });
  const [dailyInsight, setDailyInsight] = useState<{ tarot: string; bath: string; image: string; meaning: string }>({ tarot: '', bath: '', image: '', meaning: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArcanoModalOpen, setIsArcanoModalOpen] = useState(false);
  const [isSkyModalOpen, setIsSkyModalOpen] = useState(false);
  const [activeHoroscopeModal, setActiveHoroscopeModal] = useState<{ title: string; sign: string; text: string } | null>(null);
  const [newPeriodDate, setNewPeriodDate] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { isSupported: pushSupported, permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

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

      const newHoroscopes = { sky: '', sun: '', moon: '', rising: '' };
      const { data: skyData } = await supabase.from('horoscopes').select('content').or('sign.eq.Geral,sign.eq.geral,sign.eq.ceu_semana').order('created_at', { ascending: false }).limit(1).single();
      if (skyData) newHoroscopes.sky = skyData.content;

      if (profileData.sign_sun) {
        const { data } = await supabase.from('horoscopes').select('content').eq('sign', profileData.sign_sun.toLowerCase()).order('created_at', { ascending: false }).limit(1).single();
        if (data) newHoroscopes.sun = data.content;
      }
      if (profileData.sign_moon) {
        const { data } = await supabase.from('horoscopes').select('content').eq('sign', profileData.sign_moon.toLowerCase()).order('created_at', { ascending: false }).limit(1).single();
        if (data) newHoroscopes.moon = data.content;
      }
      if (profileData.sign_rising) {
        const { data } = await supabase.from('horoscopes').select('content').eq('sign', profileData.sign_rising.toLowerCase()).order('created_at', { ascending: false }).limit(1).single();
        if (data) newHoroscopes.rising = data.content;
      }
      setHoroscope(newHoroscopes);

      const { data: insightData } = await supabase.from('daily_insights').select('*').order('created_at', { ascending: false }).limit(1).single();
      if (insightData) {
        setDailyInsight({ tarot: insightData.tarot_card_id || 'O Mistério', bath: insightData.recommended_bath || '', image: insightData.card_image_url || '', meaning: insightData.card_meaning || '' });
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

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic text-xl">Sintonizando...</div>;

  if (profile?.subscription_status === 'inactive' && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-netzach-bg flex flex-col items-center justify-center text-center p-6 font-sans">
        <div className="bg-netzach-card border border-netzach-border p-8 rounded-2xl shadow-2xl max-w-sm space-y-4">
          <div className="text-4xl">🔒</div>
          <h1 className="text-2xl font-mystic text-netzach-gold">Acesso Pausado</h1>
          <p className="text-netzach-text/80 text-sm leading-relaxed">Renove sua assinatura para continuar sua jornada.</p>
          <button onClick={() => navigate('/assinar')} className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl hover:bg-white transition-colors">Renovar Agora</button>
          <button onClick={handleLogout} className="w-full border border-netzach-border text-netzach-muted py-3 rounded-xl hover:text-white transition-colors">Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-28">

      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex justify-between items-center">
        <div>
          <h2 className="font-mystic text-xl text-netzach-gold leading-none">
            Olá, {profile?.full_name?.split(' ')[0]} ✦
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-netzach-muted mt-0.5">
            <span>{format(new Date(), "EEEE',' d 'de' MMMM", { locale: ptBR })}</span>
            {profile?.sign_sun && <><span>·</span><span className="text-netzach-gold flex items-center gap-1"><Sun size={9}/> {profile.sign_sun}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="text-[10px] border border-netzach-gold/40 text-netzach-gold px-2 py-1 rounded-lg hover:bg-netzach-gold hover:text-netzach-bg transition-colors uppercase tracking-wider">Admin</button>
          )}
          <button onClick={() => setShowInstallModal(true)} className="text-netzach-muted hover:text-netzach-gold transition-colors p-1"><Smartphone size={18}/></button>
          <button onClick={handleLogout} className="text-netzach-muted hover:text-netzach-gold transition-colors p-1"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* CHECK-IN */}
        <CheckinCard userId={profile?.user_id} />

        {/* LUA + CICLO */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/lua')} className="bg-netzach-card border border-netzach-border rounded-2xl p-4 flex flex-col items-center text-center hover:border-netzach-gold/50 transition-all group">
            <div className="text-3xl mb-1">{moon?.phase === 'Cheia' ? '🌕' : moon?.phase === 'Nova' ? '🌑' : moon?.phase === 'Crescente' ? '🌒' : '🌘'}</div>
            <p className="font-mystic text-sm text-white group-hover:text-netzach-gold transition-colors">Lua {moon?.phase}</p>
            <p className="text-[10px] text-netzach-muted mt-0.5">{moon?.label}</p>
            <p className="text-[9px] text-netzach-gold/60 mt-1 uppercase tracking-wider">Ver ritual →</p>
          </button>

          {profile?.last_period_date ? (
            <button onClick={() => setIsModalOpen(true)} className="bg-netzach-card border border-netzach-border rounded-2xl p-4 flex flex-col items-center text-center hover:border-netzach-gold/50 transition-all relative">
              {cycle?.isLate && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              <Droplet size={28} className="text-rose-400 mb-1" strokeWidth={1.5} />
              <p className="font-mystic text-sm text-white">{cycle?.phaseName || 'Ciclo'}</p>
              <p className="text-[10px] text-netzach-muted mt-0.5">Dia {cycle?.dayOfCycle}</p>
              <p className="text-[9px] text-netzach-gold/60 mt-1 uppercase tracking-wider">Atualizar →</p>
            </button>
          ) : (
            <button onClick={() => setIsModalOpen(true)} className="bg-netzach-card border border-netzach-border rounded-2xl p-4 flex flex-col items-center text-center hover:border-netzach-gold/50 transition-all">
              <CalendarIcon size={28} className="text-netzach-muted mb-1" strokeWidth={1.5} />
              <p className="font-mystic text-sm text-netzach-muted">Ciclo</p>
              <p className="text-[10px] text-netzach-gold mt-1 underline">Configurar</p>
            </button>
          )}
        </div>

        {/* ARCANO DA SEMANA */}
        {dailyInsight.tarot && (
          <section className="bg-netzach-card border border-netzach-border rounded-2xl p-5 flex gap-4">
            {dailyInsight.image
              ? <img src={dailyInsight.image} alt={dailyInsight.tarot} className="w-16 h-24 object-cover rounded-lg border border-netzach-border shrink-0 cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsArcanoModalOpen(true)} />
              : <div className="w-16 h-24 bg-netzach-bg rounded-lg border border-netzach-border shrink-0 flex items-center justify-center text-2xl">✦</div>
            }
            <div className="flex flex-col justify-between min-w-0">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">Arcano da Semana</p>
                <h3 className="font-mystic text-lg text-white mt-0.5">{dailyInsight.tarot}</h3>
                <p className="text-xs text-netzach-text/70 mt-1 line-clamp-3">{dailyInsight.meaning}</p>
              </div>
              <button onClick={() => setIsArcanoModalOpen(true)} className="flex items-center gap-1 text-netzach-gold text-xs font-bold uppercase tracking-wider hover:underline mt-2 w-fit">
                <BookOpen size={11}/> Ler completo
              </button>
            </div>
          </section>
        )}

        {/* CÉU DA SEMANA + SIGNOS */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold mb-3 pl-1">Mapa Celeste</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setIsSkyModalOpen(true)} className="bg-netzach-card border border-netzach-border p-4 rounded-xl text-left hover:border-netzach-gold/50 transition-all group">
              <CloudMoon size={16} className="text-netzach-gold mb-2 opacity-70"/>
              <p className="text-[10px] text-netzach-muted uppercase tracking-wider">Coletivo</p>
              <p className="font-mystic text-base text-white group-hover:text-netzach-gold transition-colors">Céu da Semana</p>
            </button>
            {profile?.sign_sun && (
              <button onClick={() => setActiveHoroscopeModal({ title: 'Seu Sol', sign: profile.sign_sun!, text: horoscope.sun })} className="bg-netzach-card border border-netzach-border p-4 rounded-xl text-left hover:border-netzach-gold/50 transition-all group">
                <Sun size={16} className="text-netzach-gold mb-2 opacity-70"/>
                <p className="text-[10px] text-netzach-muted uppercase tracking-wider">Sol — Essência</p>
                <p className="font-mystic text-base text-white group-hover:text-netzach-gold transition-colors">{profile.sign_sun}</p>
              </button>
            )}
            {profile?.sign_moon && (
              <button onClick={() => setActiveHoroscopeModal({ title: 'Sua Lua', sign: profile.sign_moon!, text: horoscope.moon })} className="bg-netzach-card border border-netzach-border p-4 rounded-xl text-left hover:border-netzach-gold/50 transition-all group">
                <Moon size={16} className="text-netzach-gold mb-2 opacity-70"/>
                <p className="text-[10px] text-netzach-muted uppercase tracking-wider">Lua — Emoção</p>
                <p className="font-mystic text-base text-white group-hover:text-netzach-gold transition-colors">{profile.sign_moon}</p>
              </button>
            )}
            {profile?.sign_rising && (
              <button onClick={() => setActiveHoroscopeModal({ title: 'Seu Ascendente', sign: profile.sign_rising!, text: horoscope.rising })} className="bg-netzach-card border border-netzach-border p-4 rounded-xl text-left hover:border-netzach-gold/50 transition-all group">
                <ArrowUpCircle size={16} className="text-netzach-gold mb-2 opacity-70"/>
                <p className="text-[10px] text-netzach-muted uppercase tracking-wider">Ascendente</p>
                <p className="font-mystic text-base text-white group-hover:text-netzach-gold transition-colors">{profile.sign_rising}</p>
              </button>
            )}
          </div>
        </div>

        {/* PUSH NOTIFICATION */}
        {pushSupported && permission !== 'denied' && (
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isSubscribed ? <Bell size={16} className="text-netzach-gold shrink-0"/> : <BellOff size={16} className="text-netzach-muted shrink-0"/>}
              <div>
                <p className="text-sm text-white">{isSubscribed ? 'Notificações ativas' : 'Ativar notificações'}</p>
                <p className="text-[10px] text-netzach-muted">Rituais, fases lunares e check-in</p>
              </div>
            </div>
            <button onClick={isSubscribed ? unsubscribe : subscribe} disabled={pushLoading}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all shrink-0 disabled:opacity-40 ${isSubscribed ? 'border-netzach-border text-netzach-muted hover:border-red-400/50 hover:text-red-400' : 'border-netzach-gold/60 text-netzach-gold hover:bg-netzach-gold hover:text-netzach-bg'}`}>
              {pushLoading ? '...' : isSubscribed ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        )}

      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full bg-netzach-bg/95 backdrop-blur-md border-t border-netzach-border flex justify-around items-center z-30 pt-3 pb-6">
        <button onClick={() => navigate('/templo')} className="flex flex-col items-center gap-1 text-netzach-gold">
          <Moon size={20}/><span className="text-[10px] uppercase tracking-wider font-bold">Templo</span>
        </button>
        <button onClick={() => navigate('/servicos')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors">
          <Sparkles size={20}/><span className="text-[10px] uppercase tracking-wider">Práticas</span>
        </button>
        <button onClick={() => navigate('/rituais')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors">
          <BookOpen size={20}/><span className="text-[10px] uppercase tracking-wider">Grimório</span>
        </button>
        <button onClick={() => navigate('/perfil')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors">
          <UserCircle size={20}/><span className="text-[10px] uppercase tracking-wider">Perfil</span>
        </button>
      </nav>

      {showInstallModal && <InstallPWAModal onClose={() => setShowInstallModal(false)} />}

      {/* MODAL CICLO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-netzach-card border border-netzach-border rounded-t-3xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-mystic text-netzach-gold text-xl">Registrar Menstruação</h3>
            <p className="text-sm text-netzach-muted">Quando foi o primeiro dia da sua última menstruação?</p>
            <input type="date" value={newPeriodDate} onChange={e => setNewPeriodDate(e.target.value)} className="input-mystic w-full" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsModalOpen(false)} className="py-3 border border-netzach-border rounded-xl text-netzach-muted hover:text-white transition-colors text-sm">Cancelar</button>
              <button onClick={handleUpdateCycle} className="py-3 bg-netzach-gold text-netzach-bg rounded-xl font-bold text-sm hover:bg-white transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ARCANO */}
      {isArcanoModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setIsArcanoModalOpen(false)}>
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 w-full max-w-md space-y-4 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsArcanoModalOpen(false)} className="absolute top-4 right-4 text-netzach-muted hover:text-white"><X size={20}/></button>
            <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">Arcano da Semana</p>
            <div className="flex gap-4">
              {dailyInsight.image && <img src={dailyInsight.image} alt={dailyInsight.tarot} className="w-20 h-32 object-cover rounded-lg border border-netzach-border shrink-0"/>}
              <div><h3 className="font-mystic text-2xl text-white mb-2">{dailyInsight.tarot}</h3></div>
            </div>
            <p className="text-sm text-netzach-text/90 leading-relaxed">{dailyInsight.meaning}</p>
          </div>
        </div>
      )}

      {/* MODAL CÉU */}
      {isSkyModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto" onClick={() => setIsSkyModalOpen(false)}>
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 w-full max-w-md relative my-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsSkyModalOpen(false)} className="absolute top-4 right-4 text-netzach-muted hover:text-white"><X size={20}/></button>
            <CloudMoon size={20} className="text-netzach-gold mb-3"/>
            <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold mb-1">Céu da Semana</p>
            <p className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap">{horoscope.sky || 'Sem previsão disponível.'}</p>
          </div>
        </div>
      )}

      {/* MODAL HORÓSCOPO */}
      {activeHoroscopeModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto" onClick={() => setActiveHoroscopeModal(null)}>
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 w-full max-w-md relative my-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveHoroscopeModal(null)} className="absolute top-4 right-4 text-netzach-muted hover:text-white"><X size={20}/></button>
            <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold mb-1">{activeHoroscopeModal.title}</p>
            <h3 className="font-mystic text-2xl text-white mb-4">{activeHoroscopeModal.sign}</h3>
            <p className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap">{activeHoroscopeModal.text || 'Sem previsão disponível para este signo.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
