import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api';
import { formatarCpf, somenteDigitos } from '../cpf';
import { formatarSenha } from '../senha';

const SEGUNDOS_PARA_REINICIAR = 10;

/** Título curto + orientação do que fazer, por tipo de erro. */
function descreverErro(erro: unknown): { titulo: string; dica: string } {
  if (!(erro instanceof ApiError)) {
    return { titulo: 'Algo deu errado', dica: 'Tente novamente.' };
  }
  switch (erro.status) {
    case 404:
      return {
        titulo: 'CPF não encontrado',
        dica: 'Confira os números ou procure a recepção.',
      };
    case 409:
      return {
        titulo: 'Check-in já realizado hoje',
        dica: 'Você já está na fila. Aguarde ser chamado.',
      };
    case 400:
      return { titulo: 'CPF inválido', dica: erro.message };
    case 502: // o cadastro respondeu algo inválido
    case 503: // o cadastro está fora do ar
      return {
        titulo: 'Cadastro indisponível',
        dica: 'Tente de novo em instantes ou procure a recepção.',
      };
    case 0:
      return {
        titulo: 'Sem conexão com o sistema',
        dica: 'Procure a recepção.',
      };
    default:
      return { titulo: 'Algo deu errado', dica: erro.message };
  }
}

export interface Confirmacao {
  nome: string;
  senha: number;
  posicao: number;
}

interface Props {
  onCheckin: (cpf: string) => Promise<Confirmacao>;
}

export function CheckinForm({ onCheckin }: Props) {
  const [cpf, setCpf] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [sucesso, setSucesso] = useState<Confirmacao | null>(null);

  const digitos = somenteDigitos(cpf);
  const faltam = 11 - digitos.length;

  // Totem: depois do sucesso, volta sozinho para o próximo paciente.
  useEffect(() => {
    if (!sucesso) return;
    const timer = setTimeout(() => setSucesso(null), SEGUNDOS_PARA_REINICIAR * 1000);
    return () => clearTimeout(timer);
  }, [sucesso]);

  function reiniciar() {
    setErro(null);
    setSucesso(null);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (faltam > 0 || enviando) return;

    setEnviando(true);
    setErro(null);
    try {
      setSucesso(await onCheckin(digitos));
      setCpf('');
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    const primeiroNome = sucesso.nome.split(' ')[0];
    const naFrente = sucesso.posicao - 1;
    return (
      <div className="flex animate-entrar flex-col gap-6" role="status">
        <p className="tabular-nums text-sm uppercase tracking-wider text-ciano">
          Check-in confirmado
        </p>
        <h2 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Tudo certo, {primeiroNome}.
        </h2>
        <div className="flex flex-col gap-1">
          <span className="text-sm uppercase tracking-wider text-white/80">Sua senha</span>
          <span className="tabular-nums text-8xl font-extrabold leading-none text-dourado">
            {formatarSenha(sucesso.senha)}
          </span>
        </div>
        <p className="text-lg text-white/85">
          {naFrente === 0
            ? 'Você é o próximo.'
            : `${naFrente} ${naFrente === 1 ? 'pessoa' : 'pessoas'} na sua frente.`}{' '}
          Aguarde ser chamado pela senha.
        </p>
        <button
          type="button"
          onClick={reiniciar}
          className="self-start rounded-full border border-white/40 px-6 py-3 font-semibold transition hover:bg-white hover:text-petroleo"
        >
          Novo check-in
        </button>
        <div
          className="h-1 origin-left animate-esvaziar rounded-full bg-ciano"
          style={{ animationDuration: `${SEGUNDOS_PARA_REINICIAR}s` }}
          aria-hidden
        />
      </div>
    );
  }

  const { titulo, dica } = erro ? descreverErro(erro) : { titulo: '', dica: '' };

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
      <div>
        <p className="tabular-nums text-sm uppercase tracking-wider text-white/80">
          Bem-vindo
        </p>
        <h2 className="mt-2 text-4xl font-extrabold leading-tight md:text-5xl">
          Faça seu check-in
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="cpf" className="text-sm font-semibold text-white/80">
          Digite seu CPF
        </label>
        <input
          id="cpf"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="000.000.000-00"
          value={formatarCpf(cpf)}
          onChange={(e) => {
            setCpf(e.target.value);
            setErro(null);
          }}
          aria-invalid={Boolean(erro)}
          aria-describedby="cpf-ajuda"
          className="w-full border-b-2 border-white/30 bg-transparent pb-2 tabular-nums text-3xl tracking-wider text-white outline-none transition placeholder:text-white/25 focus:border-white aria-invalid:border-erro md:text-4xl"
        />
        <p id="cpf-ajuda" className="text-sm text-white/80">
          Usamos o CPF só para localizar o seu cadastro.
        </p>
      </div>

      {erro !== null && (
        <div
          role="alert"
          className="flex animate-entrar flex-col gap-1 border-l-4 border-erro bg-erro/15 px-4 py-3"
        >
          <strong>{titulo}</strong>
          <span className="text-sm text-white/80">{dica}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={faltam > 0 || enviando}
        className="rounded-full bg-dourado px-8 py-4 text-lg font-bold text-petroleo transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
      >
        {enviando
          ? 'Buscando cadastro…'
          : faltam > 0
            ? `Faltam ${faltam} dígito${faltam > 1 ? 's' : ''}`
            : 'Confirmar check-in'}
      </button>
    </form>
  );
}
