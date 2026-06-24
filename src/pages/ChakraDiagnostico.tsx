import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

const QUESTIONS = [
  { id: 1, chakra: 'root',    text: 'Me sinto segura financeiramente e fisicamente no meu corpo.' },
  { id: 2, chakra: 'sacral',  text: 'Sinto prazer, criatividade e fluidez emocional na minha vida.' },
  { id: 3, chakra: 'solar',   text: 'Tenho confiança nas minhas decisões e sinto meu poder pessoal.' },
  { id: 4, chakra: 'heart',   text: 'Consigo dar e receber amor com leveza, sem medo de me machucar.' },
  { id: 5, chakra: 'throat',  text: 'Expresso minha verdade com clareza e me sinto ouvida.' },
  { id: 6, chakra: 'third',   text: 'Confio na minha intuição e tenho clareza sobre meu caminho.' },
  { id: 7, chakra: 'crown',   text: 'Me sinto conectada ao sagrado, ao universo e ao meu propósito.' },
  { id: 8, chakra: 'root',    text: 'Me sinto enraizada, presente e com senso de pertencimento.' },
  { id: 9, chakra: 'sacral',  text: 'Honro minha sensualidade e minha ciclicidade feminina.' },
  { id: 10, chakra: 'solar',  text: 'Consigo estabelecer limites saudáveis e dizer não sem culpa.' },
];

const CHAKRAS: Record<string, {
  name: string; color: string; glyph: string; element: string;
  affirmation: string; food: string; crystal: string; movement: string; mantra: string;
  description: string;
}> = {
  root: {
    name: 'Muladhara — Raiz', color: '#C0392B', glyph: '🔴',
    element: 'Terra',
    description: 'Seu chakra raiz pede atenção. Você pode estar se sentindo insegura, ansiosa ou desconectada do seu corpo.',
    affirmation: 'Eu estou segura. Eu pertenço à Terra. Meu corpo é meu lar.',
    food: 'Raízes (beterraba, cenoura, inhame), proteínas, alimentos vermelhos',
    crystal: 'Turmalina negra, hematita, jaspe vermelho',
    movement: 'Caminhadas descalça na terra, agachamentos, yoga restaurativa',
    mantra: 'LAM',
  },
  sacral: {
    name: 'Svadhisthana — Sacral', color: '#E67E22', glyph: '🟠',
    element: 'Água',
    description: 'Seu centro criativo e emocional está pedindo fluidez. Pode haver bloqueios em prazer, sexualidade ou emoções represadas.',
    affirmation: 'Eu mereço prazer. Minhas emoções são sagradas e fluem com leveza.',
    food: 'Frutas laranjas (manga, mamão, laranja), líquidos, mel',
    crystal: 'Carneliana, pedra da lua, calcita laranja',
    movement: 'Dança do ventre, movimentos ondulares de quadril, nado',
    mantra: 'VAM',
  },
  solar: {
    name: 'Manipura — Plexo Solar', color: '#F1C40F', glyph: '🟡',
    element: 'Fogo',
    description: 'Seu poder pessoal está em desequilíbrio. Pode haver dificuldade com autoconfiança, limites ou excesso de controle.',
    affirmation: 'Eu sou poderosa. Confio em mim mesma. Meu fogo interior me guia.',
    food: 'Alimentos amarelos (banana, abacaxi, milho), especiarias quentes',
    crystal: 'Citrino, olho de tigre, âmbar',
    movement: 'Pranayama de fogo (Kapalabhati), abdominais, dança livre',
    mantra: 'RAM',
  },
  heart: {
    name: 'Anahata — Coração', color: '#27AE60', glyph: '💚',
    element: 'Ar',
    description: 'Seu coração precisa de abertura e cura. Pode haver mágoas não processadas, dificuldade de amar a si mesma ou de confiar.',
    affirmation: 'Eu me amo incondicionalmente. Meu coração está aberto para dar e receber amor.',
    food: 'Vegetais verdes, chá verde, brócolis, espinafre',
    crystal: 'Quartzo rosa, aventurina, malaquita',
    movement: 'Aberturas de peito (Sphinx, Camel pose), abraços, respiração profunda',
    mantra: 'YAM',
  },
  throat: {
    name: 'Vishuddha — Garganta', color: '#2980B9', glyph: '🔵',
    element: 'Éter',
    description: 'Sua expressão está bloqueada. Pode ser difícil dizer sua verdade, pedir o que precisa ou ser ouvida.',
    affirmation: 'Minha voz é sagrada. Falo minha verdade com amor e clareza.',
    food: 'Frutas azuis (mirtilo, amora), chás de ervas, mel com gengibre',
    crystal: 'Lápis-lazúli, aquamarina, turquesa',
    movement: 'Cantar, humming, gritar no travesseiro, Sarvangasana (vela)',
    mantra: 'HAM',
  },
  third: {
    name: 'Ajna — Terceiro Olho', color: '#8E44AD', glyph: '🟣',
    element: 'Luz',
    description: 'Sua intuição e clareza mental precisam de ativação. Pode haver confusão, dificuldade de tomar decisões ou desconexão da intuição.',
    affirmation: 'Confio na minha intuição. Vejo com clareza o caminho que é para mim.',
    food: 'Uvas roxas, berinjela, chocolate amargo, chá de lavanda',
    crystal: 'Ametista, labradorita, sodalita',
    movement: 'Meditação com foco entre as sobrancelhas, Tratak (fixar vela)',
    mantra: 'OM',
  },
  crown: {
    name: 'Sahasrara — Coroa', color: '#9B59B6', glyph: '⚪',
    element: 'Consciência',
    description: 'Sua conexão espiritual está pedindo atenção. Pode haver sensação de vazio, falta de propósito ou desconexão do sagrado.',
    affirmation: 'Eu sou uma com o universo. Estou aberta à orientação divina.',
    food: 'Jejum consciente, chás, alimentos de cor branca ou violeta',
    crystal: 'Selenita, quartzo transparente, ametista branca',
    movement: 'Meditação em silêncio, Savasana prolongado, contemplação na natureza',
    mantra: 'OM ou silêncio',
  },
};

