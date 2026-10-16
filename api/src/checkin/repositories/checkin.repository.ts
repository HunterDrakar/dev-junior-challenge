import { Checkin, NovoCheckin } from '../checkin.entity';

export class CheckinDuplicadoError extends Error {
  constructor() {
    super('Check-in duplicado no mesmo dia');
  }
}

/** O service depende só deste contrato; a fila fica no Postgres ou em memória. */
export abstract class CheckinRepository {
  abstract readonly armazenamento: 'postgres' | 'memoria';

  /** Lança um erro se o armazenamento não responder (usado pelo /health). */
  abstract verificarConexao(): Promise<void>;

  /**
   * Grava com a próxima senha do dia.
   * Lança CheckinDuplicadoError se o CPF já fez check-in no dia.
   */
  abstract salvar(checkin: NovoCheckin): Promise<Checkin>;

  /**
   * Check-ins do dia (YYYY-MM-DD, horário de Brasília) na ordem das senhas.
   * Não por `chegada`: com requisições simultâneas ela pode sair fora de ordem.
   */
  abstract listarDoDia(dia: string): Promise<Checkin[]>;

  /**
   * Marca como chamado quem tem a menor senha aguardando; null se ninguém
   * aguarda. Duas chamadas ao mesmo tempo nunca pegam o mesmo paciente.
   */
  abstract chamarProximo(dia: string, chamadoEm: Date): Promise<Checkin | null>;
}
