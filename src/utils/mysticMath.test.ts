import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSunSign, getMoonPhase, calculateCycleStatus } from './mysticMath';

/**
 * Estes cálculos alimentam o Templo, a mandala e o contexto que a
 * sacerdotisa recebe. Um erro aqui não quebra a tela: entrega a
 * orientação errada, que é pior.
 */

afterEach(() => { vi.useRealTimers(); });

describe('getSunSign', () => {
  it.each([
    ['1990-03-21', 'Áries'],
    ['1990-04-20', 'Áries'],
    ['1990-04-21', 'Touro'],
    ['1990-06-21', 'Câncer'],
    ['1990-08-23', 'Virgem'],
    ['1990-10-23', 'Escorpião'],
    ['1990-01-20', 'Capricórnio'],
    ['1990-01-21', 'Aquário'],
    ['1990-02-19', 'Peixes'],
  ])('%s é %s', (data, signo) => {
    expect(getSunSign(data)).toBe(signo);
  });

  it('data vazia não quebra', () => {
    expect(getSunSign('')).toBe('Desconhecido');
  });
});

describe('getMoonPhase', () => {
  it('devolve o dia da lunação, que a Mandala do Mês exibe', () => {
    // A tela mostrava "Dia undefined": o cálculo nunca retornava isto.
    const lua = getMoonPhase(new Date('2026-08-19T12:00:00Z'));
    expect(lua.dayOfCycle).toBeTypeOf('number');
    expect(lua.dayOfCycle).toBeGreaterThanOrEqual(1);
    expect(lua.dayOfCycle).toBeLessThanOrEqual(30);
  });

  it('reconhece a lua nova de referência', () => {
    expect(getMoonPhase(new Date('2000-01-06T18:14:00Z')).phase).toBe('Nova');
  });

  it('percorre as quatro fases ao longo de uma lunação', () => {
    const inicio = new Date('2000-01-06T18:14:00Z').getTime();
    const fases = new Set<string>();
    for (let dia = 0; dia < 30; dia++) {
      fases.add(getMoonPhase(new Date(inicio + dia * 86_400_000)).phase);
    }
    expect(fases).toEqual(new Set(['Nova', 'Crescente', 'Cheia', 'Minguante']));
  });

  it('sempre acompanha a fase de um rótulo', () => {
    const lua = getMoonPhase(new Date('2026-08-19T12:00:00Z'));
    expect(lua.label).toBeTruthy();
  });
});

describe('calculateCycleStatus', () => {
  it('identifica a fase menstrual nos primeiros dias', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00'));
    expect(calculateCycleStatus('2026-08-17')?.phaseName).toBe('Menstruação');
  });

  it('identifica a fase folicular', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00'));
    expect(calculateCycleStatus('2026-08-10')?.phaseName).toBe('Folicular');
  });

  it('identifica a fase ovulatória', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00'));
    expect(calculateCycleStatus('2026-08-05')?.phaseName).toBe('Ovulatória');
  });

  it('identifica a fase lútea', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00'));
    expect(calculateCycleStatus('2026-07-30')?.phaseName).toBe('Lútea');
  });

  it('avisa com acolhimento quando o ciclo atrasa, sem alarmar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00'));
    const status = calculateCycleStatus('2026-07-01');
    expect(status?.isLate).toBe(true);
    expect(status?.statusText).toMatch(/atrasada/i);
  });

  it('sem data de referência não inventa uma fase', () => {
    expect(calculateCycleStatus('')).toBeNull();
  });

  it('respeita a duração informada pela usuária', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00'));
    // Partindo de 25/07 e olhando de 19/08: um ciclo de 21 dias já
    // venceu (15/08), um de 35 ainda não (29/08).
    const curto = calculateCycleStatus('2026-07-25', 21);
    const longo = calculateCycleStatus('2026-07-25', 35);
    expect(curto?.isLate).toBe(true);
    expect(longo?.isLate).toBe(false);
  });
});
