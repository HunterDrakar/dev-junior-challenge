const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface Checkin {
  id: number;
  cpf: string;
  nome: string;
  chegada: string; // ISO 8601
}

/** Resposta do POST /checkins: o check-in e a posição na fila de hoje. */
export type CheckinCriado = Checkin & { posicao: number };

/** Erro da API com o status HTTP (0 = sem conexão). */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(caminho: string, init?: RequestInit): Promise<T> {
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

export function criarCheckin(cpf: string): Promise<CheckinCriado> {
  return request<CheckinCriado>('/checkins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf }),
  });
}

export function listarFila(): Promise<Checkin[]> {
  return request<Checkin[]>('/checkins');
}
