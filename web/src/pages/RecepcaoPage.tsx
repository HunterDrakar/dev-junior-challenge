import { useCallback, useEffect, useState } from 'react';
import { listarFila, type Checkin } from '../api';
import { Cabecalho } from '../components/Cabecalho';
import { Fila } from '../components/Fila';

// A recepção vê os check-ins feitos no totem sem recarregar a página.
const ATUALIZAR_A_CADA_MS = 10_000;

/** Tela da recepção (uso interno): a fila do dia com nomes. */
export function RecepcaoPage() {
  const [fila, setFila] = useState<Checkin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => new Date());

  const carregarFila = useCallback(async () => {
    try {
      setFila(await listarFila());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.');
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

  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho titulo="Recepção · Fila do dia" />
      <main className="mx-auto w-full max-w-4xl flex-1">
        <Fila fila={fila} agora={agora} carregando={carregando} erro={erro} />
      </main>
    </div>
  );
}
