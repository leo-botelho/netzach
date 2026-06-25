import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, Lock, BookMarked, Check } from 'lucide-react';
import type { Profile } from '../types';
import { getMoonPhase, calculateCycleStatus } from '../utils/mysticMath';
import { calcularMatrizDestino } from '../utils/calculationsMatriz';

// ── Configuração por plano ───────────────────────────────────
const PLAN_CONFIG: Record<string, {
  name: string;
  title: string;
  weeklyLimit: number;
  symbol: string;
  gradient: string;
}> = {
  hecate: {
    name: 'Hécate',
    title: 'Guardiã das Encruzilhadas',
    weeklyLimit: 5,
    symbol: '🌑',
    gradient: 'from-slate-900 to-purple-950',
  },
  isis: {
    name: 'Ísis',
    title: 'Deusa da Cura e do Amor',
    weeklyLimit: 20,
    symbol: '☽',
    gradient: 'from-purple-900 to-rose-950',
  },
  lilith: {
    name: 'Lilith',
    title: 'Soberania Feminina',
    weeklyLimit: -1,
    symbol: '✦',
    gradient: 'from-purple-950 to-netzach-card',
  },
};
const DEFAULT_PLAN = {
  name: 'Hécate',
  title: 'Guardiã das Encruzilhadas',
  weeklyLimit: 3,
  symbol: '🌑',
  gradient: 'from-slate-900 to-purple-950',
};

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

// ── Tipos ────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  'Qual banho me protege hoje?',
  'Que floral de Bach preciso agora?',
  'Que óleo essencial combina com meu momento?',
  'Sugestão de ritual para esta lua',
  'Como equilibrar minha energia hoje?',
];

