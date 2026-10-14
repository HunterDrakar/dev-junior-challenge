export interface Checkin {
  id: number;
  cpf: string;
  nome: string;
  chegada: Date;
  /** Senha do dia (1, 2, 3...), recomeça todo dia. Não muda depois de emitida. */
  senha: number;
}

/** O que o service entrega para salvar: id e senha são gerados pelo repositório. */
export type NovoCheckin = Omit<Checkin, 'id' | 'senha'>;

/** Resposta do check-in: inclui a posição na fila de hoje (1 = primeiro). */
export type CheckinCriado = Checkin & { posicao: number };
