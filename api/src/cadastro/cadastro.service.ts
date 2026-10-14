import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

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
  private readonly baseUrl =
    process.env.CADASTRO_URL ?? 'http://localhost:4000';
  private readonly timeoutMs = 5000;

  /**
   * Busca o paciente pelo CPF.
   * Retorna `null` quando o cadastro responde 404 (CPF inexistente).
   * Lança 503 quando o serviço está fora do ar ou responde com erro inesperado.
   * Lança 502 quando ele responde 200 mas com um corpo inválido.
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

    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch {
      this.logger.error('Cadastro respondeu 200 com um corpo que não é JSON');
      throw this.respostaInvalida();
    }

    const problema = this.validarPaciente(corpo, cpf);
    if (problema) {
      // Sem CPF nem nome no log (LGPD): só o tipo de problema.
      this.logger.error(`Resposta inválida do cadastro: ${problema}`);
      throw this.respostaInvalida();
    }
    const paciente = corpo as Paciente;
    return { ...paciente, nome: paciente.nome.trim() };
  }

  /**
   * Confere o que a API usa da resposta. Devolve a descrição do problema,
   * ou null se estiver tudo certo.
   */
  private validarPaciente(corpo: unknown, cpfPedido: string): string | null {
    if (typeof corpo !== 'object' || corpo === null) {
      return 'o corpo não é um objeto';
    }
    const { cpf, nome } = corpo as Record<string, unknown>;
    if (typeof nome !== 'string' || nome.trim() === '') {
      return 'nome ausente ou vazio';
    }
    // Nunca registrar o check-in em nome de outro paciente.
    if (cpf !== cpfPedido) {
      return 'o CPF da resposta é diferente do CPF consultado';
    }
    return null;
  }

  private respostaInvalida() {
    return new BadGatewayException(
      'O serviço de cadastro respondeu de forma inesperada. Procure a recepção.',
    );
  }

  private indisponivel() {
    return new ServiceUnavailableException(
      'Serviço de cadastro indisponível. Tente novamente em instantes.',
    );
  }
}
