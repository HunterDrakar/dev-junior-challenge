import type { CheckinNaFila } from '../api';
import { formatarHorario, formatarSenha } from '../formato';

function minutosDesde(iso: string, agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000));
}

function textoEspera(minutos: number): string {
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

interface Props {
  /** Todos os check-ins de hoje: aguardando e já chamados. */
  checkins: CheckinNaFila[];
  agora: Date;
  carregando: boolean;
  erro: string | null;
}

export function Fila({ checkins, agora, carregando, erro }: Props) {
  const aguardando = checkins.filter((c) => c.status === 'aguardando');
  const chamados = checkins
    .filter((c) => c.chamadoEm !== null)
    .sort((a, b) => b.chamadoEm!.localeCompare(a.chamadoEm!));

  return (
    <section aria-labelledby="titulo-fila" className="flex flex-col gap-8 p-6 md:p-10">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-linha bg-linha">
        <Indicador rotulo="Aguardando" valor={String(aguardando.length).padStart(2, '0')} />
        <Indicador
          rotulo="Maior espera"
          valor={
            aguardando.length > 0
              ? textoEspera(minutosDesde(aguardando[0].chegada, agora))
              : 'nenhuma'
          }
        />
      </div>

      <h2 id="titulo-fila" className="flex items-baseline justify-between text-2xl font-extrabold">
        Aguardando
        <span className="text-sm font-normal uppercase tracking-wider text-cinza">
          por ordem de senha
        </span>
      </h2>

      {erro && (
        <p role="alert" className="flex flex-col gap-1 border-l-4 border-erro bg-erro/10 px-4 py-3">
          <strong>Não foi possível atualizar a fila.</strong>
          <span className="text-sm text-cinza">{erro} Tentando de novo automaticamente.</span>
        </p>
      )}

      {carregando && <p className="text-cinza">Carregando fila…</p>}

      {!carregando && !erro && aguardando.length === 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-linha px-6 py-10 text-center">
          {checkins.length === 0 ? (
            <>
              <strong>Nenhum check-in até agora.</strong>
              <span className="text-sm text-cinza">
                Os pacientes aparecem aqui assim que fizerem o check-in no totem.
              </span>
            </>
          ) : (
            <>
              <strong>Ninguém aguardando.</strong>
              <span className="text-sm text-cinza">
                Todos os pacientes de hoje já foram chamados.
              </span>
            </>
          )}
        </div>
      )}

      {aguardando.length > 0 && (
        <ol aria-label="Pacientes aguardando" className="flex flex-col">
          {aguardando.map((checkin, indice) => {
            const proximo = indice === 0;
            return (
              <li
                key={checkin.id}
                className={`grid animate-entrar grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-linha py-4 ${
                  proximo ? '-mx-4 rounded-lg border-transparent bg-petroleo px-4 text-white' : ''
                }`}
              >
                <span
                  className={`tabular-nums text-3xl font-semibold ${proximo ? 'text-dourado' : 'text-cinza'}`}
                >
                  {formatarSenha(checkin.senha)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-semibold">{checkin.nome}</span>
                  <span className={`tabular-nums text-sm ${proximo ? 'text-white/80' : 'text-cinza'}`}>
                    {checkin.cpfMascarado}
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="tabular-nums text-lg">{formatarHorario(checkin.chegada)}</span>
                  <span className={`text-sm ${proximo ? 'text-white/85' : 'text-cinza'}`}>
                    {proximo ? 'Próximo · ' : ''}
                    {textoEspera(minutosDesde(checkin.chegada, agora))}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {chamados.length > 0 && (
        <section aria-labelledby="titulo-chamados" className="flex flex-col gap-3">
          <h3 id="titulo-chamados" className="text-lg font-bold">
            Chamados hoje
          </h3>
          <ol aria-label="Pacientes chamados" className="flex flex-col">
            {chamados.map((checkin) => (
              <li
                key={checkin.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-linha py-2 text-cinza"
              >
                <span className="tabular-nums font-semibold">{formatarSenha(checkin.senha)}</span>
                <span className="truncate">{checkin.nome}</span>
                <span className="tabular-nums text-sm">
                  chamado às {formatarHorario(checkin.chamadoEm!)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-col gap-1 bg-white px-5 py-4">
      <span className="text-sm uppercase tracking-wider text-cinza">{rotulo}</span>
      <span className="tabular-nums text-4xl font-semibold">{valor}</span>
    </div>
  );
}
