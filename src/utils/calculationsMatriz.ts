import type { MatrizDestino, MatrizCircle } from '../types';

// Função para reduzir para Arcano (1-22)
const reduzirParaArcano = (num: number): number => {
  if (num === 0) return 22; // O Louco
  if (num <= 22) return num;
  
  // Para números acima de 22, soma os dígitos
  let soma = num;
  while (soma > 22) {
    soma = soma.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  }
  return soma;
};

// Cria o objeto do círculo com o valor original e o arcano correspondente
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
  
  const digitosAno = anoCompleto.toString().split('').map(d => parseInt(d));
  const somaAno = digitosAno.reduce((acc, d) => acc + d, 0);
  
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
  
  // 1. PONTAS PRINCIPAIS (Cardeais)
  const latEsqMaior = criarCirculo(dia);
  const topoMaior = criarCirculo(mes);
  const latDirMaior = criarCirculo(somaAno);
  const baseMaior = criarCirculo(somaTotalDigitos);

  // 2. CENTRO
  const centroValor = latEsqMaior.value + topoMaior.value + latDirMaior.value + baseMaior.value;
  const centralMaior = criarCirculo(centroValor);

  // 3. DIAGONAIS MAIORES (Externas)
  const diagSupEsqMaior = criarCirculo(latEsqMaior.value + topoMaior.value);
  const diagSupDirMaior = criarCirculo(topoMaior.value + latDirMaior.value);
  const diagInfDirMaior = criarCirculo(latDirMaior.value + baseMaior.value);
  const diagInfEsqMaior = criarCirculo(baseMaior.value + latEsqMaior.value);

  // 4. CÍRCULOS INTERMEDIÁRIOS
  const topoMenor = criarCirculo(topoMaior.value + centralMaior.value);
  const topoIntermediario = criarCirculo(topoMaior.value + topoMenor.value);

  const baseMenor = criarCirculo(baseMaior.value + centralMaior.value);
  const baseIntermediario = criarCirculo(baseMaior.value + baseMenor.value);

  const latEsqMenor = criarCirculo(latEsqMaior.value + centralMaior.value);
  const latEsqIntermediario = criarCirculo(latEsqMaior.value + latEsqMenor.value);

  const latDirMenor = criarCirculo(latDirMaior.value + centralMaior.value);
  const latDirIntermediario = criarCirculo(latDirMaior.value + latDirMenor.value);

  // 5. LINHA PONTILHADA
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

  // 7. CÍRCULOS VERDES
  const circuloVerdeCentralTopo = criarCirculo(centralMaior.value + topoMenor.value);
  const circuloVerdeCentralEsquerda = criarCirculo(centralMaior.value + latEsqMenor.value);

  // 8. CÁLCULO DAS DIAGONAIS COMPLETAS (AQUI ESTAVA O ERRO ANTES)
  // Agora estamos declarando as variáveis 'Menor' e 'Meio' antes de usar no objeto final

  // Diagonal Superior Esquerda
  const diagSupEsqMenor = criarCirculo(latEsqMenor.value + topoMenor.value);
  const diagSupEsqMeio = criarCirculo(diagSupEsqMaior.value + diagSupEsqMenor.value);
  
  // Diagonal Superior Direita
  const diagSupDirMenor = criarCirculo(topoMenor.value + latDirMenor.value);
  const diagSupDirMeio = criarCirculo(diagSupDirMaior.value + diagSupDirMenor.value);

  // Diagonal Inferior Esquerda
  const diagInfEsqMenor = criarCirculo(latEsqMenor.value + baseMenor.value);
  const diagInfEsqMeio = criarCirculo(diagInfEsqMaior.value + diagInfEsqMenor.value);

  // Diagonal Inferior Direita
  const diagInfDirMenor = criarCirculo(baseMenor.value + latDirMenor.value);
  const diagInfDirMeio = criarCirculo(diagInfDirMaior.value + diagInfDirMenor.value);

  // 9. CÁLCULO DOS CHAKRAS
  const sahashara = {
      fisico: latEsqMaior.arcano,
      energia: topoMaior.arcano,
      emocoes: reduzirParaArcano(latEsqMaior.value + topoMaior.value)
  };

  const ajna = {
      fisico: latEsqIntermediario.arcano,
      energia: topoIntermediario.arcano,
      emocoes: reduzirParaArcano(latEsqIntermediario.value + topoIntermediario.value)
  };

  const vishuddha = {
      fisico: latEsqMenor.arcano,
      energia: topoMenor.arcano,
      emocoes: reduzirParaArcano(latEsqMenor.value + topoMenor.value)
  };

  const anahata = {
      fisico: circuloVerdeCentralEsquerda.arcano,
      energia: circuloVerdeCentralTopo.arcano,
      emocoes: reduzirParaArcano(circuloVerdeCentralEsquerda.value + circuloVerdeCentralTopo.value)
  };

  const manipura = {
      fisico: centralMaior.arcano,
      energia: centralMaior.arcano, // Na matriz, o centro costuma repetir na energia do Manipura
      emocoes: reduzirParaArcano(centralMaior.value + centralMaior.value)
  };

  const svadhishthana = {
      fisico: latDirMenor.arcano,
      energia: baseMenor.arcano,
      emocoes: reduzirParaArcano(latDirMenor.value + baseMenor.value)
  };

  const muladhara = {
      fisico: latDirMaior.arcano,
      energia: baseMaior.arcano,
      emocoes: reduzirParaArcano(latDirMaior.value + baseMaior.value)
  };

  const chakras = { sahashara, ajna, vishuddha, anahata, manipura, svadhishthana, muladhara };
  
  const resumoSaude = {
    fisico: reduzirParaArcano(
        sahashara.fisico + ajna.fisico + vishuddha.fisico + anahata.fisico + 
        manipura.fisico + svadhishthana.fisico + muladhara.fisico
    ),
    energetico: reduzirParaArcano(
        sahashara.energia + ajna.energia + vishuddha.energia + anahata.energia + 
        manipura.energia + svadhishthana.energia + muladhara.energia
    ),
    emocional: reduzirParaArcano(
        sahashara.emocoes + ajna.emocoes + vishuddha.emocoes + anahata.emocoes + 
        manipura.emocoes + svadhishthana.emocoes + muladhara.emocoes
    )
  };

  // RETORNO FINAL
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
    
    // Agora usando as variáveis que calculamos no passo 8
    diagonalSuperiorEsquerda: { maior: diagSupEsqMaior, meio: diagSupEsqMeio, menor: diagSupEsqMenor },
    diagonalSuperiorDireita: { maior: diagSupDirMaior, meio: diagSupDirMeio, menor: diagSupDirMenor },
    diagonalInferiorEsquerda: { maior: diagInfEsqMaior, meio: diagInfEsqMeio, menor: diagInfEsqMenor },
    diagonalInferiorDireita: { maior: diagInfDirMaior, meio: diagInfDirMeio, menor: diagInfDirMenor },
    
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