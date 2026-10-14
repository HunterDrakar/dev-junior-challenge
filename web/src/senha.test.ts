import { describe, expect, it } from 'vitest';
import { formatarSenha } from './senha';

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
