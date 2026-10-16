import { useState } from 'react';
import { ApiError, chamarProximo, listarFila } from '../api';
import { Cabecalho } from '../components/Cabecalho';
import { Fila } from '../components/Fila';
import { formatarSenha } from '../formato';
import { useConsultaPeriodica } from '../useConsultaPeriodica';

type Aviso = { tipo: 'ok' | 'erro'; texto: string };

/** Tela interna: a fila do dia com nomes e o botão de chamar. */
export function RecepcaoPage() {
  const fila = useConsultaPeriodica(listarFila, 10_000);
  const [chamando, setChamando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const checkins = fila.dados ?? [];
  const ninguemAguardando = !checkins.some((c) => c.status === 'aguardando');

  async function chamar() {
    setChamando(true);
    try {
      const chamado = await chamarProximo();
      setAviso({
        tipo: 'ok',
        texto: `Senha ${formatarSenha(chamado.senha)} chamada: ${chamado.nome}`,
      });
    } catch (e) {
      setAviso({
        tipo: 'erro',
        texto:
          e instanceof ApiError && e.status === 404
            ? 'Ninguém aguardando na fila.'
            : 'Não foi possível chamar. Tente de novo.',
      });
    } finally {
      // Atualiza a fila antes de liberar o botão, para ele não enxergar o
      // paciente que acabou de ser chamado.
      await fila.recarregar();
      setChamando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho titulo="Recepção · Fila do dia" />
      <main className="mx-auto w-full max-w-4xl flex-1">
        <div className="flex flex-col gap-3 px-6 pt-6 md:flex-row md:items-center md:justify-between md:px-10 md:pt-10">
          <p aria-live="polite" className="min-h-6">
            {aviso && (
              <span className={aviso.tipo === 'ok' ? 'font-semibold' : 'font-semibold text-erro-texto'}>
                {aviso.texto}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={chamar}
            disabled={chamando || ninguemAguardando}
            className="rounded-full bg-dourado-claro px-6 py-3 font-bold text-petroleo transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-linha disabled:text-cinza"
          >
            {chamando ? 'Chamando…' : 'Chamar próximo'}
          </button>
        </div>
        <Fila
          checkins={checkins}
          agora={fila.atualizadoEm}
          carregando={fila.carregando}
          erro={fila.erro}
        />
      </main>
    </div>
  );
}
