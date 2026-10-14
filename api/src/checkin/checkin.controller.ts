import { Body, Controller, Get, Post } from '@nestjs/common';
import { Checkin, CheckinCriado } from './checkin.entity';
import { CheckinService } from './checkin.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Controller('checkins')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /** POST /checkins — registra o paciente na fila e devolve a posição dele. */
  @Post()
  criar(@Body() dto: CreateCheckinDto): Promise<CheckinCriado> {
    return this.checkinService.criar(dto.cpf);
  }

  /** GET /checkins — fila de hoje, por ordem de chegada. */
  @Get()
  listar(): Promise<Checkin[]> {
    return this.checkinService.listarFilaDeHoje();
  }
}
