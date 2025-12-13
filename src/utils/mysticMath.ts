import { differenceInDays } from 'date-fns';

// 1. Cálculo Simplificado da Lua (Algoritmo de Conway)
export const getMoonPhase = (date: Date = new Date()) => {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();

  if (month < 3) {
    year--;
    month += 12;
  }

  ++month;
  let c = 365.25 * year;
  let e = 30.6 * month;
  let total = c + e + day - 694039.09; // Total days elapsed
  let cycle = total / 29.53; // Divide by lunar cycle
  let phase = cycle - Math.floor(cycle); // Get the decimal part

  // Retorna a fase e um "Label" místico
  if (phase < 0.03 || phase > 0.97) return { phase: 'Nova', label: 'Sementes no Escuro', icon: 'new' };
  if (phase < 0.25) return { phase: 'Crescente', label: 'Expansão e Ação', icon: 'waxing' };
  if (phase < 0.53) return { phase: 'Cheia', label: 'Plenitude e Luz', icon: 'full' };
  return { phase: 'Minguante', label: 'Limpeza e Desapego', icon: 'waning' };
};

// 2. Cálculo do Ciclo Menstrual (Base 28 dias padrão)
export const getCyclePhase = (lastPeriod: string | null) => {
  if (!lastPeriod) return null;

  const today = new Date();
  const start = new Date(lastPeriod);
  
  // Diferença em dias
  const diff = differenceInDays(today, start);
  const dayOfCycle = (diff % 28) + 1; // Ciclo de 28 dias (ajustável futuramente)

  let phaseData = {
    name: '',
    season: '', // Estação Interna
    energy: '',
    day: dayOfCycle
  };

  if (dayOfCycle >= 1 && dayOfCycle <= 5) {
    phaseData.name = 'Menstruação';
    phaseData.season = 'Inverno Interno';
    phaseData.energy = 'Introspecção e Repouso';
  } else if (dayOfCycle >= 6 && dayOfCycle <= 13) {
    phaseData.name = 'Folicular';
    phaseData.season = 'Primavera Interna';
    phaseData.energy = 'Planejamento e Início';
  } else if (dayOfCycle >= 14 && dayOfCycle <= 17) {
    phaseData.name = 'Ovulatória';
    phaseData.season = 'Verão Interno';
    phaseData.energy = 'Comunicação e Magnetismo';
  } else {
    phaseData.name = 'Lútea';
    phaseData.season = 'Outono Interno';
    phaseData.energy = 'Análise e Finalização';
  }

  return phaseData;
};