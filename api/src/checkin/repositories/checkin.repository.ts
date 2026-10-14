import { Checkin, NovoCheckin } from '../checkin.entity';

/** O paciente já tem check-in no mesmo dia. */
export class CheckinDuplicadoError extends Error {
  constructor() {
    super('Check-in duplicado no mesmo dia');
  }
}

/**
 * Contrato de persistência da fila. O service depende só desta classe,
 * então dá para trocar memória por banco sem mexer na regra de negócio.
 */
export abstract class CheckinRepository {
  /** Lança CheckinDuplicadoError se o CPF já fez check-in no dia da chegada. */
  abstract salvar(checkin: NovoCheckin): Promise<Checkin>;

  /** Check-ins de um dia (YYYY-MM-DD, horário de Brasília), por ordem de chegada. */
  abstract listarDoDia(dia: string): Promise<Checkin[]>;
}
