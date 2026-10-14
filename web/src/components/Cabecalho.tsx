interface Props {
  titulo: string;
}

export function Cabecalho({ titulo }: Props) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <header className="flex items-center justify-between border-b border-linha bg-fundo px-6 py-4 md:px-10">
      <a href="/" className="flex items-center gap-3 font-semibold">
        <span aria-hidden className="grid size-8 place-items-center rounded-md bg-dourado">
          <svg viewBox="0 0 16 16" className="size-4 fill-petroleo">
            <path d="M6 1h4v5h5v4h-5v5H6v-5H1V6h5z" />
          </svg>
        </span>
        {titulo}
      </a>
      <span className="hidden text-sm text-cinza first-letter:uppercase sm:block">{hoje}</span>
    </header>
  );
}
