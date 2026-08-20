/**
 * Sistema de dicas contextuais (§7 do documento).
 *
 * Mensagens curtas entregues quando o sistema reconhece um padrão nos
 * dados que a usuária já registra. No máximo uma por dia, com
 * prioridade emocional > sono > corpo.
 *
 * O conteúdo é o do documento, escrito pela fundadora. Não passa pela
 * sacerdotisa: a regra de ouro do produto é que ela só fala a partir
 * da base de conhecimento, e uma dica que muda de texto a cada dia
 * seria caro e imprevisível. Aqui a voz é a mesma, sempre.
 */

export type Pilar = 'emocional' | 'sono' | 'corpo';

export interface Dica {
  /** Identificador do gatilho, guardado em contextual_tips. */
  chave: string;
  pilar: Pilar;
  /** Menor número aparece primeiro (§16: emocional > sono > corpo). */
  prioridade: number;
  titulo: string;
  /** Texto na voz da fundadora: segunda pessoa, nunca punitivo. */
  texto: string;
  /** Convite opcional para um módulo do portal. */
  convite?: { rotulo: string; rota: string };
}

/** Dados de um dia, do jeito que o check-in guarda. */
export interface DiaRegistrado {
  date: string;
  sleep_quality?: number | null;
  mood?: number | null;
  emotion?: number | null;
  mind?: number | null;
  energy?: number | null;
  /** Textos livres do check-in, onde a usuária conta como está. */
  textos?: string[];
  /** Chaves de hábitos marcados no dia. */
  habitos?: string[];
}

export interface ContextoDica {
  /** Do dia mais recente para o mais antigo. */
  dias: DiaRegistrado[];
  /** Fase atual do ciclo, quando conhecida. */
  faseCiclo?: string | null;
  /** Dia atual dentro do ciclo. */
  diaDoCiclo?: number | null;
  duracaoCiclo?: number | null;
}

/**
 * Palavras que a usuária usa quando está carregando algo pesado.
 * O documento cita "pesada" e "chorei" como exemplos.
 */
const PALAVRAS_DOR = [
  'pesada', 'pesado', 'chorei', 'chorando', 'choro', 'triste', 'tristeza',
  'sozinha', 'solidão', 'solidao', 'angústia', 'angustia', 'saudade',
  'magoada', 'machucada', 'exausta', 'cansada demais',
];

const PALAVRAS_ANSIEDADE = [
  'ansiosa', 'ansiedade', 'acelerada', 'agitada', 'nervosa', 'preocupada',
  'mente não para', 'mente nao para', 'sem parar', 'aflita', 'inquieta',
];

const PALAVRAS_DIGESTAO = [
  'inchada', 'inchaço', 'inchaco', 'digestão', 'digestao', 'estômago',
  'estomago', 'barriga', 'intestino', 'empachada', 'azia', 'má digestão',
];

const contem = (textos: string[] | undefined, palavras: string[]): boolean => {
  if (!textos?.length) return false;
  const junto = textos.join(' ').toLowerCase();
  return palavras.some(p => junto.includes(p));
};

/** Um valor baixo (1 ou 2) em pelo menos `quantos` dias seguidos. */
const baixoPorDiasSeguidos = (
  dias: DiaRegistrado[],
  campo: 'sleep_quality' | 'mood' | 'emotion' | 'mind',
  quantos: number
): boolean => {
  const comValor = dias.filter(d => typeof d[campo] === 'number' && d[campo]! > 0);
  if (comValor.length < quantos) return false;
  return comValor.slice(0, quantos).every(d => d[campo]! <= 2);
};

/**
 * Os gatilhos do documento, na ordem em que devem ser considerados.
 *
 * Duas adaptações em relação à tabela original, ambas por falta de
 * dado no app: "hidratação abaixo de 60% da meta" virou "hidratação
 * não marcada por dois dias", porque o app registra o hábito como sim
 * ou não, sem quantidade; e o convite ao Ho'oponopono saiu, porque o
 * módulo foi retirado do produto em 19/08/2026.
 */
