import { InicioPage } from './pages/InicioPage';
import { RecepcaoPage } from './pages/RecepcaoPage';
import { TotemPage } from './pages/TotemPage';

/**
 * Totem e recepção ficam em aparelhos diferentes, então cada um abre a sua URL.
 * Com só três páginas fixas, escolher pelo caminho dispensa uma biblioteca de rotas.
 */
export default function App() {
  switch (window.location.pathname) {
    case '/totem':
      return <TotemPage />;
    case '/recepcao':
      return <RecepcaoPage />;
    default:
      return <InicioPage />;
  }
}
