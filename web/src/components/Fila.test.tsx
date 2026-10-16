import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CheckinNaFila } from '../api';
import { Fila } from './Fila';

// 14/10/2026 às 9h15 em Brasília.
const AGORA = new Date('2026-10-14T12:15:00Z');

const aguardando = (id: number, nome: string, chegada: string): CheckinNaFila => ({
  id,
  senha: id,
  nome,
  cpfMascarado: `***.${String(id).repeat(3)}.${String(id).repeat(3)}-**`,
  chegada,
  status: 'aguardando',
  chamadoEm: null,
});

const FILA: CheckinNaFila[] = [
  aguardando(1, 'Ana Souza', '2026-10-14T12:00:00Z'),
  aguardando(2, 'Bruno Carvalho', '2026-10-14T12:14:30Z'),
];

const CARLA_CHAMADA: CheckinNaFila = {
  ...aguardando(3, 'Carla Menezes', '2026-10-14T11:50:00Z'),
  status: 'chamado',
  chamadoEm: '2026-10-14T12:05:00Z',
};

const renderizar = (props: Partial<Parameters<typeof Fila>[0]> = {}) =>
  render(<Fila checkins={FILA} agora={AGORA} carregando={false} erro={null} {...props} />);

const indicador = (rotulo: string) => screen.getByRole('group', { name: rotulo });
const listaAguardando = () => screen.getByRole('list', { name: 'Pacientes aguardando' });

describe('Fila', () => {
  it('mostra quantos aguardam e a maior espera', () => {
    renderizar();

    expect(indicador('Aguardando')).toHaveTextContent('02');
    expect(indicador('Maior espera')).toHaveTextContent('15 min');
  });

  it('lista cada paciente com senha, nome, CPF mascarado e horário', () => {
    renderizar();

    const [ana, bruno] = within(listaAguardando()).getAllByRole('listitem');
    expect(ana).toHaveTextContent('001');
    expect(ana).toHaveTextContent('Ana Souza');
    expect(ana).toHaveTextContent('***.111.111-**');
    expect(ana).toHaveTextContent('09:00');
    expect(bruno).toHaveTextContent('002');
    expect(bruno).toHaveTextContent('agora'); // chegou há menos de 1 minuto
  });

  it('destaca só o primeiro como próximo', () => {
    renderizar();

    const [ana, bruno] = within(listaAguardando()).getAllByRole('listitem');
    expect(within(ana).getByText(/Próximo/)).toBeInTheDocument();
    expect(within(bruno).queryByText(/Próximo/)).not.toBeInTheDocument();
  });

  it('mostra horas quando a espera passa de 1 hora', () => {
    renderizar({ agora: new Date('2026-10-14T13:05:00Z') });

    expect(indicador('Maior espera')).toHaveTextContent('1 h 5 min');
  });

  it('separa quem já foi chamado, com o horário da chamada', () => {
    renderizar({ checkins: [...FILA, CARLA_CHAMADA] });

    expect(within(listaAguardando()).getAllByRole('listitem')).toHaveLength(2);
    const chamados = screen.getByRole('list', { name: 'Pacientes chamados' });
    expect(chamados).toHaveTextContent('003');
    expect(chamados).toHaveTextContent('Carla Menezes');
    expect(chamados).toHaveTextContent('chamado às 09:05');
    expect(indicador('Aguardando')).toHaveTextContent('02');
  });

  it('todos já chamados: avisa que ninguém aguarda', () => {
    renderizar({ checkins: [CARLA_CHAMADA] });

    expect(screen.getByText('Ninguém aguardando.')).toBeInTheDocument();
    expect(indicador('Maior espera')).toHaveTextContent('—');
  });

  it('estado vazio com orientação', () => {
    renderizar({ checkins: [] });

    expect(screen.getByText('Nenhum check-in até agora.')).toBeInTheDocument();
  });

  it('enquanto carrega, não diz que a fila está vazia', () => {
    renderizar({ checkins: [], carregando: true });

    expect(screen.getByText('Carregando fila…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum check-in até agora.')).not.toBeInTheDocument();
  });

  it('avisa o erro mas mantém a última fila na tela', () => {
    renderizar({ erro: 'Não foi possível conectar ao sistema.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar a fila.');
    expect(within(listaAguardando()).getAllByRole('listitem')).toHaveLength(2);
  });
});
