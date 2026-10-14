import { Module } from '@nestjs/common';
import { CheckinModule } from './checkin/checkin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [CheckinModule, HealthModule],
})
export class AppModule {}
