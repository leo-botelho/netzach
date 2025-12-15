import type { MatrizDestino, MatrizCircle } from '../types';

// Reduz um número somando seus dígitos até ficar entre 1 e 22
const reduzir = (num: number): number => {
  if (num === 0) return 22;
  if (num <= 22) return num;
  const soma = num.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  return soma > 22 ? reduzir(soma) : soma;
};

// Cria um círculo com valor original e arcano reduzido
const criarCirculo = (valor: number): MatrizCircle => ({
  value: valor,
  arcano: reduzir(valor)
});

// CORREÇÃO AQUI: Extração segura da data sem alteração de fuso horário
const extrairData = (dateString: string) => {
  // dateString vem no formato "YYYY-MM-DD" do Supabase
  const parts = dateString.split('-');
  
  const ano = parseInt(parts[0]);
  const mes = parseInt(parts[1]);
  const dia = parseInt(parts[2]);
  
  // Soma de todos os dígitos da data (Dia + Mês + Ano)
  const todosDigitos = (dia.toString() + mes.toString() + ano.toString())
    .split('')
    .map(d => parseInt(d));
  const somaTotalDigitos = todosDigitos.reduce((acc, d) => acc + d, 0);
  
  // Soma dos dígitos do ano
  const digitosAno = ano.toString().split('').map(d => parseInt(d));
  const somaAno = digitosAno.reduce((acc, d) => acc + d, 0);
  
  return {
    dia,
    mes,
    ano,
    somaAno: reduzir(somaAno),
    somaTotalDigitos: reduzir(somaTotalDigitos)
  };
};

