import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PADROES = [
  'Medo de não ser suficiente',
  'Necessidade de aprovação',
  'Dificuldade de receber amor',
  'Hipervigilância e ansiedade',
  'Perfeccionismo paralisante',
  'Abandono e rejeição',
  'Culpa sem motivo',
  'Dificuldade de pedir ajuda',
];

export default function CriancaInterior() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [padrao, setPadrao] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/portal');
      supabase.from('profiles').select('full_name').eq('user_id', session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    });
  }, []);

  const handleGenerate = async () => {
    if (!padrao.trim() || loading) return;
    setLoading(true);
    setResponse('');

    const prompt = `A usuária ${profile?.full_name || 'minha querida'} está trabalhando este padrão da criança interior: "${padrao}".

Escreva uma sessão de cura com:

1. **Acolhimento da criança interior** — fale diretamente com a criança que ela foi, com amor e gentileza (1 parágrafo na 2ª pessoa, como se falasse com uma criança pequena)
2. **Reconhecimento do padrão** — nomeie de onde veio essa ferida sem julgamento (1-2 frases empáticas)
3. **Validação emocional** — o que ela sente faz todo sentido, por quê
4. **Afirmação de cura** — uma frase poderosa para repetir, dirigida à criança interior
5. **Prática simbólica** — um gesto ou ritual gentil para fazer agora (concreto e poético)
6. **Convite suave** — se o padrão envolve outras pessoas, um convite gentil ao Ho'oponopono

Use voz amorosa, segura e profunda. Seja a sacerdotisa que acolhe.`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sacerdotisa`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ message: prompt, module: 'crianca_interior' }),
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
    } catch { setResponse('Algo inesperado aconteceu. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Criança Interior</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Cura e acolhimento das feridas primárias</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">

        <div className="bg-gradient-to-br from-netzach-card to-[#1a0b2e] border border-netzach-border rounded-2xl p-4 text-center space-y-1">
          <p className="text-2xl">🌸</p>
          <p className="text-sm text-netzach-text/80 leading-relaxed italic">"A criança que você foi ainda vive dentro de você — esperando ser vista, ouvida e amada."</p>
        </div>

        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-3">Qual padrão você quer curar?</p>
          <div className="flex flex-wrap gap-2">
            {PADROES.map(p => (
              <button key={p} onClick={() => setPadrao(p)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${padrao === p ? 'border-netzach-gold bg-netzach-gold/10 text-white' : 'border-netzach-border text-netzach-muted hover:text-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-2">Ou descreva o que sente</p>
          <textarea value={padrao} onChange={e => setPadrao(e.target.value)}
            placeholder="Ex: Sempre me sinto invisível e tenho medo de ocupar espaço demais na vida das pessoas..."
            rows={3} className="input-mystic resize-none" />
        </div>

        {locked ? (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 text-center space-y-3">
            <div className="text-3xl">🔒</div>
            <p className="font-mystic text-netzach-gold">Limite semanal atingido</p>
            <p className="text-sm text-netzach-muted">Faça upgrade para continuar a jornada da criança interior.</p>
            <button onClick={() => navigate('/assinar')} className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl">Ver planos</button>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={!padrao.trim() || loading}
            className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-2xl hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Iniciar cura</>}
          </button>
        )}

        {response && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-netzach-gold uppercase tracking-wider font-bold">✦ Carta de acolhimento</span>
              <button onClick={() => { setResponse(''); setPadrao(''); }} className="text-netzach-muted hover:text-white"><RefreshCw size={14} /></button>
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
