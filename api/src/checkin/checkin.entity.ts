export type StatusCheckin = 'aguardando' | 'chamado';

export interface Checkin {
  id: number;
  cpf: string;
  nome: string;
  chegada: Date;
  /** Recomeça todo dia e não muda depois de emitida. */
  senha: number;
  status: StatusCheckin;
  chamadoEm: Date | null;
}

export type NovoCheckin = Pick<Checkin, 'cpf' | 'nome' | 'chegada'>;
