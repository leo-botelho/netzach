import type { MatrizDestino, MatrizCircle } from '../types';

/**
 * Reduz qualquer número para um Arcano (1-22).
 * Números mestres 11 e 22 são preservados na primeira redução.
 */
const r = (num: number): number => {
  if (num === 0) return 22;
  if (num <= 22) return num;
  let s = num;
  while (s > 22) {
    s = s.toString().split('').reduce((acc, d) => acc + parseInt(d), 0);
  }
  return s;
};

const c = (arcano: number): MatrizCircle => ({ value: arcano, arcano });

const extrairData = (dateString: string) => {
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000;
  const d = new Date(date.getTime() + offset);

  const dia = d.getDate();
  const mes = d.getMonth() + 1;
  const ano = d.getFullYear();
  const somaAno = ano.toString().split('').reduce((acc, x) => acc + parseInt(x), 0);

  return { dia, mes, somaAno };
};

export const calcularMatrizDestino = (birthDate: string): MatrizDestino => {
  const { dia, mes, somaAno } = extrairData(birthDate);

  // ── 4 PONTAS CARDEAIS ──────────────────────────────────────────────
  // Toda operação usa o valor arcano (1-22) — nunca o número bruto.
  const D = r(dia);      // LEFT  — karma / passado
  const M = r(mes);      // TOP   — missão / dons e talentos
  const A = r(somaAno);  // RIGHT — imagem social / ano
  const B = r(D + M + A);// BOTTOM — propósito geral (redução de D+M+A)
  const CC = r(D + M + A + B); // CENTRO

  // ── EIXO CARDINAL: internos (menor = ponta+centro) e médios (ponta+menor) ──
  const tMen = r(M + CC);      // top inner
  const tInt = r(M + tMen);    // top middle

  const bMen = r(B + CC);      // bottom inner
  const bInt = r(B + bMen);    // bottom middle

  const eMen = r(D + CC);      // left inner
  const eInt = r(D + eMen);    // left middle

  const dMen = r(A + CC);      // right inner
  const dInt = r(A + dMen);    // right middle

  // ── 4 DIAGONAIS externas ──────────────────────────────────────────
  const seM = r(D + M);   // sup-esq outer  (linhagem masculina)
  const sdM = r(M + A);   // sup-dir outer  (linhagem feminina)
  const idM = r(A + B);   // inf-dir outer
  const ieM = r(B + D);   // inf-esq outer

  // ── DIAGONAIS internas e médias ───────────────────────────────────
  const seN = r(eMen + tMen);  // sup-esq inner
  const seI = r(seM + seN);    // sup-esq middle

  const sdN = r(tMen + dMen);  // sup-dir inner
  const sdI = r(sdM + sdN);    // sup-dir middle

  const idN = r(dMen + bMen);  // inf-dir inner
  const idI = r(idM + idN);    // inf-dir middle

  const ieN = r(bMen + eMen);  // inf-esq inner
  const ieI = r(ieM + ieN);    // inf-esq middle

  // ── CÍRCULOS VERDES CENTRAIS ──────────────────────────────────────
  const vTopo = r(CC + tMen);
  const vEsq  = r(CC + eMen);

  // ── CENTRO: médio (à direita) e menor (abaixo) ───────────────────
  const centroMedio = r(CC + tMen);  // mesmo que vTopo
  const centroMenor = r(CC + bMen);

  // ── LINHA PONTILHADA (dinheiro) ──────────────────────────────────
  const lpMeio = r(dMen + bMen);
  const linhaPont = {
    menorBase:        c(bMen),
    primeiroEsquerda: c(r(bMen + lpMeio)),
    meio:             c(lpMeio),
    primeiroDireita:  c(r(dMen + lpMeio)),
    menorDireita:     c(dMen),
  };

  // ── PROPÓSITOS ─────────────────────────────────────────────────────
  // Pessoal (até 40 anos): céu (M+B) + terra (D+A)
  const propCeu   = r(M + B);
  const propTerra = r(D + A);
  const propPessoalFinal = r(propCeu + propTerra);

  // Social (40-60 anos): diagonal masc (seM+idM) + fem (sdM+ieM)
  const propMasc = r(seM + idM);
  const propFem  = r(sdM + ieM);
  const propSocialFinal = r(propMasc + propFem);

  // Espiritual (>60) e Global
  const propEspiritual = r(propPessoalFinal + propSocialFinal);
  const propGlobal     = r(propEspiritual + propSocialFinal);

  // ── CHAKRAS ───────────────────────────────────────────────────────
  // Eixo esquerda (físico) × eixo topo (energia) → emoções = soma reduzida
  const chakras = {
    sahashara:    { fisico: D,    energia: M,    emocoes: r(D + M)       },
    ajna:         { fisico: eInt, energia: tInt, emocoes: r(eInt + tInt) },
    vishuddha:    { fisico: eMen, energia: tMen, emocoes: r(eMen + tMen) },
    anahata:      { fisico: vEsq, energia: vTopo,emocoes: r(vEsq + vTopo)},
    manipura:     { fisico: CC,   energia: CC,   emocoes: r(CC + CC)     },
    svadhishthana:{ fisico: dMen, energia: bMen, emocoes: r(dMen + bMen) },
    muladhara:    { fisico: A,    energia: B,    emocoes: r(A + B)       },
  };

  const resumoSaude = {
    fisico: r(
      chakras.sahashara.fisico + chakras.ajna.fisico + chakras.vishuddha.fisico +
      chakras.anahata.fisico   + chakras.manipura.fisico + chakras.svadhishthana.fisico +
      chakras.muladhara.fisico
    ),
    energetico: r(
      chakras.sahashara.energia + chakras.ajna.energia + chakras.vishuddha.energia +
      chakras.anahata.energia   + chakras.manipura.energia + chakras.svadhishthana.energia +
      chakras.muladhara.energia
    ),
    emocional: r(
      chakras.sahashara.emocoes + chakras.ajna.emocoes + chakras.vishuddha.emocoes +
      chakras.anahata.emocoes   + chakras.manipura.emocoes + chakras.svadhishthana.emocoes +
      chakras.muladhara.emocoes
    ),
  };

  // ── RETORNO ───────────────────────────────────────────────────────
  return {
    birthDate,

    central: {
      maior: c(CC),
      medio: c(centroMedio),
      menor: c(centroMenor),
    },

    topo:          { maior: c(M),    intermediario: c(tInt), menor: c(tMen) },
    base:          { maior: c(B),    intermediario: c(bInt), menor: c(bMen) },
    lateralEsquerda:{ maior: c(D),   intermediario: c(eInt), menor: c(eMen) },
    lateralDireita: { maior: c(A),   intermediario: c(dInt), menor: c(dMen) },

    circuloVerdeCentralTopo:     c(vTopo),
    circuloVerdeCentralEsquerda: c(vEsq),

    diagonalSuperiorEsquerda: { maior: c(seM), meio: c(seI), menor: c(seN) },
    diagonalSuperiorDireita:  { maior: c(sdM), meio: c(sdI), menor: c(sdN) },
    diagonalInferiorDireita:  { maior: c(idM), meio: c(idI), menor: c(idN) },
    diagonalInferiorEsquerda: { maior: c(ieM), meio: c(ieI), menor: c(ieN) },

    linhaPontilhada: linhaPont,

    chakras,
    resumoSaude,

    propositos: {
      pessoal:    { ceu: propCeu, terra: propTerra, final: propPessoalFinal },
      social:     { masculino: propMasc, feminino: propFem, final: propSocialFinal },
      espiritual: propEspiritual,
      global:     propGlobal,
    },
  };
};
