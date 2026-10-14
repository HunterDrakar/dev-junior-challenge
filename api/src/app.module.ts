import { Module } from '@nestjs/common';
import { CheckinModule } from './checkin/checkin.module';

@Module({
  imports: [CheckinModule],
})
export class AppModule {}
