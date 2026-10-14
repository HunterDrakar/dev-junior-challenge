import { Module } from '@nestjs/common';
import { CadastroService } from './cadastro.service';

@Module({
  providers: [CadastroService],
  exports: [CadastroService],
})
export class CadastroModule {}
