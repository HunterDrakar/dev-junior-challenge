import { criarCheckin } from '../api';
import { Cabecalho } from '../components/Cabecalho';
import { CheckinForm } from '../components/CheckinForm';

/**
 * Tela pública, na entrada. Não busca a fila nem tem link para outras telas:
 * nenhum dado de outro paciente chega aqui.
 */
export function TotemPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho titulo="Check-in de pacientes" comLinkParaInicio={false} />
      <main className="flex flex-1 items-center justify-center bg-petroleo p-6 text-white md:p-12">
        <div className="w-full max-w-lg">
          <CheckinForm onCheckin={criarCheckin} />
        </div>
      </main>
    </div>
  );
}
