import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CadastroService } from '../cadastro/cadastro.service';
import { Checkin } from './checkin.entity';
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

  async criar(cpf: string): Promise<Checkin> {
    const paciente = await this.cadastro.buscarPorCpf(cpf);
    if (!paciente) {
      throw new NotFoundException(
        'CPF não encontrado no cadastro. Procure a recepção.',
      );
    }

    try {
      return await this.repositorio.salvar({
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
  }

  listarFilaDeHoje(): Promise<Checkin[]> {
    return this.repositorio.listarDoDia(diaLocal(new Date()));
  }
}
