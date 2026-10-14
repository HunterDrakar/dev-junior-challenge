import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Origens que podem chamar a API pelo navegador. Por padrão, só o front local
 * (npm run dev e Docker usam a porta 5173). Em outro ambiente, defina
 * CORS_ORIGIN — várias origens separadas por vírgula.
 */
export function origensPermitidas(): string[] {
  return (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
}

/**
 * Configuração comum do app, usada pelo main.ts e pelos testes e2e —
 * assim os testes sobem a API exatamente como ela roda de verdade.
 */
export function configurarApp(app: INestApplication) {
  app.enableCors({ origin: origensPermitidas() });
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
}
