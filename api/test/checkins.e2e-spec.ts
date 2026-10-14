import {
  BadGatewayException,
  INestApplication,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { CadastroService, Paciente } from '../src/cadastro/cadastro.service';

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
};

// Formato do JSON que a API devolve.
interface CheckinJson {
  id: number;
  cpf: string;
  nome: string;
  chegada: string;
  senha: number;
  posicao?: number;
}
interface ErroJson {
  message: string | string[];
}
const corpo = <T>(resposta: { body: unknown }) => resposta.body as T;

/**
 * Sobe a API inteira (rotas, validação, CORS) e faz requisições HTTP de verdade.
 * Só o cadastro externo é substituído, e a fila fica em memória.
 */
describe('Check-ins (e2e)', () => {
  let app: INestApplication<App>;
  let cadastro: { buscarPorCpf: jest.Mock };

  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    cadastro = {
      buscarPorCpf: jest.fn((cpf: string) =>
        Promise.resolve(PACIENTES[cpf] ?? null),
      ),
    };

    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CadastroService)
      .useValue(cadastro)
      .compile();

    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const criar = (corpo: object) =>
    request(app.getHttpServer()).post('/checkins').send(corpo);

  describe('POST /checkins', () => {
    it('201: registra e devolve nome, senha e posição', async () => {
      const resposta = await criar({ cpf: '11111111111' }).expect(201);

      expect(resposta.body).toEqual({
        id: 1,
        cpf: '11111111111',
        nome: 'Ana Souza',
        chegada: expect.any(String) as string,
        senha: 1,
        posicao: 1,
      });
      expect(
        new Date(corpo<CheckinJson>(resposta).chegada).toString(),
      ).not.toBe('Invalid Date');
    });

    it('201: aceita o CPF com pontuação e guarda só os dígitos', async () => {
      const resposta = await criar({ cpf: '111.111.111-11' }).expect(201);

      expect(corpo<CheckinJson>(resposta).cpf).toBe('11111111111');
      expect(cadastro.buscarPorCpf).toHaveBeenCalledWith('11111111111');
    });

    it.each([
      ['sem CPF', {}, 'Informe o CPF.'],
      ['CPF curto', { cpf: '123' }, 'O CPF deve ter 11 dígitos.'],
      [
        'CPF com letras',
        { cpf: 'abc.def.ghi-jk' },
        'O CPF deve ter 11 dígitos.',
      ],
      ['CPF como número', { cpf: 11111111111 }, 'Informe o CPF.'],
    ])('400: %s', async (_caso, entrada, mensagem) => {
      const resposta = await criar(entrada).expect(400);

      expect(corpo<ErroJson>(resposta).message).toContain(mensagem);
      expect(cadastro.buscarPorCpf).not.toHaveBeenCalled();
    });

    it('404: CPF que não existe no cadastro', async () => {
      const resposta = await criar({ cpf: '99999999999' }).expect(404);

      expect(corpo<ErroJson>(resposta).message).toBe(
        'CPF não encontrado no cadastro. Procure a recepção.',
      );
    });

    it('409: mesmo paciente duas vezes no dia', async () => {
      await criar({ cpf: '11111111111' }).expect(201);
      const resposta = await criar({ cpf: '11111111111' }).expect(409);

      expect(corpo<ErroJson>(resposta).message).toBe(
        'Este paciente já fez check-in hoje.',
      );
    });

    it.each([
      [503, new ServiceUnavailableException()],
      [502, new BadGatewayException()],
    ])('%i: repassa o erro do cadastro', async (status, erro) => {
      cadastro.buscarPorCpf.mockRejectedValue(erro);

      await criar({ cpf: '11111111111' }).expect(status);
    });
  });

  describe('GET /checkins', () => {
    it('devolve lista vazia quando ninguém fez check-in', async () => {
      await request(app.getHttpServer()).get('/checkins').expect(200, []);
    });

    it('devolve a fila na ordem das senhas', async () => {
      await criar({ cpf: '22222222222' }).expect(201);
      await criar({ cpf: '11111111111' }).expect(201);

      const resposta = await request(app.getHttpServer())
        .get('/checkins')
        .expect(200);

      expect(
        corpo<CheckinJson[]>(resposta).map((c) => [c.senha, c.nome]),
      ).toEqual([
        [1, 'Bruno Carvalho'],
        [2, 'Ana Souza'],
      ]);
    });
  });

  describe('CORS', () => {
    it.each(['http://localhost:5173', 'http://127.0.0.1:5173'])(
      'libera o front local (%s)',
      async (origem) => {
        const resposta = await request(app.getHttpServer())
          .get('/checkins')
          .set('Origin', origem)
          .expect(200);

        expect(resposta.headers['access-control-allow-origin']).toBe(origem);
      },
    );

    it('não libera outros sites', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/checkins')
        .set('Origin', 'https://site-qualquer.example')
        .expect(200);

      expect(resposta.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
