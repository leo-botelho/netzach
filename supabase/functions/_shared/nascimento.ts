/**
 * Conversões dos dados de nascimento para o cálculo do mapa astral.
 *
 * Puro de propósito (sem rede, sem Deno): é aqui que moram os erros que
 * fazem um mapa sair diferente do correto sem nenhum aviso, então tudo
 * aqui é coberto por teste.
 */

/**
 * O horário que o relógio marcava numa zona IANA, em horas decimais a
 * leste de Greenwich (-3, -2, 5.75...), no momento em que o relógio
 * local mostrava a data e hora dadas.
 *
 * Existe porque o fuso do Brasil mudou ao longo do tempo: nos verões de
 * 1985 a 2019 boa parte do país adiantava o relógio em uma hora, e quem
 * nasceu nesses períodos tem o horário de Greenwich uma hora diferente
 * do que `-3` fixo daria. Quem calcula com `-3` para todo mundo erra o
 * ascendente e a Lua dessas pessoas, às vezes o signo inteiro.
 *
 * Os dois casos de borda do relógio:
 *  - Horário repetido (o relógio volta de 00:00 para 23:00 no fim do
 *    verão): vale a primeira vez que ele ocorreu, a de horário de verão.
 *  - Horário que não existiu (o relógio pula de 00:00 para 01:00 no
 *    começo do verão): é empurrado para frente, como um relógio de
 *    parede faria.
 */
export function offsetNoHorarioLocal(
  zona: string,
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
): number {
  const parede = Date.UTC(ano, mes - 1, dia, hora, minuto);
  const DIA_MS = 86_400_000;

  // Os dois deslocamentos possíveis em volta do horário pedido: o de
  // antes e o de depois de uma eventual virada de horário de verão.
  const antes = offsetNoInstante(zona, parede - DIA_MS);
  const depois = offsetNoInstante(zona, parede + DIA_MS);

  const validos = [...new Set([antes, depois])].filter(
    o => offsetNoInstante(zona, parede - o) === o,
  );

  let escolhido: number;
  if (validos.length === 0) {
    // Horário que não existiu: usa o de antes da virada e deixa o
    // instante cair do outro lado dela.
    escolhido = offsetNoInstante(zona, parede - antes);
  } else {
    // Horário repetido, ou normal: o maior deslocamento é o da primeira
    // ocorrência (verão), e quando só há um, é ele.
    escolhido = Math.max(...validos);
  }

  return arredondar(escolhido / 3_600_000);
}

/** Deslocamento da zona, em milissegundos, num instante absoluto. */
function offsetNoInstante(zona: string, instanteMs: number): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(instanteMs));

  const n = (tipo: string) => Number(partes.find(p => p.type === tipo)?.value);
  const naParede = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));

  // O formatador só devolve segundos inteiros; tira os milissegundos do
  // instante de entrada para eles não entrarem na conta.
  return naParede - Math.floor(instanteMs / 1000) * 1000;
}

/** 5.7500000001 → 5.75. A API aceita fração (Índia é 5.5, Nepal 5.75). */
function arredondar(horas: number): number {
  // `+ 0` troca um -0 por 0, que uma comparação estrita distinguiria.
  return Math.round(horas * 100) / 100 + 0;
}

/**
 * Nome da cidade para a busca de coordenadas.
 *
 * Tira o estado de "Rio de Janeiro - RJ" (separador com espaços), mas
 * mantém o hífen que faz parte do nome: cortar em qualquer "-" geocodava
 * "Ji-Paraná" como "Ji", "Embu-Guaçu" como "Embu" e "São João del-Rei"
 * como "São João del", todas em lugares errados.
 *
 * O formato que o cadastro grava ("Campinas, SP, BR") já é bom para a
 * busca e passa inteiro.
 */
export function nomeDaCidade(bruto: string): string {
  return bruto.split(/\s+[-–—]\s+/)[0].trim();
}
