/**
 * Símbolos recorrentes do diário de sonhos (§9 do documento).
 *
 * A proposta do módulo é que a usuária "passe a associar sonhos com
 * acontecimentos e assim possa entender o que esses símbolos estão
 * trazendo". O portal nomeia o que se repete; o significado quem
 * constrói é ela, ao longo do tempo.
 *
 * O reconhecimento é por vocabulário, não por IA. Duas razões: a
 * sacerdotisa só fala a partir da base de conhecimento, e uma leitura
 * gerada a cada visita à tela custaria caro para dizer o que uma
 * contagem já diz melhor.
 */

export interface Simbolo {
  chave: string;
  nome: string;
  emoji: string;
  /** Formas como o símbolo costuma aparecer no relato. */
  termos: string[];
}

export const SIMBOLOS: Simbolo[] = [
  { chave: 'agua',        nome: 'Água',              emoji: '🌊', termos: ['água', 'agua', 'mar', 'rio', 'chov', 'chuva', 'oceano', 'lago', 'nadar', 'nadand', 'nadei', 'nadava', 'afog', 'inund', 'cachoeira', 'piscina', 'onda'] },
  { chave: 'voar',        nome: 'Voo',               emoji: '🕊️', termos: ['voar', 'voa', 'voei', 'voando', 'levit', 'flutu', 'planando'] },
  { chave: 'queda',       nome: 'Queda',             emoji: '🌀', termos: ['caindo', 'caí', 'cai de', 'despenc', 'queda', 'abismo', 'precipício', 'precipicio', 'desabando'] },
  { chave: 'perseguicao', nome: 'Perseguição',       emoji: '👣', termos: ['persegu', 'fugi', 'fugir', 'correndo de', 'escap', 'me alcanç', 'me alcanc'] },
  { chave: 'casa',        nome: 'Casa',              emoji: '🏠', termos: ['casa', 'quarto', 'cozinha', 'porta', 'janela', 'corredor', 'lar', 'morada'] },
  { chave: 'morte',       nome: 'Morte e passagem',  emoji: '🕯️', termos: ['morte', 'morrend', 'morreu', 'morri', 'funeral', 'enterro', 'caixão', 'caixao', 'cemitério', 'cemiterio', 'velório', 'velorio'] },
  { chave: 'bebe',        nome: 'Bebê e gestação',   emoji: '👶', termos: ['bebê', 'bebe', 'criança', 'crianca', 'grávid', 'gravid', 'gestaç', 'gestac', 'parto', 'nascimento', 'amament'] },
  { chave: 'animais',     nome: 'Animais',           emoji: '🐈', termos: ['gato', 'cachorro', 'cobra', 'serpente', 'pássaro', 'passaro', 'cavalo', 'lobo', 'aranha', 'borboleta', 'coruja', 'peixe'] },
  { chave: 'dentes',      nome: 'Dentes',            emoji: '🦷', termos: ['dente', 'dentes', 'caindo os dentes'] },
  { chave: 'pessoa_antiga', nome: 'Alguém do passado', emoji: '👤', termos: ['ex ', 'ex-', 'antigo namorado', 'antiga amiga', 'minha avó', 'minha avo', 'meu avô', 'meu avo', 'minha mãe', 'minha mae', 'meu pai', 'infância', 'infancia'] },
  { chave: 'viagem',      nome: 'Viagem e caminho',  emoji: '🧭', termos: ['viagem', 'viaj', 'estrada', 'caminho', 'ônibus', 'onibus', 'avião', 'aviao', 'trem', 'perdida', 'me perdi', 'mudança de casa'] },
  { chave: 'luz',         nome: 'Luz',               emoji: '✨', termos: ['luz', 'brilh', 'dourad', 'claridade', 'ilumin', 'raio de sol'] },
  { chave: 'escuridao',   nome: 'Escuridão',         emoji: '🌑', termos: ['escur', 'breu', 'sombra', 'noite escura', 'sem enxergar', 'apagou a luz'] },
  { chave: 'fogo',        nome: 'Fogo',              emoji: '🔥', termos: ['fogo', 'incêndio', 'incendio', 'queim', 'chamas', 'fogueira', 'vela acesa', 'brasa'] },
  { chave: 'espelho',     nome: 'Espelho',           emoji: '🪞', termos: ['espelho', 'reflexo', 'me vi'] },
];

