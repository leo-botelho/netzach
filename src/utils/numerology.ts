// Tabela Pitagórica
const letterValues: Record<string, number> = {
  a: 1, j: 1, s: 1, 
  b: 2, k: 2, t: 2, 
  c: 3, l: 3, u: 3, 
  d: 4, m: 4, v: 4, 
  e: 5, n: 5, w: 5, 
  f: 6, o: 6, x: 6, 
  g: 7, p: 7, y: 7, 
  h: 8, q: 8, z: 8, 
  i: 9, r: 9
};

const vowels = ['a', 'e', 'i', 'o', 'u'];

// Função de Redução (Ex: 15 -> 1+5=6), mantendo Mestres (11, 22, 33)
const reduceNumber = (num: number): number => {
  if (num === 11 || num === 22 || num === 33) return num;
  
  while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
    num = num.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  }
  return num;
};

// 1. Número de Destino (Pela Data de Nascimento)
export const calculateDestinyNumber = (birthDate: string | undefined): number => {
  if (!birthDate) return 0;
  const cleanDate = birthDate.replace(/-/g, '');
  let sum = cleanDate.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  return reduceNumber(sum);
};

// 2. Números do Nome (Expressão, Alma, Personalidade)
export const calculateNameNumbers = (fullName: string | undefined) => {
  if (!fullName) return { expression: 0, soul: 0, personality: 0 };

  const cleanName = fullName
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, '');

  let sumVowels = 0;
  let sumConsonants = 0;

  cleanName.split('').forEach(char => {
    const val = letterValues[char] || 0;
    if (vowels.includes(char)) {
      sumVowels += val;
    } else {
      sumConsonants += val;
    }
  });

  return {
    soul: reduceNumber(sumVowels),
    personality: reduceNumber(sumConsonants),
    expression: reduceNumber(sumVowels + sumConsonants)
  };
};

// 3. Arcano Pessoal (Pela Data de Nascimento)
export const calculatePersonalArcana = (birthDate: string | undefined): number => {
  if (!birthDate) return 0;
  
  const cleanDate = birthDate.replace(/-/g, '');
  let sum = cleanDate.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  
  while (sum > 22 && sum !== 0) {
    sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  }
  
  return sum;
};