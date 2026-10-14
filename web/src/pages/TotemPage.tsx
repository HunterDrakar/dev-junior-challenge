import { criarCheckin } from '../api';
import { Cabecalho } from '../components/Cabecalho';
import { CheckinForm } from '../components/CheckinForm';

/**
 * Tela do totem, de frente para o público: só o formulário.
 * Não busca nem mostra a fila, para não expor dados de outros pacientes.
 */
export function TotemPage() {
  async function fazerCheckin(cpf: string) {
    const { nome, posicao } = await criarCheckin(cpf);
    return { nome, posicao };
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho titulo="Check-in de pacientes" />
      <main className="flex flex-1 items-center justify-center bg-petroleo p-6 text-white md:p-12">
        <div className="w-full max-w-lg">
          <CheckinForm onCheckin={fazerCheckin} />
        </div>
      </main>
    </div>
  );
}