const OPTIONS = [
  { label: 'Nunca', value: 1 },
  { label: 'Às vezes', value: 2 },
  { label: 'Frequentemente', value: 3 },
  { label: 'Sempre', value: 4 },
];

export default function ChakraDiagnostico() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<string | null>(null);

  const current = QUESTIONS[step];
  const total = QUESTIONS.length;

  const handleAnswer = (value: number) => {
    const next = { ...answers, [current.id]: value };
    setAnswers(next);

    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      // Calculate lowest-scoring chakra
      const scores: Record<string, number[]> = {};
      QUESTIONS.forEach(q => {
        if (!scores[q.chakra]) scores[q.chakra] = [];
        scores[q.chakra].push(next[q.id] ?? 1);
      });
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const lowest = Object.entries(scores).sort((a, b) => avg(a[1]) - avg(b[1]))[0][0];
      setResult(lowest);
    }
  };

  const reset = () => { setStep(0); setAnswers({}); setResult(null); };

  const chakra = result ? CHAKRAS[result] : null;
  const progress = ((step) / total) * 100;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Diagnóstico de Chakras</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Descubra qual centro energético precisa de cuidado</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">

        {!result ? (
          <div className="space-y-6">
            {/* Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-netzach-muted">
                <span>Pergunta {step + 1} de {total}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-netzach-card rounded-full overflow-hidden">
                <div className="h-full bg-netzach-gold rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Pergunta */}
            <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 space-y-6 min-h-[200px] flex flex-col justify-between">
              <p className="font-mystic text-xl text-white leading-relaxed">{current.text}</p>
              <p className="text-xs text-netzach-muted uppercase tracking-wider">Com que frequência isso é verdade para você?</p>
            </div>

            {/* Opções */}
            <div className="grid grid-cols-2 gap-3">
              {OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="py-4 rounded-xl border border-netzach-border text-sm font-medium text-netzach-muted hover:border-netzach-gold hover:text-white transition-all active:scale-95"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : chakra ? (
          <div className="space-y-5">
            {/* Resultado */}
            <div className="text-center py-6 space-y-2">
              <div className="text-5xl mb-3">{chakra.glyph}</div>
              <p className="text-xs text-netzach-muted uppercase tracking-widest">Chakra em desequilíbrio</p>
              <h2 className="font-mystic text-2xl text-white">{chakra.name}</h2>
              <p className="text-xs text-netzach-muted">Elemento: {chakra.element}</p>
            </div>

            {/* Diagnóstico */}
            <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-2">
              <p className="text-sm text-netzach-text/90 leading-relaxed">{chakra.description}</p>
            </div>

            {/* Afirmação */}
            <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-border rounded-2xl p-5 text-center space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-netzach-gold">Afirmação</p>
              <p className="font-mystic text-lg text-white italic">"{chakra.affirmation}"</p>
            </div>

            {/* Protocolo */}
            <div className="space-y-3">
              {[
                { label: 'Mantra', value: chakra.mantra, icon: '🔔' },
                { label: 'Cristal', value: chakra.crystal, icon: '💎' },
                { label: 'Alimentação', value: chakra.food, icon: '🌿' },
                { label: 'Movimento', value: chakra.movement, icon: '🌀' },
              ].map(item => (
                <div key={item.label} className="bg-netzach-card border border-netzach-border rounded-xl p-4 flex gap-3 items-start">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-netzach-gold font-bold">{item.label}</p>
                    <p className="text-sm text-netzach-text/90 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 text-sm text-netzach-muted border border-netzach-border py-3 rounded-xl hover:text-white hover:border-netzach-gold/50 transition-all"
            >
              <RefreshCw size={14} /> Refazer diagnóstico
            </button>
          </div>
        ) : null}

      </main>
    </div>
  );
}
