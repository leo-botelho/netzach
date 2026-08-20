import { useState, useEffect } from 'react';
import type { PerfilParcial } from '../types';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMoonPhase, calculateCycleStatus } from '../utils/mysticMath';

// Arquétipos baseados na fase do ciclo
const CYCLE_ARCHETYPES: Record<string, {
  archetype: string; goddess: string; emoji: string;
  energy: string; gifts: string[]; shadow: string; ritual: string; affirmation: string;
}> = {
  Menstrual: {
    archetype: 'A Sábia / A Bruxa', goddess: 'Hécate · Lilith · Kali',
    emoji: '🌑',
    energy: 'Introspecção profunda, clareza oracular, morte e renascimento. Esta é a fase mais poderosa do seu ciclo, um portal para insights que só chegam no silêncio.',
    gifts: ['Clareza intuitiva', 'Capacidade de soltar', 'Visão profética', 'Descanso restaurador'],
    shadow: 'Irritabilidade, isolamento excessivo, julgamento crítico. Honre sua necessidade de recolhimento sem se punir por ela.',
    ritual: 'Reserve um tempo para si. Journaling profundo, banho quente com sal e ervas, meditação guiada. Evite grandes decisões e compromissos sociais, este é seu templo interno.',
    affirmation: 'Honro meu sangue sagrado. Minha necessidade de descanso é sagrada. Sou a Sábia que conhece os mistérios.',
  },
  Folicular: {
    archetype: 'A Virgem / A Donzela', goddess: 'Ártemis · Perséfone · Afrodite',
    emoji: '🌒',
    energy: 'Renovação, curiosidade, expansão e possibilidades. Você está renascendo, mais leve, mais esperançosa, com energia crescente e criatividade em ebulição.',
    gifts: ['Energia renovada', 'Abertura para o novo', 'Otimismo natural', 'Foco e clareza mental'],
    shadow: 'Dispersão por excesso de projetos, comprometer-se demais antes de ter certeza. Canalize a energia com discernimento.',
    ritual: 'Inicie novos projetos, pratique exercícios energizantes, explore novas ideias. É tempo de plantar sementes, físicas, emocionais e criativas.',
    affirmation: 'Estou renascendo. Sou possibilidade pura. Minha energia criativa floresce a cada dia.',
  },
  Ovulatória: {
    archetype: 'A Mãe / A Rainha', goddess: 'Ísis · Afrodite · Deméter',
    emoji: '🌕',
    energy: 'Plenitude, magnetismo, carisma e conexão. Você está no ápice do seu poder, magnética, comunicativa, fértil (em todos os sentidos) e irresistível.',
    gifts: ['Magnetismo pessoal', 'Comunicação fluida', 'Amor e generosidade', 'Liderança natural'],
    shadow: 'Perfeccionismo, querer agradar a todos, perda de limites. Fique atenta ao que você diz sim nesta fase de abertura.',
    ritual: 'Conecte-se com outras mulheres, expresse-se criativamente, cuide da sua aparência com amor. Ótimo período para conversas importantes, apresentações e projetos de amor.',
    affirmation: 'Sou plena, fértil e magnética. Meu coração está aberto para dar e receber amor. Sou a Rainha do meu reino.',
  },
  Lútea: {
    archetype: 'A Encantadora / A Feiticeira', goddess: 'Circe · Medéia · Morgana',
    emoji: '🌘',
    energy: 'Profundidade emocional, poder de conclusão, purificação e verdade. Sua sensibilidade está amplificada, você vê através das máscaras e sente tudo mais intensamente.',
    gifts: ['Percepção aguçada', 'Poder de finalização', 'Honestidade radical', 'Limpeza energética'],
    shadow: 'Ansiedade, autocrítica severa, impaciência com o que não está funcionando. O que incomoda nesta fase é o que precisa ser transformado.',
    ritual: 'Finalize projetos, organize o ambiente, limpe o que não serve. Pratique a escrita terapêutica sobre o que te incomoda, a fase lútea diz a verdade.',
    affirmation: 'Minha sensibilidade é um dom. O que incomoda revela o que precisa ser transformado. Sou a Feiticeira que dissolve ilusões.',
  },
};

// Arquétipos por fase lunar
const MOON_ARCHETYPES: Record<string, {
  lunar: string; element: string; message: string;
}> = {
  Nova:       { lunar: 'Lua Nova, Útero Sagrado',   element: 'Terra',       message: 'Silêncio e gestação. Plante suas intenções no escuro fértil do começo.' },
  Crescente:  { lunar: 'Lua Crescente, Deusa Jovem', element: 'Fogo',       message: 'Movimento e coragem. Dê os primeiros passos com fé no que ainda não vê.' },
  Cheia:      { lunar: 'Lua Cheia, Deusa Plena',     element: 'Água',       message: 'Celebração e manifestação. O que foi plantado agora floresce à luz.' },
  Minguante:  { lunar: 'Lua Minguante, Crone Sábia', element: 'Ar',        message: 'Gratidão e desapego. Libere com amor o que cumpriu seu ciclo.' },
};

