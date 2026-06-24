import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlanCredit } from '../hooks/usePlanCredit';

const ALVOS = [
  'Uma pessoa específica',
  'Uma situação difícil',
  'Mágoa do passado',
  'Culpa ou arrependimento',
  'Relacionamento familiar',
  'Trabalho e dinheiro',
  'Meu corpo e saúde',
  'Eu mesma',
];

const FRASES = ['Sinto muito', 'Me perdoa', 'Eu te amo', 'Sou grata'];

export default function Hooponopono() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [alvo, setAlvo] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const credit = usePlanCredit('hooponopono');
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      supabase.from('profiles').select('full_name').eq('user_id', session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    });
  }, []);

  const handleGenerate = async () => {
    if (!alvo.trim() || loading) return;
    setLoading(true);
    setResponse('');

    const prompt = `A usuária ${profile?.full_name || 'minha querida'} quer praticar Ho'oponopono com: "${alvo}".

Guie-a com:

1. **Acolhimento compassivo**, valide o que ela sente sem minimizar (2-3 frases)
2. **As 4 frases adaptadas**, reescreva cada uma aplicada especificamente ao contexto dela:
   - "Sinto muito" (reconhecimento)
   - "Me perdoa" (libertação)
   - "Eu te amo" (amor incondicional)
   - "Sou grata" (gratidão)
3. **Como praticar**, instruções de recitação (postura, respiração, repetições)
4. **Duração recomendada**, por quantos dias e quando do dia
5. **Sinal de liberação**, como ela vai perceber que o processo está acontecendo

Use linguagem sagrada, profunda e gentil. Honre a coragem dela de abrir este processo.`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sacerdotisa`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ message: prompt, module: 'hooponopono' }),
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
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Ho'oponopono</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Ritual havaiano de perdão e liberação</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">

        {/* As 4 frases */}
        <div className="grid grid-cols-2 gap-2">
          {FRASES.map(f => (
            <div key={f} className="bg-netzach-card border border-netzach-border rounded-xl p-3 text-center">
              <p className="font-mystic text-netzach-gold text-sm">"{f}"</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-3">O que ou quem você quer liberar?</p>
          <div className="flex flex-wrap gap-2">
            {ALVOS.map(a => (
              <button key={a} onClick={() => setAlvo(a)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${alvo === a ? 'border-netzach-gold bg-netzach-gold/10 text-white' : 'border-netzach-border text-netzach-muted hover:text-white'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-2">Descreva com mais detalhes (opcional)</p>
          <textarea value={alvo} onChange={e => setAlvo(e.target.value)}
            placeholder="Ex: Uma briga antiga com minha mãe que ainda carrego no coração..."
            rows={3} className="input-mystic resize-none" />
        </div>

        {locked || !credit.canUse ? (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 text-center space-y-3">
            <div className="text-3xl">🔒</div>
            <p className="font-mystic text-netzach-gold">Limite semanal atingido</p>
            <p className="text-sm text-netzach-muted">Faça upgrade para continuar praticando Ho'oponopono.</p>
            <button onClick={() => navigate('/assinar')} className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl">Ver planos</button>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={!alvo.trim() || loading}
            className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-2xl hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Iniciar prática</>}
          </button>
        )}

        {response && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-netzach-gold uppercase tracking-wider font-bold">✦ Sua prática sagrada</span>
              <button onClick={() => { setResponse(''); setAlvo(''); }} className="text-netzach-muted hover:text-white"><RefreshCw size={14} /></button>
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
