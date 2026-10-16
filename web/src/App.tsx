import { InicioPage } from './pages/InicioPage';
import { PainelPage } from './pages/PainelPage';
import { RecepcaoPage } from './pages/RecepcaoPage';
import { TotemPage } from './pages/TotemPage';

/**
 * Totem, recepção e painel ficam em aparelhos diferentes, então cada um abre a sua
 * URL. Com poucas páginas fixas, escolher pelo caminho dispensa uma biblioteca de rotas.
 */
export default function App() {
  // "/totem/" e "/totem" abrem a mesma tela.
  const caminho = window.location.pathname.replace(/\/+$/, '') || '/';
  switch (caminho) {
    case '/totem':
      return <TotemPage />;
    case '/recepcao':
      return <RecepcaoPage />;
    case '/painel':
      return <PainelPage />;
    default:
      return <InicioPage />;
  }
}
