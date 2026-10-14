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
  /** Onde a fila fica guardada, para o /health dizer. */
  abstract readonly armazenamento: 'postgres' | 'memoria';

  /** Lança um erro se o armazenamento não estiver respondendo. */
  abstract verificarConexao(): Promise<void>;

  /**
   * Grava o check-in com a próxima senha do dia.
   * Lança CheckinDuplicadoError se o CPF já fez check-in no dia da chegada.
   */
  abstract salvar(checkin: NovoCheckin): Promise<Checkin>;

  /**
   * Check-ins de um dia (YYYY-MM-DD, horário de Brasília), na ordem das senhas.
   * A senha é a ordem em que o check-in foi gravado; o horário de chegada é marcado
   * um instante antes e, com requisições simultâneas, pode ficar fora de ordem.
   */
  abstract listarDoDia(dia: string): Promise<Checkin[]>;
}