export const calcularMatrizDestino = (birthDate: string): MatrizDestino => {
  const { dia, mes, somaAno, somaTotalDigitos } = extrairData(birthDate);
  
  // 1. PONTAS PRINCIPAIS (Cardeais)
  const latEsqMaior = criarCirculo(dia); // Dia
  const topoMaior = criarCirculo(mes); // Mês
  const latDirMaior = criarCirculo(somaAno); // Ano
  const baseMaior = criarCirculo(somaTotalDigitos); // Soma Total

  // 2. CENTRO (Essência)
  const centroValor = latEsqMaior.arcano + topoMaior.arcano + latDirMaior.arcano + baseMaior.arcano;
  const centralMaior = criarCirculo(centroValor);

  // 3. DIAGONAIS (Ancestrais)
  const diagSupEsqMaior = criarCirculo(latEsqMaior.arcano + topoMaior.arcano);
  const diagSupDirMaior = criarCirculo(topoMaior.arcano + latDirMaior.arcano);
  const diagInfDirMaior = criarCirculo(latDirMaior.arcano + baseMaior.arcano);
  const diagInfEsqMaior = criarCirculo(baseMaior.arcano + latEsqMaior.arcano);

  // 4. CÍRCULOS INTERMEDIÁRIOS
  const topoMenor = criarCirculo(topoMaior.arcano + centralMaior.arcano);
  const topoIntermediario = criarCirculo(topoMaior.arcano + topoMenor.arcano);

  const baseMenor = criarCirculo(baseMaior.arcano + centralMaior.arcano);
  const baseIntermediario = criarCirculo(baseMaior.arcano + baseMenor.arcano);

  const latEsqMenor = criarCirculo(latEsqMaior.arcano + centralMaior.arcano);
  const latEsqIntermediario = criarCirculo(latEsqMaior.arcano + latEsqMenor.arcano);

  const latDirMenor = criarCirculo(latDirMaior.arcano + centralMaior.arcano);
  const latDirIntermediario = criarCirculo(latDirMaior.arcano + latDirMenor.arcano);

  // 5. LINHA PONTILHADA (Dinheiro e Amor)
  const linhaPontMeio = criarCirculo(latDirMenor.arcano + baseMenor.arcano);
  const linhaPontEsquerda = criarCirculo(baseMenor.arcano + linhaPontMeio.arcano);
  const linhaPontDireita = criarCirculo(latDirMenor.arcano + linhaPontMeio.arcano);
  
  // 6. PROPÓSITOS
  // Pessoal
  const propCeu = reduzir(topoMaior.arcano + baseMaior.arcano);
  const propTerra = reduzir(latEsqMaior.arcano + latDirMaior.arcano);
  const propPessoalFinal = reduzir(propCeu + propTerra);
  
  // Social
  const propMasc = reduzir(diagSupEsqMaior.arcano + diagInfDirMaior.arcano);
  const propFem = reduzir(diagSupDirMaior.arcano + diagInfEsqMaior.arcano);
  const propSocialFinal = reduzir(propMasc + propFem);
  
  // Espiritual
  const propEspiritual = reduzir(propPessoalFinal + propSocialFinal);
  const propGlobal = reduzir(propEspiritual + propSocialFinal);

  // 7. CÍRCULOS VERDES
  const circuloVerdeCentralTopo = criarCirculo(centralMaior.arcano + topoMenor.arcano);
  const circuloVerdeCentralEsquerda = criarCirculo(centralMaior.arcano + latEsqMenor.arcano);

  // 8. DIAGONAIS COMPLETAS
  // Superior Esquerda
  const diagSupEsqMenor = criarCirculo(latEsqMenor.arcano + topoMenor.arcano);
  const diagSupEsqMeio = criarCirculo(diagSupEsqMaior.arcano + diagSupEsqMenor.arcano);
  
  // Superior Direita
  const diagSupDirMenor = criarCirculo(topoMenor.arcano + latDirMenor.arcano);
  const diagSupDirMeio = criarCirculo(diagSupDirMaior.arcano + diagSupDirMenor.arcano);
  
  // Inferior Esquerda
  const diagInfEsqMenor = criarCirculo(latEsqMenor.arcano + baseMenor.arcano);
  const diagInfEsqMeio = criarCirculo(diagInfEsqMaior.arcano + diagInfEsqMenor.arcano);
  
  // Inferior Direita
  const diagInfDirMenor = criarCirculo(baseMenor.arcano + latDirMenor.arcano);
  const diagInfDirMeio = criarCirculo(diagInfDirMaior.arcano + diagInfDirMenor.arcano);

  // Retorno
  return {
    birthDate,
    central: {
      maior: centralMaior,
      medio: criarCirculo(centralMaior.arcano + topoMenor.arcano),
      menor: criarCirculo(centralMaior.arcano + baseMenor.arcano)
    },
    base: { maior: baseMaior, intermediario: baseIntermediario, menor: baseMenor },
    topo: { maior: topoMaior, intermediario: topoIntermediario, menor: topoMenor },
    lateralDireita: { maior: latDirMaior, intermediario: latDirIntermediario, menor: latDirMenor },
    lateralEsquerda: { maior: latEsqMaior, intermediario: latEsqIntermediario, menor: latEsqMenor },
    
    circuloVerdeCentralTopo,
    circuloVerdeCentralEsquerda,
    
    diagonalSuperiorEsquerda: { maior: diagSupEsqMaior, meio: diagSupEsqMeio, menor: diagSupEsqMenor },
    diagonalSuperiorDireita: { maior: diagSupDirMaior, meio: diagSupDirMeio, menor: diagSupDirMenor },
    diagonalInferiorEsquerda: { maior: diagInfEsqMaior, meio: diagInfEsqMeio, menor: diagInfEsqMenor },
    diagonalInferiorDireita: { maior: diagInfDirMaior, meio: diagInfDirMeio, menor: diagInfDirMenor },
    
    linhaPontilhada: {
      menorBase: baseMenor,
      primeiroEsquerda: linhaPontEsquerda,
      meio: linhaPontMeio,
      primeiroDireita: linhaPontDireita,
      menorDireita: latDirMenor
    },
    
    chakras: { 
        sahashara: { fisico: 0, energia: 0, emocoes: 0 },
        ajna: { fisico: 0, energia: 0, emocoes: 0 },
        vishuddha: { fisico: 0, energia: 0, emocoes: 0 },
        anahata: { fisico: 0, energia: 0, emocoes: 0 },
        manipura: { fisico: 0, energia: 0, emocoes: 0 },
        svadhishthana: { fisico: 0, energia: 0, emocoes: 0 },
        muladhara: { fisico: 0, energia: 0, emocoes: 0 }
    },
    resumoSaude: { fisico: 0, energetico: 0, emocional: 0 },
    
    propositos: {
      pessoal: { ceu: propCeu, terra: propTerra, final: propPessoalFinal },
      social: { masculino: propMasc, feminino: propFem, final: propSocialFinal },
      espiritual: propEspiritual,
      global: propGlobal
    }
  };
};