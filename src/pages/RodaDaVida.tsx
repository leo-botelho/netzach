import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AREAS = [
  { key: 'saude',        label: 'Saúde & Corpo',       emoji: '💚' },
  { key: 'financas',     label: 'Finanças',             emoji: '💛' },
  { key: 'carreira',     label: 'Carreira & Propósito', emoji: '🔥' },
  { key: 'amor',         label: 'Amor & Relacionamento',emoji: '🌹' },
  { key: 'familia',      label: 'Família',              emoji: '🏡' },
  { key: 'amizades',     label: 'Amizades',             emoji: '🤝' },
  { key: 'lazer',        label: 'Lazer & Prazer',       emoji: '✨' },
  { key: 'espiritualidade', label: 'Espiritualidade',   emoji: '🔮' },
  { key: 'desenvolvimento', label: 'Desenvolvimento',   emoji: '📚' },
  { key: 'ambiente',     label: 'Ambiente & Lar',       emoji: '🌿' },
];

type Scores = Record<string, number>;

// SVG radar simples
function RadarChart({ scores }: { scores: Scores }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 110;
  const n = AREAS.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  // Grid rings
  const rings = [2, 4, 6, 8, 10];

  // Data polygon
  const dataPoints = AREAS.map((a, i) => point(i, (scores[a.key] / 10) * maxR));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs mx-auto">
      {/* Rings */}
      {rings.map(r => {
        const pts = AREAS.map((_, i) => point(i, (r / 10) * maxR));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
        return <path key={r} d={path} fill="none" stroke="#362052" strokeWidth="1" />;
      })}

      {/* Axes */}
      {AREAS.map((_, i) => {
        const outer = point(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)} stroke="#4D2B78" strokeWidth="1" />;
      })}

      {/* Data */}
      <path d={dataPath} fill="#C5A059" fillOpacity="0.25" stroke="#C5A059" strokeWidth="2" />

      {/* Labels */}
      {AREAS.map((a, i) => {
        const labelR = maxR + 18;
        const p = point(i, labelR);
        return (
          <text key={a.key} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#9E87BB">
            {a.emoji}
          </text>
        );
      })}
    </svg>
  );
}

export default function RodaDaVida() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>(Object.fromEntries(AREAS.map(a => [a.key, 5])));
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      setUserId(session.user.id);

      const month = new Date().toISOString().slice(0, 7);
      supabase.from('roda_da_vida').select('*').eq('user_id', session.user.id).eq('month', month).single()
        .then(({ data }) => {
          if (data) {
            const s: Scores = {};
            AREAS.forEach(a => { s[a.key] = data[a.key] ?? 5; });
            setScores(s);
          }
          setLoading(false);
        });
    });
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    const month = new Date().toISOString().slice(0, 7);
    await supabase.from('roda_da_vida').upsert({ user_id: userId, month, ...scores }, { onConflict: 'user_id,month' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const avg = (total / AREAS.length).toFixed(1);

  if (loading) return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold font-mystic">Carregando...</div>;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="font-mystic text-netzach-gold text-lg leading-none">Roda da Vida</h1>
            <p className="text-[11px] text-netzach-muted mt-0.5">Como você se sente em cada área?</p>
          </div>
        </div>
        <button onClick={handleSave} className="flex items-center gap-1.5 bg-netzach-gold text-netzach-bg text-xs font-bold px-3 py-2 rounded-xl hover:bg-white transition-colors">
          {saved ? <><RefreshCw size={13}/> Salvo!</> : <><Save size={13}/> Salvar</>}
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Radar */}
        <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 text-center space-y-2">
          <RadarChart scores={scores} />
          <p className="text-xs text-netzach-muted">Média geral: <span className="text-netzach-gold font-bold text-sm">{avg}/10</span></p>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {AREAS.map(area => (
            <div key={area.key} className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{area.emoji}</span>
                  <p className="text-sm font-medium text-white">{area.label}</p>
                </div>
                <span className="text-netzach-gold font-bold text-lg w-6 text-right">{scores[area.key]}</span>
              </div>
              <input
                type="range" min={1} max={10} value={scores[area.key]}
                onChange={e => setScores(prev => ({ ...prev, [area.key]: +e.target.value }))}
                className="w-full accent-netzach-gold h-1.5 rounded-full cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-netzach-muted">
                <span>Negligenciada</span><span>Plena</span>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
