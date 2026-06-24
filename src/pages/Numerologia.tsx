import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateDestinyNumber, calculateNameNumbers, calculatePersonalArcana } from '../utils/numerology';

interface NumberCard {
  number: number;
  title: string;
  subtitle: string;
  meaning: string;
  keyword: string;
}

const DESTINY_MEANINGS: Record<number, { keyword: string; meaning: string }> = {
  1:  { keyword: 'Liderança', meaning: 'Você veio para liderar, iniciar e ser pioneira. Tem força de vontade, independência e coragem para abrir caminhos.' },
  2:  { keyword: 'Cooperação', meaning: 'Sua missão é mediar, harmonizar e criar pontes entre pessoas. Você possui sensibilidade, diplomacia e intuição profunda.' },
  3:  { keyword: 'Expressão', meaning: 'Nasceu para se expressar, pela arte, palavra, beleza. Alegria, criatividade e comunicação são seus presentes.' },
  4:  { keyword: 'Construção', meaning: 'Sua energia é de solidez, método e construção. Você está aqui para criar bases duradouras com disciplina e dedicação.' },
  5:  { keyword: 'Liberdade', meaning: 'Veio para expandir, explorar e transformar. A liberdade é sua necessidade essencial, você é agente de mudança.' },
  6:  { keyword: 'Amor & Cura', meaning: 'Sua missão é cuidar, nutrir e embelezar. Tem um dom natural para o lar, a família e a cura das relações.' },
  7:  { keyword: 'Sabedoria', meaning: 'Nasceu para buscar a verdade nas profundezas. Intuição, espiritualidade e análise são seus instrumentos de evolução.' },
  8:  { keyword: 'Poder', meaning: 'Sua jornada é de conquista material e autoridade com propósito. Abundância, liderança executiva e legado são seus temas.' },
  9:  { keyword: 'Compaixão', meaning: 'Veio para servir a um ideal maior e ajudar a humanidade a se elevar. Generosidade, sabedoria universal e desapego.' },
  11: { keyword: 'Iluminação', meaning: 'Número Mestre. Você é uma portadora de luz, inspiração, espiritualidade e sensibilidade extrema são seus dons e desafios.' },
  22: { keyword: 'Arquiteta', meaning: 'Número Mestre. Veio para construir algo de impacto coletivo. Grande potencial para transformar visões em realidade concreta.' },
  33: { keyword: 'Mestre Cura', meaning: 'Número Mestre. A mais elevada expressão do amor e da cura. Sua vida é dedicada ao serviço e à elevação espiritual.' },
};

const SOUL_MEANINGS: Record<number, { keyword: string; meaning: string }> = {
  1:  { keyword: 'Autonomia', meaning: 'Sua alma deseja ser livre, independente e única. Você precisa de espaço para liderar e expressar sua individualidade.' },
  2:  { keyword: 'Harmonia', meaning: 'Sua alma anseia por paz, amor e conexão genuína. Precisa de relacionamentos profundos e ambientes harmoniosos para florescer.' },
  3:  { keyword: 'Alegria', meaning: 'Sua alma deseja se expressar com alegria e criatividade. Comunicação, arte e leveza nutrem seu ser mais profundo.' },
  4:  { keyword: 'Segurança', meaning: 'Sua alma busca estabilidade, estrutura e pertencimento. Rotinas saudáveis e um lar seguro são essenciais para você.' },
  5:  { keyword: 'Aventura', meaning: 'Sua alma anseia por variedade, liberdade e experiências intensas. Você precisa de movimento e renovação constante.' },
  6:  { keyword: 'Amor', meaning: 'Sua alma deseja dar e receber amor incondicional. Família, beleza e cuidado alimentam seu espírito mais profundo.' },
  7:  { keyword: 'Verdade', meaning: 'Sua alma busca o conhecimento do sagrado e dos mistérios. Solidão, reflexão e espiritualidade são seus alimentos mais nutritivos.' },
  8:  { keyword: 'Conquista', meaning: 'Sua alma deseja reconhecimento, poder e abundância. Você precisa de conquistas concretas para se sentir realizada.' },
  9:  { keyword: 'Serviço', meaning: 'Sua alma encontra sentido no serviço ao outro e ao coletivo. Compaixão e generosidade são seus maiores presentes e necessidades.' },
  11: { keyword: 'Transcendência', meaning: 'Número Mestre. Sua alma anseia por experiências espirituais profundas e inspirar os outros com sua visão elevada.' },
  22: { keyword: 'Legado', meaning: 'Número Mestre. Sua alma deseja deixar uma marca duradoura no mundo. Construção de algo maior do que você mesma.' },
  33: { keyword: 'Devoção', meaning: 'Número Mestre. Sua alma vive para o amor universal e a cura dos outros. Serviço sagrado é sua fonte de realização.' },
};

