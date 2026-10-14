import { describe, expect, it } from 'vitest';
import { formatarCpf, mascararCpf, somenteDigitos } from './cpf';

describe('somenteDigitos', () => {
  it('tira pontuação e letras', () => {
    expect(somenteDigitos('111.222.333-44')).toBe('11122233344');
    expect(somenteDigitos('abc 123')).toBe('123');
  });

  it('corta em 11 dígitos', () => {
    expect(somenteDigitos('123456789012345')).toBe('12345678901');
  });
});

describe('formatarCpf', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['123', '123'],
    ['1234', '123.4'],
    ['1234567', '123.456.7'],
    ['1234567890', '123.456.789-0'],
    ['12345678901', '123.456.789-01'],
  ])('formata "%s" enquanto a pessoa digita -> "%s"', (digitado, esperado) => {
    expect(formatarCpf(digitado)).toBe(esperado);
  });

  it('aceita texto já formatado ou colado com sujeira', () => {
    expect(formatarCpf('123.456.789-01')).toBe('123.456.789-01');
    expect(formatarCpf(' 123 456 789 01 ')).toBe('123.456.789-01');
  });
});

describe('mascararCpf', () => {
  it('esconde os 3 primeiros e os 2 últimos dígitos', () => {
    expect(mascararCpf('12345678901')).toBe('***.456.789-**');
  });
});
