import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  CheckinNaFila,
  ConfirmacaoCheckin,
  paraRecepcao,
  paraTotem,
} from './checkin.respostas';
import { CheckinService } from './checkin.service';
import { CriarCheckinDto } from './dto/criar-checkin.dto';

@Controller('checkins')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  async criar(@Body() dto: CriarCheckinDto): Promise<ConfirmacaoCheckin> {
    const cpf = dto.cpf.replace(/\D/g, '');
    const { checkin, posicao } = await this.checkinService.criar(cpf);
    return paraTotem(checkin, posicao);
  }

  @Get()
  async listar(): Promise<CheckinNaFila[]> {
    const fila = await this.checkinService.listarFilaDeHoje();
    return fila.map(paraRecepcao);
  }

  // 404 quando ninguém aguarda: não há paciente a chamar.
  @Post('chamar-proximo')
  @HttpCode(200)
  async chamarProximo(): Promise<CheckinNaFila> {
    return paraRecepcao(await this.checkinService.chamarProximo());
  }
}
