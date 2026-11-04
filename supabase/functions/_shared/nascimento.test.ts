import { describe, it, expect } from 'vitest';
import { offsetNoHorarioLocal, nomeDaCidade } from './nascimento';

/**
 * O mapa astral saía errado para quem nasceu em horário de verão porque
 * a função mandava `timezone: -3` para todo mundo. Estes testes fixam o
 * deslocamento certo para esses casos e para as bordas do relógio.
 *
 * Os valores esperados foram conferidos por fora, direto no banco de
 * fusos do sistema, e não calculados pelo código testado.
 */

const SP = 'America/Sao_Paulo';

describe('offsetNoHorarioLocal: horário de verão do Brasil', () => {
  it('em pleno verão de 1990 o relógio de São Paulo estava em -2', () => {
    // O caso que a Raquel encontrou no N8N: nascida no verão, -3 fixo erra.
    expect(offsetNoHorarioLocal(SP, 1990, 1, 15, 12, 0)).toBe(-2);
  });

  it('no inverno do mesmo ano voltava a -3', () => {
    expect(offsetNoHorarioLocal(SP, 1990, 7, 15, 12, 0)).toBe(-3);
  });

  it('o último verão (2018/19) ainda era -2', () => {
    expect(offsetNoHorarioLocal(SP, 2018, 12, 1, 12, 0)).toBe(-2);
  });

  it('depois da extinção do horário de verão, tudo é -3', () => {
    expect(offsetNoHorarioLocal(SP, 2019, 12, 1, 12, 0)).toBe(-3);
    expect(offsetNoHorarioLocal(SP, 2024, 1, 15, 12, 0)).toBe(-3);
  });
});

describe('offsetNoHorarioLocal: as bordas do relógio', () => {
  it('horário repetido no fim do verão vale a primeira vez, a de verão', () => {
    // 17/02/2018: à meia-noite o relógio voltou para 23h, então 23:30 ocorreu duas vezes.
    expect(offsetNoHorarioLocal(SP, 2018, 2, 17, 23, 30)).toBe(-2);
  });

  it('o horário seguinte à volta já é -3', () => {
    expect(offsetNoHorarioLocal(SP, 2018, 2, 18, 0, 30)).toBe(-3);
  });

  it('horário que não existiu (início do verão) cai do lado do verão', () => {
    // 04/11/2018: o relógio pulou de 00:00 para 01:00, então 00:30 nunca existiu.
    expect(offsetNoHorarioLocal(SP, 2018, 11, 4, 0, 30)).toBe(-2);
  });

  it('um minuto antes do salto ainda é -3', () => {
    expect(offsetNoHorarioLocal(SP, 2018, 11, 3, 23, 59)).toBe(-3);
  });
});

describe('offsetNoHorarioLocal: outros fusos', () => {
  it('o Acre mudou de fuso em 2008 e voltou em 2013', () => {
    expect(offsetNoHorarioLocal('America/Rio_Branco', 2010, 6, 1, 12, 0)).toBe(-4);
    expect(offsetNoHorarioLocal('America/Rio_Branco', 2020, 6, 1, 12, 0)).toBe(-5);
  });

  it('Manaus é -4, sem horário de verão recente', () => {
    expect(offsetNoHorarioLocal('America/Manaus', 2020, 1, 15, 12, 0)).toBe(-4);
  });

  it('fusos com fração de hora', () => {
    expect(offsetNoHorarioLocal('Asia/Kolkata', 2000, 6, 1, 12, 0)).toBe(5.5);
    expect(offsetNoHorarioLocal('Asia/Kathmandu', 2000, 6, 1, 12, 0)).toBe(5.75);
  });

  it('Lisboa: 0 no inverno, 1 no verão', () => {
    expect(offsetNoHorarioLocal('Europe/Lisbon', 2020, 1, 15, 12, 0)).toBe(0);
    expect(offsetNoHorarioLocal('Europe/Lisbon', 2020, 7, 1, 12, 0)).toBe(1);
  });

  it('UTC dá 0, e não -0', () => {
    expect(Object.is(offsetNoHorarioLocal('UTC', 2020, 1, 1, 12, 0), 0)).toBe(true);
  });

  it('uma zona inexistente falha em vez de devolver um fuso qualquer', () => {
    expect(() => offsetNoHorarioLocal('Brasil/Nenhuma', 2020, 1, 1, 12, 0)).toThrow();
  });
});

describe('nomeDaCidade', () => {
  it('tira o estado do formato "Cidade - UF"', () => {
    expect(nomeDaCidade('Rio de Janeiro - RJ')).toBe('Rio de Janeiro');
    expect(nomeDaCidade('São Paulo – SP')).toBe('São Paulo');
  });

  it('mantém o hífen que faz parte do nome', () => {
    expect(nomeDaCidade('Ji-Paraná, RO, BR')).toBe('Ji-Paraná, RO, BR');
    expect(nomeDaCidade('Embu-Guaçu')).toBe('Embu-Guaçu');
    expect(nomeDaCidade('São João del-Rei - MG')).toBe('São João del-Rei');
  });

  it('o formato do cadastro passa inteiro', () => {
    expect(nomeDaCidade('Campinas, SP, BR')).toBe('Campinas, SP, BR');
  });

  it('tira espaços das pontas', () => {
    expect(nomeDaCidade('  Santos  ')).toBe('Santos');
  });
});
