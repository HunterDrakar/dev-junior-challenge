import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Checkin } from '../api';
import { Fila } from './Fila';

// 14/10/2026 às 9h15 em Brasília.
const AGORA = new Date('2026-10-14T12:15:00Z');

const FILA: Checkin[] = [
  { id: 1, cpf: '11111111111', nome: 'Ana Souza', chegada: '2026-10-14T12:00:00Z', senha: 1 },
  { id: 2, cpf: '22222222222', nome: 'Bruno Carvalho', chegada: '2026-10-14T12:14:30Z', senha: 2 },
];

const renderizar = (props: Partial<Parameters<typeof Fila>[0]> = {}) =>
  render(<Fila fila={FILA} agora={AGORA} carregando={false} erro={null} {...props} />);

describe('Fila', () => {
  it('mostra o total na fila e a maior espera', () => {
    renderizar();

    expect(screen.getByText('Na fila hoje').nextSibling).toHaveTextContent('02');
    expect(screen.getByText('Maior espera').nextSibling).toHaveTextContent('15 min');
  });

  it('lista cada paciente com senha, nome, CPF mascarado e horário', () => {
    renderizar();

    const [ana, bruno] = screen.getAllByRole('listitem');
    expect(ana).toHaveTextContent('001');
    expect(ana).toHaveTextContent('Ana Souza');
    expect(ana).toHaveTextContent('***.111.111-**');
    expect(ana).toHaveTextContent('09:00');
    expect(bruno).toHaveTextContent('002');
    expect(bruno).toHaveTextContent('agora'); // chegou há menos de 1 minuto
  });

  it('destaca só o primeiro como próximo', () => {
    renderizar();

    const [ana, bruno] = screen.getAllByRole('listitem');
    expect(within(ana).getByText(/Próximo/)).toBeInTheDocument();
    expect(within(bruno).queryByText(/Próximo/)).not.toBeInTheDocument();
  });

  it('nunca mostra o CPF completo', () => {
    renderizar();

    expect(screen.queryByText(/11111111111|111\.111\.111-11/)).not.toBeInTheDocument();
  });

  it('mostra horas quando a espera passa de 1 hora', () => {
    renderizar({ agora: new Date('2026-10-14T13:05:00Z') });

    expect(screen.getByText('Maior espera').nextSibling).toHaveTextContent('1 h 5 min');
  });

  it('mostra o estado vazio com orientação', () => {
    renderizar({ fila: [] });

    expect(screen.getByText('Nenhum check-in até agora.')).toBeInTheDocument();
    expect(screen.getByText('Maior espera').nextSibling).toHaveTextContent('—');
  });

  it('mostra "carregando" só na primeira carga', () => {
    renderizar({ fila: [], carregando: true });

    expect(screen.getByText('Carregando fila…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum check-in até agora.')).not.toBeInTheDocument();
  });

  it('avisa o erro mas mantém a última fila na tela', () => {
    renderizar({ erro: 'Não foi possível conectar ao sistema.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar a fila.');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
