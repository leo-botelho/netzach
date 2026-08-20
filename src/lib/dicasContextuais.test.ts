import { describe, it, expect } from 'vitest';
import { escolherDica, GATILHOS, type ContextoDica, type DiaRegistrado } from './dicasContextuais';

/**
 * A regra do documento (§7) é específica: no máximo uma dica por dia,
 * prioridade emocional > sono > corpo, e gatilhos com condições
 * numéricas exatas. Errar para mais é pior do que não entregar nada:
 * uma dica fora de hora quebra a confiança na voz do portal.
 */

const dia = (over: Partial<DiaRegistrado> = {}): DiaRegistrado => ({
  date: '2026-08-19',
  sleep_quality: 4,
  mood: 4,
  emotion: 4,
  mind: 4,
  energy: 4,
  textos: [],
  habitos: ['caminhada', 'hidratacao'],
  ...over,
});

const ctx = (dias: DiaRegistrado[], extra: Partial<ContextoDica> = {}): ContextoDica =>
  ({ dias, ...extra });

describe('gatilhos do documento', () => {
  it('dia comum não gera dica nenhuma', () => {
    expect(escolherDica(ctx([dia(), dia(), dia()]))).toBeNull();
  });

  it('sem registro nenhum não inventa dica', () => {
    expect(escolherDica(ctx([]))).toBeNull();
  });

  describe('sono ruim: qualidade ≤ 2 por dois dias seguidos', () => {
    it('dispara com dois dias ruins', () => {
      const d = escolherDica(ctx([dia({ sleep_quality: 2 }), dia({ sleep_quality: 1 })]));
      expect(d?.chave).toBe('sono_ruim');
    });

    it('não dispara com um dia só', () => {
      const d = escolherDica(ctx([dia({ sleep_quality: 1 }), dia({ sleep_quality: 4 })]));
      expect(d?.chave).not.toBe('sono_ruim');
    });

    it('não dispara com qualidade 3', () => {
      const d = escolherDica(ctx([dia({ sleep_quality: 3 }), dia({ sleep_quality: 3 })]));
      expect(d).toBeNull();
    });

    it('ignora dias sem resposta em vez de tratá-los como ruins', () => {
      const d = escolherDica(ctx([dia({ sleep_quality: 0 }), dia({ sleep_quality: 0 })]));
      expect(d).toBeNull();
    });
  });

  describe('humor baixo: nota ≤ 2 por dois dias consecutivos', () => {
    it('dispara pelo humor da noite', () => {
      const d = escolherDica(ctx([dia({ mood: 1 }), dia({ mood: 2 })]));
      expect(d?.chave).toBe('humor_baixo');
    });

    it('dispara também pela emoção da manhã', () => {
      const d = escolherDica(ctx([dia({ emotion: 2 }), dia({ emotion: 2 })]));
      expect(d?.chave).toBe('humor_baixo');
    });
  });

  describe('dor emocional: relatada no texto', () => {
    it('reconhece "chorei"', () => {
      const d = escolherDica(ctx([dia({ textos: ['chorei bastante hoje'] })]));
      expect(d?.chave).toBe('dor_emocional');
    });

    it('reconhece "pesada"', () => {
      const d = escolherDica(ctx([dia({ textos: ['me sinto pesada'] })]));
      expect(d?.chave).toBe('dor_emocional');
    });

    it('não confunde com relato positivo', () => {
      const d = escolherDica(ctx([dia({ textos: ['dia leve e bonito'] })]));
      expect(d).toBeNull();
    });
  });

  describe('ansiedade', () => {
    it('reconhece mente acelerada no texto', () => {
      const d = escolherDica(ctx([dia({ textos: ['minha mente não para'] })]));
      expect(d?.chave).toBe('ansiedade');
    });

    it('dispara por dois dias de mente agitada na escala', () => {
      const d = escolherDica(ctx([dia({ mind: 1 }), dia({ mind: 2 })]));
      expect(d?.chave).toBe('ansiedade');
    });
  });

  describe('corpo', () => {
    it('três dias sem movimento convidam a se mexer', () => {
      const semCaminhada = { habitos: ['hidratacao'] };
      const d = escolherDica(ctx([dia(semCaminhada), dia(semCaminhada), dia(semCaminhada)]));
      expect(d?.chave).toBe('sem_movimento');
    });

    it('dois dias bastam para o lembrete de água', () => {
      const semAgua = { habitos: ['caminhada'] };
      const d = escolherDica(ctx([dia(semAgua), dia(semAgua)]));
      expect(d?.chave).toBe('hidratacao');
    });

    it('fase lútea traz a dica de TPM', () => {
      const d = escolherDica(ctx([dia()], { faseCiclo: 'Lútea' }));
      expect(d?.chave).toBe('tpm');
    });

    it('os dias finais do ciclo também disparam a de TPM', () => {
      const d = escolherDica(ctx([dia()], { diaDoCiclo: 26, duracaoCiclo: 28 }));
      expect(d?.chave).toBe('tpm');
    });

    it('meio do ciclo não dispara TPM', () => {
      const d = escolherDica(ctx([dia()], { diaDoCiclo: 12, duracaoCiclo: 28 }));
      expect(d).toBeNull();
    });
  });
});

