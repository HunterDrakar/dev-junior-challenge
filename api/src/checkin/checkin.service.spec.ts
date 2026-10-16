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
  let repositorio: InMemoryCheckinRepository;
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
    repositorio = new InMemoryCheckinRepository();
    service = new CheckinService(
      cadastro as unknown as CadastroService,
      repositorio,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('criar', () => {
    it('registra com o nome do cadastro, a senha e a posição', async () => {
      const { checkin, posicao } = await service.criar('11111111111');

      expect(cadastro.buscarPorCpf).toHaveBeenCalledWith('11111111111');
      expect(checkin).toEqual({
        id: 1,
        cpf: '11111111111',
        nome: 'Ana Souza',
        chegada: HOJE_9H,
        senha: 1,
        status: 'aguardando',
        chamadoEm: null,
      });
      expect(posicao).toBe(1);
    });

    it('dá senhas e posições em sequência', async () => {
      await service.criar('11111111111');
      const segundo = await service.criar('22222222222');
      const terceiro = await service.criar('33333333333');

      expect([segundo.checkin.senha, segundo.posicao]).toEqual([2, 2]);
      expect([terceiro.checkin.senha, terceiro.posicao]).toEqual([3, 3]);
    });

    it('a posição conta só quem ainda aguarda', async () => {
      await service.criar('11111111111');
      await service.criar('22222222222');
      await service.chamarProximo();

      const carla = await service.criar('33333333333');

      expect([carla.checkin.senha, carla.posicao]).toEqual([3, 2]);
    });

    it('a posição nunca é 0, mesmo se a recepção chamar o paciente antes de ela ser calculada', async () => {
      const listar = repositorio.listarDoDia.bind(repositorio);
      jest
        .spyOn(repositorio, 'listarDoDia')
        .mockImplementationOnce(async (dia) => {
          await repositorio.chamarProximo(dia, new Date());
          return listar(dia);
        });

      const { posicao } = await service.criar('11111111111');

      expect(posicao).toBe(1);
    });

    it('404 e nada gravado quando o CPF não existe no cadastro', async () => {
      await expect(service.criar('99999999999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(await service.listarFilaDeHoje()).toEqual([]);
    });

    it('409 quando o paciente já fez check-in hoje', async () => {
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

    it('o mesmo paciente pode voltar no dia seguinte, e a senha recomeça', async () => {
      await service.criar('11111111111');
      await service.criar('22222222222');

      jest.setSystemTime(new Date('2026-10-15T12:00:00Z'));
      const amanha = await service.criar('22222222222');

      expect([amanha.checkin.senha, amanha.posicao]).toEqual([1, 1]);
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

    it('lista vazia quando ninguém fez check-in', async () => {
      expect(await service.listarFilaDeHoje()).toEqual([]);
    });
  });

  describe('chamarProximo', () => {
    it('chama a menor senha que aguarda e marca o horário', async () => {
      await service.criar('11111111111');
      await service.criar('22222222222');

      jest.setSystemTime(new Date('2026-10-14T12:20:00Z'));
      const chamado = await service.chamarProximo();

      expect(chamado).toMatchObject({
        senha: 1,
        nome: 'Ana Souza',
        status: 'chamado',
        chamadoEm: new Date('2026-10-14T12:20:00Z'),
      });
    });

    it('chama em sequência, sem repetir', async () => {
      await service.criar('11111111111');
      await service.criar('22222222222');

      const primeiro = await service.chamarProximo();
      const segundo = await service.chamarProximo();

      expect([primeiro.senha, segundo.senha]).toEqual([1, 2]);
    });

    it('404 quando ninguém aguarda', async () => {
      await service.criar('11111111111');
      await service.chamarProximo();

      await expect(service.chamarProximo()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('não chama quem fez check-in ontem', async () => {
      jest.setSystemTime(new Date('2026-10-14T02:30:00Z')); // 23h30 de ontem
      await service.criar('11111111111');
      jest.setSystemTime(HOJE_9H);

      await expect(service.chamarProximo()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listarChamadasDeHoje', () => {
    it('só senha e horário, da chamada mais recente para a mais antiga', async () => {
      await service.criar('11111111111');
      await service.criar('22222222222');
      await service.criar('33333333333');
      jest.setSystemTime(new Date('2026-10-14T12:10:00Z'));
      await service.chamarProximo();
      jest.setSystemTime(new Date('2026-10-14T12:15:00Z'));
      await service.chamarProximo();

      expect(await service.listarChamadasDeHoje()).toEqual([
        { senha: 2, chamadoEm: new Date('2026-10-14T12:15:00Z') },
        { senha: 1, chamadoEm: new Date('2026-10-14T12:10:00Z') },
      ]);
    });

    it('mostra no máximo as 5 últimas', async () => {
      cadastro.buscarPorCpf.mockImplementation((cpf: string) =>
        Promise.resolve({ cpf, nome: 'Paciente', dataNascimento: '' }),
      );
      for (let i = 1; i <= 6; i++) {
        jest.setSystemTime(HOJE_9H.getTime() + i * 60_000);
        await service.criar(String(i).padStart(11, '0'));
        await service.chamarProximo();
      }

      const chamadas = await service.listarChamadasDeHoje();

      expect(chamadas.map((c) => c.senha)).toEqual([6, 5, 4, 3, 2]);
    });
  });
});
