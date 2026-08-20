import { describe, it, expect } from 'vitest';
import {
  simbolosDoTexto, contarSimbolos, contarEmocoes, faseQueMaisSonha,
  SIMBOLOS, type Sonho,
} from './simbolosOniricos';

/**
 * O módulo promete nomear o que se repete nos sonhos da usuária. Um
 * padrão anunciado por engano é pior do que padrão nenhum: ela vai
 * construir significado em cima do que o portal disser.
 */

const sonho = (over: Partial<Sonho> = {}): Sonho => ({
  date: '2026-08-19',
  dream_notes: 'sonho comum',
  ...over,
});

describe('reconhecimento de símbolos no relato', () => {
  it('reconhece água em várias formas', () => {
    for (const relato of ['nadei no mar', 'chovia muito', 'um rio enorme', 'estava me afogando']) {
      expect(simbolosDoTexto(relato).map(s => s.chave)).toContain('agua');
    }
  });

  it('reconhece mais de um símbolo no mesmo sonho', () => {
    const chaves = simbolosDoTexto('eu voava sobre o mar até uma casa de luz').map(s => s.chave);
    expect(chaves).toContain('voar');
    expect(chaves).toContain('agua');
    expect(chaves).toContain('casa');
    expect(chaves).toContain('luz');
  });

  it('não é sensível a maiúsculas', () => {
    expect(simbolosDoTexto('SONHEI COM FOGO').map(s => s.chave)).toContain('fogo');
  });

  it('relato sem símbolo conhecido não força nenhum', () => {
    expect(simbolosDoTexto('conversei com uma colega sobre trabalho')).toEqual([]);
  });

  it('não confunde palavras comuns com símbolos', () => {
    // "nada" quase virou símbolo de água por causa de um radical curto
    // demais. Frases banais não podem gerar padrão.
    for (const relato of [
      'não lembro de nada',
      'sonhei mas esqueci',
      'foi um sonho bom, sem detalhes',
    ]) {
      expect(simbolosDoTexto(relato)).toEqual([]);
    }
  });

  it('texto vazio não quebra', () => {
    expect(simbolosDoTexto('')).toEqual([]);
    expect(simbolosDoTexto('   ')).toEqual([]);
  });

  it('todo símbolo do dicionário tem nome, emoji e termos', () => {
    for (const s of SIMBOLOS) {
      expect(s.nome).toBeTruthy();
      expect(s.emoji).toBeTruthy();
      expect(s.termos.length).toBeGreaterThan(0);
    }
  });

  it('as chaves dos símbolos são únicas', () => {
    const chaves = SIMBOLOS.map(s => s.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe('contagem de padrões', () => {
  it('um símbolo visto uma vez só não vira padrão', () => {
    const resultado = contarSimbolos([sonho({ dream_notes: 'nadei no mar' })]);
    expect(resultado).toEqual([]);
  });

  it('duas aparições já formam padrão', () => {
    const resultado = contarSimbolos([
      sonho({ date: '2026-08-19', dream_notes: 'nadei no mar' }),
      sonho({ date: '2026-08-10', dream_notes: 'chovia sem parar' }),
    ]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].simbolo.chave).toBe('agua');
    expect(resultado[0].ocorrencias).toBe(2);
  });

  it('ordena do mais recorrente para o menos', () => {
    const resultado = contarSimbolos([
      sonho({ dream_notes: 'mar' }), sonho({ dream_notes: 'rio' }), sonho({ dream_notes: 'chuva' }),
      sonho({ dream_notes: 'voando' }), sonho({ dream_notes: 'voei alto' }),
    ]);
    expect(resultado[0].simbolo.chave).toBe('agua');
    expect(resultado[0].ocorrencias).toBe(3);
    expect(resultado[1].simbolo.chave).toBe('voar');
  });

  it('guarda as datas, da mais recente para a mais antiga', () => {
    const resultado = contarSimbolos([
      sonho({ date: '2026-07-01', dream_notes: 'mar' }),
      sonho({ date: '2026-08-15', dream_notes: 'rio' }),
    ]);
    expect(resultado[0].datas).toEqual(['2026-08-15', '2026-07-01']);
  });

  it('só afirma correlação com a lua quando ela se repete', () => {
    const comCorrelacao = contarSimbolos([
      sonho({ dream_notes: 'mar', dream_moon_phase: 'Cheia' }),
      sonho({ dream_notes: 'rio', dream_moon_phase: 'Cheia' }),
    ]);
    expect(comCorrelacao[0].faseLunarFrequente).toBe('Cheia');

    const semCorrelacao = contarSimbolos([
      sonho({ dream_notes: 'mar', dream_moon_phase: 'Cheia' }),
      sonho({ dream_notes: 'rio', dream_moon_phase: 'Nova' }),
    ]);
    expect(semCorrelacao[0].faseLunarFrequente).toBeUndefined();
  });

  it('lista vazia devolve lista vazia', () => {
    expect(contarSimbolos([])).toEqual([]);
  });
});

describe('emoções dos sonhos', () => {
  it('conta e ordena por frequência', () => {
    const resultado = contarEmocoes([
      sonho({ dream_emotion: 'medo' }),
      sonho({ dream_emotion: 'paz' }),
      sonho({ dream_emotion: 'medo' }),
    ]);
    expect(resultado[0]).toEqual({ emocao: 'medo', total: 2 });
  });

  it('ignora sonhos sem emoção registrada', () => {
    expect(contarEmocoes([sonho(), sonho()])).toEqual([]);
  });
});

describe('fase da lua em que mais sonha', () => {
  const comFase = (fase: string, quantos: number) =>
    Array.from({ length: quantos }, () => sonho({ dream_moon_phase: fase }));

  it('exige registro suficiente antes de afirmar qualquer coisa', () => {
    // Cinco sonhos não bastam: qualquer diferença aí é acaso.
    expect(faseQueMaisSonha(comFase('Cheia', 5))).toBeNull();
  });

  it('com seis ou mais, aponta a fase predominante', () => {
    const resultado = faseQueMaisSonha([...comFase('Cheia', 5), ...comFase('Nova', 2)]);
    expect(resultado).toEqual({ fase: 'Cheia', total: 5 });
  });

  it('empate não é padrão', () => {
    expect(faseQueMaisSonha([...comFase('Cheia', 4), ...comFase('Nova', 4)])).toBeNull();
  });

  it('sem fase registrada não afirma nada', () => {
    expect(faseQueMaisSonha(Array.from({ length: 10 }, () => sonho()))).toBeNull();
  });
});
