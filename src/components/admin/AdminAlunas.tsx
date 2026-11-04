import { useCallback, useEffect, useState } from 'react';
import { Search, ShieldCheck, ShieldOff, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { avaliarAssinatura, descreverAssinatura, dataDeEntrada } from '../../lib/assinatura';
import type { Profile } from '../../types';

/**
 * Alunas e o estado real da assinatura de cada uma.
 *
 * Antes esta lista mostrava um check verde ligado à coluna de status, que
 * nasce como "active" em toda conta criada: parecia que todo mundo estava
 * em dia. E o botão de alterar status não fazia nada, porque a trava de
 * `profiles` revertia a mudança sem devolver erro.
 *
 * Agora a lista mostra plano, vencimento e o estado que a aluna de fato
 * encontra ao abrir o portal, pela mesma regra que o app usa.
 */

const PLANOS = [
  { valor: '', rotulo: 'Sem plano' },
  { valor: 'free', rotulo: 'Gratuito' },
  { valor: 'hecate', rotulo: 'Hécate' },
  { valor: 'isis', rotulo: 'Ísis' },
  { valor: 'lilith', rotulo: 'Lilith' },
];

const campo = 'bg-netzach-bg border border-netzach-border-field rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-netzach-gold';

function formatarData(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function AdminAlunas() {
  const [alunas, setAlunas] = useState<Profile[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro' | 'info'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Falha ao listar alunas:', error.message);
      setAviso({ tipo: 'erro', texto: `Não consegui listar as alunas (${error.message}).` });
    } else {
      setAlunas((data ?? []) as Profile[]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  /**
   * Grava e confere o que o banco devolveu. A trava de `profiles` pode
   * reverter a mudança sem erro nenhum, e foi assim que o botão antigo
   * passou meses parecendo funcionar.
   */
  const salvar = async (aluna: Profile, mudanca: Partial<Profile>, descricao: string) => {
    setAviso(null);
    const { data, error } = await supabase.from('profiles')
      .update(mudanca)
      .eq('id', aluna.id)
      .select('plan_type, subscription_status, subscription_end_date')
      .maybeSingle();

    if (error) {
      console.error('Falha ao salvar:', error.message);
      setAviso({ tipo: 'erro', texto: `Não consegui salvar (${error.message}).` });
      return;
    }

    const campoMudado = Object.keys(mudanca)[0] as keyof Profile;
    const gravado = (data as Record<string, unknown> | null)?.[campoMudado];
    if (data && gravado !== mudanca[campoMudado]) {
      setAviso({
        tipo: 'erro',
        texto: 'O banco recusou a alteração em silêncio. Rode a migration 20261006_admin_assinatura.sql, que abre essa permissão para a admin.',
      });
      carregar();
      return;
    }

    setAviso({ tipo: 'ok', texto: `${aluna.full_name || 'Aluna'}: ${descricao}` });
    carregar();
  };

  const alternarBloqueio = (aluna: Profile) => {
    const estado = avaliarAssinatura(aluna);
    const liberar = estado.bloqueada;
    salvar(
      aluna,
      { subscription_status: liberar ? 'active' : 'inactive' },
      liberar ? 'liberada' : 'bloqueada',
    );
  };

  // ── Mapa astral ─────────────────────────────────────────────
  // O cálculo usava fuso fixo de -3 e errava o mapa de quem nasceu em
  // horário de verão. Corrigida a função, os mapas já gravados seguem
  // errados até serem refeitos: daqui a admin refaz um a um ou todos.
  const [recalculando, setRecalculando] = useState<string | null>(null);
  const [lote, setLote] = useState<{ feitas: number; total: number } | null>(null);

  const podeCalcular = (a: Profile) => Boolean(a.birth_date && a.birth_city);

  /** Em que passo da função o cálculo parou, dito em português. */
  const ETAPAS: Record<string, string> = {
    busca_da_cidade: 'na busca da cidade (o serviço de mapas recusou o pedido ou não conhece o nome)',
    fuso: 'no cálculo do fuso horário',
    api_astrologia: 'na API de astrologia (chave, limite do plano ou serviço fora do ar)',
    gravacao: 'ao gravar o resultado',
    sem_resposta: 'sem resposta da função em 45 segundos',
  };

  type ResultadoDoMapa =
    | { ok: true; sign_sun: string; sign_moon: string; sign_rising: string; fuso: { zona: string; horas: number } }
    | { ok: false; etapa: string | null; detalhe: string | null };

  /** Devolve o que o servidor calculou, ou em que passo ele falhou. */
  const calcularMapa = async (a: Profile): Promise<ResultadoDoMapa> => {
    const chamada = supabase.functions.invoke('calculate-astral-chart', {
      body: {
        user_id: a.user_id,
        birth_date: a.birth_date,
        birth_time: a.birth_time || null,
        birth_city: a.birth_city,
      },
    });
    // Se a função ficar pendurada, a tela precisa de um fim: antes o
    // botão parecia não fazer nada.
    const limite = new Promise<'estourou'>(resolver => setTimeout(() => resolver('estourou'), 45_000));
    const resposta = await Promise.race([chamada, limite]);
    if (resposta === 'estourou') return { ok: false, etapa: 'sem_resposta', detalhe: null };
    const { data, error } = resposta;
    if (error || !data?.ok) {
      console.error('Falha ao calcular o mapa:', error?.message ?? 'sem retorno');
      // Quando a função responde com erro, a resposta fica em error.context.
      let etapa: string | null = null;
      let detalhe: string | null = null;
      try {
        const corpo = await (error as { context?: Response } | null)?.context?.json();
        etapa = corpo?.etapa ?? null;
        detalhe = corpo?.detalhe ?? corpo?.error ?? null;
      } catch { /* resposta sem corpo legível */ }
      return { ok: false, etapa, detalhe };
    }
    return data as ResultadoDoMapa;
  };

  const recalcularUma = async (a: Profile) => {
    setAviso({ tipo: 'info', texto: `Calculando o mapa de ${a.full_name || 'aluna'}... pode levar até 30 segundos.` });
    setRecalculando(a.id);
    const r = await calcularMapa(a);
    setRecalculando(null);

    if (!r.ok) {
      const onde = r.etapa ? ETAPAS[r.etapa] ?? `no passo "${r.etapa}"` : 'por um motivo que a função não informou';
      setAviso({
        tipo: 'erro',
        texto: `Não consegui calcular o mapa de ${a.full_name || 'aluna'}: falhou ${onde}.${r.detalhe ? ` Detalhe: ${r.detalhe}` : ''}`,
      });
      return;
    }
    setAviso({
      tipo: 'ok',
      texto: `${a.full_name || 'Aluna'}: Sol em ${r.sign_sun}, Lua em ${r.sign_moon}, Ascendente em ${r.sign_rising} (fuso ${r.fuso.horas > 0 ? '+' : ''}${r.fuso.horas}, ${r.fuso.zona}).`,
    });
    carregar();
  };

  const recalcularTodas = async () => {
    const alvo = alunas.filter(a => a.role !== 'admin' && podeCalcular(a));
    if (!alvo.length) return;
    if (!confirm(`Refazer o mapa astral de ${alvo.length} alunas? Leva cerca de ${Math.ceil(alvo.length * 1.5 / 60)} min e usa ${alvo.length} chamadas da API de astrologia.`)) return;

    setAviso(null);
    let falhas = 0;
    const etapasQueFalharam = new Set<string>();
    for (let i = 0; i < alvo.length; i++) {
      setLote({ feitas: i, total: alvo.length });
      const r = await calcularMapa(alvo[i]);
      if (!r.ok) {
        falhas += 1;
        const base = r.etapa ? ETAPAS[r.etapa] ?? r.etapa : 'passo não informado';
        etapasQueFalharam.add(r.detalhe ? `${base} (${r.detalhe})` : base);
      }
      // A API gratuita limita a um pedido por segundo.
      await new Promise(r => setTimeout(r, 1500));
    }
    setLote(null);
    setAviso({
      tipo: falhas ? 'erro' : 'ok',
      texto: falhas
        ? `${alvo.length - falhas} mapas refeitos e ${falhas} falharam: ${[...etapasQueFalharam].join('; ')}.`
        : `${alvo.length} mapas refeitos.`,
    });
    carregar();
  };

  const filtradas = alunas.filter(a =>
    `${a.full_name ?? ''} ${a.whatsapp ?? ''}`.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="bg-netzach-card p-4 rounded-xl flex gap-2 items-center">
        <Search size={18} className="text-netzach-muted shrink-0" aria-hidden="true" />
        <label htmlFor="busca-aluna" className="sr-only">Buscar aluna</label>
        <input id="busca-aluna" placeholder="Buscar por nome ou WhatsApp"
          className="bg-transparent w-full outline-none text-white text-sm"
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-netzach-muted">{alunas.length} contas</p>
        <button onClick={recalcularTodas} disabled={lote !== null || carregando}
          className="text-xs px-3 py-2 rounded-lg border border-netzach-gold/50 text-netzach-gold hover:bg-netzach-gold/10 disabled:opacity-40 flex items-center gap-1.5">
          <Sparkles size={14} aria-hidden="true" />
          {lote ? `Refazendo ${lote.feitas + 1} de ${lote.total}...` : 'Refazer todos os mapas astrais'}
        </button>
      </div>

      {aviso && (
        <p role={aviso.tipo === 'erro' ? 'alert' : 'status'}
          className={`sticky top-2 z-10 bg-netzach-bg text-sm rounded-lg px-4 py-3 border shadow-lg ${
            aviso.tipo === 'erro' ? 'border-netzach-rose/40 text-netzach-rose'
              : aviso.tipo === 'info' ? 'border-netzach-border text-netzach-text'
              : 'border-netzach-gold/40 text-netzach-gold'}`}>
          {aviso.texto}
        </p>
      )}

      {carregando && <p className="text-netzach-muted animate-pulse text-sm">Sintonizando...</p>}

      <div className="bg-netzach-card rounded-xl overflow-hidden divide-y divide-netzach-border">
        {filtradas.map(aluna => {
          const estado = avaliarAssinatura(aluna);
          const rotulo = descreverAssinatura(aluna);
          const ehAdmin = aluna.role === 'admin';

          return (
            <div key={aluna.id} className="p-4 grid gap-3 lg:grid-cols-[1fr_auto] items-start">
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{aluna.full_name || 'Sem nome'}</p>
                <p className="text-xs text-netzach-muted truncate">
                  {aluna.whatsapp || 'sem WhatsApp'}{aluna.sign_sun ? ` • ${aluna.sign_sun}` : ''}
                </p>
                <p className="text-xs text-netzach-muted mt-0.5">
                  Entrou em {dataDeEntrada(aluna.created_at)}
                </p>
                <p className="text-xs text-netzach-muted mt-0.5">
                  {aluna.sign_moon && aluna.sign_rising
                    ? `Sol ${aluna.sign_sun ?? '?'} · Lua ${aluna.sign_moon} · Asc ${aluna.sign_rising}`
                    : <span className="text-netzach-rose/90">Mapa astral incompleto</span>}
                  {podeCalcular(aluna) && !ehAdmin && (
                    <button onClick={() => recalcularUma(aluna)} disabled={recalculando === aluna.id || lote !== null}
                      className="ml-2 underline underline-offset-2 hover:text-netzach-gold disabled:opacity-40">
                      {recalculando === aluna.id ? 'calculando...' : 'recalcular'}
                    </button>
                  )}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${
                    estado.bloqueada ? 'border-netzach-rose/50 text-netzach-rose'
                      : estado.gratuita ? 'border-netzach-border text-netzach-muted'
                      : 'border-netzach-gold/50 text-netzach-gold'
                  }`}>
                    {ehAdmin ? 'Admin' : rotulo}
                  </span>
                  {aluna.subscription_status && (
                    <span className="text-[11px] text-netzach-muted">status: {aluna.subscription_status}</span>
                  )}
                </div>

                {estado.gratuita && !ehAdmin && (
                  <p className="text-[11px] text-netzach-rose/90 flex items-start gap-1.5 mt-2 max-w-md leading-snug">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
                    Sem plano pago registrado: esta conta entra no portal mesmo com a data vencida.
                    Escolha o plano ao lado para o vencimento passar a valer.
                  </p>
                )}
              </div>

              {!ehAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-[10px] uppercase tracking-wider text-netzach-muted">
                    Plano
                    <select className={`${campo} block mt-1`} value={aluna.plan_type ?? ''}
                      onChange={e => salvar(aluna, { plan_type: e.target.value || undefined }, `plano alterado para ${e.target.selectedOptions[0].text}`)}>
                      {PLANOS.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                    </select>
                  </label>

                  <label className="text-[10px] uppercase tracking-wider text-netzach-muted">
                    Vence em
                    <input type="date" className={`${campo} block mt-1`}
                      value={formatarData(aluna.subscription_end_date)}
                      onChange={e => salvar(aluna, { subscription_end_date: e.target.value || undefined }, `vencimento em ${e.target.value || 'nenhum'}`)} />
                  </label>

                  <button onClick={() => alternarBloqueio(aluna)}
                    className={`mt-4 text-xs px-3 py-2 rounded-lg border flex items-center gap-1.5 ${
                      estado.bloqueada
                        ? 'border-netzach-gold/60 text-netzach-gold hover:bg-netzach-gold/10'
                        : 'border-netzach-border text-netzach-muted hover:border-netzach-rose/50 hover:text-netzach-rose'
                    }`}>
                    {estado.bloqueada
                      ? <><ShieldCheck size={14} aria-hidden="true" /> Liberar</>
                      : <><ShieldOff size={14} aria-hidden="true" /> Bloquear</>}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!carregando && filtradas.length === 0 && (
        <p className="text-sm text-netzach-muted text-center py-6">Nenhuma aluna encontrada.</p>
      )}
    </div>
  );
}
