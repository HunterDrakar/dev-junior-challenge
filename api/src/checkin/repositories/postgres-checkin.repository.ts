import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';
import { Checkin, NovoCheckin } from '../checkin.entity';
import { diaLocal } from '../dia';
import { CheckinDuplicadoError, CheckinRepository } from './checkin.repository';

// Código do PostgreSQL para violação de UNIQUE.
const VIOLACAO_UNICA = '23505';
const CONSTRAINT_CPF_NO_DIA = 'checkins_dia_cpf_unico';
const CONSTRAINT_SENHA_NO_DIA = 'checkins_dia_senha_unica';
const TENTATIVAS_DE_SENHA = 5;

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
const CRIAR_TABELA = `
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
`;

/** Fila persistida no PostgreSQL (usada quando DATABASE_URL está definida). */
export class PostgresCheckinRepository
  extends CheckinRepository
  implements OnModuleInit, OnModuleDestroy
{
  readonly armazenamento = 'postgres';
  private readonly pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({ connectionString });
  }

  async onModuleInit() {
    await this.pool.query(CRIAR_TABELA);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async salvar(novo: NovoCheckin): Promise<Checkin> {
    // A senha é a maior do dia + 1, calculada no próprio INSERT. Se dois check-ins
    // simultâneos pegarem o mesmo número, a constraint recusa um deles e ele tenta
    // de novo, já enxergando a senha que o outro gravou.
    for (let tentativa = 1; ; tentativa++) {
      try {
        const { rows } = await this.pool.query<CheckinRow>(
          `INSERT INTO checkins (cpf, nome, chegada, dia, senha)
           VALUES ($1, $2, $3, $4,
                   (SELECT COALESCE(MAX(senha), 0) + 1 FROM checkins WHERE dia = $4))
           RETURNING id, cpf, nome, chegada, senha`,
          [novo.cpf, novo.nome, novo.chegada, diaLocal(novo.chegada)],
        );
        return rows[0];
      } catch (erro) {
        if (!(erro instanceof DatabaseError) || erro.code !== VIOLACAO_UNICA) {
          throw erro;
        }
        if (erro.constraint === CONSTRAINT_CPF_NO_DIA) {
          throw new CheckinDuplicadoError();
        }
        if (tentativa >= TENTATIVAS_DE_SENHA) {
          throw erro;
        }
      }
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