describe('prioridade: emocional > sono > corpo', () => {
  it('emocional vence sono quando os dois disparam', () => {
    const d = escolherDica(ctx([
      dia({ sleep_quality: 1, mood: 1, textos: ['chorei hoje'] }),
      dia({ sleep_quality: 1, mood: 1 }),
    ]));
    expect(d?.pilar).toBe('emocional');
  });

  it('sono vence corpo quando os dois disparam', () => {
    const semNada = { sleep_quality: 1, habitos: [] as string[] };
    const d = escolherDica(ctx([dia(semNada), dia(semNada), dia(semNada)]));
    expect(d?.pilar).toBe('sono');
  });

  it('entrega uma dica só, nunca uma lista', () => {
    const tudoRuim = {
      sleep_quality: 1, mood: 1, mind: 1,
      textos: ['chorei, estou ansiosa e inchada'],
      habitos: [] as string[],
    };
    const d = escolherDica(ctx([dia(tudoRuim), dia(tudoRuim), dia(tudoRuim)], { faseCiclo: 'Lútea' }));
    expect(d).not.toBeNull();
    expect(d?.chave).toBe('dor_emocional');
  });
});

describe('tom de voz (§11 do documento)', () => {
  const dicas = GATILHOS.map(g => g.dica);

  it.each(dicas.map(d => [d.chave, d] as const))('%s não culpa a usuária', (_chave, d) => {
    const texto = `${d.titulo} ${d.texto}`.toLowerCase();
    for (const proibido of ['você não', 'você falhou', 'você deveria', 'meta não', 'abaixo do esperado']) {
      expect(texto).not.toContain(proibido);
    }
  });

  it.each(dicas.map(d => [d.chave, d] as const))('%s fala na segunda pessoa', (_chave, d) => {
    expect(`${d.titulo} ${d.texto}`.toLowerCase()).toMatch(/você|seu|sua|se sent|te |lhe /);
  });

  it('nenhuma dica usa travessão, que a voz do portal não admite', () => {
    for (const d of dicas) {
      expect(d.texto).not.toContain('—');
      expect(d.titulo).not.toContain('—');
    }
  });

  it('os convites apontam para módulos que existem', () => {
    const rotasVivas = new Set([
      '/banho', '/florais', '/lei-atracao', '/relacionamento',
      '/chakras', '/lua', '/sagrado-feminino', '/mandala-lunar',
      '/roda-da-vida', '/numerologia', '/sacerdotisa', '/checkin',
    ]);
    for (const d of dicas) {
      if (d.convite) expect(rotasVivas).toContain(d.convite.rota);
    }
  });

  it('cada gatilho tem chave única', () => {
    const chaves = dicas.map(d => d.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});
