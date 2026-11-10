import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Cpu, ShieldCheck, ArrowLeftRight, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Modelos de IA da Sacerdotisa: chaves, modelo principal e reserva.
 *
 * A chave nunca volta para cá depois de salva: a tela só sabe "tem chave,
 * termina em ••••abcd". Tudo passa pela função `ia-config`, que só a
 * administradora acessa e que cifra a chave antes de guardá-la.
 */

type Provedor = 'openai' | 'anthropic' | 'gemini' | 'deepseek';
type Lugar = 'primario' | 'reserva';

interface Escolha { provedor: Provedor; modelo: string }

interface Estado {
  configurada: boolean;
  padrao: Escolha;
  segredo_de_cifra: boolean;
  chave_no_ambiente: { anthropic: boolean };
  chaves: Record<Provedor, { ultimos4: string; atualizado_em: string } | null>;
  primario: Escolha;
  reserva: Escolha | null;
  reserva_ligada: boolean;
  atualizado_em: string | null;
}

interface ResultadoDeTeste { ok: boolean; ms: number; resposta?: string; erro?: string }

const PROVEDORES: Array<{ id: Provedor; nome: string; onde: string; modelos: string[] }> = [
  { id: 'openai', nome: 'OpenAI', onde: 'platform.openai.com/api-keys', modelos: ['gpt-5.4', 'gpt-5.1', 'gpt-5.1-mini', 'gpt-5-mini', 'gpt-4.1', 'gpt-4.1-mini'] },
  { id: 'anthropic', nome: 'Claude (Anthropic)', onde: 'console.anthropic.com/settings/keys', modelos: ['claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5', 'claude-fable-5-1'] },
  { id: 'gemini', nome: 'Gemini (Google)', onde: 'aistudio.google.com/apikey', modelos: ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'] },
  { id: 'deepseek', nome: 'DeepSeek', onde: 'platform.deepseek.com/api_keys', modelos: ['deepseek-chat', 'deepseek-reasoner'] },
];

const NOME = Object.fromEntries(PROVEDORES.map(p => [p.id, p.nome])) as Record<Provedor, string>;

const campo = 'bg-netzach-bg border border-netzach-border-field rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-netzach-gold w-full';
const botao = 'text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

/** Lê a mensagem que a função devolveu num erro HTTP; sem ela, cai num texto genérico. */
async function mensagemDoErro(error: unknown): Promise<string> {
  try {
    const corpo = await (error as { context?: Response }).context?.json();
    if (corpo?.mensagem) return corpo.mensagem as string;
  } catch { /* sem corpo legível */ }
  return 'Não consegui concluir. Tente de novo.';
}

class ErroDaFuncao extends Error {
  codigo?: string;
  constructor(mensagem: string, codigo?: string) {
    super(mensagem);
    this.codigo = codigo;
  }
}

async function chamar<T = Estado>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ia-config', { body: corpo });
  if (error) {
    let codigo: string | undefined;
    try { codigo = (await (error as { context?: Response }).context?.clone().json())?.error; } catch { /* ignora */ }
    throw new ErroDaFuncao(await mensagemDoErro(error), codigo);
  }
  return data as T;
}