const YEAR_MEANINGS: Record<number, { keyword: string; meaning: string }> = {
  1:  { keyword: 'Novo começo', meaning: 'Ano de plantio e novos inícios. Plante suas sementes com intenção, o que você iniciar agora moldará os próximos 9 anos.' },
  2:  { keyword: 'Paciência', meaning: 'Ano de espera criativa e construção de relacionamentos. Cuide dos laços, pratique a paciência e confie no processo.' },
  3:  { keyword: 'Expansão', meaning: 'Ano de alegria, expressão e abundância. Expanda sua criatividade, socialize e deixe sua luz brilhar sem medo.' },
  4:  { keyword: 'Trabalho', meaning: 'Ano de consolidação e construção de bases. Discipline-se, organize sua vida e construa com solidez.' },
  5:  { keyword: 'Mudança', meaning: 'Ano de transformações e liberdade. Esteja aberta às mudanças, elas estão te levando para um nível superior.' },
  6:  { keyword: 'Cuidado', meaning: 'Ano de família, relacionamentos e responsabilidades. Cuide de quem você ama e harmonize seu ambiente.' },
  7:  { keyword: 'Reflexão', meaning: 'Ano de espiritualidade, introspecção e cura. Desacelere, estude, medite e reconecte-se com sua essência.' },
  8:  { keyword: 'Colheita', meaning: 'Ano de manifestação e recompensas. O que você plantou começa a florescer. Assuma seu poder e sua abundância.' },
  9:  { keyword: 'Conclusão', meaning: 'Ano de fechamentos e liberações. Solte o que não serve mais com gratidão, prepare-se para um novo ciclo.' },
  11: { keyword: 'Iluminação', meaning: 'Ano Mestre de despertar espiritual. Sua intuição está amplificada, confie nas visões e sincronicidades.' },
  22: { keyword: 'Manifestação', meaning: 'Ano Mestre de construção de legados. Suas ações têm potencial de impacto coletivo, aja com consciência.' },
};

function calcPersonalYear(birthDate: string): number {
  const today = new Date();
  const [, mm, dd] = birthDate.split('-');
  const year = today.getFullYear();
  const sum = `${dd}${mm}${year}`.split('').reduce((a, d) => a + +d, 0);
  let n = sum;
  while (n > 9 && n !== 11 && n !== 22) n = n.toString().split('').reduce((a, d) => a + +d, 0);
  return n;
}

