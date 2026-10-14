import { diaLocal } from './dia';

describe('diaLocal', () => {
  it('usa o dia de Brasília, não o de UTC', () => {
    // 2h30 UTC do dia 14 ainda é 23h30 do dia 13 em Brasília (UTC-3).
    expect(diaLocal(new Date('2026-10-14T02:30:00Z'))).toBe('2026-10-13');
  });

  it('vira o dia à meia-noite de Brasília', () => {
    expect(diaLocal(new Date('2026-10-14T02:59:59Z'))).toBe('2026-10-13');
    expect(diaLocal(new Date('2026-10-14T03:00:00Z'))).toBe('2026-10-14');
  });
});
