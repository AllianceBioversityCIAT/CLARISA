import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('Global targets (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/global-targets (GET)', () => {
    return request(app.getHttpServer()).get('/api/global-targets').expect(200);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/global-targets/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/global-targets/get/' + 1)
      .expect(200)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('targetId');
        expect(data).toHaveProperty('impactAreasId');
        expect(data).toHaveProperty('ActionAreaName');
        expect(data).toHaveProperty('target');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/global-targets/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/global-targets/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
