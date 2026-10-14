import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CadastroService } from '../cadastro/cadastro.service';
import { Checkin } from './checkin.entity';
import { diaLocal } from './dia';
import { CheckinRepository } from './repositories/checkin.repository';

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

    const chegada = new Date();
    const filaDeHoje = await this.repositorio.listarDoDia(diaLocal(chegada));
    if (filaDeHoje.some((c) => c.cpf === cpf)) {
      throw new ConflictException('Este paciente já fez check-in hoje.');
    }

    return this.repositorio.salvar({ cpf, nome: paciente.nome, chegada });
  }

  listarFilaDeHoje(): Promise<Checkin[]> {
    return this.repositorio.listarDoDia(diaLocal(new Date()));
  }
}
