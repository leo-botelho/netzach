import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, BookOpen, UserCircle, Sparkles } from 'lucide-react';
import { usePlan } from '../hooks/usePlan';
import UpgradeModal from '../components/UpgradeModal';

interface Module {
  emoji: string;
  title: string;
  description: string;
  path: string;
  badge?: string;
  moduleKey: string;
}

const CATEGORIES: { title: string; modules: Module[] }[] = [
  {
    title: 'Sacerdotisa',
    modules: [
      { emoji: '🌟', title: 'Sacerdotisa Netzach', description: 'Sua guia espiritual sagrada. Banhos, cristais, rituais e orientações personalizadas para seu momento.', path: '/sacerdotisa', moduleKey: 'sacerdotisa' },
    ],
  },
  {
    title: 'Rituais & Magia',
    modules: [
      { emoji: '🛁', title: 'Banho Personalizado', description: 'Receba a receita de um banho criado especialmente para sua intenção do momento.', path: '/banho', moduleKey: 'banho' },
      { emoji: '🌕', title: 'Magia Lunar', description: 'Rituais, ervas, cristais e afirmações alinhados à fase atual da lua.', path: '/lua', moduleKey: 'lua' },
      { emoji: '🌀', title: 'Diagnóstico de Chakras', description: 'Veja qual centro energético precisa de equilíbrio agora.', path: '/chakras', moduleKey: 'chakras' },
      { emoji: '🌸', title: 'Florais & Óleos', description: 'Florais de Bach e óleos essenciais indicados para o seu estado emocional atual.', path: '/florais', moduleKey: 'florais' },
    ],
  },
  {
    title: 'Autoconhecimento',
    modules: [
      { emoji: '🔮', title: 'Matriz da Alma', description: 'Sua mandala de propósito, karma e talentos baseada na numerologia cabalística.', path: '/matriz', moduleKey: 'matriz' },
      { emoji: '🔢', title: 'Numerologia Pessoal', description: 'Destino, Alma, Expressão, Personalidade e Ano Pessoal calculados pelo seu nome e data.', path: '/numerologia', moduleKey: 'numerologia' },
      { emoji: '⭕', title: 'Roda da Vida', description: 'Avalie 10 áreas da sua vida em um gráfico radar. Identifique onde focar sua energia.', path: '/roda-da-vida', moduleKey: 'roda_vida' },
      { emoji: '🌿', title: 'Grimório Sagrado', description: 'Rituais, simpatias e receitas ancestrais para todas as intenções.', path: '/rituais', moduleKey: 'grimorio' },
    ],
  },
  {
    title: 'Cura Interior',
    modules: [
      { emoji: '✨', title: 'Lei da Atração', description: 'Afirmação, visualização guiada e ação de ancoragem para manifestar o que deseja.', path: '/lei-atracao', moduleKey: 'lei_atracao' },
      { emoji: '💗', title: 'Relacionamento Amoroso', description: 'Carta do amor e orientação sagrada para o que vive no campo amoroso agora.', path: '/relacionamento', moduleKey: 'relacionamento' },
      { emoji: '🤍', title: "Ho'oponopono", description: 'Ritual havaiano de perdão e liberação. As 4 frases adaptadas ao seu contexto.', path: '/hooponopono', moduleKey: 'hooponopono' },
      { emoji: '🌱', title: 'Criança Interior', description: 'Cura e acolhimento das feridas primárias com carta personalizada da sacerdotisa.', path: '/crianca-interior', moduleKey: 'crianca_interior' },
    ],
  },
  {
    title: 'Sagrado Feminino',
    modules: [
      { emoji: '🌸', title: 'Sagrado Feminino', description: 'Arquétipo do seu momento: integração de fase do ciclo + fase lunar + deusa regente.', path: '/sagrado-feminino', moduleKey: 'sagrado_feminino' },
      { emoji: '📊', title: 'Retrospectiva', description: 'Calendário de humor, gratidões e hábitos do mês. Sua jornada em visualização.', path: '/retrospectiva', moduleKey: 'retrospectiva' },
      { emoji: '🌀', title: 'Mandala do Mês', description: 'Panorama energético do mês: arcano, fases lunares, número pessoal e sua intenção.', path: '/mandala-mes', moduleKey: 'mandala_mes' },
      { emoji: '🌙', title: 'Mandala Lunar', description: 'Visualização circular do seu ciclo lunar: sono, humor, energia e hábitos dia a dia.', path: '/mandala-lunar', moduleKey: 'mandala_lunar' },
    ],
  },
  {
    title: 'Astrologia',
    modules: [
      { emoji: '☀️', title: 'Mapa Astral', description: 'Descubra seu signo solar, lunar e ascendente. Calcule via data de nascimento.', path: '/perfil', moduleKey: 'mapa_astral' },
    ],
  },
  {
    title: 'Corpo & Ciclo',
    modules: [
      { emoji: '📅', title: 'Check-in Diário', description: 'Registre sua energia, humor, sono e intenções. Manhã e noite.', path: '/checkin', moduleKey: 'checkin_basico' },
    ],
  },
];

