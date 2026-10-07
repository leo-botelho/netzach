import { describe, it, expect } from 'vitest';
import { avaliarAssinatura, descreverAssinatura, dataDeEntrada } from './assinatura';

/**
 * Casos reais de 06/10/2026: duas alunas com plano lilith e vencimento
 * vencido, que a Raquel precisava saber se estavam bloqueadas.
 */

const HOJE = new Date('2026-10-06T09:00:00-03:00');

describe('avaliarAssinatura', () => {
  it('bloqueia plano pago com vencimento no passado', () => {
    const e = avaliarAssinatura({
      plan_type: 'lilith',
      subscription_status: 'active',
      subscription_end_date: '2026-09-30 01:01:33.256623+00',
    }, HOJE);

    expect(e.bloqueada).toBe(true);
    expect(e.vencida).toBe(true);
    expect(e.motivo).toBe('vencida');
  });

  it('bloqueia também quando venceu anteontem', () => {
    const e = avaliarAssinatura({
      plan_type: 'lilith',
      subscription_status: 'active',
      subscription_end_date: '2026-10-03 12:24:53.123663+00',
    }, HOJE);

    expect(e.bloqueada).toBe(true);
  });

  it('o dia do vencimento ainda vale', () => {
    const e = avaliarAssinatura({
      plan_type: 'isis',
      subscription_status: 'active',
      subscription_end_date: '2026-10-06T23:59:00+00',
    }, HOJE);

    expect(e.bloqueada).toBe(false);
    expect(e.paga).toBe(true);
  });

  it('conta sem plano entra mesmo com data vencida', () => {
    const e = avaliarAssinatura({
      plan_type: null,
      subscription_status: 'active',
      subscription_end_date: '2020-01-01T00:00:00+00',
    }, HOJE);

    expect(e.gratuita).toBe(true);
    expect(e.bloqueada).toBe(false);
  });

  it.each(['inactive', 'overdue', 'cancelled'])('status %s bloqueia mesmo em dia', status => {
    const e = avaliarAssinatura({
      plan_type: 'lilith',
      subscription_status: status,
      subscription_end_date: '2027-01-01T00:00:00+00',
    }, HOJE);

    expect(e.bloqueada).toBe(true);
    expect(e.motivo).toBe('status');
  });

  it('plano pago, em dia e ativo, passa', () => {
    const e = avaliarAssinatura({
      plan_type: 'hecate',
      subscription_status: 'active',
      subscription_end_date: '2026-11-30T00:00:00+00',
    }, HOJE);

    expect(e).toEqual({ gratuita: false, paga: true, bloqueada: false, vencida: false, motivo: null });
  });

  it('plano pago sem data de vencimento continua liberado', () => {
    const e = avaliarAssinatura({
      plan_type: 'lilith', subscription_status: 'active', subscription_end_date: null,
    }, HOJE);

    expect(e.bloqueada).toBe(false);
  });
});

describe('descreverAssinatura', () => {
  it('dá o rótulo que o painel mostra', () => {
    expect(descreverAssinatura({ plan_type: 'lilith', subscription_status: 'active', subscription_end_date: '2026-09-30T00:00:00+00' })).toBe('Vencida');
    expect(descreverAssinatura({ plan_type: 'lilith', subscription_status: 'inactive' })).toBe('Bloqueada');
    expect(descreverAssinatura({ plan_type: 'lilith', subscription_status: 'active' })).toBe('Liberada');
    expect(descreverAssinatura({ plan_type: null })).toBe('Gratuita');
  });
});

describe('dataDeEntrada', () => {
  it('mostra dia/mês/ano', () => {
    expect(dataDeEntrada('2026-09-30T15:00:00+00')).toBe('30/09/2026');
  });

  it('usa o horário de Brasília: 01h UTC ainda é o dia anterior aqui', () => {
    // O caso real de 30/09/2026 às 01:01 UTC, que em Brasília era 29/09 à noite.
    expect(dataDeEntrada('2026-09-30 01:01:33.256623+00')).toBe('29/09/2026');
  });

  it('entende o formato que o app recebe e o que o SQL Editor mostra', () => {
    expect(dataDeEntrada('2026-10-03T12:24:53.123663+00:00')).toBe('03/10/2026');
    expect(dataDeEntrada('2026-10-03 12:24:53.123663+00')).toBe('03/10/2026');
    expect(dataDeEntrada('2026-10-03T12:24:53Z')).toBe('03/10/2026');
  });

  it('texto que não é data não vira "Invalid Date" na tela', () => {
    expect(dataDeEntrada('ontem')).toBe('data desconhecida');
  });

  it('avisa quando não há data, em vez de mostrar "Invalid Date"', () => {
    expect(dataDeEntrada(null)).toBe('data desconhecida');
    expect(dataDeEntrada(undefined)).toBe('data desconhecida');
  });
});
