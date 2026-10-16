import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ConfirmacaoCheckin } from '../api';
import { CheckinForm } from './CheckinForm';

const confirmacao = (dados: Partial<ConfirmacaoCheckin> = {}): ConfirmacaoCheckin => ({
  primeiroNome: 'Ana',
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
    let responder!: (c: ConfirmacaoCheckin) => void;
    const { user, campo } = renderizar(
      vi.fn(() => new Promise<ConfirmacaoCheckin>((r) => (responder = r))),
    );

    await user.type(campo, '11111111111{Enter}');
    expect(screen.getByRole('button', { name: 'Buscando cadastro…' })).toBeDisabled();

    await act(async () => responder(confirmacao()));
    expect(screen.getByText('004')).toBeInTheDocument();
  });

  it.each([
    [400, 'CPF inválido', 'Confira os números digitados.'],
    [404, 'CPF não encontrado', 'Confira os números ou procure a recepção.'],
    [409, 'Check-in já realizado hoje', 'Você já está na fila. Aguarde ser chamado.'],
    [502, 'Cadastro indisponível', 'Tente de novo em instantes ou procure a recepção.'],
    [503, 'Cadastro indisponível', 'Tente de novo em instantes ou procure a recepção.'],
    [0, 'Sem conexão com o sistema', 'Procure a recepção.'],
    [500, 'Sistema indisponível', 'Tente de novo em instantes ou procure a recepção.'],
    [418, 'Algo deu errado', 'Tente novamente ou procure a recepção.'],
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
    expect(alerta).not.toHaveTextContent('mensagem da API'); // nunca o texto cru
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

  it('apaga o CPF depois de 30 s sem uso, para o próximo da fila não ver', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckinForm onCheckin={vi.fn()} />);
    const campo = screen.getByLabelText('Digite seu CPF');

    await user.type(campo, '1111111');
    act(() => vi.advanceTimersByTime(29_000));
    expect(campo).toHaveValue('111.111.1');

    act(() => vi.advanceTimersByTime(1_000));
    expect(campo).toHaveValue('');
  });

  it('apaga também o CPF e o aviso que ficaram depois de um erro', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckinForm onCheckin={vi.fn().mockRejectedValue(new ApiError('x', 404))} />);
    const campo = screen.getByLabelText('Digite seu CPF');

    await user.type(campo, '11111111111{Enter}');
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30_000));
    expect(campo).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('não deixa mudar o CPF enquanto envia', async () => {
    const { user, campo } = renderizar(vi.fn(() => new Promise<ConfirmacaoCheckin>(() => {})));

    await user.type(campo, '11111111111{Enter}');

    expect(campo).toHaveAttribute('readonly');
  });

  it('"Novo check-in" volta na hora, com o campo vazio', async () => {
    const { user, campo } = renderizar();
    await user.type(campo, '11111111111{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Novo check-in' }));

    expect(screen.getByLabelText('Digite seu CPF')).toHaveValue('');
  });
});
