// src/utils/matrizCalculations.ts

import type { MatrizDestino, MatrizCircle } from '../types';

// Reduz um número para entre 1 e 22
const reduzir = (num: number): number => {
  if (num <= 22) return num;
  const soma = num.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  return soma > 22 ? reduzir(soma) : soma;
};

// Cria um círculo com valor e arcano
const criarCirculo = (valor: number): MatrizCircle => ({
  value: valor,
  arcano: reduzir(valor)
});

// Extrai dia, mês e ano de uma data
const extrairData = (dateString: string) => {
  const date = new Date(dateString);
  const dia = date.getDate();
  const mes = date.getMonth() + 1;
  const ano = date.getFullYear();
  
  const digitos = (dia.toString() + mes.toString() + ano.toString())
    .split('')
    .map(d => parseInt(d));
  
  const somaTotalDigitos = digitos.reduce((acc, d) => acc + d, 0);
  const somaAno = ano.toString().split('').reduce((acc, d) => acc + parseInt(d), 0);
  
  return {
    dia,
    mes,
    ano,
    somaAno,
    somaTotalDigitos: reduzir(somaTotalDigitos)
  };
};

export const calcularMatrizDestino = (birthDate: string): MatrizDestino => {
  const { dia, mes, ano, somaAno, somaTotalDigitos } = extrairData(birthDate);
  
  // ========== SEQUÊNCIA CENTRAL (ESSÊNCIA) ==========
  const centralMaior = criarCirculo(somaTotalDigitos);
  
  // Calcular diagonais primeiro (necessário para o círculo médio central)
  const diagSupEsqMaior = criarCirculo(dia + somaTotalDigitos);
  const diagSupDirMaior = criarCirculo(somaAno + mes);
  const diagInfEsqMaior = criarCirculo(dia + somaTotalDigitos);
  const diagInfDirMaior = criarCirculo(somaAno + somaTotalDigitos);
  
  const centralMedio = criarCirculo(
    diagSupEsqMaior.arcano + diagSupDirMaior.arcano + 
    diagInfEsqMaior.arcano + diagInfDirMaior.arcano
  );
  
  const centralMenor = criarCirculo(centralMaior.arcano + centralMedio.arcano);
  
  // ========== SEQUÊNCIA DA BASE (ZONA CÁRMICA) ==========
  const baseMaior = criarCirculo(somaTotalDigitos);
  const baseMenor = criarCirculo(baseMaior.arcano + centralMaior.arcano);
  const baseIntermediario = criarCirculo(baseMaior.arcano + baseMenor.arcano);
  
  // ========== SEQUÊNCIA DO TOPO (DONS E TALENTOS) ==========
  const topoMaior = criarCirculo(mes);
  const topoMenor = criarCirculo(topoMaior.arcano + centralMaior.arcano);
  const topoIntermediario = criarCirculo(topoMaior.arcano + topoMenor.arcano);
  
  // ========== LATERAL DIREITA (CARMA MATERIAL) ==========
  const latDirMaior = criarCirculo(somaAno);
  const latDirMenor = criarCirculo(latDirMaior.arcano + centralMaior.arcano);
  const latDirIntermediario = criarCirculo(latDirMaior.arcano + latDirMenor.arcano);
  
  // ========== LATERAL ESQUERDA (CARMA PAIS/FILHOS) ==========
  const latEsqMaior = criarCirculo(dia);
  const latEsqMenor = criarCirculo(latEsqMaior.arcano + centralMaior.arcano);
  const latEsqIntermediario = criarCirculo(latEsqMaior.arcano + latEsqMenor.arcano);
  
  // ========== CÍRCULOS VERDES ==========
  const circuloVerdeCentralEsquerda = criarCirculo(centralMaior.arcano + latEsqMenor.arcano);
  const circuloVerdeCentralTopo = criarCirculo(centralMaior.arcano + topoMenor.arcano);
  
  // ========== DIAGONAIS SUPERIORES (DONS ANCESTRAIS) ==========
  // Diagonal Superior Esquerda (Linhagem Paterna)
  const diagSupEsq = {
    maior: diagSupEsqMaior,
    menor: criarCirculo(latEsqMenor.arcano + topoMenor.arcano),
    meio: criarCirculo(diagSupEsqMaior.arcano + criarCirculo(latEsqMenor.arcano + topoMenor.arcano).arcano)
  };
  
  // Diagonal Superior Direita (Linhagem Materna)
  const diagSupDir = {
    maior: diagSupDirMaior,
    menor: criarCirculo(topoMenor.arcano + latDirMenor.value),
    meio: criarCirculo(diagSupDirMaior.arcano + criarCirculo(topoMenor.arcano + latDirMenor.value).arcano)
  };
  
  // ========== DIAGONAIS INFERIORES (DÍVIDAS CÁRMICAS) ==========
  // Diagonal Inferior Esquerda (Bagagem Materna)
  const diagInfEsq = {
    maior: diagInfEsqMaior,
    menor: criarCirculo(latEsqMenor.arcano + baseMenor.arcano),
    meio: criarCirculo(diagInfEsqMaior.arcano + criarCirculo(latEsqMenor.arcano + baseMenor.arcano).arcano)
  };
  
  // Diagonal Inferior Direita (Bagagem Paterna)
  const diagInfDir = {
    maior: diagInfDirMaior,
    menor: criarCirculo(baseMenor.arcano + latDirMenor.arcano),
    meio: criarCirculo(diagInfDirMaior.arcano + criarCirculo(baseMenor.arcano + latDirMenor.arcano).arcano)
  };
  
  // ========== LINHA PONTILHADA ==========
  const linhaPontMeio = criarCirculo(baseMenor.arcano + latDirMenor.arcano);
  const linhaPont = {
    menorBase: baseMenor,
    primeiroEsquerda: criarCirculo(baseMenor.arcano + linhaPontMeio.arcano),
    meio: linhaPontMeio,
    primeiroDireita: criarCirculo(latDirMenor.arcano + linhaPontMeio.arcano),
    menorDireita: latDirMenor
  };
  
  // ========== CHAKRAS ==========
  const chakras = {
    sahashara: {
      fisico: latEsqMaior.arcano,
      energia: topoMaior.arcano,
      emocoes: reduzir(latEsqMaior.arcano + topoMaior.arcano)
    },
    ajna: {
      fisico: latEsqIntermediario.arcano,
      energia: topoIntermediario.arcano,
      emocoes: reduzir(latEsqIntermediario.arcano + topoIntermediario.arcano)
    },
    vishuddha: {
      fisico: latEsqMenor.arcano,
      energia: topoMenor.arcano,
      emocoes: reduzir(latEsqMenor.arcano + topoMenor.arcano)
    },
    anahata: {
      fisico: circuloVerdeCentralEsquerda.arcano,
      energia: circuloVerdeCentralTopo.arcano,
      emocoes: reduzir(circuloVerdeCentralEsquerda.arcano + circuloVerdeCentralTopo.arcano)
    },
    manipura: {
      fisico: centralMaior.arcano,
      energia: centralMaior.arcano,
      emocoes: reduzir(centralMaior.arcano + centralMaior.arcano)
    },
    svadhishthana: {
      fisico: latDirMenor.arcano,
      energia: baseMenor.arcano,
      emocoes: reduzir(latDirMenor.arcano + baseMenor.arcano)
    },
    muladhara: {
      fisico: latDirMaior.arcano,
      energia: baseMaior.arcano,
      emocoes: reduzir(latDirMaior.arcano + baseMaior.arcano)
    }
  };
  
  // ========== RESUMO DE SAÚDE ==========
  const somaFisico = Object.values(chakras).reduce((acc, ch) => acc + ch.fisico, 0);
  const somaEnergetico = Object.values(chakras).reduce((acc, ch) => acc + ch.energia, 0);
  const somaEmocional = Object.values(chakras).reduce((acc, ch) => acc + ch.emocoes, 0);
  
  const resumoSaude = {
    fisico: reduzir(somaFisico),
    energetico: reduzir(somaEnergetico),
    emocional: reduzir(somaEmocional)
  };
  
  // ========== PROPÓSITOS DE VIDA ==========
  const propPessoalCeu = reduzir(topoMaior.arcano + baseMaior.arcano);
  const propPessoalTerra = reduzir(latDirMaior.arcano + latEsqMaior.arcano);
  const propPessoalFinal = reduzir(propPessoalCeu + propPessoalTerra);
  
  const propSocialMasc = reduzir(diagSupEsq.maior.arcano + diagInfDir.maior.arcano);
  const propSocialFem = reduzir(diagSupDir.maior.arcano + diagInfEsq.maior.arcano);
  const propSocialFinal = reduzir(propSocialMasc + propSocialFem);
  
  const propEspiritual = reduzir(propPessoalFinal + propSocialFinal);
  const propGlobal = reduzir(propEspiritual + propSocialFinal);
  
  return {
    birthDate,
    central: {
      maior: centralMaior,
      medio: centralMedio,
      menor: centralMenor
    },
    base: {
      maior: baseMaior,
      intermediario: baseIntermediario,
      menor: baseMenor
    },
    topo: {
      maior: topoMaior,
      intermediario: topoIntermediario,
      menor: topoMenor
    },
    lateralDireita: {
      maior: latDirMaior,
      intermediario: latDirIntermediario,
      menor: latDirMenor
    },
    lateralEsquerda: {
      maior: latEsqMaior,
      intermediario: latEsqIntermediario,
      menor: latEsqMenor
    },
    circuloVerdeCentralTopo,
    circuloVerdeCentralEsquerda,
    diagonalSuperiorEsquerda: diagSupEsq,
    diagonalSuperiorDireita: diagSupDir,
    diagonalInferiorEsquerda: diagInfEsq,
    diagonalInferiorDireita: diagInfDir,
    linhaPontilhada: linhaPont,
    chakras,
    resumoSaude,
    propositos: {
      pessoal: {
        ceu: propPessoalCeu,
        terra: propPessoalTerra,
        final: propPessoalFinal
      },
      social: {
        masculino: propSocialMasc,
        feminino: propSocialFem,
        final: propSocialFinal
      },
      espiritual: propEspiritual,
      global: propGlobal
    }
  };
};