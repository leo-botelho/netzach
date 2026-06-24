import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MOOD_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: 'Muito baixa', emoji: '😔', color: '#6B4F7E' },
  2: { label: 'Baixa',       emoji: '😕', color: '#7B5F8E' },
  3: { label: 'Neutra',      emoji: '😐', color: '#9E87BB' },
  4: { label: 'Boa',         emoji: '🙂', color: '#C5A059' },
  5: { label: 'Ótima',       emoji: '😊', color: '#D4A5C9' },
};

interface DayData {
  date: string;
  morning_mood?: number;
  evening_mood?: number;
  gratitude?: string;
  habits_count?: number;
}

export default function Retrospectiva() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [refDate, setRefDate] = useState(new Date());
  const [days, setDays] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      setUserId(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchMonth();
  }, [userId, refDate]);

  const fetchMonth = async () => {
    if (!userId) return;
    setLoading(true);
    const start = startOfMonth(refDate).toISOString().split('T')[0];
    const end = endOfMonth(refDate).toISOString().split('T')[0];

    const [{ data: checkins }, { data: habits }] = await Promise.all([
      supabase.from('daily_checkins').select('date, period, mood, gratitude').eq('user_id', userId).gte('date', start).lte('date', end),
      supabase.from('habit_logs').select('date').eq('user_id', userId).gte('date', start).lte('date', end),
    ]);

    const map: Record<string, DayData> = {};

    checkins?.forEach(c => {
      if (!map[c.date]) map[c.date] = { date: c.date };
      if (c.period === 'morning') map[c.date].morning_mood = c.mood;
      if (c.period === 'evening') {
        map[c.date].evening_mood = c.mood;
        if (c.gratitude) map[c.date].gratitude = c.gratitude;
      }
    });

    habits?.forEach(h => {
      if (!map[h.date]) map[h.date] = { date: h.date };
      map[h.date].habits_count = (map[h.date].habits_count ?? 0) + 1;
    });

    setDays(map);
    setLoading(false);
  };

  const monthDays = eachDayOfInterval({ start: startOfMonth(refDate), end: endOfMonth(refDate) });

  const moodAvg = () => {
    const moods = Object.values(days).flatMap(d => [d.morning_mood, d.evening_mood].filter(Boolean) as number[]);
    if (!moods.length) return null;
    return (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1);
  };

  const checkinDays = Object.keys(days).length;
  const gratitudeCount = Object.values(days).filter(d => d.gratitude).length;
  const avg = moodAvg();

  const getMoodColor = (d: DayData) => {
    const m = d.evening_mood ?? d.morning_mood;
    if (!m) return null;
    return MOOD_LABELS[Math.round(m)]?.color ?? '#362052';
  };

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Retrospectiva</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Sua jornada do mês</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Navegação do mês */}
        <div className="flex items-center justify-between">
          <button onClick={() => setRefDate(d => subMonths(d, 1))} className="p-2 text-netzach-muted hover:text-white transition-colors"><ChevronLeft size={20}/></button>
          <h2 className="font-mystic text-lg text-white capitalize">{format(refDate, 'MMMM yyyy', { locale: ptBR })}</h2>
          <button onClick={() => setRefDate(d => addMonths(d, 1))} disabled={refDate >= new Date()} className="p-2 text-netzach-muted hover:text-white transition-colors disabled:opacity-30"><ChevronRight size={20}/></button>
        </div>

        {/* Cards de stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-netzach-gold">{checkinDays}</p>
            <p className="text-[10px] text-netzach-muted mt-0.5 uppercase tracking-wider">Check-ins</p>
          </div>
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-netzach-gold">{avg ?? '—'}</p>
            <p className="text-[10px] text-netzach-muted mt-0.5 uppercase tracking-wider">Humor Médio</p>
          </div>
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-netzach-gold">{gratitudeCount}</p>
            <p className="text-[10px] text-netzach-muted mt-0.5 uppercase tracking-wider">Gratidões</p>
          </div>
        </div>

        {/* Calendário de humor */}
        <div className="bg-netzach-card border border-netzach-border rounded-2xl p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">Calendário de Humor</p>
          <div className="grid grid-cols-7 gap-1.5">
            {['D','S','T','Q','Q','S','S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] text-netzach-muted uppercase">{d}</div>
            ))}
            {/* Empty cells for first day offset */}
            {Array.from({ length: monthDays[0].getDay() }).map((_, i) => <div key={`e${i}`} />)}
            {monthDays.map(day => {
              const key = day.toISOString().split('T')[0];
              const data = days[key];
              const color = data ? getMoodColor(data) : null;
              const isToday = key === new Date().toISOString().split('T')[0];
              return (
                <button
                  key={key}
                  onClick={() => data && setSelectedDay(data)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all ${color ? 'text-white' : 'text-netzach-muted'} ${isToday ? 'ring-1 ring-netzach-gold' : ''} ${data ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                  style={{ backgroundColor: color ?? 'transparent', border: color ? 'none' : '1px solid #362052' }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center gap-3 pt-1">
            {[1,2,3,4,5].map(m => (
              <div key={m} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MOOD_LABELS[m].color }}/>
                <span className="text-[9px] text-netzach-muted">{MOOD_LABELS[m].emoji}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gratidões do mês */}
        {Object.values(days).some(d => d.gratitude) && (
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold pl-1">Suas Gratidões</p>
            <div className="space-y-2">
              {Object.entries(days).filter(([, d]) => d.gratitude).slice(-10).reverse().map(([date, d]) => (
                <div key={date} className="bg-netzach-card border border-netzach-border rounded-xl p-3 flex gap-3">
                  <span className="text-netzach-muted text-[11px] shrink-0 mt-0.5">
                    {format(new Date(date + 'T12:00:00'), "d MMM", { locale: ptBR })}
                  </span>
                  <p className="text-sm text-netzach-text/90 italic">"{d.gratitude}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(days).length === 0 && !loading && (
          <div className="text-center py-12 space-y-2">
            <p className="text-3xl">🌙</p>
            <p className="text-netzach-muted text-sm">Nenhum check-in registrado neste mês.</p>
            <button onClick={() => navigate('/checkin')} className="text-netzach-gold text-sm underline">Fazer check-in agora</button>
          </div>
        )}

      </main>

      {/* Modal detalhe do dia */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
          <div className="bg-netzach-card border border-netzach-border rounded-t-3xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-mystic text-netzach-gold text-lg">{format(new Date(selectedDay.date + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}</p>
            <div className="grid grid-cols-2 gap-3">
              {selectedDay.morning_mood && (
                <div className="bg-netzach-bg rounded-xl p-3 text-center">
                  <p className="text-[10px] text-netzach-muted uppercase">Manhã</p>
                  <p className="text-2xl mt-1">{MOOD_LABELS[selectedDay.morning_mood]?.emoji}</p>
                  <p className="text-xs text-netzach-text/70">{MOOD_LABELS[selectedDay.morning_mood]?.label}</p>
                </div>
              )}
              {selectedDay.evening_mood && (
                <div className="bg-netzach-bg rounded-xl p-3 text-center">
                  <p className="text-[10px] text-netzach-muted uppercase">Noite</p>
                  <p className="text-2xl mt-1">{MOOD_LABELS[selectedDay.evening_mood]?.emoji}</p>
                  <p className="text-xs text-netzach-text/70">{MOOD_LABELS[selectedDay.evening_mood]?.label}</p>
                </div>
              )}
            </div>
            {selectedDay.gratitude && (
              <div className="bg-netzach-bg rounded-xl p-4">
                <p className="text-[10px] text-netzach-gold uppercase tracking-wider mb-1">Gratidão</p>
                <p className="text-sm text-netzach-text/90 italic">"{selectedDay.gratitude}"</p>
              </div>
            )}
            {selectedDay.habits_count !== undefined && (
              <p className="text-xs text-netzach-muted text-center">{selectedDay.habits_count} hábitos registrados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
