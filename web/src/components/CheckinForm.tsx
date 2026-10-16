import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, type ConfirmacaoCheckin } from '../api';
import { formatarCpf, somenteDigitos } from '../cpf';
import { formatarSenha } from '../formato';

const SEGUNDOS_PARA_REINICIAR = 10;
const SEGUNDOS_SEM_USO = 30;

interface Aviso {
  titulo: string;
  dica: string;
}

// Mensagens fixas por status: o texto cru da API (ex.: "Internal server error")
// nunca aparece para o paciente.
function descreverErro(erro: unknown): Aviso {
  const status = erro instanceof ApiError ? erro.status : -1;
  switch (status) {
    case 400:
      return { titulo: 'CPF inválido', dica: 'Confira os números digitados.' };
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
    case 0:
      return { titulo: 'Sem conexão com o sistema', dica: 'Procure a recepção.' };
    case 502: // o cadastro respondeu algo inesperado
    case 503: // o cadastro está fora do ar
      return {
        titulo: 'Cadastro indisponível',
        dica: 'Tente de novo em instantes ou procure a recepção.',
      };
    default:
      return status >= 500
        ? {
            titulo: 'Sistema indisponível',
            dica: 'Tente de novo em instantes ou procure a recepção.',
          }
        : { titulo: 'Algo deu errado', dica: 'Tente novamente ou procure a recepção.' };
  }
}

interface Props {
  onCheckin: (cpf: string) => Promise<ConfirmacaoCheckin>;
}

export function CheckinForm({ onCheckin }: Props) {
  const [cpf, setCpf] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<Aviso | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoCheckin | null>(null);

  const digitos = somenteDigitos(cpf);
  const faltam = 11 - digitos.length;

  // Depois do sucesso, o totem volta sozinho para o próximo paciente.
  useEffect(() => {
    if (!confirmacao) return;
    const timer = setTimeout(() => setConfirmacao(null), SEGUNDOS_PARA_REINICIAR * 1000);
    return () => clearTimeout(timer);
  }, [confirmacao]);

  // Se a pessoa digita e vai embora (ou desiste depois de um erro), o CPF dela
  // não pode ficar na tela para o próximo da fila.
  useEffect(() => {
    if (enviando || (cpf === '' && erro === null)) return;
    const timer = setTimeout(() => {
      setCpf('');
      setErro(null);
    }, SEGUNDOS_SEM_USO * 1000);
    return () => clearTimeout(timer);
  }, [cpf, erro, enviando]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (faltam > 0 || enviando) return;

    setEnviando(true);
    setErro(null);
    try {
      setConfirmacao(await onCheckin(digitos));
      setCpf('');
    } catch (e) {
      setErro(descreverErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (confirmacao) {
    const naFrente = confirmacao.posicao - 1;
    return (
      <div className="flex animate-entrar flex-col gap-6" role="status">
        <p className="text-sm uppercase tracking-wider text-ciano">Check-in confirmado</p>
        <h2 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Tudo certo, {confirmacao.primeiroNome}.
        </h2>
        <div className="flex flex-col gap-1">
          <span className="text-sm uppercase tracking-wider text-white/80">Sua senha</span>
          <span className="tabular-nums text-8xl font-extrabold leading-none text-dourado">
            {formatarSenha(confirmacao.senha)}
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
          onClick={() => setConfirmacao(null)}
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

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
      <div>
        <p className="text-sm uppercase tracking-wider text-white/80">Bem-vindo</p>
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
          readOnly={enviando}
          onChange={(e) => {
            setCpf(e.target.value);
            setErro(null);
          }}
          aria-invalid={erro !== null}
          aria-describedby="cpf-ajuda"
          className="w-full border-b-2 border-white/30 bg-transparent pb-2 tabular-nums text-3xl tracking-wider text-white outline-none transition placeholder:text-white/25 focus:border-white aria-invalid:border-erro md:text-4xl"
        />
        <p id="cpf-ajuda" className="text-sm text-white/80">
          Usamos o CPF só para localizar o seu cadastro.
        </p>
      </div>

      {erro && (
        <div
          role="alert"
          className="flex animate-entrar flex-col gap-1 border-l-4 border-erro bg-erro/15 px-4 py-3"
        >
          <strong>{erro.titulo}</strong>
          <span className="text-sm text-white/80">{erro.dica}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={faltam > 0 || enviando}
        className="rounded-full bg-dourado-claro px-8 py-4 text-lg font-bold text-petroleo transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
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