export const GATILHOS: Array<{
  dica: Dica;
  detectar: (ctx: ContextoDica) => boolean;
}> = [
  // ── Emocional ────────────────────────────────────────────────
  {
    dica: {
      chave: 'dor_emocional',
      pilar: 'emocional',
      prioridade: 1,
      titulo: 'Vi que hoje pesou',
      texto: 'Tem dias em que o coração fica mais cheio do que cabe, e tudo bem. Um banho de rosa branca acolhe o que não tem nome ainda. Se puder, deixe a água levar devagar.',
      convite: { rotulo: 'Preparar um banho', rota: '/banho' },
    },
    detectar: ({ dias }) => contem(dias[0]?.textos, PALAVRAS_DOR),
  },
  {
    dica: {
      chave: 'humor_baixo',
      pilar: 'emocional',
      prioridade: 2,
      titulo: 'Seu coração parece precisar de sol',
      texto: 'Nem que sejam dez minutinhos de pés no chão: o aterramento faz milagres quando estamos pesadas. Óleo de laranja doce ou bergamota no difusor também levanta a manhã.',
      convite: { rotulo: 'Ver florais e óleos', rota: '/florais' },
    },
    detectar: ({ dias }) =>
      baixoPorDiasSeguidos(dias, 'mood', 2) || baixoPorDiasSeguidos(dias, 'emotion', 2),
  },
  {
    dica: {
      chave: 'ansiedade',
      pilar: 'emocional',
      prioridade: 3,
      titulo: 'Sua mente pede uma pausa',
      texto: 'Experimente a respiração 4-7-8: inspire contando até quatro, segure até sete, solte até oito. Três rodadas bastam. Chá de maracujá à noite e uma gota de vetiver nos pulsos ajudam a desacelerar.',
      convite: { rotulo: 'Diagnóstico de chakras', rota: '/chakras' },
    },
    detectar: ({ dias }) =>
      contem(dias[0]?.textos, PALAVRAS_ANSIEDADE) || baixoPorDiasSeguidos(dias, 'mind', 2),
  },

  // ── Sono ─────────────────────────────────────────────────────
  {
    dica: {
      chave: 'sono_ruim',
      pilar: 'sono',
      prioridade: 4,
      titulo: 'Notei que o seu sono não tem estado leve',
      texto: 'Às vezes o corpo pede silêncio antes que a gente perceba. Que tal uma gotinha de lavanda no travesseiro hoje à noite e desligar as telas uma hora antes? Pequenos rituais, grandes transformações.',
    },
    detectar: ({ dias }) => baixoPorDiasSeguidos(dias, 'sleep_quality', 2),
  },

  // ── Corpo ────────────────────────────────────────────────────
  {
    dica: {
      chave: 'tpm',
      pilar: 'corpo',
      prioridade: 5,
      titulo: 'Sua fase lútea está chegando',
      texto: 'É natural querer desacelerar agora, e você tem permissão para isso. Chá de folha de framboesa e uma gota de gerânio ajudam o corpo a atravessar esses dias com mais gentileza.',
      convite: { rotulo: 'Sagrado feminino', rota: '/sagrado-feminino' },
    },
    detectar: ({ faseCiclo, diaDoCiclo, duracaoCiclo }) => {
      if (faseCiclo === 'Lútea') return true;
      if (!diaDoCiclo || !duracaoCiclo) return false;
      // Os últimos cinco dias antes da próxima menstruação.
      return diaDoCiclo >= duracaoCiclo - 5 && diaDoCiclo <= duracaoCiclo;
    },
  },
  {
    dica: {
      chave: 'digestao',
      pilar: 'corpo',
      prioridade: 6,
      titulo: 'Seu corpo pediu leveza',
      texto: 'Chá de erva-doce ou gengibre depois das refeições faz diferença, e evitar água gelada durante a comida ajuda mais do que parece. Uma caminhada leve depois do almoço fecha o cuidado.',
    },
    detectar: ({ dias }) => contem(dias[0]?.textos, PALAVRAS_DIGESTAO),
  },
  {
    dica: {
      chave: 'sem_movimento',
      pilar: 'corpo',
      prioridade: 7,
      titulo: 'Que tal se mover um pouquinho hoje?',
      texto: 'Não precisa ser treino nem meia hora. Pés descalços no chão por cinco minutos já reconecta. Seu corpo adora quando você lembra dele.',
    },
    detectar: ({ dias }) =>
      dias.length >= 3 && dias.slice(0, 3).every(d => !d.habitos?.includes('caminhada')),
  },
  {
    dica: {
      chave: 'hidratacao',
      pilar: 'corpo',
      prioridade: 8,
      titulo: 'Um copo de água agora?',
      texto: 'Deixe sua garrafa à vista, que é quase mágica: o corpo lembra sozinho. E água morna com limão ao acordar desperta você inteira antes mesmo do café.',
    },
    detectar: ({ dias }) =>
      dias.length >= 2 && dias.slice(0, 2).every(d => !d.habitos?.includes('hidratacao')),
  },
];

/**
 * Escolhe a dica do dia.
 *
 * Devolve a de maior prioridade entre as que dispararam, ou null
 * quando não há padrão nenhum, que é o caso mais comum e desejável.
 */
export function escolherDica(ctx: ContextoDica): Dica | null {
  if (!ctx.dias.length) return null;

  const candidatas = GATILHOS
    .filter(g => {
      try { return g.detectar(ctx); }
      catch { return false; }
    })
    .map(g => g.dica)
    .sort((a, b) => a.prioridade - b.prioridade);

  return candidatas[0] ?? null;
}
