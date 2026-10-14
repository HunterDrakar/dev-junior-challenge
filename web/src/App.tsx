import { useCallback, useEffect, useState } from 'react';
import { criarCheckin, listarFila, type Checkin } from './api';
import { CheckinForm } from './components/CheckinForm';
import { Fila } from './components/Fila';

// A recepção vê check-ins feitos em outros totens sem recarregar a página.
const ATUALIZAR_A_CADA_MS = 10_000;

export default function App() {
  const [fila, setFila] = useState<Checkin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroFila, setErroFila] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => new Date());

  const carregarFila = useCallback(async () => {
    try {
      const dados = await listarFila();
      setFila(dados);
      setErroFila(null);
      return dados;
    } catch (e) {
      setErroFila(e instanceof Error ? e.message : 'Erro inesperado.');
      return null;
    } finally {
      setCarregando(false);
      setAgora(new Date());
    }
  }, []);

  useEffect(() => {
    void carregarFila();
    const intervalo = setInterval(carregarFila, ATUALIZAR_A_CADA_MS);
    return () => clearInterval(intervalo);
  }, [carregarFila]);

  async function fazerCheckin(cpf: string) {
    const checkin = await criarCheckin(cpf);
    const filaAtualizada = await carregarFila();
    const posicao = (filaAtualizada ?? []).findIndex((c) => c.id === checkin.id) + 1;
    return { nome: checkin.nome, posicao: posicao || fila.length + 1 };
  }

  const hoje = agora.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-linha px-6 py-4 md:px-10">
        <span className="flex items-center gap-3 font-semibold">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded bg-dourado text-lg font-extrabold text-white"
          >
            +
          </span>
          Recepção · Check-in de pacientes
        </span>
        <span className="hidden tabular-nums text-sm text-cinza first-letter:uppercase sm:block">{hoje}</span>
      </header>

      <main className="grid flex-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section
          aria-label="Totem de check-in"
          className="flex flex-col justify-center bg-petroleo p-6 text-white md:p-12"
        >
          <CheckinForm onCheckin={fazerCheckin} />
        </section>
        <Fila fila={fila} agora={agora} carregando={carregando} erro={erroFila} />
      </main>
    </div>
  );
}
