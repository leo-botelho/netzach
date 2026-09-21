import { useCallback, useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff, Users, Film, ListPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  extrairIdYoutube, gerarSlug, lerDuracao, lerLinhasDeAulas,
  type Aula, type Curso, type Modulo,
} from '../../lib/cursos';

/**
 * Painel dos cursos: cria o curso, monta módulos e aulas, e libera o
 * acesso das alunas.
 *
 * Foi pensado para a migração da Hotmart, onde são dezenas de aulas e
 * centenas de alunas: por isso as duas listas longas (aulas e emails)
 * aceitam colar tudo de uma vez.
 */

type AulaAdmin = Aula & { video_id: string | null };
type ModuloAdmin = Modulo & { aulas: AulaAdmin[] };

const CURSO_VAZIO = { titulo: '', slug: '', subtitulo: '', descricao: '', capa_url: '', publicado: false };

/** 750 → "12:30", no mesmo formato que o campo aceita de volta. */
const paraMinSeg = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const btn = 'text-netzach-muted hover:text-white disabled:opacity-20 transition-colors p-1';
const campo = 'w-full bg-netzach-bg border border-netzach-border-field rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-netzach-gold';

export default function AdminCursos() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [form, setForm] = useState(CURSO_VAZIO);
  const [modulos, setModulos] = useState<ModuloAdmin[]>([]);
  const [aba, setAba] = useState<'conteudo' | 'alunas'>('conteudo');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const falhou = (error: { message: string } | null, texto: string) => {
    if (!error) return false;
    console.error(texto, error.message);
    setAviso({ tipo: 'erro', texto: `${texto} (${error.message})` });
    return true;
  };

  // ── Cursos ──────────────────────────────────────────────────
  const carregarCursos = useCallback(async () => {
    const { data, error } = await supabase.from('cursos').select('*').order('ordem').order('created_at');
    if (!falhou(error, 'Não consegui listar os cursos.')) setCursos((data ?? []) as Curso[]);
  }, []);

  useEffect(() => { carregarCursos(); }, [carregarCursos]);

  const carregarConteudo = useCallback(async (cursoId: string) => {
    const { data, error } = await supabase.from('curso_modulos')
      .select('*, curso_aulas(*, curso_aula_videos(video_id))')
      .eq('curso_id', cursoId)
      .order('ordem');
    if (falhou(error, 'Não consegui abrir os módulos.')) return;

    type Bruto = Modulo & { curso_aulas: (Aula & { curso_aula_videos: { video_id: string } | null })[] | null };
    setModulos(((data ?? []) as Bruto[]).map(({ curso_aulas, ...m }) => ({
      ...m,
      aulas: (curso_aulas ?? [])
        .map(({ curso_aula_videos, ...a }) => ({ ...a, video_id: curso_aula_videos?.video_id ?? null }))
        .sort((a, b) => a.ordem - b.ordem),
    })));
  }, []);

  const selecionar = (c: Curso | null) => {
    setAviso(null);
    setSelecionado(c?.id ?? null);
    setForm(c ? {
      titulo: c.titulo, slug: c.slug, subtitulo: c.subtitulo ?? '', descricao: c.descricao ?? '',
      capa_url: c.capa_url ?? '', publicado: c.publicado,
    } : CURSO_VAZIO);
    setModulos([]);
    setAba('conteudo');
    if (c) carregarConteudo(c.id);
  };

  const salvarCurso = async () => {
    const slug = form.slug || gerarSlug(form.titulo);
    if (!form.titulo.trim() || !slug) {
      setAviso({ tipo: 'erro', texto: 'O curso precisa de um título.' });
      return;
    }
    const linha = {
      titulo: form.titulo.trim(),
      slug,
      subtitulo: form.subtitulo.trim() || null,
      descricao: form.descricao.trim() || null,
      capa_url: form.capa_url.trim() || null,
      publicado: form.publicado,
    };

    if (selecionado) {
      const { error } = await supabase.from('cursos').update(linha).eq('id', selecionado);
      if (falhou(error, 'Não consegui salvar o curso.')) return;
    } else {
      const { data, error } = await supabase.from('cursos')
        .insert({ ...linha, ordem: cursos.length }).select().single();
      if (falhou(error, 'Não consegui criar o curso. O endereço (slug) pode já existir.')) return;
      setSelecionado((data as Curso).id);
    }
    setForm(f => ({ ...f, slug }));
    setAviso({ tipo: 'ok', texto: 'Curso salvo.' });
    carregarCursos();
  };

  const excluirCurso = async () => {
    if (!selecionado) return;
    if (!confirm(`Excluir "${form.titulo}" com todos os módulos, aulas, progresso e comentários? Não tem volta.`)) return;
    const { error } = await supabase.from('cursos').delete().eq('id', selecionado);
    if (falhou(error, 'Não consegui excluir.')) return;
    selecionar(null);
    carregarCursos();
  };

  // ── Módulos ─────────────────────────────────────────────────
  const [novoModulo, setNovoModulo] = useState('');

  const criarModulo = async () => {
    if (!selecionado || !novoModulo.trim()) return;
    const ordem = Math.max(0, ...modulos.map(m => m.ordem)) + 1;
    const { error } = await supabase.from('curso_modulos')
      .insert({ curso_id: selecionado, titulo: novoModulo.trim(), ordem });
    if (falhou(error, 'Não consegui criar o módulo.')) return;
    setNovoModulo('');
    carregarConteudo(selecionado);
  };

  const renomearModulo = async (m: ModuloAdmin, titulo: string) => {
    if (!titulo.trim() || titulo === m.titulo || !selecionado) return;
    const { error } = await supabase.from('curso_modulos').update({ titulo: titulo.trim() }).eq('id', m.id);
    if (!falhou(error, 'Não consegui renomear.')) carregarConteudo(selecionado);
  };

  const excluirModulo = async (m: ModuloAdmin) => {
    if (!selecionado || !confirm(`Excluir o módulo "${m.titulo}" e as ${m.aulas.length} aulas dele?`)) return;
    const { error } = await supabase.from('curso_modulos').delete().eq('id', m.id);
    if (!falhou(error, 'Não consegui excluir o módulo.')) carregarConteudo(selecionado);
  };

  /**
   * Move um item uma posição e renumera a lista inteira (1, 2, 3...).
   * Renumerar tudo, em vez de trocar dois números, conserta de passagem
   * listas em que duas aulas ficaram com a mesma ordem.
   */
  const mover = async (tabela: 'curso_modulos' | 'curso_aulas', lista: { id: string; ordem: number }[], de: number, para: number) => {
    if (!selecionado || para < 0 || para >= lista.length) return;
    const nova = [...lista];
    const [item] = nova.splice(de, 1);
    nova.splice(para, 0, item);

    const mudancas = nova
      .map((x, i) => ({ id: x.id, ordem: i + 1, antes: x.ordem }))
      .filter(x => x.ordem !== x.antes);
    const respostas = await Promise.all(
      mudancas.map(x => supabase.from(tabela).update({ ordem: x.ordem }).eq('id', x.id)),
    );
    falhou(respostas.find(r => r.error)?.error ?? null, 'Não consegui reordenar.');
    carregarConteudo(selecionado);
  };

  // ── Aulas ───────────────────────────────────────────────────
  const [novaAula, setNovaAula] = useState<Record<string, { titulo: string; link: string; duracao: string }>>({});
  const [lote, setLote] = useState<Record<string, string>>({});
  const [loteAberto, setLoteAberto] = useState<string | null>(null);

  const inserirAulas = async (m: ModuloAdmin, itens: { titulo: string; videoId: string; duracao_seg?: number | null }[]) => {
    let ordem = Math.max(0, ...m.aulas.map(a => a.ordem));
    for (const item of itens) {
      ordem += 1;
      const { data, error } = await supabase.from('curso_aulas')
        .insert({ modulo_id: m.id, titulo: item.titulo, ordem, duracao_seg: item.duracao_seg ?? null })
        .select('id').single();
      if (falhou(error, `Não consegui criar a aula "${item.titulo}".`)) return false;

      const { error: errVideo } = await supabase.from('curso_aula_videos')
        .insert({ aula_id: (data as { id: string }).id, provedor: 'youtube', video_id: item.videoId });
      if (falhou(errVideo, `A aula "${item.titulo}" foi criada, mas o vídeo não foi gravado.`)) return false;
    }
    return true;
  };

  const criarAula = async (m: ModuloAdmin) => {
    const n = novaAula[m.id] ?? { titulo: '', link: '', duracao: '' };
    const videoId = extrairIdYoutube(n.link);
    if (!n.titulo.trim()) return setAviso({ tipo: 'erro', texto: 'A aula precisa de um título.' });
    if (!videoId) return setAviso({ tipo: 'erro', texto: 'Não reconheci esse link do YouTube.' });
    const duracao = n.duracao.trim() ? lerDuracao(n.duracao) : null;
    if (n.duracao.trim() && duracao === null) {
      return setAviso({ tipo: 'erro', texto: 'Duração em minutos (12) ou minutos:segundos (12:30).' });
    }

    if (await inserirAulas(m, [{ titulo: n.titulo.trim(), videoId, duracao_seg: duracao }])) {
      setNovaAula(p => ({ ...p, [m.id]: { titulo: '', link: '', duracao: '' } }));
      setAviso({ tipo: 'ok', texto: 'Aula criada.' });
      if (selecionado) carregarConteudo(selecionado);
    }
  };

  const importarLote = async (m: ModuloAdmin) => {
    const { aulas, problemas } = lerLinhasDeAulas(lote[m.id] ?? '');
    if (problemas.length) {
      setAviso({
        tipo: 'erro',
        texto: `Nada foi gravado. Corrija ${problemas.length === 1 ? 'a linha' : 'as linhas'} ` +
          problemas.map(p => `${p.linha} (${p.motivo})`).join('; '),
      });
      return;
    }
    if (!aulas.length) return;
    if (await inserirAulas(m, aulas)) {
      setLote(p => ({ ...p, [m.id]: '' }));
      setLoteAberto(null);
      setAviso({ tipo: 'ok', texto: `${aulas.length} aulas criadas em "${m.titulo}".` });
    }
    if (selecionado) carregarConteudo(selecionado);
  };

  const atualizarAula = async (a: AulaAdmin, mudanca: Partial<Pick<Aula, 'titulo' | 'gratuita' | 'duracao_seg' | 'descricao'>>) => {
    const { error } = await supabase.from('curso_aulas').update(mudanca).eq('id', a.id);
    if (!falhou(error, 'Não consegui salvar a aula.') && selecionado) carregarConteudo(selecionado);
  };

  const trocarVideo = async (a: AulaAdmin, link: string) => {
    const videoId = extrairIdYoutube(link);
    if (!videoId || videoId === a.video_id) {
      if (link.trim() && !videoId) setAviso({ tipo: 'erro', texto: 'Não reconheci esse link do YouTube.' });
      return;
    }
    const { error } = await supabase.from('curso_aula_videos')
      .upsert({ aula_id: a.id, provedor: 'youtube', video_id: videoId }, { onConflict: 'aula_id' });
    if (!falhou(error, 'Não consegui trocar o vídeo.') && selecionado) carregarConteudo(selecionado);
  };

  const excluirAula = async (a: AulaAdmin) => {
    if (!selecionado || !confirm(`Excluir a aula "${a.titulo}"?`)) return;
    const { error } = await supabase.from('curso_aulas').delete().eq('id', a.id);
    if (!falhou(error, 'Não consegui excluir a aula.')) carregarConteudo(selecionado);
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      {/* Lista de cursos */}
      <aside className="space-y-2">
        <button onClick={() => selecionar(null)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-netzach-gold/50 text-netzach-gold rounded-lg py-2.5 text-sm hover:bg-netzach-gold/10">
          <Plus size={16} /> Novo curso
        </button>
        {cursos.map(c => (
          <button key={c.id} onClick={() => selecionar(c)}
            className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              selecionado === c.id ? 'border-netzach-gold bg-netzach-gold/10 text-white' : 'border-netzach-border bg-netzach-card text-netzach-muted hover:text-white'
            }`}>
            <span className="block truncate">{c.titulo}</span>
            <span className="text-[10px] uppercase tracking-wider">{c.publicado ? 'publicado' : 'rascunho'}</span>
          </button>
        ))}
      </aside>

      <section className="space-y-6 min-w-0">
        {aviso && (
          <p role={aviso.tipo === 'erro' ? 'alert' : 'status'}
            className={`text-sm rounded-lg px-4 py-3 border ${aviso.tipo === 'erro' ? 'border-netzach-rose/40 text-netzach-rose' : 'border-netzach-gold/40 text-netzach-gold'}`}>
            {aviso.texto}
          </p>
        )}

        {/* Dados do curso */}
        <div className="bg-netzach-card border border-netzach-border rounded-xl p-5 space-y-3">
          <h3 className="font-mystic text-lg text-netzach-gold">{selecionado ? 'Editar curso' : 'Novo curso'}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-xs text-netzach-muted space-y-1">Título
              <input className={campo} value={form.titulo} maxLength={160}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value, slug: selecionado ? f.slug : gerarSlug(e.target.value) }))} />
            </label>
            <label className="text-xs text-netzach-muted space-y-1">Endereço (fica em /cursos/…)
              <input className={campo} value={form.slug} maxLength={80}
                onChange={e => setForm(f => ({ ...f, slug: gerarSlug(e.target.value) }))} />
            </label>
            <label className="text-xs text-netzach-muted space-y-1 md:col-span-2">Subtítulo
              <input className={campo} value={form.subtitulo} maxLength={240}
                onChange={e => setForm(f => ({ ...f, subtitulo: e.target.value }))} />
            </label>
            <label className="text-xs text-netzach-muted space-y-1 md:col-span-2">Descrição
              <textarea className={`${campo} resize-y`} rows={3} value={form.descricao} maxLength={4000}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </label>
            <label className="text-xs text-netzach-muted space-y-1 md:col-span-2">Link da imagem de capa (opcional, formato 16:9)
              <input className={campo} value={form.capa_url} placeholder="https://..."
                onChange={e => setForm(f => ({ ...f, capa_url: e.target.value }))} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm text-netzach-text cursor-pointer">
              <input type="checkbox" checked={form.publicado} className="accent-netzach-gold"
                onChange={e => setForm(f => ({ ...f, publicado: e.target.checked }))} />
              Publicado (aparece para as alunas)
            </label>
            <div className="flex-1" />
            {selecionado && (
              <button onClick={excluirCurso} className="text-xs text-netzach-muted hover:text-netzach-rose flex items-center gap-1">
                <Trash2 size={13} /> Excluir curso
              </button>
            )}
            <button onClick={salvarCurso} className="bg-netzach-gold text-netzach-bg font-bold text-sm px-5 py-2 rounded-lg hover:bg-white">
              {selecionado ? 'Salvar' : 'Criar curso'}
            </button>
          </div>
        </div>

        {selecionado && (
          <>
            <div className="flex gap-2">
              {([['conteudo', 'Módulos e aulas', Film], ['alunas', 'Alunas', Users]] as const).map(([id, rotulo, Icone]) => (
                <button key={id} onClick={() => setAba(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${aba === id ? 'bg-netzach-gold text-netzach-bg border-netzach-gold font-bold' : 'border-netzach-border text-netzach-muted'}`}>
                  <Icone size={15} /> {rotulo}
                </button>
              ))}
            </div>

            {aba === 'conteudo' && (
              <div className="space-y-4">
                {modulos.map((m, i) => (
                  <div key={m.id} className="bg-netzach-card border border-netzach-border rounded-xl">
                    <div className="flex items-center gap-2 p-3 border-b border-netzach-border">
                      <span className="text-netzach-gold font-mystic w-6 text-center">{i + 1}</span>
                      <input defaultValue={m.titulo} key={m.titulo} onBlur={e => renomearModulo(m, e.target.value)}
                        className="flex-1 bg-transparent text-white font-mystic outline-none border-b border-transparent focus:border-netzach-gold" />
                      <button className={btn} disabled={i === 0} onClick={() => mover('curso_modulos', modulos, i, i - 1)} aria-label="Subir módulo"><ArrowUp size={15} /></button>
                      <button className={btn} disabled={i === modulos.length - 1} onClick={() => mover('curso_modulos', modulos, i, i + 1)} aria-label="Descer módulo"><ArrowDown size={15} /></button>
                      <button className={`${btn} hover:text-netzach-rose`} onClick={() => excluirModulo(m)} aria-label="Excluir módulo"><Trash2 size={15} /></button>
                    </div>

                    <ul className="divide-y divide-netzach-border/60">
                      {m.aulas.map((a, j) => (
                        <li key={a.id} className="p-3 grid gap-2 md:grid-cols-[1fr_1fr_90px_auto] items-center">
                          <input defaultValue={a.titulo} key={`t${a.titulo}`} aria-label="Título da aula"
                            onBlur={e => e.target.value.trim() && e.target.value !== a.titulo && atualizarAula(a, { titulo: e.target.value.trim() })}
                            className={campo} />
                          <input defaultValue={a.video_id ? `https://youtu.be/${a.video_id}` : ''} key={`v${a.video_id}`} aria-label="Link do YouTube"
                            placeholder="Sem vídeo: cole o link"
                            onBlur={e => trocarVideo(a, e.target.value)}
                            className={`${campo} ${a.video_id ? '' : 'border-netzach-rose/60'}`} />
                          <input defaultValue={a.duracao_seg ? paraMinSeg(a.duracao_seg) : ''} key={`d${a.duracao_seg}`}
                            aria-label="Duração" placeholder="mm:ss"
                            onBlur={e => {
                              const s = lerDuracao(e.target.value);
                              if (s !== null && s !== a.duracao_seg) atualizarAula(a, { duracao_seg: s });
                            }}
                            className={campo} />
                          <div className="flex items-center gap-1 justify-end">
                            <button className={btn} onClick={() => atualizarAula(a, { gratuita: !a.gratuita })}
                              aria-label={a.gratuita ? 'Tirar de amostra' : 'Tornar amostra gratuita'} title={a.gratuita ? 'Amostra: aberta a todas' : 'Só para quem tem o curso'}>
                              {a.gratuita ? <Eye size={15} className="text-netzach-gold" /> : <EyeOff size={15} />}
                            </button>
                            <button className={btn} disabled={j === 0} onClick={() => mover('curso_aulas', m.aulas, j, j - 1)} aria-label="Subir aula"><ArrowUp size={15} /></button>
                            <button className={btn} disabled={j === m.aulas.length - 1} onClick={() => mover('curso_aulas', m.aulas, j, j + 1)} aria-label="Descer aula"><ArrowDown size={15} /></button>
                            <button className={`${btn} hover:text-netzach-rose`} onClick={() => excluirAula(a)} aria-label="Excluir aula"><Trash2 size={15} /></button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Nova aula / lote */}
                    <div className="p-3 border-t border-netzach-border space-y-2 bg-netzach-bg/30">
                      {loteAberto === m.id ? (
                        <>
                          <p className="text-xs text-netzach-muted">
                            Uma aula por linha: <code className="text-netzach-gold">título | link do YouTube</code>. Pode colar direto de uma planilha com duas colunas.
                          </p>
                          <textarea rows={8} className={`${campo} font-mono text-xs`} value={lote[m.id] ?? ''}
                            placeholder={'Abertura da formação | https://youtu.be/...\nA semente da vida | https://youtu.be/...'}
                            onChange={e => setLote(p => ({ ...p, [m.id]: e.target.value }))} />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setLoteAberto(null)} className="text-xs text-netzach-muted px-3">Cancelar</button>
                            <button onClick={() => importarLote(m)} className="bg-netzach-gold text-netzach-bg font-bold text-xs px-4 py-2 rounded-lg">
                              Criar {lerLinhasDeAulas(lote[m.id] ?? '').aulas.length || ''} aulas
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-[1fr_1fr_90px_auto_auto] items-center">
                          <input className={campo} placeholder="Título da nova aula"
                            value={novaAula[m.id]?.titulo ?? ''}
                            onChange={e => setNovaAula(p => ({ ...p, [m.id]: { ...{ titulo: '', link: '', duracao: '' }, ...p[m.id], titulo: e.target.value } }))} />
                          <input className={campo} placeholder="Link do YouTube"
                            value={novaAula[m.id]?.link ?? ''}
                            onChange={e => setNovaAula(p => ({ ...p, [m.id]: { ...{ titulo: '', link: '', duracao: '' }, ...p[m.id], link: e.target.value } }))} />
                          <input className={campo} placeholder="mm:ss"
                            value={novaAula[m.id]?.duracao ?? ''}
                            onChange={e => setNovaAula(p => ({ ...p, [m.id]: { ...{ titulo: '', link: '', duracao: '' }, ...p[m.id], duracao: e.target.value } }))} />
                          <button onClick={() => criarAula(m)} className="bg-netzach-gold text-netzach-bg font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1 justify-center">
                            <Plus size={14} /> Aula
                          </button>
                          <button onClick={() => setLoteAberto(m.id)} className="text-xs text-netzach-gold border border-netzach-gold/40 px-3 py-2 rounded-lg flex items-center gap-1 justify-center" title="Colar várias aulas de uma vez">
                            <ListPlus size={14} /> Várias
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input className={campo} placeholder="Nome do novo módulo" value={novoModulo}
                    onChange={e => setNovoModulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && criarModulo()} />
                  <button onClick={criarModulo} className="shrink-0 border border-netzach-gold text-netzach-gold text-sm px-4 rounded-lg hover:bg-netzach-gold/10 flex items-center gap-1">
                    <Plus size={15} /> Módulo
                  </button>
                </div>
              </div>
            )}

            {aba === 'alunas' && <AlunasDoCurso cursoId={selecionado} />}
          </>
        )}
      </section>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Quem tem acesso
// ───────────────────────────────────────────────────────────────

interface Aluna { user_id: string; email: string; nome: string | null; origem: string; concedido_em: string }

function AlunasDoCurso({ cursoId }: { cursoId: string }) {
  const [alunas, setAlunas] = useState<Aluna[]>([]);
  const [emails, setEmails] = useState('');
  const [origem, setOrigem] = useState<'manual' | 'hotmart'>('hotmart');
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<{ liberadas: number; semConta: string[]; falhas: string[] } | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('alunas_do_curso', { p_curso_id: cursoId });
    if (error) console.error('Falha ao listar alunas:', error.message);
    setAlunas((data ?? []) as Aluna[]);
  }, [cursoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const liberar = async () => {
    // Aceita a coluna de email colada da exportação da Hotmart, com
    // vírgula, ponto e vírgula ou quebra de linha, e repetições.
    const lista = [...new Set(
      emails.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
    )];
    if (!lista.length) return;

    setProcessando(true);
    const semConta: string[] = [];
    const falhas: string[] = [];
    let liberadas = 0;

    for (const email of lista) {
      const { data, error } = await supabase.rpc('conceder_acesso_curso', {
        p_email: email, p_curso_id: cursoId, p_origem: origem,
      });
      if (error) { console.error(email, error.message); falhas.push(email); }
      else if (data === 'sem_conta') semConta.push(email);
      else liberadas += 1;
    }

    setProcessando(false);
    setResultado({ liberadas, semConta, falhas });
    setEmails('');
    carregar();
  };

  const retirar = async (a: Aluna) => {
    if (!confirm(`Retirar o acesso de ${a.email}? O progresso dela fica guardado caso volte.`)) return;
    const { error } = await supabase.from('curso_acessos').delete().eq('user_id', a.user_id).eq('curso_id', cursoId);
    if (error) console.error('Falha ao retirar acesso:', error.message);
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="bg-netzach-card border border-netzach-border rounded-xl p-5 space-y-3">
        <h3 className="font-mystic text-lg text-netzach-gold">Liberar acesso</h3>
        <p className="text-xs text-netzach-muted leading-relaxed">
          Cole um ou vários emails (a coluna de email da exportação da Hotmart serve). Quem ainda
          não tem conta no Netzach aparece numa lista à parte: convide essas pessoas primeiro e depois
          libere de novo.
        </p>
        <textarea rows={5} className={`${campo} font-mono text-xs`} value={emails}
          placeholder={'aluna1@email.com\naluna2@email.com'} onChange={e => setEmails(e.target.value)} />
        <div className="flex items-center gap-3">
          <select value={origem} onChange={e => setOrigem(e.target.value as 'manual' | 'hotmart')}
            className="bg-netzach-bg border border-netzach-border-field rounded-lg px-3 py-2 text-sm text-white">
            <option value="hotmart">Veio da Hotmart</option>
            <option value="manual">Liberação manual</option>
          </select>
          <div className="flex-1" />
          <button onClick={liberar} disabled={processando || !emails.trim()}
            className="bg-netzach-gold text-netzach-bg font-bold text-sm px-5 py-2 rounded-lg disabled:opacity-40">
            {processando ? 'Liberando...' : 'Liberar acesso'}
          </button>
        </div>

        {resultado && (
          <div className="text-sm space-y-2 pt-2 border-t border-netzach-border">
            <p className="text-netzach-gold">{resultado.liberadas} com acesso liberado.</p>
            {resultado.semConta.length > 0 && (
              <div>
                <p className="text-netzach-text">{resultado.semConta.length} ainda sem conta no Netzach:</p>
                <textarea readOnly rows={Math.min(6, resultado.semConta.length)} className={`${campo} font-mono text-xs mt-1`}
                  value={resultado.semConta.join('\n')} />
              </div>
            )}
            {resultado.falhas.length > 0 && (
              <p className="text-netzach-rose">Falhou para: {resultado.falhas.join(', ')}</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-netzach-card border border-netzach-border rounded-xl">
        <p className="px-5 py-3 border-b border-netzach-border text-sm text-netzach-muted">{alunas.length} com acesso</p>
        <ul className="divide-y divide-netzach-border/60 max-h-[480px] overflow-y-auto">
          {alunas.map(a => (
            <li key={a.user_id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
              <span className="flex-1 min-w-0">
                <span className="block text-white truncate">{a.nome || a.email}</span>
                {a.nome && <span className="block text-xs text-netzach-muted truncate">{a.email}</span>}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-netzach-muted">{a.origem}</span>
              <button onClick={() => retirar(a)} className={`${btn} hover:text-netzach-rose`} aria-label={`Retirar acesso de ${a.email}`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
