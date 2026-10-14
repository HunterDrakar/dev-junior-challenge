import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Configuração comum do app, usada pelo main.ts e pelos testes e2e —
 * assim os testes sobem a API exatamente como ela roda de verdade.
 */
export function configurarApp(app: INestApplication) {
  app.enableCors();
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
}
