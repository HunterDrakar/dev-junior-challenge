import {
  BadGatewayException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CadastroService } from './cadastro.service';

const ANA = {
  cpf: '11111111111',
  nome: 'Ana Souza',
  dataNascimento: '1988-03-12',
};
const ok = (corpo: unknown = ANA) =>
  new Response(JSON.stringify(corpo), { status: 200 });
const status = (codigo: number) => new Response('', { status: codigo });
const erroDeRede = () => new TypeError('fetch failed');
const timeout = () =>
  new DOMException('The operation was aborted due to timeout', 'TimeoutError');

describe('CadastroService', () => {
  const fetchMock = jest.fn();
  let service: CadastroService;
  let avisos: jest.SpyInstance;
  let erros: jest.SpyInstance;

  beforeEach(() => {
    // Relógio falso: as esperas entre tentativas não atrasam os testes.
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'],
    });
    fetchMock.mockReset();
    global.fetch = fetchMock;
    service = new CadastroService();
    avisos = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    erros = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /** Chama o serviço e deixa as esperas entre tentativas passarem. */
  async function buscar(cpf = '11111111111') {
    const resultado = service.buscarPorCpf(cpf);
    resultado.catch(() => undefined); // evita aviso de rejeição antes do expect
    await jest.runAllTimersAsync();
    return resultado;
  }

  describe('respostas do cadastro', () => {
    it('200: devolve o paciente', async () => {
      fetchMock.mockResolvedValue(ok());

      await expect(buscar()).resolves.toEqual(ANA);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/pacientes/11111111111',
        { signal: expect.any(AbortSignal) as AbortSignal },
      );
    });

    it('200: remove espaços nas pontas do nome', async () => {
      fetchMock.mockResolvedValue(
        ok({ cpf: '11111111111', nome: '  Ana Souza ' }),
      );

      await expect(buscar()).resolves.toMatchObject({ nome: 'Ana Souza' });
    });

    it('usa a URL da variável CADASTRO_URL', async () => {
      process.env.CADASTRO_URL = 'http://cadastro.interno:4000';
      service = new CadastroService();
      delete process.env.CADASTRO_URL;
      fetchMock.mockResolvedValue(status(404));

      await buscar();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://cadastro.interno:4000/pacientes/11111111111',
        expect.anything(),
      );
    });

    it('404: devolve null, sem tentar de novo', async () => {
      fetchMock.mockResolvedValue(status(404));

      await expect(buscar('99999999999')).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('outro 4xx: 502, sem tentar de novo (não é instabilidade)', async () => {
      fetchMock.mockResolvedValue(status(400));

      await expect(buscar()).rejects.toBeInstanceOf(BadGatewayException);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['o corpo não é JSON', new Response('isto não é json', { status: 200 })],
      ['falta o nome', ok({ cpf: '11111111111' })],
      ['o nome está vazio', ok({ cpf: '11111111111', nome: '  ' })],
      [
        'o CPF é de outro paciente',
        ok({ cpf: '22222222222', nome: 'Bruno Carvalho' }),
      ],
    ])(
      '200 inválido (%s): 502, sem tentar de novo',
      async (_caso, resposta) => {
        fetchMock.mockResolvedValue(resposta);

        await expect(buscar()).rejects.toBeInstanceOf(BadGatewayException);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('instabilidade: novas tentativas com espera crescente', () => {
    it.each([
      ['erro de rede', () => Promise.reject(erroDeRede())],
      ['timeout', () => Promise.reject(timeout())],
      ['503', () => Promise.resolve(status(503))],
    ])('recupera quando só a 1ª tentativa falha (%s)', async (_caso, falha) => {
      fetchMock.mockImplementationOnce(falha).mockResolvedValueOnce(ok());

      await expect(buscar()).resolves.toEqual(ANA);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('recupera na 3ª tentativa', async () => {
      fetchMock
        .mockRejectedValueOnce(erroDeRede())
        .mockResolvedValueOnce(status(502))
        .mockResolvedValueOnce(ok());

      await expect(buscar()).resolves.toEqual(ANA);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('desiste depois de 3 tentativas e responde 503', async () => {
      fetchMock.mockResolvedValue(status(500));

      await expect(buscar()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(erros).toHaveBeenCalledWith(
        'Cadastro respondeu 500 (tentativa 3 de 3); desistindo',
      );
    });

    it('espera 200 ms e depois 400 ms entre as tentativas (mais o aleatório)', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const esperas = jest.spyOn(global, 'setTimeout');
      fetchMock.mockRejectedValue(erroDeRede());

      await expect(buscar()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );

      expect(esperas.mock.calls.map(([, ms]) => ms)).toEqual([200, 400]);
    });

    it.each([
      ['instabilidade (500)', () => status(500)],
      [
        'resposta de outro paciente',
        () => ok({ cpf: '22222222222', nome: 'Ana Souza' }),
      ],
      ['4xx inesperado', () => status(400)],
    ])('não coloca CPF nem nome nos logs: %s', async (_caso, resposta) => {
      fetchMock.mockImplementation(() => Promise.resolve(resposta()));

      await buscar().catch(() => undefined);

      const chamadas = [avisos, erros].flatMap(
        (espiao) => espiao.mock.calls as unknown[][],
      );
      expect(chamadas.length).toBeGreaterThan(0);
      expect(chamadas.flat().join(' ')).not.toMatch(
        /11111111111|22222222222|Ana/,
      );
    });
  });
});
