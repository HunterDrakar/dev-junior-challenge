import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap() {
  // Lê o api/.env, se existir (recurso nativo do Node, sem dotenv).
  // Variáveis já definidas no ambiente (ex.: Docker) têm prioridade.
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
