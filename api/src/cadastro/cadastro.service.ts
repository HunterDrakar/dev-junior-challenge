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

/** Cliente HTTP do serviço externo de cadastro de pacientes. */
@Injectable()
export class CadastroService {
  private readonly logger = new Logger(CadastroService.name);
  private readonly baseUrl =
    process.env.CADASTRO_URL ?? 'http://localhost:4000';

  // Até 3 tentativas de 1,5 s, com espera crescente entre elas: no pior caso o
  // paciente espera cerca de 5 s no totem.
  private readonly tentativas = 3;
  private readonly timeoutPorTentativaMs = 1500;
  private readonly esperaBaseMs = 200;

  /**
   * null quando o CPF não existe (404). 503 quando o cadastro está fora do ar;
   * 502 quando ele responde algo inesperado.
   */
  async buscarPorCpf(cpf: string): Promise<Paciente | null> {
    const resposta = await this.buscarComNovasTentativas(
      `${this.baseUrl}/pacientes/${cpf}`,
    );

    if (!resposta.ok) {
      // Corpo descartado para liberar a conexão com o cadastro.
      await resposta.body?.cancel();
      if (resposta.status === 404) {
        return null;
      }
      this.logger.error(`Cadastro respondeu ${resposta.status}`);
      throw this.respostaInvalida();
    }

    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch {
      this.logger.error('Cadastro respondeu 200 com um corpo que não é JSON');
      throw this.respostaInvalida();
    }

    const problema = this.problemaNaResposta(corpo, cpf);
    if (problema) {
      // Só o tipo de problema no log, sem CPF nem nome (LGPD).
      this.logger.error(`Resposta inválida do cadastro: ${problema}`);
      throw this.respostaInvalida();
    }
    const paciente = corpo as Paciente;
    return { ...paciente, nome: paciente.nome.trim() };
  }

  /**
   * Repete só falhas passageiras (rede, timeout, 5xx): consultar paciente é uma
   * leitura, então repetir é seguro. 404 e 4xx não mudam tentando de novo.
   */
  private async buscarComNovasTentativas(url: string): Promise<Response> {
    for (let tentativa = 1; ; tentativa++) {
      let motivo: string;
      try {
        const resposta = await fetch(url, {
          signal: AbortSignal.timeout(this.timeoutPorTentativaMs),
        });
        if (resposta.status < 500) {
          return resposta;
        }
        await resposta.body?.cancel();
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
      // A espera dobra a cada tentativa, mais um pouco aleatório, para vários
      // totens não tentarem de novo no mesmo instante.
      const espera =
        this.esperaBaseMs * 2 ** (tentativa - 1) +
        Math.floor(Math.random() * 100);
      this.logger.warn(
        `Cadastro ${motivo} (tentativa ${tentativa} de ${this.tentativas}); nova tentativa em ${espera} ms`,
      );
      await new Promise((resolver) => setTimeout(resolver, espera));
    }
  }

  /** Descrição do problema, ou null se a resposta serve. */
  private problemaNaResposta(corpo: unknown, cpfPedido: string): string | null {
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
