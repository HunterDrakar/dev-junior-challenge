import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { CheckinNaFila } from '../api';
import { pedidos, respostaJson } from '../test/respostas';
import { PainelPage } from './PainelPage';
import { RecepcaoPage } from './RecepcaoPage';
import { TotemPage } from './TotemPage';

const ana: CheckinNaFila = {
  id: 1,
  senha: 1,
  nome: 'Ana Souza',
  cpfMascarado: '***.111.111-**',
  chegada: new Date().toISOString(),
  status: 'aguardando',
  chamadoEm: null,
};
const anaChamada: CheckinNaFila = {
  ...ana,
  status: 'chamado',
  chamadoEm: new Date().toISOString(),
};

describe('TotemPage', () => {
  it('faz só o POST: nunca baixa a fila (que tem nomes de outros pacientes)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(respostaJson(201, { primeiroNome: 'Ana', senha: 3, posicao: 3 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<TotemPage />);

    await user.type(screen.getByLabelText('Digite seu CPF'), '11111111111{Enter}');

    expect(await screen.findByText('003')).toBeInTheDocument();
    expect(pedidos(fetchMock)).toEqual(['POST /checkins']);
  });

  it('não tem link para outras telas', () => {
    render(<TotemPage />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('RecepcaoPage', () => {
  it('carrega a fila e atualiza sozinha a cada 10 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaJson(200, []))
      .mockResolvedValueOnce(respostaJson(200, [ana]));
    vi.stubGlobal('fetch', fetchMock);
    render(<RecepcaoPage />);

    expect(await screen.findByText('Nenhum check-in até agora.')).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(10_000));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('"Chamar próximo" chama, avisa quem foi chamado e atualiza a fila', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaJson(200, [ana]))
      .mockResolvedValueOnce(respostaJson(200, anaChamada))
      .mockResolvedValueOnce(respostaJson(200, [anaChamada]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<RecepcaoPage />);

    await user.click(await screen.findByRole('button', { name: 'Chamar próximo' }));

    expect(await screen.findByText('Senha 001 chamada: Ana Souza')).toBeInTheDocument();
    expect(await screen.findByText('Ninguém aguardando.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chamar próximo' })).toBeDisabled();
    expect(pedidos(fetchMock)).toEqual([
      'GET /checkins',
      'POST /checkins/chamar-proximo',
      'GET /checkins',
    ]);
  });

  it('uma atualização automática atrasada não traz de volta quem já foi chamado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let responderAtrasada!: (r: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaJson(200, [ana])) // carga inicial
      .mockReturnValueOnce(new Promise<Response>((r) => (responderAtrasada = r))) // automática, demora
      .mockResolvedValueOnce(respostaJson(200, anaChamada)) // POST chamar
      .mockResolvedValueOnce(respostaJson(200, [anaChamada])); // recarga após chamar
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<RecepcaoPage />);
    const botao = await screen.findByRole('button', { name: 'Chamar próximo' });

    await act(async () => vi.advanceTimersByTime(10_000)); // sai a automática
    await user.click(botao);
    expect(await screen.findByText('Ninguém aguardando.')).toBeInTheDocument();

    // A automática responde por último, com a fila de antes da chamada.
    await act(async () => responderAtrasada(respostaJson(200, [ana])));

    expect(screen.getByText('Ninguém aguardando.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chamar próximo' })).toBeDisabled();
  });

  it.each([
    [404, 'Ninguém aguardando na fila.'],
    [500, 'Não foi possível chamar. Tente de novo.'],
  ])('erro %i ao chamar: "%s"', async (status, mensagem) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(respostaJson(200, [ana]))
        .mockResolvedValueOnce(respostaJson(status, { message: 'texto da API' }))
        .mockResolvedValueOnce(respostaJson(200, [ana])),
    );
    const user = userEvent.setup();
    render(<RecepcaoPage />);

    await user.click(await screen.findByRole('button', { name: 'Chamar próximo' }));

    expect(await screen.findByText(mensagem)).toBeInTheDocument();
  });

  it('botão desabilitado quando ninguém aguarda', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(200, [])));
    render(<RecepcaoPage />);

    expect(await screen.findByText('Nenhum check-in até agora.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chamar próximo' })).toBeDisabled();
  });
});

describe('PainelPage', () => {
  it('mostra a senha chamada em destaque e as anteriores', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respostaJson(200, [
          { senha: 3, chamadoEm: '2026-10-14T12:20:00Z' },
          { senha: 2, chamadoEm: '2026-10-14T12:10:00Z' },
        ]),
      ),
    );
    render(<PainelPage />);

    const atual = await screen.findByRole('region', { name: 'Senha chamada' });
    expect(atual).toHaveTextContent('003');
    expect(atual).toHaveTextContent('Dirija-se à recepção');
    expect(screen.getByRole('listitem')).toHaveTextContent('002');
    expect(screen.getByRole('listitem')).toHaveTextContent('09:10');
  });

  it('só consulta /chamadas, que não tem nome nem CPF, a cada 5 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(respostaJson(200, [])));
    vi.stubGlobal('fetch', fetchMock);
    render(<PainelPage />);

    expect(await screen.findByText('Aguarde. As senhas chamadas aparecem aqui.')).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(5_000));

    expect(pedidos(fetchMock)).toEqual(['GET /chamadas', 'GET /chamadas']);
  });

  it('sem conexão: aviso discreto, sem mensagem técnica', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<PainelPage />);

    expect(await screen.findByText('Reconectando…')).toBeInTheDocument();
    expect(screen.queryByText(/Failed|erro/i)).not.toBeInTheDocument();
  });
});

describe('App', () => {
  it.each([
    ['/totem', 'Faça seu check-in'],
    ['/totem/', 'Faça seu check-in'],
    ['/recepcao', 'Recepção · Fila do dia'],
    ['/painel', 'Painel de chamadas'],
    ['/', 'Escolha a tela'],
    ['/qualquer-coisa', 'Escolha a tela'],
  ])('%s abre a tela certa', (caminho, texto) => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    window.history.pushState({}, '', caminho);

    render(<App />);

    expect(screen.getByText(texto)).toBeInTheDocument();
  });
});
