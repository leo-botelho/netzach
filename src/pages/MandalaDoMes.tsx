import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMoonPhase } from '../utils/mysticMath';

const MOON_PHASES_DATA: { phase: string; emoji: string; energy: string; ritual: string }[] = [
  { phase: 'Lua Nova', emoji: '🌑', energy: 'Plantio de intenções, silêncio fértil, início de ciclos', ritual: 'Escreva 3 intenções para o mês em papel e coloque sob uma pedra ou cristal' },
  { phase: 'Lua Crescente', emoji: '🌒', energy: 'Ação, crescimento, momentum, coragem', ritual: 'Dê um primeiro passo em direção ao seu objetivo mais importante do mês' },
  { phase: 'Lua Cheia', emoji: '🌕', energy: 'Manifestação, celebração, plenitude, clareza', ritual: 'Faça um banho de lua cheia, agua com sal e flores sob o luar' },
  { phase: 'Lua Minguante', emoji: '🌘', energy: 'Gratidão, desapego, liberação, conclusão', ritual: 'Liste 3 coisas que você quer liberar e queime o papel com gratidão' },
];

const TAROT_MONTHS: Record<number, { name: string; number: number; meaning: string }> = {
  1: { number: 1, name: 'O Mago', meaning: 'Mês de iniciar com intenção. Você tem todos os recursos, use-os.' },
  2: { number: 2, name: 'A Sacerdotisa', meaning: 'Mês de escuta interior. Confie na sua intuição acima de tudo.' },
  3: { number: 3, name: 'A Imperatriz', meaning: 'Mês de criatividade e abundância. Floresça sem pedir permissão.' },
  4: { number: 4, name: 'O Imperador', meaning: 'Mês de estrutura e bases. Construa com disciplina e propósito.' },
  5: { number: 5, name: 'O Hierofante', meaning: 'Mês de aprendizado sagrado. Busque mentoras e ensinamentos.' },
  6: { number: 6, name: 'Os Enamorados', meaning: 'Mês de escolhas do coração. Alinhe ações com seus valores.' },
  7: { number: 7, name: 'O Carro', meaning: 'Mês de movimento e conquistas. Avance com determinação.' },
  8: { number: 8, name: 'A Força', meaning: 'Mês de coragem suave. Sua força vem da compaixão, não da luta.' },
  9: { number: 9, name: 'O Eremita', meaning: 'Mês de introspecção profunda. Recolha-se para encontrar respostas.' },
  10: { number: 10, name: 'A Roda da Fortuna', meaning: 'Mês de mudanças e ciclos. Confie no fluxo da vida.' },
  11: { number: 11, name: 'A Justiça', meaning: 'Mês de equilíbrio e verdade. Alinhe suas ações com sua alma.' },
  12: { number: 12, name: 'O Enforcado', meaning: 'Mês de pausa e rendição. Solte o controle e confie no processo.' },
};

function calcMonthArcano(month: number, year: number): number {
  const sum = (month + year).toString().split('').reduce((a, d) => a + +d, 0);
  let n = sum;
  while (n > 12) n = n.toString().split('').reduce((a, d) => a + +d, 0);
  return n || 12;
}

