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

interface CheckinNaFilaJson {
  senha: number;
  nome: string;
  cpfMascarado: string;
  status: 'aguardando' | 'chamado';
  chamadoEm: string | null;
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

  const criar = (entrada: object) =>
    request(app.getHttpServer()).post('/checkins').send(entrada);
  const chamar = () =>
    request(app.getHttpServer()).post('/checkins/chamar-proximo');
  const listar = () => request(app.getHttpServer()).get('/checkins');

  describe('POST /checkins', () => {
    it('201: devolve só o primeiro nome, a senha e a posição', async () => {
      const resposta = await criar({ cpf: '11111111111' }).expect(201);

      expect(resposta.body).toEqual({
        primeiroNome: 'Ana',
        senha: 1,
        posicao: 1,
      });
    });

    it('201: aceita o CPF com pontuação e consulta só os dígitos', async () => {
      await criar({ cpf: '111.111.111-11' }).expect(201);

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
      [
        'letras no meio dos dígitos',
        { cpf: '1a1b1c1d1e1f1g1h1i1j1k' },
        'O CPF deve ter 11 dígitos.',
      ],
      [
        'texto em volta do CPF',
        { cpf: 'CPF 111.111.111-11' },
        'O CPF deve ter 11 dígitos.',
      ],
      [
        'CPF como número',
        { cpf: 11111111111 },
        'O CPF deve ser enviado como texto.',
      ],
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
    it('lista vazia quando ninguém fez check-in', async () => {
      await listar().expect(200, []);
    });

    it('fila na ordem das senhas, com o CPF mascarado', async () => {
      await criar({ cpf: '22222222222' }).expect(201);
      await criar({ cpf: '11111111111' }).expect(201);

      const resposta = await listar().expect(200);

      expect(
        corpo<CheckinNaFilaJson[]>(resposta).map((c) => [
          c.senha,
          c.nome,
          c.cpfMascarado,
        ]),
      ).toEqual([
        [1, 'Bruno Carvalho', '***.222.222-**'],
        [2, 'Ana Souza', '***.111.111-**'],
      ]);
      expect(JSON.stringify(resposta.body)).not.toMatch(
        /11111111111|22222222222/,
      );
    });
  });

  describe('POST /checkins/chamar-proximo', () => {
    it('200: chama a menor senha que aguarda', async () => {
      await criar({ cpf: '11111111111' }).expect(201);
      await criar({ cpf: '22222222222' }).expect(201);

      const resposta = await chamar().expect(200);

      expect(resposta.body).toMatchObject({
        senha: 1,
        nome: 'Ana Souza',
        cpfMascarado: '***.111.111-**',
        status: 'chamado',
      });
      expect(corpo<CheckinNaFilaJson>(resposta).chamadoEm).toEqual(
        expect.any(String),
      );
    });

    it('404: ninguém aguardando', async () => {
      const resposta = await chamar().expect(404);

      expect(corpo<ErroJson>(resposta).message).toBe(
        'Ninguém aguardando na fila.',
      );
    });
  });

  describe('GET /chamadas', () => {
    it('só senha e horário, sem nome nem CPF', async () => {
      await criar({ cpf: '11111111111' }).expect(201);
      await chamar().expect(200);

      const resposta = await request(app.getHttpServer())
        .get('/chamadas')
        .expect(200);

      const chamadas = corpo<object[]>(resposta);
      expect(chamadas).toHaveLength(1);
      expect(Object.keys(chamadas[0]).sort()).toEqual(['chamadoEm', 'senha']);
      expect(JSON.stringify(resposta.body)).not.toMatch(/Ana|11111111111/);
    });
  });

  describe('CORS', () => {
    it.each(['http://localhost:5173', 'http://127.0.0.1:5173'])(
      'libera o front local (%s)',
      async (origem) => {
        const resposta = await listar().set('Origin', origem).expect(200);

        expect(resposta.headers['access-control-allow-origin']).toBe(origem);
      },
    );

    it('não libera outros sites', async () => {
      const resposta = await listar()
        .set('Origin', 'https://site-qualquer.example')
        .expect(200);

      expect(resposta.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
