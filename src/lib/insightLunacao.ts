/**
 * Insight automático ao fechar cada lunação (§8 do documento).
 *
 * O exemplo do documento é uma leitura dos dados, não uma
 * interpretação: "seu humor esteve mais pesado nos dias 18 a 24,
 * exatamente sua fase lútea, que coincidiu com a lua minguante. Seu
 * sono foi melhor nos 7 dias após a lua nova. Você completou o hábito
 * em 19 dos 29 dias."
 *
 * Por isso é calculado, não gerado: são fatos sobre o que ela mesma
 * registrou. Cada frase só aparece quando há dado que a sustente, e o
 * tom segue o §11 — nomeia sem julgar.
 */

export interface DiaDaLunacao {
  /** 1 a 29/30, contado a partir da lua nova. */
  diaLunar: number;
  fase: 'Nova' | 'Crescente' | 'Cheia' | 'Minguante';
  humor?: number | null;
  sono?: number | null;
  energia?: number | null;
  habitosCompletos?: number;
  faseCiclo?: string | null;
  temSonho?: boolean;
}

export interface InsightLunacao {
  /** Frases prontas, na ordem em que devem ser lidas. */
  frases: string[];
  /** Quantos dias tiveram algum registro. */
  diasComRegistro: number;
  /** Total de dias da lunação. */
  totalDias: number;
}

const NOME_FASE: Record<string, string> = {
  Nova: 'lua nova',
  Crescente: 'lua crescente',
  Cheia: 'lua cheia',
  Minguante: 'lua minguante',
};

