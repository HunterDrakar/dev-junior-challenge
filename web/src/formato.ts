const FUSO = 'America/Sao_Paulo';

/** 4 -> "004" */
export function formatarSenha(senha: number): string {
  return String(senha).padStart(3, '0');
}

/** "2026-10-14T12:05:00Z" -> "09:05" (horário de Brasília) */
export function formatarHorario(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  });
}

/** "quarta-feira, 14 de outubro" */
export function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: FUSO,
  });
}
