export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 11);
}

/** Formata enquanto a pessoa digita: "11111111111" -> "111.111.111-11". */
export function formatarCpf(valor: string): string {
  return somenteDigitos(valor)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}
