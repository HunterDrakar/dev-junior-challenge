import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';
import { Checkin, NovoCheckin } from '../checkin.entity';
import { diaLocal } from '../dia';
import { CheckinDuplicadoError, CheckinRepository } from './checkin.repository';

// Código do PostgreSQL para violação de UNIQUE.
const VIOLACAO_UNICA = '23505';

interface CheckinRow {
  id: number;
  cpf: string;
  nome: string;
  chegada: Date;
}

// "dia" é a data da chegada no horário de Brasília. A constraint única garante
// um check-in por paciente por dia mesmo com requisições simultâneas, e o
// índice dela também atende a listagem da fila (WHERE dia = ...).
const CRIAR_TABELA = `
  CREATE TABLE IF NOT EXISTS checkins (
    id      SERIAL       PRIMARY KEY,
    cpf     CHAR(11)     NOT NULL,
    nome    VARCHAR(200) NOT NULL,
    chegada TIMESTAMPTZ  NOT NULL,
    dia     DATE         NOT NULL,
    CONSTRAINT checkins_dia_cpf_unico UNIQUE (dia, cpf)
  );
`;

/** Fila persistida no PostgreSQL (usada quando DATABASE_URL está definida). */
export class PostgresCheckinRepository
  extends CheckinRepository
  implements OnModuleInit, OnModuleDestroy
{
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
    try {
      const { rows } = await this.pool.query<CheckinRow>(
        `INSERT INTO checkins (cpf, nome, chegada, dia)
         VALUES ($1, $2, $3, $4)
         RETURNING id, cpf, nome, chegada`,
        [novo.cpf, novo.nome, novo.chegada, diaLocal(novo.chegada)],
      );
      return rows[0];
    } catch (erro) {
      if (erro instanceof DatabaseError && erro.code === VIOLACAO_UNICA) {
        throw new CheckinDuplicadoError();
      }
      throw erro;
    }
  }

  async listarDoDia(dia: string): Promise<Checkin[]> {
    const { rows } = await this.pool.query<CheckinRow>(
      `SELECT id, cpf, nome, chegada
         FROM checkins
        WHERE dia = $1
        ORDER BY chegada, id`,
      [dia],
    );
    return rows;
  }
}