export default function SagradoFeminino() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PerfilParcial | null>(null);
  const [loading, setLoading] = useState(true);
  const moon = getMoonPhase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      supabase.from('profiles').select('full_name, last_period_date, cycle_duration').eq('user_id', session.user.id).single()
        .then(({ data }) => { setProfile(data); setLoading(false); });
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic">Sintonizando...</div>;

  const cycle = profile?.last_period_date
    ? calculateCycleStatus(profile.last_period_date, profile.cycle_duration || 28)
    : null;

  const cyclePhase = cycle?.phaseName as keyof typeof CYCLE_ARCHETYPES | undefined;
  const archetype = cyclePhase ? CYCLE_ARCHETYPES[cyclePhase] : null;
  const moonArc = MOON_ARCHETYPES[moon.phase];

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Sagrado Feminino</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Seu arquétipo neste momento</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Sincronia lua + ciclo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-3 text-center">
            <p className="text-2xl">{moon.phase === 'Cheia' ? '🌕' : moon.phase === 'Nova' ? '🌑' : moon.phase === 'Crescente' ? '🌒' : '🌘'}</p>
            <p className="text-[10px] text-netzach-muted uppercase tracking-wider mt-1">Lua</p>
            <p className="font-mystic text-sm text-white">{moon.phase}</p>
            <p className="text-[10px] text-netzach-muted mt-0.5">{moonArc?.element}</p>
          </div>
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-3 text-center">
            {cycle ? (
              <>
                <p className="text-2xl">{archetype?.emoji ?? '🌸'}</p>
                <p className="text-[10px] text-netzach-muted uppercase tracking-wider mt-1">Ciclo · Dia {cycle.dayOfCycle}</p>
                <p className="font-mystic text-sm text-white">{cyclePhase}</p>
              </>
            ) : (
              <>
                <p className="text-2xl">🌸</p>
                <p className="text-[10px] text-netzach-muted uppercase mt-1">Ciclo</p>
                <button onClick={() => navigate('/templo')} className="text-[10px] text-netzach-gold underline">Configurar</button>
              </>
            )}
          </div>
        </div>

        {/* Mensagem lunar */}
        <div className="bg-gradient-to-br from-netzach-card to-netzach-card2 border border-netzach-border rounded-2xl p-5 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">{moonArc?.lunar}</p>
          <p className="text-sm text-netzach-text/90 leading-relaxed italic">"{moonArc?.message}"</p>
        </div>

        {/* Arquétipo do ciclo */}
        {archetype ? (
          <div className="space-y-4">
            <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">Seu arquétipo agora</p>
                <h2 className="font-mystic text-2xl text-white mt-1">{archetype.archetype}</h2>
                <p className="text-xs text-netzach-muted italic">{archetype.goddess}</p>
              </div>
              <p className="text-sm text-netzach-text/90 leading-relaxed">{archetype.energy}</p>
            </div>

            {/* Dons */}
            <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-netzach-gold font-bold">✦ Seus dons desta fase</p>
              <div className="flex flex-wrap gap-2">
                {archetype.gifts.map(g => (
                  <span key={g} className="text-xs bg-netzach-gold/10 border border-netzach-gold/30 text-netzach-gold px-2.5 py-1 rounded-full">{g}</span>
                ))}
              </div>
            </div>

            {/* Sombra */}
            <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-netzach-muted font-bold">⚠️ Sombra a observar</p>
              <p className="text-sm text-netzach-text/80 leading-relaxed">{archetype.shadow}</p>
            </div>

            {/* Ritual */}
            <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-netzach-gold font-bold">🕯️ Ritual sugerido</p>
              <p className="text-sm text-netzach-text/90 leading-relaxed">{archetype.ritual}</p>
            </div>

            {/* Afirmação */}
            <div className="border border-netzach-gold/30 bg-netzach-gold/5 rounded-2xl p-5 text-center space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-netzach-gold">Afirmação do arquétipo</p>
              <p className="font-mystic text-lg text-white italic leading-relaxed">"{archetype.affirmation}"</p>
            </div>
          </div>
        ) : (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 text-center space-y-3">
            <p className="text-3xl">🌸</p>
            <p className="text-sm text-netzach-muted">Registre a data do seu último ciclo para descobrir seu arquétipo atual.</p>
            <button onClick={() => navigate('/templo')} className="text-netzach-gold text-sm underline">Configurar ciclo no Templo</button>
          </div>
        )}

        {/* Todos os 4 arquétipos */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold pl-1">As 4 fases do sagrado feminino</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(CYCLE_ARCHETYPES).map(([phase, data]) => (
              <div key={phase} className={`bg-netzach-card border rounded-xl p-3 ${cyclePhase === phase ? 'border-netzach-gold' : 'border-netzach-border'}`}>
                <p className="text-xl">{data.emoji}</p>
                <p className={`text-xs font-medium mt-1 ${cyclePhase === phase ? 'text-netzach-gold' : 'text-white'}`}>{phase}</p>
                <p className="text-[10px] text-netzach-muted mt-0.5 line-clamp-1">{data.archetype}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
