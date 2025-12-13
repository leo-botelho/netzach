import { useEffect, useState } from 'react';
import { calculateDestinyNumber, calculateNameNumbers } from '../utils/numerology';
import { Sparkles, User, Heart, Eye, Map } from 'lucide-react';

interface NumerologyProps {
  fullName: string;
  birthDate?: string;
}

export default function NumerologySection({ fullName, birthDate }: NumerologyProps) {
  const [numbers, setNumbers] = useState({ destiny: 0, expression: 0, soul: 0, personality: 0 });

  useEffect(() => {
    const destiny = calculateDestinyNumber(birthDate);
    const nameNums = calculateNameNumbers(fullName);
    setNumbers({ destiny, ...nameNums });
  }, [fullName, birthDate]);

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
    <section className="space-y-4">
      <h3 className="font-mystic text-xl text-white flex items-center gap-2">
        <Sparkles size={20} className="text-netzach-gold"/> Mapa Numerológico
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-netzach-card border border-netzach-border p-4 rounded-xl flex flex-col items-center text-center hover:border-netzach-gold/30 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-widest text-netzach-muted">
                <card.icon size={12} className={card.color}/> {card.label}
            </div>
            <span className={`text-3xl font-mystic font-bold ${card.color} drop-shadow-md`}>
                {card.value || '-'}
            </span>
            <p className="text-[10px] text-netzach-text/60 mt-1">{card.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}