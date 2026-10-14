import { Cabecalho } from '../components/Cabecalho';

const TELAS = [
  {
    href: '/totem',
    titulo: 'Totem',
    descricao: 'Tela pública, na entrada: o paciente informa o CPF e entra na fila.',
  },
  {
    href: '/recepcao',
    titulo: 'Recepção',
    descricao: 'Tela interna: a equipe acompanha a fila do dia com nomes e tempo de espera.',
  },
];

/** Página inicial: aponta para as duas telas, que rodam em aparelhos diferentes. */
export function InicioPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho titulo="Check-in de pacientes" />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 p-6 md:p-10">
        <h1 className="text-3xl font-extrabold">Escolha a tela</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {TELAS.map((tela) => (
            <a
              key={tela.href}
              href={tela.href}
              className="flex flex-col gap-2 rounded-lg border border-linha bg-white p-6 transition hover:border-petroleo"
            >
              <span className="text-xl font-bold">{tela.titulo}</span>
              <span className="text-cinza">{tela.descricao}</span>
              <span className="mt-2 text-sm font-semibold text-teal">{tela.href} →</span>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
