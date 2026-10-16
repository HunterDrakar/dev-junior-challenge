import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';
import { Checkin, NovoCheckin } from '../checkin.entity';
import { diaLocal } from '../dia';
import { CheckinDuplicadoError, CheckinRepository } from './checkin.repository';

const VIOLACAO_UNICA = '23505'; // código do PostgreSQL
const CONSTRAINT_CPF_NO_DIA = 'checkins_dia_cpf_unico';

const COLUNAS =
  'id, cpf, nome, chegada, senha, status, chamado_em AS "chamadoEm"';

// "dia" é a data da chegada no horário de Brasília. As constraints garantem, mesmo
// com requisições simultâneas, um check-in por CPF e uma senha por dia.
// senhas_do_dia é o contador de senhas: uma sequence que recomeça todo dia.
const CRIAR_TABELAS = `
  CREATE TABLE IF NOT EXISTS senhas_do_dia (
    dia     DATE    PRIMARY KEY,
    ultima  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS checkins (
    id         SERIAL       PRIMARY KEY,
    cpf        CHAR(11)     NOT NULL,
    nome       TEXT         NOT NULL,
    chegada    TIMESTAMPTZ  NOT NULL,
    dia        DATE         NOT NULL,
    senha      INTEGER      NOT NULL,
    status     VARCHAR(10)  NOT NULL DEFAULT 'aguardando'
               CHECK (status IN ('aguardando', 'chamado')),
    chamado_em TIMESTAMPTZ,
    CONSTRAINT ${CONSTRAINT_CPF_NO_DIA} UNIQUE (dia, cpf),
    CONSTRAINT checkins_dia_senha_unica UNIQUE (dia, senha)
  );
`;

export class PostgresCheckinRepository
  extends CheckinRepository
  implements OnModuleInit, OnModuleDestroy
{
  readonly armazenamento = 'postgres';
  private readonly logger = new Logger(PostgresCheckinRepository.name);
  private readonly pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({ connectionString });
    // Quando o banco derruba uma conexão parada (reinício, queda de rede), o pool
    // emite 'error'; sem quem escute, o Node derruba a API inteira. O pool
    // descarta a conexão e abre outra na próxima consulta.
    this.pool.on('error', (erro) => {
      this.logger.error(`Conexão com o banco caiu: ${erro.message}`);
    });
  }

  async onModuleInit() {
    await this.pool.query(CRIAR_TABELAS);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async salvar(novo: NovoCheckin): Promise<Checkin> {
    // Um comando só: incrementa o contador do dia (o Postgres trava a linha, então
    // check-ins simultâneos pegam a senha um de cada vez) e grava o check-in. Se o
    // CPF for duplicado, o comando inteiro é desfeito e a senha não é consumida.
    try {
      const { rows } = await this.pool.query<Checkin>(
        `WITH proxima AS (
           INSERT INTO senhas_do_dia (dia, ultima) VALUES ($4, 1)
           ON CONFLICT (dia) DO UPDATE SET ultima = senhas_do_dia.ultima + 1
           RETURNING ultima
         )
         INSERT INTO checkins (cpf, nome, chegada, dia, senha)
         SELECT $1, $2, $3, $4, ultima FROM proxima
         RETURNING ${COLUNAS}`,
        [novo.cpf, novo.nome, novo.chegada, diaLocal(novo.chegada)],
      );
      return rows[0];
    } catch (erro) {
      if (
        erro instanceof DatabaseError &&
        erro.code === VIOLACAO_UNICA &&
        erro.constraint === CONSTRAINT_CPF_NO_DIA
      ) {
        throw new CheckinDuplicadoError();
      }
      throw erro;
    }
  }

  async verificarConexao(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async listarDoDia(dia: string): Promise<Checkin[]> {
    const { rows } = await this.pool.query<Checkin>(
      `SELECT ${COLUNAS} FROM checkins WHERE dia = $1 ORDER BY senha`,
      [dia],
    );
    return rows;
  }

  async chamarProximo(dia: string, chamadoEm: Date): Promise<Checkin | null> {
    // SKIP LOCKED: se duas recepcionistas chamarem ao mesmo tempo, a segunda pula
    // a linha que a primeira travou e pega o paciente seguinte, sem esperar.
    const { rows } = await this.pool.query<Checkin>(
      `UPDATE checkins
          SET status = 'chamado', chamado_em = $2
        WHERE id = (
          SELECT id FROM checkins
           WHERE dia = $1 AND status = 'aguardando'
           ORDER BY senha
           LIMIT 1
           FOR UPDATE SKIP LOCKED
        )
        RETURNING ${COLUNAS}`,
      [dia, chamadoEm],
    );
    return rows[0] ?? null;
  }
}
