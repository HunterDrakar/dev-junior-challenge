import { ConflictException, NotFoundException } from '@nestjs/common';
import { CadastroService } from '../cadastro/cadastro.service';
import { CheckinService } from './checkin.service';
import { InMemoryCheckinRepository } from './repositories/in-memory-checkin.repository';

describe('CheckinService', () => {
  let cadastro: { buscarPorCpf: jest.Mock };
  let service: CheckinService;

  beforeEach(() => {
    cadastro = { buscarPorCpf: jest.fn() };
    service = new CheckinService(
      cadastro as unknown as CadastroService,
      new InMemoryCheckinRepository(),
    );
  });

  it('registra o check-in com o nome vindo do cadastro', async () => {
    cadastro.buscarPorCpf.mockResolvedValue({
      cpf: '11111111111',
      nome: 'Ana Souza',
      dataNascimento: '1988-03-12',
    });

    const checkin = await service.criar('11111111111');

    expect(cadastro.buscarPorCpf).toHaveBeenCalledWith('11111111111');
    expect(checkin).toMatchObject({
      id: 1,
      cpf: '11111111111',
      nome: 'Ana Souza',
      posicao: 1,
    });
    expect(checkin.chegada).toBeInstanceOf(Date);
    expect(await service.listarFilaDeHoje()).toHaveLength(1);
  });

  it('retorna 404 quando o CPF não existe no cadastro', async () => {
    cadastro.buscarPorCpf.mockResolvedValue(null);

    await expect(service.criar('99999999999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(await service.listarFilaDeHoje()).toEqual([]);
  });

  it('não deixa o mesmo paciente entrar duas vezes na fila do dia', async () => {
    cadastro.buscarPorCpf.mockResolvedValue({
      cpf: '11111111111',
      nome: 'Ana Souza',
      dataNascimento: '1988-03-12',
    });
    await service.criar('11111111111');

    await expect(service.criar('11111111111')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(await service.listarFilaDeHoje()).toHaveLength(1);
  });

  it('lista a fila por ordem de chegada', async () => {
    cadastro.buscarPorCpf
      .mockResolvedValueOnce({ cpf: '11111111111', nome: 'Ana Souza' })
      .mockResolvedValueOnce({ cpf: '22222222222', nome: 'Bruno Carvalho' });

    await service.criar('11111111111');
    const segundo = await service.criar('22222222222');
    expect(segundo.posicao).toBe(2);

    const fila = await service.listarFilaDeHoje();
    expect(fila.map((c) => c.nome)).toEqual(['Ana Souza', 'Bruno Carvalho']);
  });
});
