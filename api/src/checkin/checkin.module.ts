import { Module } from '@nestjs/common';
import { CadastroModule } from '../cadastro/cadastro.module';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { CheckinRepository } from './repositories/checkin.repository';
import { InMemoryCheckinRepository } from './repositories/in-memory-checkin.repository';

@Module({
  imports: [CadastroModule],
  controllers: [CheckinController],
  providers: [
    CheckinService,
    { provide: CheckinRepository, useClass: InMemoryCheckinRepository },
  ],
})
export class CheckinModule {}