function NumberBlock({ card }: { card: NumberCard }) {
  const [open, setOpen] = useState(false);
  const isMaster = [11, 22, 33].includes(card.number);
  return (
    <div className={`bg-netzach-card border rounded-2xl p-5 space-y-3 transition-all ${isMaster ? 'border-netzach-gold/50' : 'border-netzach-border'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold">{card.subtitle}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mystic text-4xl text-netzach-gold">{card.number}</span>
            {isMaster && <span className="text-[9px] bg-netzach-gold/20 border border-netzach-gold/40 text-netzach-gold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Mestre</span>}
          </div>
          <p className="font-mystic text-lg text-white">{card.title} · <span className="text-netzach-muted text-sm">{card.keyword}</span></p>
        </div>
      </div>
      <button onClick={() => setOpen(!open)} className="text-xs text-netzach-gold hover:underline">
        {open ? 'Ocultar ↑' : 'Ver significado ↓'}
      </button>
      {open && <p className="text-sm text-netzach-text/90 leading-relaxed">{card.meaning}</p>}
    </div>
  );
}

export default function Numerologia() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name?: string; birth_date?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      supabase.from('profiles').select('full_name, birth_date').eq('user_id', session.user.id).single()
        .then(({ data }) => { setProfile(data); setLoading(false); });
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic">Calculando...</div>;

  if (!profile?.full_name || !profile?.birth_date) {
    return (
      <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
        <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
          <h1 className="font-mystic text-netzach-gold text-lg">Numerologia</h1>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <p className="text-3xl">🔢</p>
          <p className="text-netzach-muted">Complete seu nome completo e data de nascimento no perfil para ver sua numerologia.</p>
          <button onClick={() => navigate('/perfil')} className="bg-netzach-gold text-netzach-bg font-bold px-6 py-3 rounded-xl hover:bg-white transition-colors">Completar Perfil</button>
        </div>
      </div>
    );
  }

  const destinyNum = calculateDestinyNumber(profile.birth_date);
  const nameNums = calculateNameNumbers(profile.full_name);
  const arcanaNum = calculatePersonalArcana(profile.birth_date);
  const yearNum = calcPersonalYear(profile.birth_date);

  const cards: NumberCard[] = [
    {
      number: destinyNum,
      title: DESTINY_MEANINGS[destinyNum]?.keyword ?? '',
      subtitle: 'Número de Destino, Data de Nascimento',
      keyword: 'Sua missão de vida',
      meaning: DESTINY_MEANINGS[destinyNum]?.meaning ?? '',
    },
    {
      number: nameNums.soul,
      title: SOUL_MEANINGS[nameNums.soul]?.keyword ?? '',
      subtitle: 'Número da Alma, Vogais do Nome',
      keyword: 'O que sua alma deseja',
      meaning: SOUL_MEANINGS[nameNums.soul]?.meaning ?? '',
    },
    {
      number: nameNums.expression,
      title: 'Expressão',
      subtitle: 'Número de Expressão, Nome Completo',
      keyword: 'Como você se manifesta',
      meaning: DESTINY_MEANINGS[nameNums.expression]?.meaning ?? '',
    },
    {
      number: nameNums.personality,
      title: 'Personalidade',
      subtitle: 'Número da Personalidade, Consoantes',
      keyword: 'Sua máscara para o mundo',
      meaning: SOUL_MEANINGS[nameNums.personality]?.meaning ?? '',
    },
    {
      number: yearNum,
      title: YEAR_MEANINGS[yearNum]?.keyword ?? '',
      subtitle: `Ano Pessoal ${new Date().getFullYear()}`,
      keyword: 'A energia do seu ano',
      meaning: YEAR_MEANINGS[yearNum]?.meaning ?? '',
    },
  ];

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Numerologia Pessoal</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">{profile.full_name}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Arcano pessoal destaque */}
        <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-gold/30 rounded-2xl p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-netzach-gold/20 border border-netzach-gold/40 flex items-center justify-center shrink-0">
            <span className="font-mystic text-3xl text-netzach-gold">{arcanaNum}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">Arcano Pessoal</p>
            <p className="font-mystic text-xl text-white">Número {arcanaNum}</p>
            <p className="text-xs text-netzach-muted mt-0.5">Seu arquétipo de evolução espiritual</p>
          </div>
        </div>

        {/* Blocos numerológicos */}
        {cards.map((card, i) => <NumberBlock key={i} card={card} />)}

      </main>
    </div>
  );
}
