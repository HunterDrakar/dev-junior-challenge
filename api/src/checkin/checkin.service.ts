import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CadastroService } from '../cadastro/cadastro.service';
import { Checkin } from './checkin.entity';
import { Chamada } from './checkin.respostas';
import { diaLocal } from './dia';
import {
  CheckinDuplicadoError,
  CheckinRepository,
} from './repositories/checkin.repository';

const CHAMADAS_NO_PAINEL = 5;

@Injectable()
export class CheckinService {
  constructor(
    private readonly cadastro: CadastroService,
    private readonly repositorio: CheckinRepository,
  ) {}

  async criar(cpf: string): Promise<{ checkin: Checkin; posicao: number }> {
    const paciente = await this.cadastro.buscarPorCpf(cpf);
    if (!paciente) {
      throw new NotFoundException(
        'CPF não encontrado no cadastro. Procure a recepção.',
      );
    }

    let checkin: Checkin;
    try {
      checkin = await this.repositorio.salvar({
        cpf,
        nome: paciente.nome,
        chegada: new Date(),
      });
    } catch (erro) {
      if (erro instanceof CheckinDuplicadoError) {
        throw new ConflictException('Este paciente já fez check-in hoje.');
      }
      throw erro;
    }

    // A posição vai na resposta para o totem não precisar baixar a fila (com
    // nomes de outros pacientes). Conta quem aguarda com senha menor: assim ela
    // não vira 0 se a recepção chamar este paciente antes desta consulta.
    const fila = await this.repositorio.listarDoDia(diaLocal(checkin.chegada));
    const naFrente = fila.filter(
      (c) => c.status === 'aguardando' && c.senha < checkin.senha,
    ).length;
    return { checkin, posicao: naFrente + 1 };
  }

  listarFilaDeHoje(): Promise<Checkin[]> {
    return this.repositorio.listarDoDia(diaLocal(new Date()));
  }

  async chamarProximo(): Promise<Checkin> {
    const agora = new Date();
    const chamado = await this.repositorio.chamarProximo(
      diaLocal(agora),
      agora,
    );
    if (!chamado) {
      throw new NotFoundException('Ninguém aguardando na fila.');
    }
    return chamado;
  }

  /** Da chamada mais recente para a mais antiga. */
  async listarChamadasDeHoje(): Promise<Chamada[]> {
    const fila = await this.listarFilaDeHoje();
    return fila
      .filter((c): c is Checkin & { chamadoEm: Date } => c.chamadoEm !== null)
      .map(({ senha, chamadoEm }) => ({ senha, chamadoEm }))
      .sort((a, b) => b.chamadoEm.getTime() - a.chamadoEm.getTime())
      .slice(0, CHAMADAS_NO_PAINEL);
  }
}
