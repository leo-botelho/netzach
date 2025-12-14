import type { MatrizDestino, MatrizCircle } from '../types';

// Função para reduzir apenas quando necessário (números mestres e arcanos)
const reduzirParaArcano = (num: number): number => {
  if (num === 0) return 22; // O Louco
  if (num <= 22) return num;

  // Para números acima de 22, usa módulo
  const resultado = num % 22;
  return resultado === 0 ? 22 : resultado;
};

const criarCirculo = (valor: number): MatrizCircle => ({
  value: valor,
  arcano: reduzirParaArcano(valor)
});

const extrairData = (dateString: string) => {
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);

  const dia = adjustedDate.getDate();
  const mes = adjustedDate.getMonth() + 1;
  const anoCompleto = adjustedDate.getFullYear();

  // Soma dos dígitos do ano
  const digitosAno = anoCompleto.toString().split('').map(d => parseInt(d));
  const somaAno = digitosAno.reduce((acc, d) => acc + d, 0);

  // Soma total de todos os dígitos da data
  const digitosTotal = (dia.toString() + mes.toString() + anoCompleto.toString()).split('').map(d => parseInt(d));
  const somaTotalDigitos = digitosTotal.reduce((acc, d) => acc + d, 0);

  return {
    dia,
    mes,
    somaAno,
    somaTotalDigitos
  };
};

