import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CheckinRepository } from '../checkin/repositories/checkin.repository';

/**
 * GET /health — a API está no ar e consegue falar com o banco?
 * Usado pelo healthcheck do Docker e por monitoramento.
 *
 * O cadastro externo fica de fora de propósito: se ele cair, a API continua
 * saudável (e responde 503 só no check-in). Se entrasse aqui, o Docker poderia
 * reiniciar uma API que não tem problema nenhum.
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
