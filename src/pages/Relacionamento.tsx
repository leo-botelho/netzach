import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlanCredit } from '../hooks/usePlanCredit';

const TEMAS = [
  'Atrair um novo amor',
  'Melhorar o relacionamento atual',
  'Superar um término',
  'Perdoar e liberar',
  'Amor próprio primeiro',
  'Comunicação no casal',
  'Padrões a transformar',
  'Abrir o coração',
];

export default function Relacionamento() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [tema, setTema] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const credit = usePlanCredit('relacionamento');
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      supabase.from('profiles').select('full_name, sign_sun').eq('user_id', session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    });
  }, []);

  const handleGenerate = async () => {
    if (!tema.trim() || loading) return;
    setLoading(true);
    setResponse('');

    const prompt = `A usuária ${profile?.full_name || ''} traz este tema amoroso: "${tema}".

Escreva uma orientação sagrada de relacionamento com:

1. **Carta do amor**, uma mensagem direta ao coração dela sobre este tema (1-2 parágrafos, voz amorosa)
2. **Padrão a reconhecer**, um padrão sutil que pode estar presente (sem julgamento)
3. **Afirmação de amor próprio**, para repetir diariamente
4. **Ritual simbólico**, uma prática simples para esta semana (algo concreto e poético)
5. **Orientação desta fase**, baseada no signo solar ${profile?.sign_sun || 'não informado'}

Use linguagem profunda, acolhedora e empoderada. Honre a soberania dela.`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sacerdotisa`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ message: prompt, module: 'relacionamento' }),
        }
      );

      if (res.status === 429) { setLocked(true); setLoading(false); return; }
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.text) { full += json.text; setResponse(full); responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }
            } catch { /* partial */ }
          }
        }
      }
      if (full) await credit.increment();
    } catch { setResponse('Algo inesperado aconteceu. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Relacionamento Amoroso</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Carta do amor e orientação sagrada</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">
        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-3">Qual tema do amor chama você agora?</p>
          <div className="flex flex-wrap gap-2">
            {TEMAS.map(t => (
              <button key={t} onClick={() => setTema(t)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${tema === t ? 'border-netzach-gold bg-netzach-gold/10 text-white' : 'border-netzach-border text-netzach-muted hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-2">Ou conte com suas palavras</p>
          <textarea value={tema} onChange={e => setTema(e.target.value)}
            placeholder="Ex: Tenho dificuldade de confiar nas pessoas e isso afasta quem eu amo..."
            rows={3} className="input-mystic resize-none" />
        </div>

        {locked || !credit.canUse ? (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 text-center space-y-3">
            <div className="text-3xl">🔒</div>
            <p className="font-mystic text-netzach-gold">Limite semanal atingido</p>
            <p className="text-sm text-netzach-muted">Faça upgrade para continuar com orientações de relacionamento.</p>
            <button onClick={() => navigate('/assinar')} className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl">Ver planos</button>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={!tema.trim() || loading}
            className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-2xl hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Receber carta do amor</>}
          </button>
        )}

        {response && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-netzach-gold uppercase tracking-wider font-bold">✦ Sua carta do amor</span>
              <button onClick={() => { setResponse(''); setTema(''); }} className="text-netzach-muted hover:text-white"><RefreshCw size={14} /></button>
            </div>
            <div ref={responseRef} className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: response
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/^(\d+\.\s)/gm, '<br/>$1')
                  .replace(/^#+ (.*)/gm, '<h3 class="font-mystic text-netzach-gold mt-4 mb-1">$1</h3>'),
              }} />
          </div>
        )}
      </main>
    </div>
  );
}
