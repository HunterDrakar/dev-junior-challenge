import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecepcaoPage } from './RecepcaoPage';
import { TotemPage } from './TotemPage';

function respostaJson(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status });
}

describe('TotemPage', () => {
  it('faz só o POST: nunca baixa a fila (que tem nomes de outros pacientes)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      respostaJson(201, {
        id: 3, cpf: '11111111111', nome: 'Ana Souza', chegada: '', senha: 3, posicao: 3,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<TotemPage />);

    await user.type(screen.getByLabelText('Digite seu CPF'), '11111111111{Enter}');

    expect(await screen.findByText('003')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });
});

describe('RecepcaoPage', () => {
  it('carrega a fila e atualiza sozinha a cada 10 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaJson(200, []))
      .mockResolvedValueOnce(
        respostaJson(200, [
          { id: 1, cpf: '11111111111', nome: 'Ana Souza', chegada: new Date().toISOString(), senha: 1 },
        ]),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<RecepcaoPage />);

    expect(await screen.findByText('Nenhum check-in até agora.')).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(10_000));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
