/** Senha do dia com 3 dígitos: 4 -> "004". */
export function formatarSenha(senha: number): string {
  return String(senha).padStart(3, '0');
}