export default function AdminIA() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState<{ texto: string; codigo?: string } | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [primario, setPrimario] = useState<Escolha>({ provedor: 'anthropic', modelo: '' });
  const [reserva, setReserva] = useState<Escolha>({ provedor: 'openai', modelo: '' });
  const [ligada, setLigada] = useState(false);

  const [novasChaves, setNovasChaves] = useState<Partial<Record<Provedor, string>>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [testes, setTestes] = useState<Partial<Record<Lugar, ResultadoDeTeste | 'testando'>>>({});

  const aplicar = useCallback((e: Estado) => {
    setEstado(e);
    setPrimario(e.primario);
    setReserva(e.reserva ?? { provedor: e.primario.provedor === 'openai' ? 'anthropic' : 'openai', modelo: '' });
    setLigada(e.reserva_ligada);
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      aplicar(await chamar({ acao: 'ler' }));
      setFalha(null);
    } catch (e) {
      console.error('Falha ao ler a configuração de IA:', e instanceof Error ? e.message : e);
      setFalha({ texto: e instanceof Error ? e.message : 'Não consegui abrir a configuração.', codigo: (e as ErroDaFuncao).codigo });
    } finally {
      setCarregando(false);
    }
  }, [aplicar]);

  useEffect(() => { carregar(); }, [carregar]);

  /** O que está nos campos é diferente do que está salvo? */
  const alterado = useMemo(() => {
    if (!estado) return false;
    const igual = (a: Escolha, b: Escolha | null) => b !== null && a.provedor === b.provedor && a.modelo.trim() === b.modelo;
    return !igual(primario, estado.primario)
      || ligada !== estado.reserva_ligada
      || (reserva.modelo.trim() !== '' && !igual(reserva, estado.reserva))
      || (reserva.modelo.trim() === '' && estado.reserva !== null);
  }, [estado, primario, reserva, ligada]);

  const executar = async (rotulo: string, tarefa: () => Promise<void>) => {
    setAviso(null);
    setOcupado(rotulo);
    try { await tarefa(); }
    catch (e) { setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não consegui concluir.' }); }
    finally { setOcupado(null); }
  };

  const salvarChave = (p: Provedor) => executar(`chave-${p}`, async () => {
    const r = await chamar<{ ok: boolean; ultimos4: string }>({ acao: 'salvar_chave', provedor: p, chave: novasChaves[p] ?? '' });
    // A chave digitada sai da tela assim que é guardada.
    setNovasChaves(n => ({ ...n, [p]: '' }));
    aplicar(await chamar({ acao: 'ler' }));
    setAviso({ tipo: 'ok', texto: `Chave da ${NOME[p]} guardada (termina em ${r.ultimos4}). Use "Testar" para conferir.` });
  });

  const removerChave = (p: Provedor) => {
    if (!confirm(`Remover a chave da ${NOME[p]}?`)) return;
    return executar(`remover-${p}`, async () => {
      await chamar({ acao: 'remover_chave', provedor: p });
      aplicar(await chamar({ acao: 'ler' }));
      setAviso({ tipo: 'ok', texto: `Chave da ${NOME[p]} removida.` });
    });
  };

  const salvarConfig = () => executar('config', async () => {
    const temReserva = reserva.modelo.trim() !== '';
    aplicar(await chamar({
      acao: 'salvar_config',
      primario: { ...primario, modelo: primario.modelo.trim() },
      reserva: temReserva ? { ...reserva, modelo: reserva.modelo.trim() } : null,
      reserva_ligada: ligada && temReserva,
    }));
    setTestes({});
    setAviso({ tipo: 'ok', texto: 'Configuração salva. Vale a partir da próxima consulta das alunas.' });
  });

  const trocar = () => executar('trocar', async () => {
    aplicar(await chamar({ acao: 'trocar' }));
    setTestes({});
    setAviso({ tipo: 'ok', texto: 'Principal e reserva trocados. Vale a partir da próxima consulta.' });
  });

  const testar = async (lugar: Lugar) => {
    const alvo = lugar === 'primario' ? primario : reserva;
    setTestes(t => ({ ...t, [lugar]: 'testando' }));
    try {
      const r = await chamar<ResultadoDeTeste>({ acao: 'testar', provedor: alvo.provedor, modelo: alvo.modelo.trim() });
      setTestes(t => ({ ...t, [lugar]: r }));
    } catch (e) {
      setTestes(t => ({ ...t, [lugar]: { ok: false, ms: 0, erro: e instanceof Error ? e.message : 'Não consegui testar.' } }));
    }
  };

  // ── Peças de tela ───────────────────────────────────────────
  const resultado = (lugar: Lugar) => {
    const r = testes[lugar];
    if (!r) return null;
    if (r === 'testando') {
      return <p role="status" className="text-xs text-netzach-muted flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" aria-hidden="true" /> Testando...</p>;
    }
    return r.ok
      ? <p role="status" className="text-xs text-netzach-gold flex items-start gap-1.5"><CheckCircle2 size={14} className="shrink-0 mt-0.5" aria-hidden="true" /> Funcionou: respondeu em {(r.ms / 1000).toFixed(1)} s ("{r.resposta}").</p>
      : <p role="alert" className="text-xs text-netzach-rose flex items-start gap-1.5 break-words"><XCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" /> Não funcionou: {r.erro}</p>;
  };

  const seletor = (lugar: Lugar, valor: Escolha, mudar: (e: Escolha) => void) => {
    const modelos = PROVEDORES.find(p => p.id === valor.provedor)?.modelos ?? [];
    const lista = `modelos-${lugar}`;
    return (
      <div className="grid sm:grid-cols-[180px_1fr_auto] gap-2 items-end">
        <label className="text-[10px] uppercase tracking-wider text-netzach-muted space-y-1">
          Plataforma
          <select className={campo} value={valor.provedor}
            onChange={e => mudar({ provedor: e.target.value as Provedor, modelo: '' })}>
            {PROVEDORES.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
        <label className="text-[10px] uppercase tracking-wider text-netzach-muted space-y-1">
          Modelo
          <input className={campo} list={lista} value={valor.modelo} autoComplete="off" spellCheck={false}
            placeholder="Escolha ou escreva o nome exato"
            onChange={e => mudar({ ...valor, modelo: e.target.value })} />
          <datalist id={lista}>{modelos.map(m => <option key={m} value={m} />)}</datalist>
        </label>
        <button type="button" onClick={() => testar(lugar)} disabled={!valor.modelo.trim() || testes[lugar] === 'testando'}
          className={`${botao} border-netzach-border text-netzach-muted hover:text-white hover:border-netzach-gold/50`}>
          Testar
        </button>
      </div>
    );
  };

  if (carregando && !estado) {
    return <p className="text-netzach-muted animate-pulse text-sm">Sintonizando...</p>;
  }

  if (falha && !estado) {
    return (
      <div className="bg-netzach-card p-6 rounded-2xl border border-netzach-rose/40 space-y-3">
        <p role="alert" className="text-sm text-netzach-rose flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" /> {falha.texto}</p>
        <button onClick={carregar} className={`${botao} border-netzach-border text-netzach-muted hover:text-white`}>Tentar de novo</button>
      </div>
    );
  }

  if (!estado) return null;

  return (
    <section aria-labelledby="titulo-ia" className="bg-netzach-card p-6 rounded-2xl border border-netzach-border space-y-6">
      <div>
        <h2 id="titulo-ia" className="text-xl font-mystic text-white flex items-center gap-2"><Cpu size={18} aria-hidden="true" /> Modelos de IA</h2>
        <p className="text-xs text-netzach-muted mt-1 leading-relaxed">
          A sacerdotisa responde com o modelo principal. Se ele falhar antes de começar a responder
          (chave errada, limite do plano, modelo fora do ar), a reserva assume e a aluna não percebe.
          Dá para usar duas plataformas diferentes ou dois modelos da mesma.
        </p>
      </div>

      {!estado.segredo_de_cifra && (
        <div role="alert" className="border border-netzach-gold/40 bg-netzach-gold/[0.06] rounded-xl p-4 text-xs space-y-2">
          <p className="text-netzach-gold font-bold flex items-center gap-1.5"><ShieldCheck size={14} aria-hidden="true" /> Falta um passo antes de guardar chaves</p>
          <p className="text-netzach-text/90 leading-relaxed">
            As chaves ficam cifradas no banco, com um segredo que só existe no servidor. Defina-o uma vez
            (troque o texto por uma frase longa e aleatória, com pelo menos 24 caracteres):
          </p>
          <code className="block bg-netzach-bg rounded-lg px-3 py-2 text-netzach-text break-all">npx supabase secrets set IA_ENCRYPTION_KEY="uma-frase-longa-e-aleatoria-aqui"</code>
          <button onClick={carregar} className={`${botao} border-netzach-gold/50 text-netzach-gold hover:bg-netzach-gold/10`}>Já defini, verificar de novo</button>
        </div>
      )}

      {!estado.configurada && (
        <p className="text-xs text-netzach-muted border border-netzach-border rounded-xl px-4 py-3 leading-relaxed">
          Nada foi configurado ainda, então a sacerdotisa usa o padrão: {NOME[estado.padrao.provedor]}, modelo {estado.padrao.modelo}, com a chave do servidor.
        </p>
      )}

      {aviso && (
        <p role={aviso.tipo === 'erro' ? 'alert' : 'status'}
          className={`text-sm rounded-lg px-4 py-3 border ${aviso.tipo === 'erro' ? 'border-netzach-rose/40 text-netzach-rose' : 'border-netzach-gold/40 text-netzach-gold'}`}>
          {aviso.texto}
        </p>
      )}

      {/* ── Chaves ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-netzach-gold uppercase tracking-wider flex items-center gap-2"><KeyRound size={14} aria-hidden="true" /> Chaves</h3>
        <p className="text-[11px] text-netzach-muted">Uma chave por plataforma, usada por todos os modelos dela. Depois de salva, a chave não aparece mais aqui.</p>

        {PROVEDORES.map(p => {
          const guardada = estado.chaves[p.id];
          const doServidor = p.id === 'anthropic' && !guardada && estado.chave_no_ambiente.anthropic;
          return (
            <div key={p.id} className="border border-netzach-border rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white">{p.nome}</p>
                <p className="text-[11px] text-netzach-muted">
                  {guardada ? <span className="text-netzach-gold">Configurada · termina em ••••{guardada.ultimos4}</span>
                    : doServidor ? 'Usando a chave do servidor'
                    : 'Sem chave'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="sr-only" htmlFor={`chave-${p.id}`}>Chave da {p.nome}</label>
                <input id={`chave-${p.id}`} type="password" autoComplete="off" spellCheck={false}
                  className={campo} placeholder={guardada ? 'Cole uma nova chave para trocar' : 'Cole a chave'}
                  value={novasChaves[p.id] ?? ''}
                  onChange={e => setNovasChaves(n => ({ ...n, [p.id]: e.target.value }))} />
                <button type="button" onClick={() => salvarChave(p.id)}
                  disabled={!(novasChaves[p.id] ?? '').trim() || !estado.segredo_de_cifra || ocupado === `chave-${p.id}`}
                  className={`${botao} shrink-0 border-netzach-gold/50 text-netzach-gold hover:bg-netzach-gold/10`}>
                  {ocupado === `chave-${p.id}` ? 'Guardando...' : 'Salvar chave'}
                </button>
                {guardada && (
                  <button type="button" onClick={() => removerChave(p.id)} disabled={ocupado === `remover-${p.id}`}
                    className={`${botao} shrink-0 border-netzach-border text-netzach-muted hover:text-netzach-rose hover:border-netzach-rose/50`}>
                    Remover
                  </button>
                )}
              </div>
              <p className="text-[10px] text-netzach-muted/80">Crie a chave em {p.onde}</p>
            </div>
          );
        })}
      </div>

      {/* ── Principal ───────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-netzach-gold uppercase tracking-wider">Modelo principal</h3>
        {seletor('primario', primario, setPrimario)}
        {resultado('primario')}
      </div>

      {/* ── Reserva ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-netzach-gold uppercase tracking-wider">Reserva</h3>
          <label className="flex items-center gap-2 text-xs text-netzach-text cursor-pointer">
            <input type="checkbox" className="accent-netzach-gold" checked={ligada}
              onChange={e => setLigada(e.target.checked)} />
            Usar a reserva quando o principal falhar
          </label>
        </div>
        {seletor('reserva', reserva, setReserva)}
        {resultado('reserva')}
        {ligada && reserva.modelo.trim() === '' && (
          <p className="text-[11px] text-netzach-rose">Escolha o modelo de reserva, ou desligue a opção acima.</p>
        )}
      </div>

      {/* ── Ações ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-netzach-border">
        <button type="button" onClick={salvarConfig}
          disabled={!alterado || !primario.modelo.trim() || ocupado === 'config' || (ligada && reserva.modelo.trim() === '')}
          className="bg-netzach-gold text-netzach-bg font-bold text-sm px-5 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
          {ocupado === 'config' ? 'Salvando...' : 'Salvar configuração'}
        </button>

        <button type="button" onClick={trocar}
          disabled={alterado || !estado.reserva || ocupado === 'trocar'}
          title={alterado ? 'Salve as alterações antes de trocar' : !estado.reserva ? 'Não há reserva para trocar' : 'Troca já, valendo para a próxima consulta'}
          className={`${botao} border-netzach-border text-netzach-muted hover:text-white hover:border-netzach-gold/50 flex items-center gap-1.5`}>
          <ArrowLeftRight size={14} aria-hidden="true" /> Trocar principal e reserva
        </button>

        {estado.atualizado_em && (
          <p className="text-[11px] text-netzach-muted ml-auto">
            Salvo em {new Date(estado.atualizado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
          </p>
        )}
      </div>
    </section>
  );
}
