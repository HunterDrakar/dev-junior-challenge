import { describe, expect, it } from 'vitest';
import { formatarData, formatarHorario, formatarSenha } from './formato';

describe('formatarSenha', () => {
  it.each([
    [1, '001'],
    [42, '042'],
    [999, '999'],
    [1000, '1000'],
  ])('%i -> "%s"', (senha, esperado) => {
    expect(formatarSenha(senha)).toBe(esperado);
  });
});

describe('formatarHorario', () => {
  it('mostra no horário de Brasília', () => {
    expect(formatarHorario('2026-10-14T12:05:00Z')).toBe('09:05');
  });

  it('perto da meia-noite UTC continua no dia de Brasília', () => {
    expect(formatarHorario('2026-10-15T02:30:00Z')).toBe('23:30');
  });
});

describe('formatarData', () => {
  it('dia da semana, dia e mês no horário de Brasília', () => {
    expect(formatarData(new Date('2026-10-15T02:30:00Z'))).toBe(
      'quarta-feira, 14 de outubro',
    );
  });
});
