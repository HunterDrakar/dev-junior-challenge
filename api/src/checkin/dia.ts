export const FUSO_HORARIO = 'America/Sao_Paulo';

const formatador = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_HORARIO });

/** Dia (YYYY-MM-DD) de uma data no horário de Brasília. */
export function diaLocal(data: Date): string {
  return formatador.format(data);
}
