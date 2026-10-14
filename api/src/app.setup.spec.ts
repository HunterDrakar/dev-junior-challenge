import { origensPermitidas } from './app.setup';

describe('origensPermitidas', () => {
  afterEach(() => {
    delete process.env.CORS_ORIGIN;
  });

  it('por padrão, só o front local', () => {
    expect(origensPermitidas()).toEqual(['http://localhost:5173']);
  });

  it('lê várias origens de CORS_ORIGIN, separadas por vírgula', () => {
    process.env.CORS_ORIGIN =
      'https://totem.hospital.example, https://recepcao.hospital.example';

    expect(origensPermitidas()).toEqual([
      'https://totem.hospital.example',
      'https://recepcao.hospital.example',
    ]);
  });
});
