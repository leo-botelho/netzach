// null = ilimitado, 0 = sem acesso (plano gratuito bloqueado antes de chegar aqui)
export const PLAN_LIMITS: Record<string, Record<string, number | null>> = {
  hecate: {
    banho_personalizado: 1,
    florais: 1,
    lei_atracao: 1,
    relacionamento: 1,
    hooponopono: 1,
    crianca_interior: 1,
  },
  isis: {
    banho_personalizado: 3,
    florais: 3,
    lei_atracao: 3,
    relacionamento: 3,
    hooponopono: 2,
    crianca_interior: 2,
  },
  lilith: {
    banho_personalizado: null,
    florais: null,
    lei_atracao: null,
    relacionamento: null,
    hooponopono: null,
    crianca_interior: null,
  },
};

export function getModuleLimit(planType: string, module: string): number | null {
  return PLAN_LIMITS[planType]?.[module] ?? null;
}
