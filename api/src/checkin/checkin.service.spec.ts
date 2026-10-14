import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CadastroService, Paciente } from '../cadastro/cadastro.service';
import { CheckinService } from './checkin.service';
import { InMemoryCheckinRepository } from './repositories/in-memory-checkin.repository';

// Mesmos pacientes do mock-service.
const PACIENTES: Record<string, Paciente> = {
  '11111111111': {
    cpf: '11111111111',
    nome: 'Ana Souza',
    dataNascimento: '1988-03-12',
  },
  '22222222222': {
    cpf: '22222222222',
    nome: 'Bruno Carvalho',
    dataNascimento: '1975-11-02',
  },
  '33333333333': {
    cpf: '33333333333',
    nome: 'Carla Menezes',
    dataNascimento: '1993-07-25',
  },
};

// 14/10/2026 às 9h em Brasília (12h UTC).
const HOJE_9H = new Date('2026-10-14T12:00:00Z');

describe('CheckinService', () => {
  let cadastro: { buscarPorCpf: jest.Mock };
  let service: CheckinService;

  beforeEach(() => {
    // Só o relógio é falso; promessas continuam funcionando normalmente.
    jest.useFakeTimers({
      now: HOJE_9H,
      doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'],
    });
    cadastro = {
      buscarPorCpf: jest.fn((cpf: string) =>
        Promise.resolve(PACIENTES[cpf] ?? null),
      ),
    };
    service = new CheckinService(
      cadastro as unknown as CadastroService,
      new InMemoryCheckinRepository(),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('criar', () => {
    it('registra o check-in com o nome do cadastro, a senha e a posição', async () => {
      const checkin = await service.criar('11111111111');

      expect(cadastro.buscarPorCpf).toHaveBeenCalledWith('11111111111');
      expect(checkin).toEqual({
        id: 1,
        cpf: '11111111111',
        nome: 'Ana Souza',
        chegada: HOJE_9H,
        senha: 1,
        posicao: 1,
      });
    });

    it('dá senhas e posições em sequência', async () => {
      await service.criar('11111111111');
      const segundo = await service.criar('22222222222');
      const terceiro = await service.criar('33333333333');

      expect(segundo).toMatchObject({ senha: 2, posicao: 2 });
      expect(terceiro).toMatchObject({ senha: 3, posicao: 3 });
    });

    it('responde 404 e não grava nada quando o CPF não existe no cadastro', async () => {
      await expect(service.criar('99999999999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(await service.listarFilaDeHoje()).toEqual([]);
    });

    it('responde 409 quando o paciente já fez check-in hoje', async () => {
      await service.criar('11111111111');

      await expect(service.criar('11111111111')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(await service.listarFilaDeHoje()).toHaveLength(1);
    });

    it('repassa o erro do cadastro (ex.: 503) sem gravar nada', async () => {
      cadastro.buscarPorCpf.mockRejectedValue(
        new ServiceUnavailableException(),
      );

      await expect(service.criar('11111111111')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(await service.listarFilaDeHoje()).toEqual([]);
    });

    it('deixa o mesmo paciente voltar no dia seguinte, e a senha recomeça', async () => {
      await service.criar('11111111111');
      await service.criar('22222222222');

      jest.setSystemTime(new Date('2026-10-15T12:00:00Z'));
      const amanha = await service.criar('22222222222');

      expect(amanha).toMatchObject({ senha: 1, posicao: 1 });
    });
  });

  describe('listarFilaDeHoje', () => {
    it('mostra só os check-ins de hoje no horário de Brasília', async () => {
      // 13/10 às 23h30 em Brasília (14/10 às 2h30 em UTC): é "ontem".
      jest.setSystemTime(new Date('2026-10-14T02:30:00Z'));
      await service.criar('11111111111');

      jest.setSystemTime(HOJE_9H);
      await service.criar('22222222222');

      const fila = await service.listarFilaDeHoje();
      expect(fila.map((c) => c.nome)).toEqual(['Bruno Carvalho']);
    });

    it('lista na ordem das senhas', async () => {
      await service.criar('33333333333');
      await service.criar('11111111111');

      const fila = await service.listarFilaDeHoje();
      expect(fila.map((c) => [c.senha, c.nome])).toEqual([
        [1, 'Carla Menezes'],
        [2, 'Ana Souza'],
      ]);
    });

    it('devolve lista vazia quando ninguém fez check-in', async () => {
      expect(await service.listarFilaDeHoje()).toEqual([]);
    });
  });
});
