import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';
import { Checkin, NovoCheckin } from '../checkin.entity';
import { diaLocal } from '../dia';
import { CheckinDuplicadoError, CheckinRepository } from './checkin.repository';

// Código do PostgreSQL para violação de UNIQUE.
const VIOLACAO_UNICA = '23505';
const CONSTRAINT_CPF_NO_DIA = 'checkins_dia_cpf_unico';
const CONSTRAINT_SENHA_NO_DIA = 'checkins_dia_senha_unica';

interface CheckinRow {
  id: number;
  cpf: string;
  nome: string;
  chegada: Date;
  senha: number;
}

// "dia" é a data da chegada no horário de Brasília. As constraints únicas
// garantem, mesmo com requisições simultâneas, um check-in por paciente por dia
// e uma senha por dia. O índice de (dia, cpf) também atende a listagem da fila.
// senhas_do_dia guarda a última senha emitida em cada dia (como uma sequence
// que recomeça todo dia).
const CRIAR_TABELA = `
  CREATE TABLE IF NOT EXISTS senhas_do_dia (
    dia     DATE    PRIMARY KEY,
    ultima  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS checkins (
    id      SERIAL       PRIMARY KEY,
    cpf     CHAR(11)     NOT NULL,
    nome    VARCHAR(200) NOT NULL,
    chegada TIMESTAMPTZ  NOT NULL,
    dia     DATE         NOT NULL,
    senha   INTEGER      NOT NULL,
    CONSTRAINT ${CONSTRAINT_CPF_NO_DIA} UNIQUE (dia, cpf),
    CONSTRAINT ${CONSTRAINT_SENHA_NO_DIA} UNIQUE (dia, senha)
  );
  -- Banco que já tinha check-ins antes do contador: começa de onde parou.
  INSERT INTO senhas_do_dia (dia, ultima)
  SELECT dia, MAX(senha) FROM checkins GROUP BY dia
  ON CONFLICT (dia) DO NOTHING;
`;

/** Fila persistida no PostgreSQL (usada quando DATABASE_URL está definida). */
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
    // Se o banco derrubar uma conexão parada no pool (reinício, queda de rede),
    // o pool emite 'error'. Sem quem escute, o Node derruba a API inteira. Aqui
    // só registramos: o pool descarta a conexão e abre outra na próxima consulta.
    this.pool.on('error', (erro) => {
      this.logger.error(`Conexão com o banco caiu: ${erro.message}`);
    });
  }

  async onModuleInit() {
    await this.pool.query(CRIAR_TABELA);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async salvar(novo: NovoCheckin): Promise<Checkin> {
    // Um comando só: incrementa o contador do dia e grava o check-in com essa
    // senha. O Postgres trava a linha do contador, então check-ins simultâneos
    // pegam a senha um de cada vez, sem colisão. Se o check-in for recusado
    // (CPF duplicado), o comando inteiro é desfeito e a senha não é consumida.
    try {
      const { rows } = await this.pool.query<CheckinRow>(
        `WITH proxima AS (
           INSERT INTO senhas_do_dia (dia, ultima) VALUES ($4, 1)
           ON CONFLICT (dia) DO UPDATE SET ultima = senhas_do_dia.ultima + 1
           RETURNING ultima
         )
         INSERT INTO checkins (cpf, nome, chegada, dia, senha)
         SELECT $1, $2, $3, $4, ultima FROM proxima
         RETURNING id, cpf, nome, chegada, senha`,
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
    const { rows } = await this.pool.query<CheckinRow>(
      `SELECT id, cpf, nome, chegada, senha
         FROM checkins
        WHERE dia = $1
        ORDER BY senha`,
      [dia],
    );
    return rows;
  }
}
