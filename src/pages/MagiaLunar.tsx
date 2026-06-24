import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getMoonPhase } from '../utils/mysticMath';

const PHASE_CONTENT: Record<string, {
  emoji: string; subtitle: string; color: string;
  energy: string; ritual: string; intention: string;
  herbs: string[]; crystals: string[]; affirmation: string; avoid: string;
}> = {
  Nova: {
    emoji: '🌑', subtitle: 'Início, silêncio e semeadura',
    color: '#2C1452',
    energy: 'A Lua Nova é o momento do útero sagrado — escuro, fértil e cheio de possibilidades. É tempo de introspecção, de limpar o que não serve mais e de plantar intenções novas.',
    ritual: 'Acenda uma vela preta ou roxa. Em um papel, escreva o que você deseja manifestar neste ciclo. Dobre o papel três vezes em direção a você. Guarde-o em um lugar sagrado até a Lua Cheia.',
    intention: 'Novos começos, limpeza energética, introspecção, definição de metas',
    herbs: ['Mirra', 'Sálvia preta', 'Lavanda'],
    crystals: ['Obsidiana', 'Pedra da lua', 'Ônix'],
    affirmation: 'Eu limpo o que já não me serve e abro espaço para o novo. Minhas sementes estão plantadas no solo fértil do universo.',
    avoid: 'Tome decisões impulsivas ou inicie grandes projetos — use este tempo para planejar, não agir.',
  },
  Crescente: {
    emoji: '🌒', subtitle: 'Ação, impulso e crescimento',
    color: '#1A2C52',
    energy: 'A Lua Crescente traz a energia do impulso criativo e da ação. O que foi semeado na Lua Nova começa a brotar. É hora de se mover, construir e dar os primeiros passos.',
    ritual: 'Escreva três ações concretas que você pode fazer esta semana para aproximar sua intenção da realidade. Carregue um cristal verde ou laranja no bolso como lembrete de que você está em movimento.',
    intention: 'Ação, criatividade, construção, aprendizado, momentum',
    herbs: ['Canela', 'Cravo', 'Calêndula'],
    crystals: ['Citrino', 'Aventurina verde', 'Carneliana'],
    affirmation: 'Estou em movimento. Cada passo me aproxima do que desejo criar. Confio no meu impulso.',
    avoid: 'Desistir ao primeiro obstáculo — a resistência desta fase é parte do crescimento.',
  },
  Cheia: {
    emoji: '🌕', subtitle: 'Plenitude, gratidão e manifestação',
    color: '#2C2A14',
    energy: 'A Lua Cheia é o ápice do ciclo — máxima luminosidade, energia intensa e emocional. Aquilo que foi plantado na Lua Nova agora está se revelando. É tempo de celebrar, agradecer e liberar o que não cabe mais.',
    ritual: 'Deixe seus cristais e água na luz da lua durante a noite. Escreva uma lista de gratidões com tudo que floresceu neste ciclo. Tome um banho de ervas com flores brancas e sal grosso para purificar e celebrar.',
    intention: 'Manifestação, gratidão, celebração, cura, clareza emocional',
    herbs: ['Rosas brancas', 'Jasmim', 'Camomila', 'Sal grosso'],
    crystals: ['Quartzo transparente', 'Selenita', 'Pedra da lua'],
    affirmation: 'Estou plena. Sou grata pelo que veio. Libero com amor o que já cumpriu seu propósito.',
    avoid: 'Tomar decisões em estados emocionais intensos — a energia da Lua Cheia amplifica tudo.',
  },
  Minguante: {
    emoji: '🌘', subtitle: 'Liberação, desapego e gratidão',
    color: '#1A2C1A',
    energy: 'A Lua Minguante convida ao desapego e à dissolução. É tempo de soltar padrões, relacionamentos, crenças e situações que já não te servem. Quanto mais você libera, mais espaço cria para o próximo ciclo.',
    ritual: 'Em um papel, escreva o que você quer soltar — uma mágoa, um medo, um padrão. Queime o papel com segurança (ou rasgue e descarte em água corrente) visualizando aquela energia se dissolvendo. Respire fundo três vezes.',
    intention: 'Liberação, perdão, finalização, descanso, soltura',
    herbs: ['Eucalipto', 'Alecrim', 'Arruda', 'Enxofre'],
    crystals: ['Ametista', 'Turmalina negra', 'Labradorita'],
    affirmation: 'Eu solto com amor e gratidão. Libero o que não é mais meu. Faço espaço para o novo ciclo.',
    avoid: 'Iniciar novos projetos — use esta energia para finalizar, limpar e descansar.',
  },
};

export default function MagiaLunar() {
  const navigate = useNavigate();
  const { phase, label } = getMoonPhase();
  const content = PHASE_CONTENT[phase];

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Magia Lunar</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Ritual alinhado ao ciclo da lua</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">

        {/* Fase atual */}
        <div className="text-center py-8 space-y-3">
          <div className="text-7xl">{content.emoji}</div>
          <p className="text-xs text-netzach-muted uppercase tracking-widest">Lua atual</p>
          <h2 className="font-mystic text-3xl text-netzach-gold">{label}</h2>
          <p className="text-sm text-netzach-muted">{content.subtitle}</p>
        </div>

        {/* Energia da fase */}
        <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">Energia desta fase</p>
          <p className="text-sm text-netzach-text/90 leading-relaxed">{content.energy}</p>
        </div>

        {/* Ritual */}
        <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-border rounded-2xl p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">✦ Ritual desta fase</p>
          <p className="text-sm text-netzach-text/90 leading-relaxed">{content.ritual}</p>
        </div>

        {/* Intenção */}
        <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 flex gap-3 items-start">
          <span className="text-xl">🎯</span>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-netzach-gold font-bold">Intenções desta lua</p>
            <p className="text-sm text-netzach-text/90 mt-0.5">{content.intention}</p>
          </div>
        </div>

        {/* Ervas e Cristais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-netzach-gold font-bold">🌿 Ervas</p>
            <ul className="space-y-1">
              {content.herbs.map(h => (
                <li key={h} className="text-sm text-netzach-text/90">{h}</li>
              ))}
            </ul>
          </div>
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-netzach-gold font-bold">💎 Cristais</p>
            <ul className="space-y-1">
              {content.crystals.map(c => (
                <li key={c} className="text-sm text-netzach-text/90">{c}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Afirmação */}
        <div className="border border-netzach-gold/30 rounded-2xl p-5 text-center space-y-2 bg-netzach-gold/5">
          <p className="text-[10px] uppercase tracking-widest text-netzach-gold">Afirmação lunar</p>
          <p className="font-mystic text-lg text-white italic leading-relaxed">"{content.affirmation}"</p>
        </div>

        {/* O que evitar */}
        <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 flex gap-3 items-start">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-netzach-muted font-bold">Nesta fase, evite</p>
            <p className="text-sm text-netzach-text/70 mt-0.5">{content.avoid}</p>
          </div>
        </div>

        {/* Fases do ciclo */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold">As 4 faces da lua</p>
          <div className="grid grid-cols-4 gap-2">
            {(['Nova','Crescente','Cheia','Minguante'] as const).map(p => (
              <div key={p} className={`rounded-xl p-3 text-center border transition-all ${p === phase ? 'border-netzach-gold bg-netzach-gold/10' : 'border-netzach-border bg-netzach-card'}`}>
                <div className="text-xl">{PHASE_CONTENT[p].emoji}</div>
                <p className={`text-[10px] mt-1 ${p === phase ? 'text-netzach-gold font-bold' : 'text-netzach-muted'}`}>{p}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
