/**
 * Prompts dos módulos de consulta.
 *
 * Antes cada página montava a instrução inteira no navegador e a
 * enviava como `message`, que a função usava crua. Qualquer usuária
 * podia trocar esse texto pelo DevTools e derrubar as duas regras
 * centrais do produto: responder apenas a partir da base e nunca
 * revelar ser uma IA.
 *
 * Agora o cliente manda só o que a usuária escreveu, e o texto de
 * instrução vive aqui.
 */

export interface ContextoUsuaria {
  nome?: string | null;
  signo_solar?: string | null;
  fase_ciclo?: string | null;
}

/**
 * O aviso que o documento do portal (§16) exige em toda orientação de
 * saúde, florais e óleos. Estava apenas no prompt de Florais, ou seja,
 * em um módulo de seis.
 */
const AVISO_SAUDE =
  'Termine com: "⚠️ Esta orientação é informativa e complementar. Consulte um profissional de saúde para acompanhamento personalizado."';

type Construtor = (entrada: string, ctx: ContextoUsuaria) => string;

const nomeOu = (ctx: ContextoUsuaria, padrao: string) => ctx.nome?.trim() || padrao;
const signoOu = (ctx: ContextoUsuaria) => ctx.signo_solar || 'não informado';

export const PROMPTS: Record<string, Construtor> = {
  banho_personalizado: (entrada, ctx) => `A usuária busca um banho personalizado para: "${entrada}".

Crie um banho completo e específico incluindo:
1. **Nome ritualístico do banho**
2. **Ervas e plantas** (3-5 ingredientes com quantidades aproximadas)
3. **Complementos** (sal, flores, óleos, cristais, escolha o que faz sentido para a intenção)
4. **Modo de preparo** (passo a passo)
5. **Como usar** (temperatura, momento do dia, duração)
6. **Intenção a segurar** durante o banho
7. **Afirmação** para recitar

Contexto da usuária:
- Signo solar: ${signoOu(ctx)}
- Fase do ciclo: ${ctx.fase_ciclo || 'não informada'}

${AVISO_SAUDE}

Use linguagem amorosa e mística. Seja específica e prática.`,

  florais: (entrada, ctx) => `A usuária está se sentindo: "${entrada}".

Recomende com sabedoria e amor:

1. **Floral de Bach**, nome do floral, para que serve, como usar (gotas, frequência, duração)
2. **Óleo Essencial**, nome, propriedades emocionais, modo de aplicação (inalação, difusor, pele)
3. **Como combinar**, floral + óleo juntos em uma rotina simples
4. **Afirmação de suporte**, uma frase para repetir durante o uso

Contexto: signo solar ${signoOu(ctx)}.

${AVISO_SAUDE}

Use linguagem acolhedora e mística.`,

  lei_atracao: (entrada, ctx) => `A usuária ${nomeOu(ctx, 'minha querida')} quer atrair: "${entrada}".

Crie um guia de lei da atração personalizado com:

1. **Afirmação poderosa**, em 1ª pessoa, tempo presente, máximo 2 frases
2. **Script de visualização**, guia de 3-4 parágrafos para 5 minutos de visualização (viva, sensorial, presente)
3. **Ação de ancoragem**, uma ação concreta e simbólica para fazer hoje
4. **Frequência recomendada**, quando e quantas vezes praticar
5. **Sinal de alinhamento**, como reconhecer que está no caminho certo

Signo solar: ${signoOu(ctx)}.

Use linguagem mística e inspiradora. Trate-a pelo nome se disponível.`,

  relacionamento: (entrada, ctx) => `A usuária ${nomeOu(ctx, '')} traz este tema amoroso: "${entrada}".

Escreva uma orientação sagrada de relacionamento com:

1. **Carta do amor**, uma mensagem direta ao coração dela sobre este tema (1-2 parágrafos, voz amorosa)
2. **Padrão a reconhecer**, um padrão sutil que pode estar presente (sem julgamento)
3. **Afirmação de amor próprio**, para repetir diariamente
4. **Ritual simbólico**, uma prática simples para esta semana (algo concreto e poético)
5. **Orientação desta fase**, baseada no signo solar ${signoOu(ctx)}

Use linguagem profunda, acolhedora e empoderada. Honre a soberania dela.`,


};

/** Módulos com prompt próprio. 'geral' é o chat livre da Sacerdotisa. */
export const MODULOS_VALIDOS = new Set([...Object.keys(PROMPTS), 'geral']);

/** Teto do que a usuária digita, para não virar vetor de custo. */
export const MAX_ENTRADA = 2_000;

export function montarPrompt(
  modulo: string,
  entrada: string,
  ctx: ContextoUsuaria
): string {
  const construtor = PROMPTS[modulo];
  return construtor ? construtor(entrada, ctx) : entrada;
}
