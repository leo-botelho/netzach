import { describe, it, expect } from 'vitest';
import {
  extrairIdYoutube, formatarDuracao, aulasEmOrdem, percentualConcluido,
  aulaParaContinuar, vizinhas, deveConcluir, gerarSlug, lerLinhasDeAulas, lerDuracao,
  type Aula, type ModuloComAulas, type Progresso,
} from './cursos';

const ID = 'dQw4w9WgXcQ';

describe('extrairIdYoutube', () => {
  it.each([
    [ID],
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s`],
    [`https://m.youtube.com/watch?feature=share&v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abcdef`],
    [`youtu.be/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}?rel=0`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/live/${ID}`],
    [`  https://youtu.be/${ID}  `],
  ])('reconhece %s', entrada => {
    expect(extrairIdYoutube(entrada)).toBe(ID);
  });

  it.each([
    [''],
    ['   '],
    ['não é um link'],
    ['https://vimeo.com/123456789'],
    ['https://www.youtube.com/'],
    ['https://www.youtube.com/watch?v=curto'],
    ['https://www.youtube.com/channel/UCabcdefghijk'],
    ['https://evil.com/watch?v=dQw4w9WgXcQ'],
  ])('recusa %j', entrada => {
    expect(extrairIdYoutube(entrada)).toBeNull();
  });
});

describe('formatarDuracao', () => {
  it('formata horas, minutos e segundos', () => {
    expect(formatarDuracao(3900)).toBe('1h 05min');
    expect(formatarDuracao(720)).toBe('12min');
    expect(formatarDuracao(45)).toBe('45s');
  });

  it('fica vazio sem duração', () => {
    expect(formatarDuracao(null)).toBe('');
    expect(formatarDuracao(0)).toBe('');
  });
});

const aula = (id: string, modulo_id: string, ordem: number): Aula => ({
  id, modulo_id, titulo: id, descricao: null, duracao_seg: 600, gratuita: false, ordem,
});

// Módulos e aulas fora de ordem de propósito: o banco não garante ordem.
const modulos: ModuloComAulas[] = [
  { id: 'm2', curso_id: 'c', titulo: 'M2', descricao: null, ordem: 2,
    aulas: [aula('a4', 'm2', 2), aula('a3', 'm2', 1)] },
  { id: 'm1', curso_id: 'c', titulo: 'M1', descricao: null, ordem: 1,
    aulas: [aula('a2', 'm1', 2), aula('a1', 'm1', 1)] },
];
const ordem = aulasEmOrdem(modulos);

const prog = (aula_id: string, posicao_seg: number, concluida = false): Progresso => ({
  aula_id, posicao_seg, concluida_em: concluida ? '2026-09-21T10:00:00Z' : null,
});

describe('aulasEmOrdem', () => {
  it('ordena por módulo e depois por aula', () => {
    expect(ordem.map(a => a.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
  });
});

describe('percentualConcluido', () => {
  it('conta só as concluídas', () => {
    expect(percentualConcluido(ordem, [prog('a1', 600, true), prog('a2', 100)])).toBe(25);
  });

  it('curso vazio é 0, não divisão por zero', () => {
    expect(percentualConcluido([], [])).toBe(0);
  });
});

describe('aulaParaContinuar', () => {
  it('começa pela primeira quando não há progresso', () => {
    expect(aulaParaContinuar(ordem, [])?.id).toBe('a1');
  });

  it('retoma a aula começada e não terminada', () => {
    expect(aulaParaContinuar(ordem, [prog('a1', 600, true), prog('a2', 200)])?.id).toBe('a2');
  });

  it('pula para a primeira não concluída quando nada está pela metade', () => {
    expect(aulaParaContinuar(ordem, [prog('a1', 600, true), prog('a2', 600, true)])?.id).toBe('a3');
  });

  it('entre duas começadas, fica com a mais adiante no curso', () => {
    expect(aulaParaContinuar(ordem, [prog('a3', 50), prog('a1', 30)])?.id).toBe('a3');
  });

  it('curso inteiro concluído volta ao início', () => {
    const tudo = ordem.map(a => prog(a.id, 600, true));
    expect(aulaParaContinuar(ordem, tudo)?.id).toBe('a1');
  });
});

describe('vizinhas', () => {
  it('atravessa a divisa entre módulos', () => {
    const { anterior, proxima } = vizinhas(ordem, 'a2');
    expect(anterior?.id).toBe('a1');
    expect(proxima?.id).toBe('a3');
  });

  it('primeira e última não têm vizinha de um lado', () => {
    expect(vizinhas(ordem, 'a1').anterior).toBeNull();
    expect(vizinhas(ordem, 'a4').proxima).toBeNull();
  });
});

describe('deveConcluir', () => {
  it('conclui a partir de 90%', () => {
    expect(deveConcluir(540, 600)).toBe(true);
    expect(deveConcluir(539, 600)).toBe(false);
  });

  it('não conclui sem duração conhecida', () => {
    expect(deveConcluir(100, 0)).toBe(false);
  });
});

describe('gerarSlug', () => {
  it('tira acento, pontuação e espaço', () => {
    expect(gerarSlug('Formação Flor da Vida — Módulo 1')).toBe('formacao-flor-da-vida-modulo-1');
  });

  it('bate com a regra do banco', () => {
    const slug = gerarSlug('  Ãrvore!!! da   Vida??  ');
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('não termina em hífen depois de cortar', () => {
    expect(gerarSlug(`${'a'.repeat(79)} b`)).not.toMatch(/-$/);
  });
});


describe('lerLinhasDeAulas', () => {
  it('lê título e link separados por barra, tab ou ponto e vírgula', () => {
    const { aulas, problemas } = lerLinhasDeAulas([
      `Abertura | https://youtu.be/${ID}`,
      `A semente\thttps://www.youtube.com/watch?v=${ID}`,
      `O ovo; ${ID}`,
    ].join('\n'));
    expect(problemas).toEqual([]);
    expect(aulas.map(a => a.titulo)).toEqual(['Abertura', 'A semente', 'O ovo']);
    expect(aulas.every(a => a.videoId === ID)).toBe(true);
  });

  it('ignora linhas em branco e aceita quebra de linha do Windows', () => {
    const { aulas } = lerLinhasDeAulas(`\r\nUm | ${ID}\r\n\r\nDois | ${ID}\r\n`);
    expect(aulas).toHaveLength(2);
  });

  it('aponta a linha com problema sem perder as boas', () => {
    const { aulas, problemas } = lerLinhasDeAulas([
      `Boa | ${ID}`,
      'Sem link nenhum',
      'Link errado | https://vimeo.com/123',
    ].join('\n'));
    expect(aulas).toHaveLength(1);
    expect(problemas.map(p => p.linha)).toEqual([2, 3]);
  });

  it('título com barra continua inteiro', () => {
    const { aulas } = lerLinhasDeAulas(`Módulo 1 | Aula 2 | ${ID}`);
    expect(aulas[0].titulo).toBe('Módulo 1 | Aula 2');
  });
});

describe('lerDuracao', () => {
  it('entende minutos, mm:ss e h:mm:ss', () => {
    expect(lerDuracao('12')).toBe(720);
    expect(lerDuracao('12:30')).toBe(750);
    expect(lerDuracao('1:02:30')).toBe(3750);
  });

  it('recusa o que não é duração', () => {
    expect(lerDuracao('')).toBeNull();
    expect(lerDuracao('doze')).toBeNull();
    expect(lerDuracao('12:75')).toBeNull();
  });
});
