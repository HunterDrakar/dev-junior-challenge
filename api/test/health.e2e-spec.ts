import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { CheckinRepository } from '../src/checkin/repositories/checkin.repository';
import { InMemoryCheckinRepository } from '../src/checkin/repositories/in-memory-checkin.repository';

describe('GET /health (e2e)', () => {
  let app: INestApplication<App>;

  async function subir(repositorio: CheckinRepository) {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CheckinRepository)
      .useValue(repositorio)
      .compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
  }

  afterEach(async () => {
    await app.close();
  });

  it('200 quando o armazenamento responde', async () => {
    await subir(new InMemoryCheckinRepository());

    await request(app.getHttpServer())
      .get('/health')
      .expect(200, { status: 'ok', armazenamento: 'memoria' });
  });

  it('503 quando o banco não responde', async () => {
    const repositorio = new InMemoryCheckinRepository();
    jest
      .spyOn(repositorio, 'verificarConexao')
      .mockRejectedValue(new Error('connection refused'));
    await subir(repositorio);

    await request(app.getHttpServer())
      .get('/health')
      .expect(503, { status: 'erro', armazenamento: 'memoria' });
  });
});
