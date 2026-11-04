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

// ───────────────────────────────────────────────────────────────
// Escolha da cidade quando a busca devolve várias
// ───────────────────────────────────────────────────────────────

const ESTADOS: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

/** Sem acento, minúscula, hífen como espaço: "Ji-Paraná" e "Ji Paraná" são a mesma. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Separa o nome da cidade e o estado, nos dois formatos que existem no
 * banco: "Campinas, SP, BR" (cadastro) e "Rio de Janeiro - RJ" (antigo).
 * O estado serve para escolher entre cidades de mesmo nome.
 */
export function separarCidade(bruto: string): { nome: string; uf: string | null } {
  const porVirgula = bruto.split(',').map(p => p.trim()).filter(Boolean);
  if (porVirgula.length > 1) {
    const uf = porVirgula.slice(1).map(p => p.toUpperCase()).find(p => p in ESTADOS) ?? null;
    return { nome: porVirgula[0], uf };
  }

  const comTraco = bruto.match(/^(.*?)\s+[-–—]\s*([A-Za-z]{2})\s*$/);
  if (comTraco && comTraco[2].toUpperCase() in ESTADOS) {
    return { nome: comTraco[1].trim(), uf: comTraco[2].toUpperCase() };
  }
  return { nome: bruto.trim(), uf: null };
}

export interface ResultadoDeBusca {
  name: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

/**
 * Entre os resultados de uma busca por nome, o certo: o de mesmo nome e,
 * havendo estado, o daquele estado. Os resultados vêm misturados com
 * aeroportos, bairros e cidades homônimas; pegar o primeiro daria
 * "Santa Maria" do Distrito Federal para quem nasceu em Santa Maria, RS.
 * Devolve null quando não há um resultado confiável.
 */
export function escolherResultado(
  resultados: ResultadoDeBusca[],
  nome: string,
  uf: string | null,
): { lat: number; lon: number } | null {
  const alvo = normalizar(nome);
  const estado = uf ? normalizar(ESTADOS[uf] ?? '') : null;

  const mesmoNome = resultados.filter(r => normalizar(r.name) === alvo);
  const doEstado = (r: ResultadoDeBusca) => !estado || normalizar(r.admin1 ?? '') === estado;

  const escolhido =
    mesmoNome.find(doEstado) ??
    // Sem estado conhecido, o primeiro de mesmo nome é o mais relevante.
    (estado ? undefined : mesmoNome[0]) ??
    // Nome com grafia levemente diferente na base ("Ji Paraná"), mas no estado certo.
    (estado ? resultados.find(r => doEstado(r) && !/aeroporto|airport/i.test(r.name)) : undefined);

  return escolhido ? { lat: escolhido.latitude, lon: escolhido.longitude } : null;
}
