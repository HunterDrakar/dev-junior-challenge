import { vi } from 'vitest';

export function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Requisições que o código fez à API, como "POST /checkins". */
export function pedidos(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((argumentos) => {
    const [url, init] = argumentos as [string, RequestInit | undefined];
    return `${init?.method ?? 'GET'} ${new URL(url).pathname}`;
  });
}
