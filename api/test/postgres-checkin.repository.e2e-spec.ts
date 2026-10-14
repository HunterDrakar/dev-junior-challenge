import { Pool } from 'pg';
import { CheckinDuplicadoError } from '../src/checkin/repositories/checkin.repository';
import { PostgresCheckinRepository } from '../src/checkin/repositories/postgres-checkin.repository';

/**
 * Testa no PostgreSQL de verdade o que só o banco garante: senhas sem
 * repetição e um check-in por CPF por dia, inclusive com requisições
 * simultâneas.
 *
 * Só roda com TEST_DATABASE_URL apontando para um banco descartável
 * (a tabela é apagada a cada teste). Sem a variável, é pulado.
 */
const urlTeste = process.env.TEST_DATABASE_URL;
const descrever = urlTeste ? describe : describe.skip;

// 14/10/2026 às 9h e 15/10/2026 às 9h em Brasília.
const HOJE = new Date('2026-10-14T12:00:00Z');
const AMANHA = new Date('2026-10-15T12:00:00Z');

const novo = (cpf: string, chegada = HOJE) => ({
  cpf,
  nome: `Paciente ${cpf}`,
  chegada,
});
const cpfs = (n: number) =>
  Array.from({ length: n }, (_, i) => String(i + 1).padStart(11, '0'));

descrever('PostgresCheckinRepository (banco real)', () => {
  let repositorio: PostgresCheckinRepository;
  let admin: Pool;

  beforeAll(async () => {
    const url = urlTeste as string;
    if (!new URL(url).pathname.includes('test')) {
      throw new Error('TEST_DATABASE_URL precisa ser um banco de teste');
    }
    admin = new Pool({ connectionString: url });
    await admin.query('DROP TABLE IF EXISTS checkins');
    repositorio = new PostgresCheckinRepository(url);
    await repositorio.onModuleInit(); // cria a tabela
  });

  beforeEach(async () => {
    await admin.query('TRUNCATE checkins RESTART IDENTITY');
  });

  afterAll(async () => {
    await repositorio?.onModuleDestroy();
    await admin?.end();
  });

  it('verificarConexao responde quando o banco está no ar', async () => {
    await expect(repositorio.verificarConexao()).resolves.toBeUndefined();
    expect(repositorio.armazenamento).toBe('postgres');
  });

  it('sobrevive quando o banco derruba as conexões (ex.: reinício)', async () => {
    await repositorio.verificarConexao(); // deixa uma conexão aberta no pool

    // O banco encerra todas as conexões, menos a do próprio comando.
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid()`,
    );
    await new Promise((resolver) => setTimeout(resolver, 300));

    // Sem tratar o evento 'error' do pool, o Node derrubaria a API. O Jest
    // só imprime o erro, então conferimos também que há um tratador.
    const { pool } = repositorio as unknown as { pool: Pool };
    expect(pool.listenerCount('error')).toBeGreaterThan(0);
    await expect(repositorio.verificarConexao()).resolves.toBeUndefined();
  });

  it('grava e devolve o check-in com a senha 1', async () => {
    const checkin = await repositorio.salvar(novo('11111111111'));

    expect(checkin).toEqual({
      id: 1,
      cpf: '11111111111',
      nome: 'Paciente 11111111111',
      chegada: HOJE,
      senha: 1,
    });
  });

  it('recusa o mesmo CPF duas vezes no mesmo dia', async () => {
    await repositorio.salvar(novo('11111111111'));

    await expect(
      repositorio.salvar(novo('11111111111')),
    ).rejects.toBeInstanceOf(CheckinDuplicadoError);
  });

  it('aceita o mesmo CPF no dia seguinte, e a senha recomeça', async () => {
    await repositorio.salvar(novo('11111111111'));
    await repositorio.salvar(novo('22222222222'));

    const amanha = await repositorio.salvar(novo('22222222222', AMANHA));

    expect(amanha.senha).toBe(1);
  });

  it('lista só o dia pedido, na ordem das senhas', async () => {
    await repositorio.salvar(novo('11111111111'));
    await repositorio.salvar(novo('22222222222', AMANHA));
    await repositorio.salvar(novo('33333333333'));

    const fila = await repositorio.listarDoDia('2026-10-14');

    expect(fila.map((c) => [c.senha, c.cpf])).toEqual([
      [1, '11111111111'],
      [2, '33333333333'],
    ]);
  });

  it('20 check-ins simultâneos recebem as senhas 1 a 20, sem repetir', async () => {
    const resultados = await Promise.all(
      cpfs(20).map((cpf) => repositorio.salvar(novo(cpf))),
    );

    const senhas = resultados.map((c) => c.senha).sort((a, b) => a - b);
    expect(senhas).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('o mesmo CPF 5 vezes ao mesmo tempo entra uma vez só', async () => {
    const resultados = await Promise.allSettled(
      Array.from({ length: 5 }, () => repositorio.salvar(novo('11111111111'))),
    );

    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const recusados = resultados.filter(
      (r) =>
        r.status === 'rejected' && r.reason instanceof CheckinDuplicadoError,
    );
    expect(ok).toHaveLength(1);
    expect(recusados).toHaveLength(4);
    // A senha não "pula": o próximo paciente recebe a 2.
    expect((await repositorio.salvar(novo('22222222222'))).senha).toBe(2);
  });
});
