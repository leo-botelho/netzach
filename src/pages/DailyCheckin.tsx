import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EMOCOES_SONHO, INTENSIDADES } from '../lib/simbolosOniricos';
import { getMoonPhase, calculateCycleStatus } from '../utils/mysticMath';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Flame, Sun, Moon, Leaf, BookOpen, Wind, Droplets, Footprints, Coffee } from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────
interface TodayCheckin {
  morning: boolean;
  evening: boolean;
  morningData?: Record<string, unknown>;
  eveningData?: Record<string, unknown>;
}

interface HabitState {
  caminhada: boolean;
  hidratacao: boolean;
  cha_almoco: boolean;
  cha_noite: boolean;
  leitura: boolean;
  silencio: boolean;
}

const EMPTY_HABITS: HabitState = {
  caminhada: false,
  hidratacao: false,
  cha_almoco: false,
  cha_noite: false,
  leitura: false,
  silencio: false,
};

const HABITS_CONFIG: { key: keyof HabitState; label: string; sub: string; icon: typeof Leaf }[] = [
  { key: 'caminhada',  label: 'Movimento',      sub: '20 min de caminhada ou qualquer movimento', icon: Footprints },
  { key: 'hidratacao', label: 'Hidratação',      sub: 'Meta diária de água atingida',              icon: Droplets   },
  { key: 'cha_almoco', label: 'Chá pós-almoço', sub: 'Chá verde ou erva-doce para digestão',      icon: Coffee     },
  { key: 'cha_noite',  label: 'Chá noturno',    sub: 'Camomila, melissa ou maracujá',             icon: Moon       },
  { key: 'leitura',   label: '5 páginas',       sub: 'Leitura do seu livro atual',                icon: BookOpen   },
  { key: 'silencio',  label: 'Silêncio',        sub: 'Meditação, respiração ou pausa intencional', icon: Wind      },
];

// ── Escala visual de humor ───────────────────────────────────
const SCALE_LABELS = ['', 'Muito baixa', 'Baixa', 'Média', 'Boa', 'Excelente'];
const MOOD_LABELS  = ['', 'Muito mal', 'Mal', 'Neutro', 'Bem', 'Muito bem'];

