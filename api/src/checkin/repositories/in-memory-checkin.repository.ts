import { Checkin, NovoCheckin } from '../checkin.entity';
import { diaLocal } from '../dia';
import { CheckinDuplicadoError, CheckinRepository } from './checkin.repository';

/** Fila em memória: some quando a API reinicia. */
export class InMemoryCheckinRepository extends CheckinRepository {
  private readonly checkins: Checkin[] = [];
  private proximoId = 1;

  salvar(novo: NovoCheckin): Promise<Checkin> {
    const dia = diaLocal(novo.chegada);
    const duplicado = this.checkins.some(
      (c) => c.cpf === novo.cpf && diaLocal(c.chegada) === dia,
    );
    if (duplicado) {
      return Promise.reject(new CheckinDuplicadoError());
    }

    const senha =
      this.checkins.filter((c) => diaLocal(c.chegada) === dia).length + 1;
    const checkin = { id: this.proximoId++, ...novo, senha };
    this.checkins.push(checkin);
    return Promise.resolve(checkin);
  }

  listarDoDia(dia: string): Promise<Checkin[]> {
    const doDia = this.checkins
      .filter((c) => diaLocal(c.chegada) === dia)
      .sort((a, b) => a.senha - b.senha);
    return Promise.resolve(doDia);
  }
}
