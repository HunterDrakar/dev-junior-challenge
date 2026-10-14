export interface Checkin {
  id: number;
  cpf: string;
  nome: string;
  chegada: Date;
}

export type NovoCheckin = Omit<Checkin, 'id'>;

/** Resposta do check-in: inclui a posição na fila de hoje (1 = primeiro). */
export type CheckinCriado = Checkin & { posicao: number };
