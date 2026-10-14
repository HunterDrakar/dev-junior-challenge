import type { Checkin } from '../api';
import { mascararCpf } from '../cpf';

function horario(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function minutosDeEspera(iso: string, agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000));
}

function textoEspera(minutos: number): string {
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

interface Props {
  fila: Checkin[];
  agora: Date;
  carregando: boolean;
  erro: string | null;
}

export function Fila({ fila, agora, carregando, erro }: Props) {
  const maiorEspera = fila.length > 0 ? minutosDeEspera(fila[0].chegada, agora) : 0;

  return (
    <section aria-labelledby="titulo-fila" className="flex flex-col gap-8 p-6 md:p-10">
      {/* KPI principal no canto superior esquerdo: quantos esperam e há quanto tempo. */}
      <header className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-linha bg-linha">
        <Indicador rotulo="Na fila hoje" valor={String(fila.length).padStart(2, '0')} />
        <Indicador
          rotulo="Maior espera"
          valor={fila.length > 0 ? textoEspera(maiorEspera) : '—'}
        />
      </header>

      <h2 id="titulo-fila" className="flex items-baseline justify-between text-2xl font-extrabold">
        Fila do dia
        <span className="tabular-nums text-xs font-normal uppercase tracking-widest text-cinza">
          por ordem de chegada
        </span>
      </h2>

      {erro && (
        <p role="alert" className="flex flex-col gap-1 border-l-4 border-erro bg-erro/10 px-4 py-3">
          <strong>Não foi possível atualizar a fila.</strong>
          <span className="text-sm text-cinza">{erro} Tentando de novo automaticamente.</span>
        </p>
      )}

      {carregando && fila.length === 0 && <p className="text-cinza">Carregando fila…</p>}

      {!carregando && !erro && fila.length === 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-linha px-6 py-10 text-center">
          <strong>Nenhum check-in até agora.</strong>
          <span className="text-sm text-cinza">
            Os pacientes aparecem aqui assim que fizerem o check-in no totem.
          </span>
        </div>
      )}

      {fila.length > 0 && (
        <ol className="flex flex-col">
          {fila.map((checkin, indice) => {
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
                  {String(indice + 1).padStart(2, '0')}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-semibold">{checkin.nome}</span>
                  <span className={`tabular-nums text-xs ${proximo ? 'text-white/60' : 'text-cinza'}`}>
                    {mascararCpf(checkin.cpf)}
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="tabular-nums text-lg">{horario(checkin.chegada)}</span>
                  <span className={`text-xs ${proximo ? 'text-white/70' : 'text-cinza'}`}>
                    {proximo ? 'Próximo · ' : ''}
                    {textoEspera(minutosDeEspera(checkin.chegada, agora))}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1 bg-white px-5 py-4">
      <span className="tabular-nums text-xs uppercase tracking-widest text-cinza">{rotulo}</span>
      <span className="tabular-nums text-4xl font-semibold">{valor}</span>
    </div>
  );
}
