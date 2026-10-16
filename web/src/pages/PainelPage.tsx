import { listarChamadas } from '../api';
import { formatarHorario, formatarSenha } from '../formato';
import { useConsultaPeriodica } from '../useConsultaPeriodica';

/**
 * TV da sala de espera, pública: só senhas. Os dados vêm de /chamadas, que nem
 * envia nome ou CPF.
 */
export function PainelPage() {
  const { dados, erro } = useConsultaPeriodica(listarChamadas, 5_000);
  const [atual, ...anteriores] = dados ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-petroleo text-white">
      <header className="flex items-center justify-between px-8 py-5 md:px-12">
        <h1 className="text-lg font-semibold">Painel de chamadas</h1>
        {/* Na sala de espera, um erro técnico assustaria: só um aviso discreto. */}
        {erro && <span className="text-sm text-white/70">Reconectando…</span>}
      </header>

      <main className="grid flex-1 gap-10 px-8 pb-10 md:grid-cols-[2fr_1fr] md:px-12">
        <section
          aria-live="polite"
          aria-label="Senha chamada"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/5 p-10 text-center"
        >
          {atual ? (
            <div key={atual.senha} className="flex animate-entrar flex-col items-center gap-2">
              <span className="text-xl uppercase tracking-[0.3em] text-white/80">Senha</span>
              <span className="tabular-nums text-[9rem] font-extrabold leading-none text-dourado md:text-[12rem]">
                {formatarSenha(atual.senha)}
              </span>
              <span className="text-xl text-white/85">Dirija-se à recepção</span>
            </div>
          ) : (
            <p className="max-w-md text-2xl text-white/85">
              Aguarde. As senhas chamadas aparecem aqui.
            </p>
          )}
        </section>

        <section aria-labelledby="titulo-anteriores" className="flex flex-col gap-4">
          <h2 id="titulo-anteriores" className="text-lg uppercase tracking-wider text-white/80">
            Últimas chamadas
          </h2>
          {anteriores.length === 0 ? (
            <p className="text-white/70">—</p>
          ) : (
            <ol className="flex flex-col">
              {anteriores.map((chamada) => (
                <li
                  key={chamada.senha}
                  className="flex items-baseline justify-between border-b border-white/15 py-3"
                >
                  <span className="tabular-nums text-4xl font-bold">
                    {formatarSenha(chamada.senha)}
                  </span>
                  <span className="tabular-nums text-white/80">
                    {formatarHorario(chamada.chamadoEm)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