export interface Sonho {
  date: string;
  dream_notes: string;
  dream_emotion?: string | null;
  dream_intensity?: string | null;
  dream_moon_phase?: string | null;
  dream_cycle_phase?: string | null;
}

export interface SimboloContado {
  simbolo: Simbolo;
  ocorrencias: number;
  /** Datas em que apareceu, da mais recente para a mais antiga. */
  datas: string[];
  /** Fase lunar em que mais aparece, quando há registro suficiente. */
  faseLunarFrequente?: string;
}

/** Símbolos presentes num único relato. */
export function simbolosDoTexto(texto: string): Simbolo[] {
  const limpo = (texto ?? '').toLowerCase();
  if (!limpo.trim()) return [];
  return SIMBOLOS.filter(s => s.termos.some(t => limpo.includes(t)));
}

/**
 * Conta os símbolos ao longo dos relatos e devolve os que se repetem.
 *
 * Só entram os que apareceram pelo menos `minimo` vezes: um símbolo
 * visto uma única vez não é um padrão, é um sonho.
 */
export function contarSimbolos(sonhos: Sonho[], minimo = 2): SimboloContado[] {
  const mapa = new Map<string, { simbolo: Simbolo; datas: string[]; luas: string[] }>();

  for (const sonho of sonhos) {
    for (const simbolo of simbolosDoTexto(sonho.dream_notes)) {
      const atual = mapa.get(simbolo.chave) ?? { simbolo, datas: [], luas: [] };
      atual.datas.push(sonho.date);
      if (sonho.dream_moon_phase) atual.luas.push(sonho.dream_moon_phase);
      mapa.set(simbolo.chave, atual);
    }
  }

  return [...mapa.values()]
    .filter(e => e.datas.length >= minimo)
    .map(e => {
      const contagem = new Map<string, number>();
      for (const lua of e.luas) contagem.set(lua, (contagem.get(lua) ?? 0) + 1);
      const maisComum = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];

      return {
        simbolo: e.simbolo,
        ocorrencias: e.datas.length,
        datas: [...e.datas].sort((a, b) => b.localeCompare(a)),
        // Só afirma a correlação quando ela realmente se destaca.
        faseLunarFrequente: maisComum && maisComum[1] >= 2 ? maisComum[0] : undefined,
      };
    })
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

/** Distribuição das emoções relatadas, da mais frequente para a menos. */
export function contarEmocoes(sonhos: Sonho[]): Array<{ emocao: string; total: number }> {
  const contagem = new Map<string, number>();
  for (const s of sonhos) {
    if (s.dream_emotion) contagem.set(s.dream_emotion, (contagem.get(s.dream_emotion) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([emocao, total]) => ({ emocao, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Em que fase da lua a usuária sonha mais.
 *
 * Precisa de pelo menos seis registros para dizer qualquer coisa: com
 * menos que isso, qualquer diferença é acaso.
 */
export function faseQueMaisSonha(sonhos: Sonho[]): { fase: string; total: number } | null {
  const comFase = sonhos.filter(s => s.dream_moon_phase);
  if (comFase.length < 6) return null;

  const contagem = new Map<string, number>();
  for (const s of comFase) {
    contagem.set(s.dream_moon_phase!, (contagem.get(s.dream_moon_phase!) ?? 0) + 1);
  }

  const ordenado = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  const [fase, total] = ordenado[0];

  // Empate não é padrão.
  if (ordenado.length > 1 && ordenado[1][1] === total) return null;
  return { fase, total };
}

export const EMOCOES_SONHO = [
  { chave: 'paz',       rotulo: 'Paz',       emoji: '🕊️' },
  { chave: 'alegria',   rotulo: 'Alegria',   emoji: '☀️' },
  { chave: 'medo',      rotulo: 'Medo',      emoji: '🌑' },
  { chave: 'ansiedade', rotulo: 'Ansiedade', emoji: '🌀' },
  { chave: 'tristeza',  rotulo: 'Tristeza',  emoji: '💧' },
  { chave: 'raiva',     rotulo: 'Raiva',     emoji: '🔥' },
  { chave: 'confusao',  rotulo: 'Confusão',  emoji: '🌫️' },
] as const;

export const INTENSIDADES = [
  { chave: 'leve',        rotulo: 'Leve' },
  { chave: 'marcante',    rotulo: 'Marcante' },
  { chave: 'perturbador', rotulo: 'Perturbador' },
] as const;
