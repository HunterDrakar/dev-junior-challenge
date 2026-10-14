import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CadastroService } from '../cadastro/cadastro.service';
import { Checkin, CheckinCriado } from './checkin.entity';
import { diaLocal } from './dia';
import {
  CheckinDuplicadoError,
  CheckinRepository,
} from './repositories/checkin.repository';

@Injectable()
export class CheckinService {
  constructor(
    private readonly cadastro: CadastroService,
    private readonly repositorio: CheckinRepository,
  ) {}

  async criar(cpf: string): Promise<CheckinCriado> {
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

    // A posição vai na resposta para o totem não precisar baixar a fila inteira
    // (com nomes de outros pacientes) só para mostrar "você é o 3º".
    const fila = await this.repositorio.listarDoDia(diaLocal(checkin.chegada));
    const posicao = fila.findIndex((c) => c.id === checkin.id) + 1;
    return { ...checkin, posicao };
  }

  listarFilaDeHoje(): Promise<Checkin[]> {
    return this.repositorio.listarDoDia(diaLocal(new Date()));
  }
}
