import { useEffect, useState } from 'react';
import { calculateDestinyNumber, calculateNameNumbers, calculatePersonalArcana } from '../utils/numerology';
// CORREÇÃO AQUI: Adicionado 'type' antes de NumberMeaning
import { meanings, type NumberMeaning } from '../utils/numerologyMeanings';
import { arcanaMeanings } from '../utils/arcanaMeanings';
import { Sparkles, User, Heart, Eye, Map, X } from 'lucide-react';

interface NumerologyProps {
  fullName: string;
  birthDate?: string;
}

type NumberType = 'destiny' | 'expression' | 'soul' | 'personality';

export default function NumerologySection({ fullName, birthDate }: NumerologyProps) {
  const [numbers, setNumbers] = useState({ destiny: 0, expression: 0, soul: 0, personality: 0 });
  const [arcana, setArcana] = useState(0);
  
  // Estados dos Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [arcanaModalOpen, setArcanaModalOpen] = useState(false);
  
  // Estado do Número Selecionado
  const [selectedNumber, setSelectedNumber] = useState<{ type: NumberType, value: number, label: string } | null>(null);

  useEffect(() => {
    const destiny = calculateDestinyNumber(birthDate);
    const nameNums = calculateNameNumbers(fullName);
    const personalArcana = calculatePersonalArcana(birthDate);
    
    setNumbers({ destiny, ...nameNums });
    setArcana(personalArcana);
  }, [fullName, birthDate]);

  const handleNumberClick = (type: NumberType, value: number, label: string) => {
    if (value === 0) return;
    setSelectedNumber({ type, value, label });
    setModalOpen(true);
  };

  const getMeaning = (): string => {
    if (!selectedNumber) return '';
    const meaning: NumberMeaning | undefined = meanings[selectedNumber.value];
    if (!meaning) return 'Significado ainda não disponível para este número mestre ou cálculo.';
    
    const typeKey = selectedNumber.type as keyof NumberMeaning;
    return meaning[typeKey] || '';
  };

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
      type: 'destiny' as const,
      value: numbers.destiny, 
      icon: Map, 
      desc: 'Sua missão de vida',
      color: 'text-purple-400' 
    },
    { 
      label: 'Expressão', 
      type: 'expression' as const,
      value: numbers.expression, 
      icon: User, 
      desc: 'Seus talentos',
      color: 'text-netzach-gold'
    },
    { 
      label: 'Alma', 
      type: 'soul' as const,
      value: numbers.soul, 
      icon: Heart, 
      desc: 'Seus desejos íntimos',
      color: 'text-pink-400' 
    },
    { 
      label: 'Impressão', 
      type: 'personality' as const,
      value: numbers.personality, 
      icon: Eye, 
      desc: 'Como te veem',
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
              <button
                key={card.label}
                onClick={() => handleNumberClick(card.type, card.value, card.label)}
                disabled={card.value === 0}
                className="bg-netzach-card border border-netzach-border p-4 rounded-xl flex flex-col items-center text-center hover:border-netzach-gold/50 hover:scale-105 transition-all cursor-pointer disabled:cursor-default disabled:hover:scale-100 w-full"
              >
                <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-widest text-netzach-muted">
                    <IconComponent size={12} className={card.color}/> {card.label}
                </div>
                <span className={`text-3xl font-mystic font-bold ${card.color} drop-shadow-md`}>
                    {card.value || '-'}
                </span>
                <p className="text-[10px] text-netzach-text/60 mt-1">{card.desc}</p>
              </button>
            );
          })}
        </div>

        {arcana > 0 && (
          <button 
            onClick={() => setArcanaModalOpen(true)}
            className="w-full bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-gold/30 rounded-xl p-6 relative overflow-hidden shadow-lg mt-4 hover:border-netzach-gold hover:scale-[1.02] transition-all cursor-pointer text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={64}/>
            </div>
            
            <div className="relative z-10">
              <span className="text-[10px] uppercase tracking-[0.2em] text-netzach-gold font-bold block mb-2">
                Seu Arcano Pessoal
              </span>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-netzach-gold/20 border-2 border-netzach-gold flex items-center justify-center shrink-0">
                  <span className="text-2xl font-mystic font-bold text-netzach-gold">{arcana}</span>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-mystic text-xl text-white mb-1">{getArcanaName(arcana)}</h4>
                  <p className="text-xs text-netzach-gold hover:underline">Sua missão de vida segundo o Tarô →</p>
                </div>
              </div>
            </div>
          </button>
        )}
      </section>

      {/* Modal dos Números */}
      {modalOpen && selectedNumber && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-gold/50 p-8 rounded-2xl w-full max-w-lg relative overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles size={120}/>
            </div>

            <div className="flex justify-end relative z-10">
                <button 
                onClick={() => setModalOpen(false)} 
                className="bg-black/50 p-2 rounded-full text-white hover:bg-black transition-colors"
                >
                <X size={20}/>
                </button>
            </div>

            <div className="mb-6 relative z-10 shrink-0">
              <span className="text-xs font-bold text-netzach-gold uppercase tracking-widest block mb-3">
                Número {selectedNumber.value === 11 || selectedNumber.value === 22 || selectedNumber.value === 33 ? 'Mestre' : ''} {selectedNumber.value}
              </span>
              
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full bg-netzach-gold/20 border-2 border-netzach-gold flex items-center justify-center shrink-0">
                  <span className="text-3xl font-mystic font-bold text-netzach-gold">{selectedNumber.value}</span>
                </div>
                <h2 className="text-2xl font-mystic text-white leading-tight">{selectedNumber.label}</h2>
              </div>
            </div>

            <div className="relative z-10 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-base leading-relaxed text-netzach-text/90 font-light">{getMeaning()}</p>
            </div>

            <div className="mt-6 shrink-0 relative z-10">
                <button 
                onClick={() => setModalOpen(false)}
                className="w-full border border-netzach-gold/30 text-netzach-gold py-3 rounded-lg hover:bg-netzach-gold hover:text-netzach-bg transition-colors uppercase text-xs tracking-widest font-bold"
                >
                Fechar
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Arcano Pessoal */}
      {arcanaModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-gold/50 p-8 rounded-2xl w-full max-w-lg relative overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles size={120}/>
            </div>

            <div className="flex justify-end relative z-10">
                <button 
                onClick={() => setArcanaModalOpen(false)} 
                className="bg-black/50 p-2 rounded-full text-white hover:bg-black transition-colors"
                >
                <X size={20}/>
                </button>
            </div>

            <div className="mb-6 relative z-10 shrink-0">
              <span className="text-xs font-bold text-netzach-gold uppercase tracking-widest block mb-3">
                Arcano Pessoal Nº {arcana}
              </span>
              
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full bg-netzach-gold/20 border-2 border-netzach-gold flex items-center justify-center shrink-0">
                  <span className="text-3xl font-mystic font-bold text-netzach-gold">{arcana}</span>
                </div>
                <h2 className="text-2xl font-mystic text-white leading-tight">{getArcanaName(arcana)}</h2>
              </div>
            </div>

            <div className="relative z-10 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-base leading-relaxed text-netzach-text/90 font-light">{getArcanaMeaning()}</p>
            </div>

            <div className="mt-6 shrink-0 relative z-10">
                <button 
                onClick={() => setArcanaModalOpen(false)}
                className="w-full border border-netzach-gold/30 text-netzach-gold py-3 rounded-lg hover:bg-netzach-gold hover:text-netzach-bg transition-colors uppercase text-xs tracking-widest font-bold"
                >
                Fechar Oráculo
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}