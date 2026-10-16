import { Logger, Module } from '@nestjs/common';
import { CadastroModule } from '../cadastro/cadastro.module';
import { ChamadasController } from './chamadas.controller';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { CheckinRepository } from './repositories/checkin.repository';
import { InMemoryCheckinRepository } from './repositories/in-memory-checkin.repository';
import { PostgresCheckinRepository } from './repositories/postgres-checkin.repository';

/** Com DATABASE_URL usa o Postgres; sem ela, guarda a fila em memória. */
function criarRepositorio(): CheckinRepository {
  const logger = new Logger('CheckinModule');
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    logger.log('Fila persistida no PostgreSQL');
    return new PostgresCheckinRepository(databaseUrl);
  }
  logger.warn('DATABASE_URL não definida: fila em memória');
  return new InMemoryCheckinRepository();
}

@Module({
  imports: [CadastroModule],
  controllers: [CheckinController, ChamadasController],
  providers: [
    CheckinService,
    { provide: CheckinRepository, useFactory: criarRepositorio },
  ],
  exports: [CheckinRepository],
})
export class CheckinModule {}
