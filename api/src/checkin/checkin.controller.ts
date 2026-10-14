import { Body, Controller, Get, Post } from '@nestjs/common';
import { Checkin } from './checkin.entity';
import { CheckinService } from './checkin.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Controller('checkins')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /** POST /checkins — registra o paciente na fila. */
  @Post()
  criar(@Body() dto: CreateCheckinDto): Promise<Checkin> {
    return this.checkinService.criar(dto.cpf);
  }

  /** GET /checkins — fila de hoje, por ordem de chegada. */
  @Get()
  listar(): Promise<Checkin[]> {
    return this.checkinService.listarFilaDeHoje();
  }
}
