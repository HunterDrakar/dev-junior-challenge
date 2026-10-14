import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api';
import { CheckinForm, type Confirmacao } from './CheckinForm';

const confirmacao = (dados: Partial<Confirmacao> = {}): Confirmacao => ({
  nome: 'Ana Souza',
  senha: 4,
  posicao: 4,
  ...dados,
});

function renderizar(onCheckin = vi.fn().mockResolvedValue(confirmacao())) {
  const user = userEvent.setup();
  render(<CheckinForm onCheckin={onCheckin} />);
  return { user, onCheckin, campo: screen.getByLabelText('Digite seu CPF') };
}

describe('CheckinForm', () => {
  it('só libera o botão com os 11 dígitos e diz quantos faltam', async () => {
    const { user, campo } = renderizar();

    expect(screen.getByRole('button', { name: 'Faltam 11 dígitos' })).toBeDisabled();

    await user.type(campo, '1111111111');
    expect(screen.getByRole('button', { name: 'Faltam 1 dígito' })).toBeDisabled();

    await user.type(campo, '1');
    expect(screen.getByRole('button', { name: 'Confirmar check-in' })).toBeEnabled();
  });

  it('formata o CPF enquanto a pessoa digita', async () => {
    const { user, campo } = renderizar();

    await user.type(campo, '12345678901');

    expect(campo).toHaveValue('123.456.789-01');
  });

  it('envia só os dígitos e mostra a senha e quantas pessoas estão na frente', async () => {
    const { user, campo, onCheckin } = renderizar();

    await user.type(campo, '111.111.111-11{Enter}');

    expect(onCheckin).toHaveBeenCalledWith('11111111111');
    expect(await screen.findByText('Tudo certo, Ana.')).toBeInTheDocument();
    expect(screen.getByText('004')).toBeInTheDocument();
    expect(screen.getByText(/3 pessoas na sua frente/)).toBeInTheDocument();
    // Só o primeiro nome aparece na tela pública.
    expect(screen.queryByText(/Souza/)).not.toBeInTheDocument();
  });

  it.each([
    [1, 'Você é o próximo.'],
    [2, '1 pessoa na sua frente.'],
  ])('posição %i: "%s"', async (posicao, texto) => {
    const { user, campo } = renderizar(
      vi.fn().mockResolvedValue(confirmacao({ posicao })),
    );

    await user.type(campo, '11111111111{Enter}');

    expect(await screen.findByText(new RegExp(texto))).toBeInTheDocument();
  });

  it('bloqueia o botão enquanto espera a API', async () => {
    let responder!: (c: Confirmacao) => void;
    const { user, campo } = renderizar(
      vi.fn(() => new Promise<Confirmacao>((r) => (responder = r))),
    );

    await user.type(campo, '11111111111{Enter}');
    expect(screen.getByRole('button', { name: 'Buscando cadastro…' })).toBeDisabled();

    await act(async () => responder(confirmacao()));
    expect(screen.getByText('004')).toBeInTheDocument();
  });

  it.each([
    [404, 'CPF não encontrado', 'Confira os números ou procure a recepção.'],
    [409, 'Check-in já realizado hoje', 'Você já está na fila. Aguarde ser chamado.'],
    [502, 'Cadastro indisponível', 'Tente de novo em instantes ou procure a recepção.'],
    [503, 'Cadastro indisponível', 'Tente de novo em instantes ou procure a recepção.'],
    [0, 'Sem conexão com o sistema', 'Procure a recepção.'],
  ])('erro %i: mostra "%s" e o que fazer', async (status, titulo, dica) => {
    const { user, campo } = renderizar(
      vi.fn().mockRejectedValue(new ApiError('mensagem da API', status)),
    );

    await user.type(campo, '11111111111{Enter}');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(titulo);
    expect(alerta).toHaveTextContent(dica);
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveValue('111.111.111-11'); // não apaga o que a pessoa digitou
  });

  it('some com o erro quando a pessoa volta a digitar', async () => {
    const { user, campo } = renderizar(
      vi.fn().mockRejectedValue(new ApiError('x', 404)),
    );
    await user.type(campo, '11111111111{Enter}');
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(campo, '{Backspace}');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('volta sozinho para o formulário 10 s depois do sucesso', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckinForm onCheckin={vi.fn().mockResolvedValue(confirmacao())} />);

    await user.type(screen.getByLabelText('Digite seu CPF'), '11111111111{Enter}');
    expect(await screen.findByText('004')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(9_000));
    expect(screen.getByText('004')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.queryByText('004')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Digite seu CPF')).toHaveValue('');
  });

  it('"Novo check-in" volta na hora, com o campo vazio', async () => {
    const { user, campo } = renderizar();
    await user.type(campo, '11111111111{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Novo check-in' }));

    expect(screen.getByLabelText('Digite seu CPF')).toHaveValue('');
  });
});
