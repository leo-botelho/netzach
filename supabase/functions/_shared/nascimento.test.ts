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

import { separarCidade, escolherResultado } from './nascimento';

describe('separarCidade', () => {
  it('lê o formato do cadastro', () => {
    expect(separarCidade('Campinas, SP, BR')).toEqual({ nome: 'Campinas', uf: 'SP' });
    expect(separarCidade('Ji-Paraná, RO, BR')).toEqual({ nome: 'Ji-Paraná', uf: 'RO' });
  });

  it('lê o formato antigo com traço', () => {
    expect(separarCidade('Rio de Janeiro - RJ')).toEqual({ nome: 'Rio de Janeiro', uf: 'RJ' });
    expect(separarCidade('São João del-Rei – MG')).toEqual({ nome: 'São João del-Rei', uf: 'MG' });
  });

  it('sem estado, devolve só o nome', () => {
    expect(separarCidade('Santos')).toEqual({ nome: 'Santos', uf: null });
    expect(separarCidade('Lisboa, Portugal')).toEqual({ nome: 'Lisboa', uf: null });
  });

  it('BR não é estado', () => {
    expect(separarCidade('Franca, BR').uf).toBeNull();
  });
});

describe('escolherResultado', () => {
  const santaMaria = [
    { name: 'Santa Maria', admin1: 'Distrito Federal', latitude: -16.03, longitude: -48.03 },
    { name: 'Santa Maria', admin1: 'Rio Grande do Sul', latitude: -29.68, longitude: -53.81 },
    { name: 'Santa Maria', admin1: 'Sergipe', latitude: -9.72, longitude: -37.72 },
  ];

  it('escolhe a cidade homônima do estado certo, não a primeira da lista', () => {
    expect(escolherResultado(santaMaria, 'Santa Maria', 'RS')).toEqual({ lat: -29.68, lon: -53.81 });
    expect(escolherResultado(santaMaria, 'Santa Maria', 'SE')).toEqual({ lat: -9.72, lon: -37.72 });
  });

  it('sem estado, fica com o primeiro de mesmo nome', () => {
    expect(escolherResultado(santaMaria, 'Santa Maria', null)).toEqual({ lat: -16.03, lon: -48.03 });
  });

  it('ignora aeroportos e bairros misturados no resultado', () => {
    const rio = [
      { name: 'Aeroporto Internacional Rio de Janeiro-Galeão', admin1: 'Rio de Janeiro', latitude: -22.8, longitude: -43.23 },
      { name: 'Rio de Janeiro', admin1: 'Rio de Janeiro', latitude: -22.91, longitude: -43.18 },
    ];
    expect(escolherResultado(rio, 'Rio de Janeiro', 'RJ')).toEqual({ lat: -22.91, lon: -43.18 });
  });

  it('entende acento e hífen de forma diferente entre cadastro e base', () => {
    const ji = [{ name: 'Ji Paraná', admin1: 'Rondônia', latitude: -10.89, longitude: -61.95 }];
    expect(escolherResultado(ji, 'Ji-Paraná', 'RO')).toEqual({ lat: -10.89, lon: -61.95 });
  });

  it('cidade que existe só em outro estado não é aceita no lugar da certa', () => {
    expect(escolherResultado(santaMaria, 'Santa Maria', 'SP')).toBeNull();
  });

  it('sem resultados, devolve null', () => {
    expect(escolherResultado([], 'Qualquer', 'SP')).toBeNull();
  });
});
