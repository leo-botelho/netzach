import { differenceInDays, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// 1. Calcular Signo Solar
export const getSunSign = (dateString: string): string => {
  if (!dateString) return "Desconhecido";
  
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;

  if ((month == 1 && day <= 20) || (month == 12 && day >= 22)) return "Capricórnio";
  if ((month == 1 && day >= 21) || (month == 2 && day <= 18)) return "Aquário";
  if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "Peixes";
  if ((month == 3 && day >= 21) || (month == 4 && day <= 20)) return "Áries";
  if ((month == 4 && day >= 21) || (month == 5 && day <= 20)) return "Touro";
  if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return "Gêmeos";
  if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return "Câncer";
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Leão";
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Virgem";
  if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return "Libra";
  if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return "Escorpião";
  if ((month == 11 && day >= 22) || (month == 12 && day >= 21)) return "Sagitário";
  
  return "Desconhecido";
};

// 2. Calcular Previsão do Ciclo
export const calculateCycleStatus = (lastPeriod: string, cycleDays = 28) => {
  if (!lastPeriod) return null;

  const today = new Date();
  const start = new Date(lastPeriod);
  
  // Data prevista da próxima
  const nextPeriod = addDays(start, cycleDays);
  const daysUntil = differenceInDays(nextPeriod, today);

  // Fase atual (Simplificada para exibição)
  const dayOfCycle = differenceInDays(today, start) + 1;
  let phaseName = 'Lútea'; 
  if (dayOfCycle <= 5) phaseName = 'Menstruação';
  else if (dayOfCycle <= 13) phaseName = 'Folicular';
  else if (dayOfCycle <= 17) phaseName = 'Ovulatória';

  let statusText = '';
  if (daysUntil === 0) statusText = 'Prevista para hoje';
  else if (daysUntil === 1) statusText = 'Prevista para amanhã';
  else if (daysUntil > 0) statusText = `Faltam ${daysUntil} dias`;
  else statusText = `Atrasada há ${Math.abs(daysUntil)} dias`;

  return {
    phaseName,
    dayOfCycle,
    nextPeriodDate: format(nextPeriod, "dd 'de' MMMM", { locale: ptBR }),
    statusText,
    isLate: daysUntil < 0
  };
};

// 3. Lua
export const getMoonPhase = (date: Date = new Date()) => {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  if (month < 3) { year--; month += 12; }
  ++month;
  let c = 365.25 * year;
  let e = 30.6 * month;
  let total = c + e + day - 694039.09;
  let cycle = total / 29.53;
  let phase = cycle - Math.floor(cycle);

  if (phase < 0.03 || phase > 0.97) return { phase: 'Nova', label: 'Sementes no Escuro' };
  if (phase < 0.25) return { phase: 'Crescente', label: 'Expansão e Ação' };
  if (phase < 0.53) return { phase: 'Cheia', label: 'Plenitude e Luz' };
  return { phase: 'Minguante', label: 'Limpeza e Desapego' };
};