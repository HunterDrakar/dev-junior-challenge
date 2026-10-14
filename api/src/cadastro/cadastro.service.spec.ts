import {
  BadGatewayException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CadastroService } from './cadastro.service';

describe('CadastroService', () => {
  const fetchMock = jest.fn();
  let service: CadastroService;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    service = new CadastroService();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('retorna o paciente quando o cadastro responde 200', async () => {
    const paciente = {
      cpf: '11111111111',
      nome: 'Ana Souza',
      dataNascimento: '1988-03-12',
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(paciente), { status: 200 }),
    );

    await expect(service.buscarPorCpf('11111111111')).resolves.toEqual(
      paciente,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/pacientes/11111111111',
      expect.anything(),
    );
  });

  it('retorna null quando o cadastro responde 404', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));

    await expect(service.buscarPorCpf('99999999999')).resolves.toBeNull();
  });

  it('lança 503 quando o cadastro responde com erro', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));

    await expect(service.buscarPorCpf('11111111111')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it.each([
    ['o corpo não é JSON', 'isto não é json'],
    ['falta o nome', JSON.stringify({ cpf: '11111111111' })],
    ['o nome está vazio', JSON.stringify({ cpf: '11111111111', nome: '  ' })],
    [
      'o CPF da resposta é de outro paciente',
      JSON.stringify({ cpf: '22222222222', nome: 'Bruno Carvalho' }),
    ],
  ])('lança 502 quando %s', async (_caso, corpo) => {
    fetchMock.mockResolvedValue(new Response(corpo, { status: 200 }));

    await expect(service.buscarPorCpf('11111111111')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('lança 503 quando o cadastro está fora do ar', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(service.buscarPorCpf('11111111111')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
