import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Trash2, EyeOff, Eye, CornerDownRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Conversa de uma aula.
 *
 * As outras alunas aparecem só pelo primeiro nome: é o que a função
 * `comentarios_da_aula` devolve, e o perfil completo segue trancado.
 * Resposta tem um nível só, para ser conversa e não fórum.
 *
 * Comentário publica na hora. A Raquel pode ocultar depois; oculto some
 * para as alunas mas continua visível para ela, que pode voltar atrás.
 */

export interface Comentario {
  id: string;
  resposta_a: string | null;
  texto: string;
  created_at: string;
  autora: string;
  da_raquel: boolean;
  meu: boolean;
  oculto: boolean;
}

const LIMITE = 2000;

function quando(iso: string): string {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias < 1) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Comentarios({ aulaId }: { aulaId: string }) {
  const [lista, setLista] = useState<Comentario[]>([]);
  const [souAdmin, setSouAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [respondendo, setRespondendo] = useState<Comentario | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('comentarios_da_aula', { p_aula_id: aulaId });
    if (error) {
      console.error('Falha ao ler os comentários:', error.message);
      setErro('Não consegui abrir os comentários agora.');
    } else {
      setLista((data ?? []) as Comentario[]);
      setErro(null);
    }
    setCarregando(false);
  }, [aulaId]);

  useEffect(() => {
    setCarregando(true);
    carregar();
    supabase.rpc('is_admin').then(({ data }) => setSouAdmin(data === true));
  }, [carregar]);

  // O aviso de resposta abre a aula com #comentario-<id>: depois que a
  // lista chega, leva a aluna direto para a conversa.
  useEffect(() => {
    if (carregando || !window.location.hash.startsWith('#comentario-')) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [carregando]);

  const enviar = async () => {
    const limpo = texto.trim();
    if (!limpo || enviando) return;

    setEnviando(true);
    setErro(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setEnviando(false); return; }

    // Resposta da Raquel passa pelo servidor, que grava e avisa quem
    // estava na conversa. O resto grava direto, como sempre.
    const { error } = souAdmin && respondendo
      ? await supabase.functions.invoke('responder-duvida', {
          body: { comentario_id: respondendo.id, texto: limpo },
        })
      : await supabase.from('curso_comentarios').insert({
          aula_id: aulaId,
          user_id: session.user.id,
          texto: limpo,
          resposta_a: respondendo?.resposta_a ?? respondendo?.id ?? null,
        });
    setEnviando(false);

    if (error) {
      console.error('Falha ao comentar:', error.message);
      setErro('Seu comentário não foi enviado. Tente de novo em instantes.');
      return;
    }

    setTexto('');
    setRespondendo(null);
    carregar();
  };

  const apagar = async (c: Comentario) => {
    if (!confirm(c.meu ? 'Apagar seu comentário?' : `Apagar o comentário de ${c.autora}?`)) return;
    const { error } = await supabase.from('curso_comentarios').delete().eq('id', c.id);
    if (error) console.error('Falha ao apagar:', error.message);
    carregar();
  };

  const alternarVisibilidade = async (c: Comentario) => {
    const { error } = await supabase.from('curso_comentarios')
      .update({ status: c.oculto ? 'publicado' : 'oculto' })
      .eq('id', c.id);
    if (error) console.error('Falha ao moderar:', error.message);
    carregar();
  };

  const raizes = lista.filter(c => !c.resposta_a);
  const respostasDe = (id: string) => lista.filter(c => c.resposta_a === id);

  // Função, não componente: um componente declarado aqui dentro seria
  // outro a cada render, e o React remontaria a lista inteira.
  const item = (c: Comentario, resposta = false) => (
    <article key={c.id} id={`comentario-${c.id}`} className={`scroll-mt-20 rounded-2xl p-4 border ${
      c.da_raquel
        ? 'bg-netzach-gold/[0.07] border-netzach-gold/40'
        : 'bg-netzach-card border-netzach-border'
    } ${c.oculto ? 'opacity-50' : ''}`}>
      <header className="flex items-center gap-2 mb-1.5">
        {resposta && <CornerDownRight size={13} className="text-netzach-muted shrink-0" aria-hidden="true" />}
        <span className={`text-sm font-bold ${c.da_raquel ? 'text-netzach-gold' : 'text-white'}`}>
          {c.da_raquel ? 'Raquel ✦' : c.autora}
        </span>
        <span className="text-[11px] text-netzach-muted">{quando(c.created_at)}</span>
        {c.oculto && <span className="text-[10px] uppercase tracking-wider text-netzach-rose">oculto</span>}
      </header>
      <p className="text-sm text-netzach-text leading-relaxed whitespace-pre-wrap break-words">{c.texto}</p>
      <div className="flex gap-4 mt-2.5">
        {!resposta && (
          <button onClick={() => { setRespondendo(c); document.getElementById('novo-comentario')?.focus(); }}
            className="text-xs text-netzach-muted hover:text-netzach-gold transition-colors">
            Responder
          </button>
        )}
        {(c.meu || souAdmin) && (
          <button onClick={() => apagar(c)} aria-label="Apagar comentário"
            className="text-xs text-netzach-muted hover:text-netzach-rose transition-colors flex items-center gap-1">
            <Trash2 size={12} aria-hidden="true" /> Apagar
          </button>
        )}
        {souAdmin && !c.meu && (
          <button onClick={() => alternarVisibilidade(c)}
            className="text-xs text-netzach-muted hover:text-white transition-colors flex items-center gap-1">
            {c.oculto
              ? <><Eye size={12} aria-hidden="true" /> Mostrar</>
              : <><EyeOff size={12} aria-hidden="true" /> Ocultar</>}
          </button>
        )}
      </div>
    </article>
  );

  return (
    <section aria-labelledby="titulo-comentarios" className="space-y-4">
      <h2 id="titulo-comentarios" className="font-mystic text-lg text-netzach-gold flex items-center gap-2">
        <MessageCircle size={18} aria-hidden="true" />
        Conversa da aula
        {lista.length > 0 && <span className="text-xs text-netzach-muted font-sans">({lista.length})</span>}
      </h2>

      <div className="bg-netzach-card border border-netzach-border rounded-2xl p-4 space-y-3">
        {respondendo && (
          <div className="flex items-center justify-between text-xs text-netzach-muted">
            <span>Respondendo a <strong className="text-white">{respondendo.da_raquel ? 'Raquel' : respondendo.autora}</strong></span>
            <button onClick={() => setRespondendo(null)} className="hover:text-white">cancelar</button>
          </div>
        )}
        <label htmlFor="novo-comentario" className="sr-only">Seu comentário</label>
        <textarea
          id="novo-comentario"
          rows={3}
          maxLength={LIMITE}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="O que essa aula despertou em você?"
          className="input-mystic resize-none"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-netzach-muted leading-snug">
            Seu primeiro nome aparece para as outras alunas do curso.
          </p>
          <button onClick={enviar} disabled={!texto.trim() || enviando}
            className="shrink-0 bg-netzach-gold text-netzach-bg font-bold text-sm px-5 py-2 rounded-xl hover:bg-white transition-colors disabled:opacity-40">
            {enviando ? 'Enviando...' : 'Comentar'}
          </button>
        </div>
        {erro && <p role="alert" className="text-sm text-netzach-rose">{erro}</p>}
      </div>

      {carregando && <p className="text-center text-netzach-muted animate-pulse text-sm py-4">Sintonizando...</p>}

      {!carregando && raizes.length === 0 && !erro && (
        <p className="text-center text-sm text-netzach-muted py-4">
          Ninguém comentou ainda. Que tal abrir a conversa?
        </p>
      )}

      <div className="space-y-3">
        {raizes.map(c => (
          <div key={c.id} className="space-y-2">
            {item(c)}
            {respostasDe(c.id).map(r => (
              <div key={r.id} className="pl-5">{item(r, true)}</div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
