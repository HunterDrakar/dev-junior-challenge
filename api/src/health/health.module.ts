import { Module } from '@nestjs/common';
import { CheckinModule } from '../checkin/checkin.module';
import { HealthController } from './health.controller';

@Module({
  imports: [CheckinModule],
  controllers: [HealthController],
})
export class HealthModule {}
