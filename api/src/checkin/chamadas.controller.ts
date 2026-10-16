import { Controller, Get } from '@nestjs/common';
import { Chamada } from './checkin.respostas';
import { CheckinService } from './checkin.service';

/** Para o painel da sala de espera, que é público: nenhum nome ou CPF sai daqui. */
@Controller('chamadas')
export class ChamadasController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get()
  listar(): Promise<Chamada[]> {
    return this.checkinService.listarChamadasDeHoje();
  }
}