// ── Componente ────────────────────────────────────────────────
export default function Sacerdotisa() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate('/portal');

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (data) {
      setProfile(data as Profile);
      const planKey = (data.plan_type ?? '').toLowerCase();
      setPlan(PLAN_CONFIG[planKey] ?? DEFAULT_PLAN);
    }

    // Carrega uso da semana
    const weekStart = getWeekStart();
    const { data: usage } = await supabase
      .from('sacerdotisa_usage')
      .select('count')
      .eq('user_id', session.user.id)
      .gte('date', weekStart);

    const total = (usage ?? []).reduce((sum, r) => sum + (r.count as number), 0);
    setWeeklyUsed(total);

    setProfileLoading(false);
  };

  const buildContext = () => {
    if (!profile) return {};
    const moon = getMoonPhase();
    const cycle = profile.last_period_date
      ? calculateCycleStatus(profile.last_period_date, profile.cycle_duration ?? 28)
      : null;

    let arcano_central: number | undefined;
    if (profile.birth_date) {
      try {
        const matriz = calcularMatrizDestino(profile.birth_date);
        arcano_central = matriz.central.maior.arcano;
      } catch { /* ignora */ }
    }

    return {
      signo_solar: profile.sign_sun ?? undefined,
      signo_lunar: profile.sign_moon ?? undefined,
      ascendente: profile.sign_rising ?? undefined,
      fase_lua: moon?.phase,
      fase_ciclo: cycle?.phaseName ?? undefined,
      arcano_central,
    };
  };

  const remaining = plan.weeklyLimit === -1
    ? Infinity
    : plan.weeklyLimit - weeklyUsed;

  const isLimited = remaining <= 0;

  const saveToGrimorio = async (msgIndex: number) => {
    if (savedIndexes.has(msgIndex)) return;
    const response = messages[msgIndex]?.content;
    if (!response) return;

    const prompt = messages[msgIndex - 1]?.role === 'user' ? messages[msgIndex - 1].content : null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('sacerdotisa_history').insert({
      user_id: session.user.id,
      module: 'sacerdotisa',
      prompt,
      response,
      saved: true,
    });

    if (!error) {
      setSavedIndexes(prev => new Set(prev).add(msgIndex));
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || isLimited) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sacerdotisa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ message: text, context: buildContext() }),
        }
      );

      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: errData.message ?? 'Você atingiu o limite semanal.' };
          return updated;
        });
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const json = JSON.parse(line.slice(6)) as { text?: string };
              if (json.text) {
                fullText += json.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: fullText };
                  return updated;
                });
              }
            } catch { /* linha mal-formada */ }
          }
        }
      }

      if (!fullText) throw new Error('Resposta vazia');

      // Atualiza contagem local
      setWeeklyUsed(prev => prev + 1);

    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'As estrelas estão silenciosas agora. Verifique sua conexão e tente novamente.',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic animate-pulse">
        Convocando...
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'querida';

  return (
    <div className="min-h-screen bg-netzach-bg flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/servicos')} className="text-netzach-muted hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${plan.gradient} border border-netzach-border flex items-center justify-center text-lg`}>
            {plan.symbol}
          </div>
          <div>
            <h1 className="font-mystic text-netzach-gold text-base leading-none">{plan.name}</h1>
            <p className="text-[10px] text-netzach-muted uppercase tracking-widest">{plan.title}</p>
          </div>
        </div>

        {/* Contador de perguntas */}
        {plan.weeklyLimit !== -1 && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${
            remaining <= 1
              ? 'border-red-500/40 text-red-400 bg-red-900/10'
              : 'border-netzach-border text-netzach-muted'
          }`}>
            <Sparkles size={10} />
            <span>{remaining <= 0 ? '0' : remaining} restante{remaining !== 1 ? 's' : ''}</span>
          </div>
        )}
      </header>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

        {/* Estado inicial — sem mensagens */}
        {messages.length === 0 && !isLimited && (
          <div className="text-center py-8">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${plan.gradient} border border-netzach-gold/30 flex items-center justify-center text-4xl shadow-lg shadow-purple-900/40 orb-pulse`}>
              {plan.symbol}
            </div>
            <h2 className="font-mystic text-xl text-white mb-2">
              Olá, {firstName}
            </h2>
            <p className="text-sm text-netzach-muted max-w-xs mx-auto leading-relaxed">
              Sua sacerdotisa pessoal está aqui. Pergunte sobre banhos, óleos, florais, cristais ou qualquer orientação espiritual.
            </p>
            {plan.weeklyLimit !== -1 && (
              <p className="text-[11px] text-netzach-muted mt-3">
                {remaining} consulta{remaining !== 1 ? 's' : ''} disponíve{remaining !== 1 ? 'is' : 'l'} esta semana
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-netzach-card border border-netzach-border text-netzach-muted hover:text-white hover:border-netzach-gold/50 px-3 py-2 rounded-full transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estado de limite atingido — sem mensagens ainda */}
        {messages.length === 0 && isLimited && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-netzach-card border border-netzach-border flex items-center justify-center">
              <Lock size={24} className="text-netzach-muted" />
            </div>
            <h2 className="font-mystic text-lg text-white mb-2">Sacerdotisa descansa</h2>
            <p className="text-sm text-netzach-muted max-w-xs mx-auto leading-relaxed mb-6">
              Você já usou suas {plan.weeklyLimit} consultas desta semana. Os créditos renovam na próxima segunda-feira.
            </p>
            <button
              onClick={() => navigate('/assinar')}
              className="bg-netzach-gold text-netzach-bg px-6 py-3 rounded-xl font-mystic font-bold hover:bg-white transition-colors text-sm"
            >
              Aprofundar com Lilith, ilimitado
            </button>
          </div>
        )}

        {/* Mensagens */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'assistant' && (
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${plan.gradient} border border-netzach-border flex items-center justify-center text-sm shrink-0 mt-1`}>
                {plan.symbol}
              </div>
            )}
            <div className="max-w-[80%] flex flex-col gap-1">
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-netzach-accent text-white rounded-tr-sm'
                  : 'bg-netzach-card border border-netzach-border text-netzach-text rounded-tl-sm'
              }`}>
                {msg.content}
                {msg.role === 'assistant' && msg.content === '' && loading && (
                  <span className="inline-flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-netzach-gold rounded-full dot-bounce-1" />
                    <span className="w-1.5 h-1.5 bg-netzach-gold rounded-full dot-bounce-2" />
                    <span className="w-1.5 h-1.5 bg-netzach-gold rounded-full dot-bounce-3" />
                  </span>
                )}
              </div>
              {msg.role === 'assistant' && msg.content && !(loading && i === messages.length - 1) && (
                <button
                  onClick={() => saveToGrimorio(i)}
                  className={`self-start flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    savedIndexes.has(i)
                      ? 'border-netzach-gold/40 text-netzach-gold bg-netzach-gold/10 cursor-default'
                      : 'border-netzach-border text-netzach-muted hover:border-netzach-gold/50 hover:text-netzach-gold'
                  }`}
                >
                  {savedIndexes.has(i) ? <Check size={11} /> : <BookMarked size={11} />}
                  {savedIndexes.has(i) ? 'Salvo no Grimório' : 'Salvar no Grimório'}
                </button>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input — bloqueado se limite atingido */}
      <div className="sticky bottom-0 bg-netzach-bg/95 backdrop-blur-md border-t border-netzach-border px-4 py-3 pb-6">
        {isLimited ? (
          <div className="flex items-center justify-between bg-netzach-card border border-netzach-border rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-netzach-muted">
              <Lock size={14} />
              <span>Limite semanal atingido</span>
            </div>
            <button
              onClick={() => navigate('/assinar')}
              className="text-xs text-netzach-gold border border-netzach-gold/50 px-3 py-1 rounded-lg hover:bg-netzach-gold hover:text-netzach-bg transition-all"
            >
              Upgrade
            </button>
          </div>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2 items-end"
          >
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
              }}
              placeholder="Pergunte à Sacerdotisa..."
              className="flex-1 bg-netzach-card border border-netzach-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-netzach-muted outline-none focus:border-netzach-gold/50 resize-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-netzach-gold text-netzach-bg flex items-center justify-center hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
