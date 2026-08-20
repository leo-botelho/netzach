import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, getModuleLimit } from './planLimits';

/**
 * A diferença entre os três planos é a frequência de uso, não o
 * bloqueio de funcionalidades. Estes limites são a monetização.
 *
 * Quem decide de verdade é o servidor (module_limits + a função
 * consume_module_credit); aqui é só o que a tela mostra. Os dois
 * precisam contar a mesma história.
 */

const MODULOS = ['banho_personalizado', 'florais', 'lei_atracao', 'relacionamento'];

describe('limites por plano', () => {
  it('cobre os quatro módulos de consulta em todos os planos', () => {
    for (const plano of ['hecate', 'isis', 'lilith']) {
      expect(Object.keys(PLAN_LIMITS[plano]).sort()).toEqual([...MODULOS].sort());
    }
  });

  it.each(MODULOS)('Hécate tem 1 consulta por semana de %s', (modulo) => {
    expect(getModuleLimit('hecate', modulo)).toBe(1);
  });

  it.each(MODULOS)('Ísis tem 3 consultas por semana de %s', (modulo) => {
    // Decisão da fundadora em 19/08/2026: o documento se contradizia
    // entre a tabela da §4 (3x) e o cabeçalho da §6.14 (2x). Vale 3x.
    expect(getModuleLimit('isis', modulo)).toBe(3);
  });

  it.each(MODULOS)('Lilith é ilimitada em %s', (modulo) => {
    expect(getModuleLimit('lilith', modulo)).toBeNull();
  });

  it('a frequência cresce do plano mais simples ao mais completo', () => {
    for (const modulo of MODULOS) {
      const hecate = getModuleLimit('hecate', modulo)!;
      const isis = getModuleLimit('isis', modulo)!;
      expect(isis).toBeGreaterThan(hecate);
      expect(getModuleLimit('lilith', modulo)).toBeNull();
    }
  });

  it('módulos retirados do produto não têm mais limite', () => {
    // Ho'oponopono e Criança Interior saíram em 19/08/2026.
    expect(PLAN_LIMITS.hecate).not.toHaveProperty('hooponopono');
    expect(PLAN_LIMITS.isis).not.toHaveProperty('crianca_interior');
  });

  it('plano desconhecido não trava a tela', () => {
    // Ausência de limite significa ilimitado aqui; quem barra de fato
    // é o servidor, que recusa quem não tem plano.
    expect(getModuleLimit('inexistente', 'florais')).toBeNull();
  });

  it('módulo fora da tabela não trava a tela', () => {
    expect(getModuleLimit('hecate', 'modulo_que_nao_existe')).toBeNull();
  });
});
