import { INestApplication, ValidationPipe } from '@nestjs/common';

// Por padrão, só o front local. localhost e 127.0.0.1 são origens diferentes
// para o navegador. CORS_ORIGIN aceita uma lista separada por vírgula.
const ORIGENS_PADRAO = 'http://localhost:5173,http://127.0.0.1:5173';

export function origensPermitidas(): string[] {
  return (process.env.CORS_ORIGIN ?? ORIGENS_PADRAO)
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
}

/** Usada pelo main.ts e pelos testes e2e: os testes sobem a API como ela roda. */
export function configurarApp(app: INestApplication) {
  app.enableCors({ origin: origensPermitidas() });
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
}
