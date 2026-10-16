import { Checkin, StatusCheckin } from './checkin.entity';

// O que cada tela recebe. Cada rota devolve só o necessário: totem e painel são
// telas públicas, e nem a recepção precisa do CPF completo.

/** Totem: o paciente vê o primeiro nome, a senha e quantos estão na frente. */
export interface ConfirmacaoCheckin {
  primeiroNome: string;
  senha: number;
  posicao: number;
}

/** Recepção: identifica o paciente sem expor o CPF inteiro. */
export interface CheckinNaFila {
  id: number;
  senha: number;
  nome: string;
  cpfMascarado: string;
  chegada: Date;
  status: StatusCheckin;
  chamadoEm: Date | null;
}

/** Painel da sala de espera: só a senha e o horário. */
export interface Chamada {
  senha: number;
  chamadoEm: Date;
}

function mascararCpf(cpf: string): string {
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

export function paraTotem(
  checkin: Checkin,
  posicao: number,
): ConfirmacaoCheckin {
  return {
    primeiroNome: checkin.nome.split(' ')[0],
    senha: checkin.senha,
    posicao,
  };
}

export function paraRecepcao(checkin: Checkin): CheckinNaFila {
  const { id, senha, nome, cpf, chegada, status, chamadoEm } = checkin;
  return {
    id,
    senha,
    nome,
    cpfMascarado: mascararCpf(cpf),
    chegada,
    status,
    chamadoEm,
  };
}