/** Média de um campo, ignorando dias sem resposta. */
function media(dias: DiaDaLunacao[], campo: 'humor' | 'sono' | 'energia'): number | null {
  const valores = dias.map(d => d[campo]).filter((v): v is number => typeof v === 'number' && v > 0);
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/**
 * O trecho mais longo de dias seguidos em que o campo ficou baixo.
 * Devolve null quando não há sequência de pelo menos três dias: dois
 * dias ruins acontecem, e apontá-los como padrão seria forçar.
 */
function trechoBaixo(
  dias: DiaDaLunacao[],
  campo: 'humor' | 'sono'
): { inicio: number; fim: number } | null {
  let melhor: { inicio: number; fim: number } | null = null;
  let atual: { inicio: number; fim: number } | null = null;

  for (const dia of dias) {
    const v = dia[campo];
    const baixo = typeof v === 'number' && v > 0 && v <= 2;

    if (baixo) {
      atual = atual
        ? { inicio: atual.inicio, fim: dia.diaLunar }
        : { inicio: dia.diaLunar, fim: dia.diaLunar };
      const tamanho = atual.fim - atual.inicio + 1;
      const melhorTamanho = melhor ? melhor.fim - melhor.inicio + 1 : 0;
      if (tamanho > melhorTamanho) melhor = { ...atual };
    } else {
      atual = null;
    }
  }

  return melhor && melhor.fim - melhor.inicio + 1 >= 3 ? melhor : null;
}

/** Em qual fase lunar o campo teve a melhor média, se alguma se destaca. */
function melhorFase(
  dias: DiaDaLunacao[],
  campo: 'humor' | 'sono' | 'energia'
): { fase: string; media: number } | null {
  const porFase = new Map<string, DiaDaLunacao[]>();
  for (const d of dias) {
    porFase.set(d.fase, [...(porFase.get(d.fase) ?? []), d]);
  }

  const medias = [...porFase.entries()]
    .map(([fase, ds]) => ({ fase, media: media(ds, campo), amostra: ds.length }))
    // Uma fase com um ou dois registros não representa nada.
    .filter((m): m is { fase: string; media: number; amostra: number } =>
      m.media !== null && m.amostra >= 3)
    .sort((a, b) => b.media - a.media);

  if (medias.length < 2) return null;

  // Só vale como destaque se a diferença for perceptível.
  if (medias[0].media - medias[1].media < 0.5) return null;
  return { fase: medias[0].fase, media: medias[0].media };
}

/**
 * Monta o insight da lunação encerrada.
 *
 * Devolve null quando há pouco registro: um retrato feito de três dias
 * diria mais sobre o acaso do que sobre ela.
 */
export function gerarInsight(dias: DiaDaLunacao[], minimoDias = 7): InsightLunacao | null {
  const comRegistro = dias.filter(d =>
    (typeof d.humor === 'number' && d.humor > 0) ||
    (typeof d.sono === 'number' && d.sono > 0) ||
    (d.habitosCompletos ?? 0) > 0
  );

  if (comRegistro.length < minimoDias) return null;

  const frases: string[] = [];

  // ── Humor ───────────────────────────────────────────────────
  const trechoHumor = trechoBaixo(dias, 'humor');
  if (trechoHumor) {
    const noTrecho = dias.filter(d =>
      d.diaLunar >= trechoHumor.inicio && d.diaLunar <= trechoHumor.fim);

    const fases = [...new Set(noTrecho.map(d => d.fase))];
    const ciclos = [...new Set(noTrecho.map(d => d.faseCiclo).filter(Boolean))];

    let frase = `Seu humor esteve mais pesado entre os dias ${trechoHumor.inicio} e ${trechoHumor.fim} desta lunação`;
    if (fases.length === 1) frase += `, durante a ${NOME_FASE[fases[0]] ?? 'lua'}`;
    if (ciclos.length === 1) frase += `, quando você estava na fase ${String(ciclos[0]).toLowerCase()}`;
    frases.push(frase + '.');
  }

  // ── Sono ────────────────────────────────────────────────────
  const sonoPorFase = melhorFase(dias, 'sono');
  if (sonoPorFase) {
    frases.push(`Seu sono foi mais tranquilo durante a ${NOME_FASE[sonoPorFase.fase] ?? 'lua'}.`);
  }

  // ── Hábitos ─────────────────────────────────────────────────
  const diasComHabito = dias.filter(d => (d.habitosCompletos ?? 0) > 0).length;
  if (diasComHabito > 0) {
    frases.push(`Você cuidou de si em ${diasComHabito} dos ${dias.length} dias.`);
  }

  // ── Energia ─────────────────────────────────────────────────
  const energiaPorFase = melhorFase(dias, 'energia');
  if (energiaPorFase) {
    frases.push(`Sua energia esteve mais alta durante a ${NOME_FASE[energiaPorFase.fase] ?? 'lua'}.`);
  }

  // ── Sonhos ──────────────────────────────────────────────────
  const noitesComSonho = dias.filter(d => d.temSonho).length;
  if (noitesComSonho >= 3) {
    frases.push(`Você registrou ${noitesComSonho} sonhos nesta lunação.`);
  }

  // Sem nenhum padrão a nomear, não vale abrir a tela do insight.
  if (frases.length === 0) return null;

  return { frases, diasComRegistro: comRegistro.length, totalDias: dias.length };
}

export interface Comparativo {
  campo: 'humor' | 'sono';
  rotulo: string;
  diferenca: number;
  frase: string;
}

/**
 * Compara duas lunações (exclusivo do plano Lilith, §8).
 *
 * Só aponta o que mudou de forma perceptível: variação menor que meio
 * ponto na média é ruído, não movimento.
 */
export function compararLunacoes(
  atual: DiaDaLunacao[],
  anterior: DiaDaLunacao[]
): Comparativo[] {
  const campos: Array<{ campo: 'humor' | 'sono'; rotulo: string }> = [
    { campo: 'humor', rotulo: 'humor' },
    { campo: 'sono', rotulo: 'sono' },
  ];

  const saida: Comparativo[] = [];

  for (const { campo, rotulo } of campos) {
    const mediaAtual = media(atual, campo);
    const mediaAnterior = media(anterior, campo);
    if (mediaAtual === null || mediaAnterior === null) continue;

    const diferenca = mediaAtual - mediaAnterior;
    if (Math.abs(diferenca) < 0.5) continue;

    saida.push({
      campo,
      rotulo,
      diferenca,
      frase: diferenca > 0
        ? `Seu ${rotulo} esteve melhor nesta lunação do que na anterior.`
        : `Seu ${rotulo} pediu mais cuidado nesta lunação do que na anterior.`,
    });
  }

  return saida;
}
