/**
 * A regra que decide quem entra no portal.
 *
 * Vivia dentro do hook `useSubscription`, invisível para o painel: a
 * Raquel via um check verde que mostrava só a coluna de status, sem
 * saber se a aluna estava de fato bloqueada. Agora app e painel
 * perguntam para a mesma função.
 */

export interface DadosDaAssinatura {
  plan_type?: string | null;
  subscription_status?: string | null;
  subscription_end_date?: string | null;
}

export type MotivoDoBloqueio = 'status' | 'vencida' | null;

export interface EstadoDaAssinatura {
  /** Conta sem plano pago. Entra no portal e nunca é bloqueada por data. */
  gratuita: boolean;
  paga: boolean;
  bloqueada: boolean;
  vencida: boolean;
  motivo: MotivoDoBloqueio;
}

const STATUS_QUE_BLOQUEIAM = new Set(['inactive', 'overdue', 'cancelled']);

/** Só a parte da data, para comparar vencimento com hoje. */
function soData(valor: string): string {
  return valor.slice(0, 10);
}

export function avaliarAssinatura(
  dados: DadosDaAssinatura,
  hoje: Date = new Date(),
): EstadoDaAssinatura {
  const plano = dados.plan_type ?? '';
  const status = dados.subscription_status ?? '';
  const vencimento = dados.subscription_end_date ?? null;

  // Sem plano registrado a conta é tratada como gratuita. É por isso que
  // uma aluna com vencimento no passado continuava entrando: faltava o
  // plano, não a data.
  const gratuita = !plano || plano === 'free';
  if (gratuita) {
    return { gratuita: true, paga: false, bloqueada: false, vencida: false, motivo: null };
  }

  const vencida = vencimento ? soData(vencimento) < soData(hoje.toISOString()) : false;
  const statusRuim = STATUS_QUE_BLOQUEIAM.has(status);

  return {
    gratuita: false,
    paga: status === 'active',
    bloqueada: statusRuim || vencida,
    vencida,
    // Status manual tem precedência na explicação: foi uma decisão de
    // alguém, não o relógio.
    motivo: statusRuim ? 'status' : vencida ? 'vencida' : null,
  };
}

/** Frase curta para o painel. */
export function descreverAssinatura(dados: DadosDaAssinatura): string {
  const e = avaliarAssinatura(dados);
  if (e.gratuita) return 'Gratuita';
  if (e.motivo === 'status') return 'Bloqueada';
  if (e.motivo === 'vencida') return 'Vencida';
  return 'Liberada';
}

/**
 * Quando a aluna entrou, em dia/mês/ano no horário de Brasília. O banco
 * guarda em UTC: uma conta criada às 23h de Brasília cairia no dia
 * seguinte se a data fosse cortada direto da string.
 */
export function dataDeEntrada(iso?: string | null): string {
  if (!iso) return 'data desconhecida';

  // O Postgres escreve "2026-09-30 01:01:33+00"; o JavaScript só entende
  // ISO completo ("T" no meio e fuso com minutos, "+00:00"). O Safari do
  // iPhone é ainda mais estrito que o Chrome, então normalizamos antes.
  const normalizada = iso.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const data = new Date(normalizada);
  if (Number.isNaN(data.getTime())) return 'data desconhecida';

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
  });
}
