import { useEffect, useState } from 'react';
import { calculateDestinyNumber, calculateNameNumbers, calculatePersonalArcana } from '../utils/numerology';
import { arcanaMeanings } from '../utils/arcanaMeanings';
import { Sparkles, User, Heart, Eye, Map, X } from 'lucide-react';

interface NumerologyProps {
  fullName: string;
  birthDate?: string;
}

export default function NumerologySection({ fullName, birthDate }: NumerologyProps) {
  const [numbers, setNumbers] = useState({ destiny: 0, expression: 0, soul: 0, personality: 0 });
  const [arcana, setArcana] = useState(0);
  const [arcanaModalOpen, setArcanaModalOpen] = useState(false);

  useEffect(() => {
    const destiny = calculateDestinyNumber(birthDate);
    const nameNums = calculateNameNumbers(fullName);
    const personalArcana = calculatePersonalArcana(birthDate);
    
    setNumbers({ destiny, ...nameNums });
    setArcana(personalArcana);
  }, [fullName, birthDate]);

  const getArcanaName = (num: number): string => {
    const arcanaNames: string[] = [
      "O Louco", "O Mago", "A Sacerdotisa", "A Imperatriz", "O Imperador",
      "O Hierofante", "Os Enamorados", "O Carro", "A Justiça", "O Eremita",
      "A Roda da Fortuna", "A Força", "O Pendurado", "A Morte", "A Temperança",
      "O Diabo", "A Torre", "A Estrela", "A Lua", "O Sol",
      "O Julgamento", "O Mundo", "O Louco"
    ];
    return arcanaNames[num] || "Desconhecido";
  };

  const getArcanaMeaning = (): string => {
    const meaning = arcanaMeanings[arcana];
    return meaning ? meaning.mission : 'Significado ainda não disponível.';
  };

  const cards = [
    { 
      label: 'Destino', 
      value: numbers.destiny, 
      icon: Map, 
      desc: 'Sua missão de vida (Data)',
      color: 'text-purple-400' 
    },
    { 
      label: 'Expressão', 
      value: numbers.expression, 
      icon: User, 
      desc: 'Seus talentos (Nome Completo)',
      color: 'text-netzach-gold'
    },
    { 
      label: 'Alma', 
      value: numbers.soul, 
      icon: Heart, 
      desc: 'Seus desejos íntimos (Vogais)',
      color: 'text-pink-400' 
    },
    { 
      label: 'Impressão', 
      value: numbers.personality, 
      icon: Eye, 
      desc: 'Como te veem (Consoantes)',
      color: 'text-blue-400' 
    }
  ];

  return (
    <>
      <section className="space-y-4">
        <h3 className="font-mystic text-xl text-white flex items-center gap-2">
          <Sparkles size={20} className="text-netzach-gold"/> Mapa Numerológico
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {cards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div key={card.label} className="bg-netzach-card border border-netzach-border p-4 rounded-xl flex flex-col items-center text-center hover:border-netzach-gold/30 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-widest text-netzach-muted">
                    <IconComponent size={12} className={card.color}/> {card.label}
                </div>
                <span className={`text-3xl font-mystic font-bold ${card.color} drop-shadow-md`}>
                    {card.value || '-'}
                </span>
                <p className="text-[10px] text-netzach-text/60 mt-1">{card.desc}</p>
              </div>
            );
          })}
        </div>

        {arcana > 0 && (
          <button 
            onClick={() => setArcanaModalOpen(true)}
            className="w-full bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-gold/30 rounded-xl p-6 relative overflow-hidden shadow-lg mt-4 hover:border-netzach-gold hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={64}/>
            </div>
            
            <div className="relative z-10">
              <span className="text-[10px] uppercase tracking-[0.2em] text-netzach-gold font-bold block mb-2">
                Seu Arcano Pessoal
              </span>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-netzach-gold/20 border-2 border-netzach-gold flex items-center justify-center">
                  <span className="text-2xl font-mystic font-bold text-netzach-gold">{arcana}</span>
                </div>
                
                <div className="flex-1 text-left">
                  <h4 className="font-mystic text-xl text-white mb-1">{getArcanaName(arcana)}</h4>
                  <p className="text-xs text-netzach-gold hover:underline">Sua missão de vida segundo o Tarô →</p>
                </div>
              </div>
            </div>
          </button>
        )}
      </section>

      {/* Modal do Arcano Pessoal */}
      {arcanaModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-gold/50 p-8 rounded-2xl w-full max-w-lg relative overflow-hidden shadow-2xl">
            
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles size={120}/>
            </div>

            <button 
              onClick={() => setArcanaModalOpen(false)} 
              className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black transition-colors z-10"
            >
              <X size={20}/>
            </button>

            <div className="mb-6 relative z-10">
              <span className="text-xs font-bold text-netzach-gold uppercase tracking-widest block mb-3">
                Arcano Pessoal Nº {arcana}
              </span>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-netzach-gold/20 border-3 border-netzach-gold flex items-center justify-center shrink-0">
                  <span className="text-3xl font-mystic font-bold text-netzach-gold">{arcana}</span>
                </div>
                <h2 className="text-3xl font-mystic text-white leading-tight">{getArcanaName(arcana)}</h2>
              </div>
            </div>

            <div className="prose prose-invert prose-p:text-netzach-text/90 prose-p:font-light prose-p:leading-loose relative z-10 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-base leading-relaxed whitespace-pre-wrap">{getArcanaMeaning()}</p>
            </div>

            <button 
              onClick={() => setArcanaModalOpen(false)}
              className="w-full mt-8 border border-netzach-gold/30 text-netzach-gold py-3 rounded-lg hover:bg-netzach-gold hover:text-netzach-bg transition-colors uppercase text-xs tracking-widest font-bold relative z-10"
            >
              Fechar Oráculo
            </button>
          </div>
        </div>
      )}
    </>
  );
}