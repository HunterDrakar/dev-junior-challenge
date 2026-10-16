const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
});

/** Dia (YYYY-MM-DD) de uma data no horário de Brasília. */
export function diaLocal(data: Date): string {
  return formatador.format(data);
}
