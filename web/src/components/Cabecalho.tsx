import { useEffect, useState } from 'react';
import { formatarData } from '../formato';

interface Props {
  titulo: string;
  /** No totem fica false: o paciente não pode navegar até a tela da recepção. */
  comLinkParaInicio?: boolean;
}

export function Cabecalho({ titulo, comLinkParaInicio = true }: Props) {
  // Totem e recepção ficam ligados de um dia para o outro: a data precisa virar.
  const [hoje, setHoje] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setHoje(new Date()), 60_000);
    return () => clearInterval(intervalo);
  }, []);

  const marca = (
    <>
      <span aria-hidden className="grid size-8 place-items-center rounded-md bg-dourado">
        <svg viewBox="0 0 16 16" className="size-4 fill-petroleo">
          <path d="M6 1h4v5h5v4h-5v5H6v-5H1V6h5z" />
        </svg>
      </span>
      {titulo}
    </>
  );

  return (
    <header className="flex items-center justify-between border-b border-linha bg-fundo px-6 py-4 md:px-10">
      <h1 className="font-semibold">
        {comLinkParaInicio ? (
          <a href="/" className="flex items-center gap-3">
            {marca}
          </a>
        ) : (
          <span className="flex items-center gap-3">{marca}</span>
        )}
      </h1>
      <span className="hidden text-sm text-cinza first-letter:uppercase sm:block">
        {formatarData(hoje)}
      </span>
    </header>
  );
}