export const calcularMatrizDestino = (birthDate: string): MatrizDestino => {
  const { dia, mes, somaAno, somaTotalDigitos } = extrairData(birthDate);

  // 1. PONTAS PRINCIPAIS (os 4 cantos da mandala)
  const latEsqMaior = criarCirculo(dia);
  const topoMaior = criarCirculo(mes);
  const latDirMaior = criarCirculo(somaAno);
  const baseMaior = criarCirculo(somaTotalDigitos);

  // 2. CENTRO (soma dos 4 cantos)
  const centroValor = latEsqMaior.value + topoMaior.value + latDirMaior.value + baseMaior.value;
  const centralMaior = criarCirculo(centroValor);

  // 3. DIAGONAIS MAIORES
  const diagSupEsqMaior = criarCirculo(latEsqMaior.value + topoMaior.value);
  const diagSupDirMaior = criarCirculo(topoMaior.value + latDirMaior.value);
  const diagInfDirMaior = criarCirculo(latDirMaior.value + baseMaior.value);
  const diagInfEsqMaior = criarCirculo(baseMaior.value + latEsqMaior.value);

  // 4. CÍRCULOS INTERMEDIÁRIOS (entre pontas e centro)
  const topoMenor = criarCirculo(topoMaior.value + centralMaior.value);
  const topoIntermediario = criarCirculo(topoMaior.value + topoMenor.value);

  const baseMenor = criarCirculo(baseMaior.value + centralMaior.value);
  const baseIntermediario = criarCirculo(baseMaior.value + baseMenor.value);

  const latEsqMenor = criarCirculo(latEsqMaior.value + centralMaior.value);
  const latEsqIntermediario = criarCirculo(latEsqMaior.value + latEsqMenor.value);

  const latDirMenor = criarCirculo(latDirMaior.value + centralMaior.value);
  const latDirIntermediario = criarCirculo(latDirMaior.value + latDirMenor.value);

  // 5. LINHA PONTILHADA (linha do dinheiro)
  const linhaPontMeio = criarCirculo(latDirMenor.value + baseMenor.value);

  const linhaPont = {
    menorBase: baseMenor,
    primeiroEsquerda: criarCirculo(baseMenor.value + linhaPontMeio.value),
    meio: linhaPontMeio,
    primeiroDireita: criarCirculo(latDirMenor.value + linhaPontMeio.value),
    menorDireita: latDirMenor
  };

  // 6. PROPÓSITOS
  const propCeu = reduzirParaArcano(topoMaior.value + baseMaior.value);
  const propTerra = reduzirParaArcano(latEsqMaior.value + latDirMaior.value);
  const propPessoalFinal = reduzirParaArcano(propCeu + propTerra);

  const propMasc = reduzirParaArcano(diagSupEsqMaior.value + diagInfDirMaior.value);
  const propFem = reduzirParaArcano(diagSupDirMaior.value + diagInfEsqMaior.value);
  const propSocialFinal = reduzirParaArcano(propMasc + propFem);

  const propEspiritual = reduzirParaArcano(propPessoalFinal + propSocialFinal);
  const propGlobal = reduzirParaArcano(propEspiritual + propSocialFinal);

  // 7. CÍRCULOS VERDES (entre centro e intermediários)
  const circuloVerdeCentralTopo = criarCirculo(centralMaior.value + topoMenor.value);
  const circuloVerdeCentralEsquerda = criarCirculo(centralMaior.value + latEsqMenor.value);

  // 8. DIAGONAIS COMPLETAS (maior, meio, menor)
  const diagonalSuperiorEsquerda = {
    maior: diagSupEsqMaior,
    menor: criarCirculo(latEsqMenor.value + topoMenor.value),
    meio: criarCirculo(diagSupEsqMaior.value + (latEsqMenor.value + topoMenor.value))
  };

  const diagonalSuperiorDireita = {
    maior: diagSupDirMaior,
    menor: criarCirculo(topoMenor.value + latDirMenor.value),
    meio: criarCirculo(diagSupDirMaior.value + (topoMenor.value + latDirMenor.value))
  };

  const diagonalInferiorEsquerda = {
    maior: diagInfEsqMaior,
    menor: criarCirculo(latEsqMenor.value + baseMenor.value),
    meio: criarCirculo(diagInfEsqMaior.value + (latEsqMenor.value + baseMenor.value))
  };

  const diagonalInferiorDireita = {
    maior: diagInfDirMaior,
    menor: criarCirculo(baseMenor.value + latDirMenor.value),
    meio: criarCirculo(diagInfDirMaior.value + (baseMenor.value + latDirMenor.value))
  };

  // Chakras (simplificado)
  const chakras = {
    sahashara: { fisico: 0, energia: 0, emocoes: 0 },
    ajna: { fisico: 0, energia: 0, emocoes: 0 },
    vishuddha: { fisico: 0, energia: 0, emocoes: 0 },
    anahata: { fisico: 0, energia: 0, emocoes: 0 },
    manipura: { fisico: 0, energia: 0, emocoes: 0 },
    svadhishthana: { fisico: 0, energia: 0, emocoes: 0 },
    muladhara: { fisico: 0, energia: 0, emocoes: 0 }
  };

  const resumoSaude = { fisico: 0, energetico: 0, emocional: 0 };

  return {
    birthDate,
    central: {
      maior: centralMaior,
      medio: criarCirculo(centralMaior.value + topoMenor.value),
      menor: criarCirculo(centralMaior.value + baseMenor.value)
    },
    base: { maior: baseMaior, intermediario: baseIntermediario, menor: baseMenor },
    topo: { maior: topoMaior, intermediario: topoIntermediario, menor: topoMenor },
    lateralDireita: { maior: latDirMaior, intermediario: latDirIntermediario, menor: latDirMenor },
    lateralEsquerda: { maior: latEsqMaior, intermediario: latEsqIntermediario, menor: latEsqMenor },

    circuloVerdeCentralTopo,
    circuloVerdeCentralEsquerda,

    diagonalSuperiorEsquerda,
    diagonalSuperiorDireita,
    diagonalInferiorEsquerda,
    diagonalInferiorDireita,

    linhaPontilhada: linhaPont,

    chakras,
    resumoSaude,

    propositos: {
      pessoal: { ceu: propCeu, terra: propTerra, final: propPessoalFinal },
      social: { masculino: propMasc, feminino: propFem, final: propSocialFinal },
      espiritual: propEspiritual,
      global: propGlobal
    }
  };
};