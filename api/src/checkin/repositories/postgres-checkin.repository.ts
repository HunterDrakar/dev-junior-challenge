import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { Checkin, NovoCheckin } from '../checkin.entity';
import { FUSO_HORARIO } from '../dia';
import { CheckinRepository } from './checkin.repository';

interface CheckinRow {
  id: number;
  cpf: string;
  nome: string;
  chegada: Date;
}

const CRIAR_TABELA = `
  CREATE TABLE IF NOT EXISTS checkins (
    id      SERIAL       PRIMARY KEY,
    cpf     CHAR(11)     NOT NULL,
    nome    VARCHAR(200) NOT NULL,
    chegada TIMESTAMPTZ  NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_checkins_chegada ON checkins (chegada);
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
    const { rows } = await this.pool.query<CheckinRow>(
      `INSERT INTO checkins (cpf, nome, chegada)
       VALUES ($1, $2, $3)
       RETURNING id, cpf, nome, chegada`,
      [novo.cpf, novo.nome, novo.chegada],
    );
    return rows[0];
  }

  async listarDoDia(dia: string): Promise<Checkin[]> {
    const { rows } = await this.pool.query<CheckinRow>(
      `SELECT id, cpf, nome, chegada
         FROM checkins
        WHERE (chegada AT TIME ZONE $1)::date = $2
        ORDER BY chegada, id`,
      [FUSO_HORARIO, dia],
    );
    return rows;
  }
}