export default function Services() {
  const navigate = useNavigate();
  const { canAccess, isFree, planType } = usePlan();

  const PERSONA_NAMES: Record<string, string> = {
    hecate: 'Hécate',
    isis: 'Ísis',
    lilith: 'Lilith',
  };
  const personaName = PERSONA_NAMES[planType] ?? 'Sacerdotisa';
  const [upgradeModule, setUpgradeModule] = useState<string | null>(null);

  const handleModuleClick = (mod: Module) => {
    if (!canAccess(mod.moduleKey)) {
      setUpgradeModule(mod.title);
    } else {
      navigate(mod.path);
    }
  };

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-28">

      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4">
        <h1 className="font-mystic text-xl text-netzach-gold">Práticas ✦</h1>
        <p className="text-[11px] text-netzach-muted mt-0.5">
          {isFree ? 'Plano Gratuito. Faça upgrade para acessar todos os módulos.' : 'Ferramentas para sua jornada espiritual'}
        </p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-7">
        {CATEGORIES.map(cat => (
          <section key={cat.title}>
            <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold mb-3 pl-1">{cat.title}</p>
            <div className="space-y-3">
              {cat.modules.map(mod => {
                const blocked = !canAccess(mod.moduleKey);
                return (
                  <button
                    key={mod.path}
                    onClick={() => handleModuleClick(mod)}
                    className="w-full bg-netzach-card border border-netzach-border rounded-2xl p-4 flex items-center gap-4 text-left hover:border-netzach-gold/50 transition-all group active:scale-[0.99] relative overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-xl bg-netzach-bg border border-netzach-border flex items-center justify-center text-2xl shrink-0 group-hover:border-netzach-gold/40 transition-colors">
                      {mod.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-mystic text-base transition-colors ${blocked ? 'text-netzach-muted' : 'text-white group-hover:text-netzach-gold'}`}>
                        {mod.moduleKey === 'sacerdotisa' ? `Sacerdotisa ${personaName}` : mod.title}
                      </p>
                        {mod.badge && (
                          <span className="text-[9px] bg-netzach-gold/20 border border-netzach-gold/40 text-netzach-gold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">{mod.badge}</span>
                        )}
                        {blocked && (
                          <span className="text-[9px] bg-netzach-border/60 text-netzach-muted px-1.5 py-0.5 rounded-full">Premium</span>
                        )}
                      </div>
                      <p className="text-xs text-netzach-muted mt-0.5 leading-relaxed line-clamp-2">{mod.description}</p>
                    </div>
                    <span className={`transition-colors text-lg shrink-0 ${blocked ? 'text-netzach-muted' : 'text-netzach-muted group-hover:text-netzach-gold'}`}>
                      {blocked ? '🔒' : '›'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {isFree && (
          <div className="bg-gradient-to-br from-netzach-card to-[#2a1245] border border-netzach-gold/30 rounded-2xl p-5 text-center space-y-3">
            <p className="text-2xl">✦</p>
            <p className="font-mystic text-lg text-white">Desbloqueie sua jornada completa</p>
            <p className="text-sm text-netzach-muted">A partir de R$29,90/mês. Acesse todos os módulos, Sacerdotisa e rituais personalizados.</p>
            <button onClick={() => navigate('/assinar')} className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-3 rounded-xl hover:bg-white transition-colors">
              Ver planos
            </button>
          </div>
        )}
      </main>

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

      {upgradeModule && <UpgradeModal moduleName={upgradeModule} onClose={() => setUpgradeModule(null)} />}
    </div>
  );
}
