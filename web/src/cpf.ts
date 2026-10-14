export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 11);
}

/** "11111111111" -> "111.111.111-11" (formata enquanto a pessoa digita). */
export function formatarCpf(valor: string): string {
  const d = somenteDigitos(valor);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Esconde o começo e o fim do CPF na lista da recepção: "•••.111.111-••". */
export function mascararCpf(cpf: string): string {
  return `•••.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-••`;
}
