import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../test.module';

describe('CGIAR entity (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  //It is tested to return a 200 since it is the get all
  it('/api/cgiar-entities (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/cgiar-entities')
      .expect(HttpStatus.OK);
  });

  //The endpoint is used to search by id, a valid id is sent to it.
  it('/api/cgiar-entities/get/1 (GET)', () => {
    return request(app.getHttpServer())
      .get(`/api/cgiar-entities/get/1`)
      .expect(HttpStatus.OK)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('acronym');
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('financial_code');
      });
  });

  //The endpoint is used to search by id, an invalid id is sent to it.
  it('/api/cgiar-entities/get/a (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/cgiar-entities/get/' + 'a')
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
