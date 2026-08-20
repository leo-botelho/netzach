import { describe, it, expect } from 'vitest';
import { gerarInsight, compararLunacoes, type DiaDaLunacao } from './insightLunacao';

/**
 * O insight afirma coisas sobre o mês que a usuária viveu. Errar aqui
 * não quebra a tela: conta uma história falsa sobre ela mesma, que é
 * pior — ela vai acreditar, porque são os dados dela.
 */

const FASES: DiaDaLunacao['fase'][] = ['Nova', 'Crescente', 'Cheia', 'Minguante'];

/** Lunação de 29 dias com valores padrão saudáveis. */
const lunacao = (ajustes: Partial<Record<number, Partial<DiaDaLunacao>>> = {}): DiaDaLunacao[] =>
  Array.from({ length: 29 }, (_, i) => {
    const diaLunar = i + 1;
    const fase = FASES[Math.min(3, Math.floor(i / 7.4))];
    return {
      diaLunar, fase,
      humor: 4, sono: 4, energia: 4, habitosCompletos: 3,
      ...(ajustes[diaLunar] ?? {}),
    };
  });

describe('gerarInsight', () => {
  it('não monta retrato com pouco registro', () => {
    // Três dias registrados dizem mais sobre o acaso do que sobre ela.
    const dias = lunacao();
    for (let i = 3; i < 29; i++) {
      dias[i] = { ...dias[i], humor: null, sono: null, habitosCompletos: 0 };
    }
    expect(gerarInsight(dias)).toBeNull();
  });

  it('devolve frases quando há registro suficiente', () => {
    const insight = gerarInsight(lunacao());
    expect(insight).not.toBeNull();
    expect(insight!.frases.length).toBeGreaterThan(0);
    expect(insight!.totalDias).toBe(29);
  });

  describe('humor', () => {
    it('nomeia o trecho em que o humor esteve baixo', () => {
      const insight = gerarInsight(lunacao({
        18: { humor: 2 }, 19: { humor: 1 }, 20: { humor: 2 }, 21: { humor: 2 },
      }));
      const frase = insight!.frases.find(f => f.includes('pesado'));
      expect(frase).toContain('18');
      expect(frase).toContain('21');
    });

    it('dois dias baixos não viram padrão', () => {
      const insight = gerarInsight(lunacao({ 10: { humor: 1 }, 11: { humor: 2 } }));
      expect(insight!.frases.some(f => f.includes('pesado'))).toBe(false);
    });

    it('menciona a fase do ciclo quando o trecho inteiro esteve nela', () => {
      const insight = gerarInsight(lunacao({
        22: { humor: 2, faseCiclo: 'Lútea' },
        23: { humor: 1, faseCiclo: 'Lútea' },
        24: { humor: 2, faseCiclo: 'Lútea' },
      }));
      expect(insight!.frases.find(f => f.includes('pesado'))).toContain('lútea');
    });

    it('não afirma fase do ciclo quando o trecho atravessa duas', () => {
      const insight = gerarInsight(lunacao({
        22: { humor: 2, faseCiclo: 'Lútea' },
        23: { humor: 1, faseCiclo: 'Lútea' },
        24: { humor: 2, faseCiclo: 'Menstruação' },
      }));
      const frase = insight!.frases.find(f => f.includes('pesado'))!;
      expect(frase).not.toMatch(/lútea|menstruação/i);
    });
  });

  describe('sono por fase da lua', () => {
    it('aponta a fase em que o sono foi melhor', () => {
      const ajustes: Partial<Record<number, Partial<DiaDaLunacao>>> = {};
      // Sono ruim fora da lua nova, bom nos primeiros dias.
      for (let d = 9; d <= 29; d++) ajustes[d] = { sono: 2 };
      const insight = gerarInsight(lunacao(ajustes));
      expect(insight!.frases.some(f => f.includes('sono') && f.includes('nova'))).toBe(true);
    });

    it('não aponta fase quando a diferença é pequena', () => {
      const insight = gerarInsight(lunacao({ 10: { sono: 3 }, 20: { sono: 4 } }));
      expect(insight!.frases.some(f => f.includes('sono'))).toBe(false);
    });
  });

  describe('hábitos', () => {
    it('conta os dias de cuidado sem julgar os que faltaram', () => {
      const ajustes: Partial<Record<number, Partial<DiaDaLunacao>>> = {};
      for (let d = 20; d <= 29; d++) ajustes[d] = { habitosCompletos: 0 };
      const insight = gerarInsight(lunacao(ajustes));
      const frase = insight!.frases.find(f => f.includes('cuidou'))!;
      expect(frase).toContain('19 dos 29');
      // O §11 não admite contar o que ela deixou de fazer.
      expect(frase).not.toMatch(/falhou|deixou|apenas|só/i);
    });
  });

  it('conta os sonhos quando há registro deles', () => {
    const insight = gerarInsight(lunacao({
      3: { temSonho: true }, 8: { temSonho: true }, 15: { temSonho: true },
    }));
    expect(insight!.frases.some(f => f.includes('3 sonhos'))).toBe(true);
  });

  it('não menciona sonhos com um ou dois registros', () => {
    const insight = gerarInsight(lunacao({ 3: { temSonho: true } }));
    expect(insight!.frases.some(f => f.includes('sonho'))).toBe(false);
  });

  describe('tom de voz (§11)', () => {
    it('nenhuma frase culpa ou usa travessão', () => {
      const insight = gerarInsight(lunacao({
        18: { humor: 1 }, 19: { humor: 1 }, 20: { humor: 2 },
        25: { habitosCompletos: 0 }, 26: { habitosCompletos: 0 },
      }))!;
      for (const frase of insight.frases) {
        expect(frase).not.toContain('—');
        expect(frase.toLowerCase()).not.toMatch(/você não|falhou|deveria|meta/);
      }
    });

    it('fala com ela, não sobre ela', () => {
      const insight = gerarInsight(lunacao())!;
      expect(insight.frases.join(' ').toLowerCase()).toMatch(/você|seu|sua/);
    });
  });
});

describe('compararLunacoes', () => {
  it('reconhece melhora perceptível', () => {
    const atual = lunacao();                                   // humor 4
    const anterior = lunacao(
      Object.fromEntries(Array.from({ length: 29 }, (_, i) => [i + 1, { humor: 2 }]))
    );
    const comp = compararLunacoes(atual, anterior);
    expect(comp.find(c => c.campo === 'humor')?.frase).toMatch(/melhor/i);
  });

  it('reconhece piora sem acusar', () => {
    const atual = lunacao(
      Object.fromEntries(Array.from({ length: 29 }, (_, i) => [i + 1, { humor: 2 }]))
    );
    const comp = compararLunacoes(atual, lunacao());
    const frase = comp.find(c => c.campo === 'humor')!.frase;
    expect(frase).toMatch(/mais cuidado/i);
    expect(frase.toLowerCase()).not.toMatch(/pior|caiu|piorou/);
  });

  it('variação pequena não vira notícia', () => {
    const atual = lunacao({ 5: { humor: 5 } });
    expect(compararLunacoes(atual, lunacao())).toEqual([]);
  });

  it('sem dado em uma das lunações não compara', () => {
    const vazia = lunacao(
      Object.fromEntries(Array.from({ length: 29 }, (_, i) => [i + 1, { humor: null, sono: null }]))
    );
    expect(compararLunacoes(lunacao(), vazia)).toEqual([]);
  });
});
