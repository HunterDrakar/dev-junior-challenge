const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Resposta do check-in, mostrada no totem. */
export interface ConfirmacaoCheckin {
  primeiroNome: string;
  senha: number;
  posicao: number;
}

/** Um paciente na fila da recepção. Datas em ISO 8601. */
export interface CheckinNaFila {
  id: number;
  senha: number;
  nome: string;
  cpfMascarado: string;
  chegada: string;
  status: 'aguardando' | 'chamado';
  chamadoEm: string | null;
}

/** O que o painel público recebe: só senha e horário. */
export interface Chamada {
  senha: number;
  chamadoEm: string;
}

/** Erro da API com o status HTTP (0 = sem conexão). */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, init);
  } catch {
    throw new ApiError('Não foi possível conectar ao sistema.', 0);
  }

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    // O NestJS devolve { message } como texto ou como lista (erros de validação).
    const mensagem = Array.isArray(corpo?.message)
      ? corpo.message[0]
      : corpo?.message;
    throw new ApiError(mensagem ?? 'Erro inesperado.', resposta.status);
  }
  return corpo as T;
}

export function criarCheckin(cpf: string): Promise<ConfirmacaoCheckin> {
  return requisitar('/checkins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf }),
  });
}

export function listarFila(): Promise<CheckinNaFila[]> {
  return requisitar('/checkins');
}

export function chamarProximo(): Promise<CheckinNaFila> {
  return requisitar('/checkins/chamar-proximo', { method: 'POST' });
}

export function listarChamadas(): Promise<Chamada[]> {
  return requisitar('/chamadas');
}
