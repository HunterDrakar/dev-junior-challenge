import { Checkin, NovoCheckin } from '../checkin.entity';
import { diaLocal } from '../dia';
import { CheckinRepository } from './checkin.repository';

/** Fila em memória: some quando a API reinicia. */
export class InMemoryCheckinRepository extends CheckinRepository {
  private readonly checkins: Checkin[] = [];
  private proximoId = 1;

  salvar(novo: NovoCheckin): Promise<Checkin> {
    const checkin = { id: this.proximoId++, ...novo };
    this.checkins.push(checkin);
    return Promise.resolve(checkin);
  }

  listarDoDia(dia: string): Promise<Checkin[]> {
    const doDia = this.checkins
      .filter((c) => diaLocal(c.chegada) === dia)
      .sort((a, b) => a.chegada.getTime() - b.chegada.getTime());
    return Promise.resolve(doDia);
  }
}