function calcPersonalMonthNumber(birthDate: string): number {
  const today = new Date();
  const [, mm, dd] = birthDate.split('-');
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const sum = (+dd + +mm + month + year).toString().split('').reduce((a, d) => a + +d, 0);
  let n = sum;
  while (n > 9 && n !== 11 && n !== 22) n = n.toString().split('').reduce((a, d) => a + +d, 0);
  return n;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function MandalaDoMes() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [intention, setIntention] = useState('');
  const [savedIntention, setSavedIntention] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const monthArcano = calcMonthArcano(month, year);
  const tarot = TAROT_MONTHS[monthArcano];
  const moon = getMoonPhase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      supabase.from('profiles').select('full_name, birth_date').eq('user_id', session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
      // Load saved intention
      const key = `mandala_${year}_${month}`;
      supabase.from('mandala_intentions').select('intention').eq('user_id', session.user.id).eq('month_key', key).maybeSingle()
        .then(({ data }) => { if (data?.intention) { setIntention(data.intention); setSavedIntention(data.intention); } });
    });
  }, []);

  const handleSave = async () => {
    if (!intention.trim() || saving) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const key = `mandala_${year}_${month}`;
    await supabase.from('mandala_intentions').upsert({ user_id: session.user.id, month_key: key, intention, updated_at: new Date().toISOString() }, { onConflict: 'user_id,month_key' });
    setSavedIntention(intention);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const personalMonth = profile?.birth_date ? calcPersonalMonthNumber(profile.birth_date) : null;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Mandala do Mês</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">{MONTH_NAMES[month - 1]} {year}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Arcano do mês */}
        <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-gold/30 rounded-2xl p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">Arcano do mês</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-netzach-gold/20 border border-netzach-gold/40 flex items-center justify-center shrink-0">
              <span className="font-mystic text-2xl text-netzach-gold">{tarot.number}</span>
            </div>
            <div>
              <h2 className="font-mystic text-2xl text-white">{tarot.name}</h2>
              <p className="text-xs text-netzach-text/80 leading-relaxed mt-1">{tarot.meaning}</p>
            </div>
          </div>
        </div>

        {/* Número pessoal do mês */}
        {personalMonth && (
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-netzach-card border border-netzach-gold/30 flex items-center justify-center shrink-0">
              <span className="font-mystic text-xl text-netzach-gold">{personalMonth}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-netzach-muted font-bold">Seu mês pessoal</p>
              <p className="text-sm text-white font-mystic">Número {personalMonth}</p>
            </div>
          </div>
        )}

        {/* Lua atual */}
        <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 flex items-center gap-4">
          <span className="text-3xl shrink-0">
            {moon.phase === 'Nova' ? '🌑' : moon.phase === 'Crescente' ? '🌒' : moon.phase === 'Cheia' ? '🌕' : '🌘'}
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-netzach-muted font-bold">Lua agora</p>
            <p className="text-sm text-white font-mystic">Lua {moon.phase}</p>
            <p className="text-xs text-netzach-muted mt-0.5">Dia {moon.dayOfCycle} do ciclo lunar</p>
          </div>
        </div>

        {/* Fases lunares do mês */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold pl-1">Fases & rituais do mês</p>
          <div className="space-y-3">
            {MOON_PHASES_DATA.map(p => (
              <div key={p.phase} className={`bg-netzach-card border rounded-xl p-4 space-y-2 ${moon.phase === p.phase.replace('Lua ', '') ? 'border-netzach-gold/50' : 'border-netzach-border'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.emoji}</span>
                  <div>
                    <span className="text-sm font-mystic text-white">{p.phase}</span>
                    {moon.phase === p.phase.replace('Lua ', '') && (
                      <span className="ml-2 text-[9px] bg-netzach-gold/20 border border-netzach-gold/40 text-netzach-gold px-1.5 py-0.5 rounded-full uppercase tracking-wider">agora</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-netzach-muted leading-relaxed">{p.energy}</p>
                <p className="text-xs text-netzach-text/70 italic border-l-2 border-netzach-gold/30 pl-3">{p.ritual}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Intenção do mês */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold pl-1">Sua intenção para {MONTH_NAMES[month - 1]}</p>
          <textarea
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder="O que você quer manifestar, curar ou celebrar neste mês?"
            rows={4}
            className="input-mystic resize-none"
          />
          <button
            onClick={handleSave}
            disabled={!intention.trim() || saving || intention === savedIntention}
            className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saved ? <><Check size={16} /> Intenção salva</> : saving ? 'Salvando...' : <><Save size={16} /> Salvar intenção</>}
          </button>
        </div>

      </main>
    </div>
  );
}
