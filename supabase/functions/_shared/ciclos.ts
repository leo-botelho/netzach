/**
 * Fase lunar e fase do ciclo, calculadas no servidor.
 *
 * Antes esses valores vinham no corpo da requisição, montados pelo
 * navegador. Portado de src/utils/mysticMath.ts, sem a dependência de
 * date-fns (que só era usada para formatar datas de exibição).
 */

const LUNAR_MONTH = 29.53058867;
// Lua nova de referência: 6 de janeiro de 2000, 18:14 UTC.
const NEW_MOON_REFERENCE = Date.UTC(2000, 0, 6, 18, 14, 0);

export function faseLunar(agora: Date = new Date()): string {
  const dias = (agora.getTime() - NEW_MOON_REFERENCE) / 86_400_000;
  const ciclos = dias / LUNAR_MONTH;
  const fase = ciclos - Math.floor(ciclos);

  if (fase >= 0.875 || fase < 0.125) return 'Nova';
  if (fase < 0.375) return 'Crescente';
  if (fase < 0.625) return 'Cheia';
  return 'Minguante';
}

export function faseDoCiclo(
  ultimaMenstruacao: string | null | undefined,
  duracao = 28
): string | null {
  if (!ultimaMenstruacao) return null;

  const inicio = new Date(ultimaMenstruacao);
  if (Number.isNaN(inicio.getTime())) return null;

  const dias = Math.floor((Date.now() - inicio.getTime()) / 86_400_000) + 1;

  // Ciclo muito atrasado ou data futura: não afirma uma fase.
  if (dias < 1 || dias > duracao * 2) return null;

  const dia = ((dias - 1) % duracao) + 1;
  if (dia <= 5) return 'Menstruação';
  if (dia <= 13) return 'Folicular';
  if (dia <= 17) return 'Ovulatória';
  return 'Lútea';
}

/**
 * Arcano central da Matriz do Destino.
 *
 * A sacerdotisa citava este número no chat ("O Arcano 10, a Roda da
 * Fortuna"), mas o cálculo vinha do navegador. Portado de
 * src/utils/calculationsMatriz.ts, onde é a soma das quatro pontas
 * cardeais reduzida a um arcano.
 */

const ARCANOS = [
  '', 'O Mago', 'A Sacerdotisa', 'A Imperatriz', 'O Imperador',
  'O Hierofante', 'Os Enamorados', 'O Carro', 'A Justiça', 'O Eremita',
  'A Roda da Fortuna', 'A Força', 'O Enforcado', 'A Morte', 'A Temperança',
  'O Diabo', 'A Torre', 'A Estrela', 'A Lua', 'O Sol',
  'O Julgamento', 'O Mundo', 'O Louco',
];

/** Reduz qualquer número a um arcano de 1 a 22. */
function reduzir(n: number): number {
  if (n === 0) return 22;
  let s = n;
  while (s > 22) {
    s = s.toString().split('').reduce((acc, d) => acc + Number(d), 0);
  }
  return s;
}

export function arcanoCentral(dataNascimento: string | null | undefined):
  { numero: number; nome: string } | null {

  if (!dataNascimento) return null;

  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento);
  if (!partes) return null;

  const [, ano, mes, dia] = partes;
  const somaAno = ano.split('').reduce((acc, d) => acc + Number(d), 0);

  const esquerda = reduzir(Number(dia));   // karma
  const topo     = reduzir(Number(mes));   // missão
  const direita  = reduzir(somaAno);       // imagem social
  const base     = reduzir(esquerda + topo + direita);

  const numero = reduzir(esquerda + topo + direita + base);
  return { numero, nome: ARCANOS[numero] ?? '' };
}
