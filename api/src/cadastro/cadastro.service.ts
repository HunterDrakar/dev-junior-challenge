import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface Paciente {
  cpf: string;
  nome: string;
  dataNascimento: string;
}

/**
 * Cliente HTTP do serviço externo de cadastro de pacientes (mock-service).
 */
@Injectable()
export class CadastroService {
  private readonly logger = new Logger(CadastroService.name);
  private readonly baseUrl = process.env.CADASTRO_URL ?? 'http://localhost:4000';
  private readonly timeoutMs = 5000;

  /**
   * Busca o paciente pelo CPF.
   * Retorna `null` quando o cadastro responde 404 (CPF inexistente).
   * Lança 503 quando o serviço está fora do ar ou responde com erro inesperado.
   */
  async buscarPorCpf(cpf: string): Promise<Paciente | null> {
    let resposta: Response;
    try {
      resposta = await fetch(`${this.baseUrl}/pacientes/${cpf}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (erro) {
      this.logger.error(`Falha ao chamar o cadastro: ${String(erro)}`);
      throw this.indisponivel();
    }

    if (resposta.status === 404) {
      return null;
    }
    if (!resposta.ok) {
      this.logger.error(`Cadastro respondeu ${resposta.status} para o CPF`);
      throw this.indisponivel();
    }

    return (await resposta.json()) as Paciente;
  }

  private indisponivel() {
    return new ServiceUnavailableException(
      'Serviço de cadastro indisponível. Tente novamente em instantes.',
    );
  }
}
