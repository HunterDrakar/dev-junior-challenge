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

  // Instabilidade passageira (rede, timeout, 5xx): até 3 tentativas, com espera
  // crescente entre elas. Com 2 s por tentativa, o pior caso fica perto dos 5 s
  // de antes — um paciente no totem não pode esperar muito mais que isso.
  private readonly tentativas = 3;
  private readonly timeoutPorTentativaMs = 2000;
  private readonly esperaBaseMs = 200;

  /**
   * Busca o paciente pelo CPF.
   * Retorna `null` quando o cadastro responde 404 (CPF inexistente).
   * Lança 503 quando o serviço está fora do ar ou responde com erro inesperado.
   * Lança 502 quando ele responde 200 mas com um corpo inválido.
   */
  async buscarPorCpf(cpf: string): Promise<Paciente | null> {
    const resposta = await this.chamarComNovasTentativas(
      `${this.baseUrl}/pacientes/${cpf}`,
    );

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
   * Faz o GET e tenta de novo só em falhas passageiras: erro de rede, timeout
   * ou 5xx. Consultar paciente é uma leitura, então repetir é seguro.
   * Não repete 404 (o CPF não vai passar a existir) nem respostas 200 inválidas.
   */
  private async chamarComNovasTentativas(url: string): Promise<Response> {
    for (let tentativa = 1; ; tentativa++) {
      let motivo: string;
      try {
        const resposta = await fetch(url, {
          signal: AbortSignal.timeout(this.timeoutPorTentativaMs),
        });
        if (resposta.status < 500) {
          return resposta;
        }
        motivo = `respondeu ${resposta.status}`;
      } catch (erro) {
        motivo =
          erro instanceof Error && erro.name === 'TimeoutError'
            ? `não respondeu em ${this.timeoutPorTentativaMs} ms`
            : 'erro de rede';
      }

      if (tentativa === this.tentativas) {
        this.logger.error(
          `Cadastro ${motivo} (tentativa ${tentativa} de ${this.tentativas}); desistindo`,
        );
        throw this.indisponivel();
      }
      // Espera dobra a cada tentativa (200, 400 ms...) mais um pouco aleatório,
      // para vários totens não tentarem de novo no mesmo instante.
      const espera =
        this.esperaBaseMs * 2 ** (tentativa - 1) +
        Math.floor(Math.random() * 100);
      this.logger.warn(
        `Cadastro ${motivo} (tentativa ${tentativa} de ${this.tentativas}); nova tentativa em ${espera} ms`,
      );
      await new Promise((resolver) => setTimeout(resolver, espera));
    }
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