function ScaleButton({ value, selected, onSelect }: { value: number; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-10 h-10 rounded-full text-sm font-bold border transition-all ${
        selected
          ? 'bg-netzach-gold text-netzach-bg border-netzach-gold scale-110'
          : 'border-netzach-border text-netzach-muted hover:border-netzach-gold/50'
      }`}
    >
      {value}
    </button>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function DailyCheckin() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<TodayCheckin>({ morning: false, evening: false });
  const [habits, setHabits] = useState<HabitState>(EMPTY_HABITS);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'habits' | 'morning' | 'evening'>('habits');
  const [done, setDone] = useState(false);
  const [cicloAtual, setCicloAtual] = useState<{ phaseName: string } | null>(null);

  // Forms
  const [morning, setMorning] = useState({
    energy: 0, emotion: 0, mind: 0, sleep_quality: 0,
    dream_notes: '', dream_emotion: '', dream_intensity: '',
    intention: '',
  });
  const [evening, setEvening] = useState({ alignment: '', gratitude: '', mood: 0, release_notes: '' });

  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');
    const uid = session.user.id;
    setUserId(uid);

    // Ciclo menstrual, para gravar em que fase o sonho aconteceu
    const { data: perfil } = await supabase
      .from('profiles')
      .select('last_period_date, cycle_duration')
      .eq('user_id', uid)
      .maybeSingle();

    if (perfil?.last_period_date) {
      setCicloAtual(calculateCycleStatus(perfil.last_period_date, perfil.cycle_duration ?? 28));
    }

    // Carrega check-ins de hoje
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('period')
      .eq('user_id', uid)
      .eq('date', today);

    const hasMorning = checkins?.some(c => c.period === 'morning') ?? false;
    const hasEvening = checkins?.some(c => c.period === 'evening') ?? false;
    setCheckin({ morning: hasMorning, evening: hasEvening });

    // Carrega hábitos de hoje
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('habit')
      .eq('user_id', uid)
      .eq('date', today);

    if (logs) {
      const state = { ...EMPTY_HABITS };
      logs.forEach(l => { if (l.habit in state) (state as Record<string, boolean>)[l.habit] = true; });
      setHabits(state);
    }

    // Streak: dias consecutivos com pelo menos 1 check-in
    const { data: streakData } = await supabase
      .from('daily_checkins')
      .select('date')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(90);

    if (streakData) {
      const dates = [...new Set(streakData.map(r => r.date))].sort().reverse();
      let count = 0;
      let cursor = new Date();
      for (const d of dates) {
        const diff = Math.round((cursor.getTime() - new Date(d).getTime()) / 86400000);
        if (diff > 1) break;
        count++;
        cursor = new Date(d);
      }
      setStreak(count);
    }

    // Detect which view to show
    if (!hasMorning && hour >= 5 && hour < 14) setActiveView('morning');
    else if (!hasEvening && hour >= 18) setActiveView('evening');
    else setActiveView('habits');

    setLoading(false);
  };

  // Toggle hábito
  const toggleHabit = async (key: keyof HabitState) => {
    if (!userId) return;
    const newVal = !habits[key];
    setHabits(prev => ({ ...prev, [key]: newVal }));

    if (newVal) {
      await supabase.from('habit_logs').upsert({ user_id: userId, date: today, habit: key }, { onConflict: 'user_id,date,habit' });
    } else {
      await supabase.from('habit_logs').delete().eq('user_id', userId).eq('date', today).eq('habit', key);
    }
  };

  // Salvar check-in manhã
  const saveMorning = async () => {
    if (!userId || morning.energy === 0) return;
    setSaving(true);

    // A lua e a fase do ciclo do dia ficam gravadas junto com o sonho.
    // É o que permite, meses depois, mostrar em que fases ela sonha
    // mais intensamente (§9 do documento).
    const temSonho = morning.dream_notes.trim().length > 0;
    const { error } = await supabase.from('daily_checkins').upsert({
      user_id: userId, date: today, period: 'morning',
      ...morning,
      dream_emotion: temSonho ? (morning.dream_emotion || null) : null,
      dream_intensity: temSonho ? (morning.dream_intensity || null) : null,
      dream_moon_phase: temSonho ? getMoonPhase().phase : null,
      dream_cycle_phase: temSonho ? (cicloAtual?.phaseName ?? null) : null,
    }, { onConflict: 'user_id,date,period' });

    if (error) {
      console.error('Falha ao salvar o check-in da manhã:', error.message);
      setSaving(false);
      return;
    }
    setCheckin(prev => ({ ...prev, morning: true }));
    setSaving(false);
    setDone(true);
    setTimeout(() => { setDone(false); setActiveView('habits'); }, 2000);
  };

  // Salvar check-in noite
  const saveEvening = async () => {
    if (!userId || evening.mood === 0) return;
    setSaving(true);
    await supabase.from('daily_checkins').upsert({
      user_id: userId, date: today, period: 'evening',
      ...evening,
    }, { onConflict: 'user_id,date,period' });

    // Salva gratidão no banco de gratidões
    if (evening.gratitude.trim()) {
      await supabase.from('gratitudes').insert({ user_id: userId, date: today, content: evening.gratitude });
    }

    setCheckin(prev => ({ ...prev, evening: true }));
    setSaving(false);
    setDone(true);
    setTimeout(() => { setDone(false); setActiveView('habits'); }, 2000);
  };

  const habitsCount = Object.values(habits).filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic animate-pulse">
        Sintonizando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netzach-bg font-sans text-netzach-text pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/templo')} className="text-netzach-muted hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-mystic text-netzach-gold text-base leading-none">Check-in Diário</h1>
          <p className="text-[10px] text-netzach-muted uppercase tracking-widest">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 bg-netzach-card border border-netzach-gold/30 rounded-full px-3 py-1">
            <Flame size={13} className="text-netzach-gold" />
            <span className="text-xs text-netzach-gold font-bold">{streak}</span>
          </div>
        )}
      </header>

      {/* Status cards */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2">
        {[
          { id: 'morning' as const, icon: Sun,  label: 'Manhã',   done: checkin.morning },
          { id: 'evening' as const, icon: Moon, label: 'Noite',   done: checkin.evening },
          { id: 'habits'  as const, icon: Leaf, label: `${habitsCount}/6`, done: habitsCount === 6 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
              activeView === tab.id
                ? 'bg-netzach-card border-netzach-gold/50 text-white'
                : 'border-netzach-border text-netzach-muted hover:border-netzach-border'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${tab.done ? 'bg-netzach-gold' : 'bg-netzach-bg border border-netzach-border'}`}>
              {tab.done ? <Check size={14} className="text-netzach-bg" /> : <tab.icon size={14} className="text-netzach-muted" />}
            </div>
            <span className="text-[11px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {/* ── Hábitos ── */}
        {activeView === 'habits' && (
          <div className="space-y-3">
            <p className="text-xs text-netzach-muted uppercase tracking-widest mb-4">Seus hábitos de hoje</p>
            {HABITS_CONFIG.map(({ key, label, sub, icon: Icon }) => (
              <button
                key={key}
                onClick={() => toggleHabit(key)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  habits[key]
                    ? 'bg-netzach-card border-netzach-gold/40 text-white'
                    : 'border-netzach-border text-netzach-muted hover:border-netzach-border'
                }`}
              >
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-all ${
                  habits[key] ? 'bg-netzach-gold' : 'bg-netzach-bg border border-netzach-border'
                }`}>
                  {habits[key]
                    ? <Check size={16} className="text-netzach-bg" />
                    : <Icon size={16} className="text-netzach-muted" />}
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${habits[key] ? 'text-white line-through opacity-70' : ''}`}>{label}</p>
                  <p className="text-[11px] text-netzach-muted">{sub}</p>
                </div>
              </button>
            ))}

            {habitsCount > 0 && (
              <p className="text-center text-xs text-netzach-muted pt-2">
                {habitsCount === 6
                  ? '✦ Dia completo! Você está cuidando de si.'
                  : `${habitsCount} de 6 hábitos completados hoje.`}
              </p>
            )}

            {/* Botões check-in se ainda não feitos */}
            {(!checkin.morning || !checkin.evening) && (
              <div className="mt-4 space-y-2">
                {!checkin.morning && (
                  <button onClick={() => setActiveView('morning')} className="w-full border border-netzach-gold/40 text-netzach-gold py-3 rounded-xl text-sm hover:bg-netzach-gold hover:text-netzach-bg transition-all">
                    ☀ Fazer check-in da manhã
                  </button>
                )}
                {!checkin.evening && (
                  <button onClick={() => setActiveView('evening')} className="w-full border border-netzach-border text-netzach-muted py-3 rounded-xl text-sm hover:border-netzach-gold/40 hover:text-white transition-all">
                    ☽ Fazer check-in da noite
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Check-in Manhã ── */}
        {activeView === 'morning' && (
          <div className="space-y-6">
            {checkin.morning ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-netzach-gold/20 border border-netzach-gold/40 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-netzach-gold" />
                </div>
                <p className="font-mystic text-netzach-gold">Check-in da manhã completo</p>
                <p className="text-xs text-netzach-muted mt-1">Volte à noite para fechar o dia</p>
                <button onClick={() => setActiveView('habits')} className="mt-4 text-xs text-netzach-muted underline">
                  Ver hábitos do dia
                </button>
              </div>
            ) : done ? (
              <div className="text-center py-12">
                <p className="font-mystic text-2xl text-netzach-gold levitate">✦</p>
                <p className="text-netzach-gold mt-2">Bom dia registrado</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-netzach-gold font-mystic mb-1">Como você acorda hoje?</p>
                  <p className="text-xs text-netzach-muted mb-4">Avalie cada dimensão de 1 a 5</p>
                  {[
                    { key: 'energy'  as const, label: 'Energia física' },
                    { key: 'emotion' as const, label: 'Como me sinto por dentro' },
                    { key: 'mind'    as const, label: 'Clareza mental' },
                  ].map(({ key, label }) => (
                    <div key={key} className="mb-4">
                      <p className="text-xs text-netzach-muted mb-2">{label}, {SCALE_LABELS[morning[key]] || '—'}</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(v => (
                          <ScaleButton key={v} value={v} selected={morning[key] === v} onSelect={() => setMorning(p => ({ ...p, [key]: v }))} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-sm text-netzach-gold font-mystic mb-3">Como foi seu sono?</p>
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map(v => (
                      <ScaleButton key={v} value={v} selected={morning.sleep_quality === v} onSelect={() => setMorning(p => ({ ...p, sleep_quality: v }))} />
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Você sonhou? Descreva o que lembra."
                    className="w-full p-3 bg-netzach-card border border-netzach-border rounded-xl text-sm text-white placeholder:text-netzach-muted outline-none focus:border-netzach-gold/50 resize-none"
                    value={morning.dream_notes}
                    onChange={e => setMorning(p => ({ ...p, dream_notes: e.target.value }))}
                  />

                  {/* Emoção e intensidade só aparecem quando há sonho a
                      registrar: perguntar antes seria ruído (§9). */}
                  {morning.dream_notes.trim().length > 0 && (
                    <div className="mt-3 space-y-3 fade-up">
                      <div>
                        <p className="text-xs text-netzach-muted uppercase tracking-wider mb-2">
                          Que emoção ficou do sonho?
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {EMOCOES_SONHO.map(e => (
                            <button
                              key={e.chave}
                              type="button"
                              aria-pressed={morning.dream_emotion === e.chave}
                              onClick={() => setMorning(p => ({
                                ...p,
                                dream_emotion: p.dream_emotion === e.chave ? '' : e.chave,
                              }))}
                              className={`px-2.5 py-1 rounded-full border text-xs transition-all ${
                                morning.dream_emotion === e.chave
                                  ? 'border-netzach-gold bg-netzach-gold/10 text-white'
                                  : 'border-netzach-border text-netzach-muted hover:text-white'
                              }`}
                            >
                              {e.emoji} {e.rotulo}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-netzach-muted uppercase tracking-wider mb-2">
                          Como ele veio?
                        </p>
                        <div className="flex gap-1.5">
                          {INTENSIDADES.map(i => (
                            <button
                              key={i.chave}
                              type="button"
                              aria-pressed={morning.dream_intensity === i.chave}
                              onClick={() => setMorning(p => ({
                                ...p,
                                dream_intensity: p.dream_intensity === i.chave ? '' : i.chave,
                              }))}
                              className={`flex-1 py-1.5 rounded-lg border text-xs transition-all ${
                                morning.dream_intensity === i.chave
                                  ? 'border-netzach-gold bg-netzach-gold/10 text-white'
                                  : 'border-netzach-border text-netzach-muted hover:text-white'
                              }`}
                            >
                              {i.rotulo}
                            </button>
                          ))}
                        </div>
                      </div>

                      <a href="/sonhos" className="inline-block text-[11px] text-netzach-gold border-b border-netzach-gold/40 hover:border-netzach-gold transition-colors">
                        Ver seus padrões de sonho
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-netzach-gold font-mystic mb-2">Sua intenção de hoje</p>
                  <input
                    placeholder="Em uma palavra ou frase curta..."
                    className="w-full p-3 bg-netzach-card border border-netzach-border rounded-xl text-sm text-white placeholder:text-netzach-muted outline-none focus:border-netzach-gold/50"
                    value={morning.intention}
                    onChange={e => setMorning(p => ({ ...p, intention: e.target.value }))}
                  />
                </div>

                <button
                  onClick={saveMorning}
                  disabled={saving || morning.energy === 0}
                  className="w-full bg-netzach-gold text-netzach-bg py-4 rounded-xl font-mystic font-bold hover:bg-white transition-colors disabled:opacity-40"
                >
                  {saving ? 'Salvando...' : 'Registrar manhã ☀'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Check-in Noite ── */}
        {activeView === 'evening' && (
          <div className="space-y-6">
            {checkin.evening ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-netzach-gold/20 border border-netzach-gold/40 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-netzach-gold" />
                </div>
                <p className="font-mystic text-netzach-gold">Check-in da noite completo</p>
                <p className="text-xs text-netzach-muted mt-1">Descanse bem, sacerdotisa</p>
              </div>
            ) : done ? (
              <div className="text-center py-12">
                <p className="font-mystic text-2xl text-netzach-gold levitate">☽</p>
                <p className="text-netzach-gold mt-2">Boa noite registrada</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-netzach-gold font-mystic mb-2">O que se alinhou com sua intenção hoje?</p>
                  <textarea
                    rows={3}
                    placeholder="Pode ser algo pequeno, tudo conta..."
                    className="w-full p-3 bg-netzach-card border border-netzach-border rounded-xl text-sm text-white placeholder:text-netzach-muted outline-none focus:border-netzach-gold/50 resize-none"
                    value={evening.alignment}
                    onChange={e => setEvening(p => ({ ...p, alignment: e.target.value }))}
                  />
                </div>

                <div>
                  <p className="text-sm text-netzach-gold font-mystic mb-2">Gratidão do dia ✦</p>
                  <input
                    placeholder="Uma coisa boa que aconteceu hoje..."
                    className="w-full p-3 bg-netzach-card border border-netzach-border rounded-xl text-sm text-white placeholder:text-netzach-muted outline-none focus:border-netzach-gold/50"
                    value={evening.gratitude}
                    onChange={e => setEvening(p => ({ ...p, gratitude: e.target.value }))}
                  />
                </div>

                <div>
                  <p className="text-sm text-netzach-gold font-mystic mb-2">Como está seu humor agora?</p>
                  <div className="flex gap-2 mb-1">
                    {[1, 2, 3, 4, 5].map(v => (
                      <ScaleButton key={v} value={v} selected={evening.mood === v} onSelect={() => setEvening(p => ({ ...p, mood: v }))} />
                    ))}
                  </div>
                  <p className="text-[11px] text-netzach-muted">{MOOD_LABELS[evening.mood] || ''}</p>
                </div>

                <div>
                  <p className="text-sm text-netzach-gold font-mystic mb-2">Algo que quer liberar antes de dormir?</p>
                  <textarea
                    rows={2}
                    placeholder="Opcional, pode ser um pensamento, uma emoção, um nome..."
                    className="w-full p-3 bg-netzach-card border border-netzach-border rounded-xl text-sm text-white placeholder:text-netzach-muted outline-none focus:border-netzach-gold/50 resize-none"
                    value={evening.release_notes}
                    onChange={e => setEvening(p => ({ ...p, release_notes: e.target.value }))}
                  />
                </div>

                <button
                  onClick={saveEvening}
                  disabled={saving || evening.mood === 0}
                  className="w-full bg-netzach-gold text-netzach-bg py-4 rounded-xl font-mystic font-bold hover:bg-white transition-colors disabled:opacity-40"
                >
                  {saving ? 'Salvando...' : 'Encerrar o dia ☽'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
