import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Send, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlanCredit } from '../hooks/usePlanCredit';

const INTENTIONS = [
  'Limpeza energética e proteção',
  'Abertura de caminhos',
  'Amor e atração',
  'Cura emocional',
  'Prosperidade e abundância',
  'Paz e equilíbrio',
  'Força e confiança',
  'Desapego e perdão',
];

export default function BanhoPersonalizado() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [intention, setIntention] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const credit = usePlanCredit('banho_personalizado');
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      supabase.from('profiles').select('*').eq('user_id', session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    });
  }, []);

  const handleGenerate = async () => {
    if (!intention.trim() || loading) return;
    setLoading(true);
    setResponse('');

    const banhoPrompt = `A usuária busca um banho personalizado para: "${intention}".

Crie um banho completo e específico incluindo:
1. **Nome ritualístico do banho**
2. **Ervas e plantas** (3-5 ingredientes com quantidades aproximadas)
3. **Complementos** (sal, flores, óleos, cristais, escolha o que faz sentido para a intenção)
4. **Modo de preparo** (passo a passo)
5. **Como usar** (temperatura, momento do dia, duração)
6. **Intenção a segurar** durante o banho
7. **Afirmação** para recitar

Contexto da usuária:
- Signo solar: ${profile?.sign_sun || 'não informado'}
- Fase do ciclo: ${profile?.last_period_date ? 'informada' : 'não informada'}
- Intenção declarada: ${intention}

Use linguagem amorosa e mística. Seja específica e prática.`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sacerdotisa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            message: banhoPrompt,
            module: 'banho_personalizado',
          }),
        }
      );

      if (res.status === 429) {
        setLocked(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.text) {
                full += json.text;
                setResponse(full);
                responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }
            } catch { /* partial chunk */ }
          }
        }
      }
      if (full) await credit.increment();
    } catch (err) {
      console.error(err);
      setResponse('Algo inesperado aconteceu. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Banho Personalizado</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Ritual criado pela sua sacerdotisa</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">

        {/* Seleção rápida de intenção */}
        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-3">Qual é a sua intenção?</p>
          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map(i => (
              <button
                key={i}
                onClick={() => setIntention(i)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                  intention === i
                    ? 'border-netzach-gold bg-netzach-gold/10 text-white'
                    : 'border-netzach-border text-netzach-muted hover:text-white'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Campo livre */}
        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-2">Ou descreva com suas palavras</p>
          <textarea
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder="Ex: Estou me sentindo pesada e quero limpar o que não é mais meu..."
            rows={3}
            className="input-mystic resize-none"
          />
        </div>

        {locked || !credit.canUse ? (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 text-center space-y-3">
            <div className="text-3xl">🔒</div>
            <p className="font-mystic text-netzach-gold">Limite semanal atingido</p>
            <p className="text-sm text-netzach-muted">Faça um upgrade para continuar recebendo banhos personalizados.</p>
            <button onClick={() => navigate('/assinar')} className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl">
              Ver planos
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!intention.trim() || loading}
            className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-2xl hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Criar meu banho</>}
          </button>
        )}

        {/* Resposta */}
        {response && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-netzach-gold uppercase tracking-wider font-bold">
                ✦ Seu banho personalizado
              </span>
              <button
                onClick={() => { setResponse(''); setIntention(''); }}
                className="text-netzach-muted hover:text-white"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <div
              ref={responseRef}
              className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap prose prose-invert prose-headings:font-mystic prose-headings:text-netzach-gold prose-strong:text-white"
              dangerouslySetInnerHTML={{
                __html: response
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/^(\d+\.\s)/gm, '<br/>$1')
                  .replace(/^#+ (.*)/gm, '<h3 class="font-mystic text-netzach-gold mt-4 mb-1">$1</h3>'),
              }}
            />
          </div>
        )}

      </main>
    </div>
  );
}
