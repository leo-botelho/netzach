import { useNavigate } from 'react-router-dom';
import { Moon, BookOpen, UserCircle, Sparkles } from 'lucide-react';

interface Module {
  emoji: string;
  title: string;
  description: string;
  path: string;
  badge?: string;
}

const CATEGORIES: { title: string; modules: Module[] }[] = [
  {
    title: 'Sacerdotisa IA',
    modules: [
      {
        emoji: '🌟',
        title: 'Sacerdotisa Netzach',
        description: 'Sua guia espiritual com inteligência artificial. Banhos, cristais, rituais e orientações personalizadas.',
        path: '/sacerdotisa',
        badge: 'IA',
      },
    ],
  },
  {
    title: 'Rituais & Magia',
    modules: [
      { emoji: '🛁', title: 'Banho Personalizado', description: 'Receba a receita de um banho criado especialmente para sua intenção do momento.', path: '/banho' },
      { emoji: '🌕', title: 'Magia Lunar', description: 'Rituais, ervas, cristais e afirmações alinhados à fase atual da lua.', path: '/lua' },
      { emoji: '🌀', title: 'Diagnóstico de Chakras', description: '10 perguntas revelam qual centro energético precisa de equilíbrio agora.', path: '/chakras' },
    ],
  },
  {
    title: 'Autoconhecimento',
    modules: [
      { emoji: '🔮', title: 'Matriz da Alma', description: 'Sua mandala de propósito, karma e talentos baseada na numerologia cabalística.', path: '/matriz' },
      { emoji: '🔢', title: 'Numerologia Pessoal', description: 'Destino, Alma, Expressão, Personalidade e Ano Pessoal calculados pelo seu nome e data.', path: '/numerologia' },
      { emoji: '⭕', title: 'Roda da Vida', description: 'Avalie 10 áreas da sua vida em um gráfico radar. Identifique onde focar sua energia.', path: '/roda-da-vida' },
      { emoji: '🌿', title: 'Grimório Sagrado', description: 'Rituais, simpatias e receitas ancestrais para todas as intenções.', path: '/rituais' },
    ],
  },
  {
    title: 'Sagrado Feminino',
    modules: [
      { emoji: '🌸', title: 'Sagrado Feminino', description: 'Arquétipo do seu momento: integração de fase do ciclo + fase lunar + deusa regente.', path: '/sagrado-feminino' },
      { emoji: '📊', title: 'Retrospectiva', description: 'Calendário de humor, gratidões e hábitos do mês. Sua jornada em visualização.', path: '/retrospectiva' },
    ],
  },
  {
    title: 'Astrologia',
    modules: [
      { emoji: '☀️', title: 'Mapa Astral', description: 'Descubra seu signo solar, lunar e ascendente. Calcule via data de nascimento.', path: '/perfil' },
    ],
  },
  {
    title: 'Corpo & Ciclo',
    modules: [
      { emoji: '📅', title: 'Check-in Diário', description: 'Registre sua energia, humor, sono e intenções. Manhã e noite.', path: '/checkin' },
    ],
  },
];

export default function Services() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-28">

      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4">
        <h1 className="font-mystic text-xl text-netzach-gold">Práticas ✦</h1>
        <p className="text-[11px] text-netzach-muted mt-0.5">Ferramentas para sua jornada espiritual</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-7">
        {CATEGORIES.map(cat => (
          <section key={cat.title}>
            <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold mb-3 pl-1">{cat.title}</p>
            <div className="space-y-3">
              {cat.modules.map(mod => (
                <button
                  key={mod.path}
                  onClick={() => navigate(mod.path)}
                  className="w-full bg-netzach-card border border-netzach-border rounded-2xl p-4 flex items-center gap-4 text-left hover:border-netzach-gold/50 transition-all group active:scale-[0.99]"
                >
                  <div className="w-12 h-12 rounded-xl bg-netzach-bg border border-netzach-border flex items-center justify-center text-2xl shrink-0 group-hover:border-netzach-gold/40 transition-colors">
                    {mod.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mystic text-base text-white group-hover:text-netzach-gold transition-colors">{mod.title}</p>
                      {mod.badge && (
                        <span className="text-[9px] bg-netzach-gold/20 border border-netzach-gold/40 text-netzach-gold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">{mod.badge}</span>
                      )}
                    </div>
                    <p className="text-xs text-netzach-muted mt-0.5 leading-relaxed line-clamp-2">{mod.description}</p>
                  </div>
                  <span className="text-netzach-muted group-hover:text-netzach-gold transition-colors text-lg shrink-0">›</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full bg-netzach-bg/95 backdrop-blur-md border-t border-netzach-border flex justify-around items-center z-30 pt-3 pb-6">
        <button onClick={() => navigate('/templo')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors">
          <Moon size={20}/><span className="text-[10px] uppercase tracking-wider">Templo</span>
        </button>
        <button onClick={() => navigate('/servicos')} className="flex flex-col items-center gap-1 text-netzach-gold">
          <Sparkles size={20}/><span className="text-[10px] uppercase tracking-wider font-bold">Práticas</span>
        </button>
        <button onClick={() => navigate('/rituais')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors">
          <BookOpen size={20}/><span className="text-[10px] uppercase tracking-wider">Grimório</span>
        </button>
        <button onClick={() => navigate('/perfil')} className="flex flex-col items-center gap-1 text-netzach-muted hover:text-white transition-colors">
          <UserCircle size={20}/><span className="text-[10px] uppercase tracking-wider">Perfil</span>
        </button>
      </nav>
    </div>
  );
}
