import { useCallback, useEffect, useState } from 'react';
import { MessageCircleQuestion, ExternalLink, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Caixa de dúvidas: as conversas dos cursos que esperam a Raquel, de
 * todos os cursos, numa lista só.
 *
 * Uma conversa sai daqui quando ela responde, ou quando ela marca que
 * não precisa de resposta. Se a aluna escrever de novo, volta.
 */

export interface Duvida {
  conversa_id: string;
  aula_id: string;
  aula_titulo: string;
  curso_titulo: string;
  curso_slug: string;
  pergunta: string;
  perguntou: string;
  perguntou_em: string;
  ultima_mensagem: string;
  ultima_autora: string;
  ultima_em: string;
  mensagens: number;
}

function haQuanto(iso: string): string {
  const horas = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (horas < 1) return 'agora há pouco';
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

export default function AdminDuvidas({ aoMudar }: { aoMudar?: (pendentes: number) => void }) {
  const [duvidas, setDuvidas] = useState<Duvida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('duvidas_pendentes');
    if (error) {
      console.error('Falha ao ler as dúvidas:', error.message);
      setAviso({ tipo: 'erro', texto: `Não consegui abrir as dúvidas (${error.message}).` });
    } else {
      const lista = (data ?? []) as Duvida[];
      setDuvidas(lista);
      aoMudar?.(lista.length);
    }
    setCarregando(false);
  }, [aoMudar]);

  useEffect(() => { carregar(); }, [carregar]);

  const responder = async (d: Duvida) => {
    const texto = (rascunho[d.conversa_id] ?? '').trim();
    if (!texto) return;

    setEnviando(d.conversa_id);
    setAviso(null);
    const { data, error } = await supabase.functions.invoke('responder-duvida', {
      body: { comentario_id: d.conversa_id, texto },
    });
    setEnviando(null);

    if (error) {
      console.error('Falha ao responder:', error.message);
      setAviso({ tipo: 'erro', texto: 'A resposta não foi enviada. Tente de novo.' });
      return;
    }

    const avisadas = (data as { avisadas?: number } | null)?.avisadas ?? 0;
    setAviso({
      tipo: 'ok',
      texto: avisadas > 0
        ? `Respondido. ${d.perguntou} foi avisada no celular.`
        : `Respondido. O aviso não chegou ao celular de ${d.perguntou} (notificações desligadas ou nunca ativadas); ela vê quando abrir a aula.`,
    });
    setRascunho(r => ({ ...r, [d.conversa_id]: '' }));
    carregar();
  };

  const dispensar = async (d: Duvida) => {
    const { error } = await supabase.from('curso_comentarios')
      .update({ dispensada_em: new Date().toISOString() })
      .eq('id', d.conversa_id);
    if (error) {
      console.error('Falha ao dispensar:', error.message);
      setAviso({ tipo: 'erro', texto: 'Não consegui tirar da lista.' });
      return;
    }
    carregar();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-mystic text-white flex items-center gap-2">
          <MessageCircleQuestion size={20} className="text-netzach-gold" /> Dúvidas esperando você
        </h2>
        <p className="text-xs text-netzach-muted mt-1">
          Conversas dos cursos em que a última palavra é de uma aluna. A que esperou mais aparece primeiro.
        </p>
      </div>

      {aviso && (
        <p role={aviso.tipo === 'erro' ? 'alert' : 'status'}
          className={`text-sm rounded-lg px-4 py-3 border ${aviso.tipo === 'erro' ? 'border-netzach-rose/40 text-netzach-rose' : 'border-netzach-gold/40 text-netzach-gold'}`}>
          {aviso.texto}
        </p>
      )}

      {carregando && <p className="text-netzach-muted animate-pulse text-sm">Sintonizando...</p>}

      {!carregando && duvidas.length === 0 && aviso?.tipo !== 'erro' && (
        <div className="bg-netzach-card border border-netzach-border rounded-xl p-8 text-center">
          <p className="font-mystic text-lg text-netzach-gold">Nenhuma dúvida esperando ✦</p>
          <p className="text-sm text-netzach-muted mt-1">Todas as alunas foram respondidas.</p>
        </div>
      )}

      {duvidas.map(d => {
        const eRetorno = d.mensagens > 1;
        return (
          <article key={d.conversa_id} className="bg-netzach-card border border-netzach-border rounded-xl p-5 space-y-3">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-netzach-muted truncate">{d.curso_titulo}</p>
                <p className="text-sm text-white truncate">{d.aula_titulo}</p>
              </div>
              <a href={`/cursos/${d.curso_slug}/aula/${d.aula_id}#comentario-${d.conversa_id}`} target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-xs text-netzach-muted hover:text-netzach-gold flex items-center gap-1">
                Ver na aula <ExternalLink size={12} />
              </a>
            </header>

            <div className="border-l-2 border-netzach-gold/50 pl-3 space-y-1">
              <p className="text-xs text-netzach-muted"><strong className="text-white">{d.perguntou}</strong> · {haQuanto(d.perguntou_em)}</p>
              <p className="text-sm text-netzach-text whitespace-pre-wrap">{d.pergunta}</p>
            </div>

            {eRetorno && (
              <div className="border-l-2 border-netzach-border pl-3 space-y-1">
                <p className="text-xs text-netzach-muted">
                  Última mensagem, de <strong className="text-white">{d.ultima_autora}</strong> · {haQuanto(d.ultima_em)}
                  {' '}({d.mensagens} na conversa)
                </p>
                <p className="text-sm text-netzach-text whitespace-pre-wrap">{d.ultima_mensagem}</p>
              </div>
            )}

            <textarea rows={3} maxLength={2000}
              aria-label={`Resposta para ${d.perguntou}`}
              value={rascunho[d.conversa_id] ?? ''}
              onChange={e => setRascunho(r => ({ ...r, [d.conversa_id]: e.target.value }))}
              placeholder="Sua resposta aparece em dourado, embaixo da pergunta"
              className="w-full bg-netzach-bg border border-netzach-border-field rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-netzach-gold resize-y" />

            <div className="flex items-center gap-3">
              <button onClick={() => dispensar(d)}
                className="text-xs text-netzach-muted hover:text-white flex items-center gap-1" title="Tira da lista sem responder. Volta se a aluna escrever de novo.">
                <Check size={13} /> Não precisa de resposta
              </button>
              <div className="flex-1" />
              <button onClick={() => responder(d)} disabled={!rascunho[d.conversa_id]?.trim() || enviando === d.conversa_id}
                className="bg-netzach-gold text-netzach-bg font-bold text-sm px-5 py-2 rounded-lg disabled:opacity-40">
                {enviando === d.conversa_id ? 'Enviando...' : 'Responder'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
