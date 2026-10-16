import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CheckinRepository } from '../checkin/repositories/checkin.repository';

/**
 * A API está no ar e fala com o banco? Usado pelo healthcheck do Docker.
 * O cadastro externo fica de fora de propósito: se ele cair, a API continua
 * saudável (responde 503 só no check-in) e o Docker não a reinicia à toa.
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly repositorio: CheckinRepository) {}

  @Get()
  async verificar() {
    const { armazenamento } = this.repositorio;
    try {
      await this.repositorio.verificarConexao();
    } catch (erro) {
      this.logger.error(`Banco não respondeu: ${String(erro)}`);
      throw new ServiceUnavailableException({ status: 'erro', armazenamento });
    }
    return { status: 'ok', armazenamento };
  }
}
