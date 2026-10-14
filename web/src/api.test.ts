import { describe, expect, it, vi } from 'vitest';
import { ApiError, criarCheckin, listarFila } from './api';

function respostaJson(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('cliente da API', () => {
  it('criarCheckin faz POST /checkins com o CPF e devolve o corpo', async () => {
    const criado = { id: 1, cpf: '11111111111', nome: 'Ana', chegada: '', senha: 1, posicao: 1 };
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(201, criado));
    vi.stubGlobal('fetch', fetchMock);

    await expect(criarCheckin('11111111111')).resolves.toEqual(criado);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: '11111111111' }),
    });
  });

  it('listarFila faz GET /checkins', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await expect(listarFila()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/checkins', undefined);
  });

  it('transforma erro da API em ApiError com status e mensagem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson(404, { message: 'CPF não encontrado' })),
    );

    const erro = await criarCheckin('99999999999').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 404, message: 'CPF não encontrado' });
  });

  it('usa a primeira mensagem quando a validação devolve uma lista', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respostaJson(400, { message: ['O CPF deve ter 11 dígitos.', 'Informe o CPF.'] }),
      ),
    );

    await expect(criarCheckin('1')).rejects.toMatchObject({
      status: 400,
      message: 'O CPF deve ter 11 dígitos.',
    });
  });

  it('usa uma mensagem genérica quando o erro não tem corpo JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 500 })));

    await expect(listarFila()).rejects.toMatchObject({ status: 500, message: 'Erro inesperado.' });
  });

  it('sem conexão vira ApiError com status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(listarFila()).rejects.toMatchObject({
      status: 0,
      message: 'Não foi possível conectar ao sistema.',
    });
  });
});
