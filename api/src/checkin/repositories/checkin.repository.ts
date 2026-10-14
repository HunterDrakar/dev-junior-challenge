import { Checkin, NovoCheckin } from '../checkin.entity';

/**
 * Contrato de persistência da fila. O service depende só desta classe,
 * então dá para trocar memória por banco sem mexer na regra de negócio.
 */
export abstract class CheckinRepository {
  abstract salvar(checkin: NovoCheckin): Promise<Checkin>;

  /** Check-ins de um dia (YYYY-MM-DD, horário de Brasília), por ordem de chegada. */
  abstract listarDoDia(dia: string): Promise<Checkin[]>;
}
