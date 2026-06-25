import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, RefreshCw, BookMarked, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlanCredit } from '../hooks/usePlanCredit';
import { useSaveToGrimorio } from '../hooks/useSaveToGrimorio';

const ESTADOS = [
  'Ansiedade e agitação',
  'Tristeza e melancolia',
  'Medo e insegurança',
  'Raiva e irritação',
  'Esgotamento emocional',
  'Baixa autoestima',
  'Luto e perda',
  'Confusão e indecisão',
];

export default function Florais() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [estado, setEstado] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const credit = usePlanCredit('florais');
  const { saved, saveToGrimorio, reset } = useSaveToGrimorio('florais');
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      supabase.from('profiles').select('full_name, sign_sun').eq('user_id', session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    });
  }, []);

  const handleGenerate = async () => {
    if (!estado.trim() || loading) return;
    reset();
    setLoading(true);
    setResponse('');

    const prompt = `A usuária está se sentindo: "${estado}".

Recomende com sabedoria e amor:

1. **Floral de Bach**, nome do floral, para que serve, como usar (gotas, frequência, duração)
2. **Óleo Essencial**, nome, propriedades emocionais, modo de aplicação (inalação, diffusor, pele)
3. **Como combinar**, floral + óleo juntos em uma rotina simples
4. **Afirmação de suporte**, uma frase para repetir durante o uso

Contexto: signo solar ${profile?.sign_sun || 'não informado'}.

Termine com: "⚠️ Esta orientação é informativa e complementar. Em casos graves, consulte um profissional de saúde."

Use linguagem acolhedora e mística.`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sacerdotisa`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ message: prompt, module: 'florais' }),
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
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Florais & Óleos</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Recomendação personalizada pela sacerdotisa</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">
        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-3">Como você está se sentindo?</p>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map(e => (
              <button key={e} onClick={() => setEstado(e)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${estado === e ? 'border-netzach-gold bg-netzach-gold/10 text-white' : 'border-netzach-border text-netzach-muted hover:text-white'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-2">Ou descreva com suas palavras</p>
          <textarea value={estado} onChange={e => setEstado(e.target.value)}
            placeholder="Ex: Estou me sentindo presa, com medo de tomar decisões importantes..."
            rows={3} className="input-mystic resize-none" />
        </div>

        {locked || !credit.canUse ? (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 text-center space-y-3">
            <div className="text-3xl">🔒</div>
            <p className="font-mystic text-netzach-gold">Limite semanal atingido</p>
            <p className="text-sm text-netzach-muted">Faça upgrade para continuar recebendo orientações de florais e óleos.</p>
            <button onClick={() => navigate('/assinar')} className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl">Ver planos</button>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={!estado.trim() || loading}
            className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-2xl hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Receber orientação</>}
          </button>
        )}

        {response && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-netzach-gold uppercase tracking-wider font-bold">✦ Sua orientação sagrada</span>
              <button onClick={() => { setResponse(''); setEstado(''); }} className="text-netzach-muted hover:text-white"><RefreshCw size={14} /></button>
            </div>
            <div ref={responseRef} className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: response
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/^(\d+\.\s)/gm, '<br/>$1')
                  .replace(/^#+ (.*)/gm, '<h3 class="font-mystic text-netzach-gold mt-4 mb-1">$1</h3>'),
              }} />
            <button
              onClick={() => saveToGrimorio(response, estado)}
              disabled={saved}
              className={`self-start flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                saved
                  ? 'border-netzach-gold/40 text-netzach-gold bg-netzach-gold/10 cursor-default'
                  : 'border-netzach-border text-netzach-muted hover:border-netzach-gold/50 hover:text-netzach-gold'
              }`}
            >
              {saved ? <Check size={11} /> : <BookMarked size={11} />}
              {saved ? 'Salvo no Grimório' : 'Salvar no Grimório'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
