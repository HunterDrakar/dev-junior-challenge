export interface Checkin {
  id: number;
  cpf: string;
  nome: string;
  chegada: Date;
}

export type NovoCheckin = Omit<Checkin, 'id'>;
